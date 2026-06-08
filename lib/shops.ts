import { createClient } from "./supabase/server";
import { coverageWindow, type CoverageWindow } from "./coverage";
import { aggregateGroceries, type GroceryLine } from "./grocery";
import { todayISO } from "./dates";
import type { ShoppingTrip, GroceryExtraItem } from "./types";

export interface DerivedLine extends GroceryLine {
  checked: boolean;
}

export interface TripGroceries {
  trip: ShoppingTrip;
  window: CoverageWindow;
  derived: DerivedLine[];
  extras: GroceryExtraItem[];
  mealCount: number;
}

// Supabase nested-select row shape (objects, not arrays, for to-one relations).
interface MealRow {
  servings: number;
  recipe: {
    servings: number;
    recipe_ingredients: {
      quantity: number;
      unit: string;
      ingredient: { id: string; name: string; category: string | null };
    }[];
  } | null;
}

export async function getTripGroceries(
  tripId: string,
): Promise<TripGroceries | null> {
  const supabase = await createClient();

  const { data: trip } = await supabase
    .from("shopping_trips")
    .select("*")
    .eq("id", tripId)
    .maybeSingle();
  if (!trip) return null;

  const { data: allTrips } = await supabase
    .from("shopping_trips")
    .select("id, trip_at")
    .eq("household_id", trip.household_id);

  const window = coverageWindow(
    allTrips ?? [],
    { id: trip.id, trip_at: trip.trip_at },
    todayISO(),
  );

  const { data: mealsData } = await supabase
    .from("scheduled_meals")
    .select(
      "servings, recipe:recipes(servings, recipe_ingredients(quantity, unit, ingredient:ingredients(id, name, category)))",
    )
    .eq("household_id", trip.household_id)
    .gte("meal_date", window.start)
    .lte("meal_date", window.end);

  const meals = (mealsData ?? []) as unknown as MealRow[];

  const sources = meals
    .filter((m) => m.recipe)
    .map((m) => ({
      plannedServings: m.servings,
      recipeServings: m.recipe!.servings,
      ingredients: m.recipe!.recipe_ingredients.map((ri) => ({
        ingredient_id: ri.ingredient.id,
        name: ri.ingredient.name,
        category: ri.ingredient.category,
        unit: ri.unit,
        quantity: ri.quantity,
      })),
    }));

  const lines = aggregateGroceries(sources);

  const { data: checkedRows } = await supabase
    .from("grocery_checked")
    .select("ingredient_id, unit, checked")
    .eq("trip_id", tripId);

  const checkedSet = new Set(
    (checkedRows ?? [])
      .filter((c) => c.checked)
      .map((c) => `${c.ingredient_id}::${c.unit}`),
  );

  const derived: DerivedLine[] = lines.map((line) => ({
    ...line,
    checked: checkedSet.has(`${line.ingredient_id}::${line.unit}`),
  }));

  const { data: extras } = await supabase
    .from("grocery_extra_items")
    .select("*")
    .eq("trip_id", tripId)
    .order("label");

  return {
    trip: trip as ShoppingTrip,
    window,
    derived,
    extras: (extras ?? []) as GroceryExtraItem[],
    mealCount: meals.length,
  };
}

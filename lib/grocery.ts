// Grocery list aggregation (BUILD_SPEC §6.3).
//
// For each scheduled meal, scale each ingredient quantity by
// plannedServings / recipeServings, then aggregate across all meals by
// (ingredient_id, unit). Different units for the same ingredient stay on
// separate lines — NO cross-unit conversion.

export interface MealSource {
  plannedServings: number;
  recipeServings: number;
  ingredients: {
    ingredient_id: string;
    name: string;
    category: string | null;
    unit: string;
    quantity: number;
  }[];
}

export interface GroceryLine {
  ingredient_id: string;
  name: string;
  category: string | null;
  unit: string;
  quantity: number;
}

/** Aggregate scaled ingredient quantities across meals into grocery lines. */
export function aggregateGroceries(sources: MealSource[]): GroceryLine[] {
  const lines = new Map<string, GroceryLine>();

  for (const src of sources) {
    const factor =
      src.recipeServings > 0 ? src.plannedServings / src.recipeServings : 1;

    for (const ing of src.ingredients) {
      const key = `${ing.ingredient_id}::${ing.unit}`;
      const scaled = ing.quantity * factor;
      const existing = lines.get(key);
      if (existing) {
        existing.quantity += scaled;
      } else {
        lines.set(key, {
          ingredient_id: ing.ingredient_id,
          name: ing.name,
          category: ing.category,
          unit: ing.unit,
          quantity: scaled,
        });
      }
    }
  }

  return [...lines.values()];
}

export interface CategoryGroup<T> {
  category: string;
  items: T[];
}

/**
 * Group items by category (null/empty → "other"), sorted alphabetically with
 * "other" last. Items within a group are sorted by name.
 */
export function groupByCategory<T extends { category: string | null; name: string }>(
  items: T[],
): CategoryGroup<T>[] {
  const groups = new Map<string, T[]>();
  for (const item of items) {
    const cat = item.category?.trim() || "other";
    const bucket = groups.get(cat);
    if (bucket) bucket.push(item);
    else groups.set(cat, [item]);
  }

  return [...groups.entries()]
    .sort(([a], [b]) => {
      if (a === "other") return 1;
      if (b === "other") return -1;
      return a.localeCompare(b);
    })
    .map(([category, list]) => ({
      category,
      items: list.sort((x, y) => x.name.localeCompare(y.name)),
    }));
}

/** Trim floating-point noise from scaled quantities for display. */
export function formatQuantity(quantity: number): string {
  const rounded = Math.round(quantity * 100) / 100;
  return Number.isInteger(rounded) ? String(rounded) : String(rounded);
}

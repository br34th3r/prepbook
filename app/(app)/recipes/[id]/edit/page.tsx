import Link from "next/link";
import { notFound } from "next/navigation";
import { requireHousehold } from "@/lib/household";
import { getRecipe } from "@/lib/recipes";
import { RecipeForm, type RecipeFormInitial } from "@/components/recipe-form";
import { updateRecipe } from "../../actions";
import type { Ingredient } from "@/lib/types";

export default async function EditRecipePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { supabase, household } = await requireHousehold();

  const [recipe, ingredientsRes] = await Promise.all([
    getRecipe(id),
    supabase
      .from("ingredients")
      .select("*")
      .eq("household_id", household.household_id)
      .order("name"),
  ]);
  if (!recipe) notFound();
  const ingredients = (ingredientsRes.data ?? []) as Ingredient[];

  const initial: RecipeFormInitial = {
    name: recipe.name,
    description: recipe.description ?? "",
    instructions: recipe.instructions ?? "",
    servings: recipe.servings,
    prep_minutes: recipe.prep_minutes?.toString() ?? "",
    cook_minutes: recipe.cook_minutes?.toString() ?? "",
    source_url: recipe.source_url ?? "",
    tags: recipe.recipe_tags.map((t) => t.tag).join(", "),
    rows: recipe.recipe_ingredients.map((ri) => ({
      name: ri.ingredient.name,
      quantity: ri.quantity.toString(),
      unit: ri.unit,
      note: ri.note ?? "",
    })),
  };

  const action = updateRecipe.bind(null, id);

  return (
    <div className="space-y-5">
      <div>
        <Link
          href={`/recipes/${id}`}
          className="text-sm text-muted hover:text-foreground"
        >
          ← Back
        </Link>
        <h1 className="mt-1 text-xl font-semibold">Edit recipe</h1>
      </div>
      <RecipeForm
        ingredients={ingredients}
        action={action}
        initial={initial}
        submitLabel="Save changes"
      />
    </div>
  );
}

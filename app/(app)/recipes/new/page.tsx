import Link from "next/link";
import { requireHousehold } from "@/lib/household";
import { RecipeForm } from "@/components/recipe-form";
import { createRecipe } from "../actions";
import type { Ingredient } from "@/lib/types";

export default async function NewRecipePage() {
  const { supabase, household } = await requireHousehold();
  const { data } = await supabase
    .from("ingredients")
    .select("*")
    .eq("household_id", household.household_id)
    .order("name");
  const ingredients = (data ?? []) as Ingredient[];

  return (
    <div className="space-y-5">
      <div>
        <Link href="/recipes" className="text-sm text-muted hover:text-foreground">
          ← Recipes
        </Link>
        <h1 className="mt-1 text-xl font-semibold">New recipe</h1>
      </div>
      <RecipeForm
        ingredients={ingredients}
        action={createRecipe}
        submitLabel="Create recipe"
      />
    </div>
  );
}

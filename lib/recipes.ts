import { createClient } from "./supabase/server";
import type { RecipeWithDetails } from "./types";

/** Fetch a recipe with its ingredient lines (incl. ingredient names) and tags. */
export async function getRecipe(
  id: string,
): Promise<RecipeWithDetails | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("recipes")
    .select(
      "*, recipe_ingredients(*, ingredient:ingredients(*)), recipe_tags(tag)",
    )
    .eq("id", id)
    .maybeSingle();
  return (data as RecipeWithDetails | null) ?? null;
}

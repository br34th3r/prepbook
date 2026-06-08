"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireHousehold } from "@/lib/household";
import type { SupabaseClient } from "@supabase/supabase-js";

export type RecipeFormState = { error: string } | null;

interface IngredientRow {
  name: string;
  quantity: string | number;
  unit: string;
  note?: string;
}

async function requireUser(supabase: SupabaseClient) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");
  return user;
}

/**
 * Find an ingredient by canonical name (case-insensitive) within the household,
 * or create it there. Ingredient catalogs are per-household.
 */
async function resolveIngredientId(
  supabase: SupabaseClient,
  householdId: string,
  rawName: string,
): Promise<string> {
  const name = rawName.trim();
  const { data: existing } = await supabase
    .from("ingredients")
    .select("id")
    .eq("household_id", householdId)
    .ilike("name", name)
    .maybeSingle();
  if (existing) return existing.id;

  const { data: created, error } = await supabase
    .from("ingredients")
    .insert({ household_id: householdId, name })
    .select("id")
    .single();

  if (error) {
    // Likely a unique-name race; re-fetch.
    const { data: retry } = await supabase
      .from("ingredients")
      .select("id")
      .eq("household_id", householdId)
      .ilike("name", name)
      .maybeSingle();
    if (retry) return retry.id;
    throw error;
  }
  return created.id;
}

function parseRows(raw: string): IngredientRow[] {
  let rows: IngredientRow[];
  try {
    rows = JSON.parse(raw);
  } catch {
    return [];
  }
  return rows.filter(
    (r) => r && r.name?.trim() && r.unit?.trim() && Number(r.quantity) > 0,
  );
}

function parseTags(raw: string): string[] {
  return [
    ...new Set(
      raw
        .split(",")
        .map((t) => t.trim().toLowerCase())
        .filter(Boolean),
    ),
  ];
}

async function uploadImage(
  supabase: SupabaseClient,
  householdId: string,
  file: File | null,
): Promise<string | null> {
  if (!file || file.size === 0) return null;
  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  // Namespaced by household to match the storage RLS path-prefix policy.
  const path = `${householdId}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage
    .from("recipe-images")
    .upload(path, file, { contentType: file.type, upsert: false });
  if (error) throw error;
  return path;
}

function readRecipeFields(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const servings = Math.max(1, Number(formData.get("servings")) || 1);
  const toIntOrNull = (v: FormDataEntryValue | null) => {
    const n = Number(v);
    return v != null && v !== "" && !Number.isNaN(n) ? Math.round(n) : null;
  };
  const toTextOrNull = (v: FormDataEntryValue | null) => {
    const s = String(v ?? "").trim();
    return s || null;
  };
  return {
    name,
    servings,
    description: toTextOrNull(formData.get("description")),
    instructions: toTextOrNull(formData.get("instructions")),
    prep_minutes: toIntOrNull(formData.get("prep_minutes")),
    cook_minutes: toIntOrNull(formData.get("cook_minutes")),
    source_url: toTextOrNull(formData.get("source_url")),
  };
}

async function writeIngredientsAndTags(
  supabase: SupabaseClient,
  householdId: string,
  recipeId: string,
  formData: FormData,
) {
  const rows = parseRows(String(formData.get("ingredients") ?? "[]"));
  for (const row of rows) {
    const ingredientId = await resolveIngredientId(supabase, householdId, row.name);
    await supabase.from("recipe_ingredients").insert({
      recipe_id: recipeId,
      ingredient_id: ingredientId,
      quantity: Number(row.quantity),
      unit: row.unit.trim(),
      note: row.note?.trim() || null,
    });
  }

  const tags = parseTags(String(formData.get("tags") ?? ""));
  if (tags.length) {
    await supabase
      .from("recipe_tags")
      .insert(tags.map((tag) => ({ recipe_id: recipeId, tag })));
  }
}

export async function createRecipe(
  _prev: RecipeFormState,
  formData: FormData,
): Promise<RecipeFormState> {
  const { supabase, user, household } = await requireHousehold();
  const hid = household.household_id;
  const fields = readRecipeFields(formData);
  if (!fields.name) return { error: "Recipe name is required." };

  let imagePath: string | null = null;
  try {
    imagePath = await uploadImage(
      supabase,
      hid,
      formData.get("image") as File | null,
    );
  } catch {
    return { error: "Image upload failed. Try a smaller image." };
  }

  const { data: recipe, error } = await supabase
    .from("recipes")
    .insert({
      ...fields,
      household_id: hid,
      image_path: imagePath,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (error || !recipe) return { error: "Could not save recipe." };

  await writeIngredientsAndTags(supabase, hid, recipe.id, formData);

  revalidatePath("/recipes");
  redirect(`/recipes/${recipe.id}`);
}

export async function updateRecipe(
  recipeId: string,
  _prev: RecipeFormState,
  formData: FormData,
): Promise<RecipeFormState> {
  const { supabase, household } = await requireHousehold();
  const hid = household.household_id;
  const fields = readRecipeFields(formData);
  if (!fields.name) return { error: "Recipe name is required." };

  let imagePath: string | undefined;
  try {
    const uploaded = await uploadImage(
      supabase,
      hid,
      formData.get("image") as File | null,
    );
    if (uploaded) imagePath = uploaded;
  } catch {
    return { error: "Image upload failed. Try a smaller image." };
  }

  const { error } = await supabase
    .from("recipes")
    .update({ ...fields, ...(imagePath ? { image_path: imagePath } : {}) })
    .eq("id", recipeId);

  if (error) return { error: "Could not update recipe." };

  // Replace ingredients and tags wholesale (simplest correct approach).
  await supabase.from("recipe_ingredients").delete().eq("recipe_id", recipeId);
  await supabase.from("recipe_tags").delete().eq("recipe_id", recipeId);
  await writeIngredientsAndTags(supabase, hid, recipeId, formData);

  revalidatePath("/recipes");
  revalidatePath(`/recipes/${recipeId}`);
  redirect(`/recipes/${recipeId}`);
}

export async function deleteRecipe(formData: FormData) {
  const recipeId = String(formData.get("recipeId") ?? "");
  if (!recipeId) return;
  const supabase = await createClient();
  await requireUser(supabase);
  await supabase.from("recipes").delete().eq("id", recipeId);
  revalidatePath("/recipes");
  redirect("/recipes");
}

"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireHousehold } from "@/lib/household";
import type { MealSlot } from "@/lib/types";
import { MEAL_SLOTS } from "@/lib/types";

async function authed() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");
  return supabase;
}

export async function addMeal(input: {
  recipeId: string;
  date: string; // YYYY-MM-DD
  slot: MealSlot;
  servings: number;
  note?: string;
}) {
  if (!input.recipeId || !MEAL_SLOTS.includes(input.slot)) return;
  const { supabase, household } = await requireHousehold();
  await supabase.from("scheduled_meals").insert({
    household_id: household.household_id,
    recipe_id: input.recipeId,
    meal_date: input.date,
    slot: input.slot,
    servings: Math.max(1, Math.round(input.servings) || 1),
    note: input.note?.trim() || null,
  });
  revalidatePath("/plan");
  revalidatePath("/");
}

export async function updateMeal(input: {
  id: string;
  servings: number;
  note?: string;
}) {
  const supabase = await authed();
  await supabase
    .from("scheduled_meals")
    .update({
      servings: Math.max(1, Math.round(input.servings) || 1),
      note: input.note?.trim() || null,
    })
    .eq("id", input.id);
  revalidatePath("/plan");
}

export async function removeMeal(id: string) {
  const supabase = await authed();
  await supabase.from("scheduled_meals").delete().eq("id", id);
  revalidatePath("/plan");
  revalidatePath("/");
}

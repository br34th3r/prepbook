"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireHousehold } from "@/lib/household";
import { dateOfTimestamp, weeklyRuleDay } from "@/lib/dates";
import { nextWeeklyTripAt } from "@/lib/coverage";
import type { TripStatus } from "@/lib/types";
import type { SupabaseClient } from "@supabase/supabase-js";

async function authed(): Promise<SupabaseClient> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");
  return supabase;
}

export type TripFormState = { error: string } | null;

export async function createTrip(
  _prev: TripFormState,
  formData: FormData,
): Promise<TripFormState> {
  const tripAtLocal = String(formData.get("trip_at") ?? ""); // "YYYY-MM-DDTHH:MM"
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(tripAtLocal)) {
    return { error: "Choose a date and time for the shop." };
  }
  const isRecurring = formData.get("is_recurring") === "on";
  const note = String(formData.get("note") ?? "").trim() || null;

  const tripAt = `${tripAtLocal}:00`;
  const recurrenceRule = isRecurring
    ? `WEEKLY:${weeklyRuleDay(dateOfTimestamp(tripAt))}`
    : null;

  const { supabase, household } = await requireHousehold();
  const { data, error } = await supabase
    .from("shopping_trips")
    .insert({
      household_id: household.household_id,
      trip_at: tripAt,
      is_recurring: isRecurring,
      recurrence_rule: recurrenceRule,
      note,
    })
    .select("id")
    .single();

  if (error || !data) return { error: "Could not create the shop." };

  revalidatePath("/shops");
  revalidatePath("/");
  redirect(`/shops/${data.id}`);
}

export async function setTripStatus(input: {
  id: string;
  status: TripStatus;
}) {
  const supabase = await authed();

  const { data: trip } = await supabase
    .from("shopping_trips")
    .select("*")
    .eq("id", input.id)
    .single();

  await supabase
    .from("shopping_trips")
    .update({ status: input.status })
    .eq("id", input.id);

  // Marking a recurring trip done spawns the next weekly occurrence, unless
  // one already exists at that time (idempotent against double-clicks).
  if (input.status === "done" && trip?.is_recurring) {
    const nextAt = nextWeeklyTripAt(trip.trip_at);
    const { data: existing } = await supabase
      .from("shopping_trips")
      .select("id")
      .eq("trip_at", nextAt)
      .eq("recurrence_rule", trip.recurrence_rule)
      .maybeSingle();
    if (!existing) {
      await supabase.from("shopping_trips").insert({
        household_id: trip.household_id,
        trip_at: nextAt,
        is_recurring: true,
        recurrence_rule: trip.recurrence_rule,
        note: trip.note,
      });
    }
  }

  revalidatePath("/shops");
  revalidatePath(`/shops/${input.id}`);
  revalidatePath("/");
}

export async function deleteTrip(formData: FormData) {
  const id = String(formData.get("tripId") ?? "");
  if (!id) return;
  const supabase = await authed();
  await supabase.from("shopping_trips").delete().eq("id", id);
  revalidatePath("/shops");
  revalidatePath("/");
  redirect("/shops");
}

// --- Grocery list check-off + extras ---------------------------------------

export async function toggleDerivedItem(input: {
  tripId: string;
  ingredientId: string;
  unit: string;
  checked: boolean;
}) {
  const supabase = await authed();
  await supabase.from("grocery_checked").upsert(
    {
      trip_id: input.tripId,
      ingredient_id: input.ingredientId,
      unit: input.unit,
      checked: input.checked,
    },
    { onConflict: "trip_id,ingredient_id,unit" },
  );
  revalidatePath(`/shops/${input.tripId}`);
}

export async function addExtraItem(input: {
  tripId: string;
  label: string;
  quantity?: string;
  unit?: string;
  category?: string;
}) {
  const label = input.label.trim();
  if (!label) return;
  const supabase = await authed();
  const qty = input.quantity ? Number(input.quantity) : null;
  await supabase.from("grocery_extra_items").insert({
    trip_id: input.tripId,
    label,
    quantity: qty != null && !Number.isNaN(qty) ? qty : null,
    unit: input.unit?.trim() || null,
    category: input.category?.trim() || null,
  });
  revalidatePath(`/shops/${input.tripId}`);
}

export async function toggleExtraItem(input: {
  id: string;
  tripId: string;
  checked: boolean;
}) {
  const supabase = await authed();
  await supabase
    .from("grocery_extra_items")
    .update({ checked: input.checked })
    .eq("id", input.id);
  revalidatePath(`/shops/${input.tripId}`);
}

export async function removeExtraItem(input: { id: string; tripId: string }) {
  const supabase = await authed();
  await supabase.from("grocery_extra_items").delete().eq("id", input.id);
  revalidatePath(`/shops/${input.tripId}`);
}

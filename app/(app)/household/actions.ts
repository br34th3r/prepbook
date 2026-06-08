"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  ACTIVE_HOUSEHOLD_COOKIE,
  getMemberships,
} from "@/lib/household";

export type HouseholdActionState = { error: string } | { success: string } | null;

const COOKIE_OPTS = {
  path: "/",
  httpOnly: true,
  sameSite: "lax" as const,
  maxAge: 60 * 60 * 24 * 365,
};

async function setActiveCookie(id: string) {
  const cookieStore = await cookies();
  cookieStore.set(ACTIVE_HOUSEHOLD_COOKIE, id, COOKIE_OPTS);
}

/** Switch which household is active. Setting the cookie re-renders the page. */
export async function setActiveHousehold(formData: FormData): Promise<void> {
  const id = String(formData.get("household_id") ?? "");
  const supabase = await createClient();
  const memberships = await getMemberships(supabase);
  if (memberships.some((m) => m.household_id === id)) {
    await setActiveCookie(id);
  }
}

/** Create a household (caller becomes owner), make it active, go to dashboard. */
export async function createHousehold(
  _prev: HouseholdActionState,
  formData: FormData,
): Promise<HouseholdActionState> {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Enter a household name." };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_household", {
    p_name: name,
  });
  if (error || !data) {
    return { error: error?.message ?? "Could not create the household." };
  }

  await setActiveCookie(data.id);
  redirect("/");
}

/** Request to join a household by invite code (owner must approve). */
export async function requestToJoin(
  _prev: HouseholdActionState,
  formData: FormData,
): Promise<HouseholdActionState> {
  const code = String(formData.get("code") ?? "").trim();
  if (!code) return { error: "Enter an invite code." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("request_to_join", { p_code: code });
  if (error) {
    return { error: capitalize(error.message) };
  }

  revalidatePath("/onboarding");
  return {
    success: "Request sent. The household owner needs to approve you.",
  };
}

export async function approveRequest(formData: FormData): Promise<void> {
  const id = String(formData.get("request_id") ?? "");
  const supabase = await createClient();
  await supabase.rpc("approve_join_request", { p_request_id: id });
  revalidatePath("/household");
}

export async function rejectRequest(formData: FormData): Promise<void> {
  const id = String(formData.get("request_id") ?? "");
  const supabase = await createClient();
  await supabase.rpc("reject_join_request", { p_request_id: id });
  revalidatePath("/household");
}

/** Leave a household (members only). Owners manage membership instead. */
export async function leaveHousehold(formData: FormData): Promise<void> {
  const householdId = String(formData.get("household_id") ?? "");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  await supabase
    .from("household_members")
    .delete()
    .eq("household_id", householdId)
    .eq("user_id", user.id)
    .eq("role", "member");

  const cookieStore = await cookies();
  if (cookieStore.get(ACTIVE_HOUSEHOLD_COOKIE)?.value === householdId) {
    cookieStore.delete(ACTIVE_HOUSEHOLD_COOKIE);
  }
  redirect("/");
}

function capitalize(msg: string): string {
  return msg.length ? msg[0].toUpperCase() + msg.slice(1) : msg;
}

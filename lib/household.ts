import type { User } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "./supabase/server";
import type { Membership } from "./types";

/**
 * Active-household resolution.
 *
 * RLS scopes a user to every household they belong to; the *active* household
 * is a UX choice layered on top (which one am I looking at right now). It lives
 * in a cookie — not a security boundary, so a cookie is enough — and every data
 * query filters by it. See `lib/supabase/server.ts` for the client pattern.
 */

export const ACTIVE_HOUSEHOLD_COOKIE = "active_household";

export type ServerClient = Awaited<ReturnType<typeof createClient>>;

/** Households the current user belongs to, with their role, oldest first. */
export async function getMemberships(
  supabase: ServerClient,
): Promise<Membership[]> {
  const { data } = await supabase
    .from("household_members")
    .select("role, joined_at, household:households(id, name, invite_code)")
    .order("joined_at", { ascending: true });

  return (data ?? [])
    .filter((row) => row.household)
    .map((row) => {
      const h = row.household as unknown as {
        id: string;
        name: string;
        invite_code: string;
      };
      return {
        household_id: h.id,
        name: h.name,
        invite_code: h.invite_code,
        role: row.role as Membership["role"],
      };
    });
}

/** Pick the active membership from the cookie, falling back to the first one. */
async function pickActive(memberships: Membership[]): Promise<Membership | null> {
  if (memberships.length === 0) return null;
  const cookieStore = await cookies();
  const activeId = cookieStore.get(ACTIVE_HOUSEHOLD_COOKIE)?.value;
  return memberships.find((m) => m.household_id === activeId) ?? memberships[0];
}

/** The active household, or null if the user belongs to none. */
export async function getActiveHousehold(
  supabase: ServerClient,
): Promise<Membership | null> {
  return pickActive(await getMemberships(supabase));
}

export interface HouseholdContext {
  supabase: ServerClient;
  user: User;
  household: Membership;
  memberships: Membership[];
}

/**
 * Resolve the signed-in user and their active household for an authed page or
 * action. Redirects to /login when signed out and to /onboarding when the user
 * has no household yet. Returns the client so callers reuse it.
 */
export async function requireHousehold(): Promise<HouseholdContext> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const memberships = await getMemberships(supabase);
  const household = await pickActive(memberships);
  if (!household) redirect("/onboarding");

  return { supabase, user, household, memberships };
}

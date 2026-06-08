import { requireHousehold } from "@/lib/household";
import { Nav } from "@/components/nav";

// Defence in depth: the proxy already redirects unauthenticated requests, but
// every authed route also re-resolves the session + active household here.
// `requireHousehold` redirects to /login (signed out) or /onboarding (no
// household yet).
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { supabase, user, household, memberships } = await requireHousehold();

  // Owner-only badge: how many people are waiting to join the active household.
  let pendingCount = 0;
  if (household.role === "owner") {
    const { count } = await supabase
      .from("household_join_requests")
      .select("id", { count: "exact", head: true })
      .eq("household_id", household.household_id)
      .eq("status", "pending");
    pendingCount = count ?? 0;
  }

  return (
    <div className="min-h-screen pb-16 md:pb-0">
      <Nav
        email={user.email ?? null}
        household={household}
        memberships={memberships}
        pendingCount={pendingCount}
      />
      <main className="mx-auto max-w-5xl px-4 py-5">{children}</main>
    </div>
  );
}

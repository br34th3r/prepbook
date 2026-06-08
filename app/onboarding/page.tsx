import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getMemberships } from "@/lib/household";
import { logout } from "@/app/login/actions";
import type { JoinRequestStatus } from "@/lib/types";
import { CreateHouseholdForm, JoinHouseholdForm } from "./onboarding-form";

const STATUS_LABEL: Record<JoinRequestStatus, string> = {
  pending: "Waiting for the owner to approve",
  approved: "Approved",
  rejected: "Declined",
};

export default async function OnboardingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Already in a household → straight to the app.
  const memberships = await getMemberships(supabase);
  if (memberships.length > 0) redirect("/");

  // The user can read their own requests even before approval (households stay
  // hidden until they're a member, so we only show the status here).
  const { data: requests } = await supabase
    .from("household_join_requests")
    .select("id, status, created_at")
    .order("created_at", { ascending: false });

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-brand-dark">
            Welcome to Mealplan
          </h1>
          <p className="mt-1 text-sm text-muted">
            Create a household or join an existing one to get started.
          </p>
        </div>
        <form action={logout}>
          <button className="text-sm text-muted hover:text-danger" type="submit">
            Sign out
          </button>
        </form>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <CreateHouseholdForm />
        <JoinHouseholdForm />
      </div>

      {requests && requests.length > 0 && (
        <div className="card mt-6 p-6">
          <h2 className="text-sm font-semibold text-foreground">
            Your join requests
          </h2>
          <ul className="mt-3 space-y-2">
            {requests.map((r) => (
              <li
                key={r.id}
                className="flex items-center justify-between text-sm"
              >
                <span className="text-muted">
                  {new Date(r.created_at).toLocaleDateString()}
                </span>
                <span
                  className={
                    r.status === "rejected"
                      ? "text-danger"
                      : r.status === "approved"
                        ? "text-brand-dark"
                        : "text-foreground"
                  }
                >
                  {STATUS_LABEL[r.status as JoinRequestStatus]}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </main>
  );
}

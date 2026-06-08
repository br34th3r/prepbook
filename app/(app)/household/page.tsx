import { requireHousehold } from "@/lib/household";
import { approveRequest, rejectRequest, leaveHousehold } from "./actions";
import { InviteCode } from "./invite-code";

export default async function HouseholdPage() {
  const { supabase, user, household } = await requireHousehold();
  const isOwner = household.role === "owner";

  const { data: members } = await supabase
    .from("household_members")
    .select("user_id, role, email, display_name, joined_at")
    .eq("household_id", household.household_id)
    .order("joined_at", { ascending: true });

  const { data: pendingRaw } = isOwner
    ? await supabase
        .from("household_join_requests")
        .select("id, requester_email, requester_name, created_at")
        .eq("household_id", household.household_id)
        .eq("status", "pending")
        .order("created_at", { ascending: true })
    : { data: [] };
  const pending = pendingRaw ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-brand-dark">
          {household.name}
        </h1>
        <p className="mt-1 text-sm text-muted">
          {isOwner ? "You own this household." : "You are a member."}
        </p>
      </div>

      {/* Invite code */}
      <section className="card p-6">
        <h2 className="text-sm font-semibold text-foreground">Invite code</h2>
        <p className="mt-1 text-sm text-muted">
          Share this code. New members enter it, then you approve them below.
        </p>
        <div className="mt-4">
          <InviteCode code={household.invite_code} />
        </div>
      </section>

      {/* Pending requests (owner only) */}
      {isOwner && (
        <section className="card p-6">
          <h2 className="text-sm font-semibold text-foreground">
            Join requests
          </h2>
          {pending.length === 0 ? (
            <p className="mt-2 text-sm text-muted">No pending requests.</p>
          ) : (
            <ul className="mt-3 divide-y divide-border">
              {pending.map((r) => (
                <li
                  key={r.id}
                  className="flex items-center justify-between gap-3 py-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">
                      {r.requester_name || r.requester_email || "Unknown user"}
                    </p>
                    {r.requester_name && r.requester_email && (
                      <p className="truncate text-xs text-muted">
                        {r.requester_email}
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <form action={approveRequest}>
                      <input type="hidden" name="request_id" value={r.id} />
                      <button type="submit" className="btn-primary">
                        Approve
                      </button>
                    </form>
                    <form action={rejectRequest}>
                      <input type="hidden" name="request_id" value={r.id} />
                      <button type="submit" className="btn-secondary">
                        Decline
                      </button>
                    </form>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {/* Members */}
      <section className="card p-6">
        <h2 className="text-sm font-semibold text-foreground">Members</h2>
        <ul className="mt-3 divide-y divide-border">
          {(members ?? []).map((m) => (
            <li
              key={m.user_id}
              className="flex items-center justify-between py-3"
            >
              <span className="text-sm text-foreground">
                {m.display_name || m.email || m.user_id}
                {m.user_id === user.id && (
                  <span className="ml-2 text-xs text-muted">(you)</span>
                )}
              </span>
              <span className="text-xs uppercase tracking-wide text-muted">
                {m.role}
              </span>
            </li>
          ))}
        </ul>
      </section>

      {/* Leave (members only) */}
      {!isOwner && (
        <form action={leaveHousehold}>
          <input
            type="hidden"
            name="household_id"
            value={household.household_id}
          />
          <button type="submit" className="btn-danger">
            Leave household
          </button>
        </form>
      )}
    </div>
  );
}

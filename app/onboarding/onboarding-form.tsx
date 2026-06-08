"use client";

import { useActionState } from "react";
import {
  createHousehold,
  requestToJoin,
  type HouseholdActionState,
} from "@/app/(app)/household/actions";

export function CreateHouseholdForm() {
  const [state, action, pending] = useActionState<
    HouseholdActionState,
    FormData
  >(createHousehold, null);

  return (
    <div className="card p-6">
      <h2 className="text-lg font-semibold text-brand-dark">
        Create a household
      </h2>
      <p className="mt-1 text-sm text-muted">
        Start fresh and invite your partner with a code.
      </p>
      <form action={action} className="mt-4 space-y-3">
        <div>
          <label className="label" htmlFor="name">
            Household name
          </label>
          <input
            id="name"
            name="name"
            type="text"
            required
            className="input"
            placeholder="e.g. The Smiths"
          />
        </div>
        {state && "error" in state && (
          <p className="text-sm text-danger" role="alert">
            {state.error}
          </p>
        )}
        <button type="submit" className="btn-primary w-full" disabled={pending}>
          {pending ? "Creating…" : "Create household"}
        </button>
      </form>
    </div>
  );
}

export function JoinHouseholdForm() {
  const [state, action, pending] = useActionState<
    HouseholdActionState,
    FormData
  >(requestToJoin, null);

  return (
    <div className="card p-6">
      <h2 className="text-lg font-semibold text-brand-dark">
        Join with a code
      </h2>
      <p className="mt-1 text-sm text-muted">
        Enter an invite code. The household owner approves your request.
      </p>
      <form action={action} className="mt-4 space-y-3">
        <div>
          <label className="label" htmlFor="code">
            Invite code
          </label>
          <input
            id="code"
            name="code"
            type="text"
            required
            autoCapitalize="characters"
            className="input font-mono uppercase tracking-wide"
            placeholder="ABCD1234"
          />
        </div>
        {state && "error" in state && (
          <p className="text-sm text-danger" role="alert">
            {state.error}
          </p>
        )}
        {state && "success" in state && (
          <p className="text-sm text-brand-dark" role="status">
            {state.success}
          </p>
        )}
        <button type="submit" className="btn-primary w-full" disabled={pending}>
          {pending ? "Sending…" : "Request to join"}
        </button>
      </form>
    </div>
  );
}

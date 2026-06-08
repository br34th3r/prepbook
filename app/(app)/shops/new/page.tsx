"use client";

import Link from "next/link";
import { useActionState } from "react";
import { createTrip, type TripFormState } from "../actions";

export default function NewShopPage() {
  const [state, formAction, pending] = useActionState<TripFormState, FormData>(
    createTrip,
    null,
  );

  return (
    <div className="space-y-5">
      <div>
        <Link href="/shops" className="text-sm text-muted hover:text-foreground">
          ← Shops
        </Link>
        <h1 className="mt-1 text-xl font-semibold">New shop</h1>
      </div>

      <form action={formAction} className="card max-w-md space-y-4 p-4">
        <div>
          <label className="label" htmlFor="trip_at">Date &amp; time</label>
          <input
            id="trip_at"
            name="trip_at"
            type="datetime-local"
            required
            className="input"
          />
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="is_recurring"
            className="h-4 w-4 rounded border-border accent-[var(--color-brand)]"
          />
          Repeat weekly on this weekday
        </label>

        <div>
          <label className="label" htmlFor="note">Note (optional)</label>
          <input id="note" name="note" className="input" placeholder="e.g. Big shop" />
        </div>

        {state?.error && (
          <p className="text-sm text-danger" role="alert">{state.error}</p>
        )}

        <button type="submit" className="btn-primary" disabled={pending}>
          {pending ? "Creating…" : "Create shop"}
        </button>
      </form>
    </div>
  );
}

import Link from "next/link";
import { requireHousehold } from "@/lib/household";
import { formatDateTime } from "@/lib/dates";
import type { ShoppingTrip } from "@/lib/types";

const STATUS_STYLE: Record<string, string> = {
  planned: "bg-brand-soft text-brand-dark",
  done: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200",
  skipped: "bg-neutral-200 text-neutral-600 dark:bg-neutral-700 dark:text-neutral-300",
};

function TripRow({ trip }: { trip: ShoppingTrip }) {
  return (
    <li>
      <Link
        href={`/shops/${trip.id}`}
        className="card flex items-center justify-between gap-3 p-3 transition-shadow hover:shadow-md"
      >
        <div>
          <div className="font-medium">{formatDateTime(trip.trip_at)}</div>
          <div className="flex items-center gap-2 text-xs text-muted">
            {trip.is_recurring && trip.recurrence_rule && (
              <span className="chip">↻ {trip.recurrence_rule}</span>
            )}
            {trip.note && <span>{trip.note}</span>}
          </div>
        </div>
        <span
          className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
            STATUS_STYLE[trip.status] ?? STATUS_STYLE.planned
          }`}
        >
          {trip.status}
        </span>
      </Link>
    </li>
  );
}

export default async function ShopsPage() {
  const { supabase, household } = await requireHousehold();
  const { data } = await supabase
    .from("shopping_trips")
    .select("*")
    .eq("household_id", household.household_id)
    .order("trip_at", { ascending: true });
  const trips = (data ?? []) as ShoppingTrip[];

  const now = new Date().toISOString();
  const upcoming = trips.filter((t) => t.trip_at >= now);
  const past = trips.filter((t) => t.trip_at < now).reverse();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Shops</h1>
        <Link href="/shops/new" className="btn-primary">
          + New shop
        </Link>
      </div>

      <section className="space-y-2">
        <h2 className="text-sm font-medium text-muted">Upcoming</h2>
        {upcoming.length === 0 ? (
          <p className="text-muted">No upcoming shops.</p>
        ) : (
          <ul className="space-y-2">
            {upcoming.map((t) => (
              <TripRow key={t.id} trip={t} />
            ))}
          </ul>
        )}
      </section>

      {past.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-medium text-muted">Past</h2>
          <ul className="space-y-2">
            {past.map((t) => (
              <TripRow key={t.id} trip={t} />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

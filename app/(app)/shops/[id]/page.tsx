import Link from "next/link";
import { notFound } from "next/navigation";
import { getTripGroceries } from "@/lib/shops";
import { formatDateTime, formatDate } from "@/lib/dates";
import { GroceryList } from "@/components/grocery-list";
import { TripStatusControls } from "@/components/trip-status-controls";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import { deleteTrip } from "../actions";

export default async function ShopDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const data = await getTripGroceries(id);
  if (!data) notFound();

  const { trip, window, derived, extras, mealCount } = data;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <Link href="/shops" className="text-sm text-muted hover:text-foreground">
          ← Shops
        </Link>
        <form action={deleteTrip}>
          <input type="hidden" name="tripId" value={trip.id} />
          <ConfirmSubmitButton message="Delete this shop?">
            Delete
          </ConfirmSubmitButton>
        </form>
      </div>

      <header className="space-y-3">
        <div>
          <h1 className="text-xl font-semibold">{formatDateTime(trip.trip_at)}</h1>
          {trip.is_recurring && trip.recurrence_rule && (
            <span className="chip mt-1">↻ {trip.recurrence_rule}</span>
          )}
          {trip.note && <p className="mt-1 text-muted">{trip.note}</p>}
        </div>
        <TripStatusControls
          tripId={trip.id}
          status={trip.status}
          isRecurring={trip.is_recurring}
        />
        <p className="text-sm text-muted">
          Covers meals {formatDate(window.start)} – {formatDate(window.end)} ·{" "}
          {mealCount} {mealCount === 1 ? "meal" : "meals"} planned
        </p>
      </header>

      <GroceryList tripId={trip.id} derived={derived} extras={extras} />
    </div>
  );
}

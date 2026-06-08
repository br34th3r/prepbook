"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { setTripStatus } from "@/app/(app)/shops/actions";
import type { TripStatus } from "@/lib/types";

const OPTIONS: { value: TripStatus; label: string }[] = [
  { value: "planned", label: "Planned" },
  { value: "done", label: "Done" },
  { value: "skipped", label: "Skipped" },
];

export function TripStatusControls({
  tripId,
  status,
  isRecurring,
}: {
  tripId: string;
  status: TripStatus;
  isRecurring: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function choose(value: TripStatus) {
    if (value === status) return;
    startTransition(async () => {
      await setTripStatus({ id: tripId, status: value });
      router.refresh();
    });
  }

  return (
    <div className="space-y-1">
      <div className="inline-flex overflow-hidden rounded-lg border border-border">
        {OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => choose(opt.value)}
            disabled={pending}
            className={`px-3 py-1.5 text-sm font-medium transition-colors disabled:opacity-50 ${
              status === opt.value
                ? "bg-brand text-white"
                : "bg-surface text-muted hover:bg-background"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
      {isRecurring && (
        <p className="text-xs text-muted">
          Marking this recurring shop done creates next week&apos;s shop.
        </p>
      )}
    </div>
  );
}

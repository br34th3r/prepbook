"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { groupByCategory, formatQuantity } from "@/lib/grocery";
import type { DerivedLine } from "@/lib/shops";
import type { GroceryExtraItem } from "@/lib/types";
import {
  toggleDerivedItem,
  toggleExtraItem,
  addExtraItem,
  removeExtraItem,
} from "@/app/(app)/shops/actions";

interface DisplayItem {
  key: string;
  name: string;
  category: string | null;
  qtyLabel: string;
  checked: boolean;
  kind: "derived" | "extra";
  derived?: DerivedLine;
  extraId?: string;
}

export function GroceryList({
  tripId,
  derived,
  extras,
}: {
  tripId: string;
  derived: DerivedLine[];
  extras: GroceryExtraItem[];
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  // Optimistic check-state overrides, keyed by item key.
  const [overrides, setOverrides] = useState<Record<string, boolean>>({});

  const items: DisplayItem[] = [
    ...derived.map((d): DisplayItem => ({
      key: `d:${d.ingredient_id}:${d.unit}`,
      name: d.name,
      category: d.category,
      qtyLabel: `${formatQuantity(d.quantity)} ${d.unit}`,
      checked: d.checked,
      kind: "derived",
      derived: d,
    })),
    ...extras.map((e): DisplayItem => ({
      key: `e:${e.id}`,
      name: e.label,
      category: e.category,
      qtyLabel:
        e.quantity != null
          ? `${formatQuantity(e.quantity)}${e.unit ? ` ${e.unit}` : ""}`
          : e.unit ?? "",
      checked: e.checked,
      kind: "extra",
      extraId: e.id,
    })),
  ];

  const isChecked = (it: DisplayItem) => overrides[it.key] ?? it.checked;

  function toggle(it: DisplayItem) {
    const next = !isChecked(it);
    setOverrides((o) => ({ ...o, [it.key]: next }));
    startTransition(async () => {
      if (it.kind === "derived" && it.derived) {
        await toggleDerivedItem({
          tripId,
          ingredientId: it.derived.ingredient_id,
          unit: it.derived.unit,
          checked: next,
        });
      } else if (it.extraId) {
        await toggleExtraItem({ id: it.extraId, tripId, checked: next });
      }
      router.refresh();
    });
  }

  function remove(extraId: string) {
    startTransition(async () => {
      await removeExtraItem({ id: extraId, tripId });
      router.refresh();
    });
  }

  const groups = groupByCategory(items);
  const total = items.length;
  const done = items.filter(isChecked).length;

  const hasMixedUnits = derived.some((a) =>
    derived.some(
      (b) => a.ingredient_id === b.ingredient_id && a.unit !== b.unit,
    ),
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-medium">Grocery list</h2>
        <span className="text-sm text-muted">
          {done}/{total} checked
        </span>
      </div>

      {hasMixedUnits && (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
          Some ingredients appear in more than one unit — these are listed
          separately (no unit conversion).
        </p>
      )}

      {total === 0 ? (
        <p className="text-muted">
          Nothing to buy yet. Plan some meals in this shop&apos;s window, or add
          an extra item below.
        </p>
      ) : (
        <div className="space-y-4">
          {groups.map((group) => (
            <div key={group.category}>
              <h3 className="sticky top-0 z-10 -mx-1 bg-background/95 px-1 py-1 text-xs font-semibold uppercase tracking-wide text-muted backdrop-blur">
                {group.category}
              </h3>
              <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface">
                {group.items.map((it) => {
                  const checked = isChecked(it);
                  return (
                    <li key={it.key} className="flex items-center gap-3">
                      <button
                        onClick={() => toggle(it)}
                        className="flex flex-1 items-center gap-3 px-3 py-3 text-left"
                      >
                        <span
                          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md border ${
                            checked
                              ? "border-brand bg-brand text-white"
                              : "border-border"
                          }`}
                          aria-hidden
                        >
                          {checked ? "✓" : ""}
                        </span>
                        <span
                          className={`flex-1 ${
                            checked ? "text-muted line-through" : ""
                          }`}
                        >
                          {it.name}
                          {it.kind === "extra" && (
                            <span className="ml-2 text-xs text-muted">extra</span>
                          )}
                        </span>
                        <span className="shrink-0 text-sm text-muted">
                          {it.qtyLabel}
                        </span>
                      </button>
                      {it.kind === "extra" && it.extraId && (
                        <button
                          onClick={() => remove(it.extraId!)}
                          className="pr-3 text-muted hover:text-danger"
                          aria-label={`Remove ${it.name}`}
                        >
                          ✕
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      )}

      <AddExtraForm tripId={tripId} onAdded={() => router.refresh()} />
    </div>
  );
}

function AddExtraForm({
  tripId,
  onAdded,
}: {
  tripId: string;
  onAdded: () => void;
}) {
  const [label, setLabel] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState("");
  const [category, setCategory] = useState("");
  const [pending, startTransition] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!label.trim()) return;
    startTransition(async () => {
      await addExtraItem({ tripId, label, quantity, unit, category });
      setLabel("");
      setQuantity("");
      setUnit("");
      setCategory("");
      onAdded();
    });
  }

  return (
    <form
      onSubmit={submit}
      className="card grid grid-cols-2 gap-2 p-3 sm:grid-cols-[1fr_5rem_5rem_7rem_auto]"
    >
      <input
        className="input col-span-2 sm:col-span-1"
        placeholder="Add extra item…"
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        aria-label="Extra item label"
      />
      <input
        className="input"
        placeholder="Qty"
        type="number"
        step="any"
        value={quantity}
        onChange={(e) => setQuantity(e.target.value)}
        aria-label="Quantity"
      />
      <input
        className="input"
        placeholder="Unit"
        value={unit}
        onChange={(e) => setUnit(e.target.value)}
        aria-label="Unit"
      />
      <input
        className="input"
        placeholder="Category"
        value={category}
        onChange={(e) => setCategory(e.target.value)}
        aria-label="Category"
      />
      <button type="submit" className="btn-primary" disabled={pending}>
        Add
      </button>
    </form>
  );
}

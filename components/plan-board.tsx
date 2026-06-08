"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { MEAL_SLOTS, type MealSlot } from "@/lib/types";
import { weekdayLabel, formatDate } from "@/lib/dates";
import { addMeal, updateMeal, removeMeal } from "@/app/(app)/plan/actions";

export interface PlanMeal {
  id: string;
  recipe_id: string;
  meal_date: string;
  slot: MealSlot;
  servings: number;
  note: string | null;
  recipe: { name: string; servings: number };
}

interface RecipeOption {
  id: string;
  name: string;
  servings: number;
}

type Editing =
  | { mode: "add"; date: string; slot: MealSlot }
  | { mode: "edit"; meal: PlanMeal }
  | null;

const SLOT_LABELS: Record<MealSlot, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
  snack: "Snack",
};

export function PlanBoard({
  weekDates,
  meals,
  recipes,
  today,
}: {
  weekDates: string[];
  meals: PlanMeal[];
  recipes: RecipeOption[];
  today: string;
}) {
  const [editing, setEditing] = useState<Editing>(null);

  const mealsAt = (date: string, slot: MealSlot) =>
    meals.filter((m) => m.meal_date === date && m.slot === slot);

  return (
    <>
      <div className="overflow-x-auto">
        <div
          className="grid min-w-[44rem] gap-1.5"
          style={{ gridTemplateColumns: "5rem repeat(7, minmax(0, 1fr))" }}
        >
          <div />
          {weekDates.map((date) => (
            <div
              key={date}
              className={`rounded-lg px-2 py-1.5 text-center text-sm font-medium ${
                date === today ? "bg-brand-soft text-brand-dark" : "text-muted"
              }`}
            >
              <div>{weekdayLabel(date)}</div>
              <div className="text-xs">{formatDate(date).split(" ").slice(1).join(" ")}</div>
            </div>
          ))}

          {MEAL_SLOTS.map((slot) => (
            <FragmentRow key={slot}>
              <div className="flex items-center text-sm font-medium text-muted">
                {SLOT_LABELS[slot]}
              </div>
              {weekDates.map((date) => {
                const cell = mealsAt(date, slot);
                return (
                  <div
                    key={`${date}-${slot}`}
                    className="min-h-[3.5rem] space-y-1 rounded-lg border border-border bg-surface p-1"
                  >
                    {cell.map((m) => (
                      <button
                        key={m.id}
                        onClick={() => setEditing({ mode: "edit", meal: m })}
                        className="block w-full rounded bg-brand-soft px-1.5 py-1 text-left text-xs text-brand-dark hover:bg-brand/20"
                      >
                        <span className="font-medium">{m.recipe.name}</span>
                        <span className="text-brand-dark/70"> · {m.servings}</span>
                      </button>
                    ))}
                    <button
                      onClick={() => setEditing({ mode: "add", date, slot })}
                      className="w-full rounded px-1 py-0.5 text-xs text-muted hover:bg-background"
                      aria-label={`Add ${slot} on ${date}`}
                    >
                      +
                    </button>
                  </div>
                );
              })}
            </FragmentRow>
          ))}
        </div>
      </div>

      {editing && (
        <MealDialog
          editing={editing}
          recipes={recipes}
          onClose={() => setEditing(null)}
        />
      )}
    </>
  );
}

// Grid children must be direct, so a row is just a fragment of cells.
function FragmentRow({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

function MealDialog({
  editing,
  recipes,
  onClose,
}: {
  editing: NonNullable<Editing>;
  recipes: RecipeOption[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const isEdit = editing.mode === "edit";
  const initialRecipe = isEdit ? editing.meal.recipe_id : recipes[0]?.id ?? "";
  const [recipeId, setRecipeId] = useState(initialRecipe);
  const [servings, setServings] = useState(
    isEdit
      ? editing.meal.servings
      : recipes.find((r) => r.id === initialRecipe)?.servings ?? 2,
  );
  const [note, setNote] = useState(isEdit ? editing.meal.note ?? "" : "");

  function onRecipeChange(id: string) {
    setRecipeId(id);
    if (!isEdit) {
      setServings(recipes.find((r) => r.id === id)?.servings ?? 2);
    }
  }

  function run(fn: () => Promise<void>) {
    startTransition(async () => {
      await fn();
      router.refresh();
      onClose();
    });
  }

  function save() {
    if (isEdit) {
      run(() => updateMeal({ id: editing.meal.id, servings, note }));
    } else {
      if (!recipeId) return;
      run(() =>
        addMeal({
          recipeId,
          date: editing.date,
          slot: editing.slot,
          servings,
          note,
        }),
      );
    }
  }

  return (
    <div
      className="fixed inset-0 z-30 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="card w-full max-w-md space-y-4 rounded-b-none p-5 sm:rounded-b-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-medium">
          {isEdit
            ? `Edit ${SLOT_LABELS[editing.meal.slot].toLowerCase()}`
            : `Add ${SLOT_LABELS[editing.slot].toLowerCase()}`}
        </h2>

        {isEdit ? (
          <p className="text-sm text-muted">{editing.meal.recipe.name}</p>
        ) : recipes.length === 0 ? (
          <p className="text-sm text-muted">
            No recipes yet. Add a recipe first.
          </p>
        ) : (
          <div>
            <label className="label" htmlFor="recipe">Recipe</label>
            <select
              id="recipe"
              className="input"
              value={recipeId}
              onChange={(e) => onRecipeChange(e.target.value)}
            >
              {recipes.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label className="label" htmlFor="servings">Planned servings</label>
          <input
            id="servings"
            type="number"
            min={1}
            className="input"
            value={servings}
            onChange={(e) => setServings(Number(e.target.value))}
          />
        </div>

        <div>
          <label className="label" htmlFor="note">Note (optional)</label>
          <input
            id="note"
            className="input"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-2">
          <button
            className="btn-primary"
            onClick={save}
            disabled={pending || (!isEdit && recipes.length === 0)}
          >
            {pending ? "Saving…" : isEdit ? "Save" : "Add to plan"}
          </button>
          <button className="btn-secondary" onClick={onClose} disabled={pending}>
            Cancel
          </button>
          {isEdit && (
            <button
              className="btn-danger ml-auto"
              disabled={pending}
              onClick={() => run(() => removeMeal(editing.meal.id))}
            >
              Remove
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

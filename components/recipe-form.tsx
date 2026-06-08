"use client";

import { useActionState, useState } from "react";
import type { Ingredient } from "@/lib/types";
import type { RecipeFormState } from "@/app/(app)/recipes/actions";

interface Row {
  key: string;
  name: string;
  quantity: string;
  unit: string;
  note: string;
}

export interface RecipeFormInitial {
  name: string;
  description: string;
  instructions: string;
  servings: number;
  prep_minutes: string;
  cook_minutes: string;
  source_url: string;
  tags: string;
  rows: { name: string; quantity: string; unit: string; note: string }[];
}

let counter = 0;
const newKey = () => `r${counter++}`;

function emptyRow(): Row {
  return { key: newKey(), name: "", quantity: "", unit: "", note: "" };
}

export function RecipeForm({
  ingredients,
  action,
  initial,
  submitLabel,
}: {
  ingredients: Ingredient[];
  action: (
    prev: RecipeFormState,
    formData: FormData,
  ) => Promise<RecipeFormState>;
  initial?: RecipeFormInitial;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState<RecipeFormState, FormData>(
    action,
    null,
  );

  const [rows, setRows] = useState<Row[]>(
    initial?.rows.length
      ? initial.rows.map((r) => ({ ...r, key: newKey() }))
      : [emptyRow()],
  );

  const unitByName = new Map(
    ingredients.map((i) => [i.name.toLowerCase(), i.default_unit ?? ""]),
  );

  function updateRow(key: string, patch: Partial<Row>) {
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }
  function onNameChange(key: string, name: string) {
    const defaultUnit = unitByName.get(name.trim().toLowerCase());
    setRows((rs) =>
      rs.map((r) =>
        r.key === key
          ? { ...r, name, unit: r.unit || defaultUnit || "" }
          : r,
      ),
    );
  }

  const ingredientsJson = JSON.stringify(
    rows.map(({ name, quantity, unit, note }) => ({ name, quantity, unit, note })),
  );

  return (
    <form action={formAction} className="space-y-6">
      <input type="hidden" name="ingredients" value={ingredientsJson} />
      <datalist id="ingredient-options">
        {ingredients.map((i) => (
          <option key={i.id} value={i.name} />
        ))}
      </datalist>

      <section className="card space-y-4 p-4">
        <div>
          <label className="label" htmlFor="name">Name</label>
          <input id="name" name="name" required className="input"
            defaultValue={initial?.name} placeholder="e.g. Spaghetti Carbonara" />
        </div>
        <div>
          <label className="label" htmlFor="description">Description</label>
          <input id="description" name="description" className="input"
            defaultValue={initial?.description} placeholder="A short summary" />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="label" htmlFor="servings">Servings</label>
            <input id="servings" name="servings" type="number" min={1} required
              className="input" defaultValue={initial?.servings ?? 2} />
          </div>
          <div>
            <label className="label" htmlFor="prep_minutes">Prep (min)</label>
            <input id="prep_minutes" name="prep_minutes" type="number" min={0}
              className="input" defaultValue={initial?.prep_minutes} />
          </div>
          <div>
            <label className="label" htmlFor="cook_minutes">Cook (min)</label>
            <input id="cook_minutes" name="cook_minutes" type="number" min={0}
              className="input" defaultValue={initial?.cook_minutes} />
          </div>
        </div>
        <div>
          <label className="label" htmlFor="source_url">Source URL</label>
          <input id="source_url" name="source_url" type="url" className="input"
            defaultValue={initial?.source_url} placeholder="https://…" />
        </div>
      </section>

      <section className="card space-y-3 p-4">
        <div className="flex items-center justify-between">
          <h2 className="font-medium">Ingredients</h2>
          <button type="button" className="btn-secondary"
            onClick={() => setRows((rs) => [...rs, emptyRow()])}>
            + Add row
          </button>
        </div>
        <p className="text-xs text-muted">
          Type to search existing ingredients, or enter a new name to create one.
        </p>

        <div className="space-y-2">
          {rows.map((row) => (
            <div key={row.key} className="grid grid-cols-[1fr_4rem_4.5rem_auto] gap-2 sm:grid-cols-[1fr_5rem_6rem_1fr_auto]">
              <input
                aria-label="Ingredient"
                list="ingredient-options"
                className="input"
                placeholder="Ingredient"
                value={row.name}
                onChange={(e) => onNameChange(row.key, e.target.value)}
              />
              <input
                aria-label="Quantity"
                type="number"
                step="any"
                min={0}
                className="input"
                placeholder="Qty"
                value={row.quantity}
                onChange={(e) => updateRow(row.key, { quantity: e.target.value })}
              />
              <input
                aria-label="Unit"
                className="input"
                placeholder="Unit"
                value={row.unit}
                onChange={(e) => updateRow(row.key, { unit: e.target.value })}
              />
              <input
                aria-label="Note"
                className="input hidden sm:block"
                placeholder="Note (optional)"
                value={row.note}
                onChange={(e) => updateRow(row.key, { note: e.target.value })}
              />
              <button
                type="button"
                aria-label="Remove ingredient"
                className="btn-secondary px-2"
                onClick={() =>
                  setRows((rs) =>
                    rs.length > 1 ? rs.filter((r) => r.key !== row.key) : rs,
                  )
                }
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      </section>

      <section className="card space-y-4 p-4">
        <div>
          <label className="label" htmlFor="instructions">Instructions (markdown)</label>
          <textarea id="instructions" name="instructions" rows={8} className="input"
            defaultValue={initial?.instructions}
            placeholder={"1. Step one\n2. Step two"} />
        </div>
        <div>
          <label className="label" htmlFor="tags">Tags (comma separated)</label>
          <input id="tags" name="tags" className="input" defaultValue={initial?.tags}
            placeholder="pasta, quick, vegetarian" />
        </div>
        <div>
          <label className="label" htmlFor="image">Image</label>
          <input id="image" name="image" type="file" accept="image/*"
            className="block w-full text-sm text-muted file:mr-3 file:rounded-lg file:border-0 file:bg-brand-soft file:px-3 file:py-2 file:text-sm file:font-medium file:text-brand-dark" />
          {initial && (
            <p className="mt-1 text-xs text-muted">
              Leave empty to keep the current image.
            </p>
          )}
        </div>
      </section>

      {state?.error && (
        <p className="text-sm text-danger" role="alert">{state.error}</p>
      )}

      <div className="flex gap-3">
        <button type="submit" className="btn-primary" disabled={pending}>
          {pending ? "Saving…" : submitLabel}
        </button>
      </div>
    </form>
  );
}

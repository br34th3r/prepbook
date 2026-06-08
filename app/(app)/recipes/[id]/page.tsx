import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { getRecipe } from "@/lib/recipes";
import { recipeImageUrl } from "@/lib/storage";
import { formatQuantity } from "@/lib/grocery";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import { deleteRecipe } from "../actions";

export default async function RecipeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const recipe = await getRecipe(id);
  if (!recipe) notFound();

  const img = recipeImageUrl(recipe.image_path);
  const totalTime =
    (recipe.prep_minutes ?? 0) + (recipe.cook_minutes ?? 0) || null;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <Link href="/recipes" className="text-sm text-muted hover:text-foreground">
          ← Recipes
        </Link>
        <div className="flex gap-2">
          <Link href={`/recipes/${recipe.id}/edit`} className="btn-secondary">
            Edit
          </Link>
          <form action={deleteRecipe}>
            <input type="hidden" name="recipeId" value={recipe.id} />
            <ConfirmSubmitButton message={`Delete "${recipe.name}"?`}>
              Delete
            </ConfirmSubmitButton>
          </form>
        </div>
      </div>

      {img && (
        <div className="relative aspect-[2/1] overflow-hidden rounded-xl bg-brand-soft">
          <Image src={img} alt={recipe.name} fill sizes="(max-width: 768px) 100vw, 768px" className="object-cover" />
        </div>
      )}

      <header className="space-y-2">
        <h1 className="text-2xl font-semibold">{recipe.name}</h1>
        {recipe.description && <p className="text-muted">{recipe.description}</p>}
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted">
          <span>Serves {recipe.servings}</span>
          {recipe.prep_minutes != null && <span>Prep {recipe.prep_minutes}m</span>}
          {recipe.cook_minutes != null && <span>Cook {recipe.cook_minutes}m</span>}
          {totalTime && <span>Total {totalTime}m</span>}
          {recipe.source_url && (
            <a href={recipe.source_url} target="_blank" rel="noreferrer" className="text-brand hover:underline">
              Source ↗
            </a>
          )}
        </div>
        {recipe.recipe_tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {recipe.recipe_tags.map((t) => (
              <span key={t.tag} className="chip">{t.tag}</span>
            ))}
          </div>
        )}
      </header>

      <div className="grid gap-5 md:grid-cols-[18rem_1fr]">
        <section className="card h-fit p-4">
          <h2 className="mb-3 font-medium">Ingredients</h2>
          <ul className="space-y-1.5 text-sm">
            {recipe.recipe_ingredients.map((ri) => (
              <li key={ri.id} className="flex justify-between gap-2">
                <span>
                  {ri.ingredient.name}
                  {ri.note && <span className="text-muted"> · {ri.note}</span>}
                </span>
                <span className="shrink-0 text-muted">
                  {formatQuantity(ri.quantity)} {ri.unit}
                </span>
              </li>
            ))}
            {recipe.recipe_ingredients.length === 0 && (
              <li className="text-muted">No ingredients listed.</li>
            )}
          </ul>
        </section>

        <section className="card p-4">
          <h2 className="mb-3 font-medium">Instructions</h2>
          {recipe.instructions ? (
            <div className="whitespace-pre-wrap text-sm leading-relaxed">
              {recipe.instructions}
            </div>
          ) : (
            <p className="text-muted">No instructions yet.</p>
          )}
        </section>
      </div>
    </div>
  );
}

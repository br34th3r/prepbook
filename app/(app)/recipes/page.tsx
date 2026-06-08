import Link from "next/link";
import Image from "next/image";
import { requireHousehold } from "@/lib/household";
import { recipeImageUrl } from "@/lib/storage";
import type { Recipe } from "@/lib/types";

type RecipeListItem = Recipe & { recipe_tags: { tag: string }[] };

export default async function RecipesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; tag?: string }>;
}) {
  const { q, tag } = await searchParams;
  const { supabase, household } = await requireHousehold();

  let query = supabase
    .from("recipes")
    .select("*, recipe_tags(tag)")
    .eq("household_id", household.household_id)
    .order("name");
  if (q) query = query.ilike("name", `%${q}%`);

  const { data } = await query;
  let recipes = (data ?? []) as RecipeListItem[];

  const allTags = [
    ...new Set(recipes.flatMap((r) => r.recipe_tags.map((t) => t.tag))),
  ].sort();

  if (tag) {
    recipes = recipes.filter((r) => r.recipe_tags.some((t) => t.tag === tag));
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Recipes</h1>
        <Link href="/recipes/new" className="btn-primary">
          + New recipe
        </Link>
      </div>

      <form className="flex gap-2" action="/recipes">
        <input
          name="q"
          defaultValue={q}
          className="input"
          placeholder="Search by name…"
          aria-label="Search recipes"
        />
        {tag && <input type="hidden" name="tag" value={tag} />}
        <button type="submit" className="btn-secondary">
          Search
        </button>
      </form>

      {allTags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <FilterChip label="All" href="/recipes" active={!tag} />
          {allTags.map((t) => (
            <FilterChip
              key={t}
              label={t}
              href={`/recipes?tag=${encodeURIComponent(t)}`}
              active={tag === t}
            />
          ))}
        </div>
      )}

      {recipes.length === 0 ? (
        <p className="text-muted">No recipes found.</p>
      ) : (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {recipes.map((recipe) => {
            const img = recipeImageUrl(recipe.image_path);
            return (
              <li key={recipe.id}>
                <Link
                  href={`/recipes/${recipe.id}`}
                  className="card flex h-full flex-col overflow-hidden transition-shadow hover:shadow-md"
                >
                  <div className="relative aspect-[3/2] bg-brand-soft">
                    {img ? (
                      <Image
                        src={img}
                        alt={recipe.name}
                        fill
                        sizes="(max-width: 640px) 100vw, 33vw"
                        className="object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-3xl">
                        🍽️
                      </div>
                    )}
                  </div>
                  <div className="flex flex-1 flex-col gap-1 p-3">
                    <h2 className="font-medium">{recipe.name}</h2>
                    {recipe.description && (
                      <p className="line-clamp-2 text-sm text-muted">
                        {recipe.description}
                      </p>
                    )}
                    <div className="mt-auto flex flex-wrap gap-1 pt-2">
                      {recipe.recipe_tags.map((t) => (
                        <span key={t.tag} className="chip">
                          {t.tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function FilterChip({
  label,
  href,
  active,
}: {
  label: string;
  href: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
        active
          ? "bg-brand text-white"
          : "border border-border bg-surface text-muted hover:text-foreground"
      }`}
    >
      {label}
    </Link>
  );
}

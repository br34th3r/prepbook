/** Public URL for a recipe image stored in the `recipe-images` bucket. */
export function recipeImageUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  return `${base}/storage/v1/object/public/recipe-images/${path}`;
}

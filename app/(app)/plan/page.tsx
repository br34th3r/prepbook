import Link from "next/link";
import { requireHousehold } from "@/lib/household";
import { startOfWeek, weekDays, addDays, todayISO, formatDate } from "@/lib/dates";
import { PlanBoard, type PlanMeal } from "@/components/plan-board";

export default async function PlanPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>;
}) {
  const { week } = await searchParams;
  const today = todayISO();
  const monday = startOfWeek(week && /^\d{4}-\d{2}-\d{2}$/.test(week) ? week : today);
  const dates = weekDays(monday);
  const sunday = dates[6];

  const { supabase, household } = await requireHousehold();
  const hid = household.household_id;
  const [mealsRes, recipesRes] = await Promise.all([
    supabase
      .from("scheduled_meals")
      .select("*, recipe:recipes(name, servings)")
      .eq("household_id", hid)
      .gte("meal_date", monday)
      .lte("meal_date", sunday)
      .order("created_at"),
    supabase
      .from("recipes")
      .select("id, name, servings")
      .eq("household_id", hid)
      .order("name"),
  ]);

  const meals = (mealsRes.data ?? []) as PlanMeal[];
  const recipes = recipesRes.data ?? [];

  const prevWeek = addDays(monday, -7);
  const nextWeek = addDays(monday, 7);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">Meal plan</h1>
        <div className="flex items-center gap-2">
          <Link href={`/plan?week=${prevWeek}`} className="btn-secondary px-3" aria-label="Previous week">
            ←
          </Link>
          <Link href="/plan" className="btn-secondary">
            This week
          </Link>
          <Link href={`/plan?week=${nextWeek}`} className="btn-secondary px-3" aria-label="Next week">
            →
          </Link>
        </div>
      </div>

      <p className="text-sm text-muted">
        {formatDate(monday)} – {formatDate(sunday)}
      </p>

      <PlanBoard
        weekDates={dates}
        meals={meals}
        recipes={recipes}
        today={today}
      />
    </div>
  );
}

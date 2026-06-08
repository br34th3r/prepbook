import Link from "next/link";
import { requireHousehold } from "@/lib/household";
import {
  todayISO,
  startOfWeek,
  weekDays,
  formatDate,
  formatDateTime,
  weekdayLabel,
} from "@/lib/dates";
import { type MealSlot, type ShoppingTrip } from "@/lib/types";

interface WeekMeal {
  meal_date: string;
  slot: MealSlot;
  servings: number;
  recipe: { id: string; name: string } | null;
}

const SLOT_ORDER: Record<MealSlot, number> = {
  breakfast: 0,
  lunch: 1,
  dinner: 2,
  snack: 3,
};

export default async function DashboardPage() {
  const { supabase, household } = await requireHousehold();
  const hid = household.household_id;
  const today = todayISO();
  const monday = startOfWeek(today);
  const dates = weekDays(monday);

  const [mealsRes, tripRes, recipeCountRes] = await Promise.all([
    supabase
      .from("scheduled_meals")
      .select("meal_date, slot, servings, recipe:recipes(id, name)")
      .eq("household_id", hid)
      .gte("meal_date", monday)
      .lte("meal_date", dates[6]),
    supabase
      .from("shopping_trips")
      .select("*")
      .eq("household_id", hid)
      .gte("trip_at", new Date().toISOString())
      .eq("status", "planned")
      .order("trip_at", { ascending: true })
      .limit(1),
    supabase
      .from("recipes")
      .select("id", { count: "exact", head: true })
      .eq("household_id", hid),
  ]);

  const meals = (mealsRes.data ?? []) as unknown as WeekMeal[];
  const nextTrip = (tripRes.data?.[0] ?? null) as ShoppingTrip | null;
  const recipeCount = recipeCountRes.count ?? 0;

  const todaysMeals = meals
    .filter((m) => m.meal_date === today && m.recipe)
    .sort((a, b) => SLOT_ORDER[a.slot] - SLOT_ORDER[b.slot]);

  const mealsByDay = dates.map((date) => ({
    date,
    count: meals.filter((m) => m.meal_date === date).length,
  }));

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">
        {greeting()} — {formatDate(today)}
      </h1>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Today */}
        <section className="card p-4">
          <h2 className="mb-3 font-medium">Today&apos;s meals</h2>
          {todaysMeals.length === 0 ? (
            <p className="text-sm text-muted">
              Nothing planned.{" "}
              <Link href="/plan" className="text-brand hover:underline">
                Plan today
              </Link>
            </p>
          ) : (
            <ul className="space-y-2">
              {todaysMeals.map((m, i) => (
                <li key={i} className="flex items-center justify-between text-sm">
                  <span>
                    <span className="text-muted capitalize">{m.slot}</span>{" "}
                    {m.recipe && (
                      <Link
                        href={`/recipes/${m.recipe.id}`}
                        className="font-medium hover:underline"
                      >
                        {m.recipe.name}
                      </Link>
                    )}
                  </span>
                  <span className="text-muted">{m.servings} servings</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Next shop */}
        <section className="card p-4">
          <h2 className="mb-3 font-medium">Next shop</h2>
          {nextTrip ? (
            <Link href={`/shops/${nextTrip.id}`} className="block">
              <div className="text-lg font-medium text-brand-dark">
                {formatDateTime(nextTrip.trip_at)}
              </div>
              {nextTrip.is_recurring && nextTrip.recurrence_rule && (
                <span className="chip mt-1">↻ {nextTrip.recurrence_rule}</span>
              )}
              <p className="mt-2 text-sm text-brand hover:underline">
                View grocery list →
              </p>
            </Link>
          ) : (
            <p className="text-sm text-muted">
              No shop scheduled.{" "}
              <Link href="/shops/new" className="text-brand hover:underline">
                Plan a shop
              </Link>
            </p>
          )}
        </section>
      </div>

      {/* This week overview */}
      <section className="card p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-medium">This week</h2>
          <Link href="/plan" className="text-sm text-brand hover:underline">
            Open plan →
          </Link>
        </div>
        <div className="grid grid-cols-7 gap-1.5">
          {mealsByDay.map(({ date, count }) => (
            <Link
              key={date}
              href={`/plan?week=${monday}`}
              className={`rounded-lg border border-border p-2 text-center ${
                date === today ? "bg-brand-soft" : "bg-surface"
              }`}
            >
              <div className="text-xs text-muted">{weekdayLabel(date)}</div>
              <div className="text-lg font-semibold">{count}</div>
              <div className="text-[10px] text-muted">
                {count === 1 ? "meal" : "meals"}
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Quick links */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <QuickLink href="/recipes" label="Recipes" sub={`${recipeCount} saved`} />
        <QuickLink href="/recipes/new" label="Add recipe" sub="New" />
        <QuickLink href="/plan" label="Meal plan" sub="This week" />
        <QuickLink href="/shops/new" label="New shop" sub="Schedule" />
      </div>
    </div>
  );
}

function QuickLink({
  href,
  label,
  sub,
}: {
  href: string;
  label: string;
  sub: string;
}) {
  return (
    <Link
      href={href}
      className="card flex flex-col gap-0.5 p-4 transition-shadow hover:shadow-md"
    >
      <span className="font-medium">{label}</span>
      <span className="text-xs text-muted">{sub}</span>
    </Link>
  );
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

import { describe, it, expect } from "vitest";
import {
  coverageWindow,
  findPreviousTrip,
  dateInWindow,
  nextWeeklyTripAt,
} from "./coverage";
import { aggregateGroceries } from "./grocery";
import { addDays, startOfWeek, weeklyRuleDay } from "./dates";

const trip = (id: string, trip_at: string) => ({ id, trip_at });

describe("findPreviousTrip", () => {
  const trips = [
    trip("a", "2026-06-01T09:00:00Z"),
    trip("b", "2026-06-08T09:00:00Z"),
    trip("c", "2026-06-15T09:00:00Z"),
  ];

  it("returns the immediately preceding trip", () => {
    expect(findPreviousTrip(trips, trips[2])?.id).toBe("b");
    expect(findPreviousTrip(trips, trips[1])?.id).toBe("a");
  });

  it("returns null for the earliest trip", () => {
    expect(findPreviousTrip(trips, trips[0])).toBeNull();
  });
});

describe("coverageWindow", () => {
  it("earliest trip covers from today through the trip date", () => {
    const trips = [trip("a", "2026-06-13T09:00:00Z")];
    expect(coverageWindow(trips, trips[0], "2026-06-08")).toEqual({
      start: "2026-06-08",
      end: "2026-06-13",
    });
  });

  it("later trip covers the day after the previous trip through its own date", () => {
    const trips = [
      trip("a", "2026-06-06T10:00:00Z"),
      trip("b", "2026-06-13T10:00:00Z"),
    ];
    expect(coverageWindow(trips, trips[1], "2026-06-01")).toEqual({
      start: "2026-06-07", // day after the previous trip
      end: "2026-06-13",
    });
  });

  it("ignores trips later than the target", () => {
    const trips = [
      trip("a", "2026-06-06T10:00:00Z"),
      trip("b", "2026-06-13T10:00:00Z"),
      trip("c", "2026-06-20T10:00:00Z"),
    ];
    expect(coverageWindow(trips, trips[1], "2026-06-01")).toEqual({
      start: "2026-06-07",
      end: "2026-06-13",
    });
  });
});

describe("dateInWindow", () => {
  const w = { start: "2026-06-07", end: "2026-06-13" };
  it("includes the boundaries", () => {
    expect(dateInWindow("2026-06-07", w)).toBe(true);
    expect(dateInWindow("2026-06-13", w)).toBe(true);
  });
  it("excludes dates outside", () => {
    expect(dateInWindow("2026-06-06", w)).toBe(false);
    expect(dateInWindow("2026-06-14", w)).toBe(false);
  });
});

describe("nextWeeklyTripAt", () => {
  it("advances by exactly one week", () => {
    expect(nextWeeklyTripAt("2026-06-13T09:00:00.000Z")).toBe(
      "2026-06-20T09:00:00.000Z",
    );
  });
});

describe("aggregateGroceries", () => {
  it("scales quantities by plannedServings / recipeServings", () => {
    const lines = aggregateGroceries([
      {
        plannedServings: 4,
        recipeServings: 2,
        ingredients: [
          { ingredient_id: "i1", name: "pasta", category: "pantry", unit: "g", quantity: 200 },
        ],
      },
    ]);
    expect(lines).toEqual([
      { ingredient_id: "i1", name: "pasta", category: "pantry", unit: "g", quantity: 400 },
    ]);
  });

  it("sums the same ingredient + unit into one line", () => {
    const lines = aggregateGroceries([
      {
        plannedServings: 2,
        recipeServings: 2,
        ingredients: [
          { ingredient_id: "i1", name: "pasta", category: "pantry", unit: "g", quantity: 200 },
        ],
      },
      {
        plannedServings: 2,
        recipeServings: 2,
        ingredients: [
          { ingredient_id: "i1", name: "pasta", category: "pantry", unit: "g", quantity: 150 },
        ],
      },
    ]);
    expect(lines).toHaveLength(1);
    expect(lines[0].quantity).toBe(350);
  });

  it("keeps different units on separate lines", () => {
    const lines = aggregateGroceries([
      {
        plannedServings: 2,
        recipeServings: 2,
        ingredients: [
          { ingredient_id: "i1", name: "milk", category: "dairy", unit: "ml", quantity: 100 },
          { ingredient_id: "i1", name: "milk", category: "dairy", unit: "cup", quantity: 1 },
        ],
      },
    ]);
    expect(lines).toHaveLength(2);
    expect(lines.map((l) => l.unit).sort()).toEqual(["cup", "ml"]);
  });
});

describe("date helpers", () => {
  it("addDays handles month boundaries", () => {
    expect(addDays("2026-06-30", 1)).toBe("2026-07-01");
    expect(addDays("2026-01-01", -1)).toBe("2025-12-31");
  });

  it("startOfWeek returns the Monday", () => {
    // 2026-06-08 is a Monday
    expect(startOfWeek("2026-06-08")).toBe("2026-06-08");
    expect(startOfWeek("2026-06-14")).toBe("2026-06-08"); // Sunday → previous Monday
    expect(startOfWeek("2026-06-10")).toBe("2026-06-08"); // Wednesday
  });

  it("weeklyRuleDay returns the 3-letter code", () => {
    expect(weeklyRuleDay("2026-06-13")).toBe("SAT");
    expect(weeklyRuleDay("2026-06-08")).toBe("MON");
  });
});

// Row shapes for the database tables. Hand-maintained to match
// supabase/migrations. Kept deliberately small — no generated client types.

export type MealSlot = "breakfast" | "lunch" | "dinner" | "snack";
export const MEAL_SLOTS: MealSlot[] = [
  "breakfast",
  "lunch",
  "dinner",
  "snack",
];

export type TripStatus = "planned" | "done" | "skipped";

export interface Recipe {
  id: string;
  household_id: string;
  name: string;
  description: string | null;
  instructions: string | null;
  servings: number;
  prep_minutes: number | null;
  cook_minutes: number | null;
  source_url: string | null;
  image_path: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Ingredient {
  id: string;
  household_id: string;
  name: string;
  category: string | null;
  default_unit: string | null;
}

export interface RecipeIngredient {
  id: string;
  recipe_id: string;
  ingredient_id: string;
  quantity: number;
  unit: string;
  note: string | null;
}

export interface ScheduledMeal {
  id: string;
  household_id: string;
  recipe_id: string;
  meal_date: string; // YYYY-MM-DD
  slot: MealSlot;
  servings: number;
  note: string | null;
  created_at: string;
}

export interface ShoppingTrip {
  id: string;
  household_id: string;
  trip_at: string; // ISO timestamp
  is_recurring: boolean;
  recurrence_rule: string | null; // e.g. "WEEKLY:SAT"
  status: TripStatus;
  note: string | null;
  created_at: string;
}

export interface GroceryExtraItem {
  id: string;
  trip_id: string;
  label: string;
  quantity: number | null;
  unit: string | null;
  category: string | null;
  checked: boolean;
}

export interface GroceryChecked {
  id: string;
  trip_id: string;
  ingredient_id: string;
  unit: string;
  checked: boolean;
}

export interface RecipeTag {
  recipe_id: string;
  tag: string;
}

// Households / tenancy.

export type HouseholdRole = "owner" | "member";
export type JoinRequestStatus = "pending" | "approved" | "rejected";

export interface Household {
  id: string;
  name: string;
  invite_code: string;
  created_by: string | null;
  created_at: string;
}

// A household the current user belongs to, with their role in it.
export interface Membership {
  household_id: string;
  name: string;
  invite_code: string;
  role: HouseholdRole;
}

export interface HouseholdMember {
  household_id: string;
  user_id: string;
  role: HouseholdRole;
  joined_at: string;
}

export interface JoinRequest {
  id: string;
  household_id: string;
  user_id: string;
  status: JoinRequestStatus;
  created_at: string;
  decided_at: string | null;
  decided_by: string | null;
}

// Joined shapes used in the UI.

export interface RecipeIngredientWithName extends RecipeIngredient {
  ingredient: Ingredient;
}

export interface RecipeWithDetails extends Recipe {
  recipe_ingredients: RecipeIngredientWithName[];
  recipe_tags: { tag: string }[];
}

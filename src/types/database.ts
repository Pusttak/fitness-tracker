// Типы данных, соответствующие схеме базы данных Supabase (таблицы public.*)

export type Gender = 'male' | 'female'

export type DailyActivity = 'sedentary' | 'on_feet' | 'physical'

export type Goal = 'cut' | 'bulk' | 'recomp' | 'maintain'

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack'

export type WorkoutType = 'strength' | 'cardio' | 'mixed'

export type Intensity = 'light' | 'moderate' | 'hard'

export interface Profile {
  id: string
  name: string
  gender: Gender
  birth_date: string
  height_cm: number
  daily_activity: DailyActivity
  recommended_strength: number
  recommended_cardio: number
  goal: Goal
  target_calories: number
  target_protein: number
  target_fat: number
  target_carbs: number
  target_weight_kg: number | null
  created_at: string
  updated_at: string
}

export interface WeightLog {
  id: string
  user_id: string
  date: string
  weight_kg: number
  created_at: string
}

export interface Measurement {
  id: string
  user_id: string
  date: string
  neck_cm: number | null
  chest_cm: number | null
  waist_cm: number | null
  hips_cm: number | null
  bicep_left_cm: number | null
  bicep_right_cm: number | null
  thigh_left_cm: number | null
  thigh_right_cm: number | null
  body_fat_pct: number | null
  created_at: string
}

export interface Product {
  id: string
  user_id: string
  name: string
  calories_per_100g: number
  protein_per_100g: number
  fat_per_100g: number
  carbs_per_100g: number
  is_favorite: boolean
  created_at: string
}

export interface Recipe {
  id: string
  user_id: string
  name: string
  total_weight_g: number
  calories_per_100g: number
  protein_per_100g: number
  fat_per_100g: number
  carbs_per_100g: number
  created_at: string
}

export interface RecipeIngredient {
  id: string
  recipe_id: string
  product_id: string
  weight_g: number
}

export interface MealLog {
  id: string
  user_id: string
  date: string
  meal_type: MealType
  created_at: string
}

export interface MealItem {
  id: string
  meal_id: string
  product_id: string | null
  recipe_id: string | null
  name: string | null
  weight_g: number | null
  calories: number
  protein: number
  fat: number
  carbs: number
}

export interface Workout {
  id: string
  user_id: string
  date: string
  workout_type: WorkoutType
  muscle_groups: string[]
  duration_minutes: number
  intensity: Intensity
  notes: string | null
  created_at: string
}

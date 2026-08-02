export type Gender = 'male' | 'female' | 'other'

export type ActivityLevel = 'low' | 'moderate' | 'high' | 'athlete'

export interface Profile {
  id: string
  userId: string
  fullName: string
  gender: Gender | null
  birthDate: string | null
  heightCm: number | null
  activityLevel: ActivityLevel | null
  goalWeightKg: number | null
  createdAt: string
}

export interface WeightEntry {
  id: string
  userId: string
  weightKg: number
  note: string | null
  recordedAt: string
}

export interface MeasurementEntry {
  id: string
  userId: string
  chestCm: number | null
  waistCm: number | null
  hipsCm: number | null
  bicepsCm: number | null
  thighCm: number | null
  recordedAt: string
}

export type ExerciseCategory = 'strength' | 'cardio' | 'flexibility' | 'other'

export interface Exercise {
  id: string
  name: string
  category: ExerciseCategory
}

export interface WorkoutSet {
  id: string
  exerciseId: string
  reps: number | null
  weightKg: number | null
  durationSec: number | null
}

export interface Workout {
  id: string
  userId: string
  title: string
  sets: WorkoutSet[]
  performedAt: string
  notes: string | null
}

export type ProductCategory = 'protein' | 'carbs' | 'fat' | 'mixed' | 'recipe'

export interface Product {
  id: string
  name: string
  category: ProductCategory
  caloriesPer100g: number
  proteinPer100g: number
  fatPer100g: number
  carbsPer100g: number
}

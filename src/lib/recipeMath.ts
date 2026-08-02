import type { Product } from '../types/database'

export interface RecipeIngredientDraft {
  product: Product
  weight_g: number
}

export interface NutrientAmounts {
  calories: number
  protein: number
  fat: number
  carbs: number
}

const EMPTY_AMOUNTS: NutrientAmounts = { calories: 0, protein: 0, fat: 0, carbs: 0 }

export function sumIngredients(ingredients: RecipeIngredientDraft[]): NutrientAmounts {
  return ingredients.reduce((acc, ing) => {
    const factor = ing.weight_g / 100
    return {
      calories: acc.calories + ing.product.calories_per_100g * factor,
      protein: acc.protein + ing.product.protein_per_100g * factor,
      fat: acc.fat + ing.product.fat_per_100g * factor,
      carbs: acc.carbs + ing.product.carbs_per_100g * factor,
    }
  }, EMPTY_AMOUNTS)
}

export function sumIngredientWeight(ingredients: RecipeIngredientDraft[]): number {
  return ingredients.reduce((sum, ing) => sum + ing.weight_g, 0)
}

export function per100g(totals: NutrientAmounts, finishedWeightG: number): NutrientAmounts {
  if (finishedWeightG <= 0) return EMPTY_AMOUNTS
  return {
    calories: (totals.calories * 100) / finishedWeightG,
    protein: (totals.protein * 100) / finishedWeightG,
    fat: (totals.fat * 100) / finishedWeightG,
    carbs: (totals.carbs * 100) / finishedWeightG,
  }
}

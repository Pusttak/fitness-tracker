import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { MEAL_TYPES } from '../lib/mealTypes'
import { useAuth } from '../context/AuthContext'
import { useErrorReporter } from './useErrorReporter'
import type { MealItem, MealType } from '../types/database'

export type MealItemKind = 'product' | 'recipe' | 'quick'

export interface MealItemDisplay extends MealItem {
  displayName: string
  kind: MealItemKind
}

export interface MealGroup {
  mealId: string | null
  items: MealItemDisplay[]
  totalCalories: number
}

export interface NutrientTotals {
  calories: number
  protein: number
  fat: number
  carbs: number
}

type MealsByType = Record<MealType, MealGroup>

function emptyMeals(): MealsByType {
  return {
    breakfast: { mealId: null, items: [], totalCalories: 0 },
    lunch: { mealId: null, items: [], totalCalories: 0 },
    dinner: { mealId: null, items: [], totalCalories: 0 },
    snack: { mealId: null, items: [], totalCalories: 0 },
  }
}

interface MealItemRow extends MealItem {
  products: { name: string } | null
  recipes: { name: string } | null
}

export function useMeals(date: string) {
  const { user } = useAuth()
  const { reportError } = useErrorReporter()
  const [meals, setMeals] = useState<MealsByType>(emptyMeals())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchMeals = useCallback(async () => {
    if (!user) {
      setMeals(emptyMeals())
      setLoading(false)
      setError(null)
      return
    }

    setLoading(true)
    setError(null)

    const { data: logs, error: logsError } = await supabase
      .from('meal_log')
      .select('id, meal_type')
      .eq('user_id', user.id)
      .eq('date', date)

    if (logsError) {
      setError(logsError.message || 'Не удалось загрузить данные')
      setLoading(false)
      return
    }

    const mealLogIds = (logs ?? []).map((log) => log.id as string)

    let items: MealItemRow[] = []
    if (mealLogIds.length > 0) {
      const { data, error: itemsError } = await supabase
        .from('meal_items')
        .select('*, products(name), recipes(name)')
        .in('meal_id', mealLogIds)

      if (itemsError) {
        setError(itemsError.message || 'Не удалось загрузить данные')
        setLoading(false)
        return
      }
      items = (data as MealItemRow[] | null) ?? []
    }

    const grouped = emptyMeals()
    for (const log of logs ?? []) {
      const mealType = log.meal_type as MealType
      grouped[mealType].mealId = log.id as string
    }

    const mealTypeByLogId = new Map((logs ?? []).map((log) => [log.id as string, log.meal_type as MealType]))

    for (const item of items) {
      const mealType = mealTypeByLogId.get(item.meal_id)
      if (!mealType) continue
      const { products, recipes, ...rest } = item
      const kind: MealItemKind = item.product_id ? 'product' : item.recipe_id ? 'recipe' : 'quick'
      grouped[mealType].items.push({
        ...rest,
        kind,
        displayName: products?.name ?? recipes?.name ?? item.name ?? 'Без названия',
      })
    }

    for (const mealType of MEAL_TYPES) {
      grouped[mealType].totalCalories = grouped[mealType].items.reduce((sum, i) => sum + i.calories, 0)
    }

    setMeals(grouped)
    setLoading(false)
  }, [user, date])

  useEffect(() => {
    fetchMeals()
  }, [fetchMeals])

  const totals = useMemo<NutrientTotals>(() => {
    const allItems = MEAL_TYPES.flatMap((type) => meals[type].items)
    return {
      calories: allItems.reduce((sum, i) => sum + i.calories, 0),
      protein: allItems.reduce((sum, i) => sum + i.protein, 0),
      fat: allItems.reduce((sum, i) => sum + i.fat, 0),
      carbs: allItems.reduce((sum, i) => sum + i.carbs, 0),
    }
  }, [meals])

  async function deleteItem(itemId: string, mealType: MealType) {
    const previous = meals

    setMeals((prev) => {
      const remainingItems = prev[mealType].items.filter((i) => i.id !== itemId)
      return {
        ...prev,
        [mealType]: {
          ...prev[mealType],
          items: remainingItems,
          totalCalories: remainingItems.reduce((sum, i) => sum + i.calories, 0),
        },
      }
    })

    try {
      const { error } = await supabase.from('meal_items').delete().eq('id', itemId)
      if (error) throw error
    } catch (error) {
      setMeals(previous)
      await reportError('useMeals.deleteItem', error, { itemId, mealType })
    }
  }

  return { meals, totals, loading, error, retry: fetchMeals, deleteItem }
}

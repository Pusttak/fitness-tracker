import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { useErrorReporter } from './useErrorReporter'
import { calcAge, calcBMR, calcTDEE, calcTargets, calcTrainingPlan, type Targets, type TrainingPlan } from '../lib/calculations'
import type { DailyActivity, Gender, Goal, Profile } from '../types/database'

export interface TargetInput {
  target_calories: number
  target_protein: number
  target_fat: number
  target_carbs: number
}

function roundTargets(targets: Targets): TargetInput {
  return {
    target_calories: Math.round(targets.calories),
    target_protein: Math.round(targets.protein),
    target_fat: Math.round(targets.fat),
    target_carbs: Math.round(targets.carbs),
  }
}

export function useSettings() {
  const { user, profile, refreshProfile } = useAuth()
  const { reportError } = useErrorReporter()

  async function applyPatch(patch: Partial<Profile>) {
    if (!user) throw new Error('Пользователь не авторизован')
    try {
      const { error } = await supabase.from('profiles').update(patch).eq('id', user.id)
      if (error) throw error
      await refreshProfile()
    } catch (error) {
      await reportError('useSettings.applyPatch', error, { patch })
      throw error
    }
  }

  async function updateProfile(patch: {
    name?: string
    gender?: Gender
    birth_date?: string
    height_cm?: number
    daily_activity?: DailyActivity
  }) {
    await applyPatch(patch)
  }

  /**
   * Меняет цель и полностью пересчитывает целевые КБЖУ и рекомендацию по тренировкам.
   * Требует текущий вес (для BMR/TDEE) и, если есть, последний % жира (для плана тренировок).
   */
  async function updateGoal(newGoal: Goal, currentWeightKg: number, bodyFatPct: number | null): Promise<void> {
    if (!profile) throw new Error('Профиль не загружен')

    const age = calcAge(profile.birth_date)

    const trainingPlan: TrainingPlan =
      bodyFatPct !== null
        ? calcTrainingPlan(newGoal, bodyFatPct, profile.gender)
        : { strength: profile.recommended_strength, cardio: profile.recommended_cardio, tip: '' }

    const bmr = calcBMR(currentWeightKg, profile.height_cm, age, profile.gender)
    const tdee = calcTDEE(bmr, profile.daily_activity, trainingPlan.strength, trainingPlan.cardio)
    const targets = calcTargets(tdee, newGoal, currentWeightKg)

    await applyPatch({
      goal: newGoal,
      recommended_strength: trainingPlan.strength,
      recommended_cardio: trainingPlan.cardio,
      ...roundTargets(targets),
    })
  }

  async function updateTargets(targets: TargetInput) {
    await applyPatch(targets)
  }

  async function resetTargetsToCalculated(currentWeightKg: number): Promise<TargetInput> {
    if (!profile) throw new Error('Профиль не загружен')

    const age = calcAge(profile.birth_date)
    const bmr = calcBMR(currentWeightKg, profile.height_cm, age, profile.gender)
    const tdee = calcTDEE(bmr, profile.daily_activity, profile.recommended_strength, profile.recommended_cardio)
    const targets = roundTargets(calcTargets(tdee, profile.goal, currentWeightKg))

    await applyPatch(targets)
    return targets
  }

  async function updateTargetWeight(kg: number | null) {
    await applyPatch({ target_weight_kg: kg })
  }

  async function recalculateTrainingPlan(bodyFatPct: number): Promise<TrainingPlan> {
    if (!profile) throw new Error('Профиль не загружен')

    const plan = calcTrainingPlan(profile.goal, bodyFatPct, profile.gender)
    await applyPatch({ recommended_strength: plan.strength, recommended_cardio: plan.cardio })
    return plan
  }

  async function exportData(): Promise<void> {
    if (!user || !profile) throw new Error('Пользователь не авторизован')

    try {
      const [weightRes, measurementsRes, productsRes, recipesRes, mealLogRes, workoutsRes] = await Promise.all([
        supabase.from('weight_log').select('*').eq('user_id', user.id),
        supabase.from('measurements').select('*').eq('user_id', user.id),
        supabase.from('products').select('*').eq('user_id', user.id),
        supabase.from('recipes').select('*').eq('user_id', user.id),
        supabase.from('meal_log').select('*, meal_items(*)').eq('user_id', user.id),
        supabase.from('workouts').select('*').eq('user_id', user.id),
      ])

      const payload = {
        exported_at: new Date().toISOString(),
        profile,
        weight_log: weightRes.data ?? [],
        measurements: measurementsRes.data ?? [],
        products: productsRes.data ?? [],
        recipes: recipesRes.data ?? [],
        meals: mealLogRes.data ?? [],
        workouts: workoutsRes.data ?? [],
      }

      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `fittracker-export-${new Date().toISOString().slice(0, 10)}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (error) {
      await reportError('useSettings.exportData', error)
      throw error
    }
  }

  return {
    profile: profile as Profile | null,
    updateProfile,
    updateGoal,
    updateTargets,
    resetTargetsToCalculated,
    updateTargetWeight,
    recalculateTrainingPlan,
    exportData,
  }
}

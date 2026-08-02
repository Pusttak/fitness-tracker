import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { calcAge, calcBMR, calcTDEE } from '../lib/calculations'
import { addDays, diffDays, getLocalToday, parseLocalDate } from '../lib/dates'
import { generateWeeklyReport } from '../lib/weeklyReport'
import { MUSCLE_GROUPS, type MuscleGroup } from '../lib/muscleGroups'
import type { Measurement, WeightLog, Workout } from '../types/database'

export type ProgressPeriod = '1w' | '2w' | '1m' | '3m'

const PERIOD_DAYS: Record<ProgressPeriod, number> = { '1w': 7, '2w': 14, '1m': 30, '3m': 90 }

/** Достаточно, чтобы покрыть максимальный период (3 мес) и 21-дневное окно адаптивного TDEE */
const FETCH_WINDOW_DAYS = 100

export interface DailyNutrition {
  date: string
  calories: number
  protein: number
  fat: number
  carbs: number
}

export interface WorkoutDistribution {
  strength: number
  cardio: number
  mixed: number
  byMuscleGroup: Record<MuscleGroup, number>
}

export interface AdaptiveTDEE {
  available: boolean
  daysTracked: number
  calculatedTDEE: number | null
  realTDEE: number | null
  diff: number | null
  currentWeightKg: number | null
}

export interface WeeklyReport {
  start: string
  end: string
  lines: string[]
}

function isoDaysAgo(days: number): string {
  return addDays(getLocalToday(), -days)
}

function periodCutoff(period: ProgressPeriod): string {
  return isoDaysAgo(PERIOD_DAYS[period] - 1)
}

function getLastCompletedWeekRange(): { start: string; end: string } {
  const today = getLocalToday()
  const day = parseLocalDate(today).getDay()
  const diffToMonday = day === 0 ? -6 : 1 - day
  const thisMonday = addDays(today, diffToMonday)
  const lastSunday = addDays(thisMonday, -1)
  const lastMonday = addDays(lastSunday, -6)
  return { start: lastMonday, end: lastSunday }
}

interface MealLogRow {
  date: string
  meal_items: { calories: number; protein: number; fat: number; carbs: number }[]
}

export function useProgressData(period: ProgressPeriod) {
  const { user, profile } = useAuth()
  const [weights, setWeights] = useState<WeightLog[]>([])
  const [nutritionByDay, setNutritionByDay] = useState<DailyNutrition[]>([])
  const [workouts, setWorkouts] = useState<Workout[]>([])
  const [measurements, setMeasurements] = useState<Measurement[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchAll = useCallback(async () => {
    if (!user) {
      setWeights([])
      setNutritionByDay([])
      setWorkouts([])
      setMeasurements([])
      setLoading(false)
      setError(null)
      return
    }

    setLoading(true)
    setError(null)
    const sinceIso = isoDaysAgo(FETCH_WINDOW_DAYS)

    const [weightRes, mealLogRes, workoutRes, measurementRes] = await Promise.all([
      supabase.from('weight_log').select('*').eq('user_id', user.id).gte('date', sinceIso).order('date', { ascending: true }),
      supabase
        .from('meal_log')
        .select('date, meal_items(calories, protein, fat, carbs)')
        .eq('user_id', user.id)
        .gte('date', sinceIso),
      supabase.from('workouts').select('*').eq('user_id', user.id).gte('date', sinceIso).order('date', { ascending: true }),
      supabase
        .from('measurements')
        .select('*')
        .eq('user_id', user.id)
        .gte('date', sinceIso)
        .order('date', { ascending: true }),
    ])

    const firstError = weightRes.error ?? mealLogRes.error ?? workoutRes.error ?? measurementRes.error
    if (firstError) {
      setError(firstError.message || 'Не удалось загрузить данные')
      setLoading(false)
      return
    }

    setWeights((weightRes.data as WeightLog[] | null) ?? [])

    const dailyMap = new Map<string, DailyNutrition>()
    for (const log of (mealLogRes.data as MealLogRow[] | null) ?? []) {
      const entry = dailyMap.get(log.date) ?? { date: log.date, calories: 0, protein: 0, fat: 0, carbs: 0 }
      for (const item of log.meal_items ?? []) {
        entry.calories += item.calories
        entry.protein += item.protein
        entry.fat += item.fat
        entry.carbs += item.carbs
      }
      dailyMap.set(log.date, entry)
    }
    setNutritionByDay([...dailyMap.values()].sort((a, b) => a.date.localeCompare(b.date)))

    setWorkouts((workoutRes.data as Workout[] | null) ?? [])
    setMeasurements((measurementRes.data as Measurement[] | null) ?? [])

    setLoading(false)
    // oxlint-disable-next-line react-hooks/exhaustive-deps -- зависим от user?.id (примитив), а не от объекта user
  }, [user?.id])

  useEffect(() => {
    fetchAll()
  }, [fetchAll])

  const cutoff = useMemo(() => periodCutoff(period), [period])

  const weightData = useMemo(() => weights.filter((w) => w.date >= cutoff), [weights, cutoff])
  const nutritionData = useMemo(() => nutritionByDay.filter((n) => n.date >= cutoff), [nutritionByDay, cutoff])
  const workoutData = useMemo(() => workouts.filter((w) => w.date >= cutoff), [workouts, cutoff])
  const measurementData = useMemo(() => measurements.filter((m) => m.date >= cutoff), [measurements, cutoff])

  const workoutDistribution = useMemo<WorkoutDistribution>(() => {
    const byMuscleGroup = Object.fromEntries(MUSCLE_GROUPS.map((g) => [g, 0])) as Record<MuscleGroup, number>
    let strength = 0
    let cardio = 0
    let mixed = 0

    for (const w of workoutData) {
      if (w.workout_type === 'strength') strength++
      else if (w.workout_type === 'cardio') cardio++
      else mixed++

      for (const g of w.muscle_groups) {
        if (g in byMuscleGroup) byMuscleGroup[g as MuscleGroup]++
      }
    }

    return { strength, cardio, mixed, byMuscleGroup }
  }, [workoutData])

  const adaptiveTDEE = useMemo<AdaptiveTDEE>(() => {
    const empty: AdaptiveTDEE = {
      available: false,
      daysTracked: 0,
      calculatedTDEE: null,
      realTDEE: null,
      diff: null,
      currentWeightKg: null,
    }

    if (!profile) return empty

    const allDates = [...weights.map((w) => w.date), ...nutritionByDay.map((n) => n.date)]
    if (allDates.length === 0) return empty

    const earliest = allDates.reduce((min, d) => (d < min ? d : min), allDates[0])
    const daysTracked = Math.min(FETCH_WINDOW_DAYS, diffDays(getLocalToday(), earliest))

    const cutoff21 = isoDaysAgo(20)
    const weights21 = weights.filter((w) => w.date >= cutoff21)
    const nutrition21 = nutritionByDay.filter((n) => n.date >= cutoff21)

    if (daysTracked < 21 || weights21.length < 2 || nutrition21.length === 0) {
      return { ...empty, daysTracked }
    }

    const avgCalories21 = nutrition21.reduce((s, n) => s + n.calories, 0) / nutrition21.length
    const firstWeight = weights21[0].weight_kg
    const lastWeight = weights21[weights21.length - 1].weight_kg
    const weightChange21 = lastWeight - firstWeight
    const realTDEE = avgCalories21 + (weightChange21 * 7700) / 21

    const age = calcAge(profile.birth_date)
    const bmr = calcBMR(lastWeight, profile.height_cm, age, profile.gender)
    const calculatedTDEE = calcTDEE(bmr, profile.daily_activity, profile.recommended_strength, profile.recommended_cardio)

    return {
      available: true,
      daysTracked,
      calculatedTDEE,
      realTDEE,
      diff: realTDEE - calculatedTDEE,
      currentWeightKg: lastWeight,
    }
  }, [weights, nutritionByDay, profile])

  const weeklyReport = useMemo<WeeklyReport>(() => {
    const range = getLastCompletedWeekRange()
    if (!profile) return { ...range, lines: [] }

    const weekWeights = weights.filter((w) => w.date >= range.start && w.date <= range.end)
    const weekNutrition = nutritionByDay.filter((n) => n.date >= range.start && n.date <= range.end)
    const weekWorkouts = workouts.filter((w) => w.date >= range.start && w.date <= range.end)
    const recentMeasurements = measurements.slice(-2)

    return { ...range, lines: generateWeeklyReport(profile, weekWeights, weekNutrition, weekWorkouts, recentMeasurements) }
  }, [profile, weights, nutritionByDay, workouts, measurements])

  return {
    weightData,
    nutritionData,
    workoutData,
    measurementData,
    workoutDistribution,
    adaptiveTDEE,
    weeklyReport,
    loading,
    error,
    retry: fetchAll,
  }
}

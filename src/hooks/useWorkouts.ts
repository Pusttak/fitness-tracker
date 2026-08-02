import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useErrorReporter } from './useErrorReporter'
import { MUSCLE_GROUPS } from '../lib/muscleGroups'
import { addDays, diffDays, getLocalToday, parseLocalDate } from '../lib/dates'
import type { Workout } from '../types/database'

export type WorkoutInput = Omit<Workout, 'id' | 'user_id' | 'created_at'>

export interface WeekSummary {
  strengthCount: number
  cardioCount: number
  totalCount: number
  recommendedStrength: number
  recommendedCardio: number
  recommendedTotal: number
  progressPct: number
}

export interface MuscleGroupStat {
  group: (typeof MUSCLE_GROUPS)[number]
  count14d: number
  lastTrainedDate: string | null
  daysSince: number | null
}

export interface WorkoutStats {
  week: WeekSummary
  muscleGroups: MuscleGroupStat[]
}

function getCurrentWeekRange(): { start: string; end: string } {
  const today = getLocalToday()
  const day = parseLocalDate(today).getDay()
  const diff = day === 0 ? -6 : 1 - day
  const monday = addDays(today, diff)
  const sunday = addDays(monday, 6)
  return { start: monday, end: sunday }
}

export function useWorkouts() {
  const { user, profile } = useAuth()
  const { reportError } = useErrorReporter()
  const [workouts, setWorkouts] = useState<Workout[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchWorkouts = useCallback(async () => {
    if (!user) {
      setWorkouts([])
      setLoading(false)
      setError(null)
      return
    }

    setLoading(true)
    setError(null)
    const { data, error: fetchError } = await supabase
      .from('workouts')
      .select('*')
      .eq('user_id', user.id)
      .order('date', { ascending: false })

    if (fetchError) {
      setError(fetchError.message || 'Не удалось загрузить данные')
      setLoading(false)
      return
    }

    setWorkouts((data as Workout[] | null) ?? [])
    setLoading(false)
    // oxlint-disable-next-line react-hooks/exhaustive-deps -- зависим от user?.id (примитив), а не от объекта user
  }, [user?.id])

  useEffect(() => {
    fetchWorkouts()
  }, [fetchWorkouts])

  const thisWeek = useMemo(() => {
    const { start, end } = getCurrentWeekRange()
    return workouts.filter((w) => w.date >= start && w.date <= end)
  }, [workouts])

  const stats = useMemo<WorkoutStats>(() => {
    const strengthCount = thisWeek.filter((w) => w.workout_type === 'strength' || w.workout_type === 'mixed').length
    const cardioCount = thisWeek.filter((w) => w.workout_type === 'cardio' || w.workout_type === 'mixed').length
    const totalCount = thisWeek.length
    const recommendedStrength = profile?.recommended_strength ?? 0
    const recommendedCardio = profile?.recommended_cardio ?? 0
    const recommendedTotal = recommendedStrength + recommendedCardio
    const progressPct = recommendedTotal > 0 ? (totalCount / recommendedTotal) * 100 : 0

    const today = getLocalToday()
    const cutoffIso = addDays(today, -14)
    const last14 = workouts.filter((w) => w.date >= cutoffIso)

    const muscleGroups: MuscleGroupStat[] = MUSCLE_GROUPS.map((group) => {
      const count14d = last14.filter((w) => w.muscle_groups.includes(group)).length
      const allTrained = workouts
        .filter((w) => w.muscle_groups.includes(group))
        .sort((a, b) => b.date.localeCompare(a.date))
      const last = allTrained[0] ?? null
      const daysSince = last ? diffDays(today, last.date) : null
      return { group, count14d, lastTrainedDate: last?.date ?? null, daysSince }
    })

    return {
      week: { strengthCount, cardioCount, totalCount, recommendedStrength, recommendedCardio, recommendedTotal, progressPct },
      muscleGroups,
    }
  }, [thisWeek, workouts, profile])

  async function saveWorkout(input: WorkoutInput, id?: string): Promise<Workout> {
    if (!user) throw new Error('Пользователь не авторизован')

    try {
      if (id) {
        const { data, error } = await supabase.from('workouts').update(input).eq('id', id).select().single()
        if (error || !data) throw error ?? new Error('Не удалось сохранить тренировку')
        const saved = data as Workout
        setWorkouts((prev) => prev.map((w) => (w.id === id ? saved : w)))
        return saved
      }

      const { data, error } = await supabase
        .from('workouts')
        .insert({ ...input, user_id: user.id })
        .select()
        .single()

      if (error || !data) throw error ?? new Error('Не удалось сохранить тренировку')
      const saved = data as Workout
      setWorkouts((prev) => [saved, ...prev].sort((a, b) => b.date.localeCompare(a.date)))
      return saved
    } catch (error) {
      await reportError('useWorkouts.saveWorkout', error, { input, id })
      throw error
    }
  }

  async function deleteWorkout(id: string) {
    const previous = workouts
    setWorkouts((prev) => prev.filter((w) => w.id !== id))

    try {
      const { error } = await supabase.from('workouts').delete().eq('id', id)
      if (error) throw error
    } catch (error) {
      setWorkouts(previous)
      await reportError('useWorkouts.deleteWorkout', error, { id })
      throw error
    }
  }

  return { workouts, thisWeek, stats, loading, error, saveWorkout, deleteWorkout, retry: fetchWorkouts }
}

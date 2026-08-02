import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useErrorReporter } from './useErrorReporter'
import { calcMovingAverage, type WeightPoint } from '../lib/calculations'
import { addDays, getLocalToday } from '../lib/dates'
import type { WeightLog } from '../types/database'

export type WeightPeriod = '1w' | '1m' | '3m' | 'all'

export interface WeightStats {
  avg7d: number | null
  prevAvg7d: number | null
  weekChangeKg: number | null
  weekChangePct: number | null
  monthChangeKg: number | null
  monthChangePct: number | null
}

export interface WeightHistoryEntry {
  entry: WeightLog
  deltaKg: number | null
}

function periodCutoffDate(period: WeightPeriod, latestDateIso: string | null): string | null {
  if (period === 'all' || !latestDateIso) return null
  const days = period === '1w' ? 7 : period === '1m' ? 30 : 90
  return addDays(latestDateIso, -(days - 1))
}

export function useWeightData(period: WeightPeriod) {
  const { user } = useAuth()
  const { reportError } = useErrorReporter()
  const [rawWeights, setRawWeights] = useState<WeightLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchWeights = useCallback(async () => {
    if (!user) {
      setRawWeights([])
      setLoading(false)
      setError(null)
      return
    }

    setLoading(true)
    setError(null)
    const { data, error: fetchError } = await supabase
      .from('weight_log')
      .select('*')
      .eq('user_id', user.id)
      .order('date', { ascending: true })

    if (fetchError) {
      setError(fetchError.message || 'Не удалось загрузить данные')
      setLoading(false)
      return
    }

    setRawWeights((data as WeightLog[] | null) ?? [])
    setLoading(false)
    // oxlint-disable-next-line react-hooks/exhaustive-deps -- зависим от user?.id (примитив), а не от объекта user
  }, [user?.id])

  useEffect(() => {
    fetchWeights()
  }, [fetchWeights])

  const fullPoints = useMemo<WeightPoint[]>(
    () => rawWeights.map((w) => ({ date: w.date, value: w.weight_kg })),
    [rawWeights],
  )

  const fullMovingAverage = useMemo(() => calcMovingAverage(fullPoints, 7), [fullPoints])

  const stats = useMemo<WeightStats>(() => {
    const n = fullMovingAverage.length
    if (n === 0) {
      return {
        avg7d: null,
        prevAvg7d: null,
        weekChangeKg: null,
        weekChangePct: null,
        monthChangeKg: null,
        monthChangePct: null,
      }
    }

    const avg7d = fullMovingAverage[n - 1].value
    // Compares the trailing 7-record average against the trailing 7-record average
    // as of 7 records earlier; clamped to index 0 when history is shorter than 14 records.
    const prevAvg7d = n >= 2 ? fullMovingAverage[Math.max(0, n - 8)].value : null
    const weekChangeKg = prevAvg7d !== null ? avg7d - prevAvg7d : null
    const weekChangePct = weekChangeKg !== null && avg7d !== 0 ? (weekChangeKg / avg7d) * 100 : null

    const latestDate = fullPoints[fullPoints.length - 1]?.date ?? null
    let monthChangeKg: number | null = null
    let monthChangePct: number | null = null

    if (latestDate) {
      const targetIso = addDays(latestDate, -30)
      const refPoint = [...fullMovingAverage].reverse().find((p) => p.date <= targetIso) ?? null

      if (refPoint) {
        monthChangeKg = avg7d - refPoint.value
        monthChangePct = avg7d !== 0 ? (monthChangeKg / avg7d) * 100 : null
      }
    }

    return { avg7d, prevAvg7d, weekChangeKg, weekChangePct, monthChangeKg, monthChangePct }
  }, [fullMovingAverage, fullPoints])

  const cutoff = useMemo(
    () => periodCutoffDate(period, fullPoints[fullPoints.length - 1]?.date ?? null),
    [period, fullPoints],
  )

  const weights = useMemo(
    () => (cutoff ? fullPoints.filter((p) => p.date >= cutoff) : fullPoints),
    [fullPoints, cutoff],
  )

  const movingAverage = useMemo(
    () => (cutoff ? fullMovingAverage.filter((p) => p.date >= cutoff) : fullMovingAverage),
    [fullMovingAverage, cutoff],
  )

  const todayWeight = useMemo(
    () => rawWeights.find((w) => w.date === getLocalToday()) ?? null,
    [rawWeights],
  )

  const history = useMemo<WeightHistoryEntry[]>(() => {
    const sortedDesc = [...rawWeights].sort((a, b) => b.date.localeCompare(a.date))
    return sortedDesc.slice(0, 10).map((entry, index) => {
      const previous = sortedDesc[index + 1]
      return { entry, deltaKg: previous ? entry.weight_kg - previous.weight_kg : null }
    })
  }, [rawWeights])

  async function saveWeight(date: string, weightKg: number) {
    if (!user) return

    try {
      const { data, error } = await supabase
        .from('weight_log')
        .insert({ user_id: user.id, date, weight_kg: weightKg })
        .select()
        .single()

      if (error || !data) {
        throw error ?? new Error('Не удалось сохранить вес')
      }

      const saved = data as WeightLog
      setRawWeights((prev) => [...prev, saved].sort((a, b) => a.date.localeCompare(b.date)))
    } catch (error) {
      await reportError('saveWeight', error, { date, weightKg })
      throw error
    }
  }

  async function updateWeight(id: string, weightKg: number) {
    const previous = rawWeights
    setRawWeights((prev) => prev.map((w) => (w.id === id ? { ...w, weight_kg: weightKg } : w)))

    try {
      const { error } = await supabase.from('weight_log').update({ weight_kg: weightKg }).eq('id', id)
      if (error) throw error
    } catch (error) {
      setRawWeights(previous)
      await reportError('updateWeight', error, { id, weightKg })
      throw error
    }
  }

  return {
    weights,
    movingAverage,
    stats,
    todayWeight,
    history,
    loading,
    error,
    saveWeight,
    updateWeight,
    retry: fetchWeights,
  }
}

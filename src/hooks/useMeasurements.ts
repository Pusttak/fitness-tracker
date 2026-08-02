import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useErrorReporter } from './useErrorReporter'
import { calcBodyFat } from '../lib/calculations'
import type { Measurement } from '../types/database'

export type MeasurementInput = Omit<Measurement, 'id' | 'user_id' | 'created_at' | 'body_fat_pct'>

const FOUR_WEEKS_MS = 28 * 24 * 60 * 60 * 1000

export function useMeasurements() {
  const { user, profile } = useAuth()
  const { reportError } = useErrorReporter()
  const [measurements, setMeasurements] = useState<Measurement[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchMeasurements = useCallback(async () => {
    if (!user) {
      setMeasurements([])
      setLoading(false)
      setError(null)
      return
    }

    setLoading(true)
    setError(null)
    const { data, error: fetchError } = await supabase
      .from('measurements')
      .select('*')
      .eq('user_id', user.id)
      .order('date', { ascending: false })

    if (fetchError) {
      setError(fetchError.message || 'Не удалось загрузить данные')
      setLoading(false)
      return
    }

    setMeasurements((data as Measurement[] | null) ?? [])
    setLoading(false)
  }, [user])

  useEffect(() => {
    fetchMeasurements()
  }, [fetchMeasurements])

  const latest = measurements[0] ?? null

  const previous = useMemo(() => {
    if (!latest || measurements.length < 2) return null

    const targetTime = new Date(latest.date).getTime() - FOUR_WEEKS_MS

    let best: Measurement | null = null
    let bestDiff = Infinity
    for (const m of measurements.slice(1)) {
      const diff = Math.abs(new Date(m.date).getTime() - targetTime)
      if (diff < bestDiff) {
        bestDiff = diff
        best = m
      }
    }
    return best
  }, [measurements, latest])

  async function saveMeasurement(input: MeasurementInput): Promise<Measurement> {
    if (!user || !profile) throw new Error('Пользователь не авторизован')

    let body_fat_pct: number | null = null
    if (input.neck_cm !== null && input.waist_cm !== null) {
      try {
        body_fat_pct = calcBodyFat(
          profile.gender,
          input.waist_cm,
          input.neck_cm,
          profile.height_cm,
          input.hips_cm ?? undefined,
        )
      } catch {
        body_fat_pct = null
      }
    }

    try {
      const { data, error } = await supabase
        .from('measurements')
        .insert({ ...input, user_id: user.id, body_fat_pct })
        .select()
        .single()

      if (error || !data) {
        throw error ?? new Error('Не удалось сохранить замер')
      }

      const saved = data as Measurement
      setMeasurements((prev) => [saved, ...prev].sort((a, b) => b.date.localeCompare(a.date)))
      return saved
    } catch (error) {
      await reportError('useMeasurements.saveMeasurement', error, { input })
      throw error
    }
  }

  async function updateMeasurement(id: string, input: MeasurementInput): Promise<Measurement> {
    if (!user || !profile) throw new Error('Пользователь не авторизован')

    let body_fat_pct: number | null = null
    if (input.neck_cm !== null && input.waist_cm !== null) {
      try {
        body_fat_pct = calcBodyFat(
          profile.gender,
          input.waist_cm,
          input.neck_cm,
          profile.height_cm,
          input.hips_cm ?? undefined,
        )
      } catch {
        body_fat_pct = null
      }
    }

    const previous = measurements

    try {
      const { data, error } = await supabase
        .from('measurements')
        .update({ ...input, body_fat_pct })
        .eq('id', id)
        .select()
        .single()

      if (error || !data) {
        throw error ?? new Error('Не удалось обновить замер')
      }

      const saved = data as Measurement
      setMeasurements((prev) =>
        prev.map((m) => (m.id === id ? saved : m)).sort((a, b) => b.date.localeCompare(a.date)),
      )
      return saved
    } catch (error) {
      setMeasurements(previous)
      await reportError('useMeasurements.updateMeasurement', error, { id, input })
      throw error
    }
  }

  return {
    measurements,
    latest,
    previous,
    loading,
    error,
    saveMeasurement,
    updateMeasurement,
    retry: fetchMeasurements,
  }
}

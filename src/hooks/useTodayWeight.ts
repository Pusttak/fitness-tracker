import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useErrorReporter } from './useErrorReporter'
import type { WeightLog } from '../types/database'

export function useTodayWeight(date: string) {
  const { user } = useAuth()
  const { reportError } = useErrorReporter()
  const [weight, setWeight] = useState<WeightLog | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchWeight = useCallback(async () => {
    if (!user) {
      setWeight(null)
      setLoading(false)
      return
    }

    setLoading(true)
    const { data } = await supabase
      .from('weight_log')
      .select('*')
      .eq('user_id', user.id)
      .eq('date', date)
      .maybeSingle()

    setWeight((data as WeightLog | null) ?? null)
    setLoading(false)
  }, [user, date])

  useEffect(() => {
    fetchWeight()
  }, [fetchWeight])

  async function saveWeight(weightKg: number) {
    if (!user) return

    const previous = weight
    const optimistic: WeightLog = {
      id: 'optimistic',
      user_id: user.id,
      date,
      weight_kg: weightKg,
      created_at: new Date().toISOString(),
    }
    setWeight(optimistic)

    try {
      const { data, error } = await supabase
        .from('weight_log')
        .insert({ user_id: user.id, date, weight_kg: weightKg })
        .select()
        .single()

      if (error || !data) {
        throw error ?? new Error('Не удалось сохранить вес')
      }

      setWeight(data as WeightLog)
    } catch (error) {
      setWeight(previous)
      await reportError('useTodayWeight.saveWeight', error, { date, weightKg })
      throw error
    }
  }

  return { weight, hasWeight: weight !== null, saveWeight, loading }
}

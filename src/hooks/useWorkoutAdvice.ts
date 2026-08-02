import { useMemo } from 'react'
import { MUSCLE_GROUPS, MUSCLE_GROUP_LABELS } from '../lib/muscleGroups'
import type { Goal, Workout } from '../types/database'

export type WorkoutAdviceIcon = 'good' | 'warning' | 'info'

export interface WorkoutAdvice {
  icon: WorkoutAdviceIcon
  items: string[]
}

/**
 * Формирует список рекомендаций по тренировкам: дни отдыха, забытые группы мышц,
 * перетренированность, баланс кардио под цель, интенсивность и общий недельный план.
 */
export function getWorkoutAdvice(
  goal: Goal,
  workouts: Workout[],
  recommendedStrength: number,
  _recommendedCardio: number,
): WorkoutAdvice {
  const now = new Date()
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000)

  const thisWeek = workouts.filter((w) => new Date(w.date) >= weekAgo)
  const lastTwoWeeks = workouts.filter((w) => new Date(w.date) >= twoWeeksAgo)

  const strengthThisWeek = thisWeek.filter((w) => w.workout_type === 'strength' || w.workout_type === 'mixed').length
  const cardioThisWeek = thisWeek.filter((w) => w.workout_type === 'cardio' || w.workout_type === 'mixed').length

  const recommendations: string[] = []

  // 1. Проверка дней отдыха
  const sortedDates = thisWeek.map((w) => w.date).sort()
  let consecutiveDays = 1
  let maxConsecutive = 1
  for (let i = 1; i < sortedDates.length; i++) {
    const prev = new Date(sortedDates[i - 1])
    const curr = new Date(sortedDates[i])
    const diffDays = (curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24)
    if (diffDays === 1) {
      consecutiveDays++
      maxConsecutive = Math.max(maxConsecutive, consecutiveDays)
    } else {
      consecutiveDays = 1
    }
  }
  if (maxConsecutive >= 5) {
    recommendations.push(
      `${maxConsecutive} дней подряд без отдыха. Мышцы растут во время восстановления — добавь день отдыха.`,
    )
  }

  // 2. Забытые группы мышц
  for (const group of MUSCLE_GROUPS) {
    const lastTrained = lastTwoWeeks
      .filter((w) => w.muscle_groups.includes(group))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0]

    if (!lastTrained) {
      recommendations.push(`${MUSCLE_GROUP_LABELS[group]} не тренировались 2+ недели. Включи в ближайшую тренировку.`)
    } else {
      const daysSince = Math.floor((now.getTime() - new Date(lastTrained.date).getTime()) / (1000 * 60 * 60 * 24))
      if (daysSince > 10) {
        recommendations.push(`${MUSCLE_GROUP_LABELS[group]} не тренировались ${daysSince} дней. Пора включить.`)
      }
    }
  }

  // 3. Перетренированность одной группы
  for (const group of MUSCLE_GROUPS) {
    const timesThisWeek = thisWeek.filter((w) => w.muscle_groups.includes(group)).length
    if (timesThisWeek >= 4) {
      recommendations.push(
        `${MUSCLE_GROUP_LABELS[group]} тренировались ${timesThisWeek} раз за неделю — это много. Дай отдых, переключись на другие группы.`,
      )
    }
  }

  // 4. Кардио vs цель
  if (goal === 'cut' && cardioThisWeek < 2) {
    recommendations.push(
      `Всего ${cardioThisWeek} кардио на этой неделе. Для сушки добавь ещё ${2 - cardioThisWeek} — ускорит жиросжигание.`,
    )
  }
  if (goal === 'bulk' && cardioThisWeek > 3) {
    recommendations.push(`${cardioThisWeek} кардио на этой неделе — это мешает набору массы. Снизь до 1-2.`)
  }

  // 5. Интенсивность
  const recentIntensities = lastTwoWeeks.map((w) => w.intensity)
  const allLight = recentIntensities.length > 3 && recentIntensities.every((i) => i === 'light')
  if (allLight) {
    recommendations.push('Все тренировки за 2 недели — лёгкие. Для прогресса нужна средняя или высокая интенсивность.')
  }

  // 6. Общая нагрузка
  if (strengthThisWeek < recommendedStrength && new Date().getDay() >= 4) {
    const remaining = recommendedStrength - strengthThisWeek
    recommendations.push(`До конца недели нужно ещё ${remaining} силовых, чтобы выполнить план.`)
  }

  // Если всё хорошо
  if (recommendations.length === 0) {
    if (thisWeek.length === 0) {
      return {
        icon: 'info',
        items: ['На этой неделе пока нет тренировок. Начни сегодня!'],
      }
    }
    return {
      icon: 'good',
      items: ['Тренировки идут по плану. Хороший баланс нагрузки и отдыха!'],
    }
  }

  return {
    icon: recommendations.some((r) => r.includes('много') || r.includes('мешает') || r.includes('подряд'))
      ? 'warning'
      : 'info',
    items: recommendations.slice(0, 3),
  }
}

export function useWorkoutAdvice(
  goal: Goal | null,
  workouts: Workout[],
  recommendedStrength: number,
  recommendedCardio: number,
): WorkoutAdvice | null {
  return useMemo(() => {
    if (!goal) return null
    return getWorkoutAdvice(goal, workouts, recommendedStrength, recommendedCardio)
  }, [goal, workouts, recommendedStrength, recommendedCardio])
}

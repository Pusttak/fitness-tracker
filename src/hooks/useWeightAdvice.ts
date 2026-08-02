import { useMemo } from 'react'
import type { Goal } from '../types/database'
import type { WeightPoint } from '../lib/calculations'

export type AdviceIcon = 'good' | 'warning' | 'bad' | 'info'

export interface WeightAdvice {
  icon: AdviceIcon
  text: string
}

/**
 * Формирует текст рекомендации по динамике веса на основе цели и изменения
 * скользящего среднего за последнюю неделю относительно предыдущей.
 */
export function getWeightAdvice(
  goal: Goal,
  weights: WeightPoint[],
  currentAvg7d: number,
  prevAvg7d: number,
): WeightAdvice {
  if (weights.length < 7) {
    return {
      icon: 'info',
      text: `Недостаточно данных для анализа. Продолжай взвешиваться каждый день. Записей: ${weights.length}/7`,
    }
  }

  const weeklyChange = currentAvg7d - prevAvg7d
  const weeklyChangePct = currentAvg7d !== 0 ? (weeklyChange / currentAvg7d) * 100 : 0

  if (goal === 'cut') {
    if (weeklyChangePct > 0.1) {
      return {
        icon: 'bad',
        text: `Вес растёт (+${weeklyChange.toFixed(1)} кг/нед). Ты не в дефиците. Снизь калории на 200-300 ккал.`,
      }
    }
    if (weeklyChangePct > -0.3) {
      return {
        icon: 'warning',
        text: `Вес почти стоит (${weeklyChange > 0 ? '+' : ''}${weeklyChange.toFixed(1)} кг/нед). Снизь калории на 100-200 ккал или добавь кардио.`,
      }
    }
    if (weeklyChangePct >= -1.0) {
      return {
        icon: 'good',
        text: `Отличный темп! ${weeklyChange.toFixed(1)} кг/нед — оптимальная скорость для сушки. Продолжай в том же режиме.`,
      }
    }
    return {
      icon: 'warning',
      text: `Слишком быстро (${weeklyChange.toFixed(1)} кг/нед, ${weeklyChangePct.toFixed(1)}%/нед). Рискуешь потерять мышцы. Добавь 200 ккал.`,
    }
  }

  if (goal === 'bulk') {
    if (weeklyChangePct < -0.1) {
      return {
        icon: 'bad',
        text: `Вес падает (${weeklyChange.toFixed(1)} кг/нед). Ты в дефиците. Добавь 200-300 ккал.`,
      }
    }
    if (weeklyChangePct <= 0.5) {
      return {
        icon: 'good',
        text: `Хороший темп набора (+${weeklyChange.toFixed(1)} кг/нед). Масса растёт без лишнего жира.`,
      }
    }
    return {
      icon: 'warning',
      text: `Набираешь слишком быстро (+${weeklyChange.toFixed(1)} кг/нед). Вероятно, много жира. Снизь калории на 200.`,
    }
  }

  if (goal === 'recomp') {
    if (Math.abs(weeklyChangePct) < 0.3) {
      return {
        icon: 'good',
        text: `Вес стабилен (${weeklyChange > 0 ? '+' : ''}${weeklyChange.toFixed(1)} кг/нед). Для рекомпозиции это идеально — тело меняет состав.`,
      }
    }
    if (weeklyChangePct < -0.3) {
      return {
        icon: 'warning',
        text: 'Вес падает быстрее чем нужно для рекомпозиции. Добавь 100-150 ккал.',
      }
    }
    return {
      icon: 'warning',
      text: `Вес растёт (+${weeklyChange.toFixed(1)} кг/нед). Снизь калории на 100-150.`,
    }
  }

  if (Math.abs(weeklyChangePct) < 0.2) {
    return { icon: 'good', text: 'Вес стабилен — всё отлично! Поддерживай текущий режим.' }
  }
  if (weeklyChangePct > 0) {
    return {
      icon: 'warning',
      text: `Вес растёт (+${weeklyChange.toFixed(1)} кг/нед). Ты в профиците. Урежь на 100-200 ккал.`,
    }
  }
  return {
    icon: 'warning',
    text: `Вес падает (${weeklyChange.toFixed(1)} кг/нед). Ты в дефиците. Добавь 100-200 ккал.`,
  }
}

export function useWeightAdvice(
  goal: Goal | null,
  weights: WeightPoint[],
  currentAvg7d: number | null,
  prevAvg7d: number | null,
): WeightAdvice | null {
  return useMemo(() => {
    if (!goal) return null
    if (weights.length < 7 || currentAvg7d === null || prevAvg7d === null) {
      return {
        icon: 'info',
        text: `Недостаточно данных для анализа. Продолжай взвешиваться каждый день. Записей: ${weights.length}/7`,
      }
    }
    return getWeightAdvice(goal, weights, currentAvg7d, prevAvg7d)
  }, [goal, weights, currentAvg7d, prevAvg7d])
}

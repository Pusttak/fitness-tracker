import type { Measurement, Profile, WeightLog, Workout } from '../types/database'

export interface DailyNutritionSummary {
  calories: number
  protein: number
  fat: number
  carbs: number
}

const GOAL_TEXT: Record<Profile['goal'], string> = {
  cut: 'сушке',
  bulk: 'набору массы',
  recomp: 'рекомпозиции',
  maintain: 'поддержанию формы',
}

/**
 * Формирует текстовый недельный отчёт: динамика веса, питание относительно цели,
 * объём тренировок и общий вердикт по неделе.
 */
export function generateWeeklyReport(
  profile: Profile,
  weights: WeightLog[],
  meals: DailyNutritionSummary[],
  workouts: Workout[],
  _measurements: Measurement[],
): string[] {
  const lines: string[] = []

  // 1. Вес
  if (weights.length >= 2) {
    const startWeight = weights[0].weight_kg
    const endWeight = weights[weights.length - 1].weight_kg
    const diff = endWeight - startWeight
    lines.push(`Вес: ${endWeight} кг (${diff > 0 ? '+' : ''}${diff.toFixed(1)} кг за неделю)`)
  }

  // 2. Питание — среднее за дни где есть данные
  if (meals.length > 0) {
    const avgCal = Math.round(meals.reduce((s, m) => s + m.calories, 0) / meals.length)
    const avgProt = Math.round(meals.reduce((s, m) => s + m.protein, 0) / meals.length)
    const avgFat = Math.round(meals.reduce((s, m) => s + m.fat, 0) / meals.length)
    // avgCarbs недоступен для строк отчёта ниже — углеводы не участвуют в текущей логике предупреждений
    const avgCarbs = Math.round(meals.reduce((s, m) => s + m.carbs, 0) / meals.length)
    void avgCarbs

    const calDiff = avgCal - profile.target_calories
    lines.push(
      `Питание: в среднем ${avgCal} ккал/день (цель ${profile.target_calories}, ${calDiff > 0 ? 'перебор +' : 'недобор '}${Math.abs(calDiff)} ккал)`,
    )

    // Проблемы с БЖУ
    if (avgProt < profile.target_protein * 0.8) {
      lines.push(`⚠ Белок в среднем ${avgProt}г — ниже нормы (${profile.target_protein}г). Добавь белковые продукты.`)
    }
    if (avgFat > profile.target_fat * 1.15) {
      lines.push(`⚠ Жиры в среднем ${avgFat}г — превышены (норма ${profile.target_fat}г). Сократи масло и жирные продукты.`)
    }

    // Дни без записей
    const daysTracked = meals.length
    if (daysTracked < 5) {
      lines.push(`Питание записано только за ${daysTracked} из 7 дней. Веди дневник каждый день для точных рекомендаций.`)
    }
  } else {
    lines.push('Питание: нет данных за неделю. Начни вести дневник питания.')
  }

  // 3. Тренировки
  const totalWorkouts = workouts.length
  const recommended = profile.recommended_strength + profile.recommended_cardio
  const strength = workouts.filter((w) => w.workout_type === 'strength' || w.workout_type === 'mixed').length
  const cardio = workouts.filter((w) => w.workout_type === 'cardio' || w.workout_type === 'mixed').length
  lines.push(`Тренировки: ${totalWorkouts} из ${recommended} (силовых: ${strength}, кардио: ${cardio})`)

  if (totalWorkouts < recommended * 0.5) {
    lines.push('⚠ Тренировок меньше половины плана. Это замедляет прогресс.')
  }

  // 4. Общий вердикт
  const goalText = GOAL_TEXT[profile.goal]

  const warnings = lines.filter((l) => l.startsWith('⚠')).length
  if (warnings === 0 && totalWorkouts >= recommended * 0.7 && meals.length >= 5) {
    lines.push(`✅ Хорошая неделя! Прогресс по ${goalText} идёт по плану.`)
  } else if (warnings >= 2) {
    lines.push(`Есть над чем работать. Сфокусируйся на ${warnings > 1 ? 'этих моментах' : 'этом моменте'} на следующей неделе.`)
  }

  return lines
}

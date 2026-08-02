import { useMemo } from 'react'
import type { NutrientTotals } from './useMeals'

/**
 * Формирует текст рекомендации дня на основе съеденного, цели и текущего часа.
 */
export function getNutritionAdvice(
  eaten: NutrientTotals,
  target: NutrientTotals,
  currentHour: number,
): string {
  const remaining = {
    calories: target.calories - eaten.calories,
    protein: target.protein - eaten.protein,
    fat: target.fat - eaten.fat,
    carbs: target.carbs - eaten.carbs,
  }

  if (eaten.calories === 0) {
    return 'Добавь приёмы пищи, чтобы получить рекомендации'
  }

  if (remaining.calories <= 0) {
    return `Дневная норма превышена на ${Math.round(Math.abs(remaining.calories))} ккал. Постарайся не есть до конца дня.`
  }

  if (remaining.fat <= 0 && remaining.calories > 0) {
    return `Жиры уже превышены на ${Math.round(Math.abs(remaining.fat))}г. Остаток калорий добирай белком и углеводами — курица, рыба, крупы, овощи.`
  }

  if (remaining.calories < 400 && remaining.protein > 30) {
    return `Осталось мало калорий (${Math.round(remaining.calories)} ккал), но нужно ещё ${Math.round(remaining.protein)}г белка. Выбирай нежирный белок — творог 0%, куриная грудка, яичные белки.`
  }

  if (currentHour >= 15 && remaining.carbs > target.carbs * 0.5) {
    return 'Мало углеводов за день. Добавь крупу, фрукты или хлеб.'
  }

  if (remaining.protein > target.protein * 0.5 && currentHour >= 12) {
    return `Осталось ${Math.round(remaining.protein)}г белка — больше половины нормы. Включи белковые продукты в каждый оставшийся приём.`
  }

  if (remaining.calories > 0 && remaining.calories < target.calories * 0.3) {
    return `Почти в норме! Осталось ${Math.round(remaining.calories)} ккал. Лёгкий перекус — и день закрыт.`
  }

  return `Осталось ${Math.round(remaining.calories)} ккал и ${Math.round(remaining.protein)}г белка. Распредели по оставшимся приёмам пищи.`
}

export function useNutritionAdvice(eaten: NutrientTotals, target: NutrientTotals): string {
  return useMemo(() => getNutritionAdvice(eaten, target, new Date().getHours()), [eaten, target])
}

import { parseLocalDate } from './dates'
import type { DailyActivity, Gender, Goal } from '../types/database'

/** Базовый коэффициент активности вне тренировок */
const DAILY_ACTIVITY_MULTIPLIERS: Record<DailyActivity, number> = {
  sedentary: 1.2,
  on_feet: 1.4,
  physical: 1.6,
}

/**
 * Надбавка к коэффициенту активности за суммарное количество тренировок
 * (силовых + кардио) в неделю.
 */
function trainingFrequencyBonus(sessionsPerWeek: number): number {
  if (sessionsPerWeek >= 6) return 0.3
  if (sessionsPerWeek >= 5) return 0.25
  if (sessionsPerWeek >= 4) return 0.2
  if (sessionsPerWeek >= 3) return 0.15
  return 0
}

/** Доля калорий, приходящаяся на жиры, при расчёте целевых макронутриентов */
const FAT_CALORIE_SHARE = 0.25

/** Калорийность одного грамма белка/углеводов и жира соответственно */
const KCAL_PER_GRAM_PROTEIN_CARBS = 4
const KCAL_PER_GRAM_FAT = 9

export interface Targets {
  calories: number
  protein: number
  fat: number
  carbs: number
}

/**
 * Рассчитывает базовый метаболизм (BMR) по формуле Миффлина-Сан Жеора.
 *
 * @param weight_kg - вес тела, кг
 * @param height_cm - рост, см
 * @param age - возраст, полных лет
 * @param gender - пол ('male' | 'female')
 * @returns BMR в ккал/сутки
 */
export function calcBMR(
  weight_kg: number,
  height_cm: number,
  age: number,
  gender: Gender,
): number {
  const base = 10 * weight_kg + 6.25 * height_cm - 5 * age
  return gender === 'male' ? base + 5 : base - 161
}

/**
 * Рассчитывает суточный расход энергии (TDEE) на основе BMR, повседневной активности
 * и рекомендованного количества тренировок. Итоговый коэффициент = базовый коэффициент
 * бытовой активности + надбавка за суммарное число тренировок в неделю
 * (например, «на ногах» 1.4 + 6 тренировок 0.3 = 1.7).
 *
 * @param bmr - базовый метаболизм, ккал/сутки
 * @param daily_activity - повседневная активность вне тренировок
 * @param recommended_strength - рекомендованное количество силовых тренировок в неделю
 * @param recommended_cardio - рекомендованное количество кардио тренировок в неделю
 * @returns TDEE в ккал/сутки
 */
export function calcTDEE(
  bmr: number,
  daily_activity: DailyActivity,
  recommended_strength: number,
  recommended_cardio: number,
): number {
  const multiplier =
    DAILY_ACTIVITY_MULTIPLIERS[daily_activity] +
    trainingFrequencyBonus(recommended_strength + recommended_cardio)
  return bmr * multiplier
}

/**
 * Рассчитывает целевые калории и макронутриенты в зависимости от цели пользователя.
 *
 * - cut (похудение): TDEE - 500, белок 2 г/кг, жир 25% калорий, углеводы — остаток
 * - bulk (набор массы): TDEE + 300, белок 2 г/кг, жир 25% калорий, углеводы — остаток
 * - recomp (рекомпозиция): TDEE - 100, белок 2.2 г/кг, жир 25% калорий, углеводы — остаток
 * - maintain (поддержание): TDEE, белок 1.8 г/кг, жир 25% калорий, углеводы — остаток
 *
 * @param tdee - суточный расход энергии, ккал
 * @param goal - цель ('cut' | 'bulk' | 'recomp' | 'maintain')
 * @param weight_kg - вес тела, кг
 * @returns целевые значения калорий и макронутриентов (белок/жир/углеводы в граммах)
 */
export function calcTargets(
  tdee: number,
  goal: Goal,
  weight_kg: number,
): Targets {
  const config: Record<Goal, { calorieOffset: number; proteinPerKg: number }> = {
    cut: { calorieOffset: -500, proteinPerKg: 2 },
    bulk: { calorieOffset: 300, proteinPerKg: 2 },
    recomp: { calorieOffset: -100, proteinPerKg: 2.2 },
    maintain: { calorieOffset: 0, proteinPerKg: 1.8 },
  }

  const { calorieOffset, proteinPerKg } = config[goal]

  const calories = tdee + calorieOffset
  const protein = proteinPerKg * weight_kg
  const fat = (calories * FAT_CALORIE_SHARE) / KCAL_PER_GRAM_FAT
  const carbs =
    (calories - protein * KCAL_PER_GRAM_PROTEIN_CARBS - fat * KCAL_PER_GRAM_FAT) /
    KCAL_PER_GRAM_PROTEIN_CARBS

  return { calories, protein, fat, carbs }
}

/**
 * Рассчитывает процент жира в организме по формуле US Navy.
 *
 * @param gender - пол ('male' | 'female')
 * @param waist_cm - обхват талии, см
 * @param neck_cm - обхват шеи, см
 * @param height_cm - рост, см
 * @param hips_cm - обхват бёдер, см (обязателен для женщин)
 * @returns процент жира в организме
 */
export function calcBodyFat(
  gender: Gender,
  waist_cm: number,
  neck_cm: number,
  height_cm: number,
  hips_cm?: number,
): number {
  if (gender === 'male') {
    return (
      495 /
        (1.0324 -
          0.19077 * Math.log10(waist_cm - neck_cm) +
          0.15456 * Math.log10(height_cm)) -
      450
    )
  }

  if (hips_cm === undefined) {
    throw new Error('Для расчёта процента жира у женщин необходим обхват бёдер (hips_cm)')
  }

  return (
    495 /
      (1.29579 -
        0.35004 * Math.log10(waist_cm + hips_cm - neck_cm) +
        0.221 * Math.log10(height_cm)) -
    450
  )
}

/**
 * Рассчитывает индекс массы тела (ИМТ) = вес / рост² (рост в метрах).
 *
 * @param weight_kg - вес тела, кг
 * @param height_cm - рост, см
 * @returns ИМТ
 */
export function calcBMI(weight_kg: number, height_cm: number): number {
  const height_m = height_cm / 100
  return weight_kg / (height_m * height_m)
}

export type IndicatorColor = 'green' | 'yellow' | 'red'

export interface IndicatorCategory {
  label: string
  color: IndicatorColor
}

/**
 * Рассчитывает соотношение талии к бёдрам (WHR).
 *
 * @param waist_cm - обхват талии, см
 * @param hips_cm - обхват бёдер, см
 */
export function calcWHR(waist_cm: number, hips_cm: number): number {
  return waist_cm / hips_cm
}

/**
 * Определяет категорию WHR по полу.
 * Мужчины: <0.9 норма, 0.9-1.0 повышенный, >1.0 высокий.
 * Женщины: <0.85 норма, 0.85-0.95 повышенный, >0.95 высокий.
 */
export function getWHRCategory(whr: number, gender: Gender): IndicatorCategory {
  if (gender === 'male') {
    if (whr < 0.9) return { label: 'Норма', color: 'green' }
    if (whr <= 1.0) return { label: 'Повышенный', color: 'yellow' }
    return { label: 'Высокий', color: 'red' }
  }

  if (whr < 0.85) return { label: 'Норма', color: 'green' }
  if (whr <= 0.95) return { label: 'Повышенный', color: 'yellow' }
  return { label: 'Высокий', color: 'red' }
}

/**
 * Рассчитывает соотношение талии к росту (WHtR).
 *
 * @param waist_cm - обхват талии, см
 * @param height_cm - рост, см
 */
export function calcWHtR(waist_cm: number, height_cm: number): number {
  return waist_cm / height_cm
}

/** Определяет категорию WHtR: <0.5 норма, 0.5-0.6 повышенный, >0.6 высокий. */
export function getWHtRCategory(whtr: number): IndicatorCategory {
  if (whtr < 0.5) return { label: 'Норма', color: 'green' }
  if (whtr <= 0.6) return { label: 'Повышенный', color: 'yellow' }
  return { label: 'Высокий', color: 'red' }
}

/** Определяет категорию ИМТ: <18.5 дефицит, 18.5-25 норма, 25-30 избыток, >30 ожирение. */
export function getBMICategory(bmi: number): IndicatorCategory {
  if (bmi < 18.5) return { label: 'Дефицит', color: 'yellow' }
  if (bmi < 25) return { label: 'Норма', color: 'green' }
  if (bmi < 30) return { label: 'Избыток', color: 'yellow' }
  return { label: 'Ожирение', color: 'red' }
}

export type BodyFatCategory = 'Мало жира' | 'В норме' | 'Выше нормы' | 'Ожирение'

/** Границы процента жира по полу: [normal, above) — «в норме», [above, obese) — «выше нормы» */
export const BODY_FAT_THRESHOLDS: Record<Gender, { normal: number; above: number; obese: number }> = {
  male: { normal: 12, above: 20, obese: 30 },
  female: { normal: 18, above: 28, obese: 35 },
}

/**
 * Определяет категорию процента жира в организме по полу.
 *
 * Мужчины: <12% мало жира, 12-20% норма, 20-30% выше нормы, >30% ожирение.
 * Женщины: <18% мало жира, 18-28% норма, 28-35% выше нормы, >35% ожирение.
 *
 * @param gender - пол ('male' | 'female')
 * @param bodyFatPct - процент жира в организме
 * @returns категория процента жира
 */
export function getBodyFatCategory(gender: Gender, bodyFatPct: number): BodyFatCategory {
  const thresholds = BODY_FAT_THRESHOLDS[gender]

  if (bodyFatPct > thresholds.obese) return 'Ожирение'
  if (bodyFatPct > thresholds.above) return 'Выше нормы'
  if (bodyFatPct >= thresholds.normal) return 'В норме'
  return 'Мало жира'
}

export interface TrainingPlan {
  strength: number
  cardio: number
  tip: string
}

/**
 * Рассчитывает рекомендацию по тренировкам (кол-во силовых и кардио в неделю)
 * на основе цели и текущего процента жира в организме.
 *
 * @param goal - цель ('cut' | 'bulk' | 'recomp' | 'maintain')
 * @param bodyFatPct - процент жира в организме
 * @param gender - пол ('male' | 'female')
 * @returns рекомендованное количество силовых/кардио тренировок в неделю и совет
 */
export function calcTrainingPlan(goal: Goal, bodyFatPct: number, gender: Gender): TrainingPlan {
  if (goal === 'cut') {
    const highFat = (gender === 'male' && bodyFatPct > 25) || (gender === 'female' && bodyFatPct > 35)
    const moderateFat = (gender === 'male' && bodyFatPct > 18) || (gender === 'female' && bodyFatPct > 28)

    if (highFat) {
      return {
        strength: 3,
        cardio: 3,
        tip: 'При высоком проценте жира кардио ускоряет результат. Силовые сохранят мышцы.',
      }
    }

    if (moderateFat) {
      return {
        strength: 4,
        cardio: 2,
        tip: 'Силовые для рельефа, кардио для ускорения жиросжигания.',
      }
    }

    return {
      strength: 4,
      cardio: 1,
      tip: 'Жира мало — дефицит калорий сделает основную работу. Силовые удержат мышцы.',
    }
  }

  if (goal === 'bulk') {
    return {
      strength: 5,
      cardio: 1,
      tip: 'Максимум силовых для роста. Одно лёгкое кардио для здоровья сердца.',
    }
  }

  if (goal === 'recomp') {
    return {
      strength: 4,
      cardio: 2,
      tip: 'Силовые стимулируют рост мышц, кардио помогает сжигать жир.',
    }
  }

  return {
    strength: 3,
    cardio: 2,
    tip: 'Достаточно для поддержания формы без перетренированности.',
  }
}

/**
 * Вычисляет возраст (полных лет) на основе даты рождения.
 *
 * @param birth_date - дата рождения в формате строки (ISO, например '1990-05-20')
 * @returns возраст в полных годах на текущую дату
 */
export function calcAge(birth_date: string): number {
  const birth = parseLocalDate(birth_date)
  const today = new Date()

  let age = today.getFullYear() - birth.getFullYear()
  const hasNotHadBirthdayThisYear =
    today.getMonth() < birth.getMonth() ||
    (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate())

  if (hasNotHadBirthdayThisYear) {
    age -= 1
  }

  return age
}

export interface WeightPoint {
  date: string
  value: number
}

/**
 * Вычисляет скользящее среднее для ряда значений веса.
 * Точки должны быть отсортированы по возрастанию даты; для первых точек,
 * где полное окно недоступно, среднее считается по имеющимся значениям.
 *
 * @param weights - массив точек {date, value}, отсортированных по дате
 * @param window - размер окна скользящего среднего
 * @returns массив точек {date, value} со сглаженными значениями
 */
export function calcMovingAverage(
  weights: WeightPoint[],
  window: number,
): WeightPoint[] {
  return weights.map((point, index) => {
    const start = Math.max(0, index - window + 1)
    const slice = weights.slice(start, index + 1)
    const average = slice.reduce((sum, p) => sum + p.value, 0) / slice.length

    return { date: point.date, value: average }
  })
}

import { useMemo } from 'react'
import { calcBMI, calcWHR, calcWHtR, getWHRCategory } from '../lib/calculations'
import type { Gender, Goal, Measurement } from '../types/database'

export type AdviceIcon = 'good' | 'warning' | 'bad' | 'info'

export interface MeasurementsAdvice {
  icon: AdviceIcon
  text: string
}

function safeDelta(current: number | null, previous: number | null): number {
  if (current === null || previous === null) return 0
  return current - previous
}

function bicepAvg(m: Measurement): number | null {
  if (m.bicep_left_cm === null || m.bicep_right_cm === null) return null
  return (m.bicep_left_cm + m.bicep_right_cm) / 2
}

/**
 * Формирует текст рекомендации по замерам на основе изменения талии, бицепса,
 * груди и процента жира относительно замера ~4 недели назад.
 */
export function getMeasurementsAdvice(
  goal: Goal,
  current: Measurement,
  previous: Measurement | null,
  gender: Gender,
  heightCm: number | null,
  currentWeightKg: number | null,
): MeasurementsAdvice {
  const whr = current.waist_cm !== null && current.hips_cm !== null ? calcWHR(current.waist_cm, current.hips_cm) : null
  const whtr = current.waist_cm !== null && heightCm !== null ? calcWHtR(current.waist_cm, heightCm) : null
  const bmi = currentWeightKg !== null && heightCm !== null ? calcBMI(currentWeightKg, heightCm) : null

  // WHR высокий
  if (whr && getWHRCategory(whr, gender).color === 'red') {
    return {
      icon: 'warning',
      text:
        'Соотношение талия/бёдра выше нормы — это говорит о повышенном висцеральном жире. ' +
        'Кардио и дефицит калорий помогут снизить его.',
    }
  }

  // WHtR пограничный
  if (whtr && whtr >= 0.5 && whtr < 0.6) {
    return {
      icon: 'warning',
      text:
        'Отношение талии к росту на границе нормы. ' +
        'Снижение обхвата талии на 2-3 см вернёт показатель в зелёную зону.',
    }
  }

  // ИМТ не показателен для тренирующихся
  if (bmi && bmi >= 25 && current.body_fat_pct !== null && current.body_fat_pct < 20) {
    return {
      icon: 'info',
      text:
        'ИМТ выше нормы, но процент жира в порядке — это нормально при развитой мускулатуре. ' +
        'Ориентируйся на процент жира и обхваты, а не на ИМТ.',
    }
  }

  if (!previous) {
    return {
      icon: 'info',
      text: 'Пока только один замер. Через 2-4 недели здесь появится анализ динамики.',
    }
  }

  const waistDelta = safeDelta(current.waist_cm, previous.waist_cm)
  const bicepDelta = safeDelta(bicepAvg(current), bicepAvg(previous))
  const chestDelta = safeDelta(current.chest_cm, previous.chest_cm)
  const fatDelta = safeDelta(current.body_fat_pct, previous.body_fat_pct)

  if (goal === 'cut') {
    if (waistDelta < -0.5 && bicepDelta >= -0.3) {
      return {
        icon: 'good',
        text: `Талия −${Math.abs(waistDelta).toFixed(1)} см, бицепс стабилен. Жир уходит без потери мышц — отличный прогресс!`,
      }
    }
    if (waistDelta < -0.5 && bicepDelta < -0.3) {
      return {
        icon: 'warning',
        text: `Талия −${Math.abs(waistDelta).toFixed(1)} см, но бицепс тоже −${Math.abs(bicepDelta).toFixed(1)} см. Возможно теряешь мышцы. Увеличь белок и снизь темп похудения.`,
      }
    }
    if (Math.abs(waistDelta) <= 0.5) {
      return {
        icon: 'warning',
        text: 'Талия не изменилась за 4 недели. Застой — пересмотри калории или добавь кардио.',
      }
    }
    if (waistDelta > 0.5) {
      return {
        icon: 'bad',
        text: `Талия +${waistDelta.toFixed(1)} см. Ты набираешь жир вместо того чтобы терять. Проверь дефицит калорий.`,
      }
    }
  }

  if (goal === 'bulk') {
    if ((bicepDelta > 0.3 || chestDelta > 0.5) && waistDelta <= 1.0) {
      return {
        icon: 'good',
        text: `Грудь +${chestDelta.toFixed(1)} см, бицепс +${bicepDelta.toFixed(1)} см, талия стабильна. Чистый набор мышц — идеально!`,
      }
    }
    if (waistDelta > 1.0 && waistDelta > bicepDelta * 2) {
      return {
        icon: 'warning',
        text: `Талия +${waistDelta.toFixed(1)} см — набираешь много жира. Снизь профицит калорий на 150-200 ккал.`,
      }
    }
    if (bicepDelta <= 0.2 && chestDelta <= 0.3) {
      return {
        icon: 'warning',
        text: 'Замеры почти не изменились. Возможно, мало ешь или тренируешься недостаточно интенсивно.',
      }
    }
  }

  if (goal === 'recomp') {
    if (waistDelta < -0.3 && bicepDelta >= 0) {
      return {
        icon: 'good',
        text: `Талия −${Math.abs(waistDelta).toFixed(1)} см, бицепс +${bicepDelta.toFixed(1)} см. Рекомпозиция работает — жир уходит, мышцы растут.`,
      }
    }
    if (Math.abs(waistDelta) <= 0.3 && Math.abs(bicepDelta) <= 0.2) {
      return {
        icon: 'warning',
        text: 'Замеры стабильны. Рекомпозиция — медленный процесс, но через 2-3 месяца прогресс станет заметен. Следи за силовыми.',
      }
    }
  }

  if (Math.abs(waistDelta) <= 0.5 && Math.abs(bicepDelta) <= 0.3) {
    return {
      icon: 'good',
      text: 'Замеры стабильны — форма сохраняется. Всё отлично!',
    }
  }

  return {
    icon: 'info',
    text: `Жир: ${fatDelta > 0 ? '+' : ''}${fatDelta.toFixed(1)}%, талия: ${waistDelta > 0 ? '+' : ''}${waistDelta.toFixed(1)} см. Следи за трендом на следующих замерах.`,
  }
}

export function useMeasurementsAdvice(
  goal: Goal | null,
  current: Measurement | null,
  previous: Measurement | null,
  gender: Gender | null,
  heightCm: number | null,
  currentWeightKg: number | null,
): MeasurementsAdvice | null {
  return useMemo(() => {
    if (!goal || !current || !gender) return null
    return getMeasurementsAdvice(goal, current, previous, gender, heightCm, currentWeightKg)
  }, [goal, current, previous, gender, heightCm, currentWeightKg])
}

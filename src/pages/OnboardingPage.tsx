import { useMemo, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Beef,
  ChevronLeft,
  Droplet,
  Dumbbell,
  Flame,
  Minus,
  RefreshCw,
  TrendingDown,
  TrendingUp,
  Wheat,
  type LucideIcon,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import {
  calcAge,
  calcBMI,
  calcBMR,
  calcBodyFat,
  calcTDEE,
  calcTargets,
  calcTrainingPlan,
  getBodyFatCategory,
} from '../lib/calculations'
import type { DailyActivity, Gender, Goal } from '../types/database'

const TOTAL_STEPS = 5

const DAILY_ACTIVITY_OPTIONS: { value: DailyActivity; title: string; description: string }[] = [
  { value: 'sedentary', title: 'Сидячая работа', description: 'Офис, компьютер' },
  { value: 'on_feet', title: 'На ногах', description: 'Продавец, учитель, много хожу' },
  { value: 'physical', title: 'Физический труд', description: 'Стройка, склад, грузчик' },
]

const GOAL_OPTIONS: { value: Goal; title: string; description: string; icon: LucideIcon }[] = [
  {
    value: 'cut',
    title: 'Похудеть',
    description: 'Снизить жир, стать рельефнее',
    icon: TrendingDown,
  },
  {
    value: 'bulk',
    title: 'Набрать массу',
    description: 'Нарастить мышцы, стать больше',
    icon: TrendingUp,
  },
  {
    value: 'recomp',
    title: 'Рекомпозиция',
    description: 'Сжечь жир и нарастить мышцы одновременно',
    icon: RefreshCw,
  },
  {
    value: 'maintain',
    title: 'Поддержание',
    description: 'Остаться в текущей форме',
    icon: Minus,
  },
]

const BODY_FAT_CATEGORY_CLASSES: Record<string, string> = {
  'Мало жира': 'border-sky-400/30 bg-sky-400/10 text-sky-400',
  'В норме': 'border-accent/30 bg-accent/10 text-accent',
  'Выше нормы': 'border-amber-400/30 bg-amber-400/10 text-amber-400',
  Ожирение: 'border-red-400/30 bg-red-400/10 text-red-400',
}

function isoDateYearsAgo(years: number): string {
  const date = new Date()
  date.setFullYear(date.getFullYear() - years)
  return date.toISOString().slice(0, 10)
}

function parseDecimal(value: string): number {
  return parseFloat(value.replace(',', '.'))
}

const MIN_BIRTH_DATE = isoDateYearsAgo(100)
const MAX_BIRTH_DATE = isoDateYearsAgo(14)

export function OnboardingPage() {
  const { user, refreshProfile } = useAuth()
  const navigate = useNavigate()

  const [step, setStep] = useState(1)
  const [direction, setDirection] = useState<'forward' | 'backward'>('forward')

  const [name, setName] = useState('')
  const [gender, setGender] = useState<Gender | null>(null)
  const [birthDate, setBirthDate] = useState('')
  const [heightCm, setHeightCm] = useState('')

  const [weightKg, setWeightKg] = useState('')
  const [waistCm, setWaistCm] = useState('')
  const [neckCm, setNeckCm] = useState('')
  const [hipsCm, setHipsCm] = useState('')

  const [dailyActivity, setDailyActivity] = useState<DailyActivity | null>(null)
  const [goal, setGoal] = useState<Goal | null>(null)

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const age = birthDate ? calcAge(birthDate) : null
  const birthDateValid = birthDate !== '' && age !== null && age >= 14 && age <= 100

  const heightValue = parseDecimal(heightCm)
  const heightValid = !Number.isNaN(heightValue) && heightValue >= 100 && heightValue <= 250

  const weightValue = parseDecimal(weightKg)
  const weightValid = !Number.isNaN(weightValue) && weightValue >= 30 && weightValue <= 300

  const waistValue = parseDecimal(waistCm)
  const waistValid = !Number.isNaN(waistValue) && waistValue >= 40 && waistValue <= 200

  const neckValue = parseDecimal(neckCm)
  const neckValid = !Number.isNaN(neckValue) && neckValue >= 20 && neckValue <= 80

  const hipsProvided = hipsCm.trim() !== ''
  const hipsValue = parseDecimal(hipsCm)
  const hipsNumberValid = hipsProvided && !Number.isNaN(hipsValue) && hipsValue >= 50 && hipsValue <= 200
  const hipsValid = gender === 'female' ? hipsNumberValid : !hipsProvided || hipsNumberValid

  const step1Valid = name.trim().length > 0 && gender !== null && birthDateValid && heightValid
  const step2Valid = weightValid && waistValid && neckValid && hipsValid
  const step3Valid = dailyActivity !== null
  const step4Valid = goal !== null

  const canProceed =
    step === 1
      ? step1Valid
      : step === 2
        ? step2Valid
        : step === 3
          ? step3Valid
          : step === 4
            ? step4Valid
            : true

  const bodyFatPct = useMemo(() => {
    if (!gender || !heightValid || !waistValid || !neckValid) return null
    if (gender === 'female' && !hipsValid) return null

    const hipsArg = gender === 'male' ? (hipsNumberValid ? hipsValue : undefined) : hipsValue
    return calcBodyFat(gender, waistValue, neckValue, heightValue, hipsArg)
  }, [gender, heightValid, heightValue, waistValid, waistValue, neckValid, neckValue, hipsValid, hipsNumberValid, hipsValue])

  const bmi = useMemo(() => {
    if (!weightValid || !heightValid) return null
    return calcBMI(weightValue, heightValue)
  }, [weightValid, weightValue, heightValid, heightValue])

  const bodyFatCategory = useMemo(() => {
    if (!gender || bodyFatPct === null) return null
    return getBodyFatCategory(gender, bodyFatPct)
  }, [gender, bodyFatPct])

  const trainingPlan = useMemo(() => {
    if (!goal || !gender || bodyFatPct === null) return null
    return calcTrainingPlan(goal, bodyFatPct, gender)
  }, [goal, gender, bodyFatPct])

  const targets = useMemo(() => {
    if (!weightValid || !gender || !dailyActivity || !goal || !birthDateValid || !heightValid || !trainingPlan) {
      return null
    }
    const bmr = calcBMR(weightValue, heightValue, age as number, gender)
    const tdee = calcTDEE(bmr, dailyActivity, trainingPlan.strength, trainingPlan.cardio)
    return calcTargets(tdee, goal, weightValue)
  }, [weightValid, weightValue, gender, dailyActivity, goal, birthDateValid, heightValid, heightValue, age, trainingPlan])

  function goNext() {
    if (step >= TOTAL_STEPS) return
    setDirection('forward')
    setStep((s) => s + 1)
  }

  function goBack() {
    if (step <= 1) return
    setError(null)
    setDirection('backward')
    setStep((s) => s - 1)
  }

  async function handleStart() {
    if (!user || !targets || !gender || !dailyActivity || !goal || !trainingPlan || bodyFatPct === null) return

    setSubmitting(true)
    setError(null)

    const today = new Date().toISOString().slice(0, 10)

    const { error: profileError } = await supabase.from('profiles').insert({
      id: user.id,
      name: name.trim(),
      gender,
      birth_date: birthDate,
      height_cm: heightValue,
      daily_activity: dailyActivity,
      recommended_strength: trainingPlan.strength,
      recommended_cardio: trainingPlan.cardio,
      goal,
      target_calories: Math.round(targets.calories),
      target_protein: Math.round(targets.protein),
      target_fat: Math.round(targets.fat),
      target_carbs: Math.round(targets.carbs),
      target_weight_kg: null,
    })

    if (profileError) {
      setError('Не удалось сохранить профиль. Попробуйте ещё раз.')
      setSubmitting(false)
      return
    }

    const { error: weightError } = await supabase.from('weight_log').insert({
      user_id: user.id,
      date: today,
      weight_kg: weightValue,
    })

    if (weightError) {
      setError('Не удалось сохранить вес. Попробуйте ещё раз.')
      setSubmitting(false)
      return
    }

    const { error: measurementError } = await supabase.from('measurements').insert({
      user_id: user.id,
      date: today,
      neck_cm: neckValue,
      chest_cm: null,
      waist_cm: waistValue,
      hips_cm: hipsNumberValid ? hipsValue : null,
      bicep_left_cm: null,
      bicep_right_cm: null,
      thigh_left_cm: null,
      thigh_right_cm: null,
      body_fat_pct: Math.round(bodyFatPct * 10) / 10,
    })

    if (measurementError) {
      setError('Не удалось сохранить замеры. Попробуйте ещё раз.')
      setSubmitting(false)
      return
    }

    await refreshProfile()
    navigate('/', { replace: true })
  }

  return (
    <div className="flex min-h-screen flex-col px-6 pb-8 pt-6">
      <div className="flex gap-2">
        {Array.from({ length: TOTAL_STEPS }, (_, i) => i + 1).map((dot) => (
          <div
            key={dot}
            className={`h-1.5 flex-1 rounded-full transition-colors ${
              dot <= step ? 'bg-accent' : 'bg-overlay/10'
            }`}
          />
        ))}
      </div>
      <p className="pt-3 text-sm text-foreground/50">
        Шаг {step} из {TOTAL_STEPS}
      </p>

      <div
        key={step}
        className={`flex flex-1 flex-col gap-5 pt-6 ${
          direction === 'forward' ? 'animate-slide-in-right' : 'animate-slide-in-left'
        }`}
      >
        {step === 1 && (
          <StepBasics
            name={name}
            onNameChange={setName}
            gender={gender}
            onGenderChange={setGender}
            birthDate={birthDate}
            onBirthDateChange={setBirthDate}
            heightCm={heightCm}
            onHeightChange={setHeightCm}
            birthDateTouched={birthDate !== ''}
            birthDateValid={birthDateValid}
          />
        )}

        {step === 2 && (
          <StepMeasurements
            weightKg={weightKg}
            onWeightChange={setWeightKg}
            waistCm={waistCm}
            onWaistChange={setWaistCm}
            neckCm={neckCm}
            onNeckChange={setNeckCm}
            hipsCm={hipsCm}
            onHipsChange={setHipsCm}
            gender={gender}
          />
        )}

        {step === 3 && <StepLifestyle dailyActivity={dailyActivity} onChange={setDailyActivity} />}

        {step === 4 && <StepGoal goal={goal} onChange={setGoal} />}

        {step === 5 && (
          <StepResult
            bodyFatPct={bodyFatPct}
            bodyFatCategory={bodyFatCategory}
            gender={gender}
            bmi={bmi}
            targets={targets}
            trainingPlan={trainingPlan}
          />
        )}
      </div>

      {error && <p className="pb-2 text-center text-sm text-red-400">{error}</p>}

      <div className="flex gap-3 pt-4">
        {step > 1 && (
          <button
            type="button"
            onClick={goBack}
            disabled={submitting}
            className="flex min-h-[52px] items-center justify-center gap-1 rounded-xl border border-border px-5 font-medium text-foreground transition hover:border-accent disabled:opacity-50"
          >
            <ChevronLeft size={18} />
            Назад
          </button>
        )}

        <button
          type="button"
          onClick={step === TOTAL_STEPS ? handleStart : goNext}
          disabled={!canProceed || submitting}
          className="min-h-[52px] flex-1 rounded-xl bg-accent font-medium text-background transition hover:bg-accent-hover disabled:opacity-40"
        >
          {step === TOTAL_STEPS ? (submitting ? 'Сохраняем…' : 'Начать') : 'Далее'}
        </button>
      </div>
    </div>
  )
}

function FieldLabel({ children }: { children: ReactNode }) {
  return <label className="text-sm text-foreground/70">{children}</label>
}

const inputClasses =
  'min-h-[44px] w-full rounded-xl border border-border bg-surface px-4 text-foreground outline-none focus:border-accent'

interface StepBasicsProps {
  name: string
  onNameChange: (value: string) => void
  gender: Gender | null
  onGenderChange: (value: Gender) => void
  birthDate: string
  onBirthDateChange: (value: string) => void
  heightCm: string
  onHeightChange: (value: string) => void
  birthDateTouched: boolean
  birthDateValid: boolean
}

function StepBasics({
  name,
  onNameChange,
  gender,
  onGenderChange,
  birthDate,
  onBirthDateChange,
  heightCm,
  onHeightChange,
  birthDateTouched,
  birthDateValid,
}: StepBasicsProps) {
  return (
    <>
      <div className="flex flex-col gap-1.5">
        <FieldLabel>Имя</FieldLabel>
        <input
          type="text"
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          placeholder="Как тебя зовут?"
          className={inputClasses}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <FieldLabel>Пол</FieldLabel>
        <div className="grid grid-cols-2 gap-3">
          {(['male', 'female'] as const).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => onGenderChange(value)}
              className={`min-h-[56px] rounded-xl border text-base font-medium transition ${
                gender === value
                  ? 'border-accent bg-accent/15 text-accent'
                  : 'border-border bg-surface text-foreground'
              }`}
            >
              {value === 'male' ? 'Мужской' : 'Женский'}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <FieldLabel>Дата рождения</FieldLabel>
        <input
          type="date"
          value={birthDate}
          min={MIN_BIRTH_DATE}
          max={MAX_BIRTH_DATE}
          onChange={(e) => onBirthDateChange(e.target.value)}
          className={inputClasses}
        />
        {birthDateTouched && !birthDateValid && (
          <p className="text-xs text-red-400">Возраст должен быть от 14 до 100 лет</p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <FieldLabel>Рост</FieldLabel>
        <div className="relative">
          <input
            type="text"
            inputMode="decimal"
            value={heightCm}
            onChange={(e) => onHeightChange(e.target.value)}
            placeholder="175"
            className={`${inputClasses} pr-12`}
          />
          <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm text-foreground/50">
            см
          </span>
        </div>
      </div>
    </>
  )
}

interface MeasurementFieldProps {
  label: string
  suffix: string
  value: string
  onChange: (value: string) => void
  placeholder: string
  optional?: boolean
}

function MeasurementField({ label, suffix, value, onChange, placeholder, optional }: MeasurementFieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <FieldLabel>
        {label}
        {optional && <span className="text-foreground/40"> (опционально)</span>}
      </FieldLabel>
      <div className="relative">
        <input
          type="text"
          inputMode="decimal"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={`${inputClasses} pr-12`}
        />
        <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm text-foreground/50">
          {suffix}
        </span>
      </div>
    </div>
  )
}

interface StepMeasurementsProps {
  weightKg: string
  onWeightChange: (value: string) => void
  waistCm: string
  onWaistChange: (value: string) => void
  neckCm: string
  onNeckChange: (value: string) => void
  hipsCm: string
  onHipsChange: (value: string) => void
  gender: Gender | null
}

function StepMeasurements({
  weightKg,
  onWeightChange,
  waistCm,
  onWaistChange,
  neckCm,
  onNeckChange,
  hipsCm,
  onHipsChange,
  gender,
}: StepMeasurementsProps) {
  return (
    <>
      <MeasurementField label="Вес" suffix="кг" value={weightKg} onChange={onWeightChange} placeholder="70" />
      <MeasurementField
        label="Обхват талии"
        suffix="см"
        value={waistCm}
        onChange={onWaistChange}
        placeholder="80"
      />
      <MeasurementField label="Обхват шеи" suffix="см" value={neckCm} onChange={onNeckChange} placeholder="38" />
      <MeasurementField
        label="Обхват бёдер"
        suffix="см"
        value={hipsCm}
        onChange={onHipsChange}
        placeholder="95"
        optional={gender === 'male'}
      />

      <p className="text-sm text-foreground/50">
        Эти замеры нужны для оценки процента жира и подбора плана. Измеряй утром, расслабленно, не
        втягивая живот
      </p>
    </>
  )
}

interface StepLifestyleProps {
  dailyActivity: DailyActivity | null
  onChange: (value: DailyActivity) => void
}

function StepLifestyle({ dailyActivity, onChange }: StepLifestyleProps) {
  return (
    <div className="flex flex-col gap-3">
      <h2 className="font-medium text-foreground">Чем занимаешься в течение дня (вне тренировок)?</h2>
      {DAILY_ACTIVITY_OPTIONS.map((option) => {
        const selected = dailyActivity === option.value
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={`flex items-center justify-between gap-3 rounded-xl border p-4 text-left transition ${
              selected ? 'border-accent bg-accent/10' : 'border-border bg-surface'
            }`}
          >
            <div className="flex flex-col gap-0.5">
              <span className="font-medium text-foreground">{option.title}</span>
              <span className="text-sm text-foreground/60">{option.description}</span>
            </div>
            <RadioDot selected={selected} />
          </button>
        )
      })}
    </div>
  )
}

interface StepGoalProps {
  goal: Goal | null
  onChange: (value: Goal) => void
}

function StepGoal({ goal, onChange }: StepGoalProps) {
  return (
    <div className="flex flex-col gap-3">
      {GOAL_OPTIONS.map((option) => {
        const selected = goal === option.value
        const Icon = option.icon
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={`flex items-start gap-3 rounded-xl border p-4 text-left transition ${
              selected ? 'border-accent bg-accent/10' : 'border-border bg-surface'
            }`}
          >
            <div
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
                selected ? 'bg-accent/20 text-accent' : 'bg-overlay/5 text-foreground/60'
              }`}
            >
              <Icon size={20} />
            </div>
            <div className="flex flex-1 flex-col gap-0.5">
              <span className="font-medium text-foreground">{option.title}</span>
              <span className="text-sm text-foreground/60">{option.description}</span>
            </div>
            <RadioDot selected={selected} />
          </button>
        )
      })}
    </div>
  )
}

interface StepResultProps {
  bodyFatPct: number | null
  bodyFatCategory: string | null
  gender: Gender | null
  bmi: number | null
  targets: { calories: number; protein: number; fat: number; carbs: number } | null
  trainingPlan: { strength: number; cardio: number; tip: string } | null
}

function StepResult({ bodyFatPct, bodyFatCategory, bmi, targets, trainingPlan }: StepResultProps) {
  const categoryClasses = bodyFatCategory ? BODY_FAT_CATEGORY_CLASSES[bodyFatCategory] : ''

  return (
    <>
      <div className="flex flex-col gap-1 text-center">
        <p className="text-xl font-semibold text-foreground">Твой персональный план</p>
        <p className="text-sm text-foreground/60">Рассчитан на основе твоих данных</p>
      </div>

      <div className="flex flex-col items-center gap-3 rounded-2xl border border-border bg-surface p-5">
        <div className="flex h-28 w-28 flex-col items-center justify-center rounded-full border-4 border-accent">
          <span className="text-3xl font-bold text-foreground">
            {bodyFatPct !== null ? `${bodyFatPct.toFixed(1)}%` : '—'}
          </span>
          <span className="text-xs text-foreground/50">жира</span>
        </div>

        {bodyFatCategory && (
          <span className={`rounded-full border px-3 py-1 text-sm font-medium ${categoryClasses}`}>
            {bodyFatCategory}
          </span>
        )}

        {bmi !== null && <p className="text-sm text-foreground/70">ИМТ: {bmi.toFixed(1)}</p>}

        {bodyFatPct !== null && bodyFatCategory && (
          <p className="text-center text-sm text-foreground/60">
            Твой процент жира ~{bodyFatPct.toFixed(0)}%. Это {bodyFatCategory.toLowerCase()}. Точность
            оценки ±3-4%.
          </p>
        )}
      </div>

      {targets && (
        <div className="flex flex-col gap-3">
          <h2 className="font-medium text-foreground">План питания</h2>
          <div className="flex flex-col gap-2 rounded-2xl border border-accent/30 bg-accent/10 p-5">
            <div className="flex items-center gap-2 text-accent">
              <Flame size={18} />
              <span className="text-sm">Калории</span>
            </div>
            <p className="text-3xl font-bold text-foreground">
              {Math.round(targets.calories)}
              <span className="ml-1 text-base font-normal text-foreground/50">ккал</span>
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <MacroCard icon={Beef} label="Белки" value={Math.round(targets.protein)} />
            <MacroCard icon={Droplet} label="Жиры" value={Math.round(targets.fat)} />
            <MacroCard icon={Wheat} label="Углеводы" value={Math.round(targets.carbs)} />
          </div>
        </div>
      )}

      {trainingPlan && (
        <div className="flex flex-col gap-3">
          <h2 className="font-medium text-foreground">План тренировок</h2>
          <div className="flex items-start gap-3 rounded-2xl border border-border bg-surface p-5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent/15 text-accent">
              <Dumbbell size={20} />
            </div>
            <div className="flex flex-col gap-1">
              <p className="font-semibold text-foreground">
                {trainingPlan.strength} силовых + {trainingPlan.cardio} кардио в неделю
              </p>
              <p className="text-sm text-foreground/60">{trainingPlan.tip}</p>
            </div>
          </div>
        </div>
      )}

      <p className="text-center text-xs text-foreground/50">
        Ты можешь изменить эти значения в настройках
      </p>
    </>
  )
}

function MacroCard({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: number }) {
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-border bg-surface p-3">
      <div className="flex items-center gap-1.5 text-foreground/60">
        <Icon size={14} />
        <span className="text-xs">{label}</span>
      </div>
      <p className="text-lg font-semibold text-foreground">
        {value}
        <span className="ml-0.5 text-xs font-normal text-foreground/50">г</span>
      </p>
    </div>
  )
}

function RadioDot({ selected }: { selected: boolean }) {
  return (
    <div
      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
        selected ? 'border-accent' : 'border-border'
      }`}
    >
      {selected && <div className="h-2.5 w-2.5 rounded-full bg-accent" />}
    </div>
  )
}

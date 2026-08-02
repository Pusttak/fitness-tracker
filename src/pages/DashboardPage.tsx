import { memo, useCallback, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ChefHat, ChevronDown, ChevronLeft, ChevronRight, Dumbbell, Lightbulb, Plus, Trash2 } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { useMeals, type MealGroup, type MealItemDisplay, type NutrientTotals } from '../hooks/useMeals'
import { useTodayWeight } from '../hooks/useTodayWeight'
import { useMeasurements } from '../hooks/useMeasurements'
import { useWorkouts } from '../hooks/useWorkouts'
import { useNutritionAdvice } from '../hooks/useNutritionAdvice'
import { MEAL_TYPES, MEAL_TYPE_ICONS, MEAL_TYPE_LABELS } from '../lib/mealTypes'
import { MUSCLE_GROUP_LABELS, type MuscleGroup } from '../lib/muscleGroups'
import { SwipeActions } from '../components/SwipeActions'
import { Skeleton } from '../components/Skeleton'
import { ErrorState } from '../components/ErrorState'
import { isValidNumberInput, parseNumberInput } from '../lib/validation'
import type { MealType, Workout, WorkoutType } from '../types/database'

const WORKOUT_TYPE_LABEL: Record<WorkoutType, string> = {
  strength: 'Силовая',
  cardio: 'Кардио',
  mixed: 'Смешанная',
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

function shiftDate(dateIso: string, days: number): string {
  const date = new Date(dateIso)
  date.setDate(date.getDate() + days)
  return date.toISOString().slice(0, 10)
}

function formatDateLabel(dateIso: string): string {
  const today = todayIso()
  const dayMonth = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long' }).format(
    new Date(dateIso),
  )

  if (dateIso === today) return `Сегодня, ${dayMonth}`
  if (dateIso === shiftDate(today, -1)) return `Вчера, ${dayMonth}`
  if (dateIso === shiftDate(today, 1)) return `Завтра, ${dayMonth}`
  return dayMonth
}

function getProgressColor(pct: number): string {
  if (pct > 100) return '#EF4444'
  if (pct >= 80) return '#EAB308'
  return '#22C55E'
}

const EMPTY_TOTALS: NutrientTotals = { calories: 0, protein: 0, fat: 0, carbs: 0 }

export function DashboardPage() {
  const { profile } = useAuth()
  const { showToast } = useToast()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const [date, setDate] = useState(() => searchParams.get('date') ?? todayIso())
  const [openSections, setOpenSections] = useState<Set<MealType>>(new Set(MEAL_TYPES))
  const [weightModalOpen, setWeightModalOpen] = useState(false)

  const { meals, totals, loading: mealsLoading, error: mealsError, retry: mealsRetry, deleteItem } = useMeals(date)
  const { weight: dateWeight, hasWeight, saveWeight, loading: weightLoading } = useTodayWeight(date)
  const { latest: latestMeasurement } = useMeasurements()
  const { workouts } = useWorkouts()

  const todaysWorkout: Workout | undefined = workouts.find((w) => w.date === todayIso())

  const target: NutrientTotals = profile
    ? {
        calories: profile.target_calories,
        protein: profile.target_protein,
        fat: profile.target_fat,
        carbs: profile.target_carbs,
      }
    : EMPTY_TOTALS

  const advice = useNutritionAdvice(totals, target)

  const handleToggleSection = useCallback((type: MealType) => {
    setOpenSections((prev) => {
      const next = new Set(prev)
      if (next.has(type)) {
        next.delete(type)
      } else {
        next.add(type)
      }
      return next
    })
  }, [])

  const handleAddMeal = useCallback(
    (type: MealType) => {
      navigate(`/add-meal?date=${date}&type=${type}`)
    },
    [navigate, date],
  )

  const handleDeleteMealItem = useCallback(
    (itemId: string, type: MealType) => {
      deleteItem(itemId, type)
    },
    [deleteItem],
  )

  if (!profile) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-foreground/60">
        Загрузка…
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 px-4 pt-6">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setDate((d) => shiftDate(d, -1))}
          className="flex h-10 w-10 items-center justify-center rounded-full text-foreground/60 transition hover:bg-overlay/5"
        >
          <ChevronLeft size={20} />
        </button>
        <div className="flex flex-col items-center">
          <h1 className="text-lg font-semibold text-foreground">{formatDateLabel(date)}</h1>
          {(dateWeight || latestMeasurement?.body_fat_pct != null) && (
            <div className="flex items-center gap-2 text-xs text-foreground/50">
              {dateWeight && <span>{dateWeight.weight_kg} кг</span>}
              {dateWeight && latestMeasurement?.body_fat_pct != null && <span>·</span>}
              {latestMeasurement?.body_fat_pct != null && (
                <span>Жир: ~{latestMeasurement.body_fat_pct.toFixed(1)}%</span>
              )}
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={() => setDate((d) => shiftDate(d, 1))}
          className="flex h-10 w-10 items-center justify-center rounded-full text-foreground/60 transition hover:bg-overlay/5"
        >
          <ChevronRight size={20} />
        </button>
      </div>

      {date === todayIso() && !weightLoading && !hasWeight && (
        <button
          type="button"
          onClick={() => setWeightModalOpen(true)}
          className="flex items-center justify-between gap-3 rounded-xl border border-accent/30 bg-accent/10 p-4 text-left"
        >
          <span className="text-sm text-foreground">Ты ещё не ввёл вес сегодня</span>
          <span className="rounded-lg bg-accent px-3 py-1.5 text-sm font-medium text-background">
            Ввести
          </span>
        </button>
      )}

      {mealsError ? (
        <ErrorState message={mealsError} onRetry={mealsRetry} />
      ) : (
        <>
          {mealsLoading ? (
            <div className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-4">
              <div className="flex items-center justify-around gap-2">
                <Skeleton className="h-[104px] w-[104px] rounded-full" />
                <Skeleton className="h-[68px] w-[68px] rounded-full" />
                <Skeleton className="h-[68px] w-[68px] rounded-full" />
                <Skeleton className="h-[68px] w-[68px] rounded-full" />
              </div>
              <Skeleton className="mx-auto h-4 w-2/3" />
            </div>
          ) : (
            <div className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-4">
              <div className="flex items-center justify-around gap-2">
                <NutrientRing value={totals.calories} target={target.calories} size={104} strokeWidth={10} label="Калории" big />
                <NutrientRing value={totals.protein} target={target.protein} size={68} strokeWidth={7} label="Белки" />
                <NutrientRing value={totals.fat} target={target.fat} size={68} strokeWidth={7} label="Жиры" />
                <NutrientRing value={totals.carbs} target={target.carbs} size={68} strokeWidth={7} label="Углеводы" />
              </div>

              <RemainingRow totals={totals} target={target} />
            </div>
          )}

          <div className="flex flex-col gap-3">
            {mealsLoading
              ? MEAL_TYPES.map((type) => <Skeleton key={type} className="h-[60px] w-full" />)
              : MEAL_TYPES.map((type) => (
                  <MealSection
                    key={type}
                    type={type}
                    group={meals[type]}
                    isOpen={openSections.has(type)}
                    onToggle={handleToggleSection}
                    onAdd={handleAddMeal}
                    onDeleteItem={handleDeleteMealItem}
                  />
                ))}
          </div>
        </>
      )}

      <div className="flex items-start gap-3 rounded-2xl border border-border bg-surface p-4">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent/15 text-accent">
          <Lightbulb size={18} />
        </div>
        <p className="text-sm text-foreground/80">{advice}</p>
      </div>

      {todaysWorkout && <TodaysWorkoutCard workout={todaysWorkout} />}

      {weightModalOpen && (
        <WeightModal
          onClose={() => setWeightModalOpen(false)}
          onSave={async (kg) => {
            await saveWeight(kg)
            showToast('Сохранено ✓')
            setWeightModalOpen(false)
          }}
        />
      )}
    </div>
  )
}

interface NutrientRingProps {
  value: number
  target: number
  size: number
  strokeWidth: number
  label: string
  big?: boolean
}

function NutrientRing({ value, target, size, strokeWidth, label, big }: NutrientRingProps) {
  const pct = target > 0 ? (value / target) * 100 : 0
  const color = getProgressColor(pct)
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const clampedPct = Math.min(100, Math.max(0, pct))
  const offset = circumference * (1 - clampedPct / 100)

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="rgba(255,255,255,0.08)"
            strokeWidth={strokeWidth}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 0.3s ease' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center leading-none">
          <span className="font-semibold text-foreground" style={{ fontSize: big ? 20 : 13 }}>
            {Math.round(value)}
          </span>
          <span className="text-foreground/45" style={{ fontSize: big ? 11 : 9 }}>
            /{Math.round(target)}
          </span>
        </div>
      </div>
      <span className="text-xs text-foreground/60">{label}</span>
    </div>
  )
}

function RemainingRow({ totals, target }: { totals: NutrientTotals; target: NutrientTotals }) {
  const items = [
    { key: 'calories', unit: 'ккал', shortLabel: '', fullLabel: 'Калории', remaining: target.calories - totals.calories },
    { key: 'protein', unit: 'г', shortLabel: 'Б', fullLabel: 'Белки', remaining: target.protein - totals.protein },
    { key: 'fat', unit: 'г', shortLabel: 'Ж', fullLabel: 'Жиры', remaining: target.fat - totals.fat },
    { key: 'carbs', unit: 'г', shortLabel: 'У', fullLabel: 'Углеводы', remaining: target.carbs - totals.carbs },
  ]

  return (
    <div className="flex flex-col items-center gap-1 pt-1">
      <span className="text-[11px] uppercase tracking-wide text-foreground/40">Осталось</span>
      <p className="text-center text-sm text-foreground/80">
        {items.map((item, i) => {
          const over = item.remaining < 0
          const text = over
            ? `${item.fullLabel}: +${Math.round(Math.abs(item.remaining))}${item.unit}`
            : item.key === 'calories'
              ? `${Math.round(item.remaining)} ${item.unit}`
              : `${Math.round(item.remaining)}${item.unit} ${item.shortLabel}`

          return (
            <span key={item.key} className={over ? 'text-red-400' : undefined}>
              {i > 0 && ' · '}
              {text}
            </span>
          )
        })}
      </p>
    </div>
  )
}

function TodaysWorkoutCard({ workout }: { workout: Workout }) {
  const groups = workout.muscle_groups.map((g) => MUSCLE_GROUP_LABELS[g as MuscleGroup] ?? g).join(', ')

  return (
    <div className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-4">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent/15 text-accent">
        <Dumbbell size={18} />
      </div>
      <p className="text-sm text-foreground/80">
        Сегодня: <span className="font-medium text-foreground">{WORKOUT_TYPE_LABEL[workout.workout_type]}</span>
        {groups && ` — ${groups}`} — {workout.duration_minutes} мин
      </p>
    </div>
  )
}

interface MealSectionProps {
  type: MealType
  group: MealGroup
  isOpen: boolean
  onToggle: (type: MealType) => void
  onAdd: (type: MealType) => void
  onDeleteItem: (itemId: string, type: MealType) => void
}

const MealSection = memo(function MealSection({ type, group, isOpen, onToggle, onAdd, onDeleteItem }: MealSectionProps) {
  const Icon = MEAL_TYPE_ICONS[type]

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-surface">
      <button
        type="button"
        onClick={() => onToggle(type)}
        className="flex min-h-[44px] w-full items-center justify-between gap-3 p-4 text-left"
      >
        <div className="flex items-center gap-2">
          <Icon size={18} className="text-foreground/60" />
          <span className="font-medium text-foreground">{MEAL_TYPE_LABELS[type]}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-foreground/60">{group.totalCalories} ккал</span>
          <ChevronDown
            size={18}
            className={`text-foreground/40 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          />
        </div>
      </button>

      {isOpen && (
        <div className="flex flex-col gap-2 border-t border-border p-4 pt-3">
          {group.items.length === 0 ? (
            <p className="py-2 text-center text-sm text-foreground/50">
              Нажми +, чтобы добавить {MEAL_TYPE_LABELS[type].toLowerCase()}
            </p>
          ) : (
            group.items.map((item) => (
              <SwipeActions
                key={item.id}
                actions={[
                  { label: 'Удалить', icon: Trash2, colorClass: 'bg-red-500 text-white', onClick: () => onDeleteItem(item.id, type) },
                ]}
              >
                <MealItemRow item={item} />
              </SwipeActions>
            ))
          )}

          <button
            type="button"
            onClick={() => onAdd(type)}
            className="mt-1 flex min-h-[44px] items-center justify-center gap-1 rounded-xl border border-dashed border-border text-sm font-medium text-accent"
          >
            <Plus size={16} /> Добавить
          </button>
        </div>
      )}
    </div>
  )
})

function formatPieces(value: number): string {
  return String(Number(value.toFixed(2)))
}

const MealItemRow = memo(function MealItemRow({ item }: { item: MealItemDisplay }) {
  const nameLine =
    item.weight_g !== null && item.pieceWeightG
      ? `${item.displayName} — ${formatPieces(item.weight_g / item.pieceWeightG)} ${item.servingName ?? 'шт'} (${item.weight_g}г) — ${item.calories} ккал`
      : item.weight_g !== null
        ? `${item.displayName} — ${item.weight_g}г — ${item.calories} ккал`
        : `${item.displayName} — ${item.calories} ккал`

  return (
    <div className="flex flex-col gap-0.5 bg-surface px-1 py-2">
      <span className="flex items-center gap-1.5 text-sm text-foreground">
        {item.kind === 'recipe' && <ChefHat size={14} className="shrink-0 text-foreground/50" />}
        {nameLine}
      </span>
      <span className="text-xs text-foreground/50">
        Б: {item.protein}г · Ж: {item.fat}г · У: {item.carbs}г
      </span>
    </div>
  )
})

function WeightModal({
  onClose,
  onSave,
}: {
  onClose: () => void
  onSave: (kg: number) => Promise<void>
}) {
  const [value, setValue] = useState('')
  const [touched, setTouched] = useState(false)
  const [saving, setSaving] = useState(false)

  const valid = isValidNumberInput(value, { min: 30, max: 300, oneDecimal: true })
  const showError = touched && value.trim() !== '' && !valid

  async function handleSave() {
    if (!valid) return
    setSaving(true)
    try {
      await onSave(parseNumberInput(value))
    } catch {
      // ошибка уже показана тостом
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 px-3 pb-6 sm:items-center"
      onClick={onClose}
    >
      <div
        className="w-full max-w-app rounded-2xl border border-border bg-surface p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="pb-3 text-lg font-semibold text-foreground">Твой вес сегодня</p>
        <div className="relative">
          <input
            autoFocus
            type="text"
            inputMode="decimal"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onBlur={() => setTouched(true)}
            placeholder="70"
            className={`min-h-[44px] w-full rounded-xl border bg-background px-4 pr-12 text-foreground outline-none focus:border-accent ${
              showError ? 'border-red-400' : 'border-border'
            }`}
          />
          <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm text-foreground/50">
            кг
          </span>
        </div>
        {showError && (
          <p className="pt-1 text-sm text-red-400">Вес от 30 до 300 кг, максимум 1 знак после запятой</p>
        )}
        <div className="flex gap-3 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] flex-1 rounded-xl border border-border font-medium text-foreground"
          >
            Отмена
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!valid || saving}
            className="min-h-[44px] flex-1 rounded-xl bg-accent font-medium text-background disabled:opacity-40"
          >
            {saving ? 'Сохраняем…' : 'Сохранить'}
          </button>
        </div>
      </div>
    </div>
  )
}

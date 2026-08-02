import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Activity,
  AlertTriangle,
  CheckCircle,
  ChevronLeft,
  Dumbbell,
  Info,
  Plus,
  Trash2,
  type LucideIcon,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { useHideBottomNav } from '../context/LayoutChromeContext'
import { useWorkouts, type MuscleGroupStat, type WeekSummary, type WorkoutInput } from '../hooks/useWorkouts'
import { useWorkoutAdvice, type WorkoutAdvice, type WorkoutAdviceIcon } from '../hooks/useWorkoutAdvice'
import { useDirtyForm } from '../hooks/useDirtyForm'
import { SwipeActions } from '../components/SwipeActions'
import { UnsavedChangesModal } from '../components/UnsavedChangesModal'
import { MUSCLE_GROUPS, MUSCLE_GROUP_LABELS, type MuscleGroup } from '../lib/muscleGroups'
import { isValidNumberInput } from '../lib/validation'
import { WorkoutsPageSkeleton } from '../components/PageSkeletons'
import { ErrorState } from '../components/ErrorState'
import type { Intensity, Workout, WorkoutType } from '../types/database'

const WEEKDAY_SHORT = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб']
const DURATION_QUICK = [30, 45, 60, 75, 90]

const TYPE_OPTIONS: { value: WorkoutType; label: string }[] = [
  { value: 'strength', label: 'Силовая' },
  { value: 'cardio', label: 'Кардио' },
  { value: 'mixed', label: 'Смешанная' },
]

const INTENSITY_OPTIONS: { value: Intensity; label: string; description: string; colorClass: string }[] = [
  { value: 'light', label: 'Лёгкая', description: 'Мог бы продолжать долго', colorClass: 'text-accent' },
  { value: 'moderate', label: 'Средняя', description: 'Устал, но мог бы ещё', colorClass: 'text-amber-400' },
  { value: 'hard', label: 'Высокая', description: 'На пределе, еле закончил', colorClass: 'text-red-400' },
]

const TYPE_BADGE: Record<WorkoutType, { label: string; bg: string; text: string }> = {
  strength: { label: 'Силовая', bg: 'bg-accent/15', text: 'text-accent' },
  cardio: { label: 'Кардио', bg: 'bg-sky-500/15', text: 'text-sky-400' },
  mixed: { label: 'Смешанная', bg: 'bg-purple-500/15', text: 'text-purple-400' },
}

const INTENSITY_LABEL: Record<Intensity, { label: string; colorClass: string }> = {
  light: { label: 'Лёгкая', colorClass: 'text-accent' },
  moderate: { label: 'Средняя', colorClass: 'text-amber-400' },
  hard: { label: 'Высокая', colorClass: 'text-red-400' },
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

function parseDecimal(value: string): number {
  return parseFloat(value.replace(',', '.'))
}

function formatFullDate(dateIso: string): string {
  const date = new Date(dateIso)
  const dayMonth = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long' }).format(date)
  const weekday = new Intl.DateTimeFormat('ru-RU', { weekday: 'long' }).format(date)
  return `${dayMonth}, ${weekday}`
}

function pluralize(n: number, one: string, few: string, many: string): string {
  const mod10 = n % 10
  const mod100 = n % 100
  if (mod10 === 1 && mod100 !== 11) return `${n} ${one}`
  if ([2, 3, 4].includes(mod10) && ![12, 13, 14].includes(mod100)) return `${n} ${few}`
  return `${n} ${many}`
}

function formatDaysAgo(daysSince: number): string {
  if (daysSince === 0) return 'сегодня'
  return `${pluralize(daysSince, 'день', 'дня', 'дней')} назад`
}

function getProgressBarColor(pct: number): string {
  if (pct > 100) return '#3B82F6'
  if (pct >= 80) return '#22C55E'
  if (pct >= 50) return '#EAB308'
  return '#EF4444'
}

function getMuscleChipColor(count14d: number): string {
  if (count14d === 0) return '#374151'
  if (count14d === 1) return '#166534'
  if (count14d <= 3) return '#22C55E'
  return '#4ADE80'
}

function getCalendarCircleClasses(type: WorkoutType | null): string {
  if (type === 'strength') return 'bg-accent'
  if (type === 'cardio') return 'bg-sky-500'
  if (type === 'mixed') return 'bg-purple-500'
  return 'bg-overlay/10'
}

export function WorkoutsPage() {
  const { profile } = useAuth()
  const { showToast } = useToast()
  const { workouts, stats, loading, error, saveWorkout, deleteWorkout, retry } = useWorkouts()
  const advice = useWorkoutAdvice(
    profile?.goal ?? null,
    workouts,
    profile?.recommended_strength ?? 0,
    profile?.recommended_cardio ?? 0,
  )

  const [view, setView] = useState<'main' | 'form'>('main')
  const [editingWorkout, setEditingWorkout] = useState<Workout | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Workout | null>(null)
  const [historyLimit, setHistoryLimit] = useState(20)
  useHideBottomNav(view === 'form')

  const handleEditWorkout = useCallback((workout: Workout) => {
    setEditingWorkout(workout)
    setView('form')
  }, [])

  const handleDeleteWorkout = useCallback((workout: Workout) => {
    setDeleteTarget(workout)
  }, [])

  if (!profile || loading) {
    return <WorkoutsPageSkeleton />
  }

  if (error) {
    return (
      <div className="px-4 pt-6">
        <ErrorState message={error} onRetry={retry} />
      </div>
    )
  }

  function openCreate() {
    setEditingWorkout(null)
    setView('form')
  }

  if (view === 'form') {
    return (
      <WorkoutForm
        editing={editingWorkout}
        onCancel={() => setView('main')}
        onSave={async (input, id) => {
          await saveWorkout(input, id)
          showToast('Сохранено ✓')
          setView('main')
        }}
      />
    )
  }

  return (
    <div className="flex flex-col gap-6 px-4 pt-6 pb-4">
      <WeekSummaryCard week={stats.week} />

      <button
        type="button"
        onClick={openCreate}
        className="flex min-h-[52px] items-center justify-center gap-2 rounded-xl bg-accent font-medium text-background transition hover:bg-accent-hover"
      >
        <Plus size={20} /> Добавить тренировку
      </button>

      <MuscleHeatmap stats={stats.muscleGroups} />

      {advice && <WorkoutAdviceCard advice={advice} />}

      <CalendarSection workouts={workouts} />

      <div className="flex flex-col gap-2">
        <h2 className="text-sm font-medium text-foreground/70">История</h2>
        {workouts.length === 0 ? (
          <p className="py-6 text-center text-sm text-foreground/50">
            Пока нет тренировок. Нажми +, чтобы записать первую
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {workouts.slice(0, historyLimit).map((w) => (
              <WorkoutHistoryCard
                key={w.id}
                workout={w}
                onTap={handleEditWorkout}
                onDelete={handleDeleteWorkout}
              />
            ))}
            {workouts.length > historyLimit && (
              <button
                type="button"
                onClick={() => setHistoryLimit((n) => n + 20)}
                className="min-h-[44px] rounded-xl border border-dashed border-border text-sm font-medium text-accent"
              >
                Показать ещё
              </button>
            )}
          </div>
        )}
      </div>

      {deleteTarget && (
        <ConfirmModal
          title="Удалить тренировку?"
          message={`Удалить тренировку от ${formatFullDate(deleteTarget.date)}?`}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={async () => {
            await deleteWorkout(deleteTarget.id)
            setDeleteTarget(null)
          }}
        />
      )}
    </div>
  )
}

function WeekSummaryCard({ week }: { week: WeekSummary }) {
  const barColor = getProgressBarColor(week.progressPct)

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-5">
      <div className="flex items-center justify-between">
        <span className="text-sm text-foreground/70">Тренировок</span>
        <span className="font-semibold text-foreground">
          {week.totalCount} / {week.recommendedTotal}
        </span>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-sm text-foreground/70">Силовых</span>
        <span className="font-semibold text-foreground">
          {week.strengthCount} / {week.recommendedStrength}
        </span>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-sm text-foreground/70">Кардио</span>
        <span className="font-semibold text-foreground">
          {week.cardioCount} / {week.recommendedCardio}
        </span>
      </div>

      <div className="flex items-center justify-between text-xs text-foreground/50">
        <span>Заполненность недели</span>
        <span>{Math.round(week.progressPct)}%</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-overlay/10">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${Math.min(100, week.progressPct)}%`, backgroundColor: barColor }}
        />
      </div>
    </div>
  )
}

function MuscleHeatmap({ stats }: { stats: MuscleGroupStat[] }) {
  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-sm font-medium text-foreground/70">Мышечные группы за 14 дней</h2>
      <div className="grid grid-cols-2 gap-2">
        {stats.map((stat) => (
          <MuscleChip key={stat.group} stat={stat} />
        ))}
      </div>
    </div>
  )
}

function MuscleChip({ stat }: { stat: MuscleGroupStat }) {
  const bg = getMuscleChipColor(stat.count14d)
  const textColor = stat.count14d >= 4 ? '#0F172A' : '#F8FAFC'
  const caption =
    stat.count14d === 0
      ? stat.daysSince !== null
        ? `не тренировал ${pluralize(stat.daysSince, 'день', 'дня', 'дней')}`
        : 'ещё не тренировал'
      : stat.daysSince !== null
        ? formatDaysAgo(stat.daysSince)
        : ''

  return (
    <div className="flex flex-col gap-1.5 rounded-xl p-3" style={{ backgroundColor: bg }}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium" style={{ color: textColor }}>
          {MUSCLE_GROUP_LABELS[stat.group]}
        </span>
        {stat.count14d === 0 && <span className="h-2 w-2 shrink-0 rounded-full bg-red-500" />}
      </div>
      <span className="text-xs" style={{ color: textColor, opacity: 0.75 }}>
        {caption}
      </span>
    </div>
  )
}

const WORKOUT_ADVICE_STYLES: Record<
  WorkoutAdviceIcon,
  { icon: LucideIcon; border: string; bg: string; iconColor: string }
> = {
  good: { icon: CheckCircle, border: 'border-accent/30', bg: 'bg-accent/10', iconColor: 'text-accent' },
  warning: {
    icon: AlertTriangle,
    border: 'border-amber-400/30',
    bg: 'bg-amber-400/10',
    iconColor: 'text-amber-400',
  },
  info: { icon: Info, border: 'border-border', bg: 'bg-overlay/5', iconColor: 'text-foreground/60' },
}

function WorkoutAdviceCard({ advice }: { advice: WorkoutAdvice }) {
  const style = WORKOUT_ADVICE_STYLES[advice.icon]
  const Icon = style.icon
  return (
    <div className={`flex flex-col gap-2 rounded-2xl border p-4 ${style.border} ${style.bg}`}>
      <div className="flex items-center gap-2">
        <Icon size={18} className={style.iconColor} />
        <span className={`text-sm font-medium ${style.iconColor}`}>Рекомендации</span>
      </div>
      <ul className="flex flex-col gap-1.5">
        {advice.items.map((item) => (
          <li key={item} className="flex gap-2 text-sm text-foreground/80">
            <span className="text-foreground/40">•</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function CalendarSection({ workouts }: { workouts: Workout[] }) {
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  const days = useMemo(() => {
    const result: string[] = []
    for (let i = 13; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      result.push(d.toISOString().slice(0, 10))
    }
    return result
  }, [])

  const workoutsByDate = useMemo(() => {
    const map = new Map<string, Workout>()
    for (const w of workouts) {
      if (!map.has(w.date)) map.set(w.date, w)
    }
    return map
  }, [workouts])

  useEffect(() => {
    scrollRef.current?.scrollTo({ left: scrollRef.current.scrollWidth })
  }, [])

  const selectedWorkout = selectedDate ? (workoutsByDate.get(selectedDate) ?? null) : null

  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-sm font-medium text-foreground/70">Календарь</h2>
      <div
        ref={scrollRef}
        className="flex gap-3 overflow-x-auto pb-2 [scroll-snap-type:x_mandatory]"
      >
        {days.map((date) => {
          const workout = workoutsByDate.get(date) ?? null
          const isToday = date === todayIso()
          return (
            <button
              key={date}
              type="button"
              onClick={() => workout && setSelectedDate((prev) => (prev === date ? null : date))}
              className="flex shrink-0 flex-col items-center gap-1 [scroll-snap-align:center]"
            >
              <div
                className={`flex h-11 w-11 items-center justify-center rounded-full border-2 ${
                  isToday ? 'border-foreground/40' : 'border-transparent'
                } ${getCalendarCircleClasses(workout?.workout_type ?? null)}`}
              >
                {workout?.workout_type === 'strength' && <Dumbbell size={18} className="text-white" />}
                {workout?.workout_type === 'cardio' && <Activity size={18} className="text-white" />}
              </div>
              <span className="text-[10px] text-foreground/50">{WEEKDAY_SHORT[new Date(date).getDay()]}</span>
            </button>
          )
        })}
      </div>

      {selectedWorkout && (
        <div className="flex flex-col gap-2 rounded-2xl border border-border bg-surface p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-foreground">{formatFullDate(selectedWorkout.date)}</span>
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-medium ${TYPE_BADGE[selectedWorkout.workout_type].bg} ${TYPE_BADGE[selectedWorkout.workout_type].text}`}
            >
              {TYPE_BADGE[selectedWorkout.workout_type].label}
            </span>
          </div>
          {selectedWorkout.muscle_groups.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {selectedWorkout.muscle_groups.map((g) => (
                <span key={g} className="rounded-full bg-overlay/5 px-2 py-0.5 text-xs text-foreground/60">
                  {MUSCLE_GROUP_LABELS[g as MuscleGroup] ?? g}
                </span>
              ))}
            </div>
          )}
          <div className="flex items-center gap-3 text-xs text-foreground/60">
            <span>{selectedWorkout.duration_minutes} мин</span>
            <span className={INTENSITY_LABEL[selectedWorkout.intensity].colorClass}>
              {INTENSITY_LABEL[selectedWorkout.intensity].label}
            </span>
          </div>
          {selectedWorkout.notes && <p className="text-xs text-foreground/50">{selectedWorkout.notes}</p>}
        </div>
      )}
    </div>
  )
}

const WorkoutHistoryCard = memo(function WorkoutHistoryCard({
  workout,
  onTap,
  onDelete,
}: {
  workout: Workout
  onTap: (workout: Workout) => void
  onDelete: (workout: Workout) => void
}) {
  const badge = TYPE_BADGE[workout.workout_type]
  const intensity = INTENSITY_LABEL[workout.intensity]

  return (
    <SwipeActions
      actions={[
        { label: 'Удалить', icon: Trash2, colorClass: 'bg-red-500 text-white', onClick: () => onDelete(workout) },
      ]}
    >
      <button
        type="button"
        onClick={() => onTap(workout)}
        className="flex w-full flex-col gap-2 bg-surface p-4 text-left"
      >
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-medium text-foreground">{formatFullDate(workout.date)}</span>
          <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${badge.bg} ${badge.text}`}>
            {badge.label}
          </span>
        </div>

        {workout.muscle_groups.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {workout.muscle_groups.map((g) => (
              <span key={g} className="rounded-full bg-overlay/5 px-2 py-0.5 text-xs text-foreground/60">
                {MUSCLE_GROUP_LABELS[g as MuscleGroup] ?? g}
              </span>
            ))}
          </div>
        )}

        <div className="flex items-center gap-3 text-xs text-foreground/60">
          <span>{workout.duration_minutes} мин</span>
          <span className={intensity.colorClass}>{intensity.label}</span>
        </div>

        {workout.notes && <p className="text-xs text-foreground/50">{workout.notes}</p>}
      </button>
    </SwipeActions>
  )
})

function ConfirmModal({
  title,
  message,
  onCancel,
  onConfirm,
}: {
  title: string
  message: string
  onCancel: () => void
  onConfirm: () => void
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 px-3 pb-6 sm:items-center"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-app rounded-2xl border border-border bg-surface p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="pb-2 text-lg font-semibold text-foreground">{title}</p>
        <p className="pb-4 text-sm text-foreground/70">{message}</p>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="min-h-[44px] flex-1 rounded-xl border border-border font-medium text-foreground"
          >
            Отмена
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="min-h-[44px] flex-1 rounded-xl bg-red-500 font-medium text-white"
          >
            Удалить
          </button>
        </div>
      </div>
    </div>
  )
}

interface WorkoutFormProps {
  editing: Workout | null
  onCancel: () => void
  onSave: (input: WorkoutInput, id?: string) => Promise<void>
}

function WorkoutForm({ editing, onCancel, onSave }: WorkoutFormProps) {
  const [date, setDate] = useState(editing?.date ?? todayIso())
  const [type, setType] = useState<WorkoutType>(editing?.workout_type ?? 'strength')
  const [groups, setGroups] = useState<Set<MuscleGroup>>(
    () => new Set((editing?.muscle_groups as MuscleGroup[] | undefined) ?? []),
  )
  const [durationInput, setDurationInput] = useState(String(editing?.duration_minutes ?? 60))
  const [intensity, setIntensity] = useState<Intensity>(editing?.intensity ?? 'moderate')
  const [notes, setNotes] = useState(editing?.notes ?? '')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const workoutForm = useDirtyForm()

  const showGroups = type !== 'cardio'
  const duration = parseDecimal(durationInput)
  const durationValid = isValidNumberInput(durationInput, { min: 1, max: 300 })
  const groupsValid = !showGroups || groups.size > 0
  const canSave = date !== '' && durationValid && groupsValid

  function toggleGroup(group: MuscleGroup) {
    setGroups((prev) => {
      const next = new Set(prev)
      if (next.has(group)) {
        next.delete(group)
      } else {
        next.add(group)
      }
      return next
    })
    workoutForm.markDirty()
  }

  async function handleSave() {
    if (!canSave) return
    setSubmitting(true)
    setError(null)

    try {
      await onSave(
        {
          date,
          workout_type: type,
          muscle_groups: showGroups ? Array.from(groups) : [],
          duration_minutes: Math.round(duration),
          intensity,
          notes: notes.trim() || null,
        },
        editing?.id,
      )
      workoutForm.markClean()
    } catch {
      setError('Не удалось сохранить тренировку. Попробуйте ещё раз.')
      setSubmitting(false)
    }
  }

  return (
    <div className="flex flex-col gap-5 px-4 pt-6 pb-8">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => workoutForm.handleBack(onCancel)}
          className="flex h-10 w-10 items-center justify-center rounded-full text-foreground/60 transition hover:bg-overlay/5"
        >
          <ChevronLeft size={22} />
        </button>
        <p className="text-sm font-medium text-foreground">
          {editing ? 'Редактировать тренировку' : 'Новая тренировка'}
        </p>
        <div className="h-10 w-10" />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-sm text-foreground/70">Дата</label>
        <input
          type="date"
          value={date}
          max={todayIso()}
          onChange={(e) => {
            setDate(e.target.value)
            workoutForm.markDirty()
          }}
          className="min-h-[44px] w-full rounded-xl border border-border bg-surface px-4 text-foreground outline-none focus:border-accent"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-sm text-foreground/70">Тип тренировки</label>
        <div className="grid grid-cols-3 gap-2">
          {TYPE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => {
                setType(opt.value)
                workoutForm.markDirty()
              }}
              className={`min-h-[44px] rounded-xl border text-sm font-medium transition ${
                type === opt.value
                  ? 'border-accent bg-accent/15 text-accent'
                  : 'border-border bg-surface text-foreground'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {showGroups && (
        <div className="flex flex-col gap-1.5">
          <label className="text-sm text-foreground/70">Группы мышц</label>
          <div className="grid grid-cols-4 gap-2">
            {MUSCLE_GROUPS.slice(0, 4).map((group) => (
              <MuscleGroupChip key={group} group={group} selected={groups.has(group)} onToggle={() => toggleGroup(group)} />
            ))}
          </div>
          <div className="grid grid-cols-3 gap-2">
            {MUSCLE_GROUPS.slice(4).map((group) => (
              <MuscleGroupChip key={group} group={group} selected={groups.has(group)} onToggle={() => toggleGroup(group)} />
            ))}
          </div>
          {!groupsValid && <p className="text-xs text-red-400">Выбери минимум одну группу</p>}
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <label className="text-sm text-foreground/70">Длительность</label>
        <div className="grid grid-cols-5 gap-2">
          {DURATION_QUICK.map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => {
                setDurationInput(String(d))
                workoutForm.markDirty()
              }}
              className={`min-h-[44px] rounded-xl border text-sm font-medium transition ${
                durationInput === String(d)
                  ? 'border-accent bg-accent/15 text-accent'
                  : 'border-border bg-surface text-foreground'
              }`}
            >
              {d}
            </button>
          ))}
        </div>
        <div className="relative">
          <input
            type="text"
            inputMode="decimal"
            value={durationInput}
            onChange={(e) => {
              setDurationInput(e.target.value)
              workoutForm.markDirty()
            }}
            className={`min-h-[44px] w-full rounded-xl border bg-surface px-4 pr-14 text-foreground outline-none focus:border-accent ${
              durationInput.trim() !== '' && !durationValid ? 'border-red-400' : 'border-border'
            }`}
          />
          <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm text-foreground/50">
            мин
          </span>
        </div>
        {durationInput.trim() !== '' && !durationValid && (
          <p className="text-xs text-red-400">Длительность от 1 до 300 минут</p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-sm text-foreground/70">Интенсивность</label>
        <div className="flex flex-col gap-2">
          {INTENSITY_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => {
                setIntensity(opt.value)
                workoutForm.markDirty()
              }}
              className={`flex items-center justify-between gap-3 rounded-xl border p-3 text-left transition ${
                intensity === opt.value ? 'border-accent bg-accent/10' : 'border-border bg-surface'
              }`}
            >
              <div className="flex flex-col gap-0.5">
                <span className={`text-sm font-medium ${opt.colorClass}`}>{opt.label}</span>
                <span className="text-xs text-foreground/50">{opt.description}</span>
              </div>
              <RadioDot selected={intensity === opt.value} />
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-sm text-foreground/70">Заметки</label>
        <textarea
          value={notes}
          onChange={(e) => {
            setNotes(e.target.value)
            workoutForm.markDirty()
          }}
          placeholder="Как прошла тренировка?"
          rows={3}
          className="w-full resize-none rounded-xl border border-border bg-surface px-4 py-3 text-foreground outline-none focus:border-accent"
        />
      </div>

      {error && <p className="text-center text-sm text-red-400">{error}</p>}

      <button
        type="button"
        onClick={handleSave}
        disabled={!canSave || submitting}
        className="min-h-[52px] rounded-xl bg-accent font-medium text-background transition hover:bg-accent-hover disabled:opacity-40"
      >
        {submitting ? 'Сохраняем…' : 'Сохранить'}
      </button>

      {workoutForm.showConfirm && (
        <UnsavedChangesModal onStay={workoutForm.cancelLeave} onLeave={workoutForm.confirmLeave} />
      )}
    </div>
  )
}

function MuscleGroupChip({ group, selected, onToggle }: { group: MuscleGroup; selected: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`min-h-[44px] rounded-xl border text-xs font-medium transition ${
        selected ? 'border-accent bg-accent/15 text-accent' : 'border-border bg-surface text-foreground/70'
      }`}
    >
      {MUSCLE_GROUP_LABELS[group]}
    </button>
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

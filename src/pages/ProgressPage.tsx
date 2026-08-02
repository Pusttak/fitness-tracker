import { useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { useAuth } from '../context/AuthContext'
import {
  useProgressData,
  type AdaptiveTDEE,
  type DailyNutrition,
  type ProgressPeriod,
  type WorkoutDistribution,
} from '../hooks/useProgressData'
import { useSettings } from '../hooks/useSettings'
import { calcTargets } from '../lib/calculations'
import { MUSCLE_GROUPS, MUSCLE_GROUP_LABELS, type MuscleGroup } from '../lib/muscleGroups'
import { ProgressPageSkeleton } from '../components/PageSkeletons'
import { ErrorState } from '../components/ErrorState'
import type { Goal, Measurement } from '../types/database'

const PERIOD_OPTIONS: { value: ProgressPeriod; label: string }[] = [
  { value: '1w', label: '1 нед' },
  { value: '2w', label: '2 нед' },
  { value: '1m', label: '1 мес' },
  { value: '3m', label: '3 мес' },
]

function formatShortDate(dateIso: string): string {
  const date = new Date(dateIso)
  return `${String(date.getDate()).padStart(2, '0')}.${String(date.getMonth() + 1).padStart(2, '0')}`
}

function formatDayMonth(dateIso: string): string {
  return new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long' }).format(new Date(dateIso))
}

function formatWeekRange(start: string, end: string): string {
  const startDate = new Date(start)
  const endDate = new Date(end)
  const endFormatted = formatDayMonth(end)
  if (startDate.getMonth() === endDate.getMonth()) {
    return `${startDate.getDate()}-${endFormatted}`
  }
  return `${formatDayMonth(start)} - ${endFormatted}`
}

function pluralize(n: number, one: string, few: string, many: string): string {
  const mod10 = n % 10
  const mod100 = n % 100
  if (mod10 === 1 && mod100 !== 11) return `${n} ${one}`
  if ([2, 3, 4].includes(mod10) && ![12, 13, 14].includes(mod100)) return `${n} ${few}`
  return `${n} ${many}`
}

function getCalorieBarColor(calories: number, target: number): string {
  if (target <= 0) return '#94A3B8'
  const deviationPct = (Math.abs(calories - target) / target) * 100
  if (deviationPct <= 10) return '#22C55E'
  if (deviationPct <= 20) return '#EAB308'
  return '#EF4444'
}

export function ProgressPage() {
  const { profile } = useAuth()
  const { updateTargets } = useSettings()
  const [period, setPeriod] = useState<ProgressPeriod>('1m')
  const [recalcConfirmOpen, setRecalcConfirmOpen] = useState(false)
  const [recalculating, setRecalculating] = useState(false)

  const { nutritionData, workoutDistribution, measurementData, adaptiveTDEE, weeklyReport, loading, error, retry } =
    useProgressData(period)

  if (!profile || loading) {
    return <ProgressPageSkeleton />
  }

  if (error) {
    return (
      <div className="px-4 pt-6">
        <ErrorState message={error} onRetry={retry} />
      </div>
    )
  }

  const hasAnyData =
    nutritionData.length > 0 ||
    measurementData.length > 0 ||
    workoutDistribution.strength + workoutDistribution.cardio + workoutDistribution.mixed > 0 ||
    weeklyReport.lines.length > 0

  if (!hasAnyData) {
    return (
      <div className="flex flex-col gap-6 px-4 pt-6 pb-4">
        <div className="flex gap-1 rounded-xl bg-surface p-1">
          {PERIOD_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setPeriod(opt.value)}
              className={`flex-1 rounded-lg py-2 text-sm font-medium transition ${
                period === opt.value ? 'bg-accent text-background' : 'text-foreground/60'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-border bg-surface p-8 text-center">
          <p className="text-sm text-foreground/60">
            Недостаточно данных для аналитики. Веди дневник минимум неделю.
          </p>
        </div>
      </div>
    )
  }

  async function handleRecalculateTargets() {
    if (adaptiveTDEE.realTDEE === null || adaptiveTDEE.currentWeightKg === null || !profile) return
    setRecalculating(true)
    const targets = calcTargets(adaptiveTDEE.realTDEE, profile.goal, adaptiveTDEE.currentWeightKg)
    await updateTargets({
      target_calories: Math.round(targets.calories),
      target_protein: Math.round(targets.protein),
      target_fat: Math.round(targets.fat),
      target_carbs: Math.round(targets.carbs),
    })
    setRecalculating(false)
    setRecalcConfirmOpen(false)
  }

  return (
    <div className="flex flex-col gap-6 px-4 pt-6 pb-4">
      <div className="flex gap-1 rounded-xl bg-surface p-1">
        {PERIOD_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => setPeriod(opt.value)}
            className={`flex-1 rounded-lg py-2 text-sm font-medium transition ${
              period === opt.value ? 'bg-accent text-background' : 'text-foreground/60'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <WeeklyReportCard range={weeklyReport} />

      <div className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-foreground/70">КБЖУ за период</h2>
        <CaloriesBarChart data={nutritionData} targetCalories={profile.target_calories} />
        <MacroSummary
          data={nutritionData}
          targetProtein={profile.target_protein}
          targetFat={profile.target_fat}
          targetCarbs={profile.target_carbs}
        />
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-foreground/70">Замеры за период</h2>
        <MeasurementsSummary measurements={measurementData} goal={profile.goal} />
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-foreground/70">Тренировки за период</h2>
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-border bg-surface p-3">
            <p className="pb-1 text-center text-xs text-foreground/50">По типу</p>
            <WorkoutTypePie distribution={workoutDistribution} />
          </div>
          <div className="rounded-2xl border border-border bg-surface p-3">
            <p className="pb-2 text-center text-xs text-foreground/50">По группам</p>
            <MuscleGroupBars byMuscleGroup={workoutDistribution.byMuscleGroup} />
          </div>
        </div>
      </div>

      <AdaptiveTDEECard tdee={adaptiveTDEE} onRecalculate={() => setRecalcConfirmOpen(true)} />

      {recalcConfirmOpen && (
        <ConfirmModal
          title="Пересчитать цели?"
          message="Целевые калории и БЖУ будут пересчитаны на основе твоего реального TDEE за последние 3 недели."
          confirmLabel={recalculating ? 'Пересчитываем…' : 'Пересчитать'}
          disabled={recalculating}
          onCancel={() => setRecalcConfirmOpen(false)}
          onConfirm={handleRecalculateTargets}
        />
      )}
    </div>
  )
}

function WeeklyReportCard({ range }: { range: { start: string; end: string; lines: string[] } }) {
  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-border bg-surface p-5">
      <p className="text-base font-semibold text-foreground">
        Отчёт за неделю ({formatWeekRange(range.start, range.end)})
      </p>
      {range.lines.length === 0 ? (
        <p className="text-sm text-foreground/50">Нет данных за эту неделю.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {range.lines.map((line) => {
            const isWarning = line.startsWith('⚠')
            const isGood = line.startsWith('✅')
            return (
              <p
                key={line}
                className={`rounded-lg px-3 py-2 text-sm ${
                  isWarning
                    ? 'bg-amber-400/10 text-amber-400'
                    : isGood
                      ? 'bg-accent/10 text-accent'
                      : 'text-foreground/80'
                }`}
              >
                {line}
              </p>
            )
          })}
        </div>
      )}
    </div>
  )
}

function CaloriesBarChart({ data, targetCalories }: { data: DailyNutrition[]; targetCalories: number }) {
  if (data.length === 0) {
    return (
      <div className="flex h-[250px] flex-col items-center justify-center gap-2 rounded-2xl border border-border bg-surface p-6 text-center">
        <p className="text-sm text-foreground/60">Нет данных о питании за период</p>
      </div>
    )
  }

  return (
    <div className="h-[250px] w-full rounded-2xl border border-border bg-surface p-3">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 12, left: -12, bottom: 0 }}>
          <CartesianGrid stroke="#334155" strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="date"
            tickFormatter={formatShortDate}
            stroke="#94A3B8"
            tick={{ fontSize: 11, fill: '#94A3B8' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis stroke="#94A3B8" tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} width={36} />
          <Tooltip
            contentStyle={{ background: '#1E293B', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12 }}
            labelStyle={{ color: '#F8FAFC' }}
            itemStyle={{ color: '#F8FAFC' }}
            labelFormatter={(d) => formatDayMonth(d as string)}
            formatter={(v) => [`${v} ккал`, 'Калории']}
          />
          <ReferenceLine
            y={targetCalories}
            stroke="#94A3B8"
            strokeDasharray="4 4"
            label={{ value: `Цель: ${targetCalories}`, position: 'insideTopRight', fill: '#94A3B8', fontSize: 11 }}
          />
          <Bar dataKey="calories" radius={[4, 4, 0, 0]}>
            {data.map((d) => (
              <Cell key={d.date} fill={getCalorieBarColor(d.calories, targetCalories)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

function MacroSummary({
  data,
  targetProtein,
  targetFat,
  targetCarbs,
}: {
  data: DailyNutrition[]
  targetProtein: number
  targetFat: number
  targetCarbs: number
}) {
  const avg = (key: keyof DailyNutrition) =>
    data.length > 0 ? data.reduce((s, d) => s + (d[key] as number), 0) / data.length : 0

  return (
    <div className="grid grid-cols-3 gap-2">
      <MacroMiniBar label="Б" avg={avg('protein')} target={targetProtein} />
      <MacroMiniBar label="Ж" avg={avg('fat')} target={targetFat} />
      <MacroMiniBar label="У" avg={avg('carbs')} target={targetCarbs} />
    </div>
  )
}

function MacroMiniBar({ label, avg, target }: { label: string; avg: number; target: number }) {
  const pct = target > 0 ? Math.min(100, (avg / target) * 100) : 0
  return (
    <div className="flex flex-col gap-1.5 rounded-xl border border-border bg-surface p-3">
      <span className="text-xs text-foreground/60">
        {label}: {Math.round(avg)}/{Math.round(target)}г ({Math.round(pct)}%)
      </span>
      <div className="h-2 w-full overflow-hidden rounded-full bg-overlay/10">
        <div className="h-full rounded-full bg-accent" style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

const MEASUREMENT_ROWS: { label: string; key: keyof Measurement; unit: string; direction: 'up' | 'down' | null }[] = [
  { label: 'Талия', key: 'waist_cm', unit: 'см', direction: 'down' },
  { label: 'Бёдра', key: 'hips_cm', unit: 'см', direction: null },
  { label: 'Грудь', key: 'chest_cm', unit: 'см', direction: 'up' },
  { label: 'Бицепс Л', key: 'bicep_left_cm', unit: 'см', direction: 'up' },
  { label: 'Бицепс П', key: 'bicep_right_cm', unit: 'см', direction: 'up' },
  { label: 'Бедро Л', key: 'thigh_left_cm', unit: 'см', direction: null },
  { label: 'Бедро П', key: 'thigh_right_cm', unit: 'см', direction: null },
  { label: 'Шея', key: 'neck_cm', unit: 'см', direction: null },
  { label: '% жира', key: 'body_fat_pct', unit: '%', direction: 'down' },
]

function rowAppliesToGoal(direction: 'up' | 'down' | null, goal: Goal): boolean {
  if (direction === 'down') return goal === 'cut' || goal === 'recomp'
  if (direction === 'up') return goal === 'bulk' || goal === 'recomp'
  return false
}

function MeasurementsSummary({ measurements, goal }: { measurements: Measurement[]; goal: Goal }) {
  if (measurements.length < 2) {
    return (
      <p className="rounded-2xl border border-border bg-surface p-4 text-center text-sm text-foreground/50">
        Нет замеров за период. Делай замеры раз в неделю.
      </p>
    )
  }

  const first = measurements[0]
  const last = measurements[measurements.length - 1]

  return (
    <div className="overflow-x-auto rounded-2xl border border-border bg-surface">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="text-xs text-foreground/50">
            <th className="whitespace-nowrap px-3 py-2 text-left">Замер</th>
            <th className="whitespace-nowrap px-3 py-2 text-right">Было</th>
            <th className="whitespace-nowrap px-3 py-2 text-right">Стало</th>
            <th className="whitespace-nowrap px-3 py-2 text-right">Δ</th>
          </tr>
        </thead>
        <tbody>
          {MEASUREMENT_ROWS.map((row) => {
            const before = first[row.key]
            const after = last[row.key]
            if (typeof before !== 'number' || typeof after !== 'number') return null

            const delta = after - before
            const goalAware = rowAppliesToGoal(row.direction, goal)
            const tone = !goalAware || delta === 0 ? null : (delta < 0) === (row.direction === 'down') ? 'good' : 'bad'
            const toneClass = tone === 'good' ? 'text-accent' : tone === 'bad' ? 'text-red-400' : 'text-foreground'

            return (
              <tr key={row.key} className="border-t border-border/50">
                <td className="whitespace-nowrap px-3 py-2 text-foreground/70">{row.label}</td>
                <td className="whitespace-nowrap px-3 py-2 text-right text-foreground">
                  {before}
                  {row.unit}
                </td>
                <td className="whitespace-nowrap px-3 py-2 text-right text-foreground">
                  {after}
                  {row.unit}
                </td>
                <td className={`whitespace-nowrap px-3 py-2 text-right font-medium ${toneClass}`}>
                  {delta > 0 ? '+' : ''}
                  {delta.toFixed(1)}
                  {row.unit} {delta < 0 ? '↓' : delta > 0 ? '↑' : ''}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function WorkoutTypePie({ distribution }: { distribution: WorkoutDistribution }) {
  const data = [
    { name: 'Силовые', value: distribution.strength, color: '#22C55E' },
    { name: 'Кардио', value: distribution.cardio, color: '#0EA5E9' },
    { name: 'Смешанные', value: distribution.mixed, color: '#A855F7' },
  ].filter((d) => d.value > 0)

  if (data.length === 0) {
    return <p className="py-8 text-center text-xs text-foreground/50">Нет тренировок за период</p>
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="h-[140px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="name" innerRadius={35} outerRadius={60} label={(entry) => entry.value}>
              {data.map((d) => (
                <Cell key={d.name} fill={d.color} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{ background: '#1E293B', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12 }}
              labelStyle={{ color: '#F8FAFC' }}
              itemStyle={{ color: '#F8FAFC' }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        {data.map((d) => (
          <div key={d.name} className="flex items-center gap-1 text-[10px] text-foreground/60">
            <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: d.color }} />
            {d.name}
          </div>
        ))}
      </div>
    </div>
  )
}

function MuscleGroupBars({ byMuscleGroup }: { byMuscleGroup: Record<MuscleGroup, number> }) {
  const max = Math.max(1, ...Object.values(byMuscleGroup))

  return (
    <div className="flex flex-col gap-1.5">
      {MUSCLE_GROUPS.map((g) => {
        const count = byMuscleGroup[g]
        const pct = (count / max) * 100
        return (
          <div key={g} className="flex items-center gap-1.5">
            <span className="w-14 shrink-0 truncate text-[10px] text-foreground/60">{MUSCLE_GROUP_LABELS[g]}</span>
            <div className="h-3 flex-1 overflow-hidden rounded-full bg-overlay/5">
              <div
                className="h-full rounded-full"
                style={{ width: `${pct}%`, backgroundColor: count > 0 ? '#22C55E' : '#374151' }}
              />
            </div>
            <span className="w-4 shrink-0 text-right text-[10px] text-foreground/60">{count}</span>
          </div>
        )
      })}
    </div>
  )
}

function AdaptiveTDEECard({ tdee, onRecalculate }: { tdee: AdaptiveTDEE; onRecalculate: () => void }) {
  if (!tdee.available) {
    const remaining = Math.max(0, 21 - tdee.daysTracked)
    return (
      <div className="rounded-2xl border border-border bg-surface p-4">
        <p className="text-sm text-foreground/70">
          Через {pluralize(remaining, 'день', 'дня', 'дней')} приложение рассчитает твой реальный TDEE на основе
          фактического питания и изменения веса. Это точнее любой формулы. Продолжай вести дневник.
        </p>
      </div>
    )
  }

  const { calculatedTDEE, realTDEE, diff } = tdee
  if (calculatedTDEE === null || realTDEE === null || diff === null) return null

  const significant = Math.abs(diff) > 200

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-5">
      <p className="text-base font-semibold text-foreground">Адаптивный TDEE</p>
      <div className="flex flex-col gap-1.5 text-sm">
        <div className="flex justify-between">
          <span className="text-foreground/60">Твой расчётный TDEE</span>
          <span className="text-foreground">{Math.round(calculatedTDEE)} ккал</span>
        </div>
        <div className="flex justify-between">
          <span className="text-foreground/60">Реальный TDEE (по данным)</span>
          <span className="text-foreground">{Math.round(realTDEE)} ккал</span>
        </div>
        <div className="flex justify-between">
          <span className="text-foreground/60">Разница</span>
          <span className={diff < 0 ? 'text-red-400' : diff > 0 ? 'text-accent' : 'text-foreground'}>
            {diff > 0 ? '+' : ''}
            {Math.round(diff)} ккал
          </span>
        </div>
      </div>

      {significant && (
        <div className="flex flex-col gap-3 rounded-xl border border-amber-400/30 bg-amber-400/10 p-3">
          <p className="text-sm text-amber-400">
            Рекомендуем скорректировать целевые калории. Твой реальный расход {diff < 0 ? 'ниже' : 'выше'}{' '}
            расчётного на {Math.round(Math.abs(diff))} ккал.
          </p>
          <button
            type="button"
            onClick={onRecalculate}
            className="min-h-[44px] rounded-xl bg-accent font-medium text-background transition hover:bg-accent-hover"
          >
            Пересчитать цели
          </button>
        </div>
      )}
    </div>
  )
}

function ConfirmModal({
  title,
  message,
  confirmLabel,
  disabled,
  onCancel,
  onConfirm,
}: {
  title: string
  message: string
  confirmLabel: string
  disabled?: boolean
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
            disabled={disabled}
            className="min-h-[44px] flex-1 rounded-xl bg-accent font-medium text-background disabled:opacity-40"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

import { useMemo, useState, type ReactNode } from 'react'
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  CheckCircle,
  Info,
  Minus,
  Pencil,
  XCircle,
  type LucideIcon,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { useWeightData, type WeightPeriod } from '../hooks/useWeightData'
import { useWeightAdvice, type AdviceIcon, type WeightAdvice } from '../hooks/useWeightAdvice'
import { isValidNumberInput, parseNumberInput } from '../lib/validation'
import { getLocalToday, parseLocalDate } from '../lib/dates'
import { WeightPageSkeleton } from '../components/PageSkeletons'
import { ErrorState } from '../components/ErrorState'
import type { Goal } from '../types/database'

const PERIOD_OPTIONS: { value: WeightPeriod; label: string }[] = [
  { value: '1w', label: '1 нед' },
  { value: '1m', label: '1 мес' },
  { value: '3m', label: '3 мес' },
  { value: 'all', label: 'Всё' },
]

const RU_MONTHS_SHORT = ['янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек']

function todayIso(): string {
  return getLocalToday()
}

function formatDayMonth(dateIso: string): string {
  return new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long' }).format(parseLocalDate(dateIso))
}

function formatShortDate(dateIso: string): string {
  const date = parseLocalDate(dateIso)
  return `${date.getDate()} ${RU_MONTHS_SHORT[date.getMonth()]}`
}

function formatXTick(dateIso: string, period: WeightPeriod): string {
  const date = parseLocalDate(dateIso)
  if (period === '3m' || period === 'all') {
    return RU_MONTHS_SHORT[date.getMonth()]
  }
  return `${String(date.getDate()).padStart(2, '0')}.${String(date.getMonth() + 1).padStart(2, '0')}`
}

type Tone = 'good' | 'warning' | 'bad'

function getChangeTone(goal: Goal, changeKg: number): Tone {
  if (goal === 'maintain' || goal === 'recomp') {
    return Math.abs(changeKg) > 0.3 ? 'warning' : 'good'
  }
  if (goal === 'cut') {
    return changeKg <= 0 ? 'good' : 'bad'
  }
  return changeKg >= 0 ? 'good' : 'bad'
}

const TONE_TEXT_CLASSES: Record<Tone, string> = {
  good: 'text-accent',
  warning: 'text-amber-400',
  bad: 'text-red-400',
}

export function WeightPage() {
  const { profile } = useAuth()
  const { showToast } = useToast()
  const [period, setPeriod] = useState<WeightPeriod>('1m')
  const [editingToday, setEditingToday] = useState(false)

  const { weights, movingAverage, stats, todayWeight, history, loading, error, saveWeight, updateWeight, retry } =
    useWeightData(period)

  const advice = useWeightAdvice(profile?.goal ?? null, weights, stats.avg7d, stats.prevAvg7d)

  const chartData = useMemo(
    () =>
      weights.map((w, i) => ({
        date: w.date,
        raw: w.value,
        avg: movingAverage[i]?.value ?? null,
      })),
    [weights, movingAverage],
  )

  const yDomain = useMemo<[number, number]>(() => {
    const values = chartData.flatMap((d) => [d.raw, d.avg].filter((v): v is number => v !== null))
    if (profile?.target_weight_kg != null) values.push(profile.target_weight_kg)
    if (values.length === 0) return [0, 1]
    return [Math.min(...values) - 1, Math.max(...values) + 1]
  }, [chartData, profile?.target_weight_kg])

  if (!profile || loading) {
    return <WeightPageSkeleton />
  }

  if (error) {
    return (
      <div className="px-4 pt-6">
        <ErrorState message={error} onRetry={retry} />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 px-4 pt-6 pb-4">
      <div className="rounded-2xl border border-border bg-surface p-5">
        {!todayWeight || editingToday ? (
          <WeightEntryForm
            initialValue={todayWeight ? String(todayWeight.weight_kg) : ''}
            onCancel={todayWeight ? () => setEditingToday(false) : undefined}
            onSubmit={async (kg) => {
              if (todayWeight) {
                await updateWeight(todayWeight.id, kg)
              } else {
                await saveWeight(todayIso(), kg)
              }
              showToast('Сохранено ✓')
              setEditingToday(false)
            }}
          />
        ) : (
          <div className="flex items-center justify-between">
            <div>
              <p className="text-3xl font-bold text-foreground">{todayWeight.weight_kg} кг</p>
              <p className="text-sm text-foreground/50">Сегодня, {formatDayMonth(todayWeight.date)}</p>
            </div>
            <button
              type="button"
              onClick={() => setEditingToday(true)}
              className="flex h-11 w-11 items-center justify-center rounded-full border border-border text-foreground/60 transition hover:border-accent"
            >
              <Pencil size={18} />
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <StatCard title="Среднее 7 дней">
          <p className="text-xl font-semibold text-foreground">
            {stats.avg7d !== null ? `${stats.avg7d.toFixed(1)} кг` : '—'}
          </p>
        </StatCard>

        <StatCard title="За неделю">
          {stats.weekChangeKg !== null ? (
            <ChangeValue kg={stats.weekChangeKg} tone={getChangeTone(profile.goal, stats.weekChangeKg)} />
          ) : (
            <p className="text-xl font-semibold text-foreground/40">—</p>
          )}
        </StatCard>

        <StatCard title="За месяц">
          {stats.monthChangeKg !== null ? (
            <ChangeValue kg={stats.monthChangeKg} tone={getChangeTone(profile.goal, stats.monthChangeKg)} />
          ) : (
            <p className="text-xl font-semibold text-foreground/40">—</p>
          )}
        </StatCard>

        <StatCard title="Скорость">
          {stats.weekChangePct !== null ? (
            <p className={`text-xl font-semibold ${ADVICE_TONE_TEXT_CLASSES[advice?.icon ?? 'info']}`}>
              {stats.weekChangePct > 0 ? '+' : ''}
              {stats.weekChangePct.toFixed(1)}%/нед
            </p>
          ) : (
            <p className="text-xl font-semibold text-foreground/40">—</p>
          )}
        </StatCard>
      </div>

      <div className="flex flex-col gap-3">
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

        {weights.length === 0 ? (
          <div className="flex h-[250px] flex-col items-center justify-center gap-2 rounded-2xl border border-border bg-surface p-6 text-center">
            <p className="text-sm text-foreground/60">
              Начни взвешиваться каждый день, чтобы видеть тренд. Минимум 7 записей для анализа.
            </p>
          </div>
        ) : (
          <div className="h-[250px] w-full rounded-2xl border border-border bg-surface p-3">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 12, left: -12, bottom: 0 }}>
                <CartesianGrid stroke="#334155" strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="date"
                  tickFormatter={(d) => formatXTick(d, period)}
                  stroke="#94A3B8"
                  tick={{ fontSize: 11, fill: '#94A3B8' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  domain={yDomain}
                  stroke="#94A3B8"
                  tick={{ fontSize: 11, fill: '#94A3B8' }}
                  axisLine={false}
                  tickLine={false}
                  width={36}
                />
                <Tooltip
                  contentStyle={{
                    background: '#1E293B',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 12,
                  }}
                  labelStyle={{ color: '#F8FAFC' }}
                  itemStyle={{ color: '#F8FAFC' }}
                  labelFormatter={(d) => formatDayMonth(d as string)}
                  formatter={(value, name) => [
                    `${Number(value).toFixed(1)} кг`,
                    name === 'avg' ? 'Среднее 7 дней' : 'Вес',
                  ]}
                />
                {profile.target_weight_kg != null && (
                  <ReferenceLine
                    y={profile.target_weight_kg}
                    stroke="#94A3B8"
                    strokeDasharray="4 4"
                    label={{
                      value: `Цель: ${profile.target_weight_kg} кг`,
                      position: 'insideTopRight',
                      fill: '#94A3B8',
                      fontSize: 11,
                    }}
                  />
                )}
                <Line
                  type="monotone"
                  dataKey="raw"
                  name="raw"
                  stroke="#94A3B8"
                  strokeWidth={1}
                  dot={{ r: 3, strokeWidth: 0, fill: '#94A3B8' }}
                  activeDot={{ r: 5 }}
                  connectNulls
                />
                <Line
                  type="monotone"
                  dataKey="avg"
                  name="avg"
                  stroke="#22C55E"
                  strokeWidth={3}
                  dot={false}
                  activeDot={{ r: 5, fill: '#22C55E' }}
                  connectNulls
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {advice && <AdviceCard advice={advice} />}

      <div className="flex flex-col gap-2">
        <h2 className="text-sm font-medium text-foreground/70">История</h2>
        <div className="flex flex-col rounded-2xl border border-border bg-surface p-2">
          {history.length === 0 ? (
            <p className="py-4 text-center text-sm text-foreground/50">Пока нет записей</p>
          ) : (
            history.map(({ entry, deltaKg }) => (
              <div key={entry.id} className="flex items-center justify-between gap-3 px-2 py-2.5">
                <span className="text-sm text-foreground">
                  {formatShortDate(entry.date)} — {entry.weight_kg} кг
                </span>
                {deltaKg !== null && (
                  <span className="text-xs text-foreground/50">
                    {deltaKg > 0 ? '+' : ''}
                    {deltaKg.toFixed(1)} кг
                  </span>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

function WeightEntryForm({
  initialValue,
  onSubmit,
  onCancel,
}: {
  initialValue: string
  onSubmit: (kg: number) => Promise<void>
  onCancel?: () => void
}) {
  const [value, setValue] = useState(initialValue)
  const [touched, setTouched] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const valid = isValidNumberInput(value, { min: 30, max: 300, oneDecimal: true })
  const showError = touched && value.trim() !== '' && !valid

  async function handleSubmit() {
    if (!valid) return
    setSubmitting(true)
    try {
      await onSubmit(parseNumberInput(value))
    } catch {
      // ошибка уже показана тостом внутри saveWeight/updateWeight
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <input
        autoFocus
        type="text"
        inputMode="decimal"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={() => setTouched(true)}
        placeholder="00.0"
        className={`w-full bg-transparent text-4xl font-bold outline-none placeholder:text-foreground/20 ${
          showError ? 'text-red-400' : 'text-foreground'
        }`}
      />
      {showError && <p className="text-sm text-red-400">Вес от 30 до 300 кг, максимум 1 знак после запятой</p>}
      <div className="flex gap-3">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="min-h-[44px] flex-1 rounded-xl border border-border font-medium text-foreground"
          >
            Отмена
          </button>
        )}
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!valid || submitting}
          className="min-h-[44px] flex-1 rounded-xl bg-accent font-medium text-background transition hover:bg-accent-hover disabled:opacity-40"
        >
          {submitting ? 'Сохраняем…' : 'Сохранить'}
        </button>
      </div>
    </div>
  )
}

function StatCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1 rounded-2xl border border-border bg-surface p-4">
      <span className="text-xs text-foreground/50">{title}</span>
      {children}
    </div>
  )
}

function ChangeValue({ kg, tone }: { kg: number; tone: Tone }) {
  const Arrow = kg > 0 ? ArrowUp : kg < 0 ? ArrowDown : Minus
  return (
    <p className={`flex items-center gap-1 text-xl font-semibold ${TONE_TEXT_CLASSES[tone]}`}>
      {kg > 0 ? '+' : ''}
      {kg.toFixed(1)} кг
      <Arrow size={16} />
    </p>
  )
}

const ADVICE_TONE_TEXT_CLASSES: Record<AdviceIcon, string> = {
  good: 'text-accent',
  warning: 'text-amber-400',
  bad: 'text-red-400',
  info: 'text-foreground/40',
}

const ADVICE_STYLES: Record<AdviceIcon, { icon: LucideIcon; border: string; bg: string; iconColor: string }> = {
  good: { icon: CheckCircle, border: 'border-accent/30', bg: 'bg-accent/10', iconColor: 'text-accent' },
  warning: {
    icon: AlertTriangle,
    border: 'border-amber-400/30',
    bg: 'bg-amber-400/10',
    iconColor: 'text-amber-400',
  },
  bad: { icon: XCircle, border: 'border-red-400/30', bg: 'bg-red-400/10', iconColor: 'text-red-400' },
  info: { icon: Info, border: 'border-border', bg: 'bg-overlay/5', iconColor: 'text-foreground/60' },
}

function AdviceCard({ advice }: { advice: WeightAdvice }) {
  const style = ADVICE_STYLES[advice.icon]
  const Icon = style.icon
  return (
    <div className={`flex items-start gap-3 rounded-2xl border p-4 ${style.border} ${style.bg}`}>
      <Icon size={20} className={`mt-0.5 shrink-0 ${style.iconColor}`} />
      <p className="text-sm text-foreground/90">{advice.text}</p>
    </div>
  )
}

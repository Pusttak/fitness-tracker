import { useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceArea,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  AlertTriangle,
  ChevronLeft,
  CheckCircle,
  Info,
  Plus,
  XCircle,
  type LucideIcon,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { useHideBottomNav } from '../context/LayoutChromeContext'
import { useMeasurements, type MeasurementInput } from '../hooks/useMeasurements'
import { useMeasurementsAdvice, type AdviceIcon, type MeasurementsAdvice } from '../hooks/useMeasurementsAdvice'
import { useWeightData } from '../hooks/useWeightData'
import { useDirtyForm } from '../hooks/useDirtyForm'
import { useFormPersist } from '../hooks/useFormPersist'
import { UnsavedChangesModal } from '../components/UnsavedChangesModal'
import {
  BODY_FAT_THRESHOLDS,
  calcBMI,
  calcBodyFat,
  calcWHR,
  calcWHtR,
  getBMICategory,
  getBodyFatCategory,
  getWHRCategory,
  getWHtRCategory,
  type BodyFatCategory,
  type IndicatorCategory,
  type IndicatorColor,
} from '../lib/calculations'
import { isValidNumberInput, parseNumberInput } from '../lib/validation'
import { diffDays, getLocalToday, parseLocalDate } from '../lib/dates'
import { MeasurementsPageSkeleton } from '../components/PageSkeletons'
import { ErrorState } from '../components/ErrorState'
import type { Gender, Goal, Measurement, Profile } from '../types/database'

type CircumferenceKey =
  | 'waist_cm'
  | 'hips_cm'
  | 'chest_cm'
  | 'bicep_left_cm'
  | 'bicep_right_cm'
  | 'thigh_left_cm'
  | 'thigh_right_cm'
  | 'neck_cm'

type TableColumnKey = CircumferenceKey | 'body_fat_pct'

const CIRCUMFERENCE_FIELDS: { key: CircumferenceKey; label: string }[] = [
  { key: 'waist_cm', label: 'Талия' },
  { key: 'hips_cm', label: 'Бёдра' },
  { key: 'chest_cm', label: 'Грудь' },
  { key: 'bicep_left_cm', label: 'Бицепс Л' },
  { key: 'bicep_right_cm', label: 'Бицепс П' },
  { key: 'thigh_left_cm', label: 'Бедро Л' },
  { key: 'thigh_right_cm', label: 'Бедро П' },
  { key: 'neck_cm', label: 'Шея' },
]

const TABLE_COLUMNS: { key: TableColumnKey; label: string }[] = [
  ...CIRCUMFERENCE_FIELDS,
  { key: 'body_fat_pct', label: '% жира' },
]

const CATEGORY_TEXT_CLASSES: Record<BodyFatCategory, string> = {
  'Мало жира': 'text-amber-400',
  'В норме': 'text-accent',
  'Выше нормы': 'text-amber-400',
  Ожирение: 'text-red-400',
}

const CATEGORY_BORDER_CLASSES: Record<BodyFatCategory, string> = {
  'Мало жира': 'border-amber-400',
  'В норме': 'border-accent',
  'Выше нормы': 'border-amber-400',
  Ожирение: 'border-red-400',
}

function todayIso(): string {
  return getLocalToday()
}

function formatDayMonth(dateIso: string): string {
  return new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long' }).format(parseLocalDate(dateIso))
}

function formatShortDate(dateIso: string): string {
  const date = parseLocalDate(dateIso)
  return `${String(date.getDate()).padStart(2, '0')}.${String(date.getMonth() + 1).padStart(2, '0')}`
}

function pluralize(n: number, one: string, few: string, many: string): string {
  const mod10 = n % 10
  const mod100 = n % 100
  if (mod10 === 1 && mod100 !== 11) return `${n} ${one}`
  if ([2, 3, 4].includes(mod10) && ![12, 13, 14].includes(mod100)) return `${n} ${few}`
  return `${n} ${many}`
}

function getCellTone(goal: Goal, key: TableColumnKey, delta: number | null): 'good' | 'bad' | null {
  if (delta === null || delta === 0) return null
  if (key === 'waist_cm' && (goal === 'cut' || goal === 'recomp')) {
    return delta < 0 ? 'good' : 'bad'
  }
  if ((key === 'bicep_left_cm' || key === 'bicep_right_cm' || key === 'chest_cm') && (goal === 'bulk' || goal === 'recomp')) {
    return delta > 0 ? 'good' : 'bad'
  }
  return null
}

export function MeasurementsPage() {
  const { profile } = useAuth()
  const { showToast } = useToast()
  const { measurements, latest, previous, loading, error, saveMeasurement, updateMeasurement, retry } =
    useMeasurements()
  const { history: weightHistory } = useWeightData('1w')
  const latestWeightKg = weightHistory[0]?.entry.weight_kg ?? null
  const advice = useMeasurementsAdvice(
    profile?.goal ?? null,
    latest,
    previous,
    profile?.gender ?? null,
    profile?.height_cm ?? null,
    latestWeightKg,
  )

  const [view, setView] = useState<'main' | 'form'>('main')
  const [editingMeasurement, setEditingMeasurement] = useState<Measurement | null>(null)
  const [chartTab, setChartTab] = useState<'circumference' | 'bodyfat'>('circumference')
  const [selectedField, setSelectedField] = useState<CircumferenceKey>('waist_cm')
  useHideBottomNav(view === 'form')

  if (!profile || loading) {
    return <MeasurementsPageSkeleton />
  }

  if (error) {
    return (
      <div className="px-4 pt-6">
        <ErrorState message={error} onRetry={retry} />
      </div>
    )
  }

  if (view === 'form') {
    return (
      <MeasurementForm
        profile={profile}
        latest={latest}
        editing={editingMeasurement}
        onCancel={() => setView('main')}
        onSave={async (input) => {
          if (editingMeasurement) {
            await updateMeasurement(editingMeasurement.id, input)
          } else {
            await saveMeasurement(input)
          }
          showToast('Сохранено ✓')
          setView('main')
        }}
      />
    )
  }

  return (
    <div className="flex flex-col gap-6 px-4 pt-6 pb-4">
      {latest ? (
        <BodyFatCard latest={latest} previous={previous} gender={profile.gender} />
      ) : (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-border bg-surface p-6 text-center">
          <div className="flex h-32 w-32 items-center justify-center rounded-full border-4 border-border">
            <span className="text-3xl font-bold text-foreground/30">?%</span>
          </div>
          <p className="text-sm text-foreground/60">Добавь первый замер для оценки состава тела</p>
        </div>
      )}

      {latest && (
        <IndicatorsSection
          latest={latest}
          previous={previous}
          gender={profile.gender}
          heightCm={profile.height_cm}
          weightKg={latestWeightKg}
        />
      )}

      <button
        type="button"
        onClick={() => {
          setEditingMeasurement(null)
          setView('form')
        }}
        className="flex min-h-[52px] items-center justify-center gap-2 rounded-xl bg-accent font-medium text-background transition hover:bg-accent-hover"
      >
        <Plus size={20} /> Новый замер
      </button>

      {latest && (
        <>
          <ReminderBanner latest={latest} />

          <ChartsSection
            measurements={measurements}
            gender={profile.gender}
            chartTab={chartTab}
            onChartTabChange={setChartTab}
            selectedField={selectedField}
            onFieldChange={setSelectedField}
            latest={latest}
            previous={previous}
          />

          <MeasurementsTable
            measurements={measurements}
            goal={profile.goal}
            onEdit={(m) => {
              setEditingMeasurement(m)
              setView('form')
            }}
          />
        </>
      )}

      {advice && <AdviceCard advice={advice} />}
    </div>
  )
}

function BodyFatCard({
  latest,
  previous,
  gender,
}: {
  latest: Measurement
  previous: Measurement | null
  gender: Gender
}) {
  const category = latest.body_fat_pct !== null ? getBodyFatCategory(gender, latest.body_fat_pct) : null

  const delta =
    latest.body_fat_pct !== null && previous?.body_fat_pct != null
      ? latest.body_fat_pct - previous.body_fat_pct
      : null

  const weeks = previous ? Math.max(1, Math.round(diffDays(latest.date, previous.date) / 7)) : null

  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-border bg-surface p-6">
      {latest.body_fat_pct !== null && category ? (
        <>
          <div
            className={`flex h-32 w-32 items-center justify-center rounded-full border-4 ${CATEGORY_BORDER_CLASSES[category]}`}
          >
            <span className="text-3xl font-bold text-foreground">{latest.body_fat_pct.toFixed(1)}%</span>
          </div>
          <span className={`text-sm font-medium ${CATEGORY_TEXT_CLASSES[category]}`}>{category}</span>
          <p className="text-xs text-foreground/40">По формуле US Navy, точность ±3-4%</p>
          {delta !== null && weeks !== null && (
            <p
              className={`text-sm font-medium ${
                delta < 0 ? 'text-accent' : delta > 0 ? 'text-red-400' : 'text-foreground/50'
              }`}
            >
              {delta > 0 ? '+' : ''}
              {delta.toFixed(1)}% за {pluralize(weeks, 'неделю', 'недели', 'недель')}
            </p>
          )}
        </>
      ) : (
        <p className="text-sm text-foreground/50">
          Добавь шею и талию в замер, чтобы рассчитать процент жира
        </p>
      )}
    </div>
  )
}

function computeWHR(m: Measurement | null): number | null {
  if (!m || m.waist_cm === null || m.hips_cm === null) return null
  return calcWHR(m.waist_cm, m.hips_cm)
}

function computeWHtR(m: Measurement | null, heightCm: number): number | null {
  if (!m || m.waist_cm === null) return null
  return calcWHtR(m.waist_cm, heightCm)
}

const INDICATOR_BAR_CLASSES: Record<IndicatorColor, string> = {
  green: 'bg-accent',
  yellow: 'bg-amber-400',
  red: 'bg-red-400',
}

const INDICATOR_TEXT_CLASSES: Record<IndicatorColor, string> = {
  green: 'text-accent',
  yellow: 'text-amber-400',
  red: 'text-red-400',
}

function IndicatorsSection({
  latest,
  previous,
  gender,
  heightCm,
  weightKg,
}: {
  latest: Measurement
  previous: Measurement | null
  gender: Gender
  heightCm: number
  weightKg: number | null
}) {
  const whr = computeWHR(latest)
  const whtr = computeWHtR(latest, heightCm)
  const bmi = weightKg !== null ? calcBMI(weightKg, heightCm) : null

  const prevWhr = computeWHR(previous)
  const prevWhtr = computeWHtR(previous, heightCm)

  const deltaParts: { key: string; label: string; current: number; previous: number }[] = []
  if (whr !== null && prevWhr !== null) deltaParts.push({ key: 'whr', label: 'WHR', current: whr, previous: prevWhr })
  if (whtr !== null && prevWhtr !== null) deltaParts.push({ key: 'whtr', label: 'WHtR', current: whtr, previous: prevWhtr })

  return (
    <div className="flex flex-col gap-2">
      <h2 className="text-sm font-medium text-foreground/70">Индикаторы здоровья</h2>
      <div className="grid grid-cols-3 gap-2">
        <IndicatorCard
          title="Талия / Бёдра"
          value={whr}
          decimals={2}
          category={whr !== null ? getWHRCategory(whr, gender) : null}
          missingText="Нужны бёдра"
        />
        <IndicatorCard
          title="Талия / Рост"
          value={whtr}
          decimals={2}
          category={whtr !== null ? getWHtRCategory(whtr) : null}
          missingText="Нужна талия"
        />
        <IndicatorCard
          title="ИМТ"
          value={bmi}
          decimals={1}
          category={bmi !== null ? getBMICategory(bmi) : null}
          missingText="Нужен вес"
        />
      </div>

      {deltaParts.length > 0 && (
        <p className="text-center text-xs text-foreground/50">
          {deltaParts.map((part, i) => (
            <span key={part.key}>
              {i > 0 && '   '}
              <IndicatorDeltaText label={part.label} current={part.current} previous={part.previous} decimals={2} />
            </span>
          ))}
        </p>
      )}
    </div>
  )
}

function IndicatorCard({
  title,
  value,
  decimals,
  category,
  missingText,
}: {
  title: string
  value: number | null
  decimals: number
  category: IndicatorCategory | null
  missingText: string
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-border bg-surface p-3">
      <div
        className={`absolute inset-x-0 top-0 h-[3px] ${category ? INDICATOR_BAR_CLASSES[category.color] : 'bg-overlay/10'}`}
      />
      <p className="truncate text-xs text-foreground/50">{title}</p>
      <p className="pt-1 text-xl font-semibold text-foreground">{value !== null ? value.toFixed(decimals) : '—'}</p>
      <p className={`text-xs font-medium ${category ? INDICATOR_TEXT_CLASSES[category.color] : 'text-foreground/40'}`}>
        {category ? category.label : missingText}
      </p>
    </div>
  )
}

function IndicatorDeltaText({
  label,
  current,
  previous,
  decimals,
}: {
  label: string
  current: number
  previous: number
  decimals: number
}) {
  const delta = current - previous
  const deltaClass = delta === 0 ? 'text-foreground/50' : delta < 0 ? 'text-accent' : 'text-red-400'

  return (
    <span className="text-foreground/70">
      {label}: {previous.toFixed(decimals)} → {current.toFixed(decimals)}{' '}
      <span className={deltaClass}>
        ({delta > 0 ? '+' : ''}
        {delta.toFixed(decimals)})
      </span>
    </span>
  )
}

function ReminderBanner({ latest }: { latest: Measurement }) {
  const days = diffDays(getLocalToday(), latest.date)

  if (days > 7) {
    return (
      <div className="rounded-xl border border-amber-400/30 bg-amber-400/10 p-4">
        <p className="text-sm text-amber-400">
          Последний замер {pluralize(days, 'день', 'дня', 'дней')} назад — пора обновить
        </p>
      </div>
    )
  }

  if (days < 5) {
    const remaining = 7 - days
    return (
      <div className="rounded-xl border border-border bg-surface p-4">
        <p className="text-sm text-foreground/70">
          Следующий замер через {pluralize(remaining, 'день', 'дня', 'дней')}. Замеряйся раз в неделю в одно
          время.
        </p>
      </div>
    )
  }

  return null
}

interface ChartsSectionProps {
  measurements: Measurement[]
  gender: Gender
  chartTab: 'circumference' | 'bodyfat'
  onChartTabChange: (tab: 'circumference' | 'bodyfat') => void
  selectedField: CircumferenceKey
  onFieldChange: (field: CircumferenceKey) => void
  latest: Measurement
  previous: Measurement | null
}

function ChartsSection({
  measurements,
  gender,
  chartTab,
  onChartTabChange,
  selectedField,
  onFieldChange,
  latest,
  previous,
}: ChartsSectionProps) {
  const ascending = useMemo(() => [...measurements].reverse(), [measurements])

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-1 rounded-xl bg-surface p-1">
        <TabButton active={chartTab === 'circumference'} onClick={() => onChartTabChange('circumference')}>
          Обхваты
        </TabButton>
        <TabButton active={chartTab === 'bodyfat'} onClick={() => onChartTabChange('bodyfat')}>
          % жира
        </TabButton>
      </div>

      {chartTab === 'bodyfat' ? (
        <BodyFatChart data={ascending} gender={gender} />
      ) : (
        <div className="flex flex-col gap-3">
          <div className="flex gap-2 overflow-x-auto pb-1">
            {CIRCUMFERENCE_FIELDS.map((f) => (
              <button
                key={f.key}
                type="button"
                onClick={() => onFieldChange(f.key)}
                className={`shrink-0 rounded-lg px-3 py-2 text-xs font-medium transition ${
                  selectedField === f.key ? 'bg-accent text-background' : 'bg-surface text-foreground/60'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <SingleFieldChart data={ascending} field={selectedField} />

          <MiniStatsTable current={latest[selectedField]} monthAgo={previous ? previous[selectedField] : null} />
        </div>
      )}
    </div>
  )
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 rounded-lg py-2 text-sm font-medium transition ${
        active ? 'bg-accent text-background' : 'text-foreground/60'
      }`}
    >
      {children}
    </button>
  )
}

function EmptyChart({ text }: { text: string }) {
  return (
    <div className="flex h-[250px] flex-col items-center justify-center gap-2 rounded-2xl border border-border bg-surface p-6 text-center">
      <p className="text-sm text-foreground/60">{text}</p>
    </div>
  )
}

function BodyFatChart({ data, gender }: { data: Measurement[]; gender: Gender }) {
  const chartData = useMemo(
    () =>
      data
        .filter((m): m is Measurement & { body_fat_pct: number } => m.body_fat_pct !== null)
        .map((m) => ({ date: m.date, value: m.body_fat_pct })),
    [data],
  )

  if (chartData.length === 0) {
    return <EmptyChart text="Добавь замер шеи и талии, чтобы увидеть график процента жира" />
  }

  const thresholds = BODY_FAT_THRESHOLDS[gender]
  const values = chartData.map((d) => d.value)
  const yMin = Math.min(...values, thresholds.normal) - 2
  const yMax = Math.max(...values, thresholds.above) + 2

  return (
    <div className="h-[250px] w-full rounded-2xl border border-border bg-surface p-3">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 10, right: 12, left: -12, bottom: 0 }}>
          <CartesianGrid stroke="#334155" strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="date"
            tickFormatter={formatShortDate}
            stroke="#94A3B8"
            tick={{ fontSize: 11, fill: '#94A3B8' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            domain={[yMin, yMax]}
            stroke="#94A3B8"
            tick={{ fontSize: 11, fill: '#94A3B8' }}
            axisLine={false}
            tickLine={false}
            width={32}
          />
          <Tooltip
            contentStyle={{ background: '#1E293B', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12 }}
            labelStyle={{ color: '#F8FAFC' }}
            itemStyle={{ color: '#F8FAFC' }}
            labelFormatter={(d) => formatDayMonth(d as string)}
            formatter={(v) => [`${Number(v).toFixed(1)}%`, '% жира']}
          />
          <ReferenceArea y1={thresholds.normal} y2={thresholds.above} fill="#22C55E" fillOpacity={0.1} strokeOpacity={0} />
          <Line
            type="monotone"
            dataKey="value"
            stroke="#22C55E"
            strokeWidth={2}
            dot={{ r: 3, fill: '#22C55E', strokeWidth: 0 }}
            activeDot={{ r: 5 }}
            connectNulls
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

function SingleFieldChart({ data, field }: { data: Measurement[]; field: CircumferenceKey }) {
  const chartData = useMemo(
    () =>
      data
        .filter((m): m is Measurement & Record<CircumferenceKey, number> => m[field] !== null)
        .map((m) => ({ date: m.date, value: m[field] as number })),
    [data, field],
  )

  if (chartData.length === 0) {
    return <EmptyChart text="Нет данных по этому замеру" />
  }

  const values = chartData.map((d) => d.value)
  const yMin = Math.min(...values) - 1
  const yMax = Math.max(...values) + 1

  return (
    <div className="h-[250px] w-full rounded-2xl border border-border bg-surface p-3">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 10, right: 12, left: -12, bottom: 0 }}>
          <CartesianGrid stroke="#334155" strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="date"
            tickFormatter={formatShortDate}
            stroke="#94A3B8"
            tick={{ fontSize: 11, fill: '#94A3B8' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            domain={[yMin, yMax]}
            stroke="#94A3B8"
            tick={{ fontSize: 11, fill: '#94A3B8' }}
            axisLine={false}
            tickLine={false}
            width={32}
          />
          <Tooltip
            contentStyle={{ background: '#1E293B', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12 }}
            labelStyle={{ color: '#F8FAFC' }}
            itemStyle={{ color: '#F8FAFC' }}
            labelFormatter={(d) => formatDayMonth(d as string)}
            formatter={(v) => [`${Number(v).toFixed(1)} см`, 'Значение']}
          />
          <Line
            type="monotone"
            dataKey="value"
            stroke="#22C55E"
            strokeWidth={2}
            dot={{ r: 3, fill: '#22C55E', strokeWidth: 0 }}
            activeDot={{ r: 5 }}
            connectNulls
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

function MiniStatsTable({ current, monthAgo }: { current: number | null; monthAgo: number | null }) {
  const delta = current !== null && monthAgo !== null ? current - monthAgo : null

  return (
    <div className="grid grid-cols-3 gap-2 rounded-2xl border border-border bg-surface p-4 text-center">
      <div>
        <p className="text-xs text-foreground/50">Текущее</p>
        <p className="text-lg font-semibold text-foreground">{current !== null ? `${current} см` : '—'}</p>
      </div>
      <div>
        <p className="text-xs text-foreground/50">Месяц назад</p>
        <p className="text-lg font-semibold text-foreground">{monthAgo !== null ? `${monthAgo} см` : '—'}</p>
      </div>
      <div>
        <p className="text-xs text-foreground/50">Изменение</p>
        <p className="text-lg font-semibold text-foreground">
          {delta !== null ? `${delta > 0 ? '+' : ''}${delta.toFixed(1)} ${delta < 0 ? '↓' : delta > 0 ? '↑' : ''}` : '—'}
        </p>
      </div>
    </div>
  )
}

function MeasurementsTable({
  measurements,
  goal,
  onEdit,
}: {
  measurements: Measurement[]
  goal: Goal
  onEdit: (measurement: Measurement) => void
}) {
  const rows = measurements.slice(0, 10)

  if (rows.length === 0) return null

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between">
        <h2 className="text-sm font-medium text-foreground/70">Последние замеры</h2>
        <span className="text-xs text-foreground/40">Тап по дате — редактировать</span>
      </div>
      <div className="overflow-x-auto rounded-2xl border border-border bg-surface">
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr>
              <th className="sticky left-0 z-10 whitespace-nowrap bg-surface px-3 py-2 text-left text-foreground/50">
                Дата
              </th>
              {TABLE_COLUMNS.map((col) => (
                <th key={col.key} className="whitespace-nowrap px-3 py-2 text-right text-foreground/50">
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => {
              const prevRow = measurements[i + 1] ?? null
              return (
                <tr key={row.id} className="border-t border-border/50">
                  <td className="sticky left-0 z-10 whitespace-nowrap bg-surface p-0">
                    <button
                      type="button"
                      onClick={() => onEdit(row)}
                      className="min-h-[44px] w-full px-3 py-2 text-left font-medium text-accent"
                    >
                      {formatShortDate(row.date)}
                    </button>
                  </td>
                  {TABLE_COLUMNS.map((col) => {
                    const value = row[col.key]
                    const prevValue = prevRow ? prevRow[col.key] : null
                    const delta = value !== null && prevValue !== null ? value - prevValue : null
                    const tone = getCellTone(goal, col.key, delta)
                    const toneClass =
                      tone === 'good' ? 'text-accent' : tone === 'bad' ? 'text-red-400' : 'text-foreground'
                    return (
                      <td key={col.key} className={`whitespace-nowrap px-3 py-2 text-right ${toneClass}`}>
                        {value !== null ? value : '—'}
                      </td>
                    )
                  })}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
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

function AdviceCard({ advice }: { advice: MeasurementsAdvice }) {
  const style = ADVICE_STYLES[advice.icon]
  const Icon = style.icon
  return (
    <div className={`flex items-start gap-3 rounded-2xl border p-4 ${style.border} ${style.bg}`}>
      <Icon size={20} className={`mt-0.5 shrink-0 ${style.iconColor}`} />
      <p className="text-sm text-foreground/90">{advice.text}</p>
    </div>
  )
}

const measurementInputClasses =
  'min-h-[44px] w-full rounded-xl border border-border bg-surface px-4 text-foreground outline-none focus:border-accent'

interface MeasurementDraft {
  neck: string
  chest: string
  waist: string
  hips: string
  bicepLeft: string
  bicepRight: string
  thighLeft: string
  thighRight: string
}

const MEASUREMENT_DRAFT_DEFAULT: MeasurementDraft = {
  neck: '',
  chest: '',
  waist: '',
  hips: '',
  bicepLeft: '',
  bicepRight: '',
  thighLeft: '',
  thighRight: '',
}

interface MeasurementFormProps {
  profile: Profile
  latest: Measurement | null
  editing: Measurement | null
  onCancel: () => void
  onSave: (input: MeasurementInput) => Promise<void>
}

function MeasurementForm({ profile, latest, editing, onCancel, onSave }: MeasurementFormProps) {
  const isNew = !editing
  const {
    values: measurementDraft,
    setValues: setMeasurementDraft,
    clearPersisted: clearMeasurementDraft,
  } = useFormPersist<MeasurementDraft>('new-measurement-form', MEASUREMENT_DRAFT_DEFAULT)

  const [date, setDate] = useState(() => editing?.date ?? todayIso())
  const [neck, setNeck] = useState(() =>
    editing?.neck_cm != null ? String(editing.neck_cm) : isNew ? measurementDraft.neck : '',
  )
  const [chest, setChest] = useState(() =>
    editing?.chest_cm != null ? String(editing.chest_cm) : isNew ? measurementDraft.chest : '',
  )
  const [waist, setWaist] = useState(() =>
    editing?.waist_cm != null ? String(editing.waist_cm) : isNew ? measurementDraft.waist : '',
  )
  const [hips, setHips] = useState(() =>
    editing?.hips_cm != null ? String(editing.hips_cm) : isNew ? measurementDraft.hips : '',
  )
  const [bicepLeft, setBicepLeft] = useState(() =>
    editing?.bicep_left_cm != null ? String(editing.bicep_left_cm) : isNew ? measurementDraft.bicepLeft : '',
  )
  const [bicepRight, setBicepRight] = useState(() =>
    editing?.bicep_right_cm != null ? String(editing.bicep_right_cm) : isNew ? measurementDraft.bicepRight : '',
  )
  const [thighLeft, setThighLeft] = useState(() =>
    editing?.thigh_left_cm != null ? String(editing.thigh_left_cm) : isNew ? measurementDraft.thighLeft : '',
  )
  const [thighRight, setThighRight] = useState(() =>
    editing?.thigh_right_cm != null ? String(editing.thigh_right_cm) : isNew ? measurementDraft.thighRight : '',
  )
  const [touched, setTouched] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const measurementForm = useDirtyForm()

  useEffect(() => {
    if (!isNew) return
    setMeasurementDraft({ neck, chest, waist, hips, bicepLeft, bicepRight, thighLeft, thighRight })
  }, [isNew, neck, chest, waist, hips, bicepLeft, bicepRight, thighLeft, thighRight, setMeasurementDraft])

  function parseField(v: string): number | null {
    if (v.trim() === '') return null
    const n = parseNumberInput(v)
    return Number.isNaN(n) ? null : n
  }

  const fieldValid = (v: string) => v.trim() === '' || isValidNumberInput(v, { min: 10, max: 200, oneDecimal: true })

  const fields: {
    label: string
    value: string
    onChange: (v: string) => void
    placeholder: number | null
    hint: string
  }[] = [
    {
      label: 'Шея',
      value: neck,
      onChange: setNeck,
      placeholder: latest?.neck_cm ?? null,
      hint: 'Под кадыком, в самом узком месте',
    },
    {
      label: 'Грудь',
      value: chest,
      onChange: setChest,
      placeholder: latest?.chest_cm ?? null,
      hint: 'На уровне сосков, руки опущены',
    },
    {
      label: 'Талия (на уровне пупка)',
      value: waist,
      onChange: setWaist,
      placeholder: latest?.waist_cm ?? null,
      hint: 'Стоя, расслабив живот, лента горизонтально',
    },
    {
      label: 'Бёдра',
      value: hips,
      onChange: setHips,
      placeholder: latest?.hips_cm ?? null,
      hint: 'В самом широком месте ягодиц',
    },
    {
      label: 'Бицепс Л',
      value: bicepLeft,
      onChange: setBicepLeft,
      placeholder: latest?.bicep_left_cm ?? null,
      hint: 'В напряжённом состоянии, в самом толстом месте',
    },
    {
      label: 'Бицепс П',
      value: bicepRight,
      onChange: setBicepRight,
      placeholder: latest?.bicep_right_cm ?? null,
      hint: 'В напряжённом состоянии, в самом толстом месте',
    },
    {
      label: 'Бедро Л',
      value: thighLeft,
      onChange: setThighLeft,
      placeholder: latest?.thigh_left_cm ?? null,
      hint: 'Стоя, в самом толстом месте',
    },
    {
      label: 'Бедро П',
      value: thighRight,
      onChange: setThighRight,
      placeholder: latest?.thigh_right_cm ?? null,
      hint: 'Стоя, в самом толстом месте',
    },
  ]

  const anyFilled = fields.some((f) => f.value.trim() !== '')
  const allValid = fields.every((f) => fieldValid(f.value))
  const canSave = date !== '' && anyFilled && allValid

  const neckVal = parseField(neck)
  const waistVal = parseField(waist)
  const hipsVal = parseField(hips)

  const bodyFatPreview = useMemo(() => {
    if (neckVal === null || waistVal === null) return null
    if (profile.gender === 'female' && hipsVal === null) return null
    try {
      return calcBodyFat(profile.gender, waistVal, neckVal, profile.height_cm, hipsVal ?? undefined)
    } catch {
      return null
    }
  }, [neckVal, waistVal, hipsVal, profile.gender, profile.height_cm])

  async function handleSave() {
    setTouched(true)
    if (!canSave) return
    setSubmitting(true)
    setError(null)
    try {
      await onSave({
        date,
        neck_cm: neckVal,
        chest_cm: parseField(chest),
        waist_cm: waistVal,
        hips_cm: hipsVal,
        bicep_left_cm: parseField(bicepLeft),
        bicep_right_cm: parseField(bicepRight),
        thigh_left_cm: parseField(thighLeft),
        thigh_right_cm: parseField(thighRight),
      })
      measurementForm.markClean()
      clearMeasurementDraft()
    } catch {
      setError('Не удалось сохранить замер. Попробуйте ещё раз.')
      setSubmitting(false)
    }
  }

  return (
    <div className="flex flex-col gap-5 px-4 pt-6 pb-8">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => measurementForm.handleBack(onCancel)}
          className="flex h-10 w-10 items-center justify-center rounded-full text-foreground/60 transition hover:bg-overlay/5"
        >
          <ChevronLeft size={22} />
        </button>
        <p className="text-sm font-medium text-foreground">{editing ? 'Редактировать замер' : 'Новый замер'}</p>
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
            measurementForm.markDirty()
          }}
          className={measurementInputClasses}
        />
      </div>

      <p className="text-xs text-foreground/50">
        Измеряй утром, расслабленно, не втягивая живот. Используй одну и ту же ленту.
      </p>

      <div className="grid grid-cols-2 gap-3">
        {fields.map((f) => {
          const showFieldError = touched && !fieldValid(f.value)
          return (
            <div key={f.label} className="flex flex-col gap-1.5">
              <label className="text-sm text-foreground/70">{f.label}</label>
              <div className="relative">
                <input
                  type="text"
                  inputMode="decimal"
                  value={f.value}
                  onChange={(e) => {
                    f.onChange(e.target.value)
                    measurementForm.markDirty()
                  }}
                  placeholder={f.placeholder != null ? String(f.placeholder) : '—'}
                  className={`${measurementInputClasses} pr-9 placeholder:text-foreground/25 ${
                    showFieldError ? 'border-red-400' : ''
                  }`}
                />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-foreground/40">
                  см
                </span>
              </div>
              {showFieldError && <p className="text-xs text-red-400">10–200 см, максимум 1 знак после запятой</p>}
              <p className="text-xs text-foreground/40">{f.hint}</p>
            </div>
          )
        })}
      </div>

      {bodyFatPreview !== null && (
        <div className="rounded-2xl border border-accent/30 bg-accent/10 p-4 text-center">
          <p className="text-sm text-foreground/80">
            Процент жира: <span className="font-semibold text-foreground">~{bodyFatPreview.toFixed(1)}%</span>
          </p>
        </div>
      )}

      {error && <p className="text-center text-sm text-red-400">{error}</p>}

      <button
        type="button"
        onClick={handleSave}
        disabled={!canSave || submitting}
        className="min-h-[52px] rounded-xl bg-accent font-medium text-background transition hover:bg-accent-hover disabled:opacity-40"
      >
        {submitting ? 'Сохраняем…' : 'Сохранить'}
      </button>

      {measurementForm.showConfirm && (
        <UnsavedChangesModal onStay={measurementForm.cancelLeave} onLeave={measurementForm.confirmLeave} />
      )}
    </div>
  )
}

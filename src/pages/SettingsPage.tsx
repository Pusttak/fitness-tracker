import { useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { Download, LogOut, Minus, Moon, RefreshCw, Sun, TrendingDown, TrendingUp, type LucideIcon } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useTheme, type Theme } from '../context/ThemeContext'
import { useSettings, type TargetInput } from '../hooks/useSettings'
import { useWeightData } from '../hooks/useWeightData'
import { useMeasurements } from '../hooks/useMeasurements'
import { SettingsPageSkeleton } from '../components/PageSkeletons'
import { parseLocalDate } from '../lib/dates'
import type { DailyActivity, Gender, Goal, Profile } from '../types/database'

const GOAL_OPTIONS: { value: Goal; title: string; description: string; icon: LucideIcon }[] = [
  { value: 'cut', title: 'Похудеть', description: 'Снизить жир, стать рельефнее', icon: TrendingDown },
  { value: 'bulk', title: 'Набрать массу', description: 'Нарастить мышцы, стать больше', icon: TrendingUp },
  { value: 'recomp', title: 'Рекомпозиция', description: 'Сжечь жир и нарастить мышцы одновременно', icon: RefreshCw },
  { value: 'maintain', title: 'Поддержание', description: 'Остаться в текущей форме', icon: Minus },
]

const DAILY_ACTIVITY_OPTIONS: { value: DailyActivity; title: string; description: string }[] = [
  { value: 'sedentary', title: 'Сидячая работа', description: 'Офис, компьютер' },
  { value: 'on_feet', title: 'На ногах', description: 'Продавец, учитель, много хожу' },
  { value: 'physical', title: 'Физический труд', description: 'Стройка, склад, грузчик' },
]

const inputClasses =
  'min-h-[44px] w-full rounded-xl border border-border bg-background px-4 text-foreground outline-none focus:border-accent'

function parseDecimal(value: string): number {
  return parseFloat(value.replace(',', '.'))
}

function formatDayMonthYear(dateIso: string): string {
  return new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' }).format(
    parseLocalDate(dateIso),
  )
}

export function SettingsPage() {
  const { profile, signOut } = useAuth()
  const {
    updateProfile,
    updateGoal,
    updateTargets,
    resetTargetsToCalculated,
    updateTargetWeight,
    recalculateTrainingPlan,
    exportData,
  } = useSettings()
  const { history: weightHistory, loading: weightLoading } = useWeightData('1w')
  const { latest: latestMeasurement, loading: measurementsLoading } = useMeasurements()
  const navigate = useNavigate()

  if (!profile || weightLoading || measurementsLoading) {
    return <SettingsPageSkeleton />
  }

  const currentWeightKg = weightHistory[0]?.entry.weight_kg ?? null
  const latestBodyFatPct = latestMeasurement?.body_fat_pct ?? null

  async function handleSignOut() {
    await signOut()
    navigate('/login', { replace: true })
  }

  return (
    <div className="flex flex-col gap-4 px-4 pt-6 pb-8">
      <SettingsSection title="Профиль">
        <NameSetting name={profile.name} onSave={(name) => updateProfile({ name })} />
        <div className="h-px bg-overlay/5" />
        <BasicsSetting profile={profile} onSave={(patch) => updateProfile(patch)} />
        <div className="h-px bg-overlay/5" />
        <div className="flex flex-col gap-2">
          <p className="text-xs text-foreground/50">Дневная активность</p>
          <DailyActivitySetting value={profile.daily_activity} onChange={(v) => updateProfile({ daily_activity: v })} />
        </div>
      </SettingsSection>

      <SettingsSection title="Цель">
        <GoalSetting
          profile={profile}
          currentWeightKg={currentWeightKg}
          latestBodyFatPct={latestBodyFatPct}
          onChangeGoal={updateGoal}
        />
      </SettingsSection>

      <SettingsSection title="Целевые КБЖУ">
        <TargetsSetting
          profile={profile}
          currentWeightKg={currentWeightKg}
          onUpdateTargets={updateTargets}
          onResetTargets={resetTargetsToCalculated}
        />
      </SettingsSection>

      <SettingsSection title="Целевой вес">
        <TargetWeightSetting
          value={profile.target_weight_kg}
          onSave={updateTargetWeight}
          onClear={() => updateTargetWeight(null)}
        />
      </SettingsSection>

      <SettingsSection title="Рекомендация по тренировкам">
        <TrainingPlanSetting
          profile={profile}
          latestBodyFatPct={latestBodyFatPct}
          onRecalculate={recalculateTrainingPlan}
        />
      </SettingsSection>

      <SettingsSection title="Данные">
        <DataSetting onExport={exportData} onSignOut={handleSignOut} />
      </SettingsSection>

      <SettingsSection title="Тема">
        <ThemeSetting />
      </SettingsSection>

      <SettingsSection title="О приложении">
        <div className="flex flex-col gap-1">
          <p className="text-sm text-foreground">FitTracker — персональный фитнес-трекер</p>
          <p className="text-xs text-foreground/40">Версия 1.0.0</p>
        </div>
      </SettingsSection>
    </div>
  )
}

function SettingsSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-4">
      <h2 className="text-sm font-medium text-foreground/70">{title}</h2>
      {children}
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-foreground/50">{label}</span>
      <span className="text-foreground">{value}</span>
    </div>
  )
}

function NameSetting({ name, onSave }: { name: string; onSave: (name: string) => Promise<void> }) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(name)
  const [saving, setSaving] = useState(false)

  if (!editing) {
    return (
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-foreground/50">Имя</p>
          <p className="text-foreground">{name}</p>
        </div>
        <button
          type="button"
          onClick={() => {
            setValue(name)
            setEditing(true)
          }}
          className="text-sm font-medium text-accent"
        >
          Изменить
        </button>
      </div>
    )
  }

  async function handleSave() {
    if (!value.trim()) return
    setSaving(true)
    await onSave(value.trim())
    setSaving(false)
    setEditing(false)
  }

  return (
    <div className="flex flex-col gap-2">
      <label className="text-xs text-foreground/50">Имя</label>
      <input type="text" value={value} onChange={(e) => setValue(e.target.value)} className={inputClasses} />
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setEditing(false)}
          className="min-h-[40px] flex-1 rounded-xl border border-border text-sm text-foreground"
        >
          Отмена
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || !value.trim()}
          className="min-h-[40px] flex-1 rounded-xl bg-accent text-sm font-medium text-background disabled:opacity-40"
        >
          {saving ? 'Сохраняем…' : 'Сохранить'}
        </button>
      </div>
    </div>
  )
}

interface BasicsPatch {
  gender: Gender
  birth_date: string
  height_cm: number
}

function BasicsSetting({ profile, onSave }: { profile: Profile; onSave: (patch: BasicsPatch) => Promise<void> }) {
  const [editing, setEditing] = useState(false)
  const [gender, setGender] = useState<Gender>(profile.gender)
  const [birthDate, setBirthDate] = useState(profile.birth_date)
  const [height, setHeight] = useState(String(profile.height_cm))
  const [saving, setSaving] = useState(false)

  if (!editing) {
    return (
      <div className="flex flex-col gap-2">
        <Row label="Пол" value={profile.gender === 'male' ? 'Мужской' : 'Женский'} />
        <Row label="Дата рождения" value={formatDayMonthYear(profile.birth_date)} />
        <Row label="Рост" value={`${profile.height_cm} см`} />
        <button
          type="button"
          onClick={() => {
            setGender(profile.gender)
            setBirthDate(profile.birth_date)
            setHeight(String(profile.height_cm))
            setEditing(true)
          }}
          className="self-start text-sm font-medium text-accent"
        >
          Изменить
        </button>
      </div>
    )
  }

  const heightValue = parseDecimal(height)
  const heightValid = !Number.isNaN(heightValue) && heightValue >= 100 && heightValue <= 250

  async function handleSave() {
    if (!heightValid) return
    setSaving(true)
    await onSave({ gender, birth_date: birthDate, height_cm: heightValue })
    setSaving(false)
    setEditing(false)
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-2">
        {(['male', 'female'] as const).map((g) => (
          <button
            key={g}
            type="button"
            onClick={() => setGender(g)}
            className={`min-h-[44px] rounded-xl border text-sm font-medium transition ${
              gender === g ? 'border-accent bg-accent/15 text-accent' : 'border-border bg-background text-foreground'
            }`}
          >
            {g === 'male' ? 'Мужской' : 'Женский'}
          </button>
        ))}
      </div>
      <input type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} className={inputClasses} />
      <input
        type="text"
        inputMode="decimal"
        value={height}
        onChange={(e) => setHeight(e.target.value)}
        placeholder="Рост, см"
        className={inputClasses}
      />
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setEditing(false)}
          className="min-h-[40px] flex-1 rounded-xl border border-border text-sm text-foreground"
        >
          Отмена
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={!heightValid || saving}
          className="min-h-[40px] flex-1 rounded-xl bg-accent text-sm font-medium text-background disabled:opacity-40"
        >
          {saving ? 'Сохраняем…' : 'Сохранить'}
        </button>
      </div>
    </div>
  )
}

function DailyActivitySetting({
  value,
  onChange,
}: {
  value: DailyActivity
  onChange: (value: DailyActivity) => Promise<void>
}) {
  const [saving, setSaving] = useState(false)

  async function handleSelect(v: DailyActivity) {
    if (v === value || saving) return
    setSaving(true)
    await onChange(v)
    setSaving(false)
  }

  return (
    <div className="flex flex-col gap-2">
      {DAILY_ACTIVITY_OPTIONS.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => handleSelect(opt.value)}
          disabled={saving}
          className={`flex flex-col gap-0.5 rounded-xl border p-3 text-left transition disabled:opacity-60 ${
            value === opt.value ? 'border-accent bg-accent/10' : 'border-border bg-background'
          }`}
        >
          <span className="text-sm font-medium text-foreground">{opt.title}</span>
          <span className="text-xs text-foreground/50">{opt.description}</span>
        </button>
      ))}
    </div>
  )
}

interface GoalSettingProps {
  profile: Profile
  currentWeightKg: number | null
  latestBodyFatPct: number | null
  onChangeGoal: (goal: Goal, currentWeightKg: number, bodyFatPct: number | null) => Promise<void>
}

function GoalSetting({ profile, currentWeightKg, latestBodyFatPct, onChangeGoal }: GoalSettingProps) {
  const [selecting, setSelecting] = useState(false)
  const [pendingGoal, setPendingGoal] = useState<Goal | null>(null)
  const [saving, setSaving] = useState(false)

  const current = GOAL_OPTIONS.find((g) => g.value === profile.goal)
  if (!current) return null

  if (!selecting) {
    const Icon = current.icon
    return (
      <div className="flex items-center justify-between rounded-xl border border-border bg-background p-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/15 text-accent">
            <Icon size={18} />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">{current.title}</p>
            <p className="text-xs text-foreground/50">{current.description}</p>
          </div>
        </div>
        <button type="button" onClick={() => setSelecting(true)} className="text-sm font-medium text-accent">
          Изменить
        </button>
      </div>
    )
  }

  return (
    <>
      <div className="flex flex-col gap-2">
        {GOAL_OPTIONS.map((opt) => {
          const Icon = opt.icon
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => setPendingGoal(opt.value)}
              disabled={opt.value === profile.goal}
              className="flex items-center gap-3 rounded-xl border border-border bg-background p-3 text-left transition disabled:opacity-40"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-overlay/5 text-foreground/60">
                <Icon size={16} />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">{opt.title}</p>
                <p className="text-xs text-foreground/50">{opt.description}</p>
              </div>
            </button>
          )
        })}
        <button type="button" onClick={() => setSelecting(false)} className="text-sm text-foreground/50">
          Отмена
        </button>
        {currentWeightKg === null && (
          <p className="text-xs text-amber-400">Добавь вес, чтобы сменить цель — он нужен для расчёта КБЖУ.</p>
        )}
      </div>

      {pendingGoal && currentWeightKg !== null && (
        <ConfirmModal
          title="Сменить цель?"
          message={`Сменить цель на «${GOAL_OPTIONS.find((g) => g.value === pendingGoal)?.title}»? Целевые КБЖУ будут пересчитаны.`}
          confirmLabel={saving ? 'Сохраняем…' : 'Сменить'}
          disabled={saving}
          onCancel={() => setPendingGoal(null)}
          onConfirm={async () => {
            setSaving(true)
            await onChangeGoal(pendingGoal, currentWeightKg, latestBodyFatPct)
            setSaving(false)
            setPendingGoal(null)
            setSelecting(false)
          }}
        />
      )}
    </>
  )
}

interface TargetsSettingProps {
  profile: Profile
  currentWeightKg: number | null
  onUpdateTargets: (targets: TargetInput) => Promise<void>
  onResetTargets: (currentWeightKg: number) => Promise<TargetInput>
}

function TargetsSetting({ profile, currentWeightKg, onUpdateTargets, onResetTargets }: TargetsSettingProps) {
  const [editing, setEditing] = useState(false)
  const [calories, setCalories] = useState(String(profile.target_calories))
  const [protein, setProtein] = useState(String(profile.target_protein))
  const [fat, setFat] = useState(String(profile.target_fat))
  const [carbs, setCarbs] = useState(String(profile.target_carbs))
  const [saving, setSaving] = useState(false)
  const [resetting, setResetting] = useState(false)

  async function handleReset() {
    if (currentWeightKg === null || resetting) return
    setResetting(true)
    const targets = await onResetTargets(currentWeightKg)
    setCalories(String(targets.target_calories))
    setProtein(String(targets.target_protein))
    setFat(String(targets.target_fat))
    setCarbs(String(targets.target_carbs))
    setResetting(false)
  }

  if (!editing) {
    return (
      <div className="flex flex-col gap-3">
        <div className="grid grid-cols-4 gap-2 text-center">
          <MiniStat label="Ккал" value={profile.target_calories} />
          <MiniStat label="Б" value={profile.target_protein} />
          <MiniStat label="Ж" value={profile.target_fat} />
          <MiniStat label="У" value={profile.target_carbs} />
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => {
              setCalories(String(profile.target_calories))
              setProtein(String(profile.target_protein))
              setFat(String(profile.target_fat))
              setCarbs(String(profile.target_carbs))
              setEditing(true)
            }}
            className="min-h-[40px] flex-1 rounded-xl border border-border text-sm text-foreground"
          >
            Редактировать
          </button>
          <button
            type="button"
            onClick={handleReset}
            disabled={resetting || currentWeightKg === null}
            className="min-h-[40px] flex-1 rounded-xl border border-border text-sm text-foreground disabled:opacity-40"
          >
            {resetting ? 'Считаем…' : 'Сбросить к расчётным'}
          </button>
        </div>
      </div>
    )
  }

  const values = [calories, protein, fat, carbs]
  const valid = values.every((v) => {
    const n = parseDecimal(v)
    return !Number.isNaN(n) && n >= 0
  })

  async function handleSave() {
    if (!valid) return
    setSaving(true)
    await onUpdateTargets({
      target_calories: Math.round(parseDecimal(calories)),
      target_protein: Math.round(parseDecimal(protein)),
      target_fat: Math.round(parseDecimal(fat)),
      target_carbs: Math.round(parseDecimal(carbs)),
    })
    setSaving(false)
    setEditing(false)
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-2">
        <LabeledInput label="Калории" value={calories} onChange={setCalories} />
        <LabeledInput label="Белки" value={protein} onChange={setProtein} />
        <LabeledInput label="Жиры" value={fat} onChange={setFat} />
        <LabeledInput label="Углеводы" value={carbs} onChange={setCarbs} />
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setEditing(false)}
          className="min-h-[40px] flex-1 rounded-xl border border-border text-sm text-foreground"
        >
          Отмена
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={!valid || saving}
          className="min-h-[40px] flex-1 rounded-xl bg-accent text-sm font-medium text-background disabled:opacity-40"
        >
          {saving ? 'Сохраняем…' : 'Сохранить'}
        </button>
      </div>
    </div>
  )
}

function LabeledInput({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs text-foreground/50">{label}</label>
      <input type="text" inputMode="decimal" value={value} onChange={(e) => onChange(e.target.value)} className={inputClasses} />
    </div>
  )
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-col gap-0.5 rounded-xl bg-background p-2">
      <span className="text-[10px] text-foreground/50">{label}</span>
      <span className="text-sm font-semibold text-foreground">{value}</span>
    </div>
  )
}

function TargetWeightSetting({
  value,
  onSave,
  onClear,
}: {
  value: number | null
  onSave: (kg: number) => Promise<void>
  onClear: () => Promise<void>
}) {
  const [input, setInput] = useState(value !== null ? String(value) : '')
  const [saving, setSaving] = useState(false)

  const parsed = parseDecimal(input)
  const valid = input.trim() !== '' && !Number.isNaN(parsed) && parsed >= 30 && parsed <= 300

  async function handleSave() {
    if (!valid) return
    setSaving(true)
    await onSave(parsed)
    setSaving(false)
  }

  return (
    <div className="flex flex-col gap-2">
      <input
        type="text"
        inputMode="decimal"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="Например, 75"
        className={inputClasses}
      />
      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleSave}
          disabled={!valid || saving}
          className="min-h-[40px] flex-1 rounded-xl bg-accent text-sm font-medium text-background disabled:opacity-40"
        >
          {saving ? 'Сохраняем…' : 'Сохранить'}
        </button>
        {value !== null && (
          <button
            type="button"
            onClick={onClear}
            className="min-h-[40px] flex-1 rounded-xl border border-border text-sm text-foreground"
          >
            Убрать цель
          </button>
        )}
      </div>
    </div>
  )
}

interface TrainingPlanSettingProps {
  profile: Profile
  latestBodyFatPct: number | null
  onRecalculate: (bodyFatPct: number) => Promise<unknown>
}

function TrainingPlanSetting({ profile, latestBodyFatPct, onRecalculate }: TrainingPlanSettingProps) {
  const [recalculating, setRecalculating] = useState(false)

  async function handleRecalculate() {
    if (latestBodyFatPct === null || recalculating) return
    setRecalculating(true)
    await onRecalculate(latestBodyFatPct)
    setRecalculating(false)
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-lg font-semibold text-foreground">
        {profile.recommended_strength} силовых + {profile.recommended_cardio} кардио в неделю
      </p>
      <p className="text-xs text-foreground/50">Рассчитано на основе твоей цели и процента жира</p>
      <button
        type="button"
        onClick={handleRecalculate}
        disabled={recalculating || latestBodyFatPct === null}
        className="min-h-[44px] rounded-xl border border-border text-sm font-medium text-foreground disabled:opacity-40"
      >
        {recalculating ? 'Пересчитываем…' : 'Пересчитать'}
      </button>
      {latestBodyFatPct === null && (
        <p className="text-xs text-foreground/40">Нужен замер талии и шеи, чтобы рассчитать % жира</p>
      )}
    </div>
  )
}

const THEME_OPTIONS: { value: Theme; label: string; icon: LucideIcon }[] = [
  { value: 'dark', label: 'Тёмная', icon: Moon },
  { value: 'light', label: 'Светлая', icon: Sun },
]

function ThemeSetting() {
  const { theme, setTheme } = useTheme()

  return (
    <div className="grid grid-cols-2 gap-2">
      {THEME_OPTIONS.map((opt) => {
        const Icon = opt.icon
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => setTheme(opt.value)}
            className={`flex min-h-[44px] items-center justify-center gap-2 rounded-xl border text-sm font-medium transition ${
              theme === opt.value
                ? 'border-accent bg-accent/15 text-accent'
                : 'border-border bg-background text-foreground'
            }`}
          >
            <Icon size={16} /> {opt.label}
          </button>
        )
      })}
    </div>
  )
}

function DataSetting({ onExport, onSignOut }: { onExport: () => Promise<void>; onSignOut: () => Promise<void> }) {
  const [exporting, setExporting] = useState(false)

  async function handleExport() {
    setExporting(true)
    try {
      await onExport()
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={handleExport}
        disabled={exporting}
        className="flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-border text-sm font-medium text-foreground disabled:opacity-40"
      >
        <Download size={16} /> {exporting ? 'Экспортируем…' : 'Экспорт данных'}
      </button>
      <button
        type="button"
        onClick={onSignOut}
        className="flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-red-500/30 text-sm font-medium text-red-400"
      >
        <LogOut size={16} /> Выйти из аккаунта
      </button>
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

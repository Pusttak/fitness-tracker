import { useState, type FormEvent } from 'react'
import { Navigate } from 'react-router-dom'
import { Dumbbell } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'

export function LoginPage() {
  const { user, loading, signIn, signUp } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const [showForgotPassword, setShowForgotPassword] = useState(false)
  const [resetEmail, setResetEmail] = useState('')
  const [resetError, setResetError] = useState<string | null>(null)
  const [resetSubmitting, setResetSubmitting] = useState(false)
  const [resetSent, setResetSent] = useState(false)

  if (!loading && user) {
    return <Navigate to="/" replace />
  }

  async function handleSubmit(e: FormEvent, mode: 'signIn' | 'signUp') {
    e.preventDefault()
    setError(null)
    setSubmitting(true)

    const action = mode === 'signIn' ? signIn : signUp
    const { error: authError } = await action(email, password)

    if (authError) {
      setError(authError)
    }
    setSubmitting(false)
  }

  async function handleResetPassword(e: FormEvent) {
    e.preventDefault()
    setResetError(null)
    setResetSubmitting(true)

    const { error: resetErr } = await supabase.auth.resetPasswordForEmail(resetEmail, {
      redirectTo: window.location.origin + window.location.pathname,
    })

    setResetSubmitting(false)

    if (resetErr) {
      setResetError(resetErr.message)
      return
    }

    setResetSent(true)
  }

  if (showForgotPassword) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-8 px-6">
        <div className="flex flex-col items-center gap-2">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/15 text-accent">
            <Dumbbell size={28} />
          </div>
          <h1 className="text-2xl font-semibold text-foreground">Сброс пароля</h1>
          <p className="text-sm text-foreground/60">Укажите email для отправки ссылки</p>
        </div>

        {resetSent ? (
          <p className="text-center text-sm text-foreground/70">
            Ссылка отправлена на {resetEmail}
          </p>
        ) : (
          <form className="flex w-full flex-col gap-4" onSubmit={handleResetPassword}>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="resetEmail" className="text-sm text-foreground/70">
                Email
              </label>
              <input
                id="resetEmail"
                type="email"
                autoComplete="email"
                required
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                className="min-h-[44px] rounded-xl border border-border bg-surface px-4 text-foreground outline-none focus:border-accent"
                placeholder="you@example.com"
              />
            </div>

            {resetError && <p className="text-sm text-red-400">{resetError}</p>}

            <button
              type="submit"
              disabled={resetSubmitting}
              className="min-h-[44px] rounded-xl bg-accent font-medium text-background transition hover:bg-accent-hover disabled:opacity-50"
            >
              Отправить ссылку для сброса
            </button>
          </form>
        )}

        <button
          type="button"
          onClick={() => {
            setShowForgotPassword(false)
            setResetSent(false)
            setResetError(null)
          }}
          className="text-sm text-foreground/60 underline"
        >
          Назад ко входу
        </button>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 px-6">
      <div className="flex flex-col items-center gap-2">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/15 text-accent">
          <Dumbbell size={28} />
        </div>
        <h1 className="text-2xl font-semibold text-foreground">FitTracker</h1>
        <p className="text-sm text-foreground/60">Войдите, чтобы продолжить</p>
      </div>

      <form className="flex w-full flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="email" className="text-sm text-foreground/70">
            Email
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="min-h-[44px] rounded-xl border border-border bg-surface px-4 text-foreground outline-none focus:border-accent"
            placeholder="you@example.com"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="password" className="text-sm text-foreground/70">
            Пароль
          </label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="min-h-[44px] rounded-xl border border-border bg-surface px-4 text-foreground outline-none focus:border-accent"
            placeholder="••••••••"
          />
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}

        <div className="flex flex-col gap-3 pt-2">
          <button
            type="submit"
            onClick={(e) => handleSubmit(e, 'signIn')}
            disabled={submitting}
            className="min-h-[44px] rounded-xl bg-accent font-medium text-background transition hover:bg-accent-hover disabled:opacity-50"
          >
            Войти
          </button>
          <button
            type="button"
            onClick={(e) => handleSubmit(e, 'signUp')}
            disabled={submitting}
            className="min-h-[44px] rounded-xl border border-border font-medium text-foreground transition hover:border-accent disabled:opacity-50"
          >
            Зарегистрироваться
          </button>
        </div>

        <button
          type="button"
          onClick={() => setShowForgotPassword(true)}
          className="text-sm text-foreground/60 underline"
        >
          Забыл пароль?
        </button>
      </form>
    </div>
  )
}

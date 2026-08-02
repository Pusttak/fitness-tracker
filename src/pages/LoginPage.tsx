import { useState, type FormEvent } from 'react'
import { Navigate } from 'react-router-dom'
import { Dumbbell } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

export function LoginPage() {
  const { user, loading, signIn, signUp } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

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
      </form>
    </div>
  )
}

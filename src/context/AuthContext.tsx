import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import type { Profile } from '../types/database'

interface AuthContextValue {
  user: User | null
  session: Session | null
  loading: boolean
  profile: Profile | null
  profileLoading: boolean
  signIn: (email: string, password: string) => Promise<{ error: string | null }>
  signUp: (email: string, password: string) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [profileLoading, setProfileLoading] = useState(true)

  const user = session?.user ?? null

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })

    const { data: listener } = supabase.auth.onAuthStateChange((event, newSession) => {
      // TOKEN_REFRESHED — фоновое обновление токена (например, при возврате на вкладку
      // браузера). Supabase-клиент уже обновил токен внутри себя, а обновление React-состояния
      // здесь создаёт новый объект session/user и роняет форму AuthContext.Provider, что
      // ре-рендерит и размонтирует всё дерево (см. ProtectedRoute) — теряя состояние открытых форм.
      if (event === 'TOKEN_REFRESHED') {
        return
      }

      setSession(newSession)
      setLoading(false)
    })

    return () => listener.subscription.unsubscribe()
  }, [])

  const fetchProfile = useCallback(async (userId: string): Promise<Profile | null> => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle()

    return (data as Profile | null) ?? null
  }, [])

  useEffect(() => {
    if (!user) {
      setProfile(null)
      setProfileLoading(false)
      return
    }

    const userId = user.id
    let cancelled = false
    setProfileLoading(true)

    fetchProfile(userId).then((data) => {
      if (cancelled) return
      setProfile(data)
      setProfileLoading(false)
    })

    return () => {
      cancelled = true
    }
    // Зависим от user.id (строка), а не от объекта user — иначе эффект перезапускается
    // при каждом обновлении session (например, TOKEN_REFRESHED даёт новый объект user
    // с тем же id), и профиль лишний раз перезагружается.
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, fetchProfile])

  const refreshProfile = useCallback(async () => {
    if (!user) return
    const data = await fetchProfile(user.id)
    setProfile(data)
  }, [user, fetchProfile])

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error: error?.message ?? null }
  }, [])

  const signUp = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({ email, password })
    return { error: error?.message ?? null }
  }, [])

  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      session,
      loading,
      profile,
      profileLoading,
      signIn,
      signUp,
      signOut,
      refreshProfile,
    }),
    [user, session, loading, profile, profileLoading, signIn, signUp, signOut, refreshProfile],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return ctx
}

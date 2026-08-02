import { useEffect } from 'react'
import { HashRouter, Routes, Route } from 'react-router-dom'
import { supabase } from './lib/supabase'
import { AuthProvider } from './context/AuthContext'
import { ProtectedRoute } from './components/ProtectedRoute'
import { Layout } from './components/Layout'
import { OfflineBanner } from './components/OfflineBanner'
import { LoginPage } from './pages/LoginPage'
import { OnboardingPage } from './pages/OnboardingPage'
import { ResetPasswordPage } from './pages/ResetPasswordPage'
import { AddMealPage } from './pages/AddMealPage'
import { RecipeEditorPage } from './pages/RecipeEditorPage'
import { DashboardPage } from './pages/DashboardPage'
import { WeightPage } from './pages/WeightPage'
import { MeasurementsPage } from './pages/MeasurementsPage'
import { WorkoutsPage } from './pages/WorkoutsPage'
import { ProgressPage } from './pages/ProgressPage'
import { ProductsPage } from './pages/ProductsPage'
import { SettingsPage } from './pages/SettingsPage'

function App() {
  useEffect(() => {
    // Supabase передаёт токены через hash: #access_token=...&type=recovery
    // HashRouter использует hash для роутинга: #/weight
    // Нужно перехватить Supabase hash до роутера

    const hash = window.location.hash

    if (hash && hash.includes('access_token')) {
      // Это redirect от Supabase, не роут приложения
      // Извлекаем параметры
      const params = new URLSearchParams(hash.replace('#', ''))
      const accessToken = params.get('access_token')
      const refreshToken = params.get('refresh_token')
      const type = params.get('type')

      if (accessToken && refreshToken) {
        supabase.auth
          .setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          })
          .then(() => {
            // Очистить hash и перенаправить
            if (type === 'recovery') {
              // Показать форму смены пароля
              window.location.hash = '#/reset-password'
            } else {
              window.location.hash = '#/'
            }
          })
      }
    }
  }, [])

  return (
    <HashRouter>
      <AuthProvider>
        <OfflineBanner />
        <Routes>
          <Route path="/login" element={<LoginPage />} />

          <Route element={<ProtectedRoute />}>
            <Route path="/onboarding" element={<OnboardingPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/add-meal" element={<AddMealPage />} />
            <Route path="/recipes/new" element={<RecipeEditorPage />} />
            <Route path="/recipes/:id" element={<RecipeEditorPage />} />

            <Route element={<Layout />}>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/weight" element={<WeightPage />} />
              <Route path="/measurements" element={<MeasurementsPage />} />
              <Route path="/workouts" element={<WorkoutsPage />} />
              <Route path="/progress" element={<ProgressPage />} />
              <Route path="/products" element={<ProductsPage />} />
              <Route path="/settings" element={<SettingsPage />} />
            </Route>
          </Route>
        </Routes>
      </AuthProvider>
    </HashRouter>
  )
}

export default App

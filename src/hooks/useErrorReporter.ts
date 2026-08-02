import { useNavigate } from 'react-router-dom'
import { useToast } from '../context/ToastContext'
import { useAuth } from '../context/AuthContext'
import { getErrorToastMessage, isAuthError, logError } from '../lib/errors'

/**
 * Единая точка обработки ошибок Supabase: логирует с контекстом, показывает тост
 * и разлогинивает пользователя при сбое авторизации (истёкшая/невалидная сессия).
 */
export function useErrorReporter() {
  const { showToast } = useToast()
  const { signOut } = useAuth()
  const navigate = useNavigate()

  async function reportError(context: string, error: unknown, details?: Record<string, unknown>) {
    logError(context, error, details)

    if (isAuthError(error)) {
      showToast('Сессия истекла. Войди снова.', 'error')
      await signOut()
      navigate('/login', { replace: true })
      return
    }

    showToast(getErrorToastMessage(error), 'error')
  }

  return { reportError }
}

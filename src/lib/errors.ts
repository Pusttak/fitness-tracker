/** Определяет, похожа ли ошибка на сбой авторизации (истёкшая/невалидная сессия) */
export function isAuthError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  const err = error as { status?: number; code?: string; message?: string }
  if (err.status === 401 || err.status === 403) return true
  if (err.code === 'PGRST301') return true
  const message = err.message?.toLowerCase() ?? ''
  return message.includes('jwt') || message.includes('not authenticated')
}

/** Похожа ли ошибка на сбой сети (offline, DNS, CORS-обрыв соединения) */
export function isNetworkError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  const err = error as { message?: string }
  const message = err.message?.toLowerCase() ?? ''
  return message.includes('failed to fetch') || message.includes('network')
}

/** Готовое сообщение для тоста об ошибке на основе её типа */
export function getErrorToastMessage(error: unknown): string {
  if (isNetworkError(error)) return 'Нет соединения. Проверь интернет.'
  return 'Что-то пошло не так. Попробуй ещё раз.'
}

/** Логирует ошибку в консоль с контекстом операции для отладки */
export function logError(context: string, error: unknown, details?: Record<string, unknown>) {
  console.error(`[${context}]`, error, details ?? '')
}

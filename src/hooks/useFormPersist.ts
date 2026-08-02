import { useCallback, useEffect, useState } from 'react'

/**
 * Хранит черновик формы в sessionStorage, чтобы данные не терялись при
 * неожиданном размонтировании страницы (например, реальная навигация назад/вперёд).
 */
export function useFormPersist<T>(key: string, initialValues: T) {
  const [values, setValues] = useState<T>(() => {
    try {
      const saved = sessionStorage.getItem(key)
      return saved ? (JSON.parse(saved) as T) : initialValues
    } catch {
      return initialValues
    }
  })

  useEffect(() => {
    sessionStorage.setItem(key, JSON.stringify(values))
  }, [key, values])

  const clearPersisted = useCallback(() => {
    sessionStorage.removeItem(key)
  }, [key])

  return { values, setValues, clearPersisted }
}

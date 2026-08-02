import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react'
import { CheckCircle, XCircle } from 'lucide-react'

type ToastKind = 'success' | 'error'

interface ToastState {
  id: number
  message: string
  kind: ToastKind
}

interface ToastContextValue {
  showToast: (message: string, kind?: ToastKind) => void
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined)

const TOAST_DURATION_MS = 2000

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastState | null>(null)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const idRef = useRef(0)

  const showToast = useCallback((message: string, kind: ToastKind = 'success') => {
    idRef.current += 1
    setToast({ id: idRef.current, message, kind })

    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    timeoutRef.current = setTimeout(() => {
      setToast(null)
    }, TOAST_DURATION_MS)
  }, [])

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {toast && (
        <div
          key={toast.id}
          className="fixed left-1/2 top-4 z-[100] w-[calc(100%-2rem)] max-w-app -translate-x-1/2 animate-slide-down"
        >
          <div
            className={`flex items-center gap-2 rounded-xl border px-4 py-3 text-sm font-medium shadow-xl ${
              toast.kind === 'success'
                ? 'border-accent/30 bg-accent text-background'
                : 'border-red-400/30 bg-red-500 text-white'
            }`}
          >
            {toast.kind === 'success' ? <CheckCircle size={18} /> : <XCircle size={18} />}
            {toast.message}
          </div>
        </div>
      )}
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) {
    throw new Error('useToast must be used within ToastProvider')
  }
  return ctx
}

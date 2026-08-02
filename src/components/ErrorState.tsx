import { AlertCircle } from 'lucide-react'

export function ErrorState({ message, onRetry }: { message?: string | null; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-red-400/30 bg-red-400/10 p-6 text-center">
      <AlertCircle size={32} className="text-red-400" />
      <p className="text-sm font-medium text-foreground">Не удалось загрузить данные</p>
      {message && <p className="text-xs text-foreground/50">{message}</p>}
      <button
        type="button"
        onClick={onRetry}
        className="min-h-[44px] rounded-xl bg-accent px-5 font-medium text-background transition hover:bg-accent-hover"
      >
        Попробовать снова
      </button>
    </div>
  )
}

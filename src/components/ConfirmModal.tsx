export function ConfirmModal({
  title,
  message,
  confirmText = 'Удалить',
  cancelText = 'Отмена',
  danger = true,
  onConfirm,
  onCancel,
}: {
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  danger?: boolean
  onConfirm: () => void
  onCancel: () => void
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
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`min-h-[44px] flex-1 rounded-xl font-medium ${danger ? 'bg-red-500 text-white' : 'bg-accent text-background'}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}

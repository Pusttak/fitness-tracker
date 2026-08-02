export function UnsavedChangesModal({ onStay, onLeave }: { onStay: () => void; onLeave: () => void }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/50 px-3 pb-6 sm:items-center" onClick={onStay}>
      <div
        className="w-full max-w-app rounded-2xl border border-border bg-surface p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="pb-4 text-center text-base font-medium text-foreground">
          Данные не сохранены. Выйти?
        </p>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onStay}
            className="min-h-[44px] flex-1 rounded-xl border border-border font-medium text-foreground"
          >
            Остаться
          </button>
          <button
            type="button"
            onClick={onLeave}
            className="min-h-[44px] flex-1 rounded-xl bg-red-500 font-medium text-white"
          >
            Выйти
          </button>
        </div>
      </div>
    </div>
  )
}

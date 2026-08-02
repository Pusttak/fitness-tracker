import { useState, type ReactNode, type TouchEvent } from 'react'
import type { LucideIcon } from 'lucide-react'

export interface SwipeAction {
  label: string
  icon: LucideIcon
  colorClass: string
  onClick: () => void
}

const ACTION_WIDTH = 72

export function SwipeActions({ children, actions }: { children: ReactNode; actions: SwipeAction[] }) {
  const revealWidth = ACTION_WIDTH * actions.length
  const [translateX, setTranslateX] = useState(0)
  const [startX, setStartX] = useState<number | null>(null)
  const [dragging, setDragging] = useState(false)

  function handleTouchStart(e: TouchEvent<HTMLDivElement>) {
    setStartX(e.touches[0].clientX)
    setDragging(true)
  }

  function handleTouchMove(e: TouchEvent<HTMLDivElement>) {
    if (startX === null) return
    const base = translateX === -revealWidth ? -revealWidth : 0
    const delta = e.touches[0].clientX - startX
    const next = Math.min(0, Math.max(-revealWidth, base + delta))
    setTranslateX(next)
  }

  function handleTouchEnd() {
    setStartX(null)
    setDragging(false)
    setTranslateX((x) => (x < -revealWidth / 2 ? -revealWidth : 0))
  }

  return (
    <div className="relative overflow-hidden rounded-xl">
      <div className="absolute inset-y-0 right-0 flex">
        {actions.map((action) => (
          <button
            key={action.label}
            type="button"
            onClick={() => {
              setTranslateX(0)
              action.onClick()
            }}
            style={{ width: ACTION_WIDTH }}
            className={`flex flex-col items-center justify-center gap-1 text-xs font-medium ${action.colorClass}`}
          >
            <action.icon size={18} />
            {action.label}
          </button>
        ))}
      </div>
      <div
        className="relative bg-surface"
        style={{
          transform: `translateX(${translateX}px)`,
          transition: dragging ? 'none' : 'transform 0.2s ease',
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {children}
      </div>
    </div>
  )
}

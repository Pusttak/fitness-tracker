import { useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import {
  Home,
  Scale,
  Ruler,
  Dumbbell,
  MoreHorizontal,
  BarChart3,
  UtensilsCrossed,
  Settings,
  type LucideIcon,
} from 'lucide-react'

const tabs = [
  { to: '/', label: 'Сегодня', icon: Home },
  { to: '/weight', label: 'Вес', icon: Scale },
  { to: '/measurements', label: 'Замеры', icon: Ruler },
  { to: '/workouts', label: 'Тренировки', icon: Dumbbell },
]

const moreRoutes = ['/progress', '/products', '/settings']

const moreItems: { to: string; label: string; icon: LucideIcon }[] = [
  { to: '/progress', label: 'Прогресс', icon: BarChart3 },
  { to: '/products', label: 'Продукты и рецепты', icon: UtensilsCrossed },
  { to: '/settings', label: 'Настройки', icon: Settings },
]

export function BottomNav() {
  const [moreOpen, setMoreOpen] = useState(false)
  const location = useLocation()
  const isMoreActive = moreRoutes.includes(location.pathname)

  return (
    <>
      {moreOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50"
          onClick={() => setMoreOpen(false)}
        />
      )}

      {moreOpen && (
        <div className="fixed bottom-16 left-1/2 z-50 w-full max-w-app -translate-x-1/2 px-3">
          <div className="flex flex-col gap-2">
            {moreItems.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                onClick={() => setMoreOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-2xl border border-border bg-surface p-4 shadow-xl transition ${
                    isActive ? 'text-accent' : 'text-foreground'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <div
                      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
                        isActive ? 'bg-accent/15 text-accent' : 'bg-overlay/5 text-foreground/70'
                      }`}
                    >
                      <Icon size={22} />
                    </div>
                    <span className="text-base font-medium">{label}</span>
                  </>
                )}
              </NavLink>
            ))}
          </div>
        </div>
      )}

      <nav
        className="fixed bottom-0 left-1/2 z-30 w-full max-w-app -translate-x-1/2 border-t border-border bg-surface"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="flex items-stretch justify-around">
          {tabs.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              onClick={(e) => {
                setMoreOpen(false)
                if (location.pathname === to) {
                  e.preventDefault()
                  window.scrollTo({ top: 0, behavior: 'smooth' })
                }
              }}
              className={({ isActive }) =>
                `flex min-h-[44px] flex-1 flex-col items-center justify-center gap-1 py-2 text-xs ${
                  isActive ? 'text-accent' : 'text-foreground/60'
                }`
              }
            >
              <Icon size={22} />
              <span>{label}</span>
            </NavLink>
          ))}

          <button
            type="button"
            onClick={() => setMoreOpen((open) => !open)}
            className={`flex min-h-[44px] flex-1 flex-col items-center justify-center gap-1 py-2 text-xs ${
              isMoreActive || moreOpen ? 'text-accent' : 'text-foreground/60'
            }`}
          >
            <MoreHorizontal size={22} />
            <span>Ещё</span>
          </button>
        </div>
      </nav>
    </>
  )
}

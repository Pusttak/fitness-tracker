import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

interface LayoutChromeContextValue {
  bottomNavHidden: boolean
  setBottomNavHidden: (hidden: boolean) => void
}

const LayoutChromeContext = createContext<LayoutChromeContextValue | undefined>(undefined)

export function LayoutChromeProvider({ children }: { children: ReactNode }) {
  const [bottomNavHidden, setBottomNavHidden] = useState(false)
  return (
    <LayoutChromeContext.Provider value={{ bottomNavHidden, setBottomNavHidden }}>
      {children}
    </LayoutChromeContext.Provider>
  )
}

function useLayoutChrome() {
  const ctx = useContext(LayoutChromeContext)
  if (!ctx) {
    throw new Error('useLayoutChrome must be used within LayoutChromeProvider')
  }
  return ctx
}

/** Скрывает нижнюю навигацию, пока смонтирован вызывающий экран/форма */
export function useHideBottomNav(hidden: boolean) {
  const { setBottomNavHidden } = useLayoutChrome()

  useEffect(() => {
    if (!hidden) return
    setBottomNavHidden(true)
    return () => setBottomNavHidden(false)
  }, [hidden, setBottomNavHidden])
}

export { useLayoutChrome }

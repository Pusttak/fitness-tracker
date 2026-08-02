import { Outlet } from 'react-router-dom'
import { BottomNav } from './BottomNav'
import { LayoutChromeProvider, useLayoutChrome } from '../context/LayoutChromeContext'

export function Layout() {
  return (
    <LayoutChromeProvider>
      <LayoutInner />
    </LayoutChromeProvider>
  )
}

function LayoutInner() {
  const { bottomNavHidden } = useLayoutChrome()

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <main className={bottomNavHidden ? 'flex-1' : 'flex-1 pb-20'}>
        <Outlet />
      </main>
      {!bottomNavHidden && <BottomNav />}
    </div>
  )
}

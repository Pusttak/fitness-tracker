import { useEffect, useState } from 'react'
import { WifiOff } from 'lucide-react'

export function OfflineBanner() {
  const [online, setOnline] = useState(() => navigator.onLine)

  useEffect(() => {
    function handleOnline() {
      setOnline(true)
    }
    function handleOffline() {
      setOnline(false)
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  if (online) return null

  return (
    <div className="fixed left-1/2 top-0 z-[90] w-full max-w-app -translate-x-1/2 bg-amber-500 px-4 py-2 text-center text-sm font-medium text-background">
      <div className="flex items-center justify-center gap-2">
        <WifiOff size={16} />
        Офлайн. Данные будут синхронизированы при подключении.
      </div>
    </div>
  )
}

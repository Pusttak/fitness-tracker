import { useRef, useState } from 'react'

export function useDirtyForm() {
  const [isDirty, setIsDirty] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const pendingNavigation = useRef<(() => void) | null>(null)

  function markDirty() {
    setIsDirty(true)
  }

  function markClean() {
    setIsDirty(false)
  }

  function handleBack(navigateFn: () => void) {
    if (isDirty) {
      pendingNavigation.current = navigateFn
      setShowConfirm(true)
    } else {
      navigateFn()
    }
  }

  function confirmLeave() {
    setShowConfirm(false)
    setIsDirty(false)
    pendingNavigation.current?.()
  }

  function cancelLeave() {
    setShowConfirm(false)
    pendingNavigation.current = null
  }

  return { isDirty, markDirty, markClean, handleBack, showConfirm, confirmLeave, cancelLeave }
}

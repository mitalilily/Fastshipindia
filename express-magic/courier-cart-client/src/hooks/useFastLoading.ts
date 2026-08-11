import { useEffect, useState } from 'react'

/**
 * Keeps the initial loading hint brief so a slow API cannot block an entire page.
 * The request continues in the background and the page can render its empty/cached state.
 */
export function useFastLoading(isLoading: boolean, maxVisibleMs = 650) {
  const [showLoading, setShowLoading] = useState(isLoading)

  useEffect(() => {
    if (!isLoading) {
      setShowLoading(false)
      return undefined
    }

    setShowLoading(true)
    const timer = window.setTimeout(() => setShowLoading(false), maxVisibleMs)
    return () => window.clearTimeout(timer)
  }, [isLoading, maxVisibleMs])

  return showLoading
}

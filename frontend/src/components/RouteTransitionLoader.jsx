"use client"

import { useEffect, useRef, useState } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'

const TRANSITION_MS = 320
const SHOW_DELAY_MS = 60

function RouteTransitionLoader() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const firstRenderRef = useRef(true)
  const [visible, setVisible] = useState(false)
  const search = searchParams.toString()

  useEffect(() => {
    if (firstRenderRef.current) {
      firstRenderRef.current = false
      return
    }

    const showTimer = window.setTimeout(() => setVisible(true), SHOW_DELAY_MS)
    const hideTimer = window.setTimeout(() => setVisible(false), SHOW_DELAY_MS + TRANSITION_MS)

    return () => {
      window.clearTimeout(showTimer)
      window.clearTimeout(hideTimer)
    }
  }, [pathname, search])

  if (!visible) {
    return null
  }

  return (
    <div className="route-loader-overlay" role="status" aria-live="polite" aria-label="Loading page">
      <div className="route-loader-core">
        <span className="route-loader-ring" />
      </div>
      <p className="route-loader-text">Loading workspace</p>
    </div>
  )
}

export default RouteTransitionLoader

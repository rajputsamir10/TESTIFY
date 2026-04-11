import { GraduationCap } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'

const TRANSITION_MS = 520

function RouteTransitionLoader() {
  const location = useLocation()
  const firstRenderRef = useRef(true)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (firstRenderRef.current) {
      firstRenderRef.current = false
      return
    }

    const showTimer = window.setTimeout(() => setVisible(true), 0)
    const hideTimer = window.setTimeout(() => setVisible(false), TRANSITION_MS)

    return () => {
      window.clearTimeout(showTimer)
      window.clearTimeout(hideTimer)
    }
  }, [location.pathname, location.search, location.hash])

  if (!visible) {
    return null
  }

  return (
    <div className="route-loader-overlay" role="status" aria-live="polite" aria-label="Loading page">
      <div className="route-loader-core">
        <span className="route-loader-ring" />
        <GraduationCap className="route-loader-hat" />
      </div>
      <p className="route-loader-text">Loading workspace</p>
    </div>
  )
}

export default RouteTransitionLoader

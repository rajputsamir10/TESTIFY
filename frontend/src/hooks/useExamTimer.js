import { useEffect, useRef, useState } from 'react'
import { toast } from 'react-toastify'
import { studentAPI } from '../api/studentAPI'

function formatMMSS(totalSeconds) {
  const safeSeconds = Math.max(totalSeconds, 0)
  const mins = Math.floor(safeSeconds / 60)
  const secs = safeSeconds % 60
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
}

function useExamTimer(attemptId, active = false, onExpired) {
  const [remainingSeconds, setRemainingSeconds] = useState(0)
  const [loading, setLoading] = useState(false)
  const expiredRef = useRef(false)

  useEffect(() => {
    if (!active || !attemptId) {
      return undefined
    }

    let intervalId
    let mounted = true

    const bootstrap = async () => {
      setLoading(true)
      try {
        const { data } = await studentAPI.getRemainingTime(attemptId)
        if (!mounted) {
          return
        }
        setRemainingSeconds(Math.max(0, Number(data.remaining_seconds || 0)))
      } catch {
        if (mounted) {
          toast.error('Unable to fetch server timer.')
        }
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    bootstrap()

    intervalId = window.setInterval(() => {
      setRemainingSeconds((prev) => {
        const next = Math.max(0, prev - 1)
        if (next <= 0 && !expiredRef.current) {
          expiredRef.current = true
          onExpired?.()
        }
        return next
      })
    }, 1000)

    return () => {
      mounted = false
      window.clearInterval(intervalId)
    }
  }, [attemptId, active, onExpired])

  return {
    loading,
    remainingSeconds,
    remainingLabel: formatMMSS(remainingSeconds),
    danger: remainingSeconds <= 300,
  }
}

export default useExamTimer

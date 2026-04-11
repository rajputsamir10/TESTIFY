import { useEffect, useRef, useState } from 'react'
import { toast } from 'react-toastify'
import { studentAPI } from '../api/studentAPI'

function useAntiCheat(attemptId, onAutoSubmit, active = true) {
  const [violations, setViolations] = useState(0)
  const [isLocked, setIsLocked] = useState(false)
  const debounceRef = useRef(null)
  const processingRef = useRef(false)

  useEffect(() => {
    if (!active || !attemptId) {
      return undefined
    }

    const reportViolation = async () => {
      if (processingRef.current || isLocked) {
        return
      }

      processingRef.current = true
      try {
        const { data } = await studentAPI.recordViolation(attemptId)
        const violationCount = Number(data?.violation_count || 0)
        setViolations(violationCount)

        if (data?.auto_submitted) {
          setIsLocked(true)

          // Keep endpoint behavior explicit from client side as a hard enforcement signal.
          try {
            await studentAPI.autoSubmitAttempt(attemptId)
          } catch {
            // Backend may already have submitted from violation logic.
          }

          toast.error('Exam auto-submitted due to repeated tab switching.', {
            autoClose: false,
            closeOnClick: false,
          })
          onAutoSubmit?.('tab_violation')
          return
        }

        if (violationCount === 1) {
          toast.warning('Warning: Leaving the exam tab is not allowed. Next violation will auto-submit.', {
            autoClose: false,
            closeOnClick: false,
          })
        }
      } catch (error) {
        toast.error(error?.response?.data?.detail || 'Unable to register violation')
      } finally {
        processingRef.current = false
      }
    }

    const scheduleViolation = () => {
      if (debounceRef.current) {
        window.clearTimeout(debounceRef.current)
      }

      debounceRef.current = window.setTimeout(() => {
        void reportViolation()
      }, 300)
    }

    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        scheduleViolation()
      }
    }

    const onBlur = () => {
      scheduleViolation()
    }

    const preventClipboardOrMenu = (event) => {
      event.preventDefault()
    }

    const preventRestrictedKeys = (event) => {
      const key = String(event.key || '').toLowerCase()
      const ctrlShiftI = event.ctrlKey && event.shiftKey && key === 'i'
      const ctrlShiftJ = event.ctrlKey && event.shiftKey && key === 'j'
      const ctrlU = event.ctrlKey && key === 'u'
      const ctrlP = event.ctrlKey && key === 'p'
      const f12 = key === 'f12'

      if (ctrlShiftI || ctrlShiftJ || ctrlU || ctrlP || f12) {
        event.preventDefault()
      }
    }

    document.addEventListener('visibilitychange', onVisibilityChange)
    window.addEventListener('blur', onBlur)
    document.addEventListener('contextmenu', preventClipboardOrMenu)
    document.addEventListener('copy', preventClipboardOrMenu)
    document.addEventListener('paste', preventClipboardOrMenu)
    document.addEventListener('cut', preventClipboardOrMenu)
    document.addEventListener('keydown', preventRestrictedKeys)

    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange)
      window.removeEventListener('blur', onBlur)
      document.removeEventListener('contextmenu', preventClipboardOrMenu)
      document.removeEventListener('copy', preventClipboardOrMenu)
      document.removeEventListener('paste', preventClipboardOrMenu)
      document.removeEventListener('cut', preventClipboardOrMenu)
      document.removeEventListener('keydown', preventRestrictedKeys)

      if (debounceRef.current) {
        window.clearTimeout(debounceRef.current)
      }
    }
  }, [attemptId, active, isLocked, onAutoSubmit])

  return { violations, isLocked }
}

export default useAntiCheat

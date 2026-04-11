import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'react-toastify'
import { studentAPI } from '../api/studentAPI'
import { getStarterTemplate } from '../utils/codeTemplates'

function toStateFromServer(answerList) {
  const state = {}
  answerList.forEach((answer) => {
    const isCodingQuestion = answer.question_type === 'coding' || answer.question_type === 'dsa'
    const codeAnswer = answer.code_answer || (isCodingQuestion
      ? getStarterTemplate(answer.coding_language, answer.question_type)
      : '')

    state[answer.id] = {
      selected_option: answer.selected_option || null,
      text_answer: answer.text_answer || '',
      code_answer: codeAnswer,
      execution_result: answer.execution_result || {},
    }
  })
  return state
}

function useAnswerAutoSave(attemptId) {
  const [answers, setAnswers] = useState({})
  const timersRef = useRef({})
  const storageKey = useMemo(() => `attempt_${attemptId}_answers`, [attemptId])

  useEffect(() => {
    return () => {
      Object.values(timersRef.current).forEach((timerId) => window.clearTimeout(timerId))
      timersRef.current = {}
    }
  }, [])

  const hydrate = useCallback(async () => {
    if (!attemptId) {
      return []
    }

    try {
      const { data } = await studentAPI.getAttemptAnswers(attemptId)
      const fromServer = toStateFromServer(data)
      setAnswers(fromServer)
      localStorage.setItem(storageKey, JSON.stringify(fromServer))
      return data
    } catch {
      const local = localStorage.getItem(storageKey)
      if (local) {
        try {
          const parsed = JSON.parse(local)
          setAnswers(parsed)
        } catch {
          localStorage.removeItem(storageKey)
        }
      }
      return []
    }
  }, [attemptId, storageKey])

  const updateAnswer = useCallback((answerId, payload) => {
    const nextPayload = {
      selected_option: payload?.selected_option ?? null,
      text_answer: payload?.text_answer ?? '',
      code_answer: payload?.code_answer ?? '',
    }

    setAnswers((prev) => {
      const previousEntry = prev[answerId] || {}
      const next = {
        ...prev,
        [answerId]: {
          ...nextPayload,
          execution_result: previousEntry.execution_result || {},
        },
      }
      localStorage.setItem(storageKey, JSON.stringify(next))
      return next
    })

    if (timersRef.current[answerId]) {
      window.clearTimeout(timersRef.current[answerId])
    }

    timersRef.current[answerId] = window.setTimeout(async () => {
      try {
        await studentAPI.updateAnswer(answerId, nextPayload)
      } catch {
        toast.error('Auto-save failed for one answer.')
      }
    }, 800)
  }, [storageKey])

  return {
    answers,
    hydrate,
    updateAnswer,
  }
}

export default useAnswerAutoSave

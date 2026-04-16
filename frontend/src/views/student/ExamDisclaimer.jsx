"use client"

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { toast } from 'react-toastify'
import LoadingSpinner from '../../components/LoadingSpinner'
import { studentAPI } from '../../api/studentAPI'
import { getErrorMessage } from '../../utils/errors'

function formatCountdown(targetDateTime, nowDateTime) {
  const target = new Date(targetDateTime).getTime()
  const now = nowDateTime.getTime()
  const diffSeconds = Math.max(Math.floor((target - now) / 1000), 0)

  const hours = Math.floor(diffSeconds / 3600)
  const minutes = Math.floor((diffSeconds % 3600) / 60)
  const seconds = diffSeconds % 60
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

const RULES = [
  'You must not switch tabs or leave this window during the exam.',
  'Two tab-switch violations will auto-submit your exam immediately.',
  'Right-clicking, copying, and pasting are disabled during the exam.',
  'Your webcam will monitor face presence throughout the exam.',
  'If no face is detected, a proctoring violation will be recorded.',
  'Your exam timer starts immediately after you click "Start Exam".',
  'Once started, the exam cannot be paused.',
  'Ensure a stable internet connection before proceeding.',
]

function ExamDisclaimer() {
  const router = useRouter()
  const params = useParams()
  const examId = params?.id

  const [agreed, setAgreed] = useState(false)
  const [starting, setStarting] = useState(false)
  const [exam, setExam] = useState(null)
  const [loading, setLoading] = useState(true)
  const [now, setNow] = useState(new Date())

  useEffect(() => {
    const loadExam = async () => {
      if (exam) {
        return
      }

      setLoading(true)
      try {
        const { data } = await studentAPI.getAvailableExams()
        const found = (Array.isArray(data) ? data : []).find((item) => item.id === examId)
        if (!found) {
          toast.error('Exam is unavailable or outside your current exam window.')
          router.replace('/student/exams')
          return
        }
        setExam(found)
      } catch (error) {
        toast.error(getErrorMessage(error, 'Unable to load exam rules'))
        router.replace('/student/exams')
      } finally {
        setLoading(false)
      }
    }

    void loadExam()
  }, [exam, examId, router])

  useEffect(() => {
    const timerId = window.setInterval(() => {
      setNow(new Date())
    }, 1000)

    return () => {
      window.clearInterval(timerId)
    }
  }, [])

  const onStartExam = async () => {
    if (!agreed || !exam) {
      return
    }

    setStarting(true)
    try {
      const { data } = await studentAPI.startExam(exam.id)
      const attemptId = data?.id
      if (!attemptId) {
        throw new Error('Missing attempt id')
      }

      router.replace(`/student/exams/${exam.id}/attempt?attemptId=${attemptId}`)
    } catch (error) {
      toast.error(getErrorMessage(error, 'Unable to start exam'))
    } finally {
      setStarting(false)
    }
  }

  if (loading || !exam) {
    return <LoadingSpinner text="Loading disclaimer" />
  }

  const startsAt = new Date(exam.start_time)
  const isUpcoming = !Number.isNaN(startsAt.getTime()) && now < startsAt

  return (
    <div className="mx-auto max-w-2xl">
      <div className="card space-y-5 bg-white p-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Exam Rules & Agreement</h1>
          <p className="mt-1 text-sm text-slate-600">{exam.title}</p>
        </div>

        <div className="space-y-3">
          {RULES.map((rule, index) => (
            <div key={rule} className="flex gap-3 rounded-xl border border-slate-200 p-3">
              <span className="text-sm font-bold text-slate-700">{index + 1}.</span>
              <p className="text-sm text-slate-700">{rule}</p>
            </div>
          ))}
        </div>

        <label className="flex items-start gap-2 text-sm font-semibold text-slate-700">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(event) => setAgreed(event.target.checked)}
            className="mt-1"
          />
          I have read and understood all the rules above. I agree to proceed.
        </label>

        {isUpcoming && (
          <div className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
            Exam has not started yet. Please wait until the scheduled time. Starts in {formatCountdown(exam.start_time, now)}.
          </div>
        )}

        <div className="flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={() => router.replace(`/student/exams/${exam.id}/instructions`)}
            className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700"
            disabled={starting}
          >
            Back
          </button>
          <button
            type="button"
            onClick={onStartExam}
            className="rounded-xl bg-teal-700 px-4 py-2 text-sm font-bold text-white disabled:cursor-not-allowed disabled:bg-slate-400"
            disabled={!agreed || starting || isUpcoming}
          >
            {starting
              ? 'Starting...'
              : isUpcoming
                ? `Starts in ${formatCountdown(exam.start_time, now)}`
                : 'Start Exam'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default ExamDisclaimer

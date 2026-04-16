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

function ExamInstructions() {
  const router = useRouter()
  const params = useParams()
  const examId = params?.id

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
        toast.error(getErrorMessage(error, 'Unable to load exam instructions'))
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

  if (loading || !exam) {
    return <LoadingSpinner text="Loading exam instructions" />
  }

  const startsAt = new Date(exam.start_time)
  const isUpcoming = !Number.isNaN(startsAt.getTime()) && now < startsAt

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Exam Instructions</h1>
        <p className="text-sm text-slate-600">Review the exam details before moving to the rules agreement page.</p>
      </div>

      <div className="card p-5">
        <h2 className="text-xl font-bold text-slate-900">{exam.title}</h2>
        <p className="mt-2 text-sm text-slate-600">{exam.description || 'No description provided.'}</p>

        <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
          <div className="rounded-xl border border-slate-200 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Duration</p>
            <p className="mt-1 font-semibold text-slate-800">{exam.duration_minutes} mins</p>
          </div>
          <div className="rounded-xl border border-slate-200 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Total Marks</p>
            <p className="mt-1 font-semibold text-slate-800">{exam.total_marks}</p>
          </div>
          <div className="rounded-xl border border-slate-200 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Question Count</p>
            <p className="mt-1 font-semibold text-slate-800">{exam.question_count}</p>
          </div>
          <div className="rounded-xl border border-slate-200 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Pass Marks</p>
            <p className="mt-1 font-semibold text-slate-800">{exam.pass_marks}</p>
          </div>
        </div>

        {isUpcoming && (
          <div className="mt-4 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
            Exam has not started yet. Please wait until the scheduled time. Starts in {formatCountdown(exam.start_time, now)}.
          </div>
        )}

        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={() => router.push('/student/exams')}
            className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700"
          >
            Back
          </button>
          <button
            type="button"
            onClick={() => {
              router.push(`/student/exams/${exam.id}/disclaimer`)
            }}
            disabled={isUpcoming}
            className="rounded-xl bg-teal-700 px-4 py-2 text-sm font-bold text-white disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            {isUpcoming ? `Starts in ${formatCountdown(exam.start_time, now)}` : 'Proceed to Rules'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default ExamInstructions

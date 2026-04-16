"use client"

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'react-toastify'
import { studentAPI } from '../../api/studentAPI'
import LoadingSpinner from '../../components/LoadingSpinner'
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

function formatDateTime(value) {
  if (!value) {
    return '-'
  }

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    return '-'
  }

  return parsed.toLocaleString()
}

function AvailableExams() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [items, setItems] = useState([])
  const [now, setNow] = useState(new Date())

  const loadData = async () => {
    setLoading(true)
    try {
      const { data } = await studentAPI.getAvailableExams()
      setItems(Array.isArray(data) ? data : [])
    } catch (error) {
      toast.error(getErrorMessage(error, 'Unable to load available exams'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    const timerId = window.setInterval(() => {
      setNow(new Date())
    }, 1000)

    return () => {
      window.clearInterval(timerId)
    }
  }, [])

  const onProceed = (exam) => {
    const startsAt = new Date(exam.start_time)
    if (!Number.isNaN(startsAt.getTime()) && now < startsAt) {
      toast.info('Exam has not started yet. Please wait until the scheduled time.')
      return
    }

    router.push(`/student/exams/${exam.id}/instructions`)
  }

  if (loading) {
    return <LoadingSpinner text="Loading available exams" />
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Available exams</h1>
        <p className="text-sm text-slate-600">Only currently active and published exams are shown here.</p>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        {items.map((exam) => (
          <div key={exam.id} className="card p-4">
            {(() => {
              const startsAt = new Date(exam.start_time)
              const isUpcoming = !Number.isNaN(startsAt.getTime()) && now < startsAt

              return (
                <>
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <span className={`chip ${isUpcoming ? 'border-amber-300 text-amber-700' : 'border-emerald-300 text-emerald-700'}`}>
                      {isUpcoming ? 'Not Started' : 'Active'}
                    </span>
                    {isUpcoming && (
                      <span className="chip">Starts in: {formatCountdown(exam.start_time, now)}</span>
                    )}
                  </div>

                  <h2 className="text-lg font-bold text-slate-900">{exam.title}</h2>
                  <p className="mt-1 text-sm text-slate-600">{exam.description || 'No description'}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <span className="chip">Duration: {exam.duration_minutes} mins</span>
                    <span className="chip">Pass marks: {exam.pass_marks}</span>
                    <span className="chip">Starts: {formatDateTime(exam.start_time)}</span>
                    <span className="chip">Ends: {formatDateTime(exam.end_time)}</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => onProceed(exam)}
                    disabled={isUpcoming}
                    className="mt-4 rounded-xl bg-teal-700 px-4 py-2 text-sm font-bold text-white disabled:cursor-not-allowed disabled:bg-slate-400"
                  >
                    {isUpcoming ? 'Starts Soon' : 'View instructions'}
                  </button>
                </>
              )
            })()}
          </div>
        ))}

        {items.length === 0 && (
          <div className="card p-4">
            <p className="text-sm text-slate-500">No exam is available at the moment.</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default AvailableExams

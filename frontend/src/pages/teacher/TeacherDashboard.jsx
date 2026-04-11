import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'react-toastify'
import { examAPI } from '../../api/examAPI'
import LoadingSpinner from '../../components/LoadingSpinner'
import { getErrorMessage } from '../../utils/errors'

function TeacherDashboard() {
  const [loading, setLoading] = useState(true)
  const [exams, setExams] = useState([])
  const [performance, setPerformance] = useState([])

  useEffect(() => {
    const run = async () => {
      setLoading(true)
      try {
        const [{ data: examData }, { data: perfData }] = await Promise.all([
          examAPI.listTeacherExams(),
          examAPI.getPerformance(),
        ])
        setExams(Array.isArray(examData) ? examData : [])
        setPerformance(Array.isArray(perfData) ? perfData.slice(0, 5) : [])
      } catch (error) {
        toast.error(getErrorMessage(error, 'Unable to load teacher dashboard'))
      } finally {
        setLoading(false)
      }
    }

    run()
  }, [])

  if (loading) {
    return <LoadingSpinner text="Loading teacher dashboard" />
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Teacher dashboard</h1>
        <p className="text-sm text-slate-600">Manage exams, evaluate subjective answers, and monitor outcomes.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="card p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Total exams</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">{exams.length}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Published exams</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">{exams.filter((exam) => exam.is_published).length}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Top student records</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">{performance.length}</p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900">Recent exams</h2>
            <Link to="/teacher/create-exam" className="text-sm font-semibold text-teal-700">
              Create exam
            </Link>
          </div>
          <div className="space-y-2">
            {exams.slice(0, 5).map((exam) => (
              <div key={exam.id} className="rounded-xl border border-slate-200 p-3">
                <p className="font-semibold text-slate-800">{exam.title}</p>
                <p className="text-xs text-slate-500">{exam.department_name || 'Department'}</p>
                <div className="mt-2 flex gap-2">
                  <span className="chip">{exam.is_published ? 'Published' : 'Draft'}</span>
                  <span className="chip">{exam.duration_minutes} mins</span>
                </div>
              </div>
            ))}
            {exams.length === 0 && <p className="text-sm text-slate-500">No exams created yet.</p>}
          </div>
        </div>

        <div className="card p-4">
          <h2 className="text-lg font-bold text-slate-900">Top student performance</h2>
          <div className="mt-3 space-y-2">
            {performance.map((row) => (
              <div key={row.student_id} className="flex items-center justify-between rounded-xl border border-slate-200 p-3">
                <p className="text-sm font-semibold text-slate-800">{row.student__full_name || 'Student'}</p>
                <p className="text-sm text-slate-600">Avg {Number(row.avg_percentage || 0).toFixed(2)}%</p>
              </div>
            ))}
            {performance.length === 0 && <p className="text-sm text-slate-500">No performance data available.</p>}
          </div>
        </div>
      </div>
    </div>
  )
}

export default TeacherDashboard

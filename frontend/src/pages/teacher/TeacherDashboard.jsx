import { useEffect, useState } from 'react'
import { ClipboardCheck, FileText, Trophy } from 'lucide-react'
import { Link } from 'react-router-dom'
import { toast } from 'react-toastify'
import { examAPI } from '../../api/examAPI'
import LoadingSpinner from '../../components/LoadingSpinner'
import { getErrorMessage } from '../../utils/errors'

function StatCard({ title, value, badge, Icon, orbClass, iconClass, dotClass = 'bg-slate-300' }) {
  return (
    <div className="group relative overflow-hidden card rounded-3xl p-4 transition-all duration-500 hover:-translate-y-1">
      <div className={`absolute -right-8 -top-8 h-32 w-32 rounded-full ${orbClass} transition-transform duration-700 group-hover:scale-150`} />
      <div className="relative z-10 mb-4 flex items-center justify-between">
        <div className={`flex h-10 w-10 items-center justify-center rounded-2xl transition-all ${iconClass}`}>
          <Icon className="h-5 w-5" />
        </div>
        <span className="rounded-full bg-slate-100/70 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.15em] text-[#6c778c]">{badge}</span>
      </div>
      <p className="text-xs font-bold uppercase tracking-widest text-[#515c70]">{title}</p>
      <div className="mt-1.5 flex items-end gap-2">
        <p className="font-heading text-4xl font-black text-[#242f41]">{value}</p>
        <span className={`mb-3 h-2 w-2 rounded-full ${dotClass}`} />
      </div>
    </div>
  )
}

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
        <StatCard
          title="Total Exams"
          value={exams.length}
          badge="Library"
          Icon={ClipboardCheck}
          orbClass="bg-[#4a40e0]/5"
          iconClass="bg-indigo-50 text-[#4a40e0] group-hover:bg-[#4a40e0] group-hover:text-white"
        />
        <StatCard
          title="Published Exams"
          value={exams.filter((exam) => exam.is_published).length}
          badge="Live"
          Icon={FileText}
          orbClass="bg-[#702ae1]/5"
          iconClass="bg-purple-50 text-[#702ae1] group-hover:bg-[#702ae1] group-hover:text-white"
          dotClass="bg-[#702ae1]"
        />
        <StatCard
          title="Top Student Records"
          value={performance.length}
          badge="Leaderboard"
          Icon={Trophy}
          orbClass="bg-emerald-500/10"
          iconClass="bg-emerald-50 text-emerald-600 group-hover:bg-emerald-500 group-hover:text-white"
          dotClass="bg-emerald-500"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="group relative overflow-hidden card rounded-[1.8rem] p-5 transition-all duration-500 hover:-translate-y-1">
          <div className="absolute -right-8 -bottom-10 h-36 w-36 rounded-full bg-[#4a40e0]/5 transition-transform duration-700 group-hover:scale-150" />
          <div className="relative z-10">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">Recent exams</h2>
              <Link to="/teacher/create-exam" className="text-sm font-semibold text-[#4a40e0] hover:underline">
                Create exam
              </Link>
            </div>
            <div className="space-y-2">
              {exams.slice(0, 5).map((exam) => (
                <div key={exam.id} className="rounded-xl border border-slate-200 p-3 transition-all hover:border-[#4a40e0]/35 hover:bg-white/80">
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
        </div>

        <div className="group relative overflow-hidden card rounded-[1.8rem] p-5 transition-all duration-500 hover:-translate-y-1">
          <div className="absolute -left-10 -top-10 h-36 w-36 rounded-full bg-emerald-500/10 transition-transform duration-700 group-hover:scale-150" />
          <div className="relative z-10">
            <h2 className="text-lg font-bold text-slate-900">Top student performance</h2>
            <div className="mt-3 space-y-2">
              {performance.map((row) => (
                <div
                  key={row.student_id}
                  className="flex items-center justify-between rounded-xl border border-slate-200 p-3 transition-all hover:border-[#4a40e0]/35 hover:bg-white/80"
                >
                  <p className="text-sm font-semibold text-slate-800">{row.student__full_name || 'Student'}</p>
                  <p className="text-sm text-slate-600">Avg {Number(row.avg_percentage || 0).toFixed(2)}%</p>
                </div>
              ))}
              {performance.length === 0 && <p className="text-sm text-slate-500">No performance data available.</p>}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default TeacherDashboard

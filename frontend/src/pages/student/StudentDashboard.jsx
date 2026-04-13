import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'react-toastify'
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Eye,
  FileText,
  RefreshCw,
  Trophy,
} from 'lucide-react'
import { studentAPI } from '../../api/studentAPI'
import { resultAPI } from '../../api/resultAPI'
import LoadingSpinner from '../../components/LoadingSpinner'
import { getErrorMessage } from '../../utils/errors'

function formatResultDate(result) {
  const rawDate = result?.published_at || result?.created_at || result?.updated_at
  if (!rawDate) {
    return 'Date unavailable'
  }

  const parsed = new Date(rawDate)
  if (Number.isNaN(parsed.getTime())) {
    return 'Date unavailable'
  }

  return parsed.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

function StudentDashboard() {
  const [loading, setLoading] = useState(true)
  const [availableExams, setAvailableExams] = useState([])
  const [results, setResults] = useState([])
  const displayDate = new Date().toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })

  const loadDashboard = useCallback(async () => {
    setLoading(true)
    try {
      const [{ data: exams }, { data: resultRows }] = await Promise.all([
        studentAPI.getAvailableExams(),
        resultAPI.listResults(),
      ])
      setAvailableExams(Array.isArray(exams) ? exams : [])
      setResults(Array.isArray(resultRows) ? resultRows : [])
    } catch (error) {
      toast.error(getErrorMessage(error, 'Unable to load dashboard'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadDashboard()
  }, [loadDashboard])

  if (loading) {
    return <LoadingSpinner text="Loading student dashboard" />
  }

  const passCount = results.filter((item) => item.is_passed).length
  const latestResult = results[0] || null
  const latestPercentage = Number(latestResult?.percentage || 0)
  const latestPercentageLabel = Number.isFinite(latestPercentage)
    ? latestPercentage.toFixed(Number.isInteger(latestPercentage) ? 0 : 2)
    : '0'
  const latestPercentageClamped = Math.max(0, Math.min(100, Number.isFinite(latestPercentage) ? latestPercentage : 0))
  const secondaryResults = results.slice(1, 3)

  return (
    <div className="space-y-5">
      <section className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl font-extrabold tracking-tight text-[#242f41] lg:text-[2rem]">Student Dashboard</h1>
          <p className="mt-1.5 text-sm font-medium text-[#515c70]">Welcome back. Here&apos;s your academic summary.</p>
        </div>
        <div className="inline-flex items-center gap-2 rounded-2xl border border-white/60 bg-white/60 px-3.5 py-2 text-xs font-bold text-[#4a40e0] shadow-sm">
          <CalendarDays className="h-4 w-4" />
          {displayDate}
        </div>
      </section>

      <section className="grid gap-3.5 md:grid-cols-3">
        <Link
          to="/student/exams"
          className="group relative block overflow-hidden rounded-3xl border border-white bg-[linear-gradient(135deg,#ffffff_0%,#f8faff_100%)] p-4 shadow-[0_20px_50px_-12px_rgba(74,64,224,0.08)] transition-all duration-500 hover:-translate-y-1 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#4a40e0]/20"
          aria-label="Open available exams"
        >
          <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-[#4a40e0]/5 transition-transform duration-700 group-hover:scale-150" />
          <div className="relative z-10 mb-4 flex items-center justify-between">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-50 text-[#4a40e0] transition-all group-hover:bg-[#4a40e0] group-hover:text-white">
              <ClipboardList className="h-5 w-5" />
            </div>
            <span className="rounded-full bg-slate-100/70 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.15em] text-[#6c778c]">Live Status</span>
          </div>
          <p className="text-xs font-bold uppercase tracking-widest text-[#515c70]">Available Exams</p>
          <div className="mt-1.5 flex items-end gap-2">
            <p className="font-heading text-4xl font-black text-[#242f41]">{availableExams.length}</p>
            <span className="mb-3 h-2 w-2 rounded-full bg-slate-300" />
          </div>
        </Link>

        <Link
          to="/student/results"
          className="group relative block overflow-hidden rounded-3xl border border-white bg-[linear-gradient(135deg,#ffffff_0%,#f8faff_100%)] p-4 shadow-[0_20px_50px_-12px_rgba(74,64,224,0.08)] transition-all duration-500 hover:-translate-y-1 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#4a40e0]/20"
          aria-label="Open published results"
        >
          <div className="absolute -right-8 -bottom-8 h-32 w-32 rounded-full bg-[#702ae1]/5 transition-transform duration-700 group-hover:scale-150" />
          <div className="relative z-10 mb-4 flex items-center justify-between">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-purple-50 text-[#702ae1] transition-all group-hover:bg-[#702ae1] group-hover:text-white">
              <FileText className="h-5 w-5" />
            </div>
            <span className="rounded-full bg-slate-100/70 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.15em] text-[#6c778c]">Academic</span>
          </div>
          <p className="text-xs font-bold uppercase tracking-widest text-[#515c70]">Published Results</p>
          <div className="mt-1.5 flex items-end gap-2">
            <p className="font-heading text-4xl font-black text-[#242f41]">{results.length}</p>
            <span className="mb-3 h-2 w-2 rounded-full bg-[#702ae1]" />
          </div>
        </Link>

        <Link
          to="/student/results"
          className="group relative block overflow-hidden rounded-3xl border border-white bg-[linear-gradient(135deg,#ffffff_0%,#f8faff_100%)] p-4 shadow-[0_20px_50px_-12px_rgba(74,64,224,0.08)] transition-all duration-500 hover:-translate-y-1 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#4a40e0]/20"
          aria-label="Open result summary"
        >
          <div className="relative z-10 mb-4 flex items-center justify-between">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 transition-all group-hover:bg-emerald-500 group-hover:text-white">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <span className="rounded-full bg-slate-100/70 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.15em] text-[#6c778c]">Success Rate</span>
          </div>
          <p className="text-xs font-bold uppercase tracking-widest text-[#515c70]">Pass Count</p>
          <div className="mt-1.5 flex items-end gap-2">
            <p className="font-heading text-4xl font-black text-[#242f41]">{passCount}</p>
            <span className="mb-3 h-2 w-2 rounded-full bg-emerald-500" />
          </div>
        </Link>
      </section>

      <section className="grid grid-cols-1 gap-5 xl:grid-cols-12">
        <div className="space-y-4 xl:col-span-7">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="h-7 w-1.5 rounded-full bg-[#4a40e0] shadow-[0_0_20px_rgba(74,64,224,0.2)]" />
              <h2 className="font-heading text-xl font-extrabold text-[#242f41]">Upcoming Exams</h2>
            </div>
            <Link to="/student/exams" className="group inline-flex items-center gap-2 text-sm font-bold text-[#4a40e0] hover:underline">
              Open Schedule
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>

          {availableExams.length === 0 ? (
            <div className="group flex flex-col items-center justify-center space-y-4 rounded-[2rem] border-2 border-dashed border-slate-300/60 bg-white/35 px-7 py-8 text-center transition-colors hover:border-[#4a40e0]/35">
              <div className="relative">
                <div className="absolute inset-0 scale-150 rounded-full bg-[#4a40e0]/12 opacity-0 blur-2xl transition-opacity group-hover:opacity-100" />
                <div className="relative z-10 flex h-16 w-16 items-center justify-center rounded-2xl border border-slate-100 bg-white text-slate-300 shadow-xl transition-all duration-500 group-hover:rotate-6 group-hover:text-[#4a40e0]">
                  <CalendarDays className="h-7 w-7" />
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-lg font-bold text-[#242f41]">You&apos;re all caught up!</p>
                <p className="mx-auto max-w-sm text-xs font-medium text-[#515c70] sm:text-sm">
                  There are no exams scheduled for you at this moment. Take a break or review your past results.
                </p>
              </div>
              <button
                type="button"
                onClick={() => void loadDashboard()}
                className="inline-flex items-center gap-2 rounded-xl border-2 border-[#4a40e0]/25 px-5 py-2 text-xs font-bold text-[#4a40e0] transition-all hover:bg-[#4a40e0] hover:text-white sm:text-sm"
              >
                <RefreshCw className="h-4 w-4" />
                Refresh Schedule
              </button>
            </div>
          ) : (
            <div className="space-y-2.5">
              {availableExams.slice(0, 3).map((exam) => (
                <Link
                  key={exam.id}
                  to={`/student/exams/${exam.id}/instructions`}
                  state={{ exam }}
                  className="rounded-2xl border border-white/70 bg-white/65 p-3 shadow-sm backdrop-blur transition-all hover:-translate-y-0.5 hover:shadow-[0_18px_30px_-20px_rgba(74,64,224,0.5)]"
                  aria-label={`Open instructions for ${exam.title}`}
                >
                  <div className="mb-1.5 flex items-start justify-between gap-3">
                    <p className="font-heading text-sm font-extrabold text-[#242f41] sm:text-base">{exam.title}</p>
                    <span className="rounded-full bg-[#ecf1ff] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-[#4a40e0]">
                      {exam.duration_minutes} mins
                    </span>
                  </div>
                  <p className="line-clamp-2 text-xs font-medium text-[#515c70] sm:text-sm">{exam.description || 'No description provided.'}</p>
                </Link>
              ))}

              <button
                type="button"
                onClick={() => void loadDashboard()}
                className="inline-flex items-center gap-2 rounded-xl border border-[#4a40e0]/20 bg-white px-4 py-1.5 text-xs font-bold text-[#4a40e0] transition-colors hover:bg-[#4a40e0] hover:text-white sm:text-sm"
              >
                <RefreshCw className="h-4 w-4" />
                Refresh Schedule
              </button>
            </div>
          )}
        </div>

        <div className="space-y-4 xl:col-span-5">
          <div className="flex items-center justify-between">
            <h2 className="font-heading text-xl font-extrabold text-[#242f41]">Recent Results</h2>
            <Link to="/student/results" className="text-sm font-bold text-[#4a40e0] hover:underline">
              View all
            </Link>
          </div>

          {latestResult ? (
            <div className="group relative overflow-hidden rounded-[2rem] border border-white/70 bg-white/70 p-4 shadow-[0_20px_50px_-12px_rgba(74,64,224,0.08)] backdrop-blur transition-all duration-500 hover:-translate-y-1.5">
              <div className="absolute -bottom-10 -right-10 h-40 w-40 rounded-full bg-[#4a40e0]/8 blur-3xl transition-colors group-hover:bg-[#4a40e0]/14" />
              <div className="relative z-10 mb-4 flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-heading text-lg font-extrabold tracking-tight text-[#242f41]">{latestResult.exam_title || 'Exam Result'}</h3>
                  <p className="mt-1 text-xs font-bold uppercase tracking-wider text-[#515c70]/80">Final Assessment</p>
                </div>
                <span
                  className={[
                    'rounded-full border px-3 py-1 text-[11px] font-black uppercase tracking-widest',
                    latestResult.is_passed
                      ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-600'
                      : 'border-rose-500/25 bg-rose-500/10 text-rose-600',
                  ].join(' ')}
                >
                  {latestResult.is_passed ? 'PASSED' : 'FAILED'}
                </span>
              </div>

              <div className="relative z-10 space-y-5">
                <div className="flex items-end justify-between gap-4">
                  <div>
                    <div className="flex items-baseline gap-1">
                      <span className="font-heading text-4xl font-black text-[#4a40e0]">{latestPercentageLabel}</span>
                      <span className="font-heading text-xl font-extrabold text-[#4a40e0]/65">%</span>
                    </div>
                  </div>
                  <Link
                    to="/student/results"
                    className="group/btn flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-100 bg-white text-[#242f41] shadow-sm transition-all hover:bg-[#4a40e0] hover:text-white hover:shadow-lg hover:shadow-[#4a40e0]/25"
                    aria-label="View result details"
                  >
                    <Eye className="h-4 w-4" />
                  </Link>
                </div>

                <div className="space-y-2.5">
                  <div className="flex items-center justify-between px-1">
                    <span className="text-[11px] font-black uppercase tracking-[0.2em] text-[#4a40e0]">
                      {latestResult.is_passed ? 'Perfect Score' : 'Needs Improvement'}
                    </span>
                    <span className="text-[11px] font-bold text-[#6c778c]">{formatResultDate(latestResult)}</span>
                  </div>
                  <div className="h-3 w-full overflow-hidden rounded-full bg-slate-100/90 p-0.5">
                    <div className="relative h-full rounded-full bg-gradient-to-r from-[#4a40e0] to-[#702ae1]" style={{ width: `${latestPercentageClamped}%` }}>
                      <div className="absolute inset-0 animate-pulse bg-white/20" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-[2rem] border border-slate-200/60 bg-white/45 p-6 text-center text-sm font-medium text-[#6c778c]">
              No published results yet.
            </div>
          )}

          {secondaryResults.length > 0 ? (
            <div className="space-y-2.5">
              {secondaryResults.map((result) => (
                <Link
                  key={result.id}
                  to="/student/results"
                  className="flex items-center gap-3 rounded-2xl border border-slate-200/60 bg-white/45 p-3 transition-all hover:-translate-y-0.5 hover:shadow-[0_14px_28px_-24px_rgba(74,64,224,0.6)]"
                  aria-label={`Open results page for ${result.exam_title || 'exam result'}`}
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#ecf1ff] text-[#4a40e0]">
                    <Trophy className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-heading text-base font-bold text-[#242f41]">{result.exam_title || 'Exam Result'}</p>
                    <p className="text-xs font-semibold uppercase tracking-wide text-[#6c778c]">{formatResultDate(result)}</p>
                  </div>
                  <span className="rounded-full bg-[#ecf1ff] px-3 py-1 text-xs font-black text-[#4a40e0]">
                    {Number(result.percentage || 0).toFixed(1)}%
                  </span>
                </Link>
              ))}
            </div>
          ) : (
            <div className="rounded-[2rem] border border-slate-200/60 bg-white/45 p-6 text-center text-sm font-medium text-[#6c778c]">
              No more recent results to show right now.
            </div>
          )}
        </div>
      </section>
    </div>
  )
}

export default StudentDashboard

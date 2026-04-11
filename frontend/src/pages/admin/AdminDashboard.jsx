import { useEffect, useState } from 'react'
import { toast } from 'react-toastify'
import { adminAPI } from '../../api/adminAPI'
import LoadingSpinner from '../../components/LoadingSpinner'
import { getErrorMessage } from '../../utils/errors'

function StatTile({ title, value }) {
  return (
    <div className="card p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</p>
      <p className="mt-2 text-3xl font-bold text-slate-900">{value}</p>
    </div>
  )
}

function AdminDashboard() {
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState(null)
  const [plan, setPlan] = useState(null)
  const [org, setOrg] = useState(null)

  useEffect(() => {
    const run = async () => {
      setLoading(true)
      try {
        const [{ data: statsData }, { data: planData }, { data: orgData }] = await Promise.all([
          adminAPI.getOrganizationStats(),
          adminAPI.getOrganizationPlan(),
          adminAPI.getOrganization(),
        ])

        setStats(statsData)
        setPlan(planData)
        setOrg(orgData)
      } catch (error) {
        toast.error(getErrorMessage(error, 'Unable to load admin dashboard'))
      } finally {
        setLoading(false)
      }
    }

    run()
  }, [])

  if (loading) {
    return <LoadingSpinner text="Loading organization dashboard" />
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Organization dashboard</h1>
        <p className="text-sm text-slate-600">Overview of your institution operations and account limits.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatTile title="Users" value={stats?.users_total || 0} />
        <StatTile title="Departments" value={stats?.departments_total || 0} />
        <StatTile title="Courses" value={stats?.courses_total || 0} />
        <StatTile title="Exams" value={stats?.exams_total || 0} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card p-4">
          <h2 className="text-lg font-bold text-slate-900">Organization</h2>
          <p className="mt-2 text-sm text-slate-700">{org?.name}</p>
          <p className="text-sm text-slate-500">{org?.email}</p>
          <div className="mt-3 flex gap-2">
            <span className="chip">Plan: {plan?.plan || 'free'}</span>
            <span className="chip">{plan?.is_active ? 'Active' : 'Suspended'}</span>
          </div>
        </div>

        <div className="card p-4">
          <h2 className="text-lg font-bold text-slate-900">User distribution</h2>
          <div className="mt-3 space-y-2">
            {(stats?.users_by_role || []).map((item) => (
              <div key={item.role} className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2">
                <p className="text-sm capitalize text-slate-700">{item.role}</p>
                <p className="text-sm font-bold text-slate-900">{item.total}</p>
              </div>
            ))}
            {(stats?.users_by_role || []).length === 0 && <p className="text-sm text-slate-500">No user role data yet.</p>}
          </div>
        </div>
      </div>
    </div>
  )
}

export default AdminDashboard

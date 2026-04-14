import { useEffect, useState } from 'react'
import { BookOpenCheck, Building2, LibraryBig, Users2 } from 'lucide-react'
import { toast } from 'react-toastify'
import { adminAPI } from '../../api/adminAPI'
import LoadingSpinner from '../../components/LoadingSpinner'
import { getErrorMessage } from '../../utils/errors'
import './AdminDashboard.css'

function StatTile({ title, value, badge, Icon, orbClass, iconClass, dotClass = 'bg-slate-300' }) {
  return (
    <div className="group relative overflow-hidden card rounded-3xl p-4 transition-all duration-500 hover:-translate-y-1">
      <div className={`absolute -right-8 -top-8 h-32 w-32 rounded-full ${orbClass} transition-transform duration-700 group-hover:scale-150`} />
      <div className="relative z-10 mb-4 flex items-center justify-between">
        <div className={`flex h-10 w-10 items-center justify-center rounded-2xl transition-all ${iconClass}`}>
          <Icon className="h-5 w-5" />
        </div>
        <span className="admin-dashboard-badge">{badge}</span>
      </div>
      <p className="text-xs font-bold uppercase tracking-widest text-[#515c70]">{title}</p>
      <div className="mt-1.5 flex items-end gap-2">
        <p className="font-heading text-4xl font-black text-[#242f41]">{value}</p>
        <span className={`mb-3 h-2 w-2 rounded-full ${dotClass}`} />
      </div>
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
        <StatTile
          title="Users"
          value={stats?.users_total || 0}
          badge="People"
          Icon={Users2}
          orbClass="bg-[#4a40e0]/5"
          iconClass="bg-indigo-50 text-[#4a40e0] group-hover:bg-[#4a40e0] group-hover:text-white"
        />
        <StatTile
          title="Departments"
          value={stats?.departments_total || 0}
          badge="Structure"
          Icon={Building2}
          orbClass="bg-sky-500/10"
          iconClass="bg-sky-50 text-sky-600 group-hover:bg-sky-600 group-hover:text-white"
          dotClass="bg-sky-500"
        />
        <StatTile
          title="Courses"
          value={stats?.courses_total || 0}
          badge="Catalog"
          Icon={LibraryBig}
          orbClass="bg-[#702ae1]/5"
          iconClass="bg-purple-50 text-[#702ae1] group-hover:bg-[#702ae1] group-hover:text-white"
          dotClass="bg-[#702ae1]"
        />
        <StatTile
          title="Exams"
          value={stats?.exams_total || 0}
          badge="Assessment"
          Icon={BookOpenCheck}
          orbClass="bg-emerald-500/10"
          iconClass="bg-emerald-50 text-emerald-600 group-hover:bg-emerald-500 group-hover:text-white"
          dotClass="bg-emerald-500"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="group relative overflow-hidden card rounded-[1.8rem] p-5 transition-all duration-500 hover:-translate-y-1">
          <div className="absolute -right-8 -bottom-10 h-36 w-36 rounded-full bg-[#4a40e0]/5 transition-transform duration-700 group-hover:scale-150" />
          <div className="relative z-10">
            <h2 className="text-lg font-bold text-slate-900">Organization</h2>
            <p className="mt-2 text-sm text-slate-700">{org?.name}</p>
            <p className="text-sm text-slate-500">{org?.email}</p>
            <div className="mt-3 flex gap-2">
              <span className="chip">Plan: {plan?.plan || 'free'}</span>
              <span className="chip">{plan?.is_active ? 'Active' : 'Suspended'}</span>
            </div>
          </div>
        </div>

        <div className="group relative overflow-hidden card rounded-[1.8rem] p-5 transition-all duration-500 hover:-translate-y-1">
          <div className="absolute -left-10 -top-10 h-36 w-36 rounded-full bg-sky-500/10 transition-transform duration-700 group-hover:scale-150" />
          <div className="relative z-10">
            <h2 className="text-lg font-bold text-slate-900">User distribution</h2>
            <div className="mt-3 space-y-2">
              {(stats?.users_by_role || []).map((item) => (
                <div
                  key={item.role}
                  className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2 transition-all hover:border-[#4a40e0]/35 hover:bg-white/80"
                >
                  <p className="text-sm capitalize text-slate-700">{item.role}</p>
                  <p className="text-sm font-bold text-slate-900">{item.total}</p>
                </div>
              ))}
              {(stats?.users_by_role || []).length === 0 && <p className="text-sm text-slate-500">No user role data yet.</p>}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AdminDashboard

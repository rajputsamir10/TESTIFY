import { useEffect, useMemo, useState } from 'react'
import { PieChart, Pie, Cell, Legend, Tooltip, ResponsiveContainer } from 'recharts'
import { toast } from 'react-toastify'
import { godAPI } from '../../api/godAPI'
import LoadingSpinner from '../../components/LoadingSpinner'
import { getErrorMessage } from '../../utils/errors'

const COLORS = ['#1e3a8a', '#0f766e', '#9a3412', '#475569', '#0ea5e9']

function PlatformStats() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  const chartData = useMemo(() => {
    return (stats?.users_by_role || []).map((item) => ({ name: item.role, value: item.total }))
  }, [stats])

  useEffect(() => {
    const run = async () => {
      setLoading(true)
      try {
        const { data } = await godAPI.getStats()
        setStats(data)
      } catch (error) {
        toast.error(getErrorMessage(error, 'Unable to load stats'))
      } finally {
        setLoading(false)
      }
    }

    run()
  }, [])

  if (loading) {
    return <LoadingSpinner text="Loading platform statistics" />
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Platform analytics</h1>
        <p className="text-sm text-slate-600">Role distribution and high-level operational volume.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="card p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Organizations</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">{stats?.organizations_total || 0}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Users</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">{stats?.users_total || 0}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Exams</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">{stats?.exams_total || 0}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Results</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">{stats?.results_total || 0}</p>
        </div>
      </div>

      <div className="card p-4">
        <h2 className="text-lg font-bold text-slate-900">User role composition</h2>
        <div className="mt-4 h-80">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={chartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={118} label>
                {chartData.map((entry, index) => (
                  <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}

export default PlatformStats

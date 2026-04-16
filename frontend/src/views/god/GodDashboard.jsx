"use client"

import { useEffect, useState } from 'react'
import { BarChart, Bar, CartesianGrid, Tooltip, XAxis, YAxis, ResponsiveContainer } from 'recharts'
import { toast } from 'react-toastify'
import { godAPI } from '../../api/godAPI'
import LoadingSpinner from '../../components/LoadingSpinner'
import { getErrorMessage } from '../../utils/errors'

function StatCard({ label, value }) {
  return (
    <div className="card p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-bold text-slate-900">{value}</p>
    </div>
  )
}

function GodDashboard() {
  const [stats, setStats] = useState(null)
  const [orgs, setOrgs] = useState([])
  const [loading, setLoading] = useState(true)

  const loadData = async () => {
    setLoading(true)
    try {
      const [{ data: statsData }, { data: orgData }] = await Promise.all([
        godAPI.getStats(),
        godAPI.listOrganizations(),
      ])
      setStats(statsData)
      setOrgs(Array.isArray(orgData) ? orgData.slice(0, 5) : [])
    } catch (error) {
      toast.error(getErrorMessage(error, 'Unable to load god dashboard'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  if (loading) {
    return <LoadingSpinner text="Loading platform dashboard" />
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Platform command center</h1>
        <p className="text-sm text-slate-600">Cross-organization visibility for growth, usage, and governance.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Organizations" value={stats?.organizations_total || 0} />
        <StatCard label="Users" value={stats?.users_total || 0} />
        <StatCard label="Exams" value={stats?.exams_total || 0} />
        <StatCard label="Results" value={stats?.results_total || 0} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card p-4">
          <h2 className="text-lg font-bold text-slate-900">Users by role</h2>
          <div className="mt-4 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats?.users_by_role || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="role" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="total" fill="#1e3a8a" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card p-4">
          <h2 className="text-lg font-bold text-slate-900">Recent organizations</h2>
          <div className="mt-3 space-y-2">
            {orgs.length === 0 && <p className="text-sm text-slate-500">No organizations available.</p>}
            {orgs.map((org) => (
              <div key={org.id} className="rounded-xl border border-slate-200 p-3">
                <p className="font-semibold text-slate-800">{org.name}</p>
                <p className="text-xs text-slate-500">{org.email}</p>
                <div className="mt-2 flex gap-2">
                  <span className="chip">Plan: {org.plan}</span>
                  <span className="chip">{org.is_active ? 'Active' : 'Suspended'}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default GodDashboard

import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'react-toastify'
import { godAPI } from '../../api/godAPI'
import LoadingSpinner from '../../components/LoadingSpinner'
import { getErrorMessage } from '../../utils/errors'

function ManageOrganizations() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)

  const form = useForm({
    defaultValues: {
      name: '',
      email: '',
    },
  })

  const loadData = async () => {
    setLoading(true)
    try {
      const { data } = await godAPI.listOrganizations()
      setItems(Array.isArray(data) ? data : [])
    } catch (error) {
      toast.error(getErrorMessage(error, 'Unable to load organizations'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const onCreate = async (values) => {
    try {
      await godAPI.createOrganization(values)
      form.reset({ name: '', email: '' })
      toast.success('Organization created')
      await loadData()
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to create organization'))
    }
  }

  const onDelete = async (id) => {
    try {
      await godAPI.deleteOrganization(id)
      toast.success('Organization deleted')
      await loadData()
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to delete organization'))
    }
  }

  const onPlanChange = async (id, plan) => {
    try {
      await godAPI.patchPlan(id, plan)
      toast.success('Plan updated')
      await loadData()
    } catch (error) {
      toast.error(getErrorMessage(error, 'Unable to update plan'))
    }
  }

  const onSuspendToggle = async (org) => {
    try {
      await godAPI.patchSuspend(org.id, !org.is_active)
      toast.success(org.is_active ? 'Organization suspended' : 'Organization activated')
      await loadData()
    } catch (error) {
      toast.error(getErrorMessage(error, 'Unable to update organization status'))
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Manage organizations</h1>
        <p className="text-sm text-slate-600">Create, re-plan, suspend, or delete organizations.</p>
      </div>

      <div className="card p-4">
        <h2 className="text-lg font-bold text-slate-900">Create organization</h2>
        <form className="mt-3 grid gap-3 md:grid-cols-3" onSubmit={form.handleSubmit(onCreate)}>
          <input
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
            placeholder="Organization name"
            {...form.register('name', { required: true })}
          />
          <input
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
            placeholder="Organization email"
            type="email"
            {...form.register('email', { required: true })}
          />
          <button type="submit" className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white">
            Create
          </button>
        </form>
      </div>

      <div className="card p-4">
        <h2 className="text-lg font-bold text-slate-900">Organization list</h2>

        {loading ? (
          <LoadingSpinner text="Loading organizations" />
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-2 py-2">Name</th>
                  <th className="px-2 py-2">Email</th>
                  <th className="px-2 py-2">Plan</th>
                  <th className="px-2 py-2">Status</th>
                  <th className="px-2 py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((org) => (
                  <tr key={org.id} className="border-b border-slate-100">
                    <td className="px-2 py-2 font-semibold text-slate-800">{org.name}</td>
                    <td className="px-2 py-2 text-slate-600">{org.email}</td>
                    <td className="px-2 py-2">
                      <select
                        value={org.plan}
                        onChange={(event) => onPlanChange(org.id, event.target.value)}
                        className="rounded-lg border border-slate-200 px-2 py-1 text-xs"
                      >
                        <option value="free">free</option>
                        <option value="pro">pro</option>
                        <option value="enterprise">enterprise</option>
                      </select>
                    </td>
                    <td className="px-2 py-2">
                      <span className="chip">{org.is_active ? 'Active' : 'Suspended'}</span>
                    </td>
                    <td className="px-2 py-2">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => onSuspendToggle(org)}
                          className="rounded-lg border border-slate-300 px-2 py-1 text-xs font-semibold"
                        >
                          {org.is_active ? 'Suspend' : 'Activate'}
                        </button>
                        <button
                          type="button"
                          onClick={() => onDelete(org.id)}
                          className="rounded-lg border border-rose-300 px-2 py-1 text-xs font-semibold text-rose-700"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {items.length === 0 && <p className="py-3 text-sm text-slate-500">No organizations found.</p>}
          </div>
        )}
      </div>
    </div>
  )
}

export default ManageOrganizations

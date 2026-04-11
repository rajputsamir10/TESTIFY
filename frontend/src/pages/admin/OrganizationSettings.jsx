import { useCallback, useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'react-toastify'
import { adminAPI } from '../../api/adminAPI'
import LoadingSpinner from '../../components/LoadingSpinner'
import { getErrorMessage } from '../../utils/errors'

function OrganizationSettings() {
  const [loading, setLoading] = useState(true)
  const [meta, setMeta] = useState(null)

  const form = useForm({
    defaultValues: {
      name: '',
      email: '',
    },
  })

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [{ data: org }, { data: plan }] = await Promise.all([
        adminAPI.getOrganization(),
        adminAPI.getOrganizationPlan(),
      ])

      setMeta(plan)
      form.reset({
        name: org.name || '',
        email: org.email || '',
      })
    } catch (error) {
      toast.error(getErrorMessage(error, 'Unable to load organization settings'))
    } finally {
      setLoading(false)
    }
  }, [form])

  useEffect(() => {
    loadData()
  }, [loadData])

  const onSubmit = async (values) => {
    try {
      await adminAPI.updateOrganization(values)
      toast.success('Organization updated')
      await loadData()
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to update organization'))
    }
  }

  if (loading) {
    return <LoadingSpinner text="Loading organization settings" />
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Organization settings</h1>
        <p className="text-sm text-slate-600">Update identity details and verify current plan state.</p>
      </div>

      <div className="card p-4">
        <div className="mb-3 flex flex-wrap gap-2">
          <span className="chip">Plan: {meta?.plan || 'free'}</span>
          <span className="chip">{meta?.is_active ? 'Active' : 'Suspended'}</span>
        </div>

        <form className="grid gap-3 md:max-w-xl" onSubmit={form.handleSubmit(onSubmit)}>
          <label className="text-sm font-semibold text-slate-700">
            Organization name
            <input className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" {...form.register('name', { required: true })} />
          </label>

          <label className="text-sm font-semibold text-slate-700">
            Organization email
            <input type="email" className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" {...form.register('email', { required: true })} />
          </label>

          <button type="submit" className="mt-2 w-fit rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white">
            Save changes
          </button>
        </form>
      </div>
    </div>
  )
}

export default OrganizationSettings

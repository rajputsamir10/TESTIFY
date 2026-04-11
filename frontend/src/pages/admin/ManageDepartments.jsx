import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'react-toastify'
import { adminAPI } from '../../api/adminAPI'
import LoadingSpinner from '../../components/LoadingSpinner'
import { getErrorMessage } from '../../utils/errors'

const schema = z.object({
  name: z.string().min(2, 'Department name is required'),
  code: z.string().min(2, 'Department code is required'),
})

function ManageDepartments() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)

  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
      code: '',
    },
  })

  const loadData = async () => {
    setLoading(true)
    try {
      const { data } = await adminAPI.listDepartments()
      setItems(Array.isArray(data) ? data : [])
    } catch (error) {
      toast.error(getErrorMessage(error, 'Unable to load departments'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const onCreate = async (values) => {
    try {
      await adminAPI.createDepartment(values)
      toast.success('Department created')
      form.reset({ name: '', code: '' })
      await loadData()
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to create department'))
    }
  }

  const onEdit = async (dept) => {
    const name = window.prompt('Department name', dept.name)
    if (name === null) {
      return
    }

    const code = window.prompt('Department code', dept.code)
    if (code === null) {
      return
    }

    try {
      await adminAPI.updateDepartment(dept.id, { name, code })
      toast.success('Department updated')
      await loadData()
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to update department'))
    }
  }

  const onDelete = async (id) => {
    try {
      await adminAPI.deleteDepartment(id)
      toast.success('Department deleted')
      await loadData()
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to delete department'))
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Manage departments</h1>
        <p className="text-sm text-slate-600">Define academic departments for users and exams.</p>
      </div>

      <div className="card p-4">
        <h2 className="text-lg font-bold text-slate-900">Create department</h2>
        <form className="mt-3 grid gap-3 md:grid-cols-3" onSubmit={form.handleSubmit(onCreate)}>
          <div>
            <input className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" placeholder="Department name" {...form.register('name')} />
            {form.formState.errors.name && <p className="mt-1 text-xs text-rose-600">{form.formState.errors.name.message}</p>}
          </div>

          <div>
            <input className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" placeholder="Department code" {...form.register('code')} />
            {form.formState.errors.code && <p className="mt-1 text-xs text-rose-600">{form.formState.errors.code.message}</p>}
          </div>

          <button type="submit" className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white">
            Create
          </button>
        </form>
      </div>

      <div className="card p-4">
        <h2 className="text-lg font-bold text-slate-900">Department list</h2>

        {loading ? (
          <LoadingSpinner text="Loading departments" />
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-2 py-2">Name</th>
                  <th className="px-2 py-2">Code</th>
                  <th className="px-2 py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((dept) => (
                  <tr key={dept.id} className="border-b border-slate-100">
                    <td className="px-2 py-2 font-semibold text-slate-800">{dept.name}</td>
                    <td className="px-2 py-2 text-slate-600">{dept.code}</td>
                    <td className="px-2 py-2">
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => onEdit(dept)}
                          className="rounded-lg border border-slate-300 px-2 py-1 text-xs font-semibold"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => onDelete(dept.id)}
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

            {items.length === 0 && <p className="py-3 text-sm text-slate-500">No departments found.</p>}
          </div>
        )}
      </div>
    </div>
  )
}

export default ManageDepartments

"use client"

import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'react-toastify'
import { godAPI } from '../../api/godAPI'
import LoadingSpinner from '../../components/LoadingSpinner'
import { getErrorMessage } from '../../utils/errors'

const ROLE_OPTIONS = ['god', 'admin', 'teacher', 'student']

function ManageAllUsers() {
  const [users, setUsers] = useState([])
  const [organizations, setOrganizations] = useState([])
  const [loading, setLoading] = useState(true)

  const form = useForm({
    defaultValues: {
      full_name: '',
      email: '',
      password: '',
      role: 'admin',
      organization_id: '',
      department_id: '',
      course_id: '',
      teacher_id: '',
      roll_number: '',
      batch_year: '',
    },
  })

  const role = form.watch('role')

  const loadData = async () => {
    setLoading(true)
    try {
      const [{ data: userData }, { data: orgData }] = await Promise.all([
        godAPI.listUsers(),
        godAPI.listOrganizations(),
      ])
      setUsers(Array.isArray(userData) ? userData : [])
      setOrganizations(Array.isArray(orgData) ? orgData : [])
    } catch (error) {
      toast.error(getErrorMessage(error, 'Unable to load users'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const onCreate = async (values) => {
    try {
      const payload = {
        full_name: values.full_name,
        email: values.email,
        password: values.password,
        role: values.role,
      }

      if (values.role !== 'god' && values.organization_id) {
        payload.organization_id = values.organization_id
      }

      if (values.department_id) {
        payload.department_id = values.department_id
      }

      if (values.course_id) {
        payload.course_id = values.course_id
      }

      if (values.teacher_id) {
        payload.teacher_id = values.teacher_id
      }

      if (values.roll_number) {
        payload.roll_number = values.roll_number
      }

      if (values.batch_year) {
        payload.batch_year = values.batch_year
      }

      await godAPI.createUser(payload)
      toast.success('User created')
      form.reset({
        full_name: '',
        email: '',
        password: '',
        role: 'admin',
        organization_id: '',
        department_id: '',
        course_id: '',
        teacher_id: '',
        roll_number: '',
        batch_year: '',
      })
      await loadData()
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to create user'))
    }
  }

  const onDelete = async (id) => {
    try {
      await godAPI.deleteUser(id)
      toast.success('User removed')
      await loadData()
    } catch (error) {
      toast.error(getErrorMessage(error, 'Unable to delete user'))
    }
  }

  const onResetPassword = async (id) => {
    const newPassword = window.prompt('Enter new password (minimum 8 characters):')
    if (!newPassword) {
      return
    }

    try {
      await godAPI.resetUserPassword(id, newPassword)
      toast.success('Password reset successful')
    } catch (error) {
      toast.error(getErrorMessage(error, 'Password reset failed'))
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Manage all users</h1>
        <p className="text-sm text-slate-600">Global user creation and account recovery.</p>
      </div>

      <div className="card p-4">
        <h2 className="text-lg font-bold text-slate-900">Create user</h2>
        <form className="mt-3 grid gap-3 md:grid-cols-2" onSubmit={form.handleSubmit(onCreate)}>
          <input className="rounded-xl border border-slate-200 px-3 py-2 text-sm" placeholder="Full name" {...form.register('full_name', { required: true })} />
          <input className="rounded-xl border border-slate-200 px-3 py-2 text-sm" placeholder="Email" type="email" {...form.register('email', { required: true })} />
          <input className="rounded-xl border border-slate-200 px-3 py-2 text-sm" placeholder="Password" type="password" {...form.register('password', { required: true })} />

          <select className="rounded-xl border border-slate-200 px-3 py-2 text-sm" {...form.register('role')}>
            {ROLE_OPTIONS.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>

          {role !== 'god' && (
            <select className="rounded-xl border border-slate-200 px-3 py-2 text-sm" {...form.register('organization_id')}>
              <option value="">Select organization</option>
              {organizations.map((org) => (
                <option key={org.id} value={org.id}>
                  {org.name}
                </option>
              ))}
            </select>
          )}

          <input className="rounded-xl border border-slate-200 px-3 py-2 text-sm" placeholder="Department ID (optional)" {...form.register('department_id')} />
          <input className="rounded-xl border border-slate-200 px-3 py-2 text-sm" placeholder="Course ID (optional)" {...form.register('course_id')} />
          <input className="rounded-xl border border-slate-200 px-3 py-2 text-sm" placeholder="Teacher ID (teacher role)" {...form.register('teacher_id')} />
          <input className="rounded-xl border border-slate-200 px-3 py-2 text-sm" placeholder="Roll number (student role)" {...form.register('roll_number')} />
          <input className="rounded-xl border border-slate-200 px-3 py-2 text-sm" placeholder="Batch year" {...form.register('batch_year')} />

          <button type="submit" className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white">
            Create user
          </button>
        </form>
      </div>

      <div className="card p-4">
        <h2 className="text-lg font-bold text-slate-900">User list</h2>

        {loading ? (
          <LoadingSpinner text="Loading users" />
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-2 py-2">Name</th>
                  <th className="px-2 py-2">Role</th>
                  <th className="px-2 py-2">Organization</th>
                  <th className="px-2 py-2">Status</th>
                  <th className="px-2 py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="border-b border-slate-100">
                    <td className="px-2 py-2">
                      <p className="font-semibold text-slate-800">{user.full_name}</p>
                      <p className="text-xs text-slate-500">{user.email}</p>
                    </td>
                    <td className="px-2 py-2 capitalize text-slate-700">{user.role}</td>
                    <td className="px-2 py-2 text-slate-600">{user.organization_name || 'Global'}</td>
                    <td className="px-2 py-2">
                      <span className="chip">{user.is_active ? 'Active' : 'Inactive'}</span>
                    </td>
                    <td className="px-2 py-2">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => onResetPassword(user.id)}
                          className="rounded-lg border border-slate-300 px-2 py-1 text-xs font-semibold"
                        >
                          Reset password
                        </button>
                        <button
                          type="button"
                          onClick={() => onDelete(user.id)}
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

            {users.length === 0 && <p className="py-3 text-sm text-slate-500">No users found.</p>}
          </div>
        )}
      </div>
    </div>
  )
}

export default ManageAllUsers

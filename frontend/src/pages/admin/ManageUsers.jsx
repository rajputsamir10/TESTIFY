import { useEffect, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'react-toastify'
import { adminAPI } from '../../api/adminAPI'
import LoadingSpinner from '../../components/LoadingSpinner'
import { getErrorMessage } from '../../utils/errors'
import { isPasswordStrong } from '../../utils/passwordRules'
import PasswordStrengthChecklist from '../../components/PasswordStrengthChecklist'

const ROLE_OPTIONS = ['teacher', 'student', 'admin']

const schema = z
  .object({
    full_name: z.string().min(2, 'Full name is required'),
    email: z.string().email('Valid email is required'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .refine(
        (value) => isPasswordStrong(value),
        'Password must include uppercase, lowercase, number, and special character',
      ),
    role: z.enum(['teacher', 'student', 'admin']),
    department_id: z.string().optional(),
    course_id: z.string().optional(),
    teacher_id: z.string().optional(),
    roll_number: z.string().optional(),
    batch_year: z.string().optional(),
  })
  .superRefine((values, ctx) => {
    if ((values.role === 'teacher' || values.role === 'student') && !values.department_id?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['department_id'],
        message: 'Department is required for teacher/student',
      })
    }

    if (values.role === 'teacher' && !values.teacher_id?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['teacher_id'],
        message: 'Teacher ID is required',
      })
    }

    if (values.role === 'student' && !values.roll_number?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['roll_number'],
        message: 'Roll number is required',
      })
    }
  })

function ManageUsers() {
  const [users, setUsers] = useState([])
  const [departments, setDepartments] = useState([])
  const [courses, setCourses] = useState([])
  const [loading, setLoading] = useState(true)

  const form = useForm({
    resolver: zodResolver(schema),
    mode: 'onChange',
    defaultValues: {
      full_name: '',
      email: '',
      password: '',
      role: 'teacher',
      department_id: '',
      course_id: '',
      teacher_id: '',
      roll_number: '',
      batch_year: '',
    },
  })

  const role = form.watch('role')
  const passwordValue = useWatch({ control: form.control, name: 'password' }) || ''
  const showPasswordChecklist = passwordValue.length > 0

  useEffect(() => {
    if (role === 'teacher') {
      form.setValue('roll_number', '')
      form.setValue('batch_year', '')
      return
    }

    if (role === 'student') {
      form.setValue('teacher_id', '')
      return
    }

    form.setValue('teacher_id', '')
    form.setValue('roll_number', '')
    form.setValue('batch_year', '')
  }, [role, form])

  const loadData = async () => {
    setLoading(true)
    try {
      const [{ data: userData }, { data: deptData }, { data: courseData }] = await Promise.all([
        adminAPI.listUsers(),
        adminAPI.listDepartments(),
        adminAPI.listCourses(),
      ])

      setUsers(Array.isArray(userData) ? userData : [])
      setDepartments(Array.isArray(deptData) ? deptData : [])
      setCourses(Array.isArray(courseData) ? courseData : [])
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

      if ((values.role === 'teacher' || values.role === 'student') && values.department_id) {
        payload.department_id = values.department_id
      }

      if (values.course_id) {
        payload.course_id = values.course_id
      }

      if (values.role === 'teacher' && values.teacher_id) {
        payload.teacher_id = values.teacher_id
      }

      if (values.role === 'student' && values.roll_number) {
        payload.roll_number = values.roll_number
      }

      if (values.role === 'student' && values.batch_year) {
        payload.batch_year = values.batch_year
      }

      await adminAPI.createUser(payload)
      toast.success('User created')
      form.reset({
        full_name: '',
        email: '',
        password: '',
        role: 'teacher',
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
      await adminAPI.deleteUser(id)
      toast.success('User deleted')
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
      await adminAPI.resetUserPassword(id, newPassword)
      toast.success('Password reset successful')
    } catch (error) {
      toast.error(getErrorMessage(error, 'Password reset failed'))
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Manage users</h1>
        <p className="text-sm text-slate-600">Create teachers, students, and admins in your organization.</p>
      </div>

      <div className="card mx-auto max-w-2xl p-6">
        <h2 className="text-lg font-bold text-slate-900">Create organization user</h2>
        <form className="mt-3 grid gap-3 md:grid-cols-2" onSubmit={form.handleSubmit(onCreate)}>
          <div>
            <input className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" placeholder="Full name" {...form.register('full_name')} />
            {form.formState.errors.full_name && <p className="mt-1 text-xs text-rose-600">{form.formState.errors.full_name.message}</p>}
          </div>

          <div>
            <input className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" placeholder="Email" type="email" {...form.register('email')} />
            {form.formState.errors.email && <p className="mt-1 text-xs text-rose-600">{form.formState.errors.email.message}</p>}
          </div>

          <div>
            <input className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" placeholder="Password" type="password" {...form.register('password')} />
            {form.formState.errors.password && <p className="mt-1 text-xs text-rose-600">{form.formState.errors.password.message}</p>}
          </div>

          <div className="self-start">
            <select className="h-11 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" {...form.register('role')}>
              {ROLE_OPTIONS.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>

          {showPasswordChecklist && (
            <div className="md:col-span-2">
              <PasswordStrengthChecklist password={passwordValue} />
            </div>
          )}

          <div>
            <select className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" {...form.register('department_id')}>
              <option value="">Select department</option>
              {departments.map((dept) => (
                <option key={dept.id} value={dept.id}>
                  {dept.name}
                </option>
              ))}
            </select>
            {form.formState.errors.department_id && <p className="mt-1 text-xs text-rose-600">{form.formState.errors.department_id.message}</p>}
          </div>

          <select className="rounded-xl border border-slate-200 px-3 py-2 text-sm" {...form.register('course_id')}>
            <option value="">Select course (optional)</option>
            {courses.map((course) => (
              <option key={course.id} value={course.id}>
                {course.name}
              </option>
            ))}
          </select>

          {role === 'teacher' && (
            <div>
              <input className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" placeholder="Teacher ID" {...form.register('teacher_id')} />
              {form.formState.errors.teacher_id && <p className="mt-1 text-xs text-rose-600">{form.formState.errors.teacher_id.message}</p>}
            </div>
          )}

          {role === 'student' && (
            <div>
              <input className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" placeholder="Roll number" {...form.register('roll_number')} />
              {form.formState.errors.roll_number && <p className="mt-1 text-xs text-rose-600">{form.formState.errors.roll_number.message}</p>}
            </div>
          )}

          {role === 'student' && (
            <input className="rounded-xl border border-slate-200 px-3 py-2 text-sm" placeholder="Batch year (optional)" {...form.register('batch_year')} />
          )}

          <button
            type="submit"
            disabled={!form.formState.isValid}
            className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-70"
          >
            Create user
          </button>
        </form>
      </div>

      <div className="card p-4">
        <h2 className="text-lg font-bold text-slate-900">Users</h2>

        {loading ? (
          <LoadingSpinner text="Loading users" />
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-2 py-2">Name</th>
                  <th className="px-2 py-2">Role</th>
                  <th className="px-2 py-2">Department</th>
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
                    <td className="px-2 py-2 text-slate-600">{user.department_name || '-'}</td>
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

export default ManageUsers

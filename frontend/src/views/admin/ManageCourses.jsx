"use client"

import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'react-toastify'
import { adminAPI } from '../../api/adminAPI'
import LoadingSpinner from '../../components/LoadingSpinner'
import { getErrorMessage } from '../../utils/errors'

const schema = z.object({
  name: z.string().min(2, 'Course name is required'),
  code: z.string().min(2, 'Course code is required'),
  department: z.string().min(1, 'Department is required'),
})

function ManageCourses() {
  const [courses, setCourses] = useState([])
  const [departments, setDepartments] = useState([])
  const [loading, setLoading] = useState(true)

  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
      code: '',
      department: '',
    },
  })

  const loadData = async () => {
    setLoading(true)
    try {
      const [{ data: courseData }, { data: deptData }] = await Promise.all([
        adminAPI.listCourses(),
        adminAPI.listDepartments(),
      ])
      setCourses(Array.isArray(courseData) ? courseData : [])
      setDepartments(Array.isArray(deptData) ? deptData : [])
    } catch (error) {
      toast.error(getErrorMessage(error, 'Unable to load courses'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const onCreate = async (values) => {
    try {
      await adminAPI.createCourse(values)
      form.reset({ name: '', code: '', department: '' })
      toast.success('Course created')
      await loadData()
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to create course'))
    }
  }

  const onDelete = async (id) => {
    try {
      await adminAPI.deleteCourse(id)
      toast.success('Course deleted')
      await loadData()
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to delete course'))
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Manage courses</h1>
        <p className="text-sm text-slate-600">Create course catalog under departments.</p>
      </div>

      <div className="card p-4">
        <h2 className="text-lg font-bold text-slate-900">Create course</h2>
        <form className="mt-3 grid gap-3 md:grid-cols-4" onSubmit={form.handleSubmit(onCreate)}>
          <div>
            <input className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" placeholder="Course name" {...form.register('name')} />
            {form.formState.errors.name && <p className="mt-1 text-xs text-rose-600">{form.formState.errors.name.message}</p>}
          </div>

          <div>
            <input className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" placeholder="Course code" {...form.register('code')} />
            {form.formState.errors.code && <p className="mt-1 text-xs text-rose-600">{form.formState.errors.code.message}</p>}
          </div>

          <div>
            <select className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" {...form.register('department')}>
              <option value="">Select department</option>
              {departments.map((dept) => (
                <option key={dept.id} value={dept.id}>
                  {dept.name}
                </option>
              ))}
            </select>
            {form.formState.errors.department && <p className="mt-1 text-xs text-rose-600">{form.formState.errors.department.message}</p>}
          </div>

          <button type="submit" className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white">
            Create
          </button>
        </form>
      </div>

      <div className="card p-4">
        <h2 className="text-lg font-bold text-slate-900">Course list</h2>

        {loading ? (
          <LoadingSpinner text="Loading courses" />
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-2 py-2">Name</th>
                  <th className="px-2 py-2">Code</th>
                  <th className="px-2 py-2">Department</th>
                  <th className="px-2 py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {courses.map((course) => (
                  <tr key={course.id} className="border-b border-slate-100">
                    <td className="px-2 py-2 font-semibold text-slate-800">{course.name}</td>
                    <td className="px-2 py-2 text-slate-600">{course.code}</td>
                    <td className="px-2 py-2 text-slate-600">{course.department_name || '-'}</td>
                    <td className="px-2 py-2">
                      <button
                        type="button"
                        onClick={() => onDelete(course.id)}
                        className="rounded-lg border border-rose-300 px-2 py-1 text-xs font-semibold text-rose-700"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {courses.length === 0 && <p className="py-3 text-sm text-slate-500">No courses found.</p>}
          </div>
        )}
      </div>
    </div>
  )
}

export default ManageCourses

"use client"

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'react-toastify'
import { examAPI } from '../../api/examAPI'
import QuestionBuilder from '../../components/questions/QuestionBuilder'
import LoadingSpinner from '../../components/LoadingSpinner'
import { getErrorMessage } from '../../utils/errors'

function toUtcISOString(localDateTimeValue) {
  if (!localDateTimeValue) {
    return ''
  }

  const parsed = new Date(localDateTimeValue)
  if (Number.isNaN(parsed.getTime())) {
    return ''
  }

  return parsed.toISOString()
}

function CreateExam() {
  const [loading, setLoading] = useState(true)
  const [exams, setExams] = useState([])
  const [departments, setDepartments] = useState([])
  const [courses, setCourses] = useState([])
  const [teacherProfile, setTeacherProfile] = useState(null)
  const [step, setStep] = useState('basic')
  const [activeExam, setActiveExam] = useState(null)

  const form = useForm({
    defaultValues: {
      title: '',
      description: '',
      department: '',
      course: '',
      pass_marks: 0,
      duration_minutes: 60,
      start_time: '',
      end_time: '',
      shuffle_questions: false,
      allow_review: true,
    },
  })

  const selectedDepartment = form.watch('department')

  const filteredCourses = useMemo(
    () => courses.filter((course) => !selectedDepartment || course.department === selectedDepartment),
    [courses, selectedDepartment],
  )

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [{ data: examData }, { data: deptData }, { data: courseData }, { data: profileData }] = await Promise.all([
        examAPI.listTeacherExams(),
        examAPI.listTeacherDepartments(),
        examAPI.listTeacherCourses(),
        examAPI.getTeacherProfile(),
      ])

      const departmentRows = Array.isArray(deptData) ? deptData : []
      const courseRows = Array.isArray(courseData) ? courseData : []
      setExams(Array.isArray(examData) ? examData : [])
      setDepartments(departmentRows)
      setCourses(courseRows)
      setTeacherProfile(profileData)

      const teacherDepartmentId = profileData?.department
      if (teacherDepartmentId && departmentRows.some((item) => item.id === teacherDepartmentId)) {
        form.setValue('department', teacherDepartmentId)
      } else if (!form.getValues('department') && departmentRows.length === 1) {
        form.setValue('department', departmentRows[0].id)
      }
    } catch (error) {
      toast.error(getErrorMessage(error, 'Unable to load exams'))
    } finally {
      setLoading(false)
    }
  }, [form])

  useEffect(() => {
    loadData()
  }, [loadData])

  useEffect(() => {
    const selectedCourse = form.getValues('course')
    if (selectedCourse && !filteredCourses.some((course) => course.id === selectedCourse)) {
      form.setValue('course', '')
    }
  }, [filteredCourses, form])

  const activeExamStatus = useMemo(() => {
    if (!activeExam) {
      return null
    }

    const match = exams.find((exam) => exam.id === activeExam.id)
    return match || activeExam
  }, [activeExam, exams])

  const onCreateAndContinue = async (values) => {
    try {
      const startTime = toUtcISOString(values.start_time)
      const endTime = toUtcISOString(values.end_time)

      if (!startTime || !endTime) {
        toast.error('Please provide valid start and end date-time values.')
        return
      }

      const payload = {
        ...values,
        course: values.course || null,
        start_time: startTime,
        end_time: endTime,
        pass_marks: Number(values.pass_marks),
        duration_minutes: Number(values.duration_minutes),
      }
      const { data } = await examAPI.createTeacherExam(payload)
      setActiveExam(data)
      setStep('builder')
      toast.success('Exam created. Continue with questions below.')
      await loadData()
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to create exam'))
    }
  }

  const onPublish = async (id) => {
    try {
      await examAPI.publishTeacherExam(id)
      toast.success('Exam published')
      await loadData()
    } catch (error) {
      toast.error(getErrorMessage(error, 'Publish failed'))
    }
  }

  const onPublishResults = async (id) => {
    try {
      await examAPI.publishTeacherResults(id)
      toast.success('Results published')
    } catch (error) {
      toast.error(getErrorMessage(error, 'Publish results failed'))
    }
  }

  const onDelete = async (id) => {
    try {
      await examAPI.deleteTeacherExam(id)
      toast.success('Exam deleted')
      await loadData()
    } catch (error) {
      toast.error(getErrorMessage(error, 'Delete failed'))
    }
  }

  const openBuilder = (exam) => {
    setActiveExam(exam)
    setStep('builder')
  }

  const startNewExam = () => {
    const defaultDepartment =
      teacherProfile?.department ||
      (departments.length === 1 ? departments[0].id : '')

    setActiveExam(null)
    setStep('basic')
    form.reset({
      title: '',
      description: '',
      department: defaultDepartment,
      course: '',
      pass_marks: 1,
      duration_minutes: 60,
      start_time: '',
      end_time: '',
      shuffle_questions: false,
      allow_review: true,
    })
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Create Exam Workflow</h1>
        <p className="text-sm text-slate-600">Step 1: basic details. Step 2: inline question builder.</p>
      </div>

      {step === 'basic' && (
        <div className="card p-4">
          <h2 className="text-lg font-bold text-slate-900">Step 1: Create exam</h2>
          <form className="mt-3 grid gap-3 md:grid-cols-2" onSubmit={form.handleSubmit(onCreateAndContinue)}>
            <input className="rounded-xl border border-slate-200 px-3 py-2 text-sm" placeholder="Exam title" {...form.register('title', { required: true })} />
            <select className="rounded-xl border border-slate-200 px-3 py-2 text-sm" {...form.register('department', { required: true })}>
              <option value="">Select department</option>
              {departments.map((dept) => (
                <option key={dept.id} value={dept.id}>
                  {dept.name}
                </option>
              ))}
            </select>

            <select className="rounded-xl border border-slate-200 px-3 py-2 text-sm" {...form.register('course')}>
              <option value="">All courses in department</option>
              {filteredCourses.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.name}
                </option>
              ))}
            </select>

            <textarea className="rounded-xl border border-slate-200 px-3 py-2 text-sm md:col-span-2" rows={3} placeholder="Description" {...form.register('description')} />
            <input type="number" className="rounded-xl border border-slate-200 px-3 py-2 text-sm" placeholder="Pass marks" {...form.register('pass_marks', { required: true })} />
            <input type="number" className="rounded-xl border border-slate-200 px-3 py-2 text-sm" placeholder="Duration in minutes" {...form.register('duration_minutes', { required: true })} />
            <input type="datetime-local" className="rounded-xl border border-slate-200 px-3 py-2 text-sm" {...form.register('start_time', { required: true })} />
            <input type="datetime-local" className="rounded-xl border border-slate-200 px-3 py-2 text-sm" {...form.register('end_time', { required: true })} />

            <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
              <input type="checkbox" {...form.register('shuffle_questions')} /> Shuffle questions
            </label>
            <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
              <input type="checkbox" {...form.register('allow_review')} /> Allow review
            </label>

            <button type="submit" className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white md:w-fit">
              Create & Continue
            </button>
          </form>

          {departments.length === 0 && (
            <p className="mt-3 text-xs text-rose-700">No department is linked to your teacher account or organization.</p>
          )}
        </div>
      )}

      {step === 'builder' && activeExamStatus && (
        <>
          <div className="card p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Step 2: Build questions</h2>
                <p className="text-sm text-slate-600">
                  {activeExamStatus.title} | {activeExamStatus.department_name || 'Department'}
                  {activeExamStatus.course_name ? ` | ${activeExamStatus.course_name}` : ''}
                </p>
              </div>
              <div className="flex gap-2">
                <span className="chip">{activeExamStatus.is_published ? 'Published' : 'Draft'}</span>
                <button
                  type="button"
                  onClick={startNewExam}
                  className="rounded-xl border border-slate-300 px-3 py-2 text-xs font-bold text-slate-700"
                >
                  New exam
                </button>
              </div>
            </div>
          </div>

          <QuestionBuilder
            examId={activeExamStatus.id}
            examTitle={activeExamStatus.title}
            onPublished={async () => {
              await loadData()
            }}
          />
        </>
      )}

      <div className="card p-4">
        <h2 className="text-lg font-bold text-slate-900">Existing exams</h2>

        {loading ? (
          <LoadingSpinner text="Loading exams" />
        ) : (
          <div className="mt-3 space-y-3">
            {exams.map((exam) => (
              <div key={exam.id} className="rounded-xl border border-slate-200 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-semibold text-slate-800">{exam.title}</p>
                    <p className="text-xs text-slate-500">
                      {exam.department_name || 'Department'}
                      {exam.course_name ? ` | ${exam.course_name}` : ''}
                      {' '}| {exam.duration_minutes} mins
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <span className="chip">{exam.is_published ? 'Published' : 'Draft'}</span>
                    <button
                      type="button"
                      onClick={() => openBuilder(exam)}
                      className="rounded-lg border border-slate-300 px-2 py-1 text-xs font-semibold"
                    >
                      Open Builder
                    </button>
                    {!exam.is_published && (
                      <button
                        type="button"
                        onClick={() => onPublish(exam.id)}
                        className="rounded-lg border border-teal-300 px-2 py-1 text-xs font-semibold text-teal-700"
                      >
                        Publish exam
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => onPublishResults(exam.id)}
                      className="rounded-lg border border-blue-300 px-2 py-1 text-xs font-semibold text-blue-700"
                    >
                      Publish results
                    </button>
                    <button
                      type="button"
                      onClick={() => onDelete(exam.id)}
                      className="rounded-lg border border-rose-300 px-2 py-1 text-xs font-semibold text-rose-700"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {exams.length === 0 && <p className="text-sm text-slate-500">No exams found.</p>}
          </div>
        )}
      </div>
    </div>
  )
}

export default CreateExam

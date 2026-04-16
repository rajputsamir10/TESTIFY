"use client"

import { useEffect, useMemo, useState } from 'react'
import { toast } from 'react-toastify'
import { examAPI } from '../../api/examAPI'
import LoadingSpinner from '../../components/LoadingSpinner'
import { getErrorMessage } from '../../utils/errors'

function EvaluateAnswers() {
  const [loading, setLoading] = useState(true)
  const [exams, setExams] = useState([])
  const [attempts, setAttempts] = useState([])
  const [answers, setAnswers] = useState([])
  const [selectedExam, setSelectedExam] = useState('')
  const [selectedAttempt, setSelectedAttempt] = useState('')

  const manualAnswers = useMemo(
    () => answers.filter((answer) => (
      answer.question_type === 'subjective'
      || ((answer.question_type === 'coding' || answer.question_type === 'dsa') && answer.coding_language === 'html')
    )),
    [answers],
  )

  useEffect(() => {
    const run = async () => {
      setLoading(true)
      try {
        const { data } = await examAPI.listTeacherExams()
        const allExams = Array.isArray(data) ? data : []
        setExams(allExams)
        if (allExams.length > 0) {
          setSelectedExam(allExams[0].id)
        }
      } catch (error) {
        toast.error(getErrorMessage(error, 'Unable to load exams'))
      } finally {
        setLoading(false)
      }
    }

    run()
  }, [])

  useEffect(() => {
    if (!selectedExam) {
      setAttempts([])
      setSelectedAttempt('')
      return
    }

    examAPI
      .listExamAttempts(selectedExam)
      .then(({ data }) => {
        const rows = Array.isArray(data) ? data : []
        setAttempts(rows)
        setSelectedAttempt(rows[0]?.id || '')
      })
      .catch(() => {
        setAttempts([])
        setSelectedAttempt('')
      })
  }, [selectedExam])

  useEffect(() => {
    if (!selectedAttempt) {
      setAnswers([])
      return
    }

    examAPI
      .listAttemptAnswersForTeacher(selectedAttempt)
      .then(({ data }) => {
        setAnswers(Array.isArray(data) ? data : [])
      })
      .catch(() => {
        setAnswers([])
      })
  }, [selectedAttempt])

  const onEvaluate = async (answerId, maxMarks) => {
    const input = window.prompt(`Enter marks between 0 and ${maxMarks}:`, '0')
    if (input === null) {
      return
    }

    const marks = Number(input)

    if (Number.isNaN(marks) || marks < 0 || marks > Number(maxMarks)) {
      toast.error('Invalid marks value')
      return
    }

    try {
      await examAPI.evaluateAnswer(answerId, marks)
      toast.success('Answer evaluated')
      const { data } = await examAPI.listAttemptAnswersForTeacher(selectedAttempt)
      setAnswers(Array.isArray(data) ? data : [])
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to evaluate answer'))
    }
  }

  if (loading) {
    return <LoadingSpinner text="Loading evaluation center" />
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Evaluate manual answers</h1>
        <p className="text-sm text-slate-600">Pick an exam and attempt, then score subjective and HTML responses.</p>
      </div>

      <div className="card p-4">
        <div className="grid gap-3 md:grid-cols-2">
          <label className="text-sm font-semibold text-slate-700">
            Exam
            <select value={selectedExam} onChange={(event) => setSelectedExam(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm">
              <option value="">Select exam</option>
              {exams.map((exam) => (
                <option key={exam.id} value={exam.id}>
                  {exam.title}
                </option>
              ))}
            </select>
          </label>

          <label className="text-sm font-semibold text-slate-700">
            Attempt
            <select value={selectedAttempt} onChange={(event) => setSelectedAttempt(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm">
              <option value="">Select attempt</option>
              {attempts.map((attempt) => (
                <option key={attempt.id} value={attempt.id}>
                  {attempt.student_name} | {attempt.status}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <div className="card p-4">
        <h2 className="text-lg font-bold text-slate-900">Manual-evaluation answers</h2>
        <div className="mt-3 space-y-3">
          {manualAnswers.map((answer) => (
            <div key={answer.id} className="rounded-xl border border-slate-200 p-3">
              <p className="font-semibold text-slate-800">{answer.question_text}</p>

              {answer.question_type === 'subjective' ? (
                <p className="mt-2 text-sm text-slate-700">{answer.text_answer || 'No answer text submitted.'}</p>
              ) : (
                <div className="mt-2 rounded-lg border border-slate-200 bg-slate-50 p-2">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">HTML/CSS submission</p>
                  <pre className="max-h-56 overflow-auto whitespace-pre-wrap text-xs text-slate-700">
                    {answer.code_answer || 'No code submitted.'}
                  </pre>
                </div>
              )}

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="chip">Max: {answer.max_marks}</span>
                <span className="chip">Awarded: {answer.marks_awarded}</span>
                <span className="chip">{answer.is_evaluated ? 'Evaluated' : 'Pending'}</span>
                <button
                  type="button"
                  onClick={() => onEvaluate(answer.id, answer.max_marks)}
                  className="rounded-lg border border-teal-300 px-2 py-1 text-xs font-semibold text-teal-700"
                >
                  Evaluate
                </button>
              </div>
            </div>
          ))}

          {manualAnswers.length === 0 && <p className="text-sm text-slate-500">No manual-evaluation answers available for selected attempt.</p>}
        </div>
      </div>
    </div>
  )
}

export default EvaluateAnswers

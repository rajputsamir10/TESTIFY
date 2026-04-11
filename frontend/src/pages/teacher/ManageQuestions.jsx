import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { toast } from 'react-toastify'
import { examAPI } from '../../api/examAPI'
import QuestionBuilder from '../../components/questions/QuestionBuilder'
import LoadingSpinner from '../../components/LoadingSpinner'
import { getErrorMessage } from '../../utils/errors'

function ManageQuestions() {
  const { id } = useParams()
  const [examList, setExamList] = useState([])
  const [loading, setLoading] = useState(true)

  const loadExams = useCallback(async () => {
    const { data } = await examAPI.listTeacherExams()
    setExamList(Array.isArray(data) ? data : [])
  }, [])

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      await loadExams()
    } catch (error) {
      toast.error(getErrorMessage(error, 'Unable to load question data'))
    } finally {
      setLoading(false)
    }
  }, [loadExams])

  useEffect(() => {
    void loadData()
  }, [loadData, id])

  const selectedExam = useMemo(
    () => examList.find((item) => item.id === id) || null,
    [examList, id],
  )

  if (loading) {
    return <LoadingSpinner text="Loading question workspace" />
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Manage questions</h1>
        <p className="text-sm text-slate-600">Open an exam and edit questions inline.</p>
      </div>

      {!id && (
        <div className="card p-4">
          <h2 className="text-lg font-bold text-slate-900">Pick an exam</h2>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {examList.map((exam) => (
              <Link key={exam.id} to={`/teacher/exams/${exam.id}/questions`} className="rounded-xl border border-slate-200 p-3">
                <p className="font-semibold text-slate-800">{exam.title}</p>
                <p className="text-xs text-slate-500">{exam.department_name || 'Department'}</p>
              </Link>
            ))}
            {examList.length === 0 && <p className="text-sm text-slate-500">No exams available.</p>}
          </div>
        </div>
      )}

      {id && (
        <QuestionBuilder
          examId={id}
          examTitle={selectedExam?.title || 'Exam'}
          onPublished={async () => {
            await loadData()
          }}
        />
      )}
    </div>
  )
}

export default ManageQuestions

"use client"

import { useEffect, useState } from 'react'
import { toast } from 'react-toastify'
import { resultAPI } from '../../api/resultAPI'
import LoadingSpinner from '../../components/LoadingSpinner'
import { getErrorMessage } from '../../utils/errors'

function Results() {
  const [loading, setLoading] = useState(true)
  const [results, setResults] = useState([])
  const [selectedReview, setSelectedReview] = useState(null)

  const loadData = async () => {
    setLoading(true)
    try {
      const { data } = await resultAPI.listResults()
      setResults(Array.isArray(data) ? data : [])
    } catch (error) {
      toast.error(getErrorMessage(error, 'Unable to load results'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const onReview = async (resultId) => {
    try {
      const { data } = await resultAPI.getReview(resultId)
      setSelectedReview(data)
    } catch (error) {
      toast.error(getErrorMessage(error, 'Unable to load review'))
      setSelectedReview(null)
    }
  }

  const onDownload = async (resultId, format) => {
    try {
      const { data, headers } = await resultAPI.downloadResult(resultId, format)
      const blob = new Blob([data])
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      const disposition = headers['content-disposition'] || ''
      const fallbackName = `result_${resultId}.${format === 'excel' ? 'xlsx' : 'pdf'}`
      const filename = disposition.includes('filename=') ? disposition.split('filename=')[1].replaceAll('"', '') : fallbackName
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)
    } catch (error) {
      toast.error(getErrorMessage(error, `Unable to download ${format}`))
    }
  }

  if (loading) {
    return <LoadingSpinner text="Loading results" />
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Results</h1>
        <p className="text-sm text-slate-600">Published outcomes with review and download options.</p>
      </div>

      <div className="card p-4">
        <h2 className="text-lg font-bold text-slate-900">Published results</h2>
        <div className="mt-3 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                <th className="px-2 py-2">Exam</th>
                <th className="px-2 py-2">Marks</th>
                <th className="px-2 py-2">Percentage</th>
                <th className="px-2 py-2">Status</th>
                <th className="px-2 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {results.map((row) => (
                <tr key={row.id} className="border-b border-slate-100">
                  <td className="px-2 py-2 font-semibold text-slate-800">{row.exam_title}</td>
                  <td className="px-2 py-2 text-slate-700">{row.marks_obtained} / {row.total_marks}</td>
                  <td className="px-2 py-2 text-slate-700">{Number(row.percentage || 0).toFixed(2)}%</td>
                  <td className="px-2 py-2">
                    <span className="chip">{row.is_passed ? 'Pass' : 'Fail'}</span>
                  </td>
                  <td className="px-2 py-2">
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => onReview(row.id)}
                        className="rounded-lg border border-slate-300 px-2 py-1 text-xs font-semibold"
                      >
                        Review
                      </button>
                      <button
                        type="button"
                        onClick={() => onDownload(row.id, 'pdf')}
                        className="rounded-lg border border-blue-300 px-2 py-1 text-xs font-semibold text-blue-700"
                      >
                        PDF
                      </button>
                      <button
                        type="button"
                        onClick={() => onDownload(row.id, 'excel')}
                        className="rounded-lg border border-emerald-300 px-2 py-1 text-xs font-semibold text-emerald-700"
                      >
                        Excel
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {results.length === 0 && <p className="py-3 text-sm text-slate-500">No published results yet.</p>}
        </div>
      </div>

      {selectedReview && (
        <div className="card p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900">Review: {selectedReview.result?.exam_title}</h2>
            <button type="button" onClick={() => setSelectedReview(null)} className="rounded-lg border border-slate-300 px-2 py-1 text-xs font-semibold">
              Close
            </button>
          </div>

          <div className="space-y-2">
            {(selectedReview.answers || []).map((answer) => (
              <div key={answer.id} className="rounded-xl border border-slate-200 p-3">
                <p className="font-semibold text-slate-800">{answer.question_text}</p>
                <p className="mt-1 text-sm text-slate-700">{answer.text_answer || answer.selected_option || 'No answer'}</p>
                <p className="mt-1 text-xs text-slate-500">Awarded: {answer.marks_awarded}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default Results

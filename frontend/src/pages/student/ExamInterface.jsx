import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { toast } from 'react-toastify'
import useAntiCheat from '../../hooks/useAntiCheat'
import useExamTimer from '../../hooks/useExamTimer'
import useAnswerAutoSave from '../../hooks/useAnswerAutoSave'
import useWebcamProctoring from '../../hooks/useWebcamProctoring'
import { studentAPI } from '../../api/studentAPI'
import LoadingSpinner from '../../components/LoadingSpinner'
import CodeEditor from '../../components/CodeEditor'
import { getErrorMessage } from '../../utils/errors'
import { getLanguageLabel } from '../../utils/codeTemplates'

function ExamInterface() {
  const navigate = useNavigate()
  const { id: examId } = useParams()
  const [searchParams] = useSearchParams()

  const attemptId = searchParams.get('attemptId') || ''
  const [answerRows, setAnswerRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [optionsByQuestion, setOptionsByQuestion] = useState({})
  const [runResultByAnswer, setRunResultByAnswer] = useState({})
  const [runningByAnswer, setRunningByAnswer] = useState({})
  const [lockOverlayMessage, setLockOverlayMessage] = useState('')
  const [redirectScheduled, setRedirectScheduled] = useState(false)

  const { answers, hydrate, updateAnswer } = useAnswerAutoSave(attemptId)

  const redirectToResults = useCallback(() => {
    if (redirectScheduled) {
      return
    }

    setRedirectScheduled(true)
    window.setTimeout(() => {
      navigate('/student/results', { replace: true })
    }, 3000)
  }, [navigate, redirectScheduled])

  const handleViolationAutoSubmit = useCallback(() => {
    setLockOverlayMessage('Exam auto-submitted due to repeated tab switching.')
    redirectToResults()
  }, [redirectToResults])

  const handleTimerAutoSubmit = useCallback(async () => {
    if (!attemptId) {
      return
    }

    setLockOverlayMessage('Exam auto-submitted because time is over.')

    try {
      await studentAPI.autoSubmitAttempt(attemptId)
      toast.error('Exam auto-submitted because time is up.')
    } catch (error) {
      toast.error(getErrorMessage(error, 'Auto-submit failed'))
    }
    redirectToResults()
  }, [attemptId, redirectToResults])

  const timer = useExamTimer(attemptId, Boolean(attemptId), handleTimerAutoSubmit)
  const { violations, isLocked } = useAntiCheat(attemptId, handleViolationAutoSubmit, Boolean(attemptId))
  const { cameraStatus } = useWebcamProctoring(attemptId, handleViolationAutoSubmit, Boolean(attemptId))

  useEffect(() => {
    if (!attemptId) {
      toast.error('Invalid exam session. Start from exam instructions.')
      navigate('/student/exams', { replace: true })
    }
  }, [attemptId, navigate])

  useEffect(() => {
    if (isLocked && !lockOverlayMessage) {
      setLockOverlayMessage('Exam auto-submitted due to repeated tab switching.')
      redirectToResults()
    }
  }, [isLocked, lockOverlayMessage, redirectToResults])

  useEffect(() => {
    const bootstrap = async () => {
      if (!attemptId) {
        return
      }

      setLoading(true)
      try {
        const serverAnswers = await hydrate()
        setAnswerRows(Array.isArray(serverAnswers) ? serverAnswers : [])
      } catch (error) {
        toast.error(getErrorMessage(error, 'Unable to initialize exam'))
        navigate('/student/exams', { replace: true })
      } finally {
        setLoading(false)
      }
    }

    void bootstrap()
  }, [attemptId, examId, hydrate, navigate])

  useEffect(() => {
    if (!attemptId) {
      return
    }

    const mcqQuestions = answerRows.filter((row) => row.question_type === 'mcq')

    if (mcqQuestions.length === 0) {
      return
    }

    Promise.all(
      mcqQuestions.map(async (row) => {
        try {
          const { data } = await studentAPI.getQuestionOptions(row.question)
          return [row.question, Array.isArray(data) ? data : []]
        } catch {
          return [row.question, []]
        }
      }),
    ).then((entries) => {
      setOptionsByQuestion(Object.fromEntries(entries))
    })
  }, [attemptId, answerRows])

  const currentAnswer = useMemo(() => answerRows[currentIndex] || null, [answerRows, currentIndex])

  const currentExecutionResult = useMemo(() => {
    if (!currentAnswer) {
      return null
    }
    const result = runResultByAnswer[currentAnswer.id] || answers[currentAnswer.id]?.execution_result || null
    if (!result || (typeof result === 'object' && Object.keys(result).length === 0)) {
      return null
    }
    return result
  }, [answers, currentAnswer, runResultByAnswer])

  const progressLabel = useMemo(() => {
    if (answerRows.length === 0) {
      return '0 / 0'
    }
    return `${currentIndex + 1} / ${answerRows.length}`
  }, [currentIndex, answerRows.length])

  const onSubmitExam = async () => {
    if (!attemptId) {
      return
    }

    const confirmSubmit = window.confirm('Submit exam now? You cannot edit answers after submission.')
    if (!confirmSubmit) {
      return
    }

    try {
      await studentAPI.submitAttempt(attemptId)
      toast.success('Exam submitted successfully')
      navigate('/student/results', { replace: true })
    } catch (error) {
      toast.error(getErrorMessage(error, 'Unable to submit exam'))
    }
  }

  const onRunCode = async () => {
    const isCodingQuestion = currentAnswer && (currentAnswer.question_type === 'coding' || currentAnswer.question_type === 'dsa')
    if (!isCodingQuestion) {
      return
    }

    if (currentAnswer.coding_language === 'html') {
      toast.info('Use HTML preview for this question. Server-side run is disabled for HTML/CSS.')
      return
    }

    const code = answers[currentAnswer.id]?.code_answer || ''
    if (!String(code).trim()) {
      toast.error('Write code before running test cases.')
      return
    }

    setRunningByAnswer((prev) => ({ ...prev, [currentAnswer.id]: true }))
    try {
      const { data } = await studentAPI.runCodingAnswer(currentAnswer.id, { code_answer: code })
      const result = data?.result || null
      if (result) {
        setRunResultByAnswer((prev) => ({ ...prev, [currentAnswer.id]: result }))
        toast.success(`Passed ${result.passed_count}/${result.total_cases} sample tests`)
      }
    } catch (error) {
      toast.error(getErrorMessage(error, 'Code execution failed'))
    } finally {
      setRunningByAnswer((prev) => ({ ...prev, [currentAnswer.id]: false }))
    }
  }

  if (loading || timer.loading) {
    return <LoadingSpinner text="Preparing exam interface" />
  }

  return (
    <div className="relative space-y-4">
      <div className="fixed right-5 top-20 z-30 flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 shadow-sm">
        <span className={`h-2.5 w-2.5 rounded-full ${cameraStatus === 'active' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
        <span className="text-xs font-semibold text-slate-700">{cameraStatus === 'active' ? 'Camera active' : 'Camera off'}</span>
      </div>

      <div className="card flex flex-wrap items-center justify-between gap-2 p-4">
        <p className="text-sm font-semibold text-slate-700">Progress: {progressLabel}</p>
        <div className="flex flex-wrap items-center gap-2">
          <span className={`chip ${timer.danger ? 'border-rose-300 text-rose-700' : ''}`}>Time left: {timer.remainingLabel}</span>
          <span className="chip">Violations: {violations}</span>
        </div>
      </div>

      {!currentAnswer && (
        <div className="card p-4">
          <p className="text-sm text-slate-500">No answer records found for this attempt.</p>
        </div>
      )}

      {currentAnswer && (
        <div className="card p-5">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Question {currentIndex + 1} of {answerRows.length}
          </p>
          <h2 className="text-lg font-bold text-slate-900">{currentAnswer.question_text}</h2>
          <p className="mt-1 text-xs text-slate-500">Type: {currentAnswer.question_type} | Marks: {currentAnswer.question_marks}</p>

          {currentAnswer.question_type === 'subjective' ? (
            <textarea
              className="mt-4 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              rows={8}
              value={answers[currentAnswer.id]?.text_answer || ''}
              onChange={(event) => {
                updateAnswer(currentAnswer.id, {
                  text_answer: event.target.value,
                })
              }}
              placeholder="Type your answer here"
            />
          ) : currentAnswer.question_type === 'mcq' ? (
            <div className="mt-4 space-y-2">
              {(optionsByQuestion[currentAnswer.question] || []).map((option) => (
                <label key={option.id} className="flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 p-2">
                  <input
                    type="radio"
                    name={`mcq-${currentAnswer.id}`}
                    checked={answers[currentAnswer.id]?.selected_option === option.id}
                    onChange={() => {
                      updateAnswer(currentAnswer.id, {
                        selected_option: option.id,
                      })
                    }}
                  />
                  <span className="text-sm text-slate-700">{option.option_text}</span>
                </label>
              ))}

              {(optionsByQuestion[currentAnswer.question] || []).length === 0 && (
                <p className="rounded-xl border border-amber-200 bg-amber-50 p-2 text-xs text-amber-800">
                  MCQ options are unavailable from API. Contact admin if this persists.
                </p>
              )}
            </div>
          ) : (
            <div className="mt-4 space-y-4">
              <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                <p><span className="font-semibold text-slate-900">Problem:</span> {currentAnswer.problem_statement || 'No problem statement provided.'}</p>
                <p><span className="font-semibold text-slate-900">Input format:</span> {currentAnswer.input_format || '-'}</p>
                <p><span className="font-semibold text-slate-900">Output format:</span> {currentAnswer.output_format || '-'}</p>
                <p><span className="font-semibold text-slate-900">Constraints:</span> {currentAnswer.constraints || '-'}</p>
              </div>

              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Code editor</p>
                  <span className="rounded-full border border-slate-300 px-2 py-0.5 text-[11px] font-semibold text-slate-700">
                    Language: {getLanguageLabel(currentAnswer.coding_language || 'python')}
                  </span>
                  <span className="text-[11px] font-medium text-slate-500">Locked by teacher</span>
                  <span className="text-[11px] text-slate-500">
                    Time limit: {currentAnswer.time_limit_seconds || 3}s | Memory: {currentAnswer.memory_limit_mb || 256} MB
                  </span>
                </div>
                <CodeEditor
                  value={answers[currentAnswer.id]?.code_answer || ''}
                  language={currentAnswer.coding_language || 'python'}
                  onChange={(value) => {
                    updateAnswer(currentAnswer.id, {
                      code_answer: value,
                    })
                  }}
                />
              </div>

              {currentAnswer.coding_language === 'html' && (
                <div className="space-y-2 rounded-xl border border-slate-200 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Live preview (sandboxed)</p>
                  <iframe
                    title={`html-preview-${currentAnswer.id}`}
                    className="h-72 w-full rounded-lg border border-slate-200 bg-white"
                    sandbox="allow-scripts"
                    srcDoc={answers[currentAnswer.id]?.code_answer || ''}
                  />
                  <p className="text-xs text-slate-500">
                    HTML/CSS responses are preview-only and will be manually evaluated by the teacher.
                  </p>
                </div>
              )}

              <div className="space-y-2 rounded-xl border border-slate-200 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Sample test cases</p>
                {(currentAnswer.sample_test_cases || []).map((testCase, idx) => (
                  <div key={`${currentAnswer.id}-sample-${idx}`} className="rounded-lg border border-slate-200 p-2 text-xs">
                    <p className="font-semibold text-slate-800">Case {idx + 1}</p>
                    <p className="mt-1 text-slate-700">Input: {testCase?.input || '(empty)'}</p>
                    <p className="text-slate-700">Expected Output: {testCase?.output || '(empty)'}</p>
                  </div>
                ))}

                {(currentAnswer.sample_test_cases || []).length === 0 && (
                  <p className="text-xs text-slate-500">No sample test cases configured for this question.</p>
                )}

                {currentAnswer.question_type === 'dsa' && (
                  <p className="text-xs text-slate-500">
                    Final scoring for DSA uses hidden test cases that are not shown to students.
                  </p>
                )}
              </div>

              {currentAnswer.coding_language !== 'html' && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={onRunCode}
                    disabled={Boolean(runningByAnswer[currentAnswer.id])}
                    className="rounded-xl border border-blue-300 px-3 py-2 text-xs font-semibold text-blue-700 disabled:opacity-60"
                  >
                    {runningByAnswer[currentAnswer.id] ? 'Running...' : 'Run Code'}
                  </button>
                  <p className="text-xs text-slate-500">Runs against sample test cases in secure sandbox mode.</p>
                </div>
              )}

              {currentExecutionResult && (
                <div className="space-y-2 rounded-xl border border-slate-200 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Execution result</p>
                  <p className="text-sm font-semibold text-slate-800">
                    Passed {currentExecutionResult.passed_count || 0}/{currentExecutionResult.total_cases || 0}
                  </p>

                  {currentExecutionResult.detail && <p className="text-xs text-slate-500">{currentExecutionResult.detail}</p>}

                  {(currentExecutionResult.case_results
                    || currentExecutionResult.cases
                    || []).map((caseResult) => (
                    <div key={`${currentAnswer.id}-result-${caseResult.index}`} className="rounded-lg border border-slate-200 p-2 text-xs">
                      <p className="font-semibold text-slate-800">Case {caseResult.index}: {caseResult.passed ? 'Pass' : 'Fail'}</p>
                      <p className="text-slate-700">Expected: {caseResult.expected_output || '(empty)'}</p>
                      <p className="text-slate-700">Actual: {caseResult.actual_output || '(empty)'}</p>
                      {caseResult.error && <p className="text-rose-700">Error: {caseResult.error}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <div className="card flex flex-wrap items-center justify-between gap-2 p-4">
        <div className="flex gap-2">
          <button
            type="button"
            disabled={currentIndex <= 0}
            onClick={() => setCurrentIndex((prev) => Math.max(prev - 1, 0))}
            className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50"
          >
            Previous
          </button>
          <button
            type="button"
            disabled={currentIndex >= answerRows.length - 1}
            onClick={() => setCurrentIndex((prev) => Math.min(prev + 1, answerRows.length - 1))}
            className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50"
          >
            Next
          </button>
        </div>

        <button
          type="button"
          onClick={onSubmitExam}
          disabled={Boolean(lockOverlayMessage)}
          className="rounded-xl bg-rose-700 px-4 py-2 text-sm font-bold text-white"
        >
          Final submit
        </button>
      </div>

      {lockOverlayMessage && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/80 p-4">
          <div className="max-w-xl rounded-2xl bg-white p-6 text-center">
            <h2 className="text-xl font-bold text-rose-700">Exam Submitted</h2>
            <p className="mt-3 text-sm text-slate-700">{lockOverlayMessage}</p>
            <p className="mt-2 text-xs text-slate-500">Redirecting to results...</p>
          </div>
        </div>
      )}
    </div>
  )
}

export default ExamInterface

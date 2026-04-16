"use client"

import { createElement, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'react-toastify'
import {
  BrainCircuit,
  CheckCircle2,
  ChevronDown,
  Clock3,
  Code2,
  Loader2,
  Sparkles,
  Trophy,
} from 'lucide-react'
import { studentAPI } from '../../api/studentAPI'
import CodeEditor from '../../components/CodeEditor'
import LoadingSpinner from '../../components/LoadingSpinner'
import { getLanguageLabel } from '../../utils/codeTemplates'
import { getErrorMessage } from '../../utils/errors'
import './Playground.css'

const QUESTION_TYPE_LABELS = {
  mcq: 'MCQ',
  subjective: 'Subjective',
  coding: 'Coding',
  dsa: 'DSA',
}

const GENERATE_QUESTION_TYPE_OPTIONS = [
  { value: 'mcq', label: 'MCQ' },
  { value: 'subjective', label: 'Subjective' },
  { value: 'dsa', label: 'DSA' },
]

const EMPTY_ANSWER = Object.freeze({
  selected_option_index: null,
  text_answer: '',
  code_answer: '',
})

function normalizeQuestionType(questionType) {
  const normalized = String(questionType || 'mcq').toLowerCase()
  if (normalized === 'subjective' || normalized === 'coding' || normalized === 'dsa') {
    return normalized
  }
  return 'mcq'
}

function buildAnswerFromQuestion(question) {
  return {
    selected_option_index:
      question.selected_option_index !== null && question.selected_option_index !== undefined
        ? question.selected_option_index
        : null,
    text_answer: question.text_answer || '',
    code_answer: question.code_answer || '',
  }
}

function hasMeaningfulAnswer(question, answerValue) {
  const normalizedType = normalizeQuestionType(question?.question_type)
  if (!answerValue) {
    return false
  }

  if (normalizedType === 'mcq') {
    return answerValue.selected_option_index !== null && answerValue.selected_option_index !== undefined
  }

  if (normalizedType === 'subjective') {
    return Boolean(String(answerValue.text_answer || '').trim())
  }

  return Boolean(String(answerValue.code_answer || '').trim())
}

function formatDate(value) {
  if (!value) {
    return 'Not submitted'
  }

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    return 'Not submitted'
  }

  return parsed.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function PlaygroundStatCard({ title, value, badge, icon, orbClass, iconClass, dotClass = 'bg-slate-300' }) {
  const iconNode = icon ? createElement(icon, { className: 'h-5 w-5' }) : null

  return (
    <div className="group relative overflow-hidden card rounded-3xl p-4 transition-all duration-500 hover:-translate-y-1">
      <div className={`absolute -right-8 -top-8 h-32 w-32 rounded-full ${orbClass} transition-transform duration-700 group-hover:scale-150`} />
      <div className="relative z-10 mb-4 flex items-center justify-between">
        <div className={`flex h-10 w-10 items-center justify-center rounded-2xl transition-all ${iconClass}`}>
          {iconNode}
        </div>
        <span className="playground-badge">{badge}</span>
      </div>
      <p className="text-xs font-bold uppercase tracking-widest text-[#515c70]">{title}</p>
      <div className="mt-1.5 flex items-end gap-2">
        <p className="font-heading text-4xl font-black text-[#242f41]">{value}</p>
        <span className={`mb-3 h-2 w-2 rounded-full ${dotClass}`} />
      </div>
    </div>
  )
}

function Playground() {
  const [loading, setLoading] = useState(true)
  const [topic, setTopic] = useState('')
  const [generateQuestionType, setGenerateQuestionType] = useState('mcq')
  const [generating, setGenerating] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [sessionLoading, setSessionLoading] = useState(false)

  const [summary, setSummary] = useState({
    total_tests: 0,
    submitted_tests: 0,
    total_questions: 0,
    total_correct: 0,
    average_score: '0.00',
  })
  const [sessions, setSessions] = useState([])

  const [activeSession, setActiveSession] = useState(null)
  const [questions, setQuestions] = useState([])
  const [answers, setAnswers] = useState({})
  const [isHistoryOpen, setIsHistoryOpen] = useState(false)
  const historyDropdownRef = useRef(null)

  const buildAnswerMap = useCallback((questionRows) => {
    const nextAnswerMap = {}
    questionRows.forEach((row) => {
      nextAnswerMap[row.id] = buildAnswerFromQuestion(row)
    })
    return nextAnswerMap
  }, [])

  const loadOverview = useCallback(async () => {
    try {
      const [{ data: summaryData }, { data: sessionRows }] = await Promise.all([
        studentAPI.getPlaygroundSummary(),
        studentAPI.listPlaygroundSessions(),
      ])
      setSummary(summaryData || {})
      setSessions(Array.isArray(sessionRows) ? sessionRows : [])
    } catch (error) {
      toast.error(getErrorMessage(error, 'Unable to load playground overview'))
    }
  }, [])

  useEffect(() => {
    const bootstrap = async () => {
      setLoading(true)
      await loadOverview()
      setLoading(false)
    }

    void bootstrap()
  }, [loadOverview])

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (!historyDropdownRef.current?.contains(event.target)) {
        setIsHistoryOpen(false)
      }
    }

    document.addEventListener('mousedown', handleOutsideClick)
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick)
    }
  }, [])

  const isSubmitted = activeSession?.status === 'submitted'
  const answeredCount = useMemo(
    () => questions.filter((question) => hasMeaningfulAnswer(question, answers[question.id])).length,
    [questions, answers],
  )

  const updateAnswer = useCallback((questionId, nextPartial) => {
    setAnswers((current) => ({
      ...current,
      [questionId]: {
        ...(current[questionId] || EMPTY_ANSWER),
        ...nextPartial,
      },
    }))
  }, [])

  const onGenerate = async () => {
    const normalizedTopic = topic.trim()
    if (!normalizedTopic) {
      toast.error('Please enter a topic first')
      return
    }

    setGenerating(true)
    try {
      const { data } = await studentAPI.generatePlaygroundQuestions({
        topic: normalizedTopic,
        question_type: generateQuestionType,
      })
      const questionRows = Array.isArray(data.questions) ? data.questions : []
      setActiveSession(data.session)
      setQuestions(questionRows)
      setAnswers(buildAnswerMap(questionRows))
      setTopic('')
      toast.success('Practice test generated')
      await loadOverview()
    } catch (error) {
      toast.error(getErrorMessage(error, 'Unable to generate practice questions'))
    } finally {
      setGenerating(false)
    }
  }

  const onOpenSession = async (sessionId) => {
    setSessionLoading(true)
    try {
      const { data } = await studentAPI.getPlaygroundSession(sessionId)
      const questionRows = Array.isArray(data.questions) ? data.questions : []
      setActiveSession(data.session)
      setQuestions(questionRows)
      setAnswers(buildAnswerMap(questionRows))
    } catch (error) {
      toast.error(getErrorMessage(error, 'Unable to open playground session'))
    } finally {
      setSessionLoading(false)
    }
  }

  const onSubmit = async () => {
    if (!activeSession || isSubmitted) {
      return
    }

    const payloadAnswers = questions
      .map((question) => {
        const answerValue = answers[question.id]
        if (!hasMeaningfulAnswer(question, answerValue)) {
          return null
        }

        const normalizedType = normalizeQuestionType(question.question_type)
        if (normalizedType === 'mcq') {
          return {
            question_id: question.id,
            selected_option_index: answerValue.selected_option_index,
          }
        }

        if (normalizedType === 'subjective') {
          return {
            question_id: question.id,
            text_answer: String(answerValue.text_answer || '').trim(),
          }
        }

        return {
          question_id: question.id,
          code_answer: String(answerValue.code_answer || ''),
        }
      })
      .filter(Boolean)

    if (payloadAnswers.length === 0) {
      toast.error('Answer at least one question before submitting')
      return
    }

    setSubmitting(true)
    try {
      const { data } = await studentAPI.submitPlaygroundSession(activeSession.id, {
        answers: payloadAnswers,
      })
      const questionRows = Array.isArray(data.questions) ? data.questions : []
      setActiveSession(data.session)
      setQuestions(questionRows)
      setAnswers(buildAnswerMap(questionRows))
      toast.success('Playground test submitted')
      await loadOverview()
    } catch (error) {
      toast.error(getErrorMessage(error, 'Unable to submit playground test'))
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return <LoadingSpinner text="Loading playground" />
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-heading text-3xl font-extrabold tracking-tight text-[#242f41]">Playground</h1>
          <p className="mt-1.5 text-sm font-medium text-[#515c70]">
            AI-generated practice tests based on your enrolled course and the topic you enter.
          </p>
        </div>

        <div ref={historyDropdownRef} className="relative w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setIsHistoryOpen((current) => !current)}
            className="inline-flex w-full items-center justify-between gap-2 rounded-xl border border-slate-200/70 bg-white/70 px-4 py-2.5 text-sm font-bold text-[#242f41] shadow-[0_14px_28px_-22px_rgba(15,23,42,0.9)] transition-all hover:border-[#4a40e0]/35 sm:w-[280px]"
            aria-expanded={isHistoryOpen}
            aria-label="Toggle playground history"
          >
            <span className="inline-flex items-center gap-2">
              <Clock3 className="h-4.5 w-4.5 text-[#4a40e0]" />
              Playground History
            </span>
            <ChevronDown className={`h-4 w-4 text-[#6c778c] transition-transform ${isHistoryOpen ? 'rotate-180' : ''}`} />
          </button>

          {isHistoryOpen ? (
            <div className="absolute right-0 z-30 mt-2 w-full overflow-hidden rounded-2xl border border-slate-200/70 bg-white/95 p-2 shadow-[0_20px_45px_-24px_rgba(15,23,42,0.85)] backdrop-blur sm:w-[360px]">
              {sessions.length === 0 ? (
                <p className="px-2 py-3 text-sm text-[#6c778c]">No playground tests yet.</p>
              ) : (
                <div className="max-h-[300px] space-y-2 overflow-y-auto pr-1">
                  {sessions.slice(0, 10).map((session) => (
                    <button
                      key={session.id}
                      type="button"
                      onClick={() => {
                        setIsHistoryOpen(false)
                        void onOpenSession(session.id)
                      }}
                      className="w-full rounded-xl border border-slate-200/70 bg-white px-3 py-2.5 text-left transition-all hover:border-[#4a40e0]/35 hover:shadow-[0_12px_24px_-20px_rgba(74,64,224,0.8)]"
                    >
                      <p className="truncate text-sm font-bold text-[#242f41]">{session.topic}</p>
                      <p className="mt-1 text-[11px] font-semibold text-[#6c778c]">
                        {session.status === 'submitted'
                          ? `Score ${session.score_percent}% • ${formatDate(session.submitted_at)}`
                          : `Generated • ${formatDate(session.created_at)}`}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : null}
        </div>
      </div>

      <section className="grid gap-3.5 md:grid-cols-4">
        <PlaygroundStatCard
          title="Total Playground Tests"
          value={summary.total_tests || 0}
          badge="Sessions"
          icon={BrainCircuit}
          orbClass="bg-[#4a40e0]/5"
          iconClass="bg-indigo-50 text-[#4a40e0] group-hover:bg-[#4a40e0] group-hover:text-white"
        />
        <PlaygroundStatCard
          title="Submitted Tests"
          value={summary.submitted_tests || 0}
          badge="Progress"
          icon={CheckCircle2}
          orbClass="bg-emerald-500/10"
          iconClass="bg-emerald-50 text-emerald-600 group-hover:bg-emerald-500 group-hover:text-white"
          dotClass="bg-emerald-500"
        />
        <PlaygroundStatCard
          title="Total Correct"
          value={summary.total_correct || 0}
          badge="Accuracy"
          icon={Trophy}
          orbClass="bg-amber-500/10"
          iconClass="bg-amber-50 text-amber-600 group-hover:bg-amber-500 group-hover:text-white"
          dotClass="bg-amber-500"
        />
        <PlaygroundStatCard
          title="Average Score"
          value={`${summary.average_score || '0.00'}%`}
          badge="Performance"
          icon={Sparkles}
          orbClass="bg-[#702ae1]/5"
          iconClass="bg-purple-50 text-[#702ae1] group-hover:bg-[#702ae1] group-hover:text-white"
          dotClass="bg-[#702ae1]"
        />
      </section>

      <section className="grid grid-cols-1 gap-5">
        <div className="space-y-5">
          <div className="group relative overflow-hidden card rounded-[1.8rem] p-5 transition-all duration-500 hover:-translate-y-1">
            <div className="absolute -right-8 -bottom-10 h-36 w-36 rounded-full bg-[#4a40e0]/5 transition-transform duration-700 group-hover:scale-150" />
            <div className="relative z-10">
              <div className="mb-4 flex items-center gap-2">
                <BrainCircuit className="h-4.5 w-4.5 text-[#4a40e0]" />
                <h2 className="font-heading text-xl font-extrabold text-[#242f41]">Generate Practice Test</h2>
              </div>

              <label className="block space-y-2">
                <span className="text-xs font-bold uppercase tracking-widest text-[#515c70]">Topic</span>
                <textarea
                  rows={3}
                  value={topic}
                  onChange={(event) => setTopic(event.target.value)}
                  placeholder="Type a topic, for example: Maddani method"
                  className="w-full rounded-2xl border border-transparent bg-[#ecf1ff] px-4 py-3 text-sm text-[#242f41] outline-none transition-all focus:bg-white focus:ring-4 focus:ring-[#4a40e0]/10"
                />
              </label>

              <label className="mt-4 block space-y-2">
                <span className="text-xs font-bold uppercase tracking-widest text-[#515c70]">Question Type</span>
                <select
                  value={generateQuestionType}
                  onChange={(event) => setGenerateQuestionType(event.target.value)}
                  className="w-full rounded-2xl border border-transparent bg-[#ecf1ff] px-4 py-3 text-sm font-semibold text-[#242f41] outline-none transition-all focus:bg-white focus:ring-4 focus:ring-[#4a40e0]/10"
                >
                  {GENERATE_QUESTION_TYPE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <button
                type="button"
                onClick={() => void onGenerate()}
                disabled={generating}
                className="mt-4 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#4a40e0] to-[#7d7bf0] px-5 py-3 text-sm font-bold text-white shadow-[0_12px_22px_-14px_rgba(74,64,224,0.9)] transition-all hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {generating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    Generate Practice Questions
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="group relative overflow-hidden card rounded-[1.8rem] p-5 transition-all duration-500 hover:-translate-y-1">
            <div className="absolute -left-10 -top-10 h-36 w-36 rounded-full bg-[#702ae1]/5 transition-transform duration-700 group-hover:scale-150" />
            <div className="relative z-10">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <h2 className="font-heading text-xl font-extrabold text-[#242f41]">Current Playground Test</h2>
                  <p className="text-xs font-medium text-[#6c778c]">
                    {activeSession
                      ? `${activeSession.topic} • ${activeSession.status}`
                      : 'Generate or open a practice session to begin.'}
                  </p>
                </div>

                {activeSession ? (
                  <span className="chip">Answered: {answeredCount}/{questions.length}</span>
                ) : null}
              </div>

              {sessionLoading ? (
                <LoadingSpinner text="Opening playground session" />
              ) : activeSession ? (
                <div className="space-y-4">
                  {questions.map((question) => {
                    const questionType = normalizeQuestionType(question.question_type)
                    const answerValue = answers[question.id] || EMPTY_ANSWER
                    const selectedIndex = answerValue.selected_option_index
                    const executionResult = question.execution_result || {}
                    const caseResults = Array.isArray(executionResult.case_results)
                      ? executionResult.case_results
                      : []

                    return (
                      <article
                        key={question.id}
                        className="card rounded-2xl p-4"
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-xs font-black uppercase tracking-[0.16em] text-[#8a96ad]">
                            Question {question.order}
                          </p>
                          <span className="chip text-[11px]">
                            {QUESTION_TYPE_LABELS[questionType] || 'MCQ'}
                          </span>
                        </div>
                        <p className="playground-generated-question mt-2 text-sm font-semibold text-[#242f41]">{question.question_text}</p>

                        {questionType === 'mcq' ? (
                          <div className="mt-3 space-y-2">
                            {Array.isArray(question.options) && question.options.map((optionText, index) => {
                              const isSelected = selectedIndex === index
                              const showCorrect = isSubmitted && question.correct_option_index === index
                              const showWrong = isSubmitted && isSelected && question.is_correct === false

                              return (
                                <button
                                  key={`${question.id}-${index}`}
                                  type="button"
                                  onClick={() => {
                                    if (!isSubmitted) {
                                      updateAnswer(question.id, {
                                        selected_option_index: index,
                                      })
                                    }
                                  }}
                                  disabled={isSubmitted}
                                  className={[
                                    'playground-generated-option w-full rounded-xl border px-3 py-2 text-left text-sm transition-all',
                                    showCorrect
                                      ? 'playground-option-correct border-emerald-400 bg-emerald-50 text-emerald-700'
                                      : showWrong
                                        ? 'playground-option-wrong border-rose-400 bg-rose-50 text-rose-700'
                                        : isSelected
                                          ? 'playground-option-selected border-[#4a40e0] bg-[#ecf1ff] text-[#242f41]'
                                          : 'playground-option-default border-slate-200 bg-white text-[#475569] hover:border-[#4a40e0]/40',
                                  ].join(' ')}
                                >
                                  {optionText}
                                </button>
                              )
                            })}
                          </div>
                        ) : null}

                        {questionType === 'subjective' ? (
                          <div className="mt-3 space-y-3">
                            <textarea
                              rows={6}
                              value={answerValue.text_answer || ''}
                              onChange={(event) => {
                                updateAnswer(question.id, {
                                  text_answer: event.target.value,
                                })
                              }}
                              disabled={isSubmitted}
                              placeholder="Type your subjective answer here"
                              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-[#242f41] outline-none transition-all focus:border-[#4a40e0]/30 focus:ring-4 focus:ring-[#4a40e0]/10 disabled:cursor-not-allowed disabled:bg-slate-50"
                            />

                            {isSubmitted && question.expected_answer ? (
                              <div className="playground-reference-answer rounded-xl border p-3 text-xs">
                                <p className="playground-reference-answer-title font-bold">Reference answer</p>
                                <p className="playground-reference-answer-body mt-1 whitespace-pre-wrap">{question.expected_answer}</p>
                              </div>
                            ) : null}
                          </div>
                        ) : null}

                        {(questionType === 'coding' || questionType === 'dsa') ? (
                          <div className="mt-3 space-y-3">
                            <div className="playground-code-meta space-y-2 rounded-xl border p-3 text-sm">
                              <p><span className="playground-code-meta-label">Problem:</span> {question.problem_statement || 'No problem statement provided.'}</p>
                              <p><span className="playground-code-meta-label">Input format:</span> {question.input_format || '-'}</p>
                              <p><span className="playground-code-meta-label">Output format:</span> {question.output_format || '-'}</p>
                              <p><span className="playground-code-meta-label">Constraints:</span> {question.constraints || '-'}</p>
                            </div>

                            <div className="space-y-2">
                              <div className="flex flex-wrap items-center gap-2">
                                <Code2 className="h-4 w-4 text-[#4a40e0]" />
                                <span className="rounded-full border border-slate-300 px-2 py-0.5 text-[11px] font-semibold text-slate-700">
                                  Language: {getLanguageLabel(question.coding_language || 'python')}
                                </span>
                                {questionType === 'dsa' ? (
                                  <span className="text-[11px] text-slate-500">Final grading uses hidden test cases.</span>
                                ) : null}
                              </div>

                              <CodeEditor
                                value={answerValue.code_answer || ''}
                                language={question.coding_language || 'python'}
                                readOnly={isSubmitted}
                                minHeight={260}
                                onChange={(value) => {
                                  updateAnswer(question.id, {
                                    code_answer: value,
                                  })
                                }}
                              />
                            </div>

                            <div className="space-y-2 rounded-xl border border-slate-200 p-3">
                              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Sample test cases</p>
                              {(question.sample_test_cases || []).map((testCase, idx) => (
                                <div key={`${question.id}-sample-${idx}`} className="rounded-lg border border-slate-200 p-2 text-xs">
                                  <p className="font-semibold text-slate-800">Case {idx + 1}</p>
                                  <p className="mt-1 text-slate-700">Input: {testCase?.input || '(empty)'}</p>
                                  <p className="text-slate-700">Expected Output: {testCase?.output || '(empty)'}</p>
                                </div>
                              ))}

                              {(question.sample_test_cases || []).length === 0 ? (
                                <p className="text-xs text-slate-500">No sample test cases provided.</p>
                              ) : null}
                            </div>

                            {isSubmitted ? (
                              <div className="playground-execution-result space-y-2 rounded-xl border p-3">
                                <p className="playground-execution-title text-xs font-semibold uppercase tracking-wide">Execution result</p>
                                <p className={`text-xs font-bold ${question.is_correct ? 'text-emerald-600' : 'text-rose-600'}`}>
                                  {question.is_correct ? 'Checked: Correct' : 'Checked: Incorrect'}
                                </p>
                                <p className="playground-execution-score text-sm font-semibold">
                                  Passed {executionResult.passed_count || 0}/{executionResult.total_cases || 0}
                                </p>
                                {executionResult.detail ? (
                                  <p className="playground-execution-detail text-xs">{executionResult.detail}</p>
                                ) : null}

                                {caseResults.map((caseResult) => (
                                  <div key={`${question.id}-case-${caseResult.index}`} className="playground-execution-case rounded-lg border p-2 text-xs">
                                    <p className="playground-execution-case-title">Case {caseResult.index}</p>
                                    <p className="playground-execution-case-line mt-1"><span className="playground-execution-case-label">Passed:</span> {caseResult.passed ? 'Yes' : 'No'}</p>
                                    <p className="playground-execution-case-line"><span className="playground-execution-case-label">Input:</span> {caseResult.input || '(empty)'}</p>
                                    <p className="playground-execution-case-line"><span className="playground-execution-case-label">Expected:</span> {caseResult.expected_output || '(empty)'}</p>
                                    <p className="playground-execution-case-line"><span className="playground-execution-case-label">Actual:</span> {caseResult.actual_output || '(empty)'}</p>
                                    {caseResult.error ? <p className="text-rose-600">Error: {caseResult.error}</p> : null}
                                  </div>
                                ))}
                              </div>
                            ) : null}
                          </div>
                        ) : null}

                        {isSubmitted ? (
                          <div className="playground-generated-explanation mt-3 rounded-xl bg-[#f8faff] p-3 text-xs text-[#51607a]">
                            <p className="playground-generated-question font-bold text-[#242f41]">
                              {question.is_correct ? 'Correct answer' : 'Incorrect answer'}
                            </p>
                            {question.explanation ? <p className="playground-generated-question mt-1">{question.explanation}</p> : null}
                          </div>
                        ) : null}
                      </article>
                    )
                  })}

                  {!isSubmitted ? (
                    <button
                      type="button"
                      onClick={() => void onSubmit()}
                      disabled={submitting}
                      className="inline-flex items-center gap-2 rounded-xl bg-[#4a40e0] px-5 py-3 text-sm font-bold text-white transition-all hover:bg-[#3d30d4] disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      {submitting ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Submitting...
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="h-4 w-4" />
                          Submit Playground Test
                        </>
                      )}
                    </button>
                  ) : (
                    <div className="inline-flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-2 text-sm font-bold text-emerald-700">
                      <Trophy className="h-4 w-4" />
                      Score: {activeSession.score_percent}% ({activeSession.correct_answers}/{activeSession.question_count})
                    </div>
                  )}
                </div>
              ) : (
                <div className="card rounded-2xl p-6 text-center text-sm font-medium text-[#6c778c]">
                  No active playground test. Generate one from the topic box above.
                </div>
              )}
            </div>
          </div>
        </div>

      </section>
    </div>
  )
}

export default Playground

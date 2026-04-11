import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useFieldArray, useForm, useWatch } from 'react-hook-form'
import { toast } from 'react-toastify'
import { examAPI } from '../../api/examAPI'
import { questionAPI } from '../../api/questionAPI'
import LoadingSpinner from '../LoadingSpinner'
import { getErrorMessage } from '../../utils/errors'
import { CODING_LANGUAGE_OPTIONS, DSA_LANGUAGE_OPTIONS } from '../../utils/codeTemplates'
import QuestionCard from './QuestionCard'

const EXAM_STARTED_POPUP_MESSAGE = 'Times up exam is already Started by the Students '

function getQuestionEditErrorMessage(error, fallback) {
  const message = getErrorMessage(error, fallback)
  const normalized = String(message || '').toLowerCase()

  const isExamStartedLock =
    normalized.includes('times up exam is already started by the students')
    || normalized.includes('started or submitted')
    || normalized.includes('cannot add questions to a published exam')
    || normalized.includes('cannot modify questions after exam publish')
    || normalized.includes('cannot delete questions after exam publish')
    || normalized.includes('locked because at least one student')

  if (isExamStartedLock) {
    return EXAM_STARTED_POPUP_MESSAGE
  }

  return message
}

function makeDefaultOptions() {
  return [
    { option_text: '', is_correct: true },
    { option_text: '', is_correct: false },
    { option_text: '', is_correct: false },
    { option_text: '', is_correct: false },
  ]
}

function makeDefaultSampleCases() {
  return [{ input: '', output: '' }]
}

function makeDefaultHiddenCases() {
  return [{ input: '', output: '' }]
}

function mapTestCases(rawCases, fallback) {
  if (!Array.isArray(rawCases) || rawCases.length === 0) {
    return fallback
  }

  return rawCases.map((testCase) => ({
    input: testCase?.input || '',
    output: testCase?.output || '',
  }))
}

function makeBlankQuestion() {
  return {
    db_id: '',
    question_text: '',
    question_type: 'mcq',
    problem_statement: '',
    input_format: '',
    output_format: '',
    constraints: '',
    coding_language: 'python',
    sample_test_cases: makeDefaultSampleCases(),
    hidden_test_cases: makeDefaultHiddenCases(),
    time_limit_seconds: 3,
    memory_limit_mb: 256,
    marks: 1,
    negative_marks: 0,
    options: makeDefaultOptions(),
    subjective_answer: '',
  }
}

function mapApiQuestionToForm(question) {
  const isCodeQuestion = question.question_type === 'coding' || question.question_type === 'dsa'

  return {
    db_id: question.id,
    question_text: question.question_text || '',
    question_type: question.question_type || 'mcq',
    problem_statement: question.problem_statement || '',
    input_format: question.input_format || '',
    output_format: question.output_format || '',
    constraints: question.constraints || '',
    coding_language: question.coding_language || 'python',
    sample_test_cases: isCodeQuestion
      ? mapTestCases(question.sample_test_cases, makeDefaultSampleCases())
      : makeDefaultSampleCases(),
    hidden_test_cases: question.question_type === 'dsa'
      ? mapTestCases(question.hidden_test_cases, makeDefaultHiddenCases())
      : makeDefaultHiddenCases(),
    time_limit_seconds: Number(question.time_limit_seconds || 3),
    memory_limit_mb: Number(question.memory_limit_mb || 256),
    marks: Number(question.marks || 1),
    negative_marks: Number(question.negative_marks || 0),
    options:
      question.question_type === 'mcq'
        ? (question.options || []).map((option) => ({
            option_text: option.option_text || '',
            is_correct: Boolean(option.is_correct),
          }))
        : makeDefaultOptions(),
    subjective_answer: '',
  }
}

function normalizeQuestionForApi(question, order, examId) {
  const questionText = String(question.question_text || '').trim()
  const questionType = ['mcq', 'subjective', 'coding', 'dsa'].includes(question.question_type)
    ? question.question_type
    : 'mcq'
  const marks = Number(question.marks)

  if (!questionText || !Number.isFinite(marks) || marks <= 0) {
    return { ready: false, payload: null }
  }

  if (questionType === 'subjective') {
    return {
      ready: true,
      payload: {
        exam: examId,
        question_text: questionText,
        question_type: 'subjective',
        marks,
        negative_marks: 0,
        order,
      },
    }
  }

  if (questionType === 'coding' || questionType === 'dsa') {
    const problemStatement = String(question.problem_statement || '').trim()
    const inputFormat = String(question.input_format || '').trim()
    const outputFormat = String(question.output_format || '').trim()
    const constraints = String(question.constraints || '').trim()
    const allowedLanguages = questionType === 'dsa' ? DSA_LANGUAGE_OPTIONS : CODING_LANGUAGE_OPTIONS
    const allowedLanguageValues = allowedLanguages.map((item) => item.value)
    const codingLanguage = String(question.coding_language || '').trim().toLowerCase()

    const sampleTestCases = (question.sample_test_cases || [])
      .map((testCase) => ({
        input: String(testCase?.input || '').trim(),
        output: String(testCase?.output || '').trim(),
      }))
      .filter((testCase) => testCase.output)

    const hiddenTestCases = (question.hidden_test_cases || [])
      .map((testCase) => ({
        input: String(testCase?.input || '').trim(),
        output: String(testCase?.output || '').trim(),
      }))
      .filter((testCase) => testCase.output)

    const timeLimitSeconds = Number(question.time_limit_seconds || 3)
    const memoryLimitMb = Number(question.memory_limit_mb || 256)

    if (
      !problemStatement
      || !inputFormat
      || !outputFormat
      || !constraints
      || !allowedLanguageValues.includes(codingLanguage)
      || !Number.isFinite(timeLimitSeconds)
      || timeLimitSeconds < 1
      || timeLimitSeconds > 10
      || !Number.isFinite(memoryLimitMb)
      || memoryLimitMb < 32
      || (codingLanguage !== 'html' && sampleTestCases.length === 0)
      || (questionType === 'dsa' && hiddenTestCases.length === 0)
    ) {
      return { ready: false, payload: null }
    }

    return {
      ready: true,
      payload: {
        exam: examId,
        question_text: questionText,
        question_type: questionType,
        problem_statement: problemStatement,
        input_format: inputFormat,
        output_format: outputFormat,
        constraints,
        coding_language: codingLanguage,
        sample_test_cases: sampleTestCases,
        hidden_test_cases: questionType === 'dsa' ? hiddenTestCases : [],
        time_limit_seconds: Math.round(timeLimitSeconds),
        memory_limit_mb: Math.round(memoryLimitMb),
        marks,
        negative_marks: 0,
        order,
      },
    }
  }

  const options = (question.options || [])
    .map((option) => ({
      option_text: String(option.option_text || '').trim(),
      is_correct: Boolean(option.is_correct),
    }))
    .filter((option) => option.option_text)

  const correctCount = options.filter((option) => option.is_correct).length
  if (options.length < 2 || correctCount !== 1) {
    return { ready: false, payload: null }
  }

  const negativeMarks = Number(question.negative_marks || 0)

  return {
    ready: true,
    payload: {
      exam: examId,
      question_text: questionText,
      question_type: 'mcq',
      marks,
      negative_marks: Number.isFinite(negativeMarks) && negativeMarks > 0 ? negativeMarks : 0,
      order,
      options: options.map((option, index) => ({
        option_text: option.option_text,
        is_correct: option.is_correct,
        order: index,
      })),
    },
  }
}

function QuestionBuilder({ examId, examTitle, onPublished }) {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [lastSavedAt, setLastSavedAt] = useState(null)

  const form = useForm({
    defaultValues: {
      questions: [makeBlankQuestion()],
    },
  })

  const { control, register, setValue, getValues } = form
  const { fields, append, insert, remove, move, replace } = useFieldArray({
    control,
    name: 'questions',
  })

  const watchedQuestions = useWatch({ control, name: 'questions' })
  const questions = useMemo(
    () => (Array.isArray(watchedQuestions) ? watchedQuestions : []),
    [watchedQuestions],
  )

  const isHydratedRef = useRef(false)
  const saveTimerRef = useRef(null)
  const questionRefs = useRef({})

  const totalMarks = useMemo(
    () => questions.reduce((sum, question) => sum + (Number(question?.marks) || 0), 0),
    [questions],
  )

  const focusQuestion = (index) => {
    window.setTimeout(() => {
      const element = questionRefs.current[index]
      if (element) {
        element.focus()
        element.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
    }, 120)
  }

  const registerQuestionRef = (index, element) => {
    if (element) {
      questionRefs.current[index] = element
    }
  }

  const loadQuestions = useCallback(async () => {
    if (!examId) {
      return
    }

    setLoading(true)
    try {
      const { data } = await questionAPI.listByExam(examId)
      const rows = (Array.isArray(data) ? data : []).map(mapApiQuestionToForm)
      replace(rows.length > 0 ? rows : [makeBlankQuestion()])
      isHydratedRef.current = true
    } catch (error) {
      toast.error(getErrorMessage(error, 'Unable to load questions'))
      replace([makeBlankQuestion()])
      isHydratedRef.current = true
    } finally {
      setLoading(false)
    }
  }, [examId, replace])

  useEffect(() => {
    isHydratedRef.current = false
    void loadQuestions()
  }, [loadQuestions])

  const saveDraft = useCallback(
    async ({ silent = false, requireAllValid = false } = {}) => {
      const snapshot = getValues('questions') || []

      if (snapshot.length === 0) {
        if (!silent) {
          toast.error('Add at least one question before saving.')
        }
        return { ok: false }
      }

      setSaving(true)

      let firstError = ''

      for (let index = 0; index < snapshot.length; index += 1) {
        const question = snapshot[index]
        const normalized = normalizeQuestionForApi(question, index + 1, examId)

        if (!normalized.ready) {
          if (requireAllValid) {
            firstError = 'Complete all question fields before publishing.'
            break
          }
          continue
        }

        try {
          if (question.db_id) {
            await questionAPI.update(question.db_id, normalized.payload)
          } else {
            const { data } = await questionAPI.create(normalized.payload)
            setValue(`questions.${index}.db_id`, data.id, { shouldDirty: false })
          }
        } catch (error) {
          firstError = getQuestionEditErrorMessage(error, 'Failed to save one question')
          break
        }
      }

      setSaving(false)

      if (firstError) {
        if (!silent) {
          toast.error(firstError)
        }
        return { ok: false, error: firstError }
      }

      setLastSavedAt(new Date())
      if (!silent) {
        toast.success('Draft saved')
      }

      return { ok: true }
    },
    [examId, getValues, setValue],
  )

  const onFieldBlur = useCallback(() => {
    void saveDraft({ silent: true })
  }, [saveDraft])

  useEffect(() => {
    if (!isHydratedRef.current || !examId) {
      return undefined
    }

    if (saveTimerRef.current) {
      window.clearTimeout(saveTimerRef.current)
    }

    saveTimerRef.current = window.setTimeout(() => {
      void saveDraft({ silent: true })
    }, 800)

    return () => {
      if (saveTimerRef.current) {
        window.clearTimeout(saveTimerRef.current)
      }
    }
  }, [questions, examId, saveDraft])

  const addQuestionBelow = (index) => {
    insert(index + 1, makeBlankQuestion())
    focusQuestion(index + 1)
  }

  const duplicateQuestion = (index) => {
    const source = getValues(`questions.${index}`)
    if (!source) {
      return
    }

    const clone = {
      ...source,
      db_id: '',
      options: (source.options || []).map((option) => ({ ...option })),
      sample_test_cases: (source.sample_test_cases || []).map((testCase) => ({ ...testCase })),
      hidden_test_cases: (source.hidden_test_cases || []).map((testCase) => ({ ...testCase })),
    }

    insert(index + 1, clone)
    focusQuestion(index + 1)
  }

  const deleteQuestion = async (index) => {
    const target = getValues(`questions.${index}`)

    if (target?.db_id) {
      try {
        await questionAPI.delete(target.db_id)
      } catch (error) {
        toast.error(getQuestionEditErrorMessage(error, 'Unable to delete question'))
        return
      }
    }

    if (fields.length <= 1) {
      replace([makeBlankQuestion()])
      focusQuestion(0)
      return
    }

    remove(index)
  }

  const moveUp = (index) => {
    if (index <= 0) {
      return
    }
    move(index, index - 1)
    onFieldBlur(index - 1)
  }

  const moveDown = (index) => {
    if (index >= fields.length - 1) {
      return
    }
    move(index, index + 1)
    onFieldBlur(index + 1)
  }

  const onPublish = async () => {
    if (questions.length === 0) {
      toast.error('Add at least one question before publishing.')
      return
    }

    const saved = await saveDraft({ silent: true, requireAllValid: true })
    if (!saved.ok) {
      toast.error(saved.error || 'Complete all question fields before publishing.')
      return
    }

    try {
      await examAPI.publishTeacherExam(examId)
      toast.success('Exam published')
      onPublished?.()
    } catch (error) {
      toast.error(getQuestionEditErrorMessage(error, 'Publish failed'))
    }
  }

  if (loading) {
    return <LoadingSpinner text="Loading question builder" />
  }

  return (
    <div className="space-y-4">
      <div className="card p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Question Builder</h2>
            <p className="text-xs text-slate-500">{examTitle || 'Exam'} | Total marks: {totalMarks.toFixed(2)}</p>
            {lastSavedAt && (
              <p className="mt-1 text-xs text-slate-500">Last saved: {lastSavedAt.toLocaleTimeString()}</p>
            )}
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => void saveDraft({ silent: false })}
              className="rounded-xl border border-slate-300 px-3 py-2 text-xs font-bold text-slate-700"
              disabled={saving}
            >
              Save Draft
            </button>
            <button
              type="button"
              onClick={onPublish}
              className="rounded-xl bg-slate-900 px-3 py-2 text-xs font-bold text-white"
              disabled={saving}
            >
              Publish Exam
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {fields.map((field, index) => (
          <QuestionCard
            key={field.id}
            index={index}
            total={fields.length}
            control={control}
            register={register}
            setValue={setValue}
            getValues={getValues}
            onFieldBlur={onFieldBlur}
            onAddBelow={addQuestionBelow}
            onDuplicate={duplicateQuestion}
            onDelete={deleteQuestion}
            onMoveUp={moveUp}
            onMoveDown={moveDown}
            registerQuestionRef={registerQuestionRef}
          />
        ))}
      </div>

      <div className="pt-1">
        <button
          type="button"
          onClick={() => {
            append(makeBlankQuestion())
            focusQuestion(fields.length)
          }}
          className="rounded-xl border border-slate-300 px-3 py-2 text-xs font-bold text-slate-700"
        >
          Add Question
        </button>
      </div>
    </div>
  )
}

export default QuestionBuilder

import { ArrowDown, ArrowUp, Copy, Plus, Trash2 } from 'lucide-react'
import { useFieldArray, useWatch } from 'react-hook-form'
import { CODING_LANGUAGE_OPTIONS, DSA_LANGUAGE_OPTIONS } from '../../utils/codeTemplates'
import MCQOptions from './MCQOptions'

function QuestionCard({
  index,
  total,
  control,
  register,
  setValue,
  getValues,
  onFieldBlur,
  onAddBelow,
  onDuplicate,
  onDelete,
  onMoveUp,
  onMoveDown,
  registerQuestionRef,
}) {
  const base = `questions.${index}`
  const questionType = useWatch({ control, name: `${base}.question_type` }) || 'mcq'
  const isCodeQuestion = questionType === 'coding' || questionType === 'dsa'
  const selectedLanguage = useWatch({ control, name: `${base}.coding_language` }) || 'python'
  const languageOptions = questionType === 'dsa' ? DSA_LANGUAGE_OPTIONS : CODING_LANGUAGE_OPTIONS
  const sampleFieldName = `${base}.sample_test_cases`
  const hiddenFieldName = `${base}.hidden_test_cases`
  const { fields: sampleFields, append: appendSample, remove: removeSample } = useFieldArray({
    control,
    name: sampleFieldName,
  })
  const { fields: hiddenFields, append: appendHidden, remove: removeHidden } = useFieldArray({
    control,
    name: hiddenFieldName,
  })

  const questionTextRegister = register(`${base}.question_text`, {
    onBlur: () => onFieldBlur?.(index),
  })

  return (
    <div className="card animate-fadeUp p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-bold text-slate-800">Question {index + 1}</h3>

        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => onAddBelow(index)} className="rounded-lg border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-700">
            <Plus className="mr-1 inline h-3 w-3" /> Add below
          </button>

          <button type="button" onClick={() => onDuplicate(index)} className="rounded-lg border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-700">
            <Copy className="mr-1 inline h-3 w-3" /> Duplicate
          </button>

          <button
            type="button"
            onClick={() => onDelete(index)}
            className="rounded-lg border border-rose-300 px-2 py-1 text-xs font-semibold text-rose-700"
          >
            <Trash2 className="mr-1 inline h-3 w-3" /> Delete
          </button>

          <button
            type="button"
            onClick={() => onMoveUp(index)}
            disabled={index === 0}
            className="rounded-lg border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-700 disabled:opacity-50"
          >
            <ArrowUp className="mr-1 inline h-3 w-3" /> Up
          </button>

          <button
            type="button"
            onClick={() => onMoveDown(index)}
            disabled={index === total - 1}
            className="rounded-lg border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-700 disabled:opacity-50"
          >
            <ArrowDown className="mr-1 inline h-3 w-3" /> Down
          </button>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <textarea
          className="rounded-xl border border-slate-200 px-3 py-2 text-sm md:col-span-2"
          rows={3}
          placeholder="Title"
          {...questionTextRegister}
          ref={(element) => {
            questionTextRegister.ref(element)
            registerQuestionRef(index, element)
          }}
        />

        <select
          className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
          {...register(`${base}.question_type`, {
            onBlur: () => onFieldBlur?.(index),
            onChange: (event) => {
              const nextType = event.target.value
              if (nextType === 'subjective' || nextType === 'coding' || nextType === 'dsa') {
                setValue(`${base}.negative_marks`, 0, { shouldDirty: true })
              }
              if (nextType === 'dsa' && getValues(`${base}.coding_language`) === 'html') {
                setValue(`${base}.coding_language`, 'python', { shouldDirty: true })
              }
              if (!getValues(`${base}.coding_language`)) {
                setValue(`${base}.coding_language`, 'python', { shouldDirty: true })
              }
            },
          })}
        >
          <option value="mcq">MCQ</option>
          <option value="subjective">Subjective</option>
          <option value="coding">Coding Question</option>
          <option value="dsa">DSA Question</option>
        </select>

        <input
          type="number"
          step="0.01"
          className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
          placeholder="Marks"
          {...register(`${base}.marks`, {
            valueAsNumber: true,
            onBlur: () => onFieldBlur?.(index),
          })}
        />

        {questionType === 'mcq' && (
          <input
            type="number"
            step="0.01"
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
            placeholder="Negative marks"
            {...register(`${base}.negative_marks`, {
              valueAsNumber: true,
              onBlur: () => onFieldBlur?.(index),
            })}
          />
        )}
      </div>

      <div className="mt-3">
        {questionType === 'mcq' ? (
          <MCQOptions
            control={control}
            register={register}
            questionIndex={index}
            setValue={setValue}
            getValues={getValues}
            onFieldBlur={onFieldBlur}
          />
        ) : questionType === 'subjective' ? (
          <textarea
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            rows={3}
            placeholder="Subjective answer notes (optional)"
            {...register(`${base}.subjective_answer`, {
              onBlur: () => onFieldBlur?.(index),
            })}
          />
        ) : (
          <div className="space-y-3">
            {isCodeQuestion && (
              <div className="grid gap-3 md:grid-cols-3">
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Required Language
                  <select
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                    {...register(`${base}.coding_language`, {
                      required: true,
                      onBlur: () => onFieldBlur?.(index),
                    })}
                  >
                    {languageOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <span className="mt-1 block text-[11px] font-medium normal-case tracking-normal text-slate-500">
                    Students cannot switch this language during the exam.
                  </span>
                </label>

                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Time Limit (seconds)
                  <input
                    type="number"
                    min="1"
                    max="10"
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                    {...register(`${base}.time_limit_seconds`, {
                      valueAsNumber: true,
                      onBlur: () => onFieldBlur?.(index),
                    })}
                  />
                </label>

                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Memory Limit (MB)
                  <input
                    type="number"
                    min="32"
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                    {...register(`${base}.memory_limit_mb`, {
                      valueAsNumber: true,
                      onBlur: () => onFieldBlur?.(index),
                    })}
                  />
                </label>
              </div>
            )}

            <textarea
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              rows={4}
              placeholder="Problem statement"
              {...register(`${base}.problem_statement`, {
                onBlur: () => onFieldBlur?.(index),
              })}
            />

            <textarea
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              rows={2}
              placeholder="Input format"
              {...register(`${base}.input_format`, {
                onBlur: () => onFieldBlur?.(index),
              })}
            />

            <textarea
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              rows={2}
              placeholder="Output format"
              {...register(`${base}.output_format`, {
                onBlur: () => onFieldBlur?.(index),
              })}
            />

            <textarea
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              rows={2}
              placeholder="Constraints"
              {...register(`${base}.constraints`, {
                onBlur: () => onFieldBlur?.(index),
              })}
            />

            <div className="space-y-2 rounded-xl border border-slate-200 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Sample test cases</p>
              {selectedLanguage === 'html' && (
                <p className="text-xs text-slate-500">
                  HTML/CSS is preview-only. Sample test cases are optional and hidden-case scoring is disabled.
                </p>
              )}

              {sampleFields.map((sample, sampleIndex) => (
                <div key={sample.id} className="space-y-2 rounded-lg border border-slate-200 p-2">
                  <textarea
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                    rows={2}
                    placeholder="Input"
                    {...register(`${sampleFieldName}.${sampleIndex}.input`, {
                      onBlur: () => onFieldBlur?.(index),
                    })}
                  />

                  <textarea
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                    rows={2}
                    placeholder="Expected output"
                    {...register(`${sampleFieldName}.${sampleIndex}.output`, {
                      onBlur: () => onFieldBlur?.(index),
                    })}
                  />

                  <button
                    type="button"
                    onClick={() => {
                      if (sampleFields.length <= 1) {
                        return
                      }
                      removeSample(sampleIndex)
                      onFieldBlur?.(index)
                    }}
                    className="rounded-lg border border-rose-300 px-2 py-1 text-xs font-semibold text-rose-700"
                    disabled={sampleFields.length <= 1}
                  >
                    Remove case
                  </button>
                </div>
              ))}

              <button
                type="button"
                onClick={() => {
                  appendSample({ input: '', output: '' })
                  onFieldBlur?.(index)
                }}
                className="rounded-lg border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-700"
              >
                Add sample case
              </button>
            </div>

            {questionType === 'dsa' && (
              <div className="space-y-2 rounded-xl border border-amber-200 bg-amber-50 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-amber-800">Hidden test cases (not visible to students)</p>

                {hiddenFields.map((hiddenCase, hiddenIndex) => (
                  <div key={hiddenCase.id} className="space-y-2 rounded-lg border border-amber-200 bg-white p-2">
                    <textarea
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                      rows={2}
                      placeholder="Hidden input"
                      {...register(`${hiddenFieldName}.${hiddenIndex}.input`, {
                        onBlur: () => onFieldBlur?.(index),
                      })}
                    />

                    <textarea
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                      rows={2}
                      placeholder="Hidden expected output"
                      {...register(`${hiddenFieldName}.${hiddenIndex}.output`, {
                        onBlur: () => onFieldBlur?.(index),
                      })}
                    />

                    <button
                      type="button"
                      onClick={() => {
                        if (hiddenFields.length <= 1) {
                          return
                        }
                        removeHidden(hiddenIndex)
                        onFieldBlur?.(index)
                      }}
                      className="rounded-lg border border-rose-300 px-2 py-1 text-xs font-semibold text-rose-700"
                      disabled={hiddenFields.length <= 1}
                    >
                      Remove hidden case
                    </button>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={() => {
                    appendHidden({ input: '', output: '' })
                    onFieldBlur?.(index)
                  }}
                  className="rounded-lg border border-amber-300 px-2 py-1 text-xs font-semibold text-amber-800"
                >
                  Add hidden case
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default QuestionCard

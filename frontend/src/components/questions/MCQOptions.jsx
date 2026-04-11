import { Plus, Trash2 } from 'lucide-react'
import { useFieldArray } from 'react-hook-form'

function MCQOptions({ control, register, questionIndex, setValue, getValues, onFieldBlur }) {
  const fieldName = `questions.${questionIndex}.options`

  const { fields, append, remove } = useFieldArray({
    control,
    name: fieldName,
  })

  const selectCorrect = (targetIndex) => {
    fields.forEach((_, index) => {
      setValue(`${fieldName}.${index}.is_correct`, index === targetIndex, {
        shouldDirty: true,
      })
    })
    onFieldBlur?.(questionIndex)
  }

  const addOption = () => {
    append({ option_text: '', is_correct: fields.length === 0 })
  }

  const deleteOption = (index) => {
    if (fields.length <= 2) {
      return
    }

    remove(index)

    const nextOptions = getValues(fieldName) || []
    if (nextOptions.length > 0 && !nextOptions.some((item) => item.is_correct)) {
      setValue(`${fieldName}.0.is_correct`, true, { shouldDirty: true })
    }

    onFieldBlur?.(questionIndex)
  }

  return (
    <div className="space-y-2">
      {(fields || []).map((option, index) => {
        const label = String.fromCharCode(65 + index)

        return (
          <div key={option.id} className="flex items-center gap-2">
            <input
              type="radio"
              name={`questions.${questionIndex}.correct`}
              checked={Boolean(getValues(`${fieldName}.${index}.is_correct`))}
              onChange={() => selectCorrect(index)}
            />

            <input
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              placeholder={`Option ${label}`}
              {...register(`${fieldName}.${index}.option_text`, {
                onBlur: () => onFieldBlur?.(questionIndex),
              })}
            />

            <button
              type="button"
              onClick={() => deleteOption(index)}
              className="rounded-lg border border-slate-300 p-2 text-slate-600"
              disabled={fields.length <= 2}
              aria-label="Delete option"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        )
      })}

      <button
        type="button"
        onClick={addOption}
        className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-700"
      >
        <Plus className="h-3 w-3" /> Add option
      </button>
    </div>
  )
}

export default MCQOptions

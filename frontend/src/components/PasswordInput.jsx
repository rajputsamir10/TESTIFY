import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'

function PasswordInput({
  label,
  name,
  register,
  error,
  placeholder,
  inputClassName = 'auth-input w-full rounded-xl border border-slate-200 bg-white px-3 py-2 pr-10 text-sm text-slate-800 outline-none transition focus:border-blue-400',
}) {
  const [visible, setVisible] = useState(false)

  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</span>
      <div className="relative">
        <input
          type={visible ? 'text' : 'password'}
          placeholder={placeholder}
          className={inputClassName}
          {...register(name)}
        />
        <button
          type="button"
          onClick={() => setVisible((prev) => !prev)}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-500 hover:text-slate-700"
          aria-label={visible ? 'Hide password' : 'Show password'}
        >
          {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
      {error && <span className="mt-1 block text-xs text-rose-600">{error.message}</span>}
    </label>
  )
}

export default PasswordInput

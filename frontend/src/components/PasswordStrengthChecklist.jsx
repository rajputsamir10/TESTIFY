import { getPasswordChecklist } from '../utils/passwordRules'

function PasswordStrengthChecklist({ password }) {
  const checks = getPasswordChecklist(password)

  return (
    <div className="password-checklist rounded-xl border border-slate-200 bg-slate-50 p-3">
      <p className="password-checklist-title mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Password requirements</p>
      <ul className="password-checklist-list space-y-1 text-xs text-slate-600">
        {checks.map((item) => (
          <li key={item.key} className="flex items-center gap-2">
            <span className={item.passed ? 'password-checklist-icon font-bold text-emerald-600' : 'password-checklist-icon font-bold text-rose-600'}>
              {item.passed ? '✔' : '✖'}
            </span>
            <span>{item.label}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default PasswordStrengthChecklist

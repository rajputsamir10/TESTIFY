import { Lock, ShieldCheck, UserRoundCog } from 'lucide-react'

const joinClasses = (...classes) => classes.filter(Boolean).join(' ')

export function ProfilePageHeader({ description, rightAction = null }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="font-heading text-4xl font-extrabold tracking-tight text-[#242f41]">Profile</h1>
        <p className="mt-1.5 text-base font-medium text-[#515c70]">{description}</p>
      </div>
      {rightAction}
    </div>
  )
}

export function ProfileTwoColumnLayout({ children }) {
  return <div className="grid gap-5 xl:grid-cols-12">{children}</div>
}

export function AccountDetailsCard({
  children,
  headerAction,
  footer = null,
  className = 'xl:col-span-8',
}) {
  const resolvedHeaderAction =
    headerAction !== undefined ? (
      headerAction
    ) : (
      <button type="button" className="text-sm font-bold text-[#4a40e0] transition-colors hover:text-[#3d30d4]">
        Edit Profile
      </button>
    )

  return (
    <div
      className={joinClasses(
        'rounded-[1.6rem] border border-slate-200/70 bg-white/70 p-6 shadow-[0_14px_30px_-24px_rgba(15,23,42,0.8)] backdrop-blur',
        className,
      )}
    >
      <div className="mb-6 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#ecf1ff] text-[#4a40e0]">
            <UserRoundCog className="h-4.5 w-4.5" />
          </div>
          <h2 className="text-[1.6rem] font-extrabold tracking-tight text-[#242f41]">Account Details</h2>
        </div>

        {resolvedHeaderAction}
      </div>

      {children}
      {footer}
    </div>
  )
}

export function ProfileDetailsGrid({ children, className = '' }) {
  return <div className={joinClasses('grid gap-y-6 sm:grid-cols-2 sm:gap-x-8', className)}>{children}</div>
}

export function ProfileDetailField({
  label,
  value = '-',
  prominent = false,
  valueClassName = '',
}) {
  const valueClass = prominent
    ? 'mt-1.5 text-[1.75rem] font-bold leading-tight text-[#242f41] sm:text-[1.5rem]'
    : 'mt-1.5 text-xl font-bold leading-snug text-[#242f41]'

  const isPrimitiveValue = typeof value === 'string' || typeof value === 'number'

  return (
    <div>
      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#8a96ad]">{label}</p>
      {isPrimitiveValue ? (
        <p className={joinClasses(valueClass, valueClassName)}>{value === '' ? '-' : value}</p>
      ) : (
        value
      )}
    </div>
  )
}

export function ProfileRoleBadge({ label }) {
  return (
    <span className="mt-2 inline-flex rounded-full bg-[#e9ddff] px-3 py-1 text-xs font-bold text-[#6411d5]">
      {label || '-'}
    </span>
  )
}

export function SecurityCard({
  form,
  onSubmit,
  strengthScore,
  strengthLabel,
  submitLabel = 'Update password',
  className = 'xl:col-span-4',
  oldPasswordField = 'old_password',
  newPasswordField = 'new_password',
}) {
  return (
    <div
      className={joinClasses(
        'rounded-[1.6rem] border border-slate-200/70 bg-white/70 p-6 shadow-[0_14px_30px_-24px_rgba(15,23,42,0.8)] backdrop-blur',
        className,
      )}
    >
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#ecf1ff] text-[#4a40e0]">
          <ShieldCheck className="h-4.5 w-4.5" />
        </div>
        <h2 className="text-[1.6rem] font-extrabold tracking-tight text-[#242f41]">Security</h2>
      </div>

      <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
        <label className="block space-y-1.5">
          <span className="text-xs font-bold text-[#515c70]">Old Password</span>
          <input
            type="password"
            className="w-full rounded-xl border border-transparent bg-[#ecf1ff] px-3.5 py-2.5 text-sm text-[#242f41] outline-none transition-all focus:bg-white focus:ring-4 focus:ring-[#4a40e0]/10"
            {...form.register(oldPasswordField, { required: true })}
          />
        </label>

        <label className="block space-y-1.5">
          <span className="text-xs font-bold text-[#515c70]">New Password</span>
          <input
            type="password"
            placeholder="Min. 8 characters"
            className="w-full rounded-xl border border-transparent bg-[#ecf1ff] px-3.5 py-2.5 text-sm text-[#242f41] outline-none transition-all focus:bg-white focus:ring-4 focus:ring-[#4a40e0]/10"
            {...form.register(newPasswordField, { required: true })}
          />
        </label>

        <div>
          <div className="grid grid-cols-3 gap-1.5">
            {[1, 2, 3].map((segment) => (
              <div
                key={segment}
                className={joinClasses(
                  'h-1.5 rounded-full transition-colors',
                  segment <= strengthScore ? 'bg-[#6f66ef]' : 'bg-[#d7deef]',
                )}
              />
            ))}
          </div>
          <p className="mt-1 text-[11px] font-semibold text-[#6c778c]">Password strength: {strengthLabel}</p>
        </div>

        <button
          type="submit"
          className="mt-1 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#4a40e0] to-[#7d7bf0] px-4 py-3 text-sm font-bold text-white shadow-[0_12px_22px_-14px_rgba(74,64,224,0.9)] transition-all hover:brightness-105"
        >
          <Lock className="h-4 w-4" />
          {submitLabel}
        </button>
      </form>

      <div className="mt-8 flex items-center justify-between border-t border-slate-200/70 pt-4">
        <div>
          <p className="text-sm font-bold text-[#242f41]">Two-Factor Auth</p>
          <p className="text-xs font-medium text-[#6c778c]">Recommended for security</p>
        </div>
        <button type="button" className="flex h-6 w-11 items-center rounded-full bg-[#d7deef] p-1" aria-label="Two-factor authentication">
          <span className="h-4 w-4 rounded-full bg-white shadow" />
        </button>
      </div>
    </div>
  )
}
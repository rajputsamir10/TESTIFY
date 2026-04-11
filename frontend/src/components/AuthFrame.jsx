function AuthFrame({ title, subtitle, children, tone = 'marine' }) {
  const toneClass =
    tone === 'god'
      ? 'from-[#0d1b3e] via-[#162b57] to-[#7c2d12]'
      : tone === 'teacher'
        ? 'from-[#0d5e57] via-[#0e766e] to-[#0b4f48]'
        : tone === 'student'
          ? 'from-[#0f766e] via-[#0f8a80] to-[#14532d]'
          : 'from-[#0a3c7d] via-[#1458a8] to-[#1e3a8a]'

  return (
    <div className="auth-page auth-frame-root relative flex min-h-screen items-center justify-center overflow-x-hidden p-4">
      <div className={`absolute inset-0 bg-gradient-to-br ${toneClass}`} />
      <div className="absolute -left-20 -top-16 h-56 w-56 rounded-full bg-white/10 blur-2xl" />
      <div className="absolute -bottom-20 right-4 h-72 w-72 rounded-full bg-white/10 blur-2xl" />

      <div className="auth-panel auth-frame-card relative w-full max-w-md rounded-3xl border border-white/25 bg-white/95 p-6 shadow-2xl backdrop-blur">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">{title}</h1>
        <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
        <div className="mt-6">{children}</div>
      </div>
    </div>
  )
}

export default AuthFrame

import { MoonStar, SunMedium } from 'lucide-react'
import { useTheme } from '../context/ThemeContext'

function ThemeToggleButton({ className = '', compact = false }) {
  const { isDark, toggleTheme } = useTheme()

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDark ? 'Light mode' : 'Dark mode'}
      className={[
        'inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200/70 bg-white/85 text-slate-700 shadow-sm transition-all hover:border-slate-300 hover:bg-white',
        compact ? 'h-10 w-10' : 'h-10 px-3 text-sm font-semibold',
        'theme-toggle-btn',
        className,
      ].join(' ')}
    >
      {isDark ? <SunMedium className="h-4 w-4" /> : <MoonStar className="h-4 w-4" />}
      {!compact && <span>{isDark ? 'Light' : 'Dark'} mode</span>}
    </button>
  )
}

export default ThemeToggleButton

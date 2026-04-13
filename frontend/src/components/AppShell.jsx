import { BarChart2, CalendarDays, CircleHelp, LogOut, Menu, Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import NotificationBell from './NotificationBell'
import ThemeToggleButton from './ThemeToggleButton'

function AppShell({
  roleLabel,
  accentClass,
  links,
  brandSubtitle,
  searchPlaceholder,
  sidebarFooterLinks = [],
  showSidebarLogout = false,
  showHeaderLogout = true,
}) {
  const { user, logout } = useAuth()
  const [open, setOpen] = useState(false)

  const subtitle = brandSubtitle || `${roleLabel} workspace`
  const resolvedSearchPlaceholder = searchPlaceholder || 'Search modules, users, or reports...'

  const handleLogout = () => {
    setOpen(false)
    logout()
  }

  const displayDate = useMemo(
    () => new Date().toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' }),
    [],
  )

  const initials = useMemo(() => {
    const fullName = user?.full_name || 'User'
    return fullName
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() || '')
      .join('')
  }, [user?.full_name])

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_right,_#f4f6ff_0%,_#ecf1ff_100%)] text-[#242f41] app-shell-root">
      <div className="lg:grid lg:min-h-screen lg:grid-cols-[15.5rem_1fr]">
        <aside
          className={[
            'fixed inset-y-0 left-0 z-50 flex w-60 flex-col border-r border-[#dde6f7] bg-white/45 py-7 backdrop-blur-2xl transition-transform lg:static lg:w-auto lg:translate-x-0',
            open ? 'translate-x-0' : '-translate-x-full',
          ].join(' ')}
        >
          <div className="mb-9 flex items-center gap-3 px-5">
            <div
              className={[
                'flex h-10 w-10 items-center justify-center rounded-xl text-[#f4f1ff] shadow-[0_10px_20px_-10px_rgba(74,64,224,0.6)]',
                accentClass || 'bg-gradient-to-br from-[#4a40e0] to-[#702ae1]',
              ].join(' ')}
            >
              <BarChart2 className="h-4.5 w-4.5" />
            </div>
            <div>
              <p className="font-heading text-2xl font-extrabold leading-none tracking-tight text-[#4a40e0]">Testify</p>
              <p className="mt-1 text-[9px] font-bold uppercase tracking-[0.2em] text-[#515c70]">{subtitle}</p>
            </div>
          </div>

          <nav className="flex-1 space-y-1.5 px-4">
            {links.map((item) => {
              const Icon = item.icon
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  onClick={() => setOpen(false)}
                  className={({ isActive }) =>
                    [
                      'group flex items-center gap-3 rounded-2xl px-3.5 py-2.5 text-[13px] font-semibold transition-all',
                      isActive
                        ? 'bg-gradient-to-r from-[#4a40e0] to-[#6a5ef0] font-bold text-white shadow-[0_14px_24px_-18px_rgba(74,64,224,0.9)] hover:shadow-[0_0_0_1px_rgba(74,64,224,0.25),0_18px_30px_-20px_rgba(74,64,224,0.9)]'
                        : 'text-[#6c778c] hover:bg-white/40 hover:text-[#4a40e0] hover:shadow-[0_0_0_1px_rgba(74,64,224,0.2),0_18px_30px_-20px_rgba(74,64,224,0.8)]',
                    ].join(' ')
                  }
                >
                  <Icon className="h-4 w-4 transition-transform group-hover:scale-110" />
                  <span>{item.label}</span>
                </NavLink>
              )
            })}
          </nav>

          {(sidebarFooterLinks.length > 0 || showSidebarLogout) && (
            <div className="space-y-1 px-4 pb-3 pt-6">
              {sidebarFooterLinks.map((item) => {
                const Icon = item.icon

                return (
                  <NavLink
                    key={`${item.to}-${item.label}`}
                    to={item.to}
                    end={item.end}
                    onClick={() => setOpen(false)}
                    className={({ isActive }) =>
                      [
                        'group flex items-center gap-3 rounded-2xl px-3.5 py-2.5 text-[13px] font-semibold transition-all',
                        isActive
                          ? 'bg-gradient-to-r from-[#4a40e0] to-[#6a5ef0] font-bold text-white shadow-[0_14px_24px_-18px_rgba(74,64,224,0.9)] hover:shadow-[0_0_0_1px_rgba(74,64,224,0.25),0_18px_30px_-20px_rgba(74,64,224,0.9)]'
                          : 'text-[#6c778c] hover:bg-white/40 hover:text-[#4a40e0] hover:shadow-[0_0_0_1px_rgba(74,64,224,0.2),0_18px_30px_-20px_rgba(74,64,224,0.8)]',
                      ].join(' ')
                    }
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </NavLink>
                )
              })}

              {showSidebarLogout && (
                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex w-full items-center gap-3 rounded-2xl px-3.5 py-2.5 text-[13px] font-semibold text-[#6c778c] transition-all hover:bg-[#f74b6d]/10 hover:text-[#b41340]"
                >
                  <LogOut className="h-4 w-4" />
                  Logout
                </button>
              )}
            </div>
          )}
        </aside>

        {open && (
          <button
            type="button"
            className="fixed inset-0 z-40 bg-[#0f172a]/35 lg:hidden"
            onClick={() => setOpen(false)}
            aria-label="Close sidebar"
          />
        )}

        <div className="relative flex min-h-screen flex-col overflow-x-hidden">
          <div className="pointer-events-none absolute -right-28 -top-20 hidden h-[28rem] w-[28rem] rounded-full bg-[#4a40e0]/10 blur-[110px] lg:block" />
          <div className="pointer-events-none absolute bottom-10 left-0 hidden h-64 w-64 rounded-full bg-[#702ae1]/10 blur-[95px] lg:block" />

          <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-white/20 bg-white/40 px-4 backdrop-blur-2xl sm:px-5 lg:px-7">
            <button
              type="button"
              className="rounded-xl border border-slate-200/70 bg-white p-2 text-[#515c70] lg:hidden"
              onClick={() => setOpen(true)}
              aria-label="Open sidebar"
            >
              <Menu className="h-5 w-5" />
            </button>

            <div className="hidden max-w-md flex-1 items-center rounded-2xl border border-slate-200/60 bg-white/80 px-4 py-2.5 shadow-sm transition-all focus-within:border-[#4a40e0]/40 focus-within:ring-4 focus-within:ring-[#4a40e0]/5 sm:flex">
              <Search className="mr-3 h-5 w-5 text-[#6c778c]" />
              <input
                type="text"
                placeholder={resolvedSearchPlaceholder}
                className="w-full border-none bg-transparent text-sm font-medium text-[#242f41] outline-none placeholder:text-[#6c778c]/80"
              />
            </div>

            <div className="ml-auto flex items-center gap-2 sm:gap-3 lg:gap-4">
              <ThemeToggleButton compact className="hidden sm:inline-flex" />

              <NotificationBell />

              <button
                type="button"
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200/60 bg-white text-[#6c778c] transition-all hover:border-[#4a40e0]/30 hover:text-[#4a40e0]"
                aria-label="Help"
              >
                <CircleHelp className="h-4 w-4" />
              </button>

              <div className="hidden h-10 w-px bg-slate-200 lg:block" />

              <div className="hidden rounded-2xl border border-white/70 bg-white/60 px-4 py-2 text-sm font-bold text-[#4a40e0] shadow-sm md:flex md:items-center md:gap-2">
                <CalendarDays className="h-4 w-4" />
                {displayDate}
              </div>

              <div className="flex items-center gap-3">
                <div className="hidden text-right sm:block">
                  <p className="font-heading text-[15px] font-bold leading-tight text-[#242f41]">{user?.full_name || 'User'}</p>
                  <p className="text-[11px] font-bold capitalize tracking-tight text-[#4a40e0]">{user?.role || roleLabel} workspace</p>
                </div>
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl border-2 border-white bg-gradient-to-br from-[#6e8cff] to-[#4a40e0] text-xs font-extrabold text-white shadow-md">
                  {initials || 'US'}
                </div>
              </div>

              {showHeaderLogout && (
                <button
                  type="button"
                  onClick={handleLogout}
                  className="hidden items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-[#475569] transition-colors hover:text-[#1e293b] lg:inline-flex"
                >
                  <LogOut className="h-4 w-4" /> Logout
                </button>
              )}
            </div>
          </header>

          <main className="relative z-10 flex-1 p-4 sm:p-5 lg:p-6 page-content-reveal">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  )
}

export default AppShell

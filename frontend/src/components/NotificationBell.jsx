import { useEffect, useMemo, useState } from 'react'
import { Bell, CheckCheck } from 'lucide-react'
import { notificationAPI } from '../api/notificationAPI'

function NotificationBell() {
  const [open, setOpen] = useState(false)
  const [list, setList] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)

  const unreadLabel = useMemo(() => (unreadCount > 99 ? '99+' : unreadCount), [unreadCount])

  const refreshUnread = async () => {
    try {
      const { data } = await notificationAPI.unreadCount()
      setUnreadCount(Number(data.unread_count || 0))
    } catch {
      setUnreadCount(0)
    }
  }

  const loadNotifications = async () => {
    try {
      const { data } = await notificationAPI.list()
      setList(data)
    } catch {
      setList([])
    }
  }

  const markAll = async () => {
    await notificationAPI.readAll()
    await Promise.all([refreshUnread(), loadNotifications()])
  }

  useEffect(() => {
    const initId = window.setTimeout(() => {
      void refreshUnread()
    }, 0)
    const intervalId = window.setInterval(() => {
      void refreshUnread()
    }, 25000)
    return () => {
      window.clearTimeout(initId)
      window.clearInterval(intervalId)
    }
  }, [])

  useEffect(() => {
    if (!open) {
      return undefined
    }

    const timerId = window.setTimeout(() => {
      void loadNotifications()
    }, 0)

    return () => window.clearTimeout(timerId)
  }, [open])

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="relative rounded-xl border border-slate-200 bg-white p-2 text-slate-700 transition hover:border-slate-300"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 rounded-full bg-rose-600 px-1.5 py-0.5 text-[10px] font-bold text-white">
            {unreadLabel}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-80 rounded-2xl border border-slate-200 bg-white p-3 shadow-xl">
          <div className="mb-2 flex items-center justify-between">
            <h4 className="text-sm font-bold text-slate-800">Notifications</h4>
            <button
              type="button"
              onClick={markAll}
              className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-slate-900"
            >
              <CheckCheck className="h-4 w-4" /> Mark all
            </button>
          </div>

          <div className="max-h-80 space-y-2 overflow-auto pr-1">
            {list.length === 0 && (
              <p className="rounded-xl border border-dashed border-slate-200 p-3 text-xs text-slate-500">
                No notifications yet.
              </p>
            )}

            {list.map((item) => (
              <div
                key={item.id}
                className={[
                  'rounded-xl border p-2 text-xs',
                  item.is_read ? 'border-slate-200 bg-white text-slate-600' : 'border-blue-200 bg-blue-50 text-slate-700',
                ].join(' ')}
              >
                <p className="font-semibold">{item.notif_type?.replaceAll('_', ' ') || 'Update'}</p>
                <p className="mt-1">{item.message}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default NotificationBell

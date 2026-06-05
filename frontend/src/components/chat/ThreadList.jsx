import { Link } from 'react-router-dom'
import UserAvatar from './UserAvatar'

function formatTime(iso) {
  if (!iso) return ''
  const d = new Date(iso.replace(' ', 'T'))
  const now = new Date()
  const diff = now - d
  if (diff < 86400000) {
    return d.toLocaleTimeString('ar', { hour: '2-digit', minute: '2-digit' })
  }
  return d.toLocaleDateString('ar', { month: 'short', day: 'numeric' })
}

export default function ThreadList({ threads, activeId, onSelect }) {
  if (!threads?.length) {
    return (
      <div className="text-center py-12 text-ink-soft text-sm">
        لا توجد محادثات بعد — ابدأ رسالة جديدة
      </div>
    )
  }

  return (
    <ul className="space-y-1">
      {threads.map((t) => {
        const active = t.id === activeId
        const peer = t.peer
        return (
          <li key={t.id}>
            <button
              type="button"
              onClick={() => onSelect(t)}
              className={`w-full flex items-center gap-3 px-3 py-3 rounded-2xl text-right transition-all duration-200 ${
                active ? 'glass-panel' : 'hover:bg-white/[0.04]'
              }`}
              style={
                active
                  ? {
                      background: 'rgba(96,165,250,0.1)',
                      border: '1px solid rgba(96,165,250,0.22)',
                    }
                  : { border: '1px solid transparent' }
              }
            >
              <UserAvatar
                name={peer?.display_name}
                avatarUrl={peer?.avatar_url}
                isOnline={peer?.is_online}
                size={48}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <Link
                    to={`/profile/${peer?.id}`}
                    onClick={(e) => e.stopPropagation()}
                    className="text-sm font-bold text-ink truncate hover:text-accent transition-colors"
                  >
                    {peer?.display_name || 'محاسب'}
                  </Link>
                  <span className="text-[10px] text-ink-faint shrink-0">
                    {formatTime(t.last_message_at)}
                  </span>
                </div>
                <p className="text-[12px] text-ink-soft truncate mt-0.5">
                  {t.last_message || '—'}
                </p>
              </div>
              {t.unread_count > 0 && (
                <span
                  className="shrink-0 min-w-[20px] h-5 px-1.5 flex items-center justify-center rounded-full text-[10px] font-bold text-white"
                  style={{ background: 'linear-gradient(135deg,#60A5FA,#3b82f6)' }}
                >
                  {t.unread_count}
                </span>
              )}
            </button>
          </li>
        )
      })}
    </ul>
  )
}

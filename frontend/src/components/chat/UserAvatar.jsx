import { useEffect, useState } from 'react'
import { useAuthStore } from '../../store/auth.store'
import { resolveMediaUrl } from '../../utils/mediaUrl'
import OnlineBadge from './OnlineBadge'

export default function UserAvatar({
  name = '?',
  avatarUrl,
  isOnline,
  size = 44,
  showOnline = true,
  className = '',
}) {
  const token = useAuthStore((s) => s.token)
  const [src, setSrc] = useState(null)
  const initial = String(name).trim().charAt(0) || '?'

  useEffect(() => {
    let objectUrl
    if (!avatarUrl) {
      setSrc(null)
      return undefined
    }
    const url = resolveMediaUrl(avatarUrl)
    if (!url) {
      setSrc(null)
      return undefined
    }
    fetch(url, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
      .then((r) => (r.ok ? r.blob() : null))
      .then((blob) => {
        if (blob) {
          objectUrl = URL.createObjectURL(blob)
          setSrc(objectUrl)
        } else {
          setSrc(null)
        }
      })
      .catch(() => setSrc(null))

    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [avatarUrl, token])

  return (
    <div
      className={`relative shrink-0 ${className}`}
      style={{ width: size, height: size }}
    >
      <div
        className="w-full h-full rounded-full overflow-hidden flex items-center justify-center font-bold text-white transition-transform duration-200 hover:scale-[1.03]"
        style={{
          background: src
            ? 'transparent'
            : 'linear-gradient(135deg,#60A5FA,#6366f1)',
          boxShadow: isOnline
            ? '0 0 0 2px rgba(34,197,94,0.55), 0 0 16px rgba(34,197,94,0.15)'
            : '0 0 0 1px rgba(255,255,255,0.08)',
        }}
      >
        {src ? (
          <img src={src} alt="" className="w-full h-full object-cover" />
        ) : (
          <span style={{ fontSize: size * 0.38 }}>{initial}</span>
        )}
      </div>
      {showOnline && <OnlineBadge isOnline={isOnline} size={size < 40 ? 'sm' : 'md'} />}
    </div>
  )
}

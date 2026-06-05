import { useEffect, useState } from 'react'
import { useAuthStore } from '../../store/auth.store'
import { resolveMediaUrl } from '../../utils/mediaUrl'

export default function MediaAttachment({ message }) {
  const token = useAuthStore((s) => s.token)
  const payload = message.payload
  const type = message.message_type
  const [blobUrl, setBlobUrl] = useState(null)

  useEffect(() => {
    let url
    if (!payload?.media_url) {
      setBlobUrl(null)
      return undefined
    }
    const fetchUrl = resolveMediaUrl(payload.media_url)
    fetch(fetchUrl, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((r) => (r.ok ? r.blob() : null))
      .then((blob) => {
        if (blob) {
          url = URL.createObjectURL(blob)
          setBlobUrl(url)
        }
      })
      .catch(() => setBlobUrl(null))

    return () => {
      if (url) URL.revokeObjectURL(url)
    }
  }, [payload?.media_url, token])

  if (!payload) return null

  if (type === 'image' && blobUrl) {
    return (
      <a href={blobUrl} target="_blank" rel="noreferrer" className="block mt-1">
        <img
          src={blobUrl}
          alt={payload.filename}
          className="max-w-full rounded-xl max-h-64 object-cover border border-white/10"
        />
        {message.body && (
          <p className="text-xs text-ink-soft mt-2">{message.body}</p>
        )}
      </a>
    )
  }

  if (type === 'voice' && blobUrl) {
    return (
      <div className="mt-1 space-y-1">
        <audio controls src={blobUrl} className="w-full max-w-xs" preload="metadata" />
        {payload.duration_ms != null && (
          <p className="text-[10px] text-ink-faint">
            {Math.round(payload.duration_ms / 1000)} ث
          </p>
        )}
      </div>
    )
  }

  if (type === 'file') {
    return (
      <a
        href={blobUrl || '#'}
        download={payload.filename}
        target="_blank"
        rel="noreferrer"
        className="flex items-center gap-3 mt-1.5 p-3 rounded-xl hover:bg-white/5 transition-colors"
        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
      >
        <span className="text-2xl">📄</span>
        <div className="min-w-0 text-right">
          <div className="text-sm font-semibold text-ink truncate">{payload.filename}</div>
          {payload.size_bytes != null && (
            <div className="text-[10px] text-ink-faint">
              {(payload.size_bytes / 1024).toFixed(1)} KB
            </div>
          )}
        </div>
      </a>
    )
  }

  return null
}

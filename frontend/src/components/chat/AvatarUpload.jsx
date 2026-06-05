import { useRef, useState } from 'react'
import UserAvatar from './UserAvatar'

const MAX_BYTES = 2 * 1024 * 1024

export default function AvatarUpload({ name, avatarUrl, isOnline, onUpload, uploading }) {
  const inputRef = useRef(null)
  const [preview, setPreview] = useState(null)

  function handleFile(file) {
    if (!file) return
    if (!file.type.startsWith('image/')) {
      alert('يرجى اختيار صورة')
      return
    }
    if (file.size > MAX_BYTES) {
      alert('الصورة أكبر من 2 ميجابايت')
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = reader.result
      setPreview(dataUrl)
      onUpload?.(dataUrl)
    }
    reader.readAsDataURL(file)
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="relative group rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        title="تغيير الصورة"
      >
        <UserAvatar
          name={name}
          avatarUrl={preview || avatarUrl}
          isOnline={isOnline}
          size={96}
          showOnline
        />
        <span
          className="absolute inset-0 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-xs font-semibold text-white"
          style={{ background: 'rgba(0,0,0,0.45)' }}
        >
          {uploading ? '…' : 'تعديل'}
        </span>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
      <p className="text-[11px] text-ink-faint">JPG · PNG · WebP — حتى 2MB</p>
    </div>
  )
}

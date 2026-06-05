import { useRef, useState } from 'react'

const MAX_IMAGE = 2 * 1024 * 1024
const MAX_FILE = 10 * 1024 * 1024
const MAX_VOICE_MS = 180_000

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export default function ChatComposer({ onSend, disabled, sending }) {
  const [draft, setDraft] = useState('')
  const [recording, setRecording] = useState(false)
  const fileRef = useRef(null)
  const mediaRecorderRef = useRef(null)
  const chunksRef = useRef([])

  async function sendText(e) {
    e?.preventDefault()
    if (!draft.trim() || disabled || sending) return
    await onSend({ body: draft, message_type: 'text' })
    setDraft('')
  }

  async function sendFile(file) {
    if (!file) return
    const isImage = file.type.startsWith('image/')
    const max = isImage ? MAX_IMAGE : MAX_FILE
    if (file.size > max) {
      alert(isImage ? 'الصورة أكبر من 2MB' : 'الملف أكبر من 10MB')
      return
    }
    const data_url = await readFileAsDataUrl(file)
    await onSend({
      body: file.name,
      attachment: {
        kind: isImage ? 'image' : 'file',
        data_url,
        filename: file.name,
      },
    })
  }

  async function startRecording() {
    if (!navigator.mediaDevices?.getUserMedia) {
      alert('المتصفح لا يدعم تسجيل الصوت')
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mr = new MediaRecorder(stream)
      chunksRef.current = []
      mr.ondataavailable = (ev) => {
        if (ev.data.size > 0) chunksRef.current.push(ev.data)
      }
      const startedAt = Date.now()
      mr.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop())
        const blob = new Blob(chunksRef.current, { type: mr.mimeType || 'audio/webm' })
        if (blob.size > 5 * 1024 * 1024) {
          alert('التسجيل طويل جداً')
          setRecording(false)
          return
        }
        const data_url = await readFileAsDataUrl(
          new File([blob], 'voice.webm', { type: blob.type })
        )
        await onSend({
          body: '🎤 رسالة صوتية',
          attachment: {
            kind: 'voice',
            data_url,
            filename: 'voice.webm',
            duration_ms: Date.now() - startedAt,
          },
        })
        setRecording(false)
      }
      mediaRecorderRef.current = mr
      mr.start()
      setRecording(true)
      setTimeout(() => {
        if (mr.state === 'recording') mr.stop()
      }, MAX_VOICE_MS)
    } catch {
      alert('لم يتم السماح بالميكروفون')
    }
  }

  function stopRecording() {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop()
    }
  }

  return (
    <form
      className="px-4 py-3 flex flex-col gap-2 shrink-0"
      style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
      onSubmit={sendText}
    >
      <div className="flex gap-2 items-end">
        <div className="flex gap-1 shrink-0">
          <button
            type="button"
            title="ملف أو صورة"
            className="w-10 h-10 rounded-xl flex items-center justify-center text-lg hover:bg-white/8 transition-colors"
            style={{ border: '1px solid rgba(255,255,255,0.08)' }}
            disabled={disabled || sending}
            onClick={() => fileRef.current?.click()}
          >
            📎
          </button>
          <button
            type="button"
            title={recording ? 'إيقاف التسجيل' : 'رسالة صوتية'}
            className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg transition-colors ${
              recording ? 'bg-red-500/25 text-red-300 animate-pulse' : 'hover:bg-white/8'
            }`}
            style={{ border: '1px solid rgba(255,255,255,0.08)' }}
            disabled={disabled || sending}
            onClick={recording ? stopRecording : startRecording}
          >
            🎤
          </button>
        </div>
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="اكتب رسالة…"
          className="flex-1 !rounded-2xl"
          disabled={disabled || sending}
        />
        <button
          type="submit"
          className="btn-primary !px-5 shrink-0"
          disabled={disabled || sending || !draft.trim()}
        >
          {sending ? '…' : 'إرسال'}
        </button>
      </div>
      <input
        ref={fileRef}
        type="file"
        className="hidden"
        accept="image/jpeg,image/png,image/webp,image/gif,application/pdf,.xlsx,.xls,.txt,.zip"
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) sendFile(f)
          e.target.value = ''
        }}
      />
      {recording && (
        <p className="text-[11px] text-red-300 text-center">جاري التسجيل… اضغط 🎤 للإيقاف</p>
      )}
    </form>
  )
}

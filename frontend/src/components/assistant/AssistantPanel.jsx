import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { assistantApi } from '../../api'
import { useUiStore } from '../../store/auth.store'
import GlassPanel from '../ui/GlassPanel'

function renderAnswer(text) {
  return text.split('\n').map((line, i) => {
    const bold = line.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    return (
      <p
        key={i}
        className="text-sm text-ink-soft leading-relaxed mb-1"
        dangerouslySetInnerHTML={{ __html: bold }}
      />
    )
  })
}

export default function AssistantPanel({ open, onClose }) {
  const [question, setQuestion] = useState('')
  const [history, setHistory] = useState([])
  const bottomRef = useRef(null)
  const inputRef = useRef(null)
  const showToast = useUiStore((s) => s.showToast)

  const { data: hintsRes } = useQuery({
    queryKey: ['assistant-hints'],
    queryFn: () => assistantApi.hints(),
    enabled: open,
    staleTime: 600_000,
  })

  const askMut = useMutation({
    mutationFn: (q) => assistantApi.ask(q),
    onSuccess: (res, q) => {
      const data = res?.data
      setHistory((h) => [
        ...h,
        { role: 'user', text: q },
        { role: 'assistant', text: data?.answer, links: data?.links || [] },
      ])
      setQuestion('')
    },
    onError: (e) => showToast(e.message || 'تعذّر الرد', 'error'),
  })

  useEffect(() => {
    if (!open) return undefined
    const t = setTimeout(() => inputRef.current?.focus(), 80)
    return () => clearTimeout(t)
  }, [open])

  useEffect(() => {
    if (!open || history.length === 0) return
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [history.length, open])

  useEffect(() => {
    if (!open) return undefined
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  const examples = hintsRes?.data?.examples || []

  const panel = (
    <div
      className="fixed inset-0 z-[200] flex justify-end p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label="مساعد حمود"
    >
      <div
        className="absolute inset-0"
        style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(6px)' }}
        onMouseDown={(e) => {
          if (e.target === e.currentTarget) onClose()
        }}
      />
      <GlassPanel
        className="relative z-10 w-full max-w-md h-full sm:h-[min(640px,92vh)] sm:rounded-2xl flex flex-col !p-0 overflow-hidden shadow-2xl"
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="px-5 py-4 flex items-center justify-between shrink-0"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}
        >
          <div>
            <h2 className="text-base font-bold text-ink">مساعد حمود</h2>
            <p className="text-[11px] text-ink-faint">أرقام من النظام — قراءة فقط</p>
          </div>
          <button type="button" className="btn-secondary !py-1 !px-3 text-sm" onClick={onClose}>
            إغلاق
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          {history.length === 0 && (
            <div className="text-center py-6">
              <p className="text-4xl mb-3">🤖</p>
              <p className="text-sm text-ink-soft mb-4">
                اسأل عن المربح، تاريخ، أو ذمة تاجر
              </p>
              <div className="flex flex-wrap gap-2 justify-center">
                {examples.map((ex) => (
                  <button
                    key={ex}
                    type="button"
                    className="text-xs px-3 py-1.5 rounded-full border border-white/10 bg-white/5 text-ink-soft hover:text-accent hover:border-accent/30 transition-colors"
                    onMouseDown={(e) => e.stopPropagation()}
                    onClick={() => askMut.mutate(ex)}
                  >
                    {ex}
                  </button>
                ))}
              </div>
            </div>
          )}

          {history.map((msg, i) => (
            <div
              key={i}
              className={`flex ${msg.role === 'user' ? 'justify-start' : 'justify-end'}`}
            >
              <div
                className={`max-w-[90%] rounded-2xl px-4 py-2.5 ${
                  msg.role === 'user'
                    ? 'bg-accent/15 border border-accent/25'
                    : 'bg-white/[0.05] border border-white/8'
                }`}
              >
                {msg.role === 'user' ? (
                  <p className="text-sm text-ink">{msg.text}</p>
                ) : (
                  <>
                    {renderAnswer(msg.text || '')}
                    {msg.links?.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2 pt-2 border-t border-white/6">
                        {msg.links.map((l) => (
                          <Link
                            key={l.path}
                            to={l.path}
                            className="text-[11px] text-accent hover:underline"
                            onClick={onClose}
                          >
                            {l.label} →
                          </Link>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        <form
          className="px-4 py-3 shrink-0 flex gap-2"
          style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}
          onSubmit={(e) => {
            e.preventDefault()
            if (!question.trim() || askMut.isPending) return
            askMut.mutate(question.trim())
          }}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <input
            ref={inputRef}
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="مثال: شو المربح اليوم؟"
            className="flex-1 !rounded-2xl"
            disabled={askMut.isPending}
            autoComplete="off"
          />
          <button
            type="submit"
            className="btn-primary !px-4 shrink-0"
            disabled={askMut.isPending || !question.trim()}
          >
            {askMut.isPending ? '…' : 'اسأل'}
          </button>
        </form>
      </GlassPanel>
    </div>
  )

  return createPortal(panel, document.body)
}

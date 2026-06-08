import { useEffect, useMemo, useRef, useState } from 'react'

/** تطبيع عربي للبحث: يوحّد الألف/الياء/التاء المربوطة ويزيل التشكيل والتطويل */
function normalizeAr(s) {
  return String(s ?? '')
    .replace(/[ً-ٰٟ]/g, '')
    .replace(/[إأآا]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/ـ/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
}

/**
 * قائمة منسدلة قابلة للبحث (combobox).
 * @param {string|number} value القيمة المختارة
 * @param {(v:string)=>void} onChange
 * @param {{value:any,label:string}[]} options
 */
export default function SearchableSelect({
  value,
  onChange,
  options = [],
  placeholder = '—',
  disabled = false,
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const wrapRef = useRef(null)
  const inputRef = useRef(null)

  const selected = options.find((o) => String(o.value) === String(value))

  const filtered = useMemo(() => {
    const q = normalizeAr(query)
    if (!q) return options
    return options.filter((o) => normalizeAr(o.label).includes(q))
  }, [query, options])

  useEffect(() => {
    if (open && inputRef.current) inputRef.current.focus()
  }, [open])

  useEffect(() => {
    const onDoc = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setOpen(false)
        setQuery('')
      }
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  const choose = (val) => {
    onChange(val)
    setOpen(false)
    setQuery('')
  }

  return (
    <div className="relative" ref={wrapRef}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen((o) => !o)}
        className="w-full rounded-xl px-3 py-2.5 text-right flex items-center justify-between gap-2 disabled:opacity-50"
        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
      >
        <span className={selected ? 'text-ink' : 'text-ink-faint'}>
          {selected ? selected.label : placeholder}
        </span>
        <span className="text-ink-faint text-xs">▾</span>
      </button>

      {open && (
        <div
          className="absolute z-50 mt-1 w-full rounded-xl overflow-hidden shadow-xl"
          style={{ background: 'var(--color-bg-deep)', border: '1px solid rgba(255,255,255,0.12)' }}
        >
          <div className="p-2">
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && filtered.length > 0) {
                  e.preventDefault()
                  choose(filtered[0].value)
                } else if (e.key === 'Escape') {
                  setOpen(false)
                  setQuery('')
                }
              }}
              placeholder="بحث بالاسم..."
              className="w-full text-sm !py-1.5"
            />
          </div>
          <ul className="max-h-60 overflow-y-auto pb-1">
            <li
              onClick={() => choose('')}
              className="px-3 py-2 text-sm text-ink-faint cursor-pointer hover:bg-white/5"
            >
              —
            </li>
            {filtered.map((o) => (
              <li
                key={o.value}
                onClick={() => choose(o.value)}
                className={`px-3 py-2 text-sm cursor-pointer hover:bg-accent/15 ${
                  String(o.value) === String(value) ? 'text-accent bg-accent/10' : 'text-ink'
                }`}
              >
                {o.label}
              </li>
            ))}
            {filtered.length === 0 && (
              <li className="px-3 py-2 text-sm text-ink-faint">لا نتائج</li>
            )}
          </ul>
        </div>
      )}
    </div>
  )
}

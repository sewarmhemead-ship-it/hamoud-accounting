import { normalizeSearchQuery } from '../utils/searchNormalize'

/** بحث بسيط لقوائم غير السيارات (مراكز، حركات، مستخدمين…) */
export default function TableSearchBar({
  search = '',
  onSearchChange,
  onClear,
  placeholder = 'بحث في القائمة...',
  extra = null,
  resultHint = null,
}) {
  const hasActive = !!normalizeSearchQuery(search)

  return (
    <div className="card !py-3 !px-4 flex flex-wrap items-center gap-3">
      <div className="relative flex-1 min-w-[200px]">
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-faint text-sm pointer-events-none">
          🔍
        </span>
        <input
          type="search"
          value={search}
          onChange={(e) => onSearchChange?.(e.target.value)}
          placeholder={placeholder}
          className="w-full !pr-9 text-sm"
        />
      </div>
      {extra}
      {resultHint != null && (
        <span className="text-xs text-ink-soft tabular-nums">{resultHint}</span>
      )}
      {hasActive && onClear && (
        <button type="button" onClick={onClear} className="btn-secondary !py-1.5 !px-3 text-xs">
          مسح ✕
        </button>
      )}
    </div>
  )
}

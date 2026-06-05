import {
  TX_TYPE_FILTERS,
  TX_CATEGORY_FILTERS,
  TX_DELIVERED_FILTERS,
} from '../constants'

export default function TransactionsFilterBar({
  search,
  onSearchChange,
  type,
  onTypeChange,
  category,
  onCategoryChange,
  delivered,
  onDeliveredChange,
  centerId,
  onCenterChange,
  centers = [],
  from,
  onFromChange,
  to,
  onToChange,
  onClear,
  busy = false,
}) {
  const hasActive = !!(search?.trim() || type || category || delivered || centerId || from || to)

  return (
    <div className="card !py-3 !px-4 space-y-3">
      <div className="flex flex-wrap gap-2">
        {TX_TYPE_FILTERS.map((f) => (
          <button
            key={f.value || 'all-type'}
            type="button"
            onClick={() => onTypeChange?.(f.value)}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium ${
              type === f.value ? 'text-accent' : 'text-ink-soft hover:text-ink'
            }`}
            style={
              type === f.value
                ? { background: 'var(--color-accent-muted)', border: '1px solid rgba(96,165,250,0.28)' }
                : { border: '1px solid transparent' }
            }
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-faint text-sm pointer-events-none">
            🔍
          </span>
          <input
            type="search"
            value={search}
            onChange={(e) => onSearchChange?.(e.target.value)}
            placeholder="بحث: رقم قيد، مركز، سيارة TRK، ملاحظة..."
            className="w-full !pr-9 text-sm"
          />
        </div>
        <select
          value={centerId}
          onChange={(e) => onCenterChange?.(e.target.value)}
          className="text-sm !py-2 min-w-[140px]"
          aria-label="المركز"
        >
          <option value="">كل المراكز</option>
          {centers.map((c) => (
            <option key={c.id} value={String(c.id)}>
              {c.name}
            </option>
          ))}
        </select>
        <select
          value={category}
          onChange={(e) => onCategoryChange?.(e.target.value)}
          className="text-sm !py-2 min-w-[130px]"
          aria-label="التصنيف"
        >
          {TX_CATEGORY_FILTERS.map((f) => (
            <option key={f.value || 'all-cat'} value={f.value}>
              {f.label}
            </option>
          ))}
        </select>
        <select
          value={delivered}
          onChange={(e) => onDeliveredChange?.(e.target.value)}
          className="text-sm !py-2 min-w-[120px]"
          aria-label="التسليم"
        >
          {TX_DELIVERED_FILTERS.map((f) => (
            <option key={f.value || 'all-del'} value={f.value}>
              {f.label}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-wrap gap-3 items-center">
        <input
          type="date"
          value={from}
          onChange={(e) => onFromChange?.(e.target.value)}
          className="text-sm !py-1.5 w-36"
          title="من تاريخ"
        />
        <span className="text-ink-faint text-xs">←</span>
        <input
          type="date"
          value={to}
          onChange={(e) => onToChange?.(e.target.value)}
          className="text-sm !py-1.5 w-36"
          title="إلى تاريخ"
        />
        {hasActive && onClear && (
          <button type="button" onClick={onClear} className="btn-secondary !py-1.5 !px-3 text-xs">
            مسح الكل ✕
          </button>
        )}
        {busy && <span className="text-xs text-ink-faint">جاري التحميل...</span>}
      </div>
    </div>
  )
}

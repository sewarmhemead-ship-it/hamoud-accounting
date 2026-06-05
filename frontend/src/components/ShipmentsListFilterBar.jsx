import { SHIPMENT_STATUS_FILTERS } from '../constants'

/**
 * شريط فلترة موحّد لكل قوائم السيارات (بحث + حالة + تاريخ).
 */
export default function ShipmentsListFilterBar({
  search = '',
  onSearchChange,
  status = '',
  onStatusChange,
  from = '',
  onFromChange,
  to = '',
  onToChange,
  onClear,
  showStatus = true,
  statusFilters = SHIPMENT_STATUS_FILTERS,
  lockedStatus = null,
  busy = false,
}) {
  const hasActive = !!(search?.trim() || from || to || (showStatus && !lockedStatus && status))

  return (
    <div className="card !py-3 !px-4 space-y-3">
      {showStatus && !lockedStatus && (
        <div className="flex gap-1.5 flex-wrap">
          {statusFilters.map((f) => (
            <button
              key={f.value || 'all'}
              type="button"
              onClick={() => onStatusChange?.(f.value)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all duration-150 ${
                status === f.value ? 'text-accent' : 'text-ink-soft hover:text-ink'
              }`}
              style={
                status === f.value
                  ? {
                      background: 'var(--color-accent-muted)',
                      border: '1px solid rgba(96,165,250,0.28)',
                    }
                  : {
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(255,255,255,0.07)',
                    }
              }
            >
              {f.label}
            </button>
          ))}
        </div>
      )}

      {lockedStatus && (
        <p className="text-[11px] text-ink-faint">
          عرض: {statusFilters.find((f) => f.value === lockedStatus)?.label || lockedStatus}
        </p>
      )}

      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-faint text-sm pointer-events-none">
            🔍
          </span>
          <input
            type="search"
            value={search}
            onChange={(e) => onSearchChange?.(e.target.value)}
            placeholder="بحث: رقم TRK، تاجر، مخلص، بضاعة، مسار..."
            className="w-full !pr-9 text-sm"
            aria-label="بحث في القائمة"
          />
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <input
            type="date"
            value={from}
            onChange={(e) => onFromChange?.(e.target.value)}
            className="text-sm !py-1.5 w-36"
            title="من تاريخ الدخول"
            aria-label="من تاريخ"
          />
          <span className="text-ink-faint text-xs">←</span>
          <input
            type="date"
            value={to}
            onChange={(e) => onToChange?.(e.target.value)}
            className="text-sm !py-1.5 w-36"
            title="إلى تاريخ الدخول"
            aria-label="إلى تاريخ"
          />
        </div>
        {hasActive && onClear && (
          <button type="button" onClick={onClear} className="btn-secondary !py-1.5 !px-3 text-xs">
            مسح الكل ✕
          </button>
        )}
        {busy && <span className="text-xs text-ink-faint">جاري البحث...</span>}
      </div>
    </div>
  )
}

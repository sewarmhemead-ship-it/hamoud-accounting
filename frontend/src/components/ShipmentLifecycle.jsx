import { SHIPMENT_STATUS } from '../constants'

const STEPS = ['pending', 'complete', 'posted', 'delivered']

export default function ShipmentLifecycle({ currentStatus, compact = false }) {
  const currentIdx = STEPS.indexOf(currentStatus)

  if (compact) {
    return (
      <div className="flex items-center gap-1 text-xs">
        {STEPS.map((step, i) => (
          <span key={step} className="flex items-center gap-1">
            <span
              className={`px-2 py-0.5 rounded ${
                i <= currentIdx
                  ? 'bg-accent-muted text-accent'
                  : 'bg-surface-hover text-gray-600'
              }`}
            >
              {SHIPMENT_STATUS[step]?.label}
            </span>
            {i < STEPS.length - 1 && <span className="text-gray-600">←</span>}
          </span>
        ))}
      </div>
    )
  }

  return (
    <div className="card">
      <p className="text-sm text-gray-400 mb-4">دورة حياة السيارة</p>
      <div className="flex items-center justify-between gap-2">
        {STEPS.map((step, i) => {
          const done = i <= currentIdx
          const active = i === currentIdx
          return (
            <div key={step} className="flex-1 flex flex-col items-center gap-2">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2 ${
                  active
                    ? 'border-accent bg-accent-muted text-accent'
                    : done
                      ? 'border-success bg-success/20 text-success'
                      : 'border-surface-border text-gray-600'
                }`}
              >
                {done && !active ? '✓' : i + 1}
              </div>
              <span className={`text-xs text-center ${done ? 'text-gray-300' : 'text-gray-600'}`}>
                {SHIPMENT_STATUS[step]?.label}
              </span>
            </div>
          )
        })}
      </div>
      <div className="mt-4 text-xs text-gray-500 space-y-1 border-t border-surface-border pt-3">
        <p>• <strong>معلقة:</strong> أقلام ناقصة — لا تدخل اليوميات</p>
        <p>• <strong>مكتملة:</strong> جاهزة للترحيل — انتظار قرار</p>
        <p>• <strong>مرحّلة:</strong> قيد-ص على التاجر — جارية</p>
        <p>• <strong>مُسلَّمة:</strong> وصلت للتاجر — تدخل الرصيد</p>
      </div>
    </div>
  )
}

import { formatCurrency } from '../utils/format'

export default function CenterBalancePanel({ balance, title = 'ملخص الذمة' }) {
  if (!balance) return null

  const items = [
    {
      label: 'رصيد مسلّم',
      value: balance.balance,
      desc: 'Σ(ص) − Σ(و) — حركات is_delivered=1',
      color: 'text-accent',
    },
    {
      label: 'جارية مرحّلة',
      value: balance.posted_undelivered_value,
      desc: `${balance.posted_undelivered_count} سيارة — posted + غير مسلّمة`,
      color: 'text-warning',
    },
    {
      label: 'قيد الإكمال (WIP)',
      value: balance.wip_value,
      desc: `${balance.wip_count} سيارة — pending + complete`,
      color: 'text-ink-soft',
    },
    {
      label: 'إجمالي الذمة',
      value: balance.grand_total,
      desc: 'رصيد + جارية مرحّلة',
      color: 'text-success',
      bold: true,
    },
  ]

  return (
    <div className="card">
      <h3 className="font-semibold text-ink mb-4">{title}</h3>
      <div className="space-y-3">
        {items.map((item) => (
          <div
            key={item.label}
            className={`flex justify-between items-start py-2 border-b border-surface-border/50 last:border-0 ${
              item.bold ? 'pt-3' : ''
            }`}
          >
            <div>
              <p className={`text-sm ${item.bold ? 'text-ink font-medium' : 'text-ink-soft'}`}>
                {item.label}
              </p>
              <p className="text-xs text-ink-faint mt-0.5">{item.desc}</p>
            </div>
            <span className={`font-mono ${item.color} ${item.bold ? 'text-lg font-bold' : ''}`}>
              {formatCurrency(item.value)}
            </span>
          </div>
        ))}
      </div>
      <div className="mt-4 p-3 rounded-lg bg-surface text-xs text-ink-soft">
        WIP لا يدخل إجمالي الذمة — للمتابعة التشغيلية فقط
      </div>
    </div>
  )
}

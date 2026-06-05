import { SHIPMENT_STATUS } from '../constants'

export default function StatusBadge({ status }) {
  const cfg = SHIPMENT_STATUS[status] || { label: status, color: 'bg-white/10 text-ink-soft', icon: '•' }
  return (
    <span className={`pill ${cfg.color}`}>
      {cfg.icon && <span className="text-[10px] leading-none">{cfg.icon}</span>}
      {cfg.label}
    </span>
  )
}

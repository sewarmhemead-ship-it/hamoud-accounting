import { SHIPMENT_STATUS } from '../constants'

export default function StatusBadge({ status, postable }) {
  const key =
    (status === 'pending' || status === 'complete') && postable ? 'postable' : status
  const cfg = SHIPMENT_STATUS[key] || {
    label: status,
    color: 'bg-white/10 text-ink-soft',
    icon: '•',
  }
  return (
    <span className={`pill ${cfg.color}`}>
      {cfg.icon && <span className="text-[10px] leading-none">{cfg.icon}</span>}
      {cfg.label}
    </span>
  )
}

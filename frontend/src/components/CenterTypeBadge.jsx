import { CENTER_TYPES } from '../constants'

export default function CenterTypeBadge({ type }) {
  const cfg = CENTER_TYPES[type] || { label: type, color: 'bg-gray-500/20 text-gray-300' }
  return (
    <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${cfg.color}`}>
      {cfg.label}
    </span>
  )
}

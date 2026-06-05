import { Link } from 'react-router-dom'
import MediaAttachment from './MediaAttachment'

function RefCard({ type, payload, body }) {
  if (type === 'transaction' && payload) {
    return (
      <Link
        to={`/transactions?highlight=${payload.transaction_id}`}
        className="block mt-1.5 p-3 rounded-xl transition-colors hover:bg-white/5"
        style={{ background: 'rgba(96,165,250,0.08)', border: '1px solid rgba(96,165,250,0.2)' }}
      >
        <div className="text-[10px] text-accent font-bold mb-1">💸 حركة مالية</div>
        <div className="text-sm font-semibold text-ink">{payload.ref_number}</div>
        {payload.center_name && (
          <div className="text-[11px] text-ink-soft mt-0.5">{payload.center_name}</div>
        )}
        {payload.amount_usd != null && (
          <div className="text-xs text-ink mt-1">${Number(payload.amount_usd).toLocaleString()}</div>
        )}
      </Link>
    )
  }
  if (type === 'shipment' && payload) {
    return (
      <Link
        to={`/shipments/${payload.shipment_id}`}
        className="block mt-1.5 p-3 rounded-xl transition-colors hover:bg-white/5"
        style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)' }}
      >
        <div className="text-[10px] font-bold mb-1" style={{ color: '#f59e0b' }}>🚛 شحنة</div>
        <div className="text-sm font-semibold text-ink">{payload.ref_number}</div>
      </Link>
    )
  }
  if (type === 'report' && payload) {
    return (
      <div
        className="mt-1.5 p-3 rounded-xl"
        style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)' }}
      >
        <div className="text-[10px] font-bold mb-1" style={{ color: '#818cf8' }}>📈 تقرير</div>
        <div className="text-sm font-semibold text-ink">{payload.label}</div>
        <div className="text-[11px] text-ink-soft mt-0.5">{payload.report_type}</div>
      </div>
    )
  }
  if (['image', 'file', 'voice'].includes(type)) {
    return null
  }
  return body ? <p className="text-sm text-ink leading-relaxed whitespace-pre-wrap">{body}</p> : null
}

export default function MessageBubble({ message, isMine }) {
  const time = message.created_at
    ? new Date(message.created_at.replace(' ', 'T')).toLocaleTimeString('ar', {
        hour: '2-digit',
        minute: '2-digit',
      })
    : ''

  return (
    <div
      className={`flex mb-3 animate-[fadeSlide_0.25s_ease-out] ${isMine ? 'justify-start' : 'justify-end'}`}
    >
      <div
        className={`max-w-[78%] px-4 py-2.5 rounded-2xl ${
          isMine ? 'rounded-br-md' : 'rounded-bl-md'
        }`}
        style={{
          background: isMine
            ? 'linear-gradient(135deg, rgba(96,165,250,0.22), rgba(59,130,246,0.14))'
            : 'rgba(255,255,255,0.06)',
          border: `1px solid ${isMine ? 'rgba(96,165,250,0.28)' : 'rgba(255,255,255,0.08)'}`,
          backdropFilter: 'blur(12px)',
        }}
      >
        {!isMine && message.sender_name && (
          <div className="text-[10px] text-ink-soft mb-1 font-semibold">{message.sender_name}</div>
        )}
        {['image', 'file', 'voice'].includes(message.message_type) ? (
          <MediaAttachment message={message} />
        ) : (
          <RefCard type={message.message_type} payload={message.payload} body={message.body} />
        )}
        <div className={`text-[9px] text-ink-faint mt-1.5 ${isMine ? 'text-left' : 'text-right'}`}>
          {time}
        </div>
      </div>
    </div>
  )
}

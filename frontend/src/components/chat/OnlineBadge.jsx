/**
 * حلقة خضراء على شكل story — مؤشر اتصال
 */
export default function OnlineBadge({ isOnline, size = 'md', className = '' }) {
  const ring =
    size === 'sm' ? 'ring-[2px] ring-offset-[2px]' : 'ring-[2.5px] ring-offset-[3px]'
  const offset = size === 'sm' ? 'ring-offset-[#0a0e17]' : 'ring-offset-[#0a0e17]'

  return (
    <span
      className={`absolute bottom-0 left-0 rounded-full transition-all duration-300 ${className}`}
      style={{
        width: size === 'sm' ? 10 : 12,
        height: size === 'sm' ? 10 : 12,
        background: isOnline ? '#22c55e' : 'transparent',
        boxShadow: isOnline ? '0 0 10px rgba(34,197,94,0.6)' : 'none',
        border: isOnline ? '2px solid #0a0e17' : 'none',
      }}
      title={isOnline ? 'متصل' : 'غير متصل'}
      aria-label={isOnline ? 'متصل' : 'غير متصل'}
    />
  )
}

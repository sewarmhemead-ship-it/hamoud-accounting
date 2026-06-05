/**
 * لوحة زجاجية موحّدة — Vision Pro / macOS glass
 */
export default function GlassPanel({
  title,
  subtitle,
  action,
  children,
  className = '',
  padding = 'p-5',
  noPadding = false,
  ...rest
}) {
  return (
    <section
      className={`glass-panel rounded-2xl ${noPadding ? '' : padding} ${className}`}
      {...rest}
    >
      {(title || action) && (
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            {title && (
              <h3 className="text-[15px] font-bold text-ink leading-tight">{title}</h3>
            )}
            {subtitle && (
              <p className="text-[11px] text-ink-soft mt-1">{subtitle}</p>
            )}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  )
}

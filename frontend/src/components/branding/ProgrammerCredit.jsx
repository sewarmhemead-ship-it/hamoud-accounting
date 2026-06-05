/**
 * علامة المبرمج — SewarTech (ثابتة، لا تعتمد على إعدادات الزبون)
 */
export default function ProgrammerCredit({ className = '', compact = false }) {
  return (
    <div
      className={`programmer-credit ${compact ? 'programmer-credit--compact' : ''} ${className}`.trim()}
      role="contentinfo"
      aria-label="برمجة وتطوير SewarTech"
    >
      <img
        src="/sewartech-logo.svg"
        alt="SewarTech"
        className="programmer-credit-logo"
        width={compact ? 28 : 36}
        height={compact ? 28 : 36}
        loading="lazy"
        decoding="async"
      />
      <div className="programmer-credit-copy">
        <p className="programmer-credit-ar">برمجة وتطوير — SewarTech</p>
        {!compact && (
          <p className="programmer-credit-tag" dir="rtl">
            علامتي كمبرمج
          </p>
        )}
      </div>
    </div>
  )
}

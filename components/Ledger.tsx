/**
 * Faint ledger ruling behind every screen: fine horizontal lines with a red-
 * margin-style double rule every fifth, the paper a sum is worked out on. At a
 * few percent opacity it is texture nobody should consciously notice.
 */
export function Ledger() {
  return (
    <svg
      className="ledger-backdrop"
      aria-hidden="true"
      focusable="false"
      width="100%"
      height="100%"
      preserveAspectRatio="none"
    >
      <defs>
        <pattern id="ledger-rule" width="8" height="140" patternUnits="userSpaceOnUse">
          {[0, 28, 56, 84, 112].map((y) => (
            <line key={y} x1="0" x2="8" y1={y + 0.5} y2={y + 0.5} stroke="currentColor" strokeWidth="1" />
          ))}
          <line x1="0" x2="8" y1="114.5" y2="114.5" stroke="currentColor" strokeWidth="1" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#ledger-rule)" />
    </svg>
  );
}

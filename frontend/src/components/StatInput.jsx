import { ACCENT, ACCENT_H, SURFACE, BORDER, TEXT, TEXT_WEAK } from '../theme'

export function StatInput({ label, value, onChange, type = 'number', min, max, step = 1, placeholder }) {
  const isNum = type === 'number'

  function handleChange(e) {
    if (isNum) {
      onChange(e.target.value === '' ? null : Number(e.target.value))
    } else {
      onChange(e.target.value)
    }
  }

  function nudge(delta) {
    const current = typeof value === 'number' ? value : (parseInt(value) || 0)
    let next = current + delta * step
    if (min != null) next = Math.max(min, next)
    if (max != null) next = Math.min(max, next)
    onChange(next)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      <label style={{
        fontFamily: 'Space Mono, monospace',
        fontSize: '10px',
        letterSpacing: '2px',
        textTransform: 'uppercase',
        color: TEXT_WEAK,
      }}>
        {label}
      </label>
      <div style={{ position: 'relative', display: 'flex' }}>
        <input
          type={isNum ? 'text' : 'text'}
          inputMode={isNum ? 'numeric' : 'text'}
          value={value ?? ''}
          placeholder={placeholder}
          onChange={handleChange}
          style={{
            width: '100%',
            background: SURFACE,
            border: `1px solid ${BORDER}`,
            borderRadius: '2px',
            color: TEXT,
            fontFamily: 'Space Mono, monospace',
            fontSize: '15px',
            fontWeight: 700,
            padding: '10px 12px',
            paddingRight: isNum ? '36px' : '12px',
            outline: 'none',
            transition: 'border-color 100ms',
          }}
          onFocus={(e) => { e.target.style.borderColor = ACCENT }}
          onBlur={(e) => { e.target.style.borderColor = BORDER }}
        />
        {isNum && (
          <div style={{
            position: 'absolute', right: '1px', top: '1px', bottom: '1px',
            display: 'flex', flexDirection: 'column', width: '28px',
          }}>
            <button
              type="button"
              tabIndex={-1}
              onClick={() => nudge(1)}
              style={{
                flex: 1, border: 'none', borderLeft: `1px solid ${BORDER}`,
                borderBottom: `1px solid ${BORDER}`,
                background: 'transparent', color: ACCENT, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: 0, opacity: 0.5, transition: 'opacity 100ms',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.opacity = '1' }}
              onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.5' }}
            >
              <svg width="8" height="5" viewBox="0 0 8 5">
                <polyline points="1,4 4,1 7,4" fill="none" stroke={ACCENT} strokeWidth="1.2" />
              </svg>
            </button>
            <button
              type="button"
              tabIndex={-1}
              onClick={() => nudge(-1)}
              style={{
                flex: 1, border: 'none', borderLeft: `1px solid ${BORDER}`,
                background: 'transparent', color: ACCENT, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: 0, opacity: 0.5, transition: 'opacity 100ms',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.opacity = '1' }}
              onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.5' }}
            >
              <svg width="8" height="5" viewBox="0 0 8 5">
                <polyline points="1,1 4,4 7,1" fill="none" stroke={ACCENT} strokeWidth="1.2" />
              </svg>
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

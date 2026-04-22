const BLUE = '#09A2C4'

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
        fontSize: '9px',
        letterSpacing: '2px',
        textTransform: 'uppercase',
        color: BLUE,
        opacity: 0.55,
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
            background: 'transparent',
            border: `1px solid rgba(9,162,196,0.3)`,
            borderRadius: 0,
            color: BLUE,
            fontFamily: 'Space Mono, monospace',
            fontSize: '15px',
            fontWeight: 700,
            padding: '10px 12px',
            paddingRight: isNum ? '36px' : '12px',
            outline: 'none',
            transition: 'border-color 100ms',
          }}
          onFocus={(e) => { e.target.style.borderColor = BLUE }}
          onBlur={(e) => { e.target.style.borderColor = 'rgba(9,162,196,0.3)' }}
        />
        {/* Custom stepper for numeric inputs */}
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
                flex: 1, border: 'none', borderLeft: `1px solid rgba(9,162,196,0.15)`,
                borderBottom: `1px solid rgba(9,162,196,0.15)`,
                background: 'transparent', color: BLUE, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: 0, opacity: 0.4, transition: 'opacity 100ms',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.8' }}
              onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.4' }}
            >
              <svg width="8" height="5" viewBox="0 0 8 5">
                <polyline points="1,4 4,1 7,4" fill="none" stroke={BLUE} strokeWidth="1.2" />
              </svg>
            </button>
            <button
              type="button"
              tabIndex={-1}
              onClick={() => nudge(-1)}
              style={{
                flex: 1, border: 'none', borderLeft: `1px solid rgba(9,162,196,0.15)`,
                background: 'transparent', color: BLUE, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: 0, opacity: 0.4, transition: 'opacity 100ms',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.8' }}
              onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.4' }}
            >
              <svg width="8" height="5" viewBox="0 0 8 5">
                <polyline points="1,1 4,4 7,1" fill="none" stroke={BLUE} strokeWidth="1.2" />
              </svg>
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

const BLUE = '#09A2C4'

export function Toggle({ label, checked, onChange }) {
  return (
    <label
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        cursor: 'pointer',
        userSelect: 'none',
        padding: '4px 0',
      }}
      onClick={(e) => { e.preventDefault(); onChange(!checked) }}
    >
      {/* 14px square checkbox */}
      <div style={{
        width: '14px',
        height: '14px',
        border: `1.5px solid ${checked ? BLUE : 'rgba(9,162,196,0.4)'}`,
        borderRadius: 0,
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: checked ? BLUE : 'transparent',
        transition: 'background 100ms, border-color 100ms',
      }}>
        {checked && (
          <svg width="9" height="9" viewBox="0 0 9 9" fill="none">
            <polyline points="1.5,4.5 3.5,6.5 7.5,2" stroke="#041428" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </div>
      <span style={{
        fontFamily: 'Georgia, serif',
        fontSize: '13px',
        color: BLUE,
        opacity: checked ? 0.9 : 0.5,
        transition: 'opacity 100ms',
        lineHeight: 1.4,
      }}>
        {label}
      </span>
    </label>
  )
}

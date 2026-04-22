import { useState, useRef, useEffect } from 'react'

const BLUE = '#09A2C4'
const BG   = '#041428'

export function SearchInput({ label, value, placeholder, onSearch, results, onSelect, renderItem }) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState(value || '')
  const ref = useRef(null)
  const inputRef = useRef(null)

  // Sync external value
  useEffect(() => { setQuery(value || '') }, [value])

  // Close on click outside
  useEffect(() => {
    function handler(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  function handleInput(e) {
    const v = e.target.value
    setQuery(v)
    onSearch(v)
    setOpen(v.length >= 2)
  }

  function handleSelect(item) {
    setOpen(false)
    onSelect(item)
    setQuery(item.name)
    inputRef.current?.blur()
  }

  function handleClear() {
    setQuery('')
    onSearch('')
    setOpen(false)
    inputRef.current?.focus()
  }

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <label style={{
        display: 'block',
        fontFamily: 'Space Mono, monospace',
        fontSize: '9px',
        letterSpacing: '2px',
        textTransform: 'uppercase',
        color: BLUE,
        opacity: 0.55,
        marginBottom: '6px',
      }}>
        {label}
      </label>

      <div style={{ position: 'relative' }}>
        <input
          ref={inputRef}
          type="text"
          value={query}
          placeholder={placeholder}
          onChange={handleInput}
          onFocus={() => { if (query.length >= 2) setOpen(true) }}
          style={{
            width: '100%',
            background: 'transparent',
            border: `1px solid ${open ? BLUE : 'rgba(9,162,196,0.3)'}`,
            borderRadius: 0,
            color: BLUE,
            fontFamily: 'Space Mono, monospace',
            fontSize: '15px',
            fontWeight: 700,
            padding: '10px 36px 10px 12px',
            outline: 'none',
            transition: 'border-color 100ms',
          }}
        />
        {/* Search icon or clear */}
        <div
          onClick={query ? handleClear : undefined}
          style={{
            position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)',
            cursor: query ? 'pointer' : 'default',
            opacity: 0.4,
          }}
        >
          {query ? (
            <svg width="12" height="12" viewBox="0 0 12 12">
              <line x1="2" y1="2" x2="10" y2="10" stroke={BLUE} strokeWidth="1.5" />
              <line x1="10" y1="2" x2="2" y2="10" stroke={BLUE} strokeWidth="1.5" />
            </svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <circle cx="5.5" cy="5.5" r="4" stroke={BLUE} strokeWidth="1.2" />
              <line x1="8.5" y1="8.5" x2="12.5" y2="12.5" stroke={BLUE} strokeWidth="1.2" />
            </svg>
          )}
        </div>
      </div>

      {/* Dropdown */}
      {open && results.length > 0 && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          right: 0,
          background: BG,
          border: `1px solid ${BLUE}`,
          borderTop: 'none',
          maxHeight: '260px',
          overflowY: 'auto',
          zIndex: 100,
        }}>
          {results.map((item, i) => (
            <div
              key={item.id ?? i}
              onClick={() => handleSelect(item)}
              style={{
                padding: '9px 12px',
                cursor: 'pointer',
                borderBottom: '1px solid rgba(9,162,196,0.08)',
                transition: 'background 60ms',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(9,162,196,0.06)' }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
            >
              {renderItem ? renderItem(item) : (
                <span style={{
                  fontFamily: 'Space Mono, monospace', fontSize: '12px',
                  color: BLUE,
                }}>
                  {item.name}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

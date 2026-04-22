import { Link, useLocation } from 'react-router-dom'

const BLUE = '#09A2C4'
const BG   = '#041428'

function NavLink({ to, children, active }) {
  return (
    <Link
      to={to}
      style={{
        textDecoration: 'none',
        fontFamily: 'Space Mono, monospace',
        fontSize: '9px',
        letterSpacing: '2px',
        textTransform: 'uppercase',
        color: BLUE,
        opacity: active ? 1 : 0.45,
        transition: 'opacity 100ms',
        paddingBottom: active ? '2px' : '0',
        borderBottom: active ? `1px solid ${BLUE}` : '1px solid transparent',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.opacity = '1' }}
      onMouseLeave={(e) => { e.currentTarget.style.opacity = active ? '1' : '0.45' }}
    >
      {children}
    </Link>
  )
}

function GhostButton({ children, onClick, href }) {
  const style = {
    background: 'transparent',
    border: `1px solid rgba(9,162,196,0.3)`,
    color: BLUE,
    fontFamily: 'Space Mono, monospace',
    fontSize: '8.5px',
    letterSpacing: '2px',
    textTransform: 'uppercase',
    padding: '6px 14px',
    cursor: 'pointer',
    borderRadius: 0,
    textDecoration: 'none',
    display: 'inline-block',
    lineHeight: 1.4,
    transition: 'border-color 100ms, background 100ms',
  }

  const handlers = {
    onMouseEnter: (e) => {
      e.currentTarget.style.borderColor = BLUE
      e.currentTarget.style.background = 'rgba(9,162,196,0.07)'
    },
    onMouseLeave: (e) => {
      e.currentTarget.style.borderColor = 'rgba(9,162,196,0.3)'
      e.currentTarget.style.background = 'transparent'
    },
  }

  if (href) return <a href={href} style={style} target="_blank" rel="noopener noreferrer" {...handlers}>{children}</a>
  return <button style={style} onClick={onClick} {...handlers}>{children}</button>
}

function SolidButton({ children, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: BLUE,
        border: `1px solid ${BLUE}`,
        color: BG,
        fontFamily: 'Space Mono, monospace',
        fontSize: '8.5px',
        letterSpacing: '2px',
        fontWeight: 700,
        textTransform: 'uppercase',
        padding: '6px 14px',
        cursor: 'pointer',
        borderRadius: 0,
        transition: 'opacity 100ms',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.85' }}
      onMouseLeave={(e) => { e.currentTarget.style.opacity = '1' }}
    >
      {children}
    </button>
  )
}

export function Navbar() {
  const { pathname } = useLocation()

  return (
    <nav style={{
      position: 'fixed', top: 0, left: 0, right: 0,
      height: '52px',
      background: 'rgba(4,20,40,0.92)',
      backdropFilter: 'blur(14px)',
      WebkitBackdropFilter: 'blur(14px)',
      borderBottom: '1px solid rgba(9,162,196,0.12)',
      zIndex: 100,
      display: 'flex', alignItems: 'center',
      padding: '0 40px',
      gap: '0',
    }}>

      {/* ── Left: logo + nav ──────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '28px' }}>
        <Link
          to="/"
          style={{
            textDecoration: 'none',
            fontFamily: 'Space Mono, monospace',
            fontSize: '12px',
            fontWeight: 700,
            letterSpacing: '3px',
            textTransform: 'uppercase',
            color: BLUE,
          }}
        >
          PROB<span style={{ opacity: 0.45 }}>'</span>HAMMER
        </Link>

        <div style={{
          width: '1px', height: '16px',
          background: 'rgba(9,162,196,0.2)',
        }} />

        <NavLink to="/factions" active={pathname === '/factions'}>
          Factions
        </NavLink>

        <NavLink to="/simulator" active={pathname === '/simulator'}>
          Simulator
        </NavLink>
      </div>

      {/* ── Right: actions ────────────────────────────────────── */}
      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <GhostButton href="https://github.com">
          Feedback ↗
        </GhostButton>
        <GhostButton onClick={() => {}}>
          Login
        </GhostButton>
        <SolidButton onClick={() => {}}>
          Create account
        </SolidButton>
      </div>
    </nav>
  )
}

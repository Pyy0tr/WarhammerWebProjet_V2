import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { AuthModal } from './AuthModal'
import { ACCENT, ACCENT_H, BG, BORDER, TEXT, TEXT_SEC, TEXT_WEAK } from '../theme'

function NavLink({ to, children, active }) {
  return (
    <Link
      to={to}
      style={{
        textDecoration: 'none',
        fontFamily: 'Space Mono, monospace',
        fontSize: '10px',
        letterSpacing: '2px',
        textTransform: 'uppercase',
        color: active ? ACCENT : TEXT_SEC,
        transition: 'color 100ms, background 100ms',
        padding: '4px 10px',
        borderRadius: '3px',
        background: active ? 'rgba(47,224,255,0.08)' : 'transparent',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.color = active ? ACCENT : TEXT
        if (!active) e.currentTarget.style.background = 'rgba(255,255,255,0.04)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.color = active ? ACCENT : TEXT_SEC
        if (!active) e.currentTarget.style.background = 'transparent'
      }}
    >
      {children}
    </Link>
  )
}

function GhostButton({ children, onClick, href }) {
  const style = {
    background: 'transparent',
    border: `1px solid ${TEXT_WEAK}`,
    color: TEXT_SEC,
    fontFamily: 'Space Mono, monospace',
    fontSize: '10px',
    letterSpacing: '2px',
    textTransform: 'uppercase',
    padding: '6px 14px',
    cursor: 'pointer',
    borderRadius: '3px',
    textDecoration: 'none',
    display: 'inline-block',
    lineHeight: 1.4,
    transition: 'border-color 100ms, background 100ms, color 100ms',
  }

  const handlers = {
    onMouseEnter: (e) => {
      e.currentTarget.style.borderColor = ACCENT
      e.currentTarget.style.color = ACCENT
      e.currentTarget.style.background = 'rgba(47,224,255,0.07)'
    },
    onMouseLeave: (e) => {
      e.currentTarget.style.borderColor = TEXT_WEAK
      e.currentTarget.style.color = TEXT_SEC
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
        background: ACCENT,
        border: `1px solid ${ACCENT}`,
        color: BG,
        fontFamily: 'Space Mono, monospace',
        fontSize: '10px',
        letterSpacing: '2px',
        fontWeight: 700,
        textTransform: 'uppercase',
        padding: '6px 14px',
        cursor: 'pointer',
        borderRadius: '3px',
        transition: 'opacity 100ms',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.85' }}
      onMouseLeave={(e) => { e.currentTarget.style.opacity = '1' }}
    >
      {children}
    </button>
  )
}

function UserChip({ user, onLogout }) {
  const [hov, setHov] = useState(false)
  const label = user.username || 'User'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <span style={{
        fontFamily: 'Space Mono, monospace', fontSize: '10px',
        letterSpacing: '1px', color: TEXT_SEC,
      }}>
        {label}
      </span>
      <button
        onClick={onLogout}
        onMouseEnter={() => setHov(true)}
        onMouseLeave={() => setHov(false)}
        style={{
          background: 'transparent',
          border: `1px solid ${hov ? ACCENT : BORDER}`,
          color: ACCENT,
          fontFamily: 'Space Mono, monospace',
          fontSize: '8px',
          letterSpacing: '1.5px',
          textTransform: 'uppercase',
          padding: '5px 10px',
          cursor: 'pointer',
          transition: 'border-color 100ms',
        }}
      >
        Sign out
      </button>
    </div>
  )
}

export function Navbar() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const { user, logout } = useAuthStore()
  const [modal, setModal] = useState(null)
  const isAdmin = user?.username === 'admin'

  return (
    <>
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0,
        height: '52px',
        background: 'rgba(10,22,33,0.92)',
        backdropFilter: 'blur(14px)',
        WebkitBackdropFilter: 'blur(14px)',
        borderBottom: `1px solid ${BORDER}`,
        zIndex: 100,
        display: 'flex', alignItems: 'center',
        padding: '0 40px',
        gap: '0',
      }}>

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
              color: ACCENT,
            }}
          >
            PROB<span style={{ opacity: 0.45 }}>'</span>HAMMER
          </Link>

          <div style={{
            width: '1px', height: '16px',
            background: BORDER,
          }} />

          <NavLink to="/factions" active={pathname === '/factions'}>
            Factions
          </NavLink>

          <NavLink to="/armies" active={pathname === '/armies'}>
            Armies
          </NavLink>

          <NavLink to="/simulator" active={pathname === '/simulator'}>
            Simulator
          </NavLink>

          <NavLink to="/learn" active={pathname === '/learn' || pathname === '/onboarding'}>
            Learn
          </NavLink>

          <NavLink to="/keywords" active={pathname === '/keywords'}>
            Keywords
          </NavLink>

          <NavLink to="/detachments" active={pathname === '/detachments'}>
            Detachments
          </NavLink>
        </div>

        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <GhostButton onClick={() => navigate('/feedback')}>
            Feedback
          </GhostButton>

          {isAdmin && (
            <GhostButton onClick={() => navigate('/admin/feedback')}>
              Admin
            </GhostButton>
          )}

          {user ? (
            <UserChip user={user} onLogout={logout} />
          ) : (
            <>
              <GhostButton onClick={() => setModal('login')}>
                Sign in
              </GhostButton>
              <SolidButton onClick={() => setModal('register')}>
                Create account
              </SolidButton>
            </>
          )}
        </div>
      </nav>

      <AuthModal
        isOpen={modal !== null}
        onClose={() => setModal(null)}
        initialTab={modal ?? 'login'}
      />
    </>
  )
}

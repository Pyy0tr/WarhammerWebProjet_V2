import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { AuthModal } from './AuthModal'
import {
  ACCENT, ACCENT_H, ACCENT_TEXT, ACCENT_LIGHT,
  BG, BORDER, SURFACE,
  TEXT, TEXT_SEC, TEXT_WEAK,
  FONT_UI, RADIUS, SHADOW_SM,
} from '../theme'

function NavLink({ to, children, active }) {
  const [hov, setHov] = useState(false)
  return (
    <Link
      to={to}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        textDecoration: 'none',
        fontFamily: FONT_UI,
        fontSize: '14px',
        fontWeight: active ? 600 : 400,
        color: active ? TEXT : hov ? TEXT : TEXT_SEC,
        padding: '4px 2px',
        borderBottom: active ? `2px solid ${ACCENT}` : '2px solid transparent',
        transition: 'color 120ms, border-color 120ms',
        lineHeight: 1,
      }}
    >
      {children}
    </Link>
  )
}

function OutlineButton({ children, onClick, href }) {
  const [hov, setHov] = useState(false)
  const style = {
    background: hov ? ACCENT_LIGHT : 'transparent',
    border: `1px solid ${hov ? ACCENT : BORDER}`,
    color: hov ? ACCENT_TEXT : TEXT_SEC,
    fontFamily: FONT_UI,
    fontSize: '13px',
    fontWeight: 500,
    padding: '5px 12px',
    cursor: 'pointer',
    borderRadius: RADIUS,
    textDecoration: 'none',
    display: 'inline-block',
    lineHeight: 1.4,
    transition: 'background 120ms, border-color 120ms, color 120ms',
  }
  const handlers = {
    onMouseEnter: () => setHov(true),
    onMouseLeave: () => setHov(false),
  }
  if (href) return <a href={href} style={style} target="_blank" rel="noopener noreferrer" {...handlers}>{children}</a>
  return <button style={style} onClick={onClick} {...handlers}>{children}</button>
}

function PrimaryButton({ children, onClick }) {
  const [hov, setHov] = useState(false)
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background: hov ? ACCENT_H : ACCENT,
        border: `1px solid ${hov ? ACCENT_H : ACCENT}`,
        color: '#FFFFFF',
        fontFamily: FONT_UI,
        fontSize: '13px',
        fontWeight: 600,
        padding: '5px 12px',
        cursor: 'pointer',
        borderRadius: RADIUS,
        transition: 'background 120ms, border-color 120ms',
        lineHeight: 1.4,
      }}
    >
      {children}
    </button>
  )
}

function UserChip({ user, onLogout }) {
  const [hov, setHov] = useState(false)
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <div style={{
        width: '28px',
        height: '28px',
        borderRadius: '50%',
        background: ACCENT_LIGHT,
        border: `1px solid ${BORDER}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: FONT_UI,
        fontSize: '12px',
        fontWeight: 600,
        color: ACCENT_TEXT,
        flexShrink: 0,
      }}>
        {(user.username || 'U')[0].toUpperCase()}
      </div>
      <span style={{ fontFamily: FONT_UI, fontSize: '13px', color: TEXT_SEC }}>
        {user.username || 'User'}
      </span>
      <button
        onClick={onLogout}
        onMouseEnter={() => setHov(true)}
        onMouseLeave={() => setHov(false)}
        style={{
          background: 'transparent',
          border: `1px solid ${hov ? ACCENT : BORDER}`,
          color: hov ? ACCENT_TEXT : TEXT_WEAK,
          fontFamily: FONT_UI,
          fontSize: '12px',
          fontWeight: 400,
          padding: '4px 10px',
          cursor: 'pointer',
          borderRadius: RADIUS,
          transition: 'border-color 120ms, color 120ms',
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
        height: '56px',
        background: SURFACE,
        borderBottom: `1px solid ${BORDER}`,
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        padding: '0 24px',
        gap: '0',
      }}>

        {/* Logo */}
        <Link
          to="/"
          style={{
            textDecoration: 'none',
            fontFamily: FONT_UI,
            fontSize: '15px',
            fontWeight: 700,
            color: TEXT,
            marginRight: '24px',
            flexShrink: 0,
          }}
        >
          Prob'Hammer
        </Link>

        {/* Nav links */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', height: '100%' }}>
          <NavLink to="/factions"    active={pathname === '/factions'}>Factions</NavLink>
          <NavLink to="/armies"      active={pathname === '/armies'}>Armies</NavLink>
          <NavLink to="/simulator"   active={pathname === '/simulator'}>Simulator</NavLink>
          <NavLink to="/learn"       active={pathname === '/learn' || pathname === '/onboarding'}>Learn</NavLink>
          <NavLink to="/keywords"    active={pathname === '/keywords'}>Keywords</NavLink>
          <NavLink to="/detachments" active={pathname === '/detachments'}>Detachments</NavLink>
          <NavLink to="/combos"      active={pathname === '/combos'}>Combos</NavLink>
        </div>

        {/* Right side */}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <OutlineButton onClick={() => navigate('/feedback')}>Feedback</OutlineButton>

          {isAdmin && (
            <OutlineButton onClick={() => navigate('/admin/feedback')}>Admin</OutlineButton>
          )}

          {user ? (
            <UserChip user={user} onLogout={logout} />
          ) : (
            <>
              <OutlineButton onClick={() => setModal('login')}>Sign in</OutlineButton>
              <PrimaryButton onClick={() => setModal('register')}>Create account</PrimaryButton>
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

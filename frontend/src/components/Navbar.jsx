import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { useDataStore } from '../store/dataStore'
import { useIsMobile } from '../hooks/useIsMobile'
import { AuthModal } from './AuthModal'
import {
  ACCENT, ACCENT_H, ACCENT_TEXT, ACCENT_LIGHT,
  BG, BORDER, SURFACE, SURFACE_E,
  TEXT, TEXT_SEC, TEXT_WEAK,
  FONT_UI, FONT_DISPLAY, RADIUS, SHADOW_SM, SHADOW_MD,
} from '../theme'

const NAV_LINKS = [
  { to: '/factions',    label: 'Factions' },
  { to: '/armies',      label: 'Armies' },
  { to: '/simulator',   label: 'Simulator' },
  { to: '/learn',       label: 'Learn' },
  { to: '/keywords',    label: 'Keywords' },
  { to: '/detachments', label: 'Detachments' },
  { to: '/combos',      label: 'Combos' },
]

// Pages with real edition-specific data/behavior (own dataset, engine, or
// content per V10/V11). Everywhere else — Home, Learn, auth/account pages —
// the toggle would just be dead UI with nothing to switch.
const EDITION_AWARE_PATHS = ['/factions', '/armies', '/simulator', '/keywords', '/detachments', '/combos']

function NavLink({ to, children, active, onClick }) {
  const [hov, setHov] = useState(false)
  return (
    <Link
      to={to}
      onClick={onClick}
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

function MobileNavLink({ to, children, active, onClick }) {
  return (
    <Link
      to={to}
      onClick={onClick}
      style={{
        display: 'block',
        textDecoration: 'none',
        fontFamily: FONT_UI,
        fontSize: '16px',
        fontWeight: active ? 600 : 400,
        color: active ? ACCENT_TEXT : TEXT_SEC,
        padding: '14px 24px',
        borderBottom: `1px solid ${BORDER}`,
        borderLeft: active ? `3px solid ${ACCENT}` : '3px solid transparent',
        background: active ? ACCENT_LIGHT : 'transparent',
        transition: 'background 100ms',
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
        color: BG,
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

function EditionToggle({ compact }) {
  const edition = useDataStore((s) => s.edition)
  const setEdition = useDataStore((s) => s.setEdition)

  return (
    <div
      title={edition === 'v11' ? "V11 preview — data and simulation rules from an unofficial community dataset, not yet cross-checked against the official GW rulebook" : undefined}
      style={{
        display: 'flex',
        border: `1px solid ${BORDER}`,
        borderRadius: RADIUS,
        overflow: 'hidden',
        flexShrink: 0,
        width: compact ? '100%' : undefined,
        marginRight: compact ? undefined : '20px',
      }}
    >
      {['v10', 'v11'].map((ed) => {
        const active = edition === ed
        return (
          <button
            key={ed}
            onClick={() => setEdition(ed)}
            style={{
              flex: compact ? 1 : undefined,
              background: active ? ACCENT : 'transparent',
              color: active ? BG : TEXT_SEC,
              border: 'none',
              fontFamily: FONT_UI,
              fontSize: '12px',
              fontWeight: 600,
              padding: compact ? '10px 12px' : '5px 10px',
              cursor: 'pointer',
              lineHeight: 1.4,
              transition: 'background 120ms, color 120ms',
            }}
          >
            {ed.toUpperCase()}
          </button>
        )
      })}
    </div>
  )
}

function HamburgerIcon({ open }) {
  return (
    <svg width="22" height="18" viewBox="0 0 22 18" fill="none">
      {open ? (
        <>
          <line x1="2" y1="2"  x2="20" y2="16" stroke={TEXT_SEC} strokeWidth="1.8" strokeLinecap="round"/>
          <line x1="20" y1="2" x2="2"  y2="16" stroke={TEXT_SEC} strokeWidth="1.8" strokeLinecap="round"/>
        </>
      ) : (
        <>
          <line x1="2" y1="3"  x2="20" y2="3"  stroke={TEXT_SEC} strokeWidth="1.8" strokeLinecap="round"/>
          <line x1="2" y1="9"  x2="20" y2="9"  stroke={TEXT_SEC} strokeWidth="1.8" strokeLinecap="round"/>
          <line x1="2" y1="15" x2="20" y2="15" stroke={TEXT_SEC} strokeWidth="1.8" strokeLinecap="round"/>
        </>
      )}
    </svg>
  )
}

export function Navbar() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const { user, logout } = useAuthStore()
  const isMobile = useIsMobile()
  const [modal, setModal] = useState(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const isAdmin = user?.username === 'admin'
  const showEditionToggle = EDITION_AWARE_PATHS.includes(pathname)
  const navLinks = NAV_LINKS.filter(({ to }) => to !== '/combos' || isAdmin)

  function closeMenu() { setMenuOpen(false) }

  return (
    <>
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0,
        height: '56px',
        background: SURFACE,
        borderBottom: `1px solid ${BORDER}`,
        boxShadow: SHADOW_SM,
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        padding: '0 24px',
        gap: '0',
      }}>

        {/* Logo */}
        <Link
          to="/"
          onClick={closeMenu}
          style={{
            textDecoration: 'none',
            fontFamily: FONT_DISPLAY,
            fontSize: '15px',
            fontWeight: 700,
            letterSpacing: '0.5px',
            color: TEXT,
            marginRight: '24px',
            flexShrink: 0,
          }}
        >
          Prob'Hammer
        </Link>

        {!isMobile && showEditionToggle && <EditionToggle />}

        {isMobile ? (
          /* ── Mobile: hamburger ── */
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '12px' }}>
            {user && (
              <div style={{
                width: '28px', height: '28px', borderRadius: '50%',
                background: ACCENT_LIGHT, border: `1px solid ${BORDER}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: FONT_UI, fontSize: '12px', fontWeight: 600, color: ACCENT_TEXT,
              }}>
                {(user.username || 'U')[0].toUpperCase()}
              </div>
            )}
            <button
              onClick={() => setMenuOpen((v) => !v)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                padding: '4px', display: 'flex', alignItems: 'center',
              }}
              aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            >
              <HamburgerIcon open={menuOpen} />
            </button>
          </div>
        ) : (
          /* ── Desktop: horizontal links ── */
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px', height: '100%' }}>
              {navLinks.map(({ to, label }) => (
                <NavLink key={to} to={to} active={pathname === to}>{label}</NavLink>
              ))}
            </div>

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
          </>
        )}
      </nav>

      {/* ── Mobile dropdown menu ── */}
      {isMobile && menuOpen && (
        <>
          {/* Backdrop */}
          <div
            onClick={closeMenu}
            style={{
              position: 'fixed', inset: 0, top: '56px',
              background: 'rgba(0,0,0,0.35)',
              zIndex: 98,
            }}
          />
          {/* Menu panel */}
          <div style={{
            position: 'fixed', top: '56px', left: 0, right: 0,
            background: SURFACE,
            borderBottom: `1px solid ${BORDER}`,
            boxShadow: SHADOW_MD,
            zIndex: 99,
            overflowY: 'auto',
            maxHeight: 'calc(100vh - 56px)',
          }}>
            {showEditionToggle && (
              <div style={{ padding: '16px 24px', borderBottom: `1px solid ${BORDER}` }}>
                <EditionToggle compact />
              </div>
            )}

            {navLinks.map(({ to, label }) => (
              <MobileNavLink key={to} to={to} active={pathname === to} onClick={closeMenu}>
                {label}
              </MobileNavLink>
            ))}

            <div style={{ padding: '16px 24px', borderTop: `1px solid ${BORDER}`, display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button
                onClick={() => { navigate('/feedback'); closeMenu() }}
                style={{
                  background: 'transparent', border: `1px solid ${BORDER}`,
                  color: TEXT_SEC, fontFamily: FONT_UI, fontSize: '14px',
                  fontWeight: 500, padding: '12px 16px', cursor: 'pointer',
                  borderRadius: RADIUS, textAlign: 'left',
                  transition: 'border-color 100ms',
                }}
              >
                Feedback
              </button>

              {user ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0' }}>
                  <span style={{ fontFamily: FONT_UI, fontSize: '14px', color: TEXT_SEC }}>
                    {user.username}
                  </span>
                  <button
                    onClick={() => { logout(); closeMenu() }}
                    style={{
                      background: 'transparent', border: `1px solid ${BORDER}`,
                      color: TEXT_WEAK, fontFamily: FONT_UI, fontSize: '13px',
                      padding: '8px 14px', cursor: 'pointer', borderRadius: RADIUS,
                    }}
                  >
                    Sign out
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    onClick={() => { setModal('login'); closeMenu() }}
                    style={{
                      flex: 1, background: 'transparent', border: `1px solid ${BORDER}`,
                      color: TEXT_SEC, fontFamily: FONT_UI, fontSize: '14px',
                      fontWeight: 500, padding: '12px', cursor: 'pointer', borderRadius: RADIUS,
                    }}
                  >
                    Sign in
                  </button>
                  <button
                    onClick={() => { setModal('register'); closeMenu() }}
                    style={{
                      flex: 1, background: ACCENT, border: `1px solid ${ACCENT}`,
                      color: BG, fontFamily: FONT_UI, fontSize: '14px',
                      fontWeight: 600, padding: '12px', cursor: 'pointer', borderRadius: RADIUS,
                    }}
                  >
                    Create account
                  </button>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      <AuthModal
        isOpen={modal !== null}
        onClose={() => setModal(null)}
        initialTab={modal ?? 'login'}
      />
    </>
  )
}

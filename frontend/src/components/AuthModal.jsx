import { useState, useEffect, useCallback } from 'react'
import { useAuthStore } from '../store/authStore'

const BLUE   = '#09A2C4'
const BG     = '#041428'
const PANEL  = '#071e38'
const BORDER = 'rgba(9,162,196,0.18)'
const ERROR  = '#e05c5c'

// ── Helpers ───────────────────────────────────────────────────────────────────

function Input({ type = 'text', placeholder, value, onChange, disabled }) {
  const [focused, setFocused] = useState(false)
  return (
    <input
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      disabled={disabled}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={{
        width: '100%',
        background: 'rgba(9,162,196,0.05)',
        border: `1px solid ${focused ? BLUE : BORDER}`,
        color: '#c8d8e8',
        fontFamily: 'Space Mono, monospace',
        fontSize: '13px',
        padding: '13px 16px',
        outline: 'none',
        borderRadius: 0,
        boxSizing: 'border-box',
        transition: 'border-color 120ms',
        opacity: disabled ? 0.5 : 1,
      }}
    />
  )
}

function PrimaryBtn({ children, onClick, disabled, loading }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      style={{
        width: '100%',
        background: disabled || loading ? 'rgba(9,162,196,0.25)' : BLUE,
        border: 'none',
        color: disabled || loading ? 'rgba(255,255,255,0.35)' : BG,
        fontFamily: 'Space Mono, monospace',
        fontSize: '11px',
        letterSpacing: '2px',
        textTransform: 'uppercase',
        fontWeight: 700,
        padding: '14px',
        cursor: disabled || loading ? 'not-allowed' : 'pointer',
        transition: 'background 120ms',
      }}
    >
      {loading ? '...' : children}
    </button>
  )
}

// ── Password strength ─────────────────────────────────────────────────────────

function strengthScore(pw) {
  let s = 0
  if (pw.length >= 8)          s++
  if (pw.length >= 12)         s++
  if (/[A-Z]/.test(pw))        s++
  if (/[0-9]/.test(pw))        s++
  if (/[^A-Za-z0-9]/.test(pw)) s++
  return s
}

function StrengthBar({ password }) {
  if (!password) return null
  const score  = strengthScore(password)
  const colors = ['#e05c5c', '#e07c3c', '#e0b03c', '#7cc47c', '#09A2C4']
  const labels = ['Very weak', 'Weak', 'Fair', 'Strong', 'Excellent']
  return (
    <div style={{ marginTop: '-4px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
      <div style={{ height: '3px', background: 'rgba(9,162,196,0.1)', borderRadius: '2px' }}>
        <div style={{
          height: '100%',
          width: `${(score / 5) * 100}%`,
          background: colors[score - 1] ?? '#e05c5c',
          transition: 'width 200ms, background 200ms',
          borderRadius: '2px',
        }} />
      </div>
      <span style={{
        fontSize: '10px',
        color: colors[score - 1] ?? '#e05c5c',
        fontFamily: 'Space Mono, monospace',
        letterSpacing: '1px',
      }}>
        {labels[score - 1] ?? 'Too short'}
      </span>
    </div>
  )
}

// ── Modal ─────────────────────────────────────────────────────────────────────

export function AuthModal({ isOpen, onClose, initialTab = 'login' }) {
  const [tab, setTab]           = useState(initialTab)
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm]   = useState('')
  const [error, setError]       = useState('')
  const [info, setInfo]         = useState('')
  const [busy, setBusy]         = useState(false)

  const { login, register } = useAuthStore()

  useEffect(() => {
    setEmail(''); setPassword(''); setConfirm('')
    setError(''); setInfo(''); setBusy(false)
  }, [isOpen, tab])

  useEffect(() => {
    if (!isOpen) return
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [isOpen, onClose])

  const handleLogin = useCallback(async () => {
    setError(''); setBusy(true)
    try {
      await login(email.trim(), password)
      onClose()
    } catch (e) {
      setError(e.message ?? 'Erreur de connexion')
    } finally {
      setBusy(false)
    }
  }, [email, password, login, onClose])

  const handleRegister = useCallback(async () => {
    setError('')
    if (password !== confirm) { setError('Passwords do not match'); return }
    if (strengthScore(password) < 2) { setError('Password too weak'); return }
    setBusy(true)
    try {
      await register(email.trim(), password)
      setInfo('A confirmation email has been sent. Check your inbox.')
      setPassword(''); setConfirm('')
    } catch (e) {
      setError(e.message ?? 'Error creating account')
    } finally {
      setBusy(false)
    }
  }, [email, password, confirm, register])

  const handleKey = (e) => {
    if (e.key !== 'Enter' || busy) return
    if (tab === 'login') handleLogin()
    else handleRegister()
  }

  if (!isOpen) return null

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        background: 'rgba(4,20,40,0.8)',
        backdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '20px',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: '460px',
          background: PANEL,
          border: `1px solid ${BORDER}`,
          padding: '40px 36px 36px',
          position: 'relative',
          display: 'flex', flexDirection: 'column', gap: '24px',
        }}
      >
        {/* Close */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute', top: '16px', right: '20px',
            background: 'none', border: 'none',
            color: 'rgba(200,216,232,0.35)', fontSize: '20px',
            cursor: 'pointer', lineHeight: 1,
          }}
        >
          ×
        </button>

        {/* Logo */}
        <div style={{
          fontFamily: 'Space Mono, monospace', fontSize: '15px',
          fontWeight: 700, letterSpacing: '3px', color: BLUE,
        }}>
          PROB<span style={{ opacity: 0.4 }}>'</span>HAMMER
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: `1px solid ${BORDER}` }}>
          {[['login', 'Sign in'], ['register', 'Create account']].map(([id, label]) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              style={{
                flex: 1,
                padding: '10px 0',
                background: 'none', border: 'none',
                borderBottom: tab === id ? `2px solid ${BLUE}` : '2px solid transparent',
                color: tab === id ? BLUE : 'rgba(200,216,232,0.4)',
                fontFamily: 'Space Mono, monospace',
                fontSize: '10px',
                letterSpacing: '2px',
                textTransform: 'uppercase',
                cursor: 'pointer',
                marginBottom: '-1px',
                transition: 'color 120ms',
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Fields */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }} onKeyDown={handleKey}>

          <Input
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={busy}
          />

          <Input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={busy}
          />

          {tab === 'register' && (<>
            <StrengthBar password={password} />
            <Input
              type="password"
              placeholder="Confirm password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              disabled={busy}
            />
          </>)}

          <PrimaryBtn
            onClick={tab === 'login' ? handleLogin : handleRegister}
            disabled={tab === 'login' ? (!email || !password) : (!email || !password || !confirm)}
            loading={busy}
          >
            {tab === 'login' ? 'Sign in' : 'Create account'}
          </PrimaryBtn>

          {/* Switch tab link */}
          <p style={{
            fontFamily: 'Space Mono, monospace', fontSize: '10px',
            color: 'rgba(200,216,232,0.4)', margin: 0, textAlign: 'center',
          }}>
            {tab === 'login' ? 'No account yet? ' : 'Already have an account? '}
            <span
              onClick={() => setTab(tab === 'login' ? 'register' : 'login')}
              style={{ color: BLUE, cursor: 'pointer', textDecoration: 'underline' }}
            >
              {tab === 'login' ? 'Create account' : 'Sign in'}
            </span>
          </p>

          {error && (
            <p style={{
              fontFamily: 'Space Mono, monospace', fontSize: '10px',
              color: ERROR, margin: 0, lineHeight: 1.5,
            }}>
              {error}
            </p>
          )}
          {info && (
            <p style={{
              fontFamily: 'Space Mono, monospace', fontSize: '10px',
              color: BLUE, margin: 0, lineHeight: 1.6,
              background: 'rgba(9,162,196,0.07)',
              border: `1px solid ${BORDER}`,
              padding: '12px 14px',
            }}>
              {info}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

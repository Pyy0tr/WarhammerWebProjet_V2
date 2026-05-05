import { useState, useEffect, useCallback } from 'react'
import { useAuthStore } from '../store/authStore'
import { ACCENT, BG, SURFACE, BORDER, TEXT, TEXT_SEC, TEXT_OFF, ERROR as ERR_COLOR } from '../theme'

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
        background: SURFACE,
        border: `1px solid ${focused ? ACCENT : BORDER}`,
        color: TEXT,
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
        background: disabled || loading ? SURFACE : ACCENT,
        border: 'none',
        color: disabled || loading ? TEXT_OFF : BG,
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

export function AuthModal({ isOpen, onClose, initialTab = 'login' }) {
  const [tab, setTab]           = useState(initialTab)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm]   = useState('')
  const [error, setError]       = useState('')
  const [busy, setBusy]         = useState(false)

  const { login, register } = useAuthStore()

  useEffect(() => { setTab(initialTab) }, [initialTab])

  useEffect(() => {
    setUsername(''); setPassword(''); setConfirm('')
    setError(''); setBusy(false)
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
      await login(username.trim(), password)
      onClose()
    } catch (e) {
      setError(e.message ?? 'Login error')
    } finally {
      setBusy(false)
    }
  }, [username, password, login, onClose])

  const handleRegister = useCallback(async () => {
    setError('')
    if (password !== confirm) { setError('Passwords do not match'); return }
    setBusy(true)
    try {
      await register(username.trim(), password)
      onClose()
    } catch (e) {
      setError(e.message ?? 'Error creating account')
    } finally {
      setBusy(false)
    }
  }, [username, password, confirm, register, onClose])

  const handleKey = (e) => {
    if (e.key !== 'Enter' || busy) return
    if (tab === 'login')    handleLogin()
    if (tab === 'register') handleRegister()
  }

  if (!isOpen) return null

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, zIndex: 200,
      background: 'rgba(10,22,33,0.8)',
      backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '20px',
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        width: '100%', maxWidth: '460px',
        background: SURFACE,
        border: `1px solid ${BORDER}`,
        padding: '40px 36px 36px',
        position: 'relative',
        display: 'flex', flexDirection: 'column', gap: '24px',
      }}>
        <button onClick={onClose} style={{
          position: 'absolute', top: '16px', right: '20px',
          background: 'none', border: 'none',
          color: TEXT_OFF, fontSize: '20px',
          cursor: 'pointer', lineHeight: 1,
        }}>×</button>

        <div style={{
          fontFamily: 'Space Mono, monospace', fontSize: '15px',
          fontWeight: 700, letterSpacing: '3px', color: ACCENT,
        }}>
          PROB<span style={{ opacity: 0.4 }}>'</span>HAMMER
        </div>

        <div style={{ display: 'flex', borderBottom: `1px solid ${BORDER}` }}>
          {[['login', 'Sign in'], ['register', 'Create account']].map(([id, label]) => (
            <button key={id} onClick={() => setTab(id)} style={{
              flex: 1, padding: '10px 0',
              background: 'none', border: 'none',
              borderBottom: tab === id ? `2px solid ${ACCENT}` : '2px solid transparent',
              color: tab === id ? ACCENT : TEXT_OFF,
              fontFamily: 'Space Mono, monospace', fontSize: '10px',
              letterSpacing: '2px', textTransform: 'uppercase',
              cursor: 'pointer', marginBottom: '-1px', transition: 'color 120ms',
            }}>
              {label}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }} onKeyDown={handleKey}>
          <Input placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)} disabled={busy} />
          <Input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} disabled={busy} />

          {tab === 'register' && (
            <Input type="password" placeholder="Confirm password" value={confirm} onChange={(e) => setConfirm(e.target.value)} disabled={busy} />
          )}

          <PrimaryBtn
            onClick={tab === 'login' ? handleLogin : handleRegister}
            disabled={tab === 'login' ? (!username || !password) : (!username || !password || !confirm)}
            loading={busy}
          >
            {tab === 'login' ? 'Sign in' : 'Create account'}
          </PrimaryBtn>

          <p style={{ fontFamily: 'Space Mono, monospace', fontSize: '10px', color: TEXT_OFF, margin: 0, textAlign: 'center' }}>
            {tab === 'login' ? 'No account yet? ' : 'Already have an account? '}
            <span onClick={() => setTab(tab === 'login' ? 'register' : 'login')}
              style={{ color: ACCENT, cursor: 'pointer', textDecoration: 'underline' }}>
              {tab === 'login' ? 'Create account' : 'Sign in'}
            </span>
          </p>

          {error && (
            <p style={{ fontFamily: 'Space Mono, monospace', fontSize: '10px', color: ERR_COLOR, margin: 0, lineHeight: 1.5 }}>
              {error}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

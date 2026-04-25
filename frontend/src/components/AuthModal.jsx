import { useState, useEffect, useCallback } from 'react'
import { useAuthStore } from '../store/authStore'
import { ACCENT, BG, SURFACE, BORDER, TEXT, TEXT_SEC, TEXT_WEAK, TEXT_OFF, ERROR as ERR_COLOR, SUCCESS } from '../theme'

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
  const colors = [ERR_COLOR, '#FFB547', '#FFB547', SUCCESS, ACCENT]
  const labels = ['Very weak', 'Weak', 'Fair', 'Strong', 'Excellent']
  return (
    <div style={{ marginTop: '-4px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
      <div style={{ height: '3px', background: BORDER, borderRadius: '2px' }}>
        <div style={{
          height: '100%',
          width: `${(score / 5) * 100}%`,
          background: colors[score - 1] ?? ERR_COLOR,
          transition: 'width 200ms, background 200ms',
          borderRadius: '2px',
        }} />
      </div>
      <span style={{
        fontSize: '10px',
        color: colors[score - 1] ?? ERR_COLOR,
        fontFamily: 'Space Mono, monospace',
        letterSpacing: '1px',
      }}>
        {labels[score - 1] ?? 'Too short'}
      </span>
    </div>
  )
}

export function AuthModal({ isOpen, onClose, initialTab = 'login' }) {
  const [tab, setTab]           = useState(initialTab)
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm]   = useState('')
  const [error, setError]       = useState('')
  const [info, setInfo]         = useState('')
  const [busy, setBusy]         = useState(false)

  const { login, register, sendPasswordReset, updatePassword, isPasswordRecovery, setPasswordRecovery } = useAuthStore()

  // Si Supabase détecte un token de récupération dans l'URL → ouvrir le formulaire reset
  useEffect(() => {
    if (isPasswordRecovery && isOpen) setTab('reset')
  }, [isPasswordRecovery, isOpen])

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
      setError(e.message?.toLowerCase().includes('invalid') ? 'Incorrect email or password' : (e.message ?? 'Login error'))
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

  const handleForgot = useCallback(async () => {
    setError(''); setBusy(true)
    try {
      await sendPasswordReset(email.trim())
      setInfo('Reset link sent — check your inbox.')
    } catch (e) {
      setError(e.message ?? 'Error sending reset email')
    } finally {
      setBusy(false)
    }
  }, [email, sendPasswordReset])

  const handleUpdatePassword = useCallback(async () => {
    setError('')
    if (password !== confirm) { setError('Passwords do not match'); return }
    if (strengthScore(password) < 2) { setError('Password too weak'); return }
    setBusy(true)
    try {
      await updatePassword(password)
      setPasswordRecovery(false)
      setInfo('Password updated successfully.')
      setPassword(''); setConfirm('')
      setTimeout(onClose, 1500)
    } catch (e) {
      setError(e.message ?? 'Error updating password')
    } finally {
      setBusy(false)
    }
  }, [password, confirm, updatePassword, setPasswordRecovery, onClose])

  const handleKey = (e) => {
    if (e.key !== 'Enter' || busy) return
    if (tab === 'login') handleLogin()
    else if (tab === 'register') handleRegister()
    else if (tab === 'forgot') handleForgot()
    else if (tab === 'reset') handleUpdatePassword()
  }

  if (!isOpen) return null

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        background: 'rgba(10,22,33,0.8)',
        backdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '20px',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: '460px',
          background: SURFACE,
          border: `1px solid ${BORDER}`,
          padding: '40px 36px 36px',
          position: 'relative',
          display: 'flex', flexDirection: 'column', gap: '24px',
        }}
      >
        <button
          onClick={onClose}
          style={{
            position: 'absolute', top: '16px', right: '20px',
            background: 'none', border: 'none',
            color: TEXT_OFF, fontSize: '20px',
            cursor: 'pointer', lineHeight: 1,
          }}
        >
          ×
        </button>

        <div style={{
          fontFamily: 'Space Mono, monospace', fontSize: '15px',
          fontWeight: 700, letterSpacing: '3px', color: ACCENT,
        }}>
          PROB<span style={{ opacity: 0.4 }}>'</span>HAMMER
        </div>

        {tab !== 'forgot' && tab !== 'reset' && (
          <div style={{ display: 'flex', borderBottom: `1px solid ${BORDER}` }}>
            {[['login', 'Sign in'], ['register', 'Create account']].map(([id, label]) => (
              <button
                key={id}
                onClick={() => setTab(id)}
                style={{
                  flex: 1, padding: '10px 0',
                  background: 'none', border: 'none',
                  borderBottom: tab === id ? `2px solid ${ACCENT}` : '2px solid transparent',
                  color: tab === id ? ACCENT : TEXT_OFF,
                  fontFamily: 'Space Mono, monospace', fontSize: '10px',
                  letterSpacing: '2px', textTransform: 'uppercase',
                  cursor: 'pointer', marginBottom: '-1px', transition: 'color 120ms',
                }}
              >
                {label}
              </button>
            ))}
          </div>
        )}

        {tab === 'forgot' && (
          <div style={{ fontFamily: 'Space Mono, monospace', fontSize: '11px', letterSpacing: '1px', color: TEXT_SEC }}>
            Enter your email — we'll send you a reset link.
          </div>
        )}

        {tab === 'reset' && (
          <div style={{ fontFamily: 'Space Mono, monospace', fontSize: '11px', letterSpacing: '1px', color: TEXT_SEC }}>
            Choose your new password.
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }} onKeyDown={handleKey}>

          {/* Email — affiché sauf sur reset */}
          {tab !== 'reset' && (
            <Input placeholder="Email" value={email}
              onChange={(e) => setEmail(e.target.value)} disabled={busy} />
          )}

          {/* Password — affiché sur login, register, reset */}
          {(tab === 'login' || tab === 'register' || tab === 'reset') && (
            <Input type="password"
              placeholder={tab === 'reset' ? 'New password' : 'Password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)} disabled={busy} />
          )}

          {(tab === 'register' || tab === 'reset') && (<>
            <StrengthBar password={password} />
            <Input type="password" placeholder="Confirm password" value={confirm}
              onChange={(e) => setConfirm(e.target.value)} disabled={busy} />
          </>)}

          <PrimaryBtn
            onClick={
              tab === 'login'    ? handleLogin :
              tab === 'register' ? handleRegister :
              tab === 'forgot'   ? handleForgot :
                                   handleUpdatePassword
            }
            disabled={
              tab === 'login'    ? (!email || !password) :
              tab === 'register' ? (!email || !password || !confirm) :
              tab === 'forgot'   ? !email :
                                   (!password || !confirm)
            }
            loading={busy}
          >
            {tab === 'login'    ? 'Sign in' :
             tab === 'register' ? 'Create account' :
             tab === 'forgot'   ? 'Send reset link' :
                                  'Update password'}
          </PrimaryBtn>

          {tab === 'login' && (
            <p style={{ fontFamily: 'Space Mono, monospace', fontSize: '10px', color: TEXT_OFF, margin: 0, textAlign: 'center' }}>
              <span onClick={() => setTab('forgot')}
                style={{ color: ACCENT, cursor: 'pointer', textDecoration: 'underline' }}>
                Forgot password?
              </span>
            </p>
          )}

          {(tab === 'login' || tab === 'register') && (
            <p style={{ fontFamily: 'Space Mono, monospace', fontSize: '10px', color: TEXT_OFF, margin: 0, textAlign: 'center' }}>
              {tab === 'login' ? 'No account yet? ' : 'Already have an account? '}
              <span
                onClick={() => setTab(tab === 'login' ? 'register' : 'login')}
                style={{ color: ACCENT, cursor: 'pointer', textDecoration: 'underline' }}
              >
                {tab === 'login' ? 'Create account' : 'Sign in'}
              </span>
            </p>
          )}

          {(tab === 'forgot' || tab === 'reset') && (
            <p style={{ fontFamily: 'Space Mono, monospace', fontSize: '10px', color: TEXT_OFF, margin: 0, textAlign: 'center' }}>
              <span onClick={() => setTab('login')}
                style={{ color: ACCENT, cursor: 'pointer', textDecoration: 'underline' }}>
                ← Back to sign in
              </span>
            </p>
          )}

          {error && (
            <p style={{
              fontFamily: 'Space Mono, monospace', fontSize: '10px',
              color: ERR_COLOR, margin: 0, lineHeight: 1.5,
            }}>
              {error}
            </p>
          )}
          {info && (
            <p style={{
              fontFamily: 'Space Mono, monospace', fontSize: '10px',
              color: ACCENT, margin: 0, lineHeight: 1.6,
              background: 'rgba(47,224,255,0.05)',
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

import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { ACCENT, BG, BORDER, TEXT, TEXT_SEC, TEXT_OFF, TEXT_WEAK, ERROR as ERR_COLOR, SUCCESS } from '../theme'

function strengthScore(pw) {
  let s = 0
  if (pw.length >= 8)          s++
  if (pw.length >= 12)         s++
  if (/[A-Z]/.test(pw))        s++
  if (/[0-9]/.test(pw))        s++
  if (/[^A-Za-z0-9]/.test(pw)) s++
  return s
}

export function ResetPasswordPage() {
  const [params]       = useSearchParams()
  const navigate       = useNavigate()
  const resetPassword  = useAuthStore((s) => s.resetPassword)
  const [password, setPassword]   = useState('')
  const [confirm, setConfirm]     = useState('')
  const [error, setError]         = useState('')
  const [busy, setBusy]           = useState(false)
  const [done, setDone]           = useState(false)

  const token = params.get('token')

  useEffect(() => {
    document.title = "Reset Password — Prob'Hammer"
    if (!token) navigate('/')
  }, [])

  const handleSubmit = async () => {
    setError('')
    if (password !== confirm)        { setError('Passwords do not match'); return }
    if (strengthScore(password) < 2) { setError('Password too weak'); return }
    setBusy(true)
    try {
      await resetPassword(token, password)
      setDone(true)
    } catch (e) {
      setError(e.message ?? 'Error')
    } finally {
      setBusy(false)
    }
  }

  const score  = strengthScore(password)
  const colors = [ERR_COLOR, '#FFB547', '#FFB547', SUCCESS, ACCENT]
  const labels = ['Very weak', 'Weak', 'Fair', 'Strong', 'Excellent']

  return (
    <div style={{
      minHeight: '100vh', background: BG,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '40px 20px',
    }}>
      <div style={{
        maxWidth: '420px', width: '100%',
        border: `1px solid ${BORDER}`, padding: '48px 40px',
        display: 'flex', flexDirection: 'column', gap: '20px',
      }}>
        <div style={{ fontFamily: 'Space Mono, monospace', fontSize: '13px', fontWeight: 700, letterSpacing: '3px', color: ACCENT }}>
          PROB'HAMMER
        </div>

        {done ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center', textAlign: 'center' }}>
            <div style={{ fontSize: '32px' }}>✓</div>
            <p style={{ fontFamily: 'Space Mono, monospace', fontSize: '12px', color: SUCCESS, letterSpacing: '2px', margin: 0 }}>
              PASSWORD UPDATED
            </p>
            <button onClick={() => navigate('/')} style={{
              background: ACCENT, border: 'none', color: BG,
              fontFamily: 'Space Mono, monospace', fontSize: '11px',
              fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase',
              padding: '14px 28px', cursor: 'pointer',
            }}>
              Sign in →
            </button>
          </div>
        ) : (<>
          <p style={{ fontFamily: 'Space Mono, monospace', fontSize: '11px', letterSpacing: '2px', color: TEXT, margin: 0 }}>
            NEW PASSWORD
          </p>

          <input
            type="password"
            placeholder="New password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={busy}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit() }}
            style={{
              width: '100%', background: BG, border: `1px solid ${BORDER}`,
              color: TEXT, fontFamily: 'Space Mono, monospace', fontSize: '13px',
              padding: '13px 16px', outline: 'none', boxSizing: 'border-box',
            }}
          />

          {password && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '-8px' }}>
              <div style={{ height: '3px', background: BORDER }}>
                <div style={{ height: '100%', width: `${(score / 5) * 100}%`, background: colors[score - 1] ?? ERR_COLOR, transition: 'width 200ms' }} />
              </div>
              <span style={{ fontSize: '10px', color: colors[score - 1] ?? ERR_COLOR, fontFamily: 'Space Mono, monospace' }}>
                {labels[score - 1] ?? 'Too short'}
              </span>
            </div>
          )}

          <input
            type="password"
            placeholder="Confirm password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            disabled={busy}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit() }}
            style={{
              width: '100%', background: BG, border: `1px solid ${BORDER}`,
              color: TEXT, fontFamily: 'Space Mono, monospace', fontSize: '13px',
              padding: '13px 16px', outline: 'none', boxSizing: 'border-box',
            }}
          />

          <button
            onClick={handleSubmit}
            disabled={!password || !confirm || busy}
            style={{
              background: !password || !confirm || busy ? BG : ACCENT,
              border: 'none', color: !password || !confirm || busy ? TEXT_OFF : BG,
              fontFamily: 'Space Mono, monospace', fontSize: '11px',
              fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase',
              padding: '14px', cursor: !password || !confirm || busy ? 'not-allowed' : 'pointer',
            }}
          >
            {busy ? '...' : 'Update password'}
          </button>

          {error && (
            <p style={{ fontFamily: 'Space Mono, monospace', fontSize: '10px', color: ERR_COLOR, margin: 0 }}>{error}</p>
          )}
        </>)}
      </div>
    </div>
  )
}

import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { ACCENT, BG, BORDER, TEXT, TEXT_SEC, TEXT_WEAK, ERROR, SUCCESS } from '../theme'

export function VerifyEmailPage() {
  const [params]      = useSearchParams()
  const navigate      = useNavigate()
  const verifyEmail   = useAuthStore((s) => s.verifyEmail)
  const [status, setStatus] = useState('pending') // pending | success | error

  useEffect(() => {
    document.title = "Verify Email — Prob'Hammer"
    const token = params.get('token')
    if (!token) { setStatus('error'); return }
    verifyEmail(token)
      .then(() => setStatus('success'))
      .catch(() => setStatus('error'))
  }, [])

  return (
    <div style={{
      minHeight: '100vh', background: BG,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '40px 20px',
    }}>
      <div style={{
        maxWidth: '420px', width: '100%',
        border: `1px solid ${BORDER}`, padding: '48px 40px',
        display: 'flex', flexDirection: 'column', gap: '20px', alignItems: 'center',
        textAlign: 'center',
      }}>
        <div style={{ fontFamily: 'Space Mono, monospace', fontSize: '13px', fontWeight: 700, letterSpacing: '3px', color: ACCENT }}>
          PROB'HAMMER
        </div>

        {status === 'pending' && (
          <p style={{ fontFamily: 'Space Mono, monospace', fontSize: '11px', color: TEXT_WEAK, letterSpacing: '1px' }}>
            Verifying…
          </p>
        )}

        {status === 'success' && (<>
          <div style={{ fontSize: '32px' }}>✓</div>
          <p style={{ fontFamily: 'Space Mono, monospace', fontSize: '12px', color: SUCCESS, letterSpacing: '2px', margin: 0 }}>
            EMAIL VERIFIED
          </p>
          <p style={{ fontFamily: 'Georgia, serif', fontSize: '14px', color: TEXT_SEC, margin: 0, lineHeight: 1.6 }}>
            Your account is active. You can now sign in.
          </p>
          <button onClick={() => navigate('/')} style={{
            background: ACCENT, border: 'none', color: BG,
            fontFamily: 'Space Mono, monospace', fontSize: '11px',
            fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase',
            padding: '14px 28px', cursor: 'pointer',
          }}>
            Go to the app →
          </button>
        </>)}

        {status === 'error' && (<>
          <div style={{ fontSize: '32px' }}>✗</div>
          <p style={{ fontFamily: 'Space Mono, monospace', fontSize: '12px', color: ERROR, letterSpacing: '2px', margin: 0 }}>
            INVALID LINK
          </p>
          <p style={{ fontFamily: 'Georgia, serif', fontSize: '14px', color: TEXT_SEC, margin: 0, lineHeight: 1.6 }}>
            This verification link is invalid or has already been used.
          </p>
          <button onClick={() => navigate('/')} style={{
            background: 'none', border: `1px solid ${BORDER}`, color: TEXT_SEC,
            fontFamily: 'Space Mono, monospace', fontSize: '11px',
            letterSpacing: '2px', textTransform: 'uppercase',
            padding: '14px 28px', cursor: 'pointer',
          }}>
            Back to home
          </button>
        </>)}
      </div>
    </div>
  )
}

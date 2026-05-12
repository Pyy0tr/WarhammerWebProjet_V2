import { useState, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { ACCENT, BG, SURFACE, BORDER, TEXT, TEXT_OFF, ERROR as ERR_COLOR, SUCCESS } from '../theme'

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
        borderRadius: '2px',
        boxSizing: 'border-box',
        transition: 'border-color 120ms',
        opacity: disabled ? 0.5 : 1,
      }}
    />
  )
}

export function ResetPasswordPage() {
  const [searchParams]        = useSearchParams()
  const navigate              = useNavigate()
  const { resetPassword }     = useAuthStore()
  const token                 = searchParams.get('token')

  const [password, setPassword] = useState('')
  const [confirm, setConfirm]   = useState('')
  const [error, setError]       = useState('')
  const [success, setSuccess]   = useState(false)
  const [busy, setBusy]         = useState(false)

  const handleReset = useCallback(async () => {
    if (password !== confirm) { setError('Les mots de passe ne correspondent pas'); return }
    if (password.length < 8)  { setError('8 caractères minimum'); return }
    setError(''); setBusy(true)
    try {
      await resetPassword(token, password)
      setSuccess(true)
      setTimeout(() => navigate('/'), 2500)
    } catch (e) {
      setError(e.message ?? 'Lien invalide ou expiré')
    } finally {
      setBusy(false)
    }
  }, [token, password, confirm, resetPassword, navigate])

  if (!token) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: BG }}>
        <p style={{ fontFamily: 'Space Mono, monospace', color: ERR_COLOR, fontSize: '13px' }}>Lien invalide.</p>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: BG, padding: '20px' }}>
      <div style={{ width: '100%', maxWidth: '460px', background: SURFACE, border: `1px solid ${BORDER}`, padding: '40px 36px 36px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <div style={{ fontFamily: 'Space Mono, monospace', fontSize: '15px', fontWeight: 700, letterSpacing: '3px', color: ACCENT }}>
          PROB<span style={{ opacity: 0.4 }}>'</span>HAMMER
        </div>
        <div style={{ fontFamily: 'Space Mono, monospace', fontSize: '11px', letterSpacing: '2px', color: TEXT_OFF, textTransform: 'uppercase' }}>
          Nouveau mot de passe
        </div>

        {success ? (
          <p style={{ fontFamily: 'Space Mono, monospace', fontSize: '12px', color: SUCCESS, lineHeight: 1.6 }}>
            Mot de passe mis à jour. Redirection...
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <Input type="password" placeholder="Nouveau mot de passe" value={password} onChange={(e) => setPassword(e.target.value)} disabled={busy} />
            <Input type="password" placeholder="Confirmer le mot de passe" value={confirm} onChange={(e) => setConfirm(e.target.value)} disabled={busy} />
            <button
              onClick={handleReset}
              disabled={!password || !confirm || busy}
              style={{
                width: '100%', background: !password || !confirm || busy ? SURFACE : ACCENT,
                border: 'none', color: !password || !confirm || busy ? TEXT_OFF : BG,
                fontFamily: 'Space Mono, monospace', fontSize: '11px', letterSpacing: '2px',
                textTransform: 'uppercase', fontWeight: 700, padding: '14px',
                cursor: !password || !confirm || busy ? 'not-allowed' : 'pointer',
              }}
            >
              {busy ? '...' : 'Valider'}
            </button>
            {error && <p style={{ fontFamily: 'Space Mono, monospace', fontSize: '10px', color: ERR_COLOR, margin: 0 }}>{error}</p>}
          </div>
        )}
      </div>
    </div>
  )
}

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { api } from '../lib/api'
import {
  ACCENT, BG, BORDER, HIGHLIGHT, SURFACE, SURFACE_E,
  TEXT, TEXT_SEC, TEXT_WEAK, TEXT_OFF,
} from '../theme'

const TYPES = [
  { id: 'bug',        label: 'Bug',        desc: 'Something is broken or gives wrong results' },
  { id: 'suggestion', label: 'Suggestion', desc: 'An idea to improve the simulator' },
  { id: 'other',      label: 'Other',      desc: 'Anything else' },
]

const TYPE_COLOR = {
  bug:        HIGHLIGHT,
  suggestion: ACCENT,
  other:      TEXT_WEAK,
}

export function FeedbackPage() {
  const navigate = useNavigate()
  const { user }  = useAuthStore()

  const [type,    setType]    = useState('')
  const [message, setMessage] = useState('')
  const [email,   setEmail]   = useState('')
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')
  const [done,    setDone]    = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (!type)    return setError('Choisis un type de feedback.')
    if (message.trim().length < 10) return setError('Le message doit faire au moins 10 caractères.')

    setLoading(true)
    try {
      await api.post('/feedback', { type, message: message.trim(), email: email || undefined })
      setDone(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (done) {
    return (
      <div style={{ minHeight: 'calc(100vh - 52px)', marginTop: '52px', background: BG, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 24px' }}>
        <div style={{ maxWidth: '480px', width: '100%', display: 'flex', flexDirection: 'column', gap: '24px', border: `1px solid ${ACCENT}`, background: SURFACE, padding: '48px 44px' }}>
          <div style={{ fontFamily: 'Space Mono, monospace', fontSize: '9px', letterSpacing: '3px', textTransform: 'uppercase', color: ACCENT }}>Envoyé</div>
          <h1 style={{ fontFamily: 'Space Mono, monospace', fontSize: '20px', fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: TEXT, margin: 0 }}>
            Merci pour ton feedback
          </h1>
          <p style={{ fontFamily: 'Georgia, serif', fontSize: '15px', lineHeight: 1.7, color: TEXT_SEC, margin: 0 }}>
            Ton message a bien été reçu. Je lis chaque feedback attentivement.
          </p>
          <button
            onClick={() => navigate('/')}
            style={{ background: 'transparent', border: `1px solid ${BORDER}`, color: TEXT_OFF, fontFamily: 'Space Mono, monospace', fontSize: '10px', letterSpacing: '2px', textTransform: 'uppercase', padding: '12px 24px', cursor: 'pointer', alignSelf: 'flex-start', transition: 'opacity 150ms' }}
            onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.7' }}
            onMouseLeave={(e) => { e.currentTarget.style.opacity = '1' }}
          >
            ← Retour
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: 'calc(100vh - 52px)', marginTop: '52px', background: BG, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 24px' }}>
      <div style={{ maxWidth: '560px', width: '100%', display: 'flex', flexDirection: 'column', gap: '32px' }}>

        {/* Header */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ fontFamily: 'Space Mono, monospace', fontSize: '9px', letterSpacing: '3px', textTransform: 'uppercase', color: TEXT_WEAK }}>
            Prob'Hammer — Feedback
          </div>
          <h1 style={{ fontFamily: 'Space Mono, monospace', fontSize: 'clamp(18px, 2.5vw, 26px)', fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: TEXT, margin: 0 }}>
            Envoie un feedback
          </h1>
          <p style={{ fontFamily: 'Georgia, serif', fontSize: '15px', lineHeight: 1.7, color: TEXT_SEC, margin: 0 }}>
            Bug, suggestion, question — tout est bienvenu. Je lis chaque message.
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

          {/* Type selector */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ fontFamily: 'Space Mono, monospace', fontSize: '9px', letterSpacing: '2px', textTransform: 'uppercase', color: TEXT_WEAK }}>
              Type *
            </div>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              {TYPES.map((t) => {
                const selected = type === t.id
                const col = TYPE_COLOR[t.id]
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setType(t.id)}
                    style={{
                      flex: 1, minWidth: '120px',
                      border: `1px solid ${selected ? col : BORDER}`,
                      background: selected ? `${col}10` : SURFACE,
                      padding: '14px 12px',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'border-color 150ms, background 150ms',
                    }}
                    onMouseEnter={(e) => { if (!selected) e.currentTarget.style.borderColor = TEXT_WEAK }}
                    onMouseLeave={(e) => { if (!selected) e.currentTarget.style.borderColor = BORDER }}
                  >
                    <div style={{ fontFamily: 'Space Mono, monospace', fontSize: '10px', fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', color: selected ? col : TEXT }}>{t.label}</div>
                    <div style={{ fontFamily: 'Georgia, serif', fontSize: '11px', color: TEXT_WEAK, marginTop: '4px', lineHeight: 1.4 }}>{t.desc}</div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Message */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <div style={{ fontFamily: 'Space Mono, monospace', fontSize: '9px', letterSpacing: '2px', textTransform: 'uppercase', color: TEXT_WEAK }}>Message *</div>
              <div style={{ fontFamily: 'Space Mono, monospace', fontSize: '9px', color: message.length > 1800 ? HIGHLIGHT : TEXT_OFF }}>{message.length}/2000</div>
            </div>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Décris le problème ou l'idée..."
              maxLength={2000}
              rows={6}
              style={{
                background: SURFACE, border: `1px solid ${BORDER}`, color: TEXT,
                fontFamily: 'Georgia, serif', fontSize: '14px', lineHeight: 1.7,
                padding: '14px 16px', resize: 'vertical', outline: 'none',
                transition: 'border-color 150ms',
              }}
              onFocus={(e)  => { e.target.style.borderColor = ACCENT }}
              onBlur={(e)   => { e.target.style.borderColor = BORDER }}
            />
          </div>

          {/* Email (only if not logged in) */}
          {!user && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ fontFamily: 'Space Mono, monospace', fontSize: '9px', letterSpacing: '2px', textTransform: 'uppercase', color: TEXT_WEAK }}>
                Email <span style={{ color: TEXT_OFF }}>(optionnel — pour que je puisse te répondre)</span>
              </div>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ton@email.com"
                style={{
                  background: SURFACE, border: `1px solid ${BORDER}`, color: TEXT,
                  fontFamily: 'Space Mono, monospace', fontSize: '12px',
                  padding: '12px 16px', outline: 'none',
                  transition: 'border-color 150ms',
                }}
                onFocus={(e) => { e.target.style.borderColor = ACCENT }}
                onBlur={(e)  => { e.target.style.borderColor = BORDER }}
              />
            </div>
          )}

          {user && (
            <div style={{ fontFamily: 'Space Mono, monospace', fontSize: '9px', color: TEXT_OFF, letterSpacing: '1.5px' }}>
              Envoyé en tant que <span style={{ color: TEXT_WEAK }}>{user.username}</span>
            </div>
          )}

          {error && (
            <div style={{ fontFamily: 'Space Mono, monospace', fontSize: '10px', color: HIGHLIGHT, letterSpacing: '1px' }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              background: ACCENT, border: 'none', color: BG,
              fontFamily: 'Space Mono, monospace', fontSize: '10px',
              letterSpacing: '2px', textTransform: 'uppercase', fontWeight: 700,
              padding: '14px 28px', cursor: loading ? 'wait' : 'pointer',
              alignSelf: 'flex-start', opacity: loading ? 0.6 : 1,
              transition: 'opacity 150ms',
            }}
            onMouseEnter={(e) => { if (!loading) e.currentTarget.style.opacity = '0.85' }}
            onMouseLeave={(e) => { e.currentTarget.style.opacity = loading ? '0.6' : '1' }}
          >
            {loading ? 'Envoi...' : 'Envoyer →'}
          </button>
        </form>
      </div>
    </div>
  )
}

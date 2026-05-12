import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { api } from '../lib/api'
import {
  ACCENT, BG, BORDER, HIGHLIGHT, SURFACE, SURFACE_E,
  TEXT, TEXT_SEC, TEXT_WEAK, TEXT_OFF,
} from '../theme'

const ADMIN_USERNAME = 'admin'

const TYPE_COLOR = {
  bug:        HIGHLIGHT,
  suggestion: ACCENT,
  other:      TEXT_WEAK,
}

function formatDate(iso) {
  const d = new Date(iso)
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function FeedbackCard({ fb, onMarkRead }) {
  const [expanded, setExpanded] = useState(false)
  const col = TYPE_COLOR[fb.type] ?? TEXT_WEAK
  const sender = fb.username ?? fb.email ?? 'anonymous'

  return (
    <div style={{
      border: `1px solid ${fb.is_read ? BORDER : col}`,
      background: fb.is_read ? SURFACE : `${SURFACE}`,
      opacity: fb.is_read ? 0.55 : 1,
      transition: 'opacity 200ms, border-color 200ms',
    }}>
      <div
        onClick={() => setExpanded(!expanded)}
        style={{ padding: '14px 20px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '14px' }}
      >
        {/* Unread dot */}
        <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: fb.is_read ? 'transparent' : col, flexShrink: 0, border: fb.is_read ? `1px solid ${BORDER}` : 'none' }} />

        {/* Type badge */}
        <div style={{ fontFamily: 'Space Mono, monospace', fontSize: '8px', letterSpacing: '2px', textTransform: 'uppercase', color: col, border: `1px solid ${col}`, padding: '2px 7px', flexShrink: 0 }}>
          {fb.type}
        </div>

        {/* Sender */}
        <div style={{ fontFamily: 'Space Mono, monospace', fontSize: '10px', color: TEXT_WEAK, flexShrink: 0 }}>
          {sender}
        </div>

        {/* Message preview */}
        <div style={{ fontFamily: 'Georgia, serif', fontSize: '13px', color: TEXT_SEC, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
          {fb.message}
        </div>

        {/* Date */}
        <div style={{ fontFamily: 'Space Mono, monospace', fontSize: '10px', color: TEXT_OFF, flexShrink: 0 }}>
          {formatDate(fb.created_at)}
        </div>

        {/* Expand arrow */}
        <div style={{ fontFamily: 'Space Mono, monospace', fontSize: '10px', color: TEXT_OFF, flexShrink: 0 }}>
          {expanded ? '▲' : '▼'}
        </div>
      </div>

      {expanded && (
        <div style={{ borderTop: `1px solid ${BORDER}`, padding: '20px 20px 20px 40px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <p style={{ fontFamily: 'Georgia, serif', fontSize: '15px', lineHeight: 1.8, color: TEXT_SEC, margin: 0, whiteSpace: 'pre-wrap' }}>
            {fb.message}
          </p>
          {!fb.is_read && (
            <button
              onClick={(e) => { e.stopPropagation(); onMarkRead(fb.id) }}
              style={{ background: 'transparent', border: `1px solid ${BORDER}`, color: TEXT_OFF, fontFamily: 'Space Mono, monospace', fontSize: '10px', letterSpacing: '2px', textTransform: 'uppercase', padding: '8px 16px', cursor: 'pointer', alignSelf: 'flex-start', transition: 'border-color 150ms, color 150ms' }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = ACCENT; e.currentTarget.style.color = ACCENT }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = BORDER; e.currentTarget.style.color = TEXT_OFF }}
            >
              Marquer comme lu ✓
            </button>
          )}
        </div>
      )}
    </div>
  )
}

export function AdminFeedbackPage() {
  const navigate  = useNavigate()
  const { user, loading: authLoading } = useAuthStore()

  const [feedbacks, setFeedbacks] = useState([])
  const [loading,   setLoading]   = useState(true)
  const [error,     setError]     = useState('')
  const [filter,    setFilter]    = useState('all')   // all | unread | bug | suggestion | other

  useEffect(() => {
    if (authLoading) return
    if (!user || user.username !== ADMIN_USERNAME) {
      navigate('/', { replace: true })
      return
    }
    api.get('/feedback')
      .then(setFeedbacks)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [user, authLoading, navigate])

  function handleMarkRead(id) {
    api.patch(`/feedback/${id}/read`)
      .then(() => setFeedbacks((prev) => prev.map((f) => f.id === id ? { ...f, is_read: true } : f)))
      .catch((err) => setError(err.message))
  }

  const unread = feedbacks.filter((f) => !f.is_read).length

  const displayed = feedbacks.filter((f) => {
    if (filter === 'unread') return !f.is_read
    if (filter === 'all')    return true
    return f.type === filter
  })

  if (authLoading || loading) {
    return (
      <div style={{ minHeight: 'calc(100vh - 52px)', marginTop: '52px', background: BG, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontFamily: 'Space Mono, monospace', fontSize: '10px', letterSpacing: '2px', color: TEXT_WEAK }}>Chargement...</div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: 'calc(100vh - 52px)', marginTop: '52px', background: BG, padding: '40px 48px' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '16px', marginBottom: '32px' }}>
        <h1 style={{ fontFamily: 'Space Mono, monospace', fontSize: '18px', fontWeight: 700, letterSpacing: '3px', textTransform: 'uppercase', color: TEXT, margin: 0 }}>
          Feedback
        </h1>
        {unread > 0 && (
          <div style={{ fontFamily: 'Space Mono, monospace', fontSize: '11px', fontWeight: 700, color: ACCENT, border: `1px solid ${ACCENT}`, padding: '2px 8px' }}>
            {unread} non lu{unread > 1 ? 's' : ''}
          </div>
        )}
        <div style={{ marginLeft: 'auto', fontFamily: 'Space Mono, monospace', fontSize: '10px', color: TEXT_OFF }}>
          {feedbacks.length} total
        </div>
      </div>

      {/* Filter bar */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
        {['all', 'unread', 'bug', 'suggestion', 'other'].map((f) => {
          const active = filter === f
          return (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                background: active ? SURFACE_E : 'transparent',
                border: `1px solid ${active ? TEXT_WEAK : BORDER}`,
                color: active ? TEXT : TEXT_OFF,
                fontFamily: 'Space Mono, monospace', fontSize: '10px',
                letterSpacing: '2px', textTransform: 'uppercase',
                padding: '6px 14px', cursor: 'pointer',
                transition: 'all 150ms',
              }}
            >
              {f === 'all' ? `Tout (${feedbacks.length})` : f === 'unread' ? `Non lus (${unread})` : f}
            </button>
          )
        })}
      </div>

      {error && (
        <div style={{ fontFamily: 'Space Mono, monospace', fontSize: '10px', color: HIGHLIGHT, marginBottom: '20px' }}>{error}</div>
      )}

      {/* List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {displayed.length === 0 ? (
          <div style={{ fontFamily: 'Georgia, serif', fontSize: '14px', color: TEXT_OFF, padding: '40px 0', textAlign: 'center' }}>
            Aucun feedback dans cette catégorie.
          </div>
        ) : (
          displayed.map((fb) => (
            <FeedbackCard key={fb.id} fb={fb} onMarkRead={handleMarkRead} />
          ))
        )}
      </div>
    </div>
  )
}

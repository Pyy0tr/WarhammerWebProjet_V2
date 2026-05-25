import { BG, SURFACE, BORDER, TEXT, TEXT_SEC, TEXT_WEAK, ACCENT, ACCENT_TEXT, ACCENT_LIGHT, TYPE, RADIUS, SHADOW_SM } from '../theme'

const DEPLOY_TIME = new Date().toISOString()

export function DeployTestPage() {
  return (
    <div style={{ minHeight: '100vh', background: BG, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px 16px' }}>
      <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: RADIUS, boxShadow: SHADOW_SM, maxWidth: '480px', width: '100%', padding: '36px 32px', display: 'flex', flexDirection: 'column', gap: '20px' }}>

        {/* Status badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: ACCENT, flexShrink: 0 }} />
          <span style={{ ...TYPE.label, color: ACCENT_TEXT }}>DEPLOY TEST</span>
        </div>

        {/* Title */}
        <div>
          <div style={{ ...TYPE.display, marginBottom: '8px' }}>Pipeline OK</div>
          <p style={{ ...TYPE.body, margin: 0 }}>
            La page a bien été buildée et déployée sur S3 / CloudFront depuis le nouveau PC.
          </p>
        </div>

        {/* Info grid */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', background: ACCENT_LIGHT, borderRadius: RADIUS, padding: '16px' }}>
          <Row label="URL API" value={import.meta.env.VITE_API_URL ?? '(non injectée)'} />
          <Row label="Build" value={typeof __BUILD_TIME__ !== 'undefined' ? __BUILD_TIME__ : DEPLOY_TIME} />
          <Row label="Mode" value={import.meta.env.MODE} />
        </div>

        {/* Back link */}
        <a href="/" style={{ ...TYPE.ui, color: ACCENT_TEXT, textDecoration: 'none', borderTop: `1px solid ${BORDER}`, paddingTop: '16px' }}>
          ← Retour à l'accueil
        </a>
      </div>
    </div>
  )
}

function Row({ label, value }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '12px' }}>
      <span style={{ ...TYPE.label, flexShrink: 0 }}>{label}</span>
      <span style={{ ...TYPE.ui, color: TEXT_SEC, wordBreak: 'break-all', textAlign: 'right' }}>{value}</span>
    </div>
  )
}

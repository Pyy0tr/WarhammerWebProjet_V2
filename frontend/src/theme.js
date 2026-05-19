// ── ProbHammer Design System — GitHub-warm / Olive ───────────────────────────
//
// Inspiré de GitHub : radius 6px, system font, hiérarchie claire.
// Accent : vert olive/sauge — chaleureux, lisible, distinctif.
//
// Règles :
//   • System font pour tout le texte UI et corps
//   • Space Mono UNIQUEMENT pour les valeurs numériques (stats, rolls)
//   • ACCENT (#5A7A45) pour fills/borders — texte lisible via ACCENT_TEXT (#3D6B2A)
//   • Radius 6px partout (boutons, cards, inputs, tags)
//   • Ombres légères sur cards : 0 1px 3px rgba(0,0,0,0.08)

// 1. Backgrounds
export const BG        = '#F7F9F5'   // blanc vert très léger
export const SURFACE   = '#FFFFFF'   // surface card
export const SURFACE_E = '#F0F4ED'   // hover / elevated
export const BORDER    = '#C0CABC'   // bordures douces

// 2. Typographie
export const TEXT      = '#141A12'   // quasi-noir (warm)
export const TEXT_SEC  = '#404A3D'   // secondaire
export const TEXT_WEAK = '#6B7A67'   // atténué
export const TEXT_OFF  = '#8FA88A'   // désactivé

// 3. Accent olive
export const ACCENT       = '#5A7A45'   // olive — fills, active borders, button bg
export const ACCENT_H     = '#4A6A37'   // hover sur olive
export const ACCENT_A     = '#3D6B2A'   // pressed
export const ACCENT_TEXT  = '#3D6B2A'   // texte olive sur fond clair (6.3:1 contraste)
export const ACCENT_LIGHT = '#EAF0E6'   // tint clair pour backgrounds / tags

// 4. États fonctionnels
export const SUCCESS   = '#2A7A4A'
export const WARNING   = '#B85C00'
export const ERROR     = '#C03050'
export const HIGHLIGHT = '#7A4A3F'

// ── Polices ───────────────────────────────────────────────────────────────────
export const FONT_UI   = "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
export const FONT_STAT = "'Space Mono', 'Courier New', monospace"  // stats/valeurs uniquement

// Aliases pour ne pas casser les imports existants
export const FONT_MONO  = FONT_STAT
export const FONT_SANS  = FONT_UI
export const FONT_SERIF = FONT_UI

// ── Constantes de layout ──────────────────────────────────────────────────────
export const RADIUS = '6px'
export const SHADOW_SM = '0 1px 4px rgba(0,0,0,0.10), 0 1px 2px rgba(0,0,0,0.06)'
export const SHADOW_MD = '0 4px 16px rgba(0,0,0,0.13), 0 2px 6px rgba(0,0,0,0.08)'

// ── Échelle typographique ─────────────────────────────────────────────────────
// Spread dans les inline styles : style={{ ...TYPE.heading }}
// Ne surcharger que la couleur.
export const TYPE = {
  // System font — texte UI et corps
  display:    { fontFamily: FONT_UI, fontSize: '22px', fontWeight: 600, lineHeight: 1.3,  color: TEXT },
  heading:    { fontFamily: FONT_UI, fontSize: '15px', fontWeight: 600, lineHeight: 1.4,  color: TEXT },
  subheading: { fontFamily: FONT_UI, fontSize: '13px', fontWeight: 600, lineHeight: 1.4,  color: TEXT_SEC },
  label:      { fontFamily: FONT_UI, fontSize: '11px', fontWeight: 500, lineHeight: 1.4,  color: TEXT_WEAK, textTransform: 'uppercase', letterSpacing: '0.4px' },
  ui:         { fontFamily: FONT_UI, fontSize: '13px', fontWeight: 500, lineHeight: 1.4,  color: TEXT_SEC },
  body:       { fontFamily: FONT_UI, fontSize: '14px', fontWeight: 400, lineHeight: 1.65, color: TEXT_SEC },
  note:       { fontFamily: FONT_UI, fontSize: '12px', fontWeight: 400, lineHeight: 1.5,  color: TEXT_WEAK, fontStyle: 'italic' },
  // Space Mono — uniquement pour les valeurs numériques
  statLg:     { fontFamily: FONT_STAT, fontSize: '22px', fontWeight: 700, lineHeight: 1, color: TEXT },
  statMd:     { fontFamily: FONT_STAT, fontSize: '16px', fontWeight: 700, lineHeight: 1, color: TEXT_SEC },
  statSm:     { fontFamily: FONT_STAT, fontSize: '12px', fontWeight: 700, lineHeight: 1, color: TEXT_WEAK },
}

// ── ProbHammer Design System — La Confrérie dark/gold ────────────────────────
//
// Palette empruntée au thème du site "La Confrérie" : fonds quasi-noirs par
// paliers, accent or/bronze discret, aucune ombre — le relief vient
// uniquement des paliers de gris (BG → SURFACE → SURFACE_E) et de bordures
// discrètes, jamais d'ombre portée.
//
// Règles :
//   • Inter pour tout le texte UI et corps
//   • Cinzel UNIQUEMENT pour les titres H1 / le logo (touche "héroïque")
//   • JetBrains Mono UNIQUEMENT pour les valeurs numériques (stats, rolls)
//   • ACCENT (#C9A96E) pour fills/borders — or/bronze désaturé
//   • Texte sur bouton rempli d'ACCENT : BG (contraste inversé, pas de blanc)
//   • Radius 6px partout (boutons, cards, inputs, tags)
//   • Pas d'ombres portées

// 1. Backgrounds
export const BG        = '#0F0F0F'   // fond de page
export const SURFACE   = '#161616'   // surface card
export const SURFACE_E = '#1E1E1E'   // hover / elevated
export const BORDER    = '#2A2A2A'   // bordures discrètes

// 2. Typographie
export const TEXT      = '#E8E6E0'   // blanc cassé chaud
export const TEXT_SEC  = '#ABA8A0'   // secondaire
export const TEXT_WEAK = '#88867F'   // atténué
export const TEXT_OFF  = '#555350'   // désactivé / très discret

// 3. Accent or/bronze
export const ACCENT       = '#C9A96E'   // or/bronze — fills, active borders, button bg
export const ACCENT_H     = '#D4B47A'   // hover (plus clair)
export const ACCENT_A     = '#B8945A'   // pressed (plus sombre)
export const ACCENT_TEXT  = '#D9BC8B'   // texte or, légèrement éclairci pour ressortir sur fond sombre
export const ACCENT_LIGHT = 'rgba(201,169,110,0.12)'   // tint pour backgrounds / tags

// 4. États fonctionnels
export const SUCCESS   = '#5A9E6F'
export const WARNING   = '#C47A3A'
export const ERROR     = '#C0564A'
export const HIGHLIGHT = '#A66A4A'

// ── Polices ───────────────────────────────────────────────────────────────────
export const FONT_UI      = "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
export const FONT_STAT    = "'JetBrains Mono', 'Courier New', monospace"   // stats/valeurs uniquement
export const FONT_DISPLAY = "'Cinzel', serif"                              // titres H1 / logo uniquement

// Aliases pour ne pas casser les imports existants
export const FONT_MONO  = FONT_STAT
export const FONT_SANS  = FONT_UI
export const FONT_SERIF = FONT_UI

// ── Constantes de layout ──────────────────────────────────────────────────────
export const RADIUS = '6px'
export const SHADOW_SM = 'none'
export const SHADOW_MD = 'none'

// ── Échelle typographique ─────────────────────────────────────────────────────
// Spread dans les inline styles : style={{ ...TYPE.heading }}
// Ne surcharger que la couleur.
export const TYPE = {
  // Inter — texte UI et corps
  display:    { fontFamily: FONT_UI, fontSize: '22px', fontWeight: 600, lineHeight: 1.3,  color: TEXT },
  heading:    { fontFamily: FONT_UI, fontSize: '15px', fontWeight: 600, lineHeight: 1.4,  color: TEXT },
  subheading: { fontFamily: FONT_UI, fontSize: '13px', fontWeight: 600, lineHeight: 1.4,  color: TEXT_SEC },
  label:      { fontFamily: FONT_UI, fontSize: '11px', fontWeight: 500, lineHeight: 1.4,  color: TEXT_WEAK, textTransform: 'uppercase', letterSpacing: '0.4px' },
  ui:         { fontFamily: FONT_UI, fontSize: '13px', fontWeight: 500, lineHeight: 1.4,  color: TEXT_SEC },
  body:       { fontFamily: FONT_UI, fontSize: '14px', fontWeight: 400, lineHeight: 1.65, color: TEXT_SEC },
  note:       { fontFamily: FONT_UI, fontSize: '12px', fontWeight: 400, lineHeight: 1.5,  color: TEXT_WEAK, fontStyle: 'italic' },
  // JetBrains Mono — uniquement pour les valeurs numériques
  statLg:     { fontFamily: FONT_STAT, fontSize: '22px', fontWeight: 700, lineHeight: 1, color: TEXT },
  statMd:     { fontFamily: FONT_STAT, fontSize: '16px', fontWeight: 700, lineHeight: 1, color: TEXT_SEC },
  statSm:     { fontFamily: FONT_STAT, fontSize: '12px', fontWeight: 700, lineHeight: 1, color: TEXT_WEAK },
}

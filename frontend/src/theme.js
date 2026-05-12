// ── ProbHammer Design System ─────────────────────────────────────────────────
// Single source of truth for all colors AND typography. Import from here, never hardcode.
//
// Typography rules (enforced site-wide):
//   • All uppercase Space Mono → letterSpacing: '2px'  (never 1px / 1.5px / 2.5px / 3px)
//   • Georgia                  → no letterSpacing ever
//   • STAT_* values            → no textTransform, no letterSpacing (pure numbers)
//   • Section labels           → always TYPE.label + TEXT_WEAK  (never ACCENT)
//   • Use TYPE.x spread:  style={{ ...TYPE.label, color: TEXT_OFF }}

// 1. Backgrounds (layered depth)
export const BG        = '#0A1621'
export const SURFACE   = '#0F2230'
export const SURFACE_E = '#143247'   // elevated: hover, focus, active cards
export const BORDER    = '#1E3A4C'

// 2. Typography
export const TEXT      = '#E6F1FF'   // primary — headings, values
export const TEXT_SEC  = '#9DB7C6'   // secondary — body, descriptions
export const TEXT_WEAK = '#6E8F9E'   // placeholders, labels, muted
export const TEXT_OFF  = '#3E5A68'   // disabled

// 3. Accent (interactions only)
export const ACCENT    = '#2FE0FF'
export const ACCENT_H  = '#6FF0FF'   // hover
export const ACCENT_A  = '#1FB8D6'   // active / pressed

// 4. Functional states
export const SUCCESS   = '#3DDC97'
export const WARNING   = '#FFB547'
export const ERROR     = '#FF5C7A'

// 5. Results highlight (warm contrast)
export const HIGHLIGHT = '#C28F85'

// ── Font families ─────────────────────────────────────────────────────────────
export const FONT_MONO  = "'Space Mono', 'Courier New', monospace"
export const FONT_SERIF = "Georgia, 'Times New Roman', serif"

// ── Type scale ────────────────────────────────────────────────────────────────
// 9 semantic roles — spread into inline style objects.
// Override color only; never override font, size, weight, or letterSpacing.
export const TYPE = {
  // Space Mono — UI chrome
  display: { fontFamily: FONT_MONO, fontSize: '20px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '2px', lineHeight: 1.2, color: TEXT },
  heading: { fontFamily: FONT_MONO, fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '2px', lineHeight: 1,   color: TEXT },
  label:   { fontFamily: FONT_MONO, fontSize: '10px', fontWeight: 400, textTransform: 'uppercase', letterSpacing: '2px', lineHeight: 1,   color: TEXT_WEAK },
  ui:      { fontFamily: FONT_MONO, fontSize: '11px', fontWeight: 400, textTransform: 'uppercase', letterSpacing: '2px', lineHeight: 1,   color: TEXT_SEC },
  // Georgia — reading text
  body:    { fontFamily: FONT_SERIF, fontSize: '14px', fontWeight: 400, lineHeight: 1.75, color: TEXT_SEC },
  note:    { fontFamily: FONT_SERIF, fontSize: '13px', fontWeight: 400, lineHeight: 1.65, fontStyle: 'italic', color: TEXT_WEAK },
  // Space Mono — numeric values (no case/spacing transform)
  statLg:  { fontFamily: FONT_MONO, fontSize: '22px', fontWeight: 700, lineHeight: 1, color: TEXT },
  statMd:  { fontFamily: FONT_MONO, fontSize: '16px', fontWeight: 700, lineHeight: 1, color: TEXT_SEC },
  statSm:  { fontFamily: FONT_MONO, fontSize: '12px', fontWeight: 700, lineHeight: 1, color: TEXT_WEAK },
}

// ── ProbHammer Design System — Light theme ────────────────────────────────────
// Single source of truth for all colors AND typography.
//
// Typography rules:
//   • Titles / labels / nav / stats → Space Mono (FONT_MONO), uppercase, ls 2px
//   • Body / descriptions / long text → Inter (FONT_SANS), no case transform
//   • STAT_* values → FONT_MONO, no textTransform, no letterSpacing
//   • Section labels → TYPE.label + TEXT_WEAK
//   • Use TYPE spread: style={{ ...TYPE.label, color: TEXT_OFF }}
//
// Color rules:
//   • ACCENT (#2FE0FF) is for fills and borders only — NOT for text on light bg
//   • For text that needs accent color → use TEXT (dark) or TEXT_SEC
//   • Solid buttons: background ACCENT + color TEXT (dark text on cyan bg)
//   • Ghost buttons: border BORDER, hover border ACCENT, color TEXT_SEC→TEXT

// 1. Backgrounds (light, layered depth)
export const BG        = '#F8FAFB'   // base page — near-white cool
export const SURFACE   = '#FFFFFF'   // cards, panels
export const SURFACE_E = '#EEF4F8'   // elevated: hover, focus
export const BORDER    = '#C8D8E4'   // borders — visible but soft

// 2. Typography
export const TEXT      = '#0F1B24'   // primary — headings, values
export const TEXT_SEC  = '#3B5668'   // secondary — body, descriptions
export const TEXT_WEAK = '#6B8FA3'   // muted — placeholders, labels
export const TEXT_OFF  = '#A0BDCC'   // disabled

// 3. Accent (fills and borders only — not for text)
export const ACCENT      = '#2FE0FF'   // cyan — fills, active borders
export const ACCENT_H    = '#6FF0FF'   // hover state
export const ACCENT_A    = '#1FB8D6'   // active / pressed
export const ACCENT_TEXT = '#0090A8'   // readable cyan for text labels (contrast 6.3:1 on BG)

// 4. Functional states (darker variants — readable on light bg)
export const SUCCESS   = '#0A7F55'   // dark green
export const WARNING   = '#B85C00'   // dark amber
export const ERROR     = '#C03050'   // dark red

// 5. Results highlight
export const HIGHLIGHT = '#7A4A3F'   // dark warm

// ── Font families ─────────────────────────────────────────────────────────────
export const FONT_MONO  = "'Space Mono', 'Courier New', monospace"
export const FONT_SANS  = "Inter, -apple-system, BlinkMacSystemFont, system-ui, sans-serif"
export const FONT_SERIF = FONT_SANS  // redirect legacy serif refs to sans

// ── Type scale ────────────────────────────────────────────────────────────────
export const TYPE = {
  // Space Mono — UI chrome (titles, labels, nav, tags)
  display: { fontFamily: FONT_MONO, fontSize: '20px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '2px', lineHeight: 1.2, color: TEXT },
  heading: { fontFamily: FONT_MONO, fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '2px', lineHeight: 1,   color: TEXT },
  label:   { fontFamily: FONT_MONO, fontSize: '10px', fontWeight: 400, textTransform: 'uppercase', letterSpacing: '2px', lineHeight: 1,   color: TEXT_WEAK },
  ui:      { fontFamily: FONT_MONO, fontSize: '11px', fontWeight: 400, textTransform: 'uppercase', letterSpacing: '2px', lineHeight: 1,   color: TEXT_SEC },
  // Inter — reading text (descriptions, rules, long text)
  body:    { fontFamily: FONT_SANS, fontSize: '14px', fontWeight: 400, lineHeight: 1.75, color: TEXT_SEC },
  note:    { fontFamily: FONT_SANS, fontSize: '13px', fontWeight: 400, lineHeight: 1.65, fontStyle: 'italic', color: TEXT_WEAK },
  // Space Mono — numeric values (no case/spacing transform)
  statLg:  { fontFamily: FONT_MONO, fontSize: '22px', fontWeight: 700, lineHeight: 1, color: TEXT },
  statMd:  { fontFamily: FONT_MONO, fontSize: '16px', fontWeight: 700, lineHeight: 1, color: TEXT_SEC },
  statSm:  { fontFamily: FONT_MONO, fontSize: '12px', fontWeight: 700, lineHeight: 1, color: TEXT_WEAK },
}

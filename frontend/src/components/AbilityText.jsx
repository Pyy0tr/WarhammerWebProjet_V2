import { ACCENT } from '../theme'

const HIGHLIGHT_STYLE = {
  color: ACCENT,
  fontWeight: 700,
  fontFamily: 'Space Mono, monospace',
  fontSize: '0.9em',
  letterSpacing: '0.02em',
}

// Normalise all BSData markup variants into a single token stream:
//   **^^word^^**  →  highlight
//   ^^word^^      →  highlight
//   **word**      →  highlight
// Works by first collapsing **^^...^^** into ^^...^^, then scanning for
// either ^^ or ** pairs in a single pass.
function parseAbilityText(text) {
  // Collapse **^^word^^** → ^^word^^ so a single scanner handles everything
  let src = text.replace(/\*\*\^\^([\s\S]*?)\^\^\*\*/g, '^^$1^^')

  const tokens = []
  let key = 0

  while (src.length > 0) {
    const ci = src.indexOf('^^')
    const bi = src.indexOf('**')

    // Find the nearest opening marker
    const next = (ci === -1 && bi === -1) ? -1
      : ci === -1 ? bi
      : bi === -1 ? ci
      : Math.min(ci, bi)

    if (next === -1) {
      tokens.push(<span key={key++}>{src}</span>)
      break
    }

    // Plain text before marker
    if (next > 0) {
      tokens.push(<span key={key++}>{src.slice(0, next)}</span>)
      src = src.slice(next)
    }

    const marker = src.startsWith('^^') ? '^^' : '**'
    const closeIdx = src.indexOf(marker, marker.length)

    if (closeIdx === -1) {
      // Unclosed marker — render as-is
      tokens.push(<span key={key++}>{src}</span>)
      break
    }

    const inner = src.slice(marker.length, closeIdx)
    tokens.push(
      <span key={key++} style={HIGHLIGHT_STYLE}>{inner}</span>
    )
    src = src.slice(closeIdx + marker.length)
  }

  return tokens
}

/**
 * Renders ability description text, highlighting BSData markup:
 *   ^^keyword^^, **keyword**, **^^keyword^^**  →  ACCENT + bold
 */
export function AbilityText({ text }) {
  if (!text) return null
  return <>{parseAbilityText(text)}</>
}

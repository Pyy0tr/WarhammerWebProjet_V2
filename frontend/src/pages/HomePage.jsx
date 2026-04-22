import { useNavigate } from 'react-router-dom'

const BLUE       = '#09A2C4'
const BG         = '#041428'
const TEXT_H     = '#FFFFFF'
const TEXT_BODY  = '#C8DCE8'
const TEXT_MUTED = 'rgba(184,210,228,0.5)'

function Separator({ opacity = 0.5 }) {
  return (
    <div style={{
      fontFamily: 'Space Mono, monospace', fontSize: '9px',
      letterSpacing: '3px', color: BLUE,
      overflow: 'hidden', whiteSpace: 'nowrap', lineHeight: 1,
      padding: '10px 0', userSelect: 'none', opacity,
    }}>
      {'≈ '.repeat(300)}
    </div>
  )
}

const LAYERS = [
  {
    label: 'ATTACK PHASE', sub: 'DICE POOL', num: '01',
    icon: (cx, cy) => (
      <g opacity="0.6">
        <circle cx={cx - 18} cy={cy - 6} r="3.5" fill={BLUE} />
        <circle cx={cx}      cy={cy}      r="3.5" fill={BLUE} />
        <circle cx={cx + 18} cy={cy + 6}  r="3.5" fill={BLUE} />
      </g>
    ),
  },
  {
    label: 'HIT ROLL', sub: 'BS / WS CHECK', num: '02',
    icon: (cx, cy) => (
      <g stroke={BLUE} strokeWidth="1.2" fill="none" opacity="0.6">
        <circle cx={cx} cy={cy} r="12" />
        <line x1={cx - 20} y1={cy} x2={cx - 14} y2={cy} />
        <line x1={cx + 14} y1={cy} x2={cx + 20} y2={cy} />
        <line x1={cx} y1={cy - 20} x2={cx} y2={cy - 14} />
        <line x1={cx} y1={cy + 14} x2={cx} y2={cy + 20} />
      </g>
    ),
  },
  {
    label: 'WOUND ROLL', sub: 'STRENGTH VS TOUGHNESS', num: '03',
    icon: (cx, cy) => (
      <path
        d={`M ${cx + 6},${cy - 16} L ${cx - 4},${cy - 2} L ${cx + 4},${cy - 2} L ${cx - 6},${cy + 16} L ${cx + 10},${cy + 2} L ${cx},${cy + 2} Z`}
        fill={BLUE} opacity="0.5" stroke={BLUE} strokeWidth="0.5"
      />
    ),
  },
  {
    label: 'SAVING THROW', sub: 'ARMOUR / INVULNERABLE', num: '04',
    icon: (cx, cy) => (
      <path
        d={`M ${cx},${cy - 16} L ${cx + 14},${cy - 8} L ${cx + 14},${cy + 4} L ${cx},${cy + 16} L ${cx - 14},${cy + 4} L ${cx - 14},${cy - 8} Z`}
        fill={BLUE} opacity="0.25" stroke={BLUE} strokeWidth="1"
      />
    ),
  },
  {
    label: 'DAMAGE', sub: 'FNP — FINAL OUTPUT', num: '05',
    icon: (cx, cy) => (
      <g stroke={BLUE} strokeWidth="1.5" opacity="0.6">
        <line x1={cx} y1={cy - 18} x2={cx} y2={cy + 18} />
        <line x1={cx - 16} y1={cy - 9} x2={cx + 16} y2={cy + 9} />
        <line x1={cx + 16} y1={cy - 9} x2={cx - 16} y2={cy + 9} />
      </g>
    ),
  },
]

function CombatDiagram() {
  const cx = 200, hw = 90, hh = 45, sh = 11, spacing = 96, cy1 = 72
  const cys = LAYERS.map((_, i) => cy1 + i * spacing)
  const annX1 = cx + hw, annX2 = annX1 + 60, txtX = annX2 + 8
  const svgH = cy1 + (LAYERS.length - 1) * spacing + hh + sh + 36

  return (
    <svg viewBox={`0 0 620 ${svgH}`} style={{ width: '100%', height: 'auto', display: 'block', opacity: 0.9 }}>
      {cys.slice(0, -1).map((cy, i) => (
        <g key={`conn-${i}`}>
          <line x1={cx + hw} y1={cy + sh} x2={cx + hw} y2={cys[i + 1]} stroke={BLUE} strokeWidth="0.8" strokeDasharray="4 4" opacity="0.35" />
          <line x1={cx - hw} y1={cy + sh} x2={cx - hw} y2={cys[i + 1]} stroke={BLUE} strokeWidth="0.8" strokeDasharray="4 4" opacity="0.35" />
        </g>
      ))}
      {cys.map((cy, i) => {
        const { label, sub, num, icon } = LAYERS[i]
        const pts = { top: `${cx - hw},${cy} ${cx},${cy - hh} ${cx + hw},${cy} ${cx},${cy + hh}`, right: `${cx + hw},${cy} ${cx},${cy + hh} ${cx},${cy + hh + sh} ${cx + hw},${cy + sh}`, left: `${cx - hw},${cy} ${cx},${cy + hh} ${cx},${cy + hh + sh} ${cx - hw},${cy + sh}` }
        return (
          <g key={`layer-${i}`}>
            <polygon points={pts.left}  fill="rgba(9,162,196,0.04)" stroke={BLUE} strokeWidth="0.8" />
            <polygon points={pts.right} fill="rgba(9,162,196,0.07)" stroke={BLUE} strokeWidth="0.8" />
            <polygon points={pts.top}   fill="rgba(9,162,196,0.11)" stroke={BLUE} strokeWidth="1" />
            {icon(cx, cy)}
            <line x1={annX1} y1={cy} x2={annX2} y2={cy} stroke={BLUE} strokeWidth="0.8" />
            <polygon points={`${annX2 - 1},${cy - 3} ${annX2 + 5},${cy} ${annX2 - 1},${cy + 3}`} fill={BLUE} />
            <text x={txtX} y={cy - 5} fontFamily="Space Mono, monospace" fontSize="10" fontWeight="700" fill={TEXT_H} letterSpacing="1.5">{label}</text>
            <text x={txtX} y={cy + 8} fontFamily="Space Mono, monospace" fontSize="8" fill={TEXT_MUTED} letterSpacing="1">{sub}</text>
            <text x={cx + hw + 7} y={cy + sh - 2} fontFamily="Space Mono, monospace" fontSize="7" fill={BLUE} opacity="0.5">{num}</text>
          </g>
        )
      })}
    </svg>
  )
}

function StepCard({ num, title, desc }) {
  return (
    <div style={{ flex: 1, borderTop: `2px solid rgba(9,162,196,0.25)`, paddingTop: '24px' }}>
      <div style={{
        fontFamily: 'Space Mono, monospace', fontSize: '10px',
        letterSpacing: '2px', textTransform: 'uppercase',
        color: BLUE, marginBottom: '12px',
      }}>
        {num}
      </div>
      <div style={{
        fontFamily: 'Space Mono, monospace', fontSize: '13px',
        fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase',
        color: TEXT_H, marginBottom: '12px',
      }}>
        {title}
      </div>
      <p style={{
        fontFamily: 'Georgia, serif', fontSize: '15px',
        lineHeight: 1.75, color: TEXT_BODY, margin: 0,
      }}>
        {desc}
      </p>
    </div>
  )
}

export function HomePage() {
  const navigate = useNavigate()

  return (
    <div style={{ color: TEXT_BODY, paddingTop: '52px' }}>

      {/* ── HERO ────────────────────────────────────────────────────────────── */}
      <section style={{
        minHeight: 'calc(100vh - 52px)',
        display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0',
      }}>
        {/* Left */}
        <div style={{
          padding: '60px 56px',
          display: 'flex', flexDirection: 'column', justifyContent: 'center',
          borderRight: '1px solid rgba(9,162,196,0.1)',
        }}>
          <Separator opacity={0.4} />

          <div style={{ padding: '40px 0 36px' }}>
            <div style={{
              fontFamily: 'Space Mono, monospace', fontSize: '10px',
              letterSpacing: '3px', textTransform: 'uppercase',
              color: TEXT_MUTED, marginBottom: '24px',
            }}>
              Warhammer 40,000 — 10th Edition
            </div>

            <h1 style={{
              fontFamily: 'Space Mono, monospace',
              fontSize: 'clamp(28px, 3.5vw, 52px)',
              fontWeight: 700, letterSpacing: '0.04em',
              textTransform: 'uppercase', lineHeight: 1.08,
              color: TEXT_H, marginBottom: '28px',
            }}>
              Prob<span style={{ color: BLUE, opacity: 0.6 }}>'</span>Hammer
            </h1>

            <p style={{
              fontFamily: 'Georgia, serif',
              fontSize: 'clamp(15px, 1.4vw, 18px)',
              lineHeight: 1.75, maxWidth: '420px',
              color: TEXT_BODY, marginBottom: '36px',
            }}>
              Calculate your attack probabilities before you roll.
              Pick a unit, configure the attack, and get
              the full damage distribution in under a second.
            </p>

            <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
              <button
                onClick={() => navigate('/simulator')}
                style={{
                  border: `1px solid ${BLUE}`, background: BLUE, color: BG,
                  fontFamily: 'Space Mono, monospace', fontSize: '12px', fontWeight: 700,
                  letterSpacing: '3px', textTransform: 'uppercase',
                  padding: '15px 32px', borderRadius: 0, cursor: 'pointer',
                  transition: 'opacity 100ms',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.85' }}
                onMouseLeave={(e) => { e.currentTarget.style.opacity = '1' }}
              >
                Open simulator →
              </button>
              <span style={{
                fontFamily: 'Space Mono, monospace', fontSize: '10px',
                letterSpacing: '1.5px', color: TEXT_MUTED, textTransform: 'uppercase',
              }}>
                No account required
              </span>
            </div>
          </div>

          <Separator opacity={0.4} />

          {/* Counters */}
          <div style={{ display: 'flex', gap: '32px', paddingTop: '20px', flexWrap: 'wrap' }}>
            {[['1 487', 'units'], ['3 531', 'weapons'], ['46', 'factions'], ['16', 'keywords']].map(([n, l]) => (
              <div key={l}>
                <div style={{
                  fontFamily: 'Space Mono, monospace', fontSize: '18px',
                  fontWeight: 700, lineHeight: 1, color: TEXT_H,
                }}>
                  {n}
                </div>
                <div style={{
                  fontFamily: 'Space Mono, monospace', fontSize: '9px',
                  letterSpacing: '1.5px', textTransform: 'uppercase',
                  color: TEXT_MUTED, marginTop: '5px',
                }}>
                  {l}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right — diagram */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '60px 40px',
        }}>
          <CombatDiagram />
        </div>
      </section>

      {/* ── HOW IT WORKS ────────────────────────────────────────────────────── */}
      <section style={{ padding: '64px 56px 72px', borderTop: '1px solid rgba(9,162,196,0.1)' }}>
        <div style={{
          fontFamily: 'Space Mono, monospace', fontSize: '10px',
          letterSpacing: '3px', textTransform: 'uppercase',
          color: TEXT_MUTED, marginBottom: '44px',
        }}>
          How it works
        </div>

        <div style={{ display: 'flex', gap: '48px', flexWrap: 'wrap' }}>
          <StepCard
            num="01 — Select"
            title="Pick your units"
            desc="Browse 1,487 units by faction or search directly. Select an attacking unit with its weapon, then a defender — stats fill in automatically."
          />
          <StepCard
            num="02 — Configure"
            title="Set the context"
            desc="Toggle relevant keywords (Lethal Hits, Devastating Wounds, ANTI, Melta…), specify if the attacker is within half range, in cover, or just charged."
          />
          <StepCard
            num="03 — Analyse"
            title="Read the distribution"
            desc="The engine runs up to 10,000 Monte Carlo simulations in the browser and displays the damage histogram, mean, median, and P10–P90 percentiles."
          />
        </div>
      </section>

      {/* ── FOOTER ──────────────────────────────────────────────────────────── */}
      <div style={{
        borderTop: '1px solid rgba(9,162,196,0.1)',
        padding: '20px 56px',
        display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px',
        fontFamily: 'Space Mono, monospace', fontSize: '9px',
        letterSpacing: '2px', textTransform: 'uppercase', color: TEXT_MUTED,
      }}>
        <span>Prob'Hammer — V2</span>
        <span>Data by BSData Community</span>
        <span>Warhammer 40,000 © Games Workshop</span>
      </div>
    </div>
  )
}

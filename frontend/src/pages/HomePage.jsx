import { useNavigate } from 'react-router-dom'

const BLUE  = '#09A2C4'
const BG    = '#041428'

// ── Separator ─────────────────────────────────────────────────────────────────

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

// ── Combat sequence diagram (isometric) ───────────────────────────────────────

const LAYERS = [
  {
    label: 'ATTACK PHASE', sub: 'DICE POOL', num: '01',
    icon: (cx, cy) => (
      <g opacity="0.5">
        <circle cx={cx - 18} cy={cy - 6} r="3.5" fill={BLUE} />
        <circle cx={cx}      cy={cy}      r="3.5" fill={BLUE} />
        <circle cx={cx + 18} cy={cy + 6}  r="3.5" fill={BLUE} />
      </g>
    ),
  },
  {
    label: 'HIT ROLL', sub: 'BS / WS CHECK', num: '02',
    icon: (cx, cy) => (
      <g stroke={BLUE} strokeWidth="1.2" fill="none" opacity="0.5">
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
        fill={BLUE} opacity="0.4" stroke={BLUE} strokeWidth="0.5"
      />
    ),
  },
  {
    label: 'SAVING THROW', sub: 'ARMOUR / INVULNERABLE', num: '04',
    icon: (cx, cy) => (
      <path
        d={`M ${cx},${cy - 16} L ${cx + 14},${cy - 8} L ${cx + 14},${cy + 4} L ${cx},${cy + 16} L ${cx - 14},${cy + 4} L ${cx - 14},${cy - 8} Z`}
        fill={BLUE} opacity="0.2" stroke={BLUE} strokeWidth="1"
      />
    ),
  },
  {
    label: 'DAMAGE', sub: 'FNP — FINAL OUTPUT', num: '05',
    icon: (cx, cy) => (
      <g stroke={BLUE} strokeWidth="1.5" opacity="0.5">
        <line x1={cx} y1={cy - 18} x2={cx} y2={cy + 18} />
        <line x1={cx - 16} y1={cy - 9} x2={cx + 16} y2={cy + 9} />
        <line x1={cx + 16} y1={cy - 9} x2={cx - 16} y2={cy + 9} />
      </g>
    ),
  },
]

function CombatDiagram() {
  const cx = 200
  const hw = 90
  const hh = 45
  const sh = 11
  const spacing = 96
  const cy1 = 72
  const cys = LAYERS.map((_, i) => cy1 + i * spacing)

  function topPts(cy)   { return `${cx - hw},${cy} ${cx},${cy - hh} ${cx + hw},${cy} ${cx},${cy + hh}` }
  function rightPts(cy) { return `${cx + hw},${cy} ${cx},${cy + hh} ${cx},${cy + hh + sh} ${cx + hw},${cy + sh}` }
  function leftPts(cy)  { return `${cx - hw},${cy} ${cx},${cy + hh} ${cx},${cy + hh + sh} ${cx - hw},${cy + sh}` }

  const annX1 = cx + hw
  const annX2 = annX1 + 60
  const txtX  = annX2 + 8
  const svgH  = cy1 + (LAYERS.length - 1) * spacing + hh + sh + 36

  return (
    <svg
      viewBox={`0 0 620 ${svgH}`}
      style={{ width: '100%', height: 'auto', display: 'block', opacity: 0.9 }}
      aria-label="WH40K combat sequence"
    >
      {cys.slice(0, -1).map((cy, i) => (
        <g key={`conn-${i}`}>
          <line x1={cx + hw} y1={cy + sh} x2={cx + hw} y2={cys[i + 1]}
            stroke={BLUE} strokeWidth="0.8" strokeDasharray="4 4" opacity="0.35" />
          <line x1={cx - hw} y1={cy + sh} x2={cx - hw} y2={cys[i + 1]}
            stroke={BLUE} strokeWidth="0.8" strokeDasharray="4 4" opacity="0.35" />
        </g>
      ))}
      {cys.map((cy, i) => {
        const { label, sub, num, icon } = LAYERS[i]
        return (
          <g key={`layer-${i}`}>
            <polygon points={leftPts(cy)}  fill="rgba(9,162,196,0.04)" stroke={BLUE} strokeWidth="0.8" />
            <polygon points={rightPts(cy)} fill="rgba(9,162,196,0.07)" stroke={BLUE} strokeWidth="0.8" />
            <polygon points={topPts(cy)}   fill="rgba(9,162,196,0.11)" stroke={BLUE} strokeWidth="1" />
            {icon(cx, cy)}
            <line x1={annX1} y1={cy} x2={annX2} y2={cy} stroke={BLUE} strokeWidth="0.8" />
            <polygon points={`${annX2 - 1},${cy - 3} ${annX2 + 5},${cy} ${annX2 - 1},${cy + 3}`} fill={BLUE} />
            <text x={txtX} y={cy - 5} fontFamily="Space Mono, monospace" fontSize="9" fontWeight="700" fill={BLUE} letterSpacing="1.5">{label}</text>
            <text x={txtX} y={cy + 7} fontFamily="Space Mono, monospace" fontSize="7" fill={BLUE} letterSpacing="1" opacity="0.5">{sub}</text>
            <text x={cx + hw + 7} y={cy + sh - 2} fontFamily="Space Mono, monospace" fontSize="6.5" fill={BLUE} opacity="0.35">{num}</text>
          </g>
        )
      })}
    </svg>
  )
}

// ── Step card (how it works) ───────────────────────────────────────────────────

function StepCard({ num, title, desc }) {
  return (
    <div style={{
      flex: 1,
      borderTop: `1px solid rgba(9,162,196,0.2)`,
      paddingTop: '20px',
    }}>
      <div style={{
        fontFamily: 'Space Mono, monospace', fontSize: '8px',
        letterSpacing: '2px', textTransform: 'uppercase', opacity: 0.35,
        marginBottom: '10px',
      }}>
        {num}
      </div>
      <div style={{
        fontFamily: 'Space Mono, monospace', fontSize: '11px',
        fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase',
        marginBottom: '10px',
      }}>
        {title}
      </div>
      <p style={{
        fontFamily: 'Georgia, serif', fontSize: '14px',
        lineHeight: 1.7, opacity: 0.7,
      }}>
        {desc}
      </p>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export function HomePage() {
  const navigate = useNavigate()

  return (
    <div style={{ color: BLUE, paddingTop: '52px' }}>

      {/* ── HERO ────────────────────────────────────────────────────────────── */}
      <section style={{
        minHeight: 'calc(100vh - 52px)',
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '0',
      }}>

        {/* Left — text */}
        <div style={{
          padding: '60px 56px 60px 56px',
          display: 'flex', flexDirection: 'column', justifyContent: 'center',
          borderRight: '1px solid rgba(9,162,196,0.1)',
        }}>
          <Separator opacity={0.4} />

          <div style={{ padding: '40px 0 36px' }}>
            {/* Eyebrow */}
            <div style={{
              fontFamily: 'Space Mono, monospace', fontSize: '8px',
              letterSpacing: '3px', textTransform: 'uppercase',
              opacity: 0.4, marginBottom: '24px',
            }}>
              Warhammer 40,000 — 10th Edition
            </div>

            {/* Title */}
            <h1 style={{
              fontFamily: 'Space Mono, monospace',
              fontSize: 'clamp(28px, 3.5vw, 52px)',
              fontWeight: 700,
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
              lineHeight: 1.08,
              marginBottom: '28px',
            }}>
              Prob<span style={{ opacity: 0.4 }}>'</span>Hammer
            </h1>

            {/* Pitch */}
            <p style={{
              fontFamily: 'Georgia, serif',
              fontSize: 'clamp(14px, 1.4vw, 17px)',
              lineHeight: 1.75,
              maxWidth: '420px',
              opacity: 0.8,
              marginBottom: '36px',
            }}>
              Calculez les probabilités de vos attaques avant de jouer vos dés.
              Sélectionnez une unité, configurez l'attaque, et obtenez
              la distribution complète des dégâts en moins d'une seconde.
            </p>

            {/* CTA */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
              <button
                onClick={() => navigate('/simulator')}
                style={{
                  border: `1px solid ${BLUE}`,
                  background: BLUE, color: BG,
                  fontFamily: 'Space Mono, monospace',
                  fontSize: '11px', fontWeight: 700,
                  letterSpacing: '3px', textTransform: 'uppercase',
                  padding: '15px 32px', borderRadius: 0,
                  cursor: 'pointer',
                  transition: 'opacity 100ms',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.85' }}
                onMouseLeave={(e) => { e.currentTarget.style.opacity = '1' }}
              >
                Open simulator →
              </button>

              <span style={{
                fontFamily: 'Space Mono, monospace', fontSize: '8.5px',
                letterSpacing: '1.5px', opacity: 0.35, textTransform: 'uppercase',
              }}>
                No account required
              </span>
            </div>
          </div>

          <Separator opacity={0.4} />

          {/* Data line */}
          <div style={{
            display: 'flex', gap: '24px', paddingTop: '16px', flexWrap: 'wrap',
          }}>
            {[
              ['1 487', 'units'],
              ['3 531', 'weapons'],
              ['46', 'factions'],
              ['16', 'keywords'],
            ].map(([n, l]) => (
              <div key={l}>
                <div style={{
                  fontFamily: 'Space Mono, monospace', fontSize: '14px',
                  fontWeight: 700, lineHeight: 1,
                }}>
                  {n}
                </div>
                <div style={{
                  fontFamily: 'Space Mono, monospace', fontSize: '7.5px',
                  letterSpacing: '1.5px', textTransform: 'uppercase',
                  opacity: 0.35, marginTop: '4px',
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
          opacity: 0.85,
        }}>
          <CombatDiagram />
        </div>
      </section>

      {/* ── HOW IT WORKS ────────────────────────────────────────────────────── */}
      <section style={{ padding: '64px 56px 72px', borderTop: '1px solid rgba(9,162,196,0.1)' }}>
        <div style={{
          fontFamily: 'Space Mono, monospace', fontSize: '8px',
          letterSpacing: '3px', textTransform: 'uppercase',
          opacity: 0.35, marginBottom: '40px',
        }}>
          Comment ça fonctionne
        </div>

        <div style={{ display: 'flex', gap: '48px', flexWrap: 'wrap' }}>
          <StepCard
            num="01 — Sélectionner"
            title="Choisir les unités"
            desc="Parcourez 1 487 unités par faction ou recherchez directement. Sélectionnez une unité attaquante avec son arme, puis une unité défenseur — les statistiques se remplissent automatiquement."
          />
          <StepCard
            num="02 — Configurer"
            title="Ajuster le contexte"
            desc="Activez les keywords pertinents (Lethal Hits, Devastating Wounds, ANTI, Melta…), précisez si l'attaquant est à demi-portée, en cover, ou s'il vient de charger."
          />
          <StepCard
            num="03 — Analyser"
            title="Lire la distribution"
            desc="Le moteur exécute jusqu'à 10 000 simulations Monte Carlo dans le navigateur et affiche l'histogramme des dégâts, la moyenne, la médiane et les percentiles P10–P90."
          />
        </div>
      </section>

      {/* ── FOOTER ──────────────────────────────────────────────────────────── */}
      <div style={{
        borderTop: '1px solid rgba(9,162,196,0.1)',
        padding: '20px 56px',
        display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px',
        fontFamily: 'Space Mono, monospace', fontSize: '8px',
        letterSpacing: '2px', textTransform: 'uppercase', opacity: 0.3,
      }}>
        <span>Prob'Hammer — V2</span>
        <span>Données BSData Community</span>
        <span>Warhammer 40,000 © Games Workshop</span>
      </div>
    </div>
  )
}

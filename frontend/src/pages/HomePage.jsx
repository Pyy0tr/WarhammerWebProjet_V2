import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ACCENT, BG, BORDER, SURFACE, SURFACE_E, TEXT, TEXT_SEC, TEXT_WEAK, TEXT_OFF } from '../theme'

function Separator({ opacity = 0.5 }) {
  return (
    <div style={{
      fontFamily: 'Space Mono, monospace', fontSize: '9px',
      letterSpacing: '3px', color: ACCENT,
      overflow: 'hidden', whiteSpace: 'nowrap', lineHeight: 1,
      padding: '10px 0', userSelect: 'none', opacity,
    }}>
      {'≈ '.repeat(300)}
    </div>
  )
}

const ACTIONS = [
  {
    num: '01', label: 'Explore Units',
    desc: 'Browse 1,487 units across 46 factions. View datasheets, weapons, and stats.',
    route: '/factions',
  },
  {
    num: '02', label: 'Create Army',
    desc: 'Build and save named army lists. Simulate straight from your roster.',
    route: '/armies',
  },
  {
    num: '03', label: 'Guides',
    desc: 'Walk through the 5 attack phases and discover how keywords stack.',
    route: '/learn',
  },
  {
    num: '04', label: 'Keywords',
    desc: 'Deep dive into every weapon keyword — rules, simulator notes, and when to use each one.',
    route: '/keywords',
  },
]

function ActionPanel() {
  const navigate = useNavigate()
  return (
    <div style={{
      flex: 1, minWidth: 0,
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gridTemplateRows: '1fr 1fr',
      alignContent: 'stretch',
    }}>
      {ACTIONS.map((a) => <ActionCard key={a.num} action={a} navigate={navigate} />)}
    </div>
  )
}

function ActionCard({ action, navigate }) {
  const [hov, setHov] = useState(false)
  return (
    <div
      onClick={() => navigate(action.route)}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background: hov ? 'rgba(47,224,255,0.05)' : SURFACE,
        borderRight: `1px solid ${BORDER}`,
        borderBottom: `1px solid ${BORDER}`,
        borderTop: `2px solid ${hov ? ACCENT : 'transparent'}`,
        padding: '28px 28px 24px',
        cursor: 'pointer',
        transition: 'background 180ms, border-top-color 180ms',
        display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
        position: 'relative', overflow: 'hidden',
      }}
    >
      {/* subtle glow on hover */}
      {hov && (
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: '60px',
          background: 'linear-gradient(to bottom, rgba(47,224,255,0.07), transparent)',
          pointerEvents: 'none',
        }} />
      )}

      <div>
        <div style={{
          fontFamily: 'Space Mono, monospace', fontSize: '10px',
          letterSpacing: '3px', textTransform: 'uppercase',
          color: hov ? ACCENT : TEXT_OFF,
          transition: 'color 180ms', marginBottom: '14px',
        }}>
          {action.num}
        </div>
        <div style={{
          fontFamily: 'Space Mono, monospace', fontSize: '14px',
          fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase',
          color: hov ? ACCENT : TEXT,
          transition: 'color 180ms', marginBottom: '10px',
        }}>
          {action.label}
        </div>
        <p style={{
          fontFamily: 'Georgia, serif', fontSize: '13px',
          lineHeight: 1.7, color: TEXT_SEC,
          margin: 0,
        }}>
          {action.desc}
        </p>
      </div>

      <div style={{
        display: 'flex', justifyContent: 'flex-end', marginTop: '20px',
      }}>
        <span style={{
          fontFamily: 'Space Mono, monospace', fontSize: '11px',
          letterSpacing: '2px', textTransform: 'uppercase',
          color: hov ? ACCENT : TEXT_WEAK,
          transition: 'color 180ms',
        }}>
          {hov ? 'Open →' : '→'}
        </span>
      </div>
    </div>
  )
}

function StepCard({ num, title, desc }) {
  return (
    <div style={{ flex: 1, borderTop: `2px solid ${BORDER}`, paddingTop: '24px' }}>
      <div style={{
        fontFamily: 'Space Mono, monospace', fontSize: '10px',
        letterSpacing: '2px', textTransform: 'uppercase',
        color: ACCENT, marginBottom: '12px',
      }}>
        {num}
      </div>
      <div style={{
        fontFamily: 'Space Mono, monospace', fontSize: '13px',
        fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase',
        color: TEXT, marginBottom: '12px',
      }}>
        {title}
      </div>
      <p style={{
        fontFamily: 'Georgia, serif', fontSize: '15px',
        lineHeight: 1.75, color: TEXT_SEC, margin: 0,
      }}>
        {desc}
      </p>
    </div>
  )
}

const GUIDES = [
  {
    num: '01',
    title: 'Combat Basics',
    desc: 'Walk through the 5 attack phases — Attacks, Hit, Wound, Save, Damage — with a concrete step-by-step example.',
    duration: '~5 min',
    route: '/learn',
  },
  {
    num: '02',
    title: 'Power of Synergies',
    desc: 'See how keywords stack to multiply damage output. Live example with Sword Brethren and the Maleceptor.',
    duration: '~2 min',
    route: '/onboarding',
  },
  {
    num: '03',
    title: 'Explore Keywords',
    desc: 'Lethal Hits, Devastating Wounds, ANTI, Sustained Hits… An interactive guide for every keyword in the simulator.',
    duration: 'Coming soon',
    route: null,
  },
]

function GuideCard({ guide }) {
  const navigate = useNavigate()
  const [hovered, setHovered] = useState(false)
  const active = hovered && guide.route
  const soon = !guide.route

  return (
    <div
      onClick={() => guide.route && navigate(guide.route)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        flex: 1, minWidth: '220px',
        border: `1px solid ${active ? ACCENT : TEXT_WEAK}`,
        background: active ? 'rgba(47,224,255,0.04)' : SURFACE,
        padding: '32px 28px',
        cursor: guide.route ? 'pointer' : 'default',
        transition: 'border-color 120ms, background 120ms',
        display: 'flex', flexDirection: 'column', gap: '14px',
        opacity: soon ? 0.5 : 1,
      }}
    >
      <div style={{
        fontFamily: 'Space Mono, monospace', fontSize: '9px',
        letterSpacing: '3px', textTransform: 'uppercase',
        color: active ? ACCENT : TEXT_OFF,
        transition: 'color 120ms',
      }}>
        {guide.num}
      </div>

      <div style={{
        fontFamily: 'Space Mono, monospace', fontSize: '14px',
        fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase',
        color: active ? ACCENT : TEXT,
        transition: 'color 120ms',
      }}>
        {guide.title}
      </div>

      <p style={{
        fontFamily: 'Georgia, serif', fontSize: '14px',
        lineHeight: 1.7, color: TEXT_SEC,
        margin: 0, flexGrow: 1,
      }}>
        {guide.desc}
      </p>

      <div style={{
        fontFamily: 'Space Mono, monospace', fontSize: '9px',
        letterSpacing: '2px', textTransform: 'uppercase',
        color: soon ? TEXT_OFF : TEXT_WEAK,
      }}>
        {guide.duration}
      </div>
    </div>
  )
}

export function HomePage() {
  const navigate = useNavigate()

  useEffect(() => {
    document.title = "Prob'Hammer — Warhammer 40K Probability & Dice Calculator"
  }, [])

  return (
    <div style={{ color: TEXT_SEC, paddingTop: '52px' }}>

      <section style={{
        height: 'calc(100vh - 52px)',
        display: 'flex',
      }}>
        {/* Left */}
        <div style={{
          flex: 1, minWidth: 0,
          padding: '0 56px',
          display: 'flex', flexDirection: 'column', justifyContent: 'center',
          borderRight: `1px solid ${BORDER}`,
          gap: '0',
        }}>

          {/* Eyebrow badge */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '8px',
            border: `1px solid rgba(47,224,255,0.22)`,
            background: 'rgba(47,224,255,0.04)',
            padding: '5px 12px 5px 8px',
            marginBottom: '28px', width: 'fit-content',
          }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: ACCENT, opacity: 0.85 }} />
            <span style={{
              fontFamily: 'Space Mono, monospace', fontSize: '9px',
              letterSpacing: '2px', textTransform: 'uppercase', color: ACCENT,
            }}>
              Warhammer 40,000 · 10th Edition
            </span>
          </div>

          {/* Headline */}
          <h1 style={{
            fontFamily: 'Space Mono, monospace',
            fontSize: 'clamp(36px, 4vw, 64px)',
            fontWeight: 700, letterSpacing: '0.02em',
            textTransform: 'uppercase', lineHeight: 1,
            color: TEXT, margin: 0,
          }}>
            Prob<span style={{ color: ACCENT }}>'</span>Hammer
          </h1>

          {/* Accent underline */}
          <div style={{ width: '48px', height: '2px', background: ACCENT, margin: '18px 0 24px', opacity: 0.7 }} />

          {/* Description */}
          <p style={{
            fontFamily: 'Georgia, serif',
            fontSize: 'clamp(15px, 1.3vw, 17px)',
            lineHeight: 1.8, maxWidth: '380px',
            color: TEXT_SEC, margin: '0 0 36px',
          }}>
            Calculate your attack probabilities before you roll — full damage distribution in under a second.
          </p>

          {/* CTAs */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap', marginBottom: '48px' }}>
            <button
              onClick={() => navigate('/simulator')}
              style={{
                border: `1px solid ${ACCENT}`, background: ACCENT, color: BG,
                fontFamily: 'Space Mono, monospace', fontSize: '11px', fontWeight: 700,
                letterSpacing: '2.5px', textTransform: 'uppercase',
                padding: '14px 28px', borderRadius: 0, cursor: 'pointer',
                transition: 'opacity 120ms',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.85' }}
              onMouseLeave={(e) => { e.currentTarget.style.opacity = '1' }}
            >
              Open simulator →
            </button>
          </div>

          {/* Divider */}
          <div style={{ height: '1px', background: BORDER, marginBottom: '28px', maxWidth: '400px' }} />

          {/* Stats */}
          <div style={{ display: 'flex', gap: '36px', flexWrap: 'wrap' }}>
            {[['1 487', 'Units'], ['3 531', 'Weapons'], ['46', 'Factions'], ['16', 'Keywords']].map(([n, l]) => (
              <div key={l}>
                <div style={{
                  fontFamily: 'Space Mono, monospace', fontSize: '22px',
                  fontWeight: 700, lineHeight: 1, color: ACCENT,
                  letterSpacing: '-0.02em',
                }}>
                  {n}
                </div>
                <div style={{
                  fontFamily: 'Space Mono, monospace', fontSize: '9px',
                  letterSpacing: '1.5px', textTransform: 'uppercase',
                  color: TEXT_WEAK, marginTop: '6px',
                }}>
                  {l}
                </div>
              </div>
            ))}
          </div>

        </div>

        {/* Right — action panel */}
        <ActionPanel />
      </section>

      <section style={{ padding: '64px 56px 72px', borderTop: `1px solid ${BORDER}` }}>
        <div style={{
          fontFamily: 'Space Mono, monospace', fontSize: '10px',
          letterSpacing: '3px', textTransform: 'uppercase',
          color: TEXT_WEAK, marginBottom: '44px',
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

      <section style={{ padding: '64px 56px 72px', borderTop: `1px solid ${BORDER}` }}>
        <div style={{
          fontFamily: 'Space Mono, monospace', fontSize: '10px',
          letterSpacing: '3px', textTransform: 'uppercase',
          color: TEXT_WEAK, marginBottom: '44px',
        }}>
          Guides
        </div>

        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
          {GUIDES.map((g) => <GuideCard key={g.num} guide={g} />)}
        </div>
      </section>

      <div style={{
        borderTop: `1px solid ${BORDER}`,
        padding: '20px 56px',
        display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px',
        fontFamily: 'Space Mono, monospace', fontSize: '9px',
        letterSpacing: '2px', textTransform: 'uppercase', color: TEXT_WEAK,
      }}>
        <span>Prob'Hammer — V2</span>
        <span>Data by BSData Community</span>
        <span>Warhammer 40,000 © Games Workshop</span>
      </div>
    </div>
  )
}

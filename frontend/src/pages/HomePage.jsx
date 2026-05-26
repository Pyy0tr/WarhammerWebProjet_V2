import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useIsMobile } from '../hooks/useIsMobile'
import {
  ACCENT, ACCENT_H, ACCENT_TEXT, ACCENT_LIGHT,
  BORDER, SURFACE, SURFACE_E,
  TEXT, TEXT_SEC, TEXT_WEAK, TEXT_OFF,
  FONT_UI, FONT_STAT,
  RADIUS, SHADOW_SM, SHADOW_MD,
} from '../theme'

const ACTIONS = [
  {
    num: '01',
    label: 'Explore Units',
    desc: 'Browse 1,487 units across 46 factions. View datasheets, weapons, and stats.',
    route: '/factions',
  },
  {
    num: '02',
    label: 'Create Army',
    desc: 'Build and save named army lists. Simulate straight from your roster.',
    route: '/armies',
  },
  {
    num: '03',
    label: 'Guides',
    desc: 'Walk through the 5 attack phases and discover how keywords stack.',
    route: '/learn',
  },
  {
    num: '04',
    label: 'Keywords',
    desc: 'Deep dive into every weapon keyword — rules, simulator notes, and when to use each one.',
    route: '/keywords',
  },
]

function ActionCard({ action, navigate }) {
  const [hov, setHov] = useState(false)
  return (
    <div
      onClick={() => navigate(action.route)}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background: hov ? SURFACE_E : SURFACE,
        borderRight: `1px solid ${BORDER}`,
        borderBottom: `1px solid ${BORDER}`,
        borderTop: `2px solid ${hov ? ACCENT : 'transparent'}`,
        padding: '28px 28px 24px',
        cursor: 'pointer',
        transition: 'background 150ms, border-top-color 150ms',
        display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
      }}
    >
      <div>
        <div style={{
          fontFamily: FONT_UI, fontSize: '11px', fontWeight: 500,
          color: hov ? ACCENT_TEXT : TEXT_OFF,
          transition: 'color 150ms', marginBottom: '10px',
        }}>
          {action.num}
        </div>
        <div style={{
          fontFamily: FONT_UI, fontSize: '15px', fontWeight: 600,
          color: hov ? ACCENT_TEXT : TEXT,
          transition: 'color 150ms', marginBottom: '10px',
        }}>
          {action.label}
        </div>
        <p style={{
          fontFamily: FONT_UI, fontSize: '13px',
          lineHeight: 1.65, color: TEXT_SEC, margin: 0,
        }}>
          {action.desc}
        </p>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
        <span style={{
          fontFamily: FONT_UI, fontSize: '13px', fontWeight: 500,
          color: hov ? ACCENT_TEXT : TEXT_WEAK,
          transition: 'color 150ms',
        }}>
          {hov ? 'Open →' : '→'}
        </span>
      </div>
    </div>
  )
}

function ActionPanel({ isMobile }) {
  const navigate = useNavigate()
  return (
    <div style={{
      flex: 1, minWidth: 0,
      display: 'grid',
      gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
      gridTemplateRows: isMobile ? 'auto' : '1fr 1fr',
      alignContent: 'stretch',
    }}>
      {ACTIONS.map((a) => <ActionCard key={a.num} action={a} navigate={navigate} />)}
    </div>
  )
}

function StepCard({ num, title, desc }) {
  return (
    <div style={{ flex: 1, borderTop: `2px solid ${BORDER}`, paddingTop: '24px' }}>
      <div style={{
        fontFamily: FONT_UI, fontSize: '11px', fontWeight: 500,
        color: ACCENT_TEXT, marginBottom: '8px',
      }}>
        {num}
      </div>
      <div style={{
        fontFamily: FONT_UI, fontSize: '15px', fontWeight: 600,
        color: TEXT, marginBottom: '10px',
      }}>
        {title}
      </div>
      <p style={{
        fontFamily: FONT_UI, fontSize: '14px',
        lineHeight: 1.7, color: TEXT_SEC, margin: 0,
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
  const [hov, setHov] = useState(false)
  const active = hov && guide.route
  const soon = !guide.route

  return (
    <div
      onClick={() => guide.route && navigate(guide.route)}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        flex: 1, minWidth: '220px',
        border: `1px solid ${active ? ACCENT : BORDER}`,
        background: active ? ACCENT_LIGHT : SURFACE,
        padding: '28px 24px',
        borderRadius: RADIUS,
        cursor: guide.route ? 'pointer' : 'default',
        transition: 'border-color 150ms, background 150ms, box-shadow 150ms',
        boxShadow: active ? SHADOW_MD : SHADOW_SM,
        display: 'flex', flexDirection: 'column', gap: '10px',
        opacity: soon ? 0.55 : 1,
      }}
    >
      <div style={{
        fontFamily: FONT_UI, fontSize: '11px', fontWeight: 500,
        color: active ? ACCENT_TEXT : TEXT_OFF,
        transition: 'color 150ms',
      }}>
        {guide.num}
      </div>

      <div style={{
        fontFamily: FONT_UI, fontSize: '15px', fontWeight: 600,
        color: active ? ACCENT_TEXT : TEXT,
        transition: 'color 150ms',
      }}>
        {guide.title}
      </div>

      <p style={{
        fontFamily: FONT_UI, fontSize: '14px',
        lineHeight: 1.65, color: TEXT_SEC, margin: 0, flexGrow: 1,
      }}>
        {guide.desc}
      </p>

      <div style={{
        fontFamily: FONT_UI, fontSize: '12px',
        color: soon ? TEXT_OFF : TEXT_WEAK,
      }}>
        {guide.duration}
      </div>
    </div>
  )
}

export function HomePage() {
  const navigate = useNavigate()
  const isMobile = useIsMobile()
  useEffect(() => {
    document.title = "Prob'Hammer — Warhammer 40K Probability & Dice Calculator"
  }, [])

  return (
    <div style={{ color: TEXT_SEC, paddingTop: '56px' }}>

      <section style={{
        minHeight: isMobile ? 'auto' : 'calc(100vh - 56px)',
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
      }}>
        {/* Left */}
        <div style={{
          flex: 1, minWidth: 0,
          padding: isMobile ? '32px 16px 24px' : '0 56px',
          display: 'flex', flexDirection: 'column', justifyContent: 'center',
          borderRight: isMobile ? 'none' : `1px solid ${BORDER}`,
          borderBottom: isMobile ? `1px solid ${BORDER}` : 'none',
          gap: '0',
        }}>

          {/* Eyebrow badge */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '8px',
            border: `1px solid ${BORDER}`,
            background: ACCENT_LIGHT,
            padding: '5px 12px 5px 10px',
            borderRadius: RADIUS,
            marginBottom: '28px', width: 'fit-content',
          }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: ACCENT }} />
            <span style={{ fontFamily: FONT_UI, fontSize: '12px', fontWeight: 500, color: ACCENT_TEXT }}>
              Warhammer 40,000 · 10th Edition
            </span>
          </div>

          {/* Headline */}
          <h1 style={{
            fontFamily: FONT_UI,
            fontSize: 'clamp(36px, 4vw, 60px)',
            fontWeight: 700,
            lineHeight: 1.1,
            color: TEXT, margin: 0,
          }}>
            Prob'Hammer
          </h1>

          {/* Accent underline */}
          <div style={{ width: '40px', height: '3px', background: ACCENT, margin: '16px 0 20px', borderRadius: '2px' }} />

          {/* Description */}
          <p style={{
            fontFamily: FONT_UI,
            fontSize: 'clamp(14px, 1.2vw, 16px)',
            lineHeight: 1.75, maxWidth: '380px',
            color: TEXT_SEC, margin: '0 0 32px',
          }}>
            Calculate your attack probabilities before you roll — full damage distribution in under a second.
          </p>

          {/* CTAs */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', marginBottom: '48px' }}>
            <button
              onClick={() => navigate('/simulator')}
              style={{
                border: `1px solid ${ACCENT}`, background: ACCENT, color: '#FFFFFF',
                fontFamily: FONT_UI, fontSize: '14px', fontWeight: 600,
                padding: '10px 24px', borderRadius: RADIUS, cursor: 'pointer',
                transition: 'background 120ms, border-color 120ms',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = ACCENT_H; e.currentTarget.style.borderColor = ACCENT_H }}
              onMouseLeave={(e) => { e.currentTarget.style.background = ACCENT; e.currentTarget.style.borderColor = ACCENT }}
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
                  fontFamily: FONT_STAT, fontSize: '22px',
                  fontWeight: 700, lineHeight: 1, color: ACCENT_TEXT,
                }}>
                  {n}
                </div>
                <div style={{
                  fontFamily: FONT_UI, fontSize: '12px', fontWeight: 500,
                  color: TEXT_WEAK, marginTop: '6px',
                }}>
                  {l}
                </div>
              </div>
            ))}
          </div>

        </div>

        {/* Right — action panel */}
        <ActionPanel isMobile={isMobile} />
      </section>

      <section style={{ padding: isMobile ? '40px 16px 48px' : '64px 56px 72px', borderTop: `1px solid ${BORDER}` }}>
        <div style={{
          fontFamily: FONT_UI, fontSize: '12px', fontWeight: 600,
          color: TEXT_WEAK, textTransform: 'uppercase', letterSpacing: '0.5px',
          marginBottom: '40px',
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

      <section style={{ padding: isMobile ? '40px 16px 48px' : '64px 56px 72px', borderTop: `1px solid ${BORDER}` }}>
        <div style={{
          fontFamily: FONT_UI, fontSize: '12px', fontWeight: 600,
          color: TEXT_WEAK, textTransform: 'uppercase', letterSpacing: '0.5px',
          marginBottom: '40px',
        }}>
          Guides
        </div>

        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
          {GUIDES.map((g) => <GuideCard key={g.num} guide={g} />)}
        </div>
      </section>

      <div style={{
        borderTop: `1px solid ${BORDER}`,
        padding: isMobile ? '16px' : '16px 56px',
        display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px',
        fontFamily: FONT_UI, fontSize: '12px', color: TEXT_WEAK,
      }}>
        <span>Prob'Hammer · V2</span>
        <span>Data by BSData Community</span>
        <span>Warhammer 40,000 © Games Workshop</span>
      </div>
    </div>
  )
}

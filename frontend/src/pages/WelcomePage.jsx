import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ACCENT, BG, SURFACE, BORDER, TEXT, TEXT_SEC, TEXT_WEAK, TEXT_OFF } from '../theme'

const LEVELS = [
  {
    id:       'beginner',
    num:      '01',
    title:    'Beginner',
    desc:     "I'm new to Warhammer 40K or just learning the rules.",
    detail:   'We explain weapon stats, keywords, and walk you through a live synergy example step by step.',
    duration: '~5 min',
    route:    '/onboarding/beginner',
  },
  {
    id:       'intermediate',
    num:      '02',
    title:    'Intermediate',
    desc:     'I know the basic rules but want to understand synergies better.',
    detail:   'We skip the basics and jump straight into a live example showing how abilities stack.',
    duration: '~2 min',
    route:    '/onboarding/intermediate',
  },
  {
    id:       'expert',
    num:      '03',
    title:    'Expert',
    desc:     'I know my stats, keywords, and synergies well.',
    detail:   null,
    duration: '~30 sec',
    route:    null,
  },
]

const EXPERT_TEXT =
  "Prob'Hammer runs 1,000 Monte Carlo iterations through each attack phase — Hit, Wound, Save, FNP — and returns the full damage distribution. Not just an average: the realistic spread of what your unit will actually do."

function LevelCard({ level, selected, onClick }) {
  const [hovered, setHovered] = useState(false)
  const active = hovered || selected

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        flex: 1,
        border: `1px solid ${active ? ACCENT : BORDER}`,
        background: active ? 'rgba(47,224,255,0.04)' : SURFACE,
        padding: '36px 32px',
        cursor: 'pointer',
        transition: 'border-color 120ms, background 120ms',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        minWidth: '220px',
      }}
    >
      <div style={{
        fontFamily: 'Space Mono, monospace',
        fontSize: '9px',
        letterSpacing: '3px',
        textTransform: 'uppercase',
        color: active ? ACCENT : TEXT_OFF,
        transition: 'color 120ms',
      }}>
        {level.num}
      </div>

      <div style={{
        fontFamily: 'Space Mono, monospace',
        fontSize: '18px',
        fontWeight: 700,
        letterSpacing: '3px',
        textTransform: 'uppercase',
        color: active ? ACCENT : TEXT,
        transition: 'color 120ms',
      }}>
        {level.title}
      </div>

      <p style={{
        fontFamily: 'Georgia, serif',
        fontSize: '14px',
        lineHeight: 1.7,
        color: TEXT_SEC,
        margin: 0,
        flexGrow: 1,
      }}>
        {level.desc}
      </p>

      <div style={{
        fontFamily: 'Space Mono, monospace',
        fontSize: '9px',
        letterSpacing: '2px',
        textTransform: 'uppercase',
        color: TEXT_WEAK,
      }}>
        {level.duration}
      </div>
    </div>
  )
}

export function WelcomePage() {
  const navigate        = useNavigate()
  const [expert, setExpert] = useState(false)

  function handleSelect(level) {
    if (level.id === 'expert') {
      setExpert(true)
      return
    }
    if (level.id === 'beginner') {
      localStorage.setItem('ph_level', 'beginner')
      navigate('/learn')
    } else {
      localStorage.setItem('ph_level', 'beginner')
      navigate('/onboarding')
    }
  }

  function handleSkip() {
    localStorage.setItem('ph_onboarding_done', 'true')
    navigate('/')
  }

  function handleExpertContinue() {
    localStorage.setItem('ph_onboarding_done', 'true')
    navigate('/')
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: BG,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '40px 24px',
      boxSizing: 'border-box',
    }}>

      {/* Logo */}
      <div style={{
        fontFamily: 'Space Mono, monospace',
        fontSize: '13px',
        fontWeight: 700,
        letterSpacing: '4px',
        textTransform: 'uppercase',
        color: ACCENT,
        marginBottom: '56px',
      }}>
        PROB<span style={{ opacity: 0.4 }}>'</span>HAMMER
      </div>

      {!expert ? (
        <div style={{ width: '100%', maxWidth: '900px', display: 'flex', flexDirection: 'column', gap: '40px' }}>

          {/* Header */}
          <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{
              fontFamily: 'Space Mono, monospace',
              fontSize: '10px',
              letterSpacing: '3px',
              textTransform: 'uppercase',
              color: TEXT_WEAK,
            }}>
              Welcome — first visit
            </div>
            <h1 style={{
              fontFamily: 'Space Mono, monospace',
              fontSize: 'clamp(18px, 2.5vw, 28px)',
              fontWeight: 700,
              letterSpacing: '2px',
              textTransform: 'uppercase',
              color: TEXT,
              margin: 0,
            }}>
              What's your experience level?
            </h1>
            <p style={{
              fontFamily: 'Georgia, serif',
              fontSize: '15px',
              lineHeight: 1.7,
              color: TEXT_SEC,
              margin: '0 auto',
              maxWidth: '480px',
            }}>
              We'll tailor your introduction to the simulator based on your familiarity with Warhammer 40K rules.
            </p>
          </div>

          {/* Cards */}
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
            {LEVELS.map((level) => (
              <LevelCard
                key={level.id}
                level={level}
                selected={false}
                onClick={() => handleSelect(level)}
              />
            ))}
          </div>

          {/* Skip */}
          <div style={{ textAlign: 'center' }}>
            <span
              onClick={handleSkip}
              style={{
                fontFamily: 'Space Mono, monospace',
                fontSize: '10px',
                letterSpacing: '2px',
                textTransform: 'uppercase',
                color: TEXT_OFF,
                cursor: 'pointer',
                textDecoration: 'underline',
                textUnderlineOffset: '3px',
              }}
            >
              Skip introduction
            </span>
          </div>
        </div>

      ) : (

        /* Expert panel */
        <div style={{
          width: '100%',
          maxWidth: '560px',
          border: `1px solid ${BORDER}`,
          background: SURFACE,
          padding: '48px 44px',
          display: 'flex',
          flexDirection: 'column',
          gap: '28px',
        }}>
          <div style={{
            fontFamily: 'Space Mono, monospace',
            fontSize: '10px',
            letterSpacing: '3px',
            textTransform: 'uppercase',
            color: ACCENT,
          }}>
            03 — Expert
          </div>

          <p style={{
            fontFamily: 'Georgia, serif',
            fontSize: '16px',
            lineHeight: 1.8,
            color: TEXT_SEC,
            margin: 0,
          }}>
            {EXPERT_TEXT}
          </p>

          <div style={{
            fontFamily: 'Space Mono, monospace',
            fontSize: '10px',
            letterSpacing: '1.5px',
            color: TEXT_WEAK,
            lineHeight: 1.6,
          }}>
            Use the <span style={{ color: TEXT }}>Simulator</span> to pick any unit and weapon —
            results update in real time. The <span style={{ color: TEXT }}>Factions</span> browser
            lets you explore datasheets. <span style={{ color: TEXT }}>Armies</span> saves
            your rosters for quick access.
          </div>

          <button
            onClick={handleExpertContinue}
            style={{
              background: ACCENT,
              border: 'none',
              color: BG,
              fontFamily: 'Space Mono, monospace',
              fontSize: '11px',
              letterSpacing: '3px',
              textTransform: 'uppercase',
              fontWeight: 700,
              padding: '16px',
              cursor: 'pointer',
              alignSelf: 'flex-start',
              transition: 'opacity 100ms',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.85' }}
            onMouseLeave={(e) => { e.currentTarget.style.opacity = '1' }}
          >
            Open simulator →
          </button>
        </div>
      )}
    </div>
  )
}

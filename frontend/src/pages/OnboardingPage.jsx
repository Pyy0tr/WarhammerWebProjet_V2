import { useMemo, useState, useRef, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { simulate } from '../engine/simulation.js'
import {
  ACCENT, BG, BORDER, HIGHLIGHT, SURFACE, SURFACE_E,
  TEXT, TEXT_SEC, TEXT_WEAK, TEXT_OFF,
} from '../theme'

// ── Simulation setup ──────────────────────────────────────────────────────────

const DEFENDER = { toughness: 5, save: 2, invuln: 4, wounds: 22, models: 1, fnp: null }
const CONTEXT  = { cover: false, half_range: false, attacker_moved: false, attacker_charged: false, target_visible: true }
const LETHAL   = [{ type: 'LETHAL_HITS' }]

function buildAttacks(simIdx) {
  const buffs = []
  if (simIdx >= 1) buffs.push({ type: 'WOUND_MODIFIER', value: 1 })
  if (simIdx >= 3) buffs.push({ type: 'REROLL_HITS' })
  if (simIdx >= 4) buffs.push({ type: 'CRITICAL_HIT_ON', value: 5 })
  return [
    { models: 4, weapon: { attacks: '2', skill: 3, strength: 5, ap: -3, damage: '1', keywords: LETHAL }, buffs: [...buffs] },
    { models: 1, weapon: { attacks: '4', skill: 2, strength: 5, ap: -3, damage: '1', keywords: LETHAL }, buffs: [...buffs] },
    { models: 1, weapon: { attacks: simIdx >= 2 ? '6' : '5', skill: 2, strength: 5, ap: -3, damage: '2', keywords: LETHAL }, buffs: [...buffs] },
  ]
}

// ── Step content definitions ──────────────────────────────────────────────────

const BEGINNER_STEPS = [
  { simIdx: 0, label: 'Weapon Stats' },
  { simIdx: 0, label: 'Base Attacks' },
  { simIdx: 1, label: 'Wound +1' },
  { simIdx: 2, label: 'Marshal +1A' },
  { simIdx: 3, label: 'Re-roll Hits' },
  { simIdx: 4, label: 'Critical Hit 5+' },
]

const INTERMEDIATE_STEPS = [
  { simIdx: 0, label: 'Setup' },
  { simIdx: 1, label: 'Wound +1' },
  { simIdx: 2, label: 'Marshal +1A' },
  { simIdx: 3, label: 'Re-roll Hits' },
  { simIdx: 4, label: 'Critical Hit 5+' },
]

// ── Shared components ─────────────────────────────────────────────────────────

function Tag({ children, color = ACCENT }) {
  return (
    <div style={{ display: 'inline-flex', border: `1px solid ${color}`, padding: '4px 10px', fontFamily: 'Space Mono, monospace', fontSize: '9px', letterSpacing: '2px', textTransform: 'uppercase', color, alignSelf: 'flex-start' }}>
      {children}
    </div>
  )
}

function Body({ children }) {
  return (
    <p style={{ fontFamily: 'Georgia, serif', fontSize: '16px', lineHeight: 1.8, color: TEXT_SEC, margin: 0 }}>
      {children}
    </p>
  )
}

function ScrollBtn({ onClick, label = 'Continue ↓', primary = false }) {
  return (
    <button
      onClick={onClick}
      style={{ border: primary ? 'none' : `1px solid ${BORDER}`, background: primary ? ACCENT : 'transparent', color: primary ? BG : TEXT_OFF, fontFamily: 'Space Mono, monospace', fontSize: '10px', letterSpacing: '2px', textTransform: 'uppercase', fontWeight: primary ? 700 : 400, padding: '12px 24px', cursor: 'pointer', alignSelf: 'flex-start', transition: 'all 150ms' }}
      onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.8' }}
      onMouseLeave={(e) => { e.currentTarget.style.opacity = '1' }}
    >
      {label}
    </button>
  )
}

// ── Weapon stat card ──────────────────────────────────────────────────────────

function WeaponCard() {
  const stats = [
    { key: 'A',  label: 'Attacks',            value: '2',   desc: 'Dice rolled to hit' },
    { key: 'WS', label: 'Weapon Skill',        value: '3+',  desc: 'Minimum to hit' },
    { key: 'S',  label: 'Strength',            value: '5',   desc: 'Used to wound' },
    { key: 'AP', label: 'Armour Penetration',  value: '-3',  desc: 'Reduces enemy save' },
    { key: 'D',  label: 'Damage',              value: '1',   desc: 'Per unsaved hit' },
  ]
  return (
    <div style={{ border: `1px solid ${BORDER}`, background: SURFACE }}>
      {/* Header */}
      <div style={{ padding: '14px 20px', borderBottom: `1px solid ${BORDER}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontFamily: 'Space Mono, monospace', fontSize: '12px', fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: TEXT }}>Power Sword</div>
          <div style={{ fontFamily: 'Space Mono, monospace', fontSize: '9px', color: TEXT_WEAK, marginTop: '4px', letterSpacing: '1px' }}>Sword Brethren — melee weapon</div>
        </div>
        <div style={{ border: `1px solid ${ACCENT}`, padding: '3px 8px', fontFamily: 'Space Mono, monospace', fontSize: '8px', letterSpacing: '2px', textTransform: 'uppercase', color: ACCENT }}>
          Lethal Hits
        </div>
      </div>
      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)' }}>
        {stats.map((s, i) => (
          <div key={s.key} style={{ padding: '16px 12px', borderRight: i < stats.length - 1 ? `1px solid ${BORDER}` : 'none', textAlign: 'center' }}>
            <div style={{ fontFamily: 'Space Mono, monospace', fontSize: '20px', fontWeight: 700, color: ACCENT, lineHeight: 1 }}>{s.value}</div>
            <div style={{ fontFamily: 'Space Mono, monospace', fontSize: '8px', letterSpacing: '1px', textTransform: 'uppercase', color: TEXT_WEAK, marginTop: '6px' }}>{s.key}</div>
          </div>
        ))}
      </div>
      {/* Legend */}
      <div style={{ borderTop: `1px solid ${BORDER}`, display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)' }}>
        {stats.map((s, i) => (
          <div key={s.key} style={{ padding: '10px 12px', borderRight: i < stats.length - 1 ? `1px solid ${BORDER}` : 'none', textAlign: 'center' }}>
            <div style={{ fontFamily: 'Georgia, serif', fontSize: '11px', color: TEXT_SEC, lineHeight: 1.4 }}>{s.desc}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Section content per step ──────────────────────────────────────────────────

function StepContent({ stepKey, onNext, results }) {
  const content = {
    'beginner-0': (
      <>
        <Tag>Sword Brethren · Power Sword</Tag>
        <h2 style={{ fontFamily: 'Space Mono, monospace', fontSize: 'clamp(16px, 2vw, 24px)', fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: TEXT, margin: 0 }}>
          Understanding weapon stats
        </h2>
        <Body>
          Every weapon in Warhammer 40,000 has five core stats. Here's the Power Sword carried by each Sword Brethren in our example — let's break down what each number means before we roll any dice.
        </Body>
        <WeaponCard />
        <Body>
          The graph on the right already shows what these six models are capable of in a single fight phase against <strong style={{ color: TEXT }}>Abaddon the Despoiler</strong> (T5, 2+ save, 4++ invuln). No special rules active yet — just raw numbers.
        </Body>
        <ScrollBtn onClick={onNext} />
      </>
    ),

    'beginner-1': (
      <>
        <Tag>Weapon keyword</Tag>
        <h2 style={{ fontFamily: 'Space Mono, monospace', fontSize: 'clamp(16px, 2vw, 24px)', fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: TEXT, margin: 0 }}>
          Lethal Hits
        </h2>
        <Body>
          Power Swords carry <strong style={{ color: TEXT }}>Lethal Hits</strong> as part of their weapon profile. Any unmodified hit roll of <strong style={{ color: ACCENT }}>6</strong> automatically wounds — no wound roll required.
        </Body>
        <Body>
          This is already included in the graph on the right. It's not a bonus — it's the weapon's base behavior. You'll see its value become clearer as we add rules that make 6s happen more often.
        </Body>
        <ScrollBtn onClick={onNext} />
      </>
    ),

    'beginner-2': (
      <>
        <Tag color={ACCENT}>Accept Any Challenge, No Matter the Odds</Tag>
        <h2 style={{ fontFamily: 'Space Mono, monospace', fontSize: 'clamp(16px, 2vw, 24px)', fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: TEXT, margin: 0 }}>
          +1 to wound roll
        </h2>
        <Body>
          Each time a model in this unit makes a melee attack, if the <strong style={{ color: TEXT }}>Strength of the attack ≤ Toughness of the target</strong>, add +1 to the wound roll.
        </Body>
        <Body>
          Our Power Swords are <strong style={{ color: ACCENT }}>S5</strong> and Abaddon is <strong style={{ color: ACCENT }}>T5</strong>. Strength equals Toughness — the condition always triggers. Watch the graph update.
        </Body>
        <ScrollBtn onClick={onNext} />
      </>
    ),

    'beginner-3': (
      <>
        <Tag color={ACCENT}>Marshal · Master-Crafted Power Weapon</Tag>
        <h2 style={{ fontFamily: 'Space Mono, monospace', fontSize: 'clamp(16px, 2vw, 24px)', fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: TEXT, margin: 0 }}>
          Marshal bonus attacks
        </h2>
        <Body>
          Each time the Marshal's unit is selected to fight, add <strong style={{ color: ACCENT }}>+1 Attack</strong> to his Master-Crafted Power Weapon for each enemy unit within 6" (max +3).
        </Body>
        <Body>
          We're fighting Abaddon alone — that's one enemy unit within 6". The Marshal goes from <strong style={{ color: TEXT }}>A5 to A6</strong>. Small change, but every swing matters against a 22-wound target.
        </Body>
        <ScrollBtn onClick={onNext} />
      </>
    ),

    'beginner-4': (
      <>
        <Tag color={ACCENT}>Castellan aura</Tag>
        <h2 style={{ fontFamily: 'Space Mono, monospace', fontSize: 'clamp(16px, 2vw, 24px)', fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: TEXT, margin: 0 }}>
          Re-roll hit rolls
        </h2>
        <Body>
          Until the end of the phase, each time a model in the unit makes an attack, you can <strong style={{ color: TEXT }}>re-roll the Hit roll</strong>.
        </Body>
        <Body>
          Every missed swing gets a second chance. This is one of the most impactful buffs available — it doesn't just add hits, it turns near-misses into Lethal Hits opportunities.
        </Body>
        <ScrollBtn onClick={onNext} />
      </>
    ),

    'beginner-5': (
      <>
        <Tag color={ACCENT}>Marshal aura</Tag>
        <h2 style={{ fontFamily: 'Space Mono, monospace', fontSize: 'clamp(16px, 2vw, 24px)', fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: TEXT, margin: 0 }}>
          Critical Hit on 5+
        </h2>
        <Body>
          While the Marshal leads the unit, an unmodified Hit roll of <strong style={{ color: ACCENT }}>5 or 6</strong> scores a Critical Hit — triggering Lethal Hits on a 5, not just a 6.
        </Body>
        <Body>
          Combined with re-rolls, this fires far more often than it looks. With all five rules active, your Black Templars go from{' '}
          <strong style={{ color: TEXT }}>{results[0]?.summary.mean_damage.toFixed(2)}</strong> to{' '}
          <strong style={{ color: HIGHLIGHT }}>{results[4]?.summary.mean_damage.toFixed(2)}</strong> mean damage against Abaddon —{' '}
          <strong style={{ color: ACCENT }}>+{results[0] && results[4] ? (((results[4].summary.mean_damage / results[0].summary.mean_damage) - 1) * 100).toFixed(0) : '?'}%</strong>.
        </Body>
        <ScrollBtn onClick={onNext} label="Open simulator →" primary />
      </>
    ),

    'intermediate-0': (
      <>
        <Tag>Black Templars vs Abaddon</Tag>
        <h2 style={{ fontFamily: 'Space Mono, monospace', fontSize: 'clamp(16px, 2vw, 24px)', fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: TEXT, margin: 0 }}>
          The setup
        </h2>
        <Body>
          6 Black Templars led by the Marshal and Castellan, all armed with Power Swords (S5 AP-3, Lethal Hits), charging into Abaddon the Despoiler (T5 Sv2+ 4++ W22).
        </Body>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0', border: `1px solid ${BORDER}` }}>
          {[
            ['4× Sword Brethren', 'Power Sword', 'A2 WS3+ S5 AP-3 D1'],
            ['1× Castellan',      'Power Sword', 'A4 WS2+ S5 AP-3 D1  +  re-roll hits aura'],
            ['1× Marshal',        'Master-Crafted PW', 'A5 WS2+ S5 AP-3 D2  +  Crit Hit 5+ aura'],
          ].map(([unit, weapon, profile], i) => (
            <div key={i} style={{ padding: '12px 16px', borderBottom: i < 2 ? `1px solid ${BORDER}` : 'none', display: 'grid', gridTemplateColumns: '160px 1fr', gap: '12px' }}>
              <div style={{ fontFamily: 'Space Mono, monospace', fontSize: '10px', fontWeight: 700, color: TEXT }}>{unit}</div>
              <div>
                <div style={{ fontFamily: 'Space Mono, monospace', fontSize: '9px', color: ACCENT, marginBottom: '2px' }}>{weapon}</div>
                <div style={{ fontFamily: 'Space Mono, monospace', fontSize: '9px', color: TEXT_WEAK }}>{profile}</div>
              </div>
            </div>
          ))}
        </div>
        <Body>
          The graph shows the base result — no special rules active yet. Watch what happens as each ability layers on.
        </Body>
        <ScrollBtn onClick={onNext} />
      </>
    ),

    'intermediate-1': (
      <>
        <Tag color={ACCENT}>Accept Any Challenge, No Matter the Odds</Tag>
        <h2 style={{ fontFamily: 'Space Mono, monospace', fontSize: 'clamp(16px, 2vw, 24px)', fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: TEXT, margin: 0 }}>
          +1 to wound roll
        </h2>
        <Body>
          When Strength ≤ Toughness, add +1 to the wound roll. S5 vs T5 — always active here. A small modifier that compounds heavily with everything that follows.
        </Body>
        <ScrollBtn onClick={onNext} />
      </>
    ),

    'intermediate-2': (
      <>
        <Tag color={ACCENT}>Marshal · Master-Crafted Power Weapon</Tag>
        <h2 style={{ fontFamily: 'Space Mono, monospace', fontSize: 'clamp(16px, 2vw, 24px)', fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: TEXT, margin: 0 }}>
          Marshal +1A per enemy unit in 6"
        </h2>
        <Body>
          One enemy unit within 6" → Marshal goes from A5 to A6. Higher D2 per swing makes this extra attack count more than it would on a basic model.
        </Body>
        <ScrollBtn onClick={onNext} />
      </>
    ),

    'intermediate-3': (
      <>
        <Tag color={ACCENT}>Castellan aura</Tag>
        <h2 style={{ fontFamily: 'Space Mono, monospace', fontSize: 'clamp(16px, 2vw, 24px)', fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: TEXT, margin: 0 }}>
          Re-roll all hit rolls
        </h2>
        <Body>
          Every model in the unit can re-roll their hit roll. Combined with Lethal Hits, more dice means more chances at a 6 auto-wound.
        </Body>
        <ScrollBtn onClick={onNext} />
      </>
    ),

    'intermediate-4': (
      <>
        <Tag color={ACCENT}>Marshal aura</Tag>
        <h2 style={{ fontFamily: 'Space Mono, monospace', fontSize: 'clamp(16px, 2vw, 24px)', fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: TEXT, margin: 0 }}>
          Critical Hit on 5+
        </h2>
        <Body>
          Hit rolls of 5+ trigger Lethal Hits. With re-rolls, this fires on roughly 44% of all attack dice. Full synergy:{' '}
          <strong style={{ color: TEXT }}>{results[0]?.summary.mean_damage.toFixed(2)}</strong> →{' '}
          <strong style={{ color: HIGHLIGHT }}>{results[4]?.summary.mean_damage.toFixed(2)}</strong> mean damage{' '}
          (<strong style={{ color: ACCENT }}>+{results[0] && results[4] ? (((results[4].summary.mean_damage / results[0].summary.mean_damage) - 1) * 100).toFixed(0) : '?'}%</strong>).
        </Body>
        <ScrollBtn onClick={onNext} label="Open simulator →" primary />
      </>
    ),
  }

  return content[stepKey] ?? null
}

// ── Damage panel (sticky right) ───────────────────────────────────────────────

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: BG, border: `1px solid ${ACCENT}`, padding: '8px 12px', fontFamily: 'Space Mono, monospace', fontSize: '9px', letterSpacing: '1.5px', color: TEXT }}>
      <div style={{ color: TEXT_WEAK, marginBottom: '3px' }}>DMG {label}</div>
      <div style={{ fontWeight: 700, color: ACCENT }}>{(payload[0].value * 100).toFixed(1)}%</div>
    </div>
  )
}

function DamagePanel({ result, rulesActive }) {
  if (!result) return null
  const { summary, damage_histogram } = result
  const maxProb = Math.max(...damage_histogram.map((b) => b.probability))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
      <div style={{ fontFamily: 'Space Mono, monospace', fontSize: '9px', letterSpacing: '2px', textTransform: 'uppercase', color: TEXT_WEAK, marginBottom: '20px' }}>
        Black Templars vs Abaddon · {rulesActive === 0 ? 'base' : `${rulesActive} rule${rulesActive > 1 ? 's' : ''} active`}
      </div>

      <div style={{ marginBottom: '20px' }}>
        <div style={{ fontFamily: 'Space Mono, monospace', fontWeight: 700, fontSize: 'clamp(48px, 5vw, 72px)', lineHeight: 1, letterSpacing: '-2px', color: HIGHLIGHT }}>
          {summary.mean_damage.toFixed(2)}
        </div>
        <div style={{ fontFamily: 'Space Mono, monospace', fontSize: '9px', letterSpacing: '2px', textTransform: 'uppercase', color: TEXT_WEAK, marginTop: '8px' }}>
          Mean damage output
        </div>
      </div>

      <div style={{ borderTop: `1px solid ${BORDER}`, marginBottom: '12px' }} />

      {[
        ['Median', summary.median_damage],
        ['Std dev', summary.std_dev.toFixed(2)],
        ['P10 — P90', `${summary.p10} — ${summary.p90}`],
      ].map(([label, value]) => (
        <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: `1px solid ${BORDER}` }}>
          <span style={{ fontFamily: 'Space Mono, monospace', fontSize: '9px', letterSpacing: '1.5px', textTransform: 'uppercase', color: TEXT_WEAK }}>{label}</span>
          <span style={{ fontFamily: 'Space Mono, monospace', fontSize: '12px', fontWeight: 700, color: TEXT_SEC }}>{value}</span>
        </div>
      ))}

      <div style={{ borderTop: `1px solid ${BORDER}`, margin: '16px 0 12px' }} />

      <div style={{ fontFamily: 'Space Mono, monospace', fontSize: '8px', letterSpacing: '2.5px', textTransform: 'uppercase', color: TEXT_WEAK, marginBottom: '12px' }}>
        Damage distribution
      </div>
      <ResponsiveContainer width="100%" height={150}>
        <BarChart data={damage_histogram} margin={{ top: 0, right: 0, bottom: 0, left: -20 }} barCategoryGap="18%">
          <XAxis dataKey="damage" tick={{ fill: TEXT_WEAK, fontSize: 8, fontFamily: 'Space Mono, monospace' }} tickLine={{ stroke: BORDER }} axisLine={{ stroke: BORDER }} />
          <YAxis tickFormatter={(v) => `${(v * 100).toFixed(0)}%`} tick={{ fill: TEXT_WEAK, fontSize: 8, fontFamily: 'Space Mono, monospace' }} tickLine={{ stroke: BORDER }} axisLine={{ stroke: BORDER }} />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(47,224,255,0.04)' }} />
          <Bar dataKey="probability" radius={0} isAnimationActive={true} animationDuration={400}>
            {damage_histogram.map((entry) => (
              <Cell key={entry.damage} fill={entry.probability === maxProb ? HIGHLIGHT : ACCENT} opacity={entry.probability === maxProb ? 0.9 : 0.45} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

// ── Progress bar (top) ────────────────────────────────────────────────────────

function ProgressBar({ steps, active }) {
  return (
    <div style={{ display: 'flex', height: '3px', background: SURFACE_E }}>
      {steps.map((_, i) => (
        <div key={i} style={{ flex: 1, background: i <= active ? ACCENT : 'transparent', transition: 'background 300ms', marginRight: i < steps.length - 1 ? '2px' : 0 }} />
      ))}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export function OnboardingPage() {
  const navigate  = useNavigate()
  const level     = localStorage.getItem('ph_level') ?? 'beginner'
  const steps     = level === 'intermediate' ? INTERMEDIATE_STEPS : BEGINNER_STEPS
  const prefix    = level === 'intermediate' ? 'intermediate' : 'beginner'

  const [activeStep, setActiveStep] = useState(0)
  const sectionRefs = useRef([])
  const containerRef = useRef(null)

  // Pre-compute all 5 simulation results
  const results = useMemo(() => (
    [0, 1, 2, 3, 4].map((simIdx) =>
      simulate({ attacks: buildAttacks(simIdx), defender: DEFENDER, context: CONTEXT, n_trials: 1000 })
    )
  ), [])

  // IntersectionObserver: update activeStep when section enters viewport
  useEffect(() => {
    const observers = sectionRefs.current.map((el, i) => {
      if (!el) return null
      const obs = new IntersectionObserver(
        ([entry]) => { if (entry.isIntersecting) setActiveStep(i) },
        { threshold: 0.4 }
      )
      obs.observe(el)
      return obs
    })
    return () => observers.forEach((obs) => obs?.disconnect())
  }, [steps.length])

  const scrollToStep = useCallback((i) => {
    sectionRefs.current[i]?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [])

  function handleNext(i) {
    if (i < steps.length - 1) {
      scrollToStep(i + 1)
    } else {
      localStorage.setItem('ph_onboarding_done', 'true')
      navigate('/')
    }
  }

  function handleSkip() {
    localStorage.setItem('ph_onboarding_done', 'true')
    navigate('/')
  }

  const activeSimIdx  = steps[activeStep]?.simIdx ?? 0
  const activeResult  = results[activeSimIdx]

  return (
    <div style={{ minHeight: '100vh', background: BG, display: 'flex', flexDirection: 'column' }}>

      {/* Top bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px', borderBottom: `1px solid ${BORDER}`, height: '52px', flexShrink: 0, position: 'sticky', top: 0, zIndex: 10, background: BG }}>
        <div style={{ fontFamily: 'Space Mono, monospace', fontSize: '12px', fontWeight: 700, letterSpacing: '3px', color: ACCENT }}>
          PROB<span style={{ opacity: 0.4 }}>'</span>HAMMER
        </div>
        <div style={{ fontFamily: 'Space Mono, monospace', fontSize: '9px', letterSpacing: '2px', color: TEXT_WEAK }}>
          {activeStep + 1} / {steps.length}
        </div>
        <span onClick={handleSkip} style={{ fontFamily: 'Space Mono, monospace', fontSize: '9px', letterSpacing: '2px', textTransform: 'uppercase', color: TEXT_OFF, cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: '3px' }}>
          Skip
        </span>
      </div>

      {/* Progress bar */}
      <ProgressBar steps={steps} active={activeStep} />

      {/* Two-column layout */}
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', alignItems: 'start' }}>

        {/* Left — scrollable sections */}
        <div ref={containerRef} style={{ borderRight: `1px solid ${BORDER}` }}>
          {steps.map((step, i) => (
            <section
              key={i}
              ref={(el) => { sectionRefs.current[i] = el }}
              style={{ minHeight: 'calc(100vh - 55px)', padding: '56px 48px', display: 'flex', flexDirection: 'column', gap: '24px', justifyContent: 'center', borderBottom: i < steps.length - 1 ? `1px solid ${BORDER}` : 'none' }}
            >
              <StepContent
                stepKey={`${prefix}-${i}`}
                onNext={() => handleNext(i)}
                isLast={i === steps.length - 1}
                results={results}
              />
            </section>
          ))}
        </div>

        {/* Right — sticky graph */}
        <div style={{ position: 'sticky', top: '55px', height: 'calc(100vh - 55px)', padding: '40px 40px', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
          <DamagePanel result={activeResult} rulesActive={activeSimIdx} />
        </div>
      </div>
    </div>
  )
}

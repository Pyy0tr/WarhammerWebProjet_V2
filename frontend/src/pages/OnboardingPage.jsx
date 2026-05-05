import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { simulate } from '../engine/simulation.js'
import {
  ACCENT, BG, BORDER, HIGHLIGHT, SURFACE, SURFACE_E,
  TEXT, TEXT_SEC, TEXT_WEAK, TEXT_OFF,
} from '../theme'

// ── Simulation setup ─────────────────────────────────────────────────────────

const DEFENDER = { toughness: 5, save: 2, invuln: 4, wounds: 22, models: 1, fnp: null }
const CONTEXT  = { cover: false, half_range: false, attacker_moved: false, attacker_charged: false, target_visible: true }
const LETHAL   = [{ type: 'LETHAL_HITS' }]

// Each sim index (0–4) adds rules cumulatively
function buildAttacks(simIdx) {
  const buffs = []
  if (simIdx >= 1) buffs.push({ type: 'WOUND_MODIFIER', value: 1 })
  if (simIdx >= 3) buffs.push({ type: 'REROLL_HITS' })
  if (simIdx >= 4) buffs.push({ type: 'CRITICAL_HIT_ON', value: 5 })

  return [
    { models: 4, weapon: { name: 'Power Sword',                    attacks: '2', skill: 3, strength: 5, ap: -3, damage: '1', keywords: LETHAL }, buffs: [...buffs] },
    { models: 1, weapon: { name: 'Power Sword',                    attacks: '4', skill: 2, strength: 5, ap: -3, damage: '1', keywords: LETHAL }, buffs: [...buffs] },
    { models: 1, weapon: { name: 'Master-Crafted Power Weapon',    attacks: simIdx >= 2 ? '6' : '5', skill: 2, strength: 5, ap: -3, damage: '2', keywords: LETHAL }, buffs: [...buffs] },
  ]
}

// ── Step definitions ─────────────────────────────────────────────────────────

const BEGINNER_STEPS = [
  {
    simIdx: 0,
    label:  'Weapon Stats',
    type:   'stats',
    title:  'Understanding weapon stats',
    body: null, // rendered separately as a table
  },
  {
    simIdx: 0,
    label:  'Base Attacks',
    type:   'rule',
    keyword: 'Lethal Hits',
    title:  'Base attacks — Lethal Hits',
    body:   "Your Power Swords carry the Lethal Hits keyword. Any unmodified hit roll of 6 automatically wounds the target — no wound roll needed. This is part of the weapon profile, active from the start.",
    delta:  null,
  },
  {
    simIdx: 1,
    label:  'Wound +1',
    type:   'rule',
    keyword: 'Accept Any Challenge',
    title:  'Accept Any Challenge, No Matter the Odds',
    body:   "Each time a model in this unit makes a melee attack, if the Strength of that attack is ≤ the Toughness of the target, add +1 to the wound roll. Power Swords are S5 and Abaddon is T5 — so this always triggers.",
    delta:  'wound roll +1',
  },
  {
    simIdx: 2,
    label:  'Marshal +1A',
    type:   'rule',
    keyword: "Master-Crafted Power Weapon",
    title:  "Marshal's bonus attacks",
    body:   "Each time the Marshal's unit is selected to fight, add +1 to his Master-Crafted Power Weapon's Attacks for each enemy unit within 6\" (max +3). Fighting Abaddon: +1A.",
    delta:  'Marshal Attacks +1',
  },
  {
    simIdx: 3,
    label:  'Re-roll Hits',
    type:   'rule',
    keyword: 'Castellan aura',
    title:  'Castellan — re-roll hit rolls',
    body:   "Until the end of the phase, each time a model in the unit makes an attack, you can re-roll the Hit roll. Every missed swing gets a second chance.",
    delta:  're-roll all hit rolls',
  },
  {
    simIdx: 4,
    label:  'Critical Hit 5+',
    type:   'rule',
    keyword: 'Marshal aura',
    title:  'Marshal — Critical Hit on 5+',
    body:   "While the Marshal leads the unit, each time a model makes a melee attack, an unmodified Hit roll of 5+ scores a Critical Hit — triggering Lethal Hits on a 5, not just a 6. Combined with re-rolls, this fires far more often.",
    delta:  'Critical Hit on 5+',
    isFinal: true,
  },
]

const INTERMEDIATE_STEPS = [
  {
    simIdx: 0,
    label:  'Setup',
    type:   'setup',
    title:  '6 Black Templars vs Abaddon',
    body:   "4 Sword Brethren + Castellan + Marshal, all armed with Power Swords (S5 AP-3, Lethal Hits). Target: Abaddon the Despoiler — T5 Sv2+ 4++ W22. Watch what happens as each rule layers on top.",
    delta:  null,
  },
  ...BEGINNER_STEPS.slice(2), // Accept Any Challenge onward
]

// ── StepBar ───────────────────────────────────────────────────────────────────

function StepBar({ steps, current }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'stretch',
      borderBottom: `1px solid ${BORDER}`,
      overflowX: 'auto',
    }}>
      {steps.map((s, i) => {
        const active    = i === current
        const completed = i < current
        return (
          <div key={i} style={{
            flex: 1, minWidth: '80px',
            padding: '13px 8px 11px',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px',
            borderBottom: active ? `2px solid ${ACCENT}` : '2px solid transparent',
            transition: 'border-color 150ms',
          }}>
            <span style={{
              width: '20px', height: '20px', borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: active ? ACCENT : completed ? SURFACE_E : 'transparent',
              border: `1px solid ${active || completed ? ACCENT : BORDER}`,
              fontFamily: 'Space Mono, monospace', fontSize: '9px', fontWeight: 700,
              color: active ? BG : completed ? ACCENT : TEXT_OFF,
              flexShrink: 0,
              transition: 'all 150ms',
            }}>
              {completed ? '✓' : i + 1}
            </span>
            <span style={{
              fontFamily: 'Space Mono, monospace', fontSize: '8px',
              letterSpacing: '1px', textTransform: 'uppercase',
              color: active ? ACCENT : completed ? TEXT_SEC : TEXT_OFF,
              fontWeight: active ? 700 : 400,
              textAlign: 'center', lineHeight: 1.2,
            }}>
              {s.label}
            </span>
          </div>
        )
      })}
    </div>
  )
}

// ── Damage graph panel ────────────────────────────────────────────────────────

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: BG, border: `1px solid ${ACCENT}`, padding: '8px 12px', fontFamily: 'Space Mono, monospace', fontSize: '9px', letterSpacing: '1.5px', color: TEXT }}>
      <div style={{ color: TEXT_WEAK, marginBottom: '3px' }}>DMG {label}</div>
      <div style={{ fontWeight: 700, color: ACCENT }}>{(payload[0].value * 100).toFixed(1)}%</div>
    </div>
  )
}

function DamagePanel({ result, prevMean }) {
  if (!result) return null
  const { summary, damage_histogram } = result
  const maxProb = Math.max(...damage_histogram.map((b) => b.probability))
  const delta   = prevMean !== null ? (summary.mean_damage - prevMean) : null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
      {/* Mean damage */}
      <div style={{ marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px' }}>
          <div style={{
            fontFamily: 'Space Mono, monospace', fontWeight: 700,
            fontSize: 'clamp(48px, 6vw, 80px)', lineHeight: 1,
            letterSpacing: '-2px', color: HIGHLIGHT,
            transition: 'all 300ms ease',
          }}>
            {summary.mean_damage.toFixed(2)}
          </div>
          {delta !== null && delta !== 0 && (
            <div style={{
              fontFamily: 'Space Mono, monospace', fontSize: '12px',
              color: ACCENT, fontWeight: 700,
              opacity: 0.9,
            }}>
              +{delta.toFixed(2)}
            </div>
          )}
        </div>
        <div style={{ fontFamily: 'Space Mono, monospace', fontSize: '9px', letterSpacing: '2px', textTransform: 'uppercase', color: TEXT_WEAK, marginTop: '6px' }}>
          Mean damage output
        </div>
      </div>

      <div style={{ borderTop: `1px solid ${BORDER}`, marginBottom: '16px' }} />

      {/* Key stats */}
      {[
        ['Median damage',     summary.median_damage],
        ['Std deviation',     summary.std_dev.toFixed(2)],
        ['P10 — P90',         `${summary.p10} — ${summary.p90}`],
      ].map(([label, value]) => (
        <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: `1px solid ${BORDER}` }}>
          <span style={{ fontFamily: 'Space Mono, monospace', fontSize: '9px', letterSpacing: '1.5px', textTransform: 'uppercase', color: TEXT_WEAK }}>{label}</span>
          <span style={{ fontFamily: 'Space Mono, monospace', fontSize: '12px', fontWeight: 700, color: TEXT_SEC }}>{value}</span>
        </div>
      ))}

      <div style={{ borderTop: `1px solid ${BORDER}`, margin: '16px 0 12px' }} />

      {/* Histogram */}
      <div style={{ fontFamily: 'Space Mono, monospace', fontSize: '8px', letterSpacing: '2.5px', textTransform: 'uppercase', color: TEXT_WEAK, marginBottom: '12px' }}>
        Damage distribution
      </div>
      <ResponsiveContainer width="100%" height={130}>
        <BarChart data={damage_histogram} margin={{ top: 0, right: 0, bottom: 0, left: -20 }} barCategoryGap="18%">
          <XAxis dataKey="damage" tick={{ fill: TEXT_WEAK, fontSize: 8, fontFamily: 'Space Mono, monospace' }} tickLine={{ stroke: BORDER }} axisLine={{ stroke: BORDER }} />
          <YAxis tickFormatter={(v) => `${(v * 100).toFixed(0)}%`} tick={{ fill: TEXT_WEAK, fontSize: 8, fontFamily: 'Space Mono, monospace' }} tickLine={{ stroke: BORDER }} axisLine={{ stroke: BORDER }} />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(47,224,255,0.04)' }} />
          <Bar dataKey="probability" radius={0}>
            {damage_histogram.map((entry) => (
              <Cell key={entry.damage} fill={entry.probability === maxProb ? HIGHLIGHT : ACCENT} opacity={entry.probability === maxProb ? 0.9 : 0.45} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

// ── Stat table (beginner only) ────────────────────────────────────────────────

function StatTable() {
  const rows = [
    ['A',  'Attacks',            'Number of dice rolled to hit'],
    ['WS', 'Weapon Skill',       'Minimum roll needed to hit (e.g. 3+ = roll 3, 4, 5 or 6)'],
    ['S',  'Strength',           'Compared to target Toughness — higher S = easier to wound'],
    ['AP', 'Armour Penetration', 'Reduces enemy save (-3 turns a 2+ save into a 5+)'],
    ['D',  'Damage',             'Wounds dealt per unsaved hit'],
  ]
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
      <div style={{ fontFamily: 'Space Mono, monospace', fontSize: '9px', letterSpacing: '2px', textTransform: 'uppercase', color: TEXT_WEAK, marginBottom: '12px' }}>
        Power Sword — S5 AP-3 D1 A2 WS3+
      </div>
      {rows.map(([stat, name, desc]) => (
        <div key={stat} style={{ display: 'grid', gridTemplateColumns: '32px 120px 1fr', gap: '12px', padding: '12px 0', borderBottom: `1px solid ${BORDER}`, alignItems: 'start' }}>
          <div style={{ fontFamily: 'Space Mono, monospace', fontSize: '14px', fontWeight: 700, color: ACCENT }}>{stat}</div>
          <div style={{ fontFamily: 'Space Mono, monospace', fontSize: '10px', letterSpacing: '1px', textTransform: 'uppercase', color: TEXT, paddingTop: '2px' }}>{name}</div>
          <div style={{ fontFamily: 'Georgia, serif', fontSize: '13px', lineHeight: 1.6, color: TEXT_SEC }}>{desc}</div>
        </div>
      ))}
    </div>
  )
}

// ── Setup card ────────────────────────────────────────────────────────────────

function SetupCard() {
  const attackers = [
    { label: '4× Sword Brethren', weapon: 'Power Sword', profile: 'A2 WS3+ S5 AP-3 D1', keywords: 'Lethal Hits' },
    { label: '1× Castellan',      weapon: 'Power Sword', profile: 'A4 WS2+ S5 AP-3 D1', keywords: 'Lethal Hits + re-roll hits aura' },
    { label: '1× Marshal',        weapon: 'Master-Crafted Power Weapon', profile: 'A5 WS2+ S5 AP-3 D2', keywords: 'Lethal Hits + Crit Hit 5+ aura' },
  ]
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div>
        <div style={{ fontFamily: 'Space Mono, monospace', fontSize: '9px', letterSpacing: '2px', textTransform: 'uppercase', color: TEXT_WEAK, marginBottom: '10px' }}>Attackers</div>
        {attackers.map((a) => (
          <div key={a.label} style={{ padding: '10px 0', borderBottom: `1px solid ${BORDER}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
              <span style={{ fontFamily: 'Space Mono, monospace', fontSize: '10px', fontWeight: 700, color: TEXT }}>{a.label}</span>
              <span style={{ fontFamily: 'Space Mono, monospace', fontSize: '9px', color: TEXT_WEAK }}>{a.profile}</span>
            </div>
            <div style={{ fontFamily: 'Space Mono, monospace', fontSize: '9px', color: ACCENT, letterSpacing: '1px' }}>{a.keywords}</div>
          </div>
        ))}
      </div>
      <div>
        <div style={{ fontFamily: 'Space Mono, monospace', fontSize: '9px', letterSpacing: '2px', textTransform: 'uppercase', color: TEXT_WEAK, marginBottom: '10px' }}>Target</div>
        <div style={{ padding: '12px', border: `1px solid ${BORDER}`, background: 'rgba(255,92,122,0.04)' }}>
          <div style={{ fontFamily: 'Space Mono, monospace', fontSize: '12px', fontWeight: 700, color: TEXT, marginBottom: '6px' }}>Abaddon the Despoiler</div>
          <div style={{ fontFamily: 'Space Mono, monospace', fontSize: '9px', color: TEXT_WEAK, letterSpacing: '1px' }}>T5 · Sv2+ · 4++ · W22</div>
        </div>
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export function OnboardingPage() {
  const navigate = useNavigate()
  const level    = localStorage.getItem('ph_level') ?? 'beginner'
  const steps    = level === 'intermediate' ? INTERMEDIATE_STEPS : BEGINNER_STEPS

  const [current, setCurrent] = useState(0)

  // Pre-compute all simulation results at mount
  const results = useMemo(() => {
    return [0, 1, 2, 3, 4].map((simIdx) =>
      simulate({ attacks: buildAttacks(simIdx), defender: DEFENDER, context: CONTEXT, n_trials: 1000 })
    )
  }, [])

  const step      = steps[current]
  const result    = results[step.simIdx]
  const prevMean  = current > 0 ? results[steps[current - 1].simIdx].summary.mean_damage : null

  function handleNext() {
    if (current < steps.length - 1) {
      setCurrent(current + 1)
    } else {
      localStorage.setItem('ph_onboarding_done', 'true')
      navigate('/')
    }
  }

  function handleBack() {
    if (current > 0) setCurrent(current - 1)
  }

  function handleSkip() {
    localStorage.setItem('ph_onboarding_done', 'true')
    navigate('/')
  }

  const isLast = current === steps.length - 1

  return (
    <div style={{ minHeight: '100vh', background: BG, display: 'flex', flexDirection: 'column' }}>

      {/* Top bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px', borderBottom: `1px solid ${BORDER}`, height: '52px', flexShrink: 0 }}>
        <div style={{ fontFamily: 'Space Mono, monospace', fontSize: '12px', fontWeight: 700, letterSpacing: '3px', color: ACCENT }}>
          PROB<span style={{ opacity: 0.4 }}>'</span>HAMMER
        </div>
        <span onClick={handleSkip} style={{ fontFamily: 'Space Mono, monospace', fontSize: '9px', letterSpacing: '2px', textTransform: 'uppercase', color: TEXT_OFF, cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: '3px' }}>
          Skip
        </span>
      </div>

      {/* Step bar */}
      <StepBar steps={steps} current={current} />

      {/* Content */}
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', minHeight: 0 }}>

        {/* Left — explanation */}
        <div style={{ borderRight: `1px solid ${BORDER}`, padding: '36px 40px', display: 'flex', flexDirection: 'column', gap: '24px', overflowY: 'auto' }}>

          {/* Rule tag */}
          {step.keyword && (
            <div style={{ display: 'inline-flex', alignSelf: 'flex-start', border: `1px solid ${ACCENT}`, padding: '4px 10px', fontFamily: 'Space Mono, monospace', fontSize: '9px', letterSpacing: '2px', textTransform: 'uppercase', color: ACCENT }}>
              {step.keyword}
            </div>
          )}

          {/* Title */}
          <h2 style={{ fontFamily: 'Space Mono, monospace', fontSize: 'clamp(14px, 1.6vw, 20px)', fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: TEXT, margin: 0 }}>
            {step.title}
          </h2>

          {/* Delta badge */}
          {step.delta && (
            <div style={{ display: 'inline-flex', alignSelf: 'flex-start', background: 'rgba(47,224,255,0.08)', border: `1px solid ${BORDER}`, padding: '6px 12px', fontFamily: 'Space Mono, monospace', fontSize: '9px', letterSpacing: '2px', textTransform: 'uppercase', color: ACCENT }}>
              + {step.delta}
            </div>
          )}

          {/* Body content */}
          {step.type === 'stats' && (
            <>
              <p style={{ fontFamily: 'Georgia, serif', fontSize: '15px', lineHeight: 1.75, color: TEXT_SEC, margin: 0 }}>
                Before we start, here are the five stats that define every weapon in Warhammer 40,000.
                We'll be using <strong style={{ color: TEXT }}>Power Swords</strong> throughout this example.
              </p>
              <StatTable />
            </>
          )}

          {(step.type === 'rule' || step.type === 'setup') && (
            <>
              {step.type === 'setup' && <SetupCard />}
              {step.body && (
                <p style={{ fontFamily: 'Georgia, serif', fontSize: '15px', lineHeight: 1.75, color: TEXT_SEC, margin: 0 }}>
                  {step.body}
                </p>
              )}
            </>
          )}

          {/* Final summary */}
          {isLast && (
            <div style={{ padding: '16px', border: `1px solid ${ACCENT}`, background: 'rgba(47,224,255,0.04)', marginTop: '8px' }}>
              <div style={{ fontFamily: 'Space Mono, monospace', fontSize: '9px', letterSpacing: '2px', textTransform: 'uppercase', color: ACCENT, marginBottom: '8px' }}>Full synergy active</div>
              <p style={{ fontFamily: 'Georgia, serif', fontSize: '14px', lineHeight: 1.7, color: TEXT_SEC, margin: 0 }}>
                With all rules stacked, your Black Templars go from{' '}
                <strong style={{ color: TEXT }}>{results[0].summary.mean_damage.toFixed(2)}</strong> to{' '}
                <strong style={{ color: HIGHLIGHT }}>{results[4].summary.mean_damage.toFixed(2)}</strong> mean damage —
                a <strong style={{ color: ACCENT }}>+{(((results[4].summary.mean_damage / results[0].summary.mean_damage) - 1) * 100).toFixed(0)}%</strong> increase.
              </p>
            </div>
          )}

          {/* Navigation */}
          <div style={{ display: 'flex', gap: '12px', marginTop: 'auto', paddingTop: '24px' }}>
            {current > 0 && (
              <button onClick={handleBack} style={{ flex: 1, border: `1px solid ${BORDER}`, background: 'none', color: TEXT_SEC, fontFamily: 'Space Mono, monospace', fontSize: '10px', letterSpacing: '2px', textTransform: 'uppercase', padding: '13px', cursor: 'pointer' }}>
                ← Back
              </button>
            )}
            <button
              onClick={handleNext}
              style={{ flex: 2, border: 'none', background: isLast ? ACCENT : SURFACE_E, color: isLast ? BG : TEXT, fontFamily: 'Space Mono, monospace', fontSize: '10px', letterSpacing: '2px', textTransform: 'uppercase', fontWeight: 700, padding: '13px', cursor: 'pointer', transition: 'background 150ms' }}
              onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.85' }}
              onMouseLeave={(e) => { e.currentTarget.style.opacity = '1' }}
            >
              {isLast ? 'Open simulator →' : 'Next →'}
            </button>
          </div>
        </div>

        {/* Right — graph */}
        <div style={{ padding: '36px 40px', overflowY: 'auto' }}>
          <div style={{ fontFamily: 'Space Mono, monospace', fontSize: '9px', letterSpacing: '2px', textTransform: 'uppercase', color: TEXT_WEAK, marginBottom: '20px' }}>
            Black Templars vs Abaddon · {step.simIdx === 0 ? 'base' : `${step.simIdx} rule${step.simIdx > 1 ? 's' : ''} active`}
          </div>
          <DamagePanel result={result} prevMean={current > 0 ? prevMean : null} />
        </div>
      </div>
    </div>
  )
}

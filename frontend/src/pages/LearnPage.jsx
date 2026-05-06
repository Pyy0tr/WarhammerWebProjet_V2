import { useMemo, useState, useRef, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { simulate } from '../engine/simulation.js'
import {
  ACCENT, BG, BORDER, HIGHLIGHT, SURFACE, SURFACE_E,
  TEXT, TEXT_SEC, TEXT_WEAK, TEXT_OFF,
} from '../theme'

// ── Simulation setup ──────────────────────────────────────────────────────────
// 5 Intercessors · Bolt Rifle · A2, BS3+, S4, AP-1, D1
// vs 10 Ork Boyz · T5, Sv5+, W1

const ATTACKER_WEAPON = { attacks: '2', skill: 3, strength: 4, ap: -1, damage: '1', keywords: [] }
const DEFENDER        = { toughness: 5, save: 5, invuln: null, wounds: 1, models: 10, fnp: null }
const CONTEXT         = { cover: false, half_range: false, attacker_moved: false, attacker_charged: false, target_visible: true }

// ── Expected value funnel ─────────────────────────────────────────────────────
// Attacks: 5 × A2 = 10
// Hits:    10 × 4/6 (BS3+) = 6.67
// Wounds:  6.67 × 2/6 (S4 vs T5 → 5+) = 2.22
// Unsaved: 2.22 × 5/6 (Sv5+ AP-1 → 6+) = 1.85
// Kills:   1.85 (D1, W1 per Boy)
const FUNNEL = [
  { phase: 'Attacks', expected: 10,   note: '5 × A2',       phaseIdx: 0 },
  { phase: 'Hits',    expected: 6.67, note: '10 × 4⁄6',     phaseIdx: 1 },
  { phase: 'Wounds',  expected: 2.22, note: '6.67 × 2⁄6',   phaseIdx: 2 },
  { phase: 'Unsaved', expected: 1.85, note: '2.22 × 5⁄6',   phaseIdx: 3 },
  { phase: 'Kills',   expected: 1.85, note: 'D1 · W1/model', phaseIdx: 4 },
]

// ── Steps ─────────────────────────────────────────────────────────────────────
const STEPS = [
  { label: 'The Setup',   funnelHighlight: -1, showHisto: false },
  { label: 'Attacks',     funnelHighlight: 0,  showHisto: false },
  { label: 'Hit Rolls',   funnelHighlight: 1,  showHisto: false },
  { label: 'Wound Rolls', funnelHighlight: 2,  showHisto: false },
  { label: 'Save Rolls',  funnelHighlight: 3,  showHisto: false },
  { label: 'Damage',      funnelHighlight: 4,  showHisto: false },
  { label: 'Full Result', funnelHighlight: -1, showHisto: true  },
]

// ── Shared UI ─────────────────────────────────────────────────────────────────

function Tag({ children, color = ACCENT }) {
  return (
    <div style={{ display: 'inline-flex', border: `1px solid ${color}`, padding: '4px 10px', fontFamily: 'Space Mono, monospace', fontSize: '9px', letterSpacing: '2px', textTransform: 'uppercase', color, alignSelf: 'flex-start' }}>
      {children}
    </div>
  )
}

function Body({ children }) {
  return <p style={{ fontFamily: 'Georgia, serif', fontSize: '16px', lineHeight: 1.8, color: TEXT_SEC, margin: 0 }}>{children}</p>
}

function ContinueBtn({ onClick, label = 'Continue ↓', primary = false }) {
  return (
    <button
      onClick={onClick}
      style={{ border: primary ? 'none' : `1px solid ${BORDER}`, background: primary ? ACCENT : 'transparent', color: primary ? BG : TEXT_OFF, fontFamily: 'Space Mono, monospace', fontSize: '10px', letterSpacing: '2px', textTransform: 'uppercase', fontWeight: primary ? 700 : 400, padding: '12px 24px', cursor: 'pointer', alignSelf: 'flex-start', transition: 'opacity 150ms' }}
      onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.8' }}
      onMouseLeave={(e) => { e.currentTarget.style.opacity = '1' }}
    >
      {label}
    </button>
  )
}

// ── Stat cards with per-stat highlight ───────────────────────────────────────

// highlight: array of stat keys to highlight in ACCENT
// dim:       array of stat keys to dim (non-sim stats)
function WeaponStatCard({ highlight = [], dim = [] }) {
  const stats = [
    { key: 'A',  value: '2',   label: 'Attacks' },
    { key: 'BS', value: '3+',  label: 'Ballistic Skill' },
    { key: 'S',  value: '4',   label: 'Strength' },
    { key: 'AP', value: '-1',  label: 'Armour Pen.' },
    { key: 'D',  value: '1',   label: 'Damage' },
  ]
  return (
    <div style={{ border: `1px solid ${BORDER}`, background: SURFACE }}>
      <div style={{ padding: '10px 16px', borderBottom: `1px solid ${BORDER}` }}>
        <div style={{ fontFamily: 'Space Mono, monospace', fontSize: '11px', fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: TEXT }}>Bolt Rifle</div>
        <div style={{ fontFamily: 'Space Mono, monospace', fontSize: '9px', color: TEXT_WEAK, marginTop: '3px' }}>Intercessors · Ranged</div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)' }}>
        {stats.map((s, i) => {
          const isHighlight = highlight.includes(s.key)
          const isDim       = dim.includes(s.key)
          return (
            <div key={s.key} style={{ padding: '14px 6px', borderRight: i < stats.length - 1 ? `1px solid ${BORDER}` : 'none', textAlign: 'center', transition: 'background 300ms', background: isHighlight ? 'rgba(47,224,255,0.07)' : 'transparent', opacity: isDim ? 0.3 : 1 }}>
              <div style={{ fontFamily: 'Space Mono, monospace', fontSize: '20px', fontWeight: 700, color: isHighlight ? ACCENT : TEXT_SEC, lineHeight: 1, transition: 'color 300ms' }}>{s.value}</div>
              <div style={{ fontFamily: 'Space Mono, monospace', fontSize: '8px', letterSpacing: '1px', textTransform: 'uppercase', color: isHighlight ? ACCENT : TEXT_WEAK, marginTop: '5px', transition: 'color 300ms' }}>{s.key}</div>
            </div>
          )
        })}
      </div>
      {highlight.length > 0 && (
        <div style={{ borderTop: `1px solid ${BORDER}`, display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)' }}>
          {stats.map((s, i) => {
            const isHighlight = highlight.includes(s.key)
            const isDim       = dim.includes(s.key)
            return (
              <div key={s.key} style={{ padding: '8px 6px', borderRight: i < stats.length - 1 ? `1px solid ${BORDER}` : 'none', textAlign: 'center', opacity: isDim ? 0.3 : 1 }}>
                <div style={{ fontFamily: 'Georgia, serif', fontSize: '10px', color: isHighlight ? TEXT_SEC : TEXT_OFF, lineHeight: 1.4 }}>{s.label}</div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function DefenderStatCard({ highlight = [], dim = [] }) {
  const stats = [
    { key: 'M',  value: '6"',  sim: false },
    { key: 'T',  value: '5',   sim: true  },
    { key: 'SV', value: '5+',  sim: true  },
    { key: 'W',  value: '1',   sim: true  },
    { key: 'LD', value: '6+',  sim: false },
    { key: 'OC', value: '2',   sim: false },
  ]
  return (
    <div style={{ border: `1px solid ${BORDER}`, background: SURFACE }}>
      <div style={{ padding: '10px 16px', borderBottom: `1px solid ${BORDER}` }}>
        <div style={{ fontFamily: 'Space Mono, monospace', fontSize: '11px', fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: TEXT }}>Ork Boyz</div>
        <div style={{ fontFamily: 'Space Mono, monospace', fontSize: '9px', color: TEXT_WEAK, marginTop: '3px' }}>Orks · Target unit · 10 models</div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)' }}>
        {stats.map((s, i) => {
          const isHighlight = highlight.includes(s.key)
          const isDim       = dim.includes(s.key) || !s.sim
          return (
            <div key={s.key} style={{ padding: '14px 4px', borderRight: i < stats.length - 1 ? `1px solid ${BORDER}` : 'none', textAlign: 'center', transition: 'background 300ms', background: isHighlight ? 'rgba(194,143,133,0.08)' : 'transparent', opacity: isDim && !isHighlight ? 0.25 : 1 }}>
              <div style={{ fontFamily: 'Space Mono, monospace', fontSize: '18px', fontWeight: 700, color: isHighlight ? HIGHLIGHT : s.sim ? TEXT_SEC : TEXT_WEAK, lineHeight: 1, transition: 'color 300ms' }}>{s.value}</div>
              <div style={{ fontFamily: 'Space Mono, monospace', fontSize: '8px', letterSpacing: '1px', textTransform: 'uppercase', color: isHighlight ? HIGHLIGHT : TEXT_WEAK, marginTop: '5px', transition: 'color 300ms' }}>{s.key}</div>
            </div>
          )
        })}
      </div>
      {highlight.length > 0 && (
        <div style={{ borderTop: `1px solid ${BORDER}`, padding: '8px 14px', fontFamily: 'Georgia, serif', fontSize: '11px', color: TEXT_SEC, lineHeight: 1.5 }}>
          {highlight.includes('T')  && <span>T<strong style={{ color: HIGHLIGHT }}>5</strong> — compared against weapon Strength to determine wound threshold. </span>}
          {highlight.includes('SV') && <span>Sv<strong style={{ color: HIGHLIGHT }}>5+</strong> — degraded by AP before the roll. </span>}
          {highlight.includes('W')  && <span>W<strong style={{ color: HIGHLIGHT }}>1</strong> — one unsaved wound kills one model. </span>}
        </div>
      )}
    </div>
  )
}

// ── Step content ──────────────────────────────────────────────────────────────

function StepContent({ step, onNext, onSynergies, result }) {
  const contents = [

    // Step 0 — The Setup
    (<>
      <Tag>Bolt Rifle vs Boyz</Tag>
      <h2 style={{ fontFamily: 'Space Mono, monospace', fontSize: 'clamp(16px, 2vw, 22px)', fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: TEXT, margin: 0 }}>
        The Setup
      </h2>
      <Body>
        Every attack in Warhammer 40K passes through five phases: Attacks, Hits, Wounds, Saves, Damage. We'll walk through each one using these two units.
      </Body>
      <WeaponStatCard highlight={['A', 'BS', 'S', 'AP', 'D']} />
      <div style={{ textAlign: 'center', fontFamily: 'Space Mono, monospace', fontSize: '9px', color: TEXT_OFF, letterSpacing: '2px' }}>vs</div>
      <DefenderStatCard highlight={['T', 'SV', 'W']} />
      <Body>
        The highlighted stats are the ones the simulation uses. We'll explain each one as we go through the phases.
      </Body>
      <ContinueBtn onClick={onNext} />
    </>),

    // Step 1 — Attacks
    (<>
      <Tag>Phase 1</Tag>
      <h2 style={{ fontFamily: 'Space Mono, monospace', fontSize: 'clamp(16px, 2vw, 22px)', fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: TEXT, margin: 0 }}>
        Attacks
      </h2>
      <Body>
        Each model generates a number of attack dice equal to its <strong style={{ color: ACCENT }}>A</strong> stat. With 5 Intercessors at A2, that's <strong style={{ color: TEXT }}>10 attack dice</strong> entering the combat funnel.
      </Body>
      <WeaponStatCard highlight={['A']} dim={['BS', 'S', 'AP', 'D']} />
      <Body>
        Some weapons modify this number — Blast adds dice against large units, Rapid Fire doubles at half range. The Bolt Rifle has neither: straightforward 5 × 2.
      </Body>
      <ContinueBtn onClick={onNext} />
    </>),

    // Step 2 — Hit Rolls
    (<>
      <Tag>Phase 2</Tag>
      <h2 style={{ fontFamily: 'Space Mono, monospace', fontSize: 'clamp(16px, 2vw, 22px)', fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: TEXT, margin: 0 }}>
        Hit Rolls
      </h2>
      <Body>
        Roll each attack die. You score a hit if you meet or beat the weapon's <strong style={{ color: ACCENT }}>BS</strong>. At BS3+, results 3 through 6 hit — 4 faces out of 6.
      </Body>
      <WeaponStatCard highlight={['BS']} dim={['A', 'S', 'AP', 'D']} />
      <Body>
        An unmodified <strong style={{ color: HIGHLIGHT }}>1 always misses</strong>, regardless of modifiers or buffs. Out of 10 dice, we expect <strong style={{ color: TEXT }}>≈ 6.67 hits</strong> on average.
      </Body>
      <ContinueBtn onClick={onNext} />
    </>),

    // Step 3 — Wound Rolls
    (<>
      <Tag>Phase 3</Tag>
      <h2 style={{ fontFamily: 'Space Mono, monospace', fontSize: 'clamp(16px, 2vw, 22px)', fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: TEXT, margin: 0 }}>
        Wound Rolls
      </h2>
      <Body>
        Each hit rolls again. The threshold depends on weapon <strong style={{ color: ACCENT }}>S</strong> versus defender <strong style={{ color: HIGHLIGHT }}>T</strong>.
      </Body>
      <WeaponStatCard highlight={['S']} dim={['A', 'BS', 'AP', 'D']} />
      <div style={{ textAlign: 'center', fontFamily: 'Space Mono, monospace', fontSize: '9px', color: TEXT_OFF, letterSpacing: '2px' }}>vs</div>
      <DefenderStatCard highlight={['T']} />
      <Body>
        S4 &lt; T5 → wound on a <strong style={{ color: ACCENT }}>5+</strong> (2 faces out of 6). From 6.67 hits, we expect <strong style={{ color: TEXT }}>≈ 2.22 wounds</strong>.
      </Body>
      <div style={{ border: `1px solid ${BORDER}`, background: SURFACE }}>
        {[
          { cond: 'S ≥ 2×T',  thr: '2+', active: false },
          { cond: 'S > T',    thr: '3+', active: false },
          { cond: 'S = T',    thr: '4+', active: false },
          { cond: 'S < T',    thr: '5+', active: true  },
          { cond: 'S ≤ T÷2', thr: '6+', active: false },
        ].map(({ cond, thr, active }) => (
          <div key={cond} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 14px', borderBottom: `1px solid ${BORDER}`, background: active ? 'rgba(47,224,255,0.05)' : 'transparent' }}>
            <span style={{ fontFamily: 'Space Mono, monospace', fontSize: '10px', color: active ? TEXT : TEXT_OFF }}>{cond}</span>
            <span style={{ fontFamily: 'Space Mono, monospace', fontSize: '12px', fontWeight: 700, color: active ? ACCENT : TEXT_OFF }}>Wound on {thr}</span>
          </div>
        ))}
      </div>
      <ContinueBtn onClick={onNext} />
    </>),

    // Step 4 — Save Rolls
    (<>
      <Tag>Phase 4</Tag>
      <h2 style={{ fontFamily: 'Space Mono, monospace', fontSize: 'clamp(16px, 2vw, 22px)', fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: TEXT, margin: 0 }}>
        Save Rolls
      </h2>
      <Body>
        The defender rolls to negate each wound. The armour save is degraded by the weapon's <strong style={{ color: ACCENT }}>AP</strong>.
      </Body>
      <WeaponStatCard highlight={['AP']} dim={['A', 'BS', 'S', 'D']} />
      <div style={{ textAlign: 'center', fontFamily: 'Space Mono, monospace', fontSize: '9px', color: TEXT_OFF, letterSpacing: '2px' }}>vs</div>
      <DefenderStatCard highlight={['SV']} />
      <Body>
        Sv5+ degraded by AP-1 becomes a <strong style={{ color: ACCENT }}>6+</strong> — only a natural 6 saves. That means 5 out of 6 wounds go through. From 2.22 wounds, we expect <strong style={{ color: TEXT }}>≈ 1.85 unsaved</strong>.
      </Body>
      <ContinueBtn onClick={onNext} />
    </>),

    // Step 5 — Damage
    (<>
      <Tag>Phase 5</Tag>
      <h2 style={{ fontFamily: 'Space Mono, monospace', fontSize: 'clamp(16px, 2vw, 22px)', fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: TEXT, margin: 0 }}>
        Damage
      </h2>
      <Body>
        Each unsaved wound deals <strong style={{ color: ACCENT }}>D</strong> points of damage to the target. Compare that to each model's <strong style={{ color: HIGHLIGHT }}>W</strong>.
      </Body>
      <WeaponStatCard highlight={['D']} dim={['A', 'BS', 'S', 'AP']} />
      <div style={{ textAlign: 'center', fontFamily: 'Space Mono, monospace', fontSize: '9px', color: TEXT_OFF, letterSpacing: '2px' }}>vs</div>
      <DefenderStatCard highlight={['W']} />
      <Body>
        D1 equals W1 — one unsaved wound kills one Boy. If D were higher than W, the excess damage would be <strong style={{ color: HIGHLIGHT }}>lost</strong>: overkill doesn't spill to the next model. Against W1 targets it doesn't matter, but it matters a lot on multi-wound units.
      </Body>
      <ContinueBtn onClick={onNext} />
    </>),

    // Step 6 — Full Result
    (<>
      <Tag>Full Simulation</Tag>
      <h2 style={{ fontFamily: 'Space Mono, monospace', fontSize: 'clamp(16px, 2vw, 22px)', fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: TEXT, margin: 0 }}>
        The full picture
      </h2>
      <Body>
        The expected value math gives you the average, but dice are random. The simulator runs 2000 trials and shows you the full <strong style={{ color: ACCENT }}>distribution</strong> — how often each kill count occurs.
      </Body>
      <WeaponStatCard highlight={['A', 'BS', 'S', 'AP', 'D']} />
      <div style={{ textAlign: 'center', fontFamily: 'Space Mono, monospace', fontSize: '9px', color: TEXT_OFF, letterSpacing: '2px' }}>vs</div>
      <DefenderStatCard highlight={['T', 'SV', 'W']} />
      <div style={{ padding: '16px', border: `1px solid ${ACCENT}`, background: 'rgba(47,224,255,0.04)' }}>
        <div style={{ fontFamily: 'Space Mono, monospace', fontSize: '9px', letterSpacing: '2px', textTransform: 'uppercase', color: ACCENT, marginBottom: '8px' }}>Why simulate instead of just calculating?</div>
        <p style={{ fontFamily: 'Georgia, serif', fontSize: '14px', lineHeight: 1.7, color: TEXT_SEC, margin: 0 }}>
          The expected value is the average across infinite games. Real combat involves streaks. A unit with mean ~1.85 kills can easily score zero — or wipe four models. The distribution tells you <em>how reliably</em> your shooting performs.
        </p>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <ContinueBtn onClick={onSynergies} label="Découverte des synergies →" primary />
        <span
          onClick={onNext}
          style={{ fontFamily: 'Space Mono, monospace', fontSize: '9px', letterSpacing: '2px', textTransform: 'uppercase', color: TEXT_OFF, cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: '3px', alignSelf: 'flex-start' }}
        >
          Skip to simulator
        </span>
      </div>
    </>),
  ]

  return contents[step] ?? null
}

// ── Combat funnel (right panel) ───────────────────────────────────────────────

function CombatFunnel({ activePhase }) {
  const maxVal = FUNNEL[0].expected

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
      <div style={{ fontFamily: 'Space Mono, monospace', fontSize: '9px', letterSpacing: '2px', textTransform: 'uppercase', color: TEXT_WEAK, marginBottom: '24px' }}>
        5× Intercessors · Bolt Rifle · vs 10× Boyz
      </div>
      <div style={{ fontFamily: 'Space Mono, monospace', fontSize: '9px', letterSpacing: '2px', textTransform: 'uppercase', color: TEXT_WEAK, marginBottom: '16px' }}>
        Combat funnel — expected values
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {FUNNEL.map(({ phase, expected, note, phaseIdx }) => {
          const isActive = activePhase === phaseIdx
          const isPast   = activePhase > phaseIdx
          const barWidth = `${(expected / maxVal) * 100}%`
          const color    = isActive ? ACCENT : isPast ? 'rgba(47,224,255,0.3)' : SURFACE_E
          const txtColor = isActive ? TEXT : isPast ? TEXT_SEC : TEXT_OFF

          return (
            <div key={phase}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '5px' }}>
                <span style={{ fontFamily: 'Space Mono, monospace', fontSize: '9px', letterSpacing: '1.5px', textTransform: 'uppercase', color: txtColor, transition: 'color 300ms' }}>{phase}</span>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px' }}>
                  <span style={{ fontFamily: 'Space Mono, monospace', fontSize: '9px', color: isActive || isPast ? TEXT_WEAK : TEXT_OFF }}>{note}</span>
                  <span style={{ fontFamily: 'Space Mono, monospace', fontSize: '16px', fontWeight: 700, color: isActive ? ACCENT : isPast ? TEXT_SEC : TEXT_OFF, transition: 'color 300ms' }}>
                    {expected % 1 === 0 ? expected : expected.toFixed(2)}
                  </span>
                </div>
              </div>
              <div style={{ height: '6px', background: SURFACE_E, borderRadius: '1px', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: isActive || isPast ? barWidth : '0%', background: color, transition: 'width 400ms ease, background 300ms' }} />
              </div>
            </div>
          )
        })}
      </div>

      {activePhase >= 0 && activePhase < FUNNEL.length && (
        <div style={{ marginTop: '32px', padding: '20px', border: `1px solid ${ACCENT}`, background: 'rgba(47,224,255,0.04)' }}>
          <div style={{ fontFamily: 'Space Mono, monospace', fontSize: '9px', letterSpacing: '2px', textTransform: 'uppercase', color: ACCENT, marginBottom: '8px' }}>
            {FUNNEL[activePhase].phase}
          </div>
          <div style={{ fontFamily: 'Space Mono, monospace', fontSize: '42px', fontWeight: 700, color: ACCENT, letterSpacing: '-1px', lineHeight: 1 }}>
            {FUNNEL[activePhase].expected % 1 === 0 ? FUNNEL[activePhase].expected : FUNNEL[activePhase].expected.toFixed(2)}
          </div>
          <div style={{ fontFamily: 'Space Mono, monospace', fontSize: '9px', color: TEXT_WEAK, marginTop: '8px', letterSpacing: '1.5px' }}>
            {FUNNEL[activePhase].note}
          </div>
        </div>
      )}

      {activePhase === -1 && (
        <div style={{ marginTop: '32px', fontFamily: 'Georgia, serif', fontSize: '14px', color: TEXT_SEC, lineHeight: 1.7 }}>
          Each phase filters the dice pool. We'll build this funnel one step at a time.
        </div>
      )}
    </div>
  )
}

// ── Histogram panel ───────────────────────────────────────────────────────────

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: BG, border: `1px solid ${ACCENT}`, padding: '8px 12px', fontFamily: 'Space Mono, monospace', fontSize: '9px', letterSpacing: '1.5px', color: TEXT }}>
      <div style={{ color: TEXT_WEAK, marginBottom: '3px' }}>{label} kills</div>
      <div style={{ fontWeight: 700, color: ACCENT }}>{(payload[0].value * 100).toFixed(1)}%</div>
    </div>
  )
}

function HistoPanel({ result }) {
  if (!result) return null
  const { summary, damage_histogram } = result
  const maxProb = Math.max(...damage_histogram.map((b) => b.probability))
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
      <div style={{ fontFamily: 'Space Mono, monospace', fontSize: '9px', letterSpacing: '2px', textTransform: 'uppercase', color: TEXT_WEAK, marginBottom: '20px' }}>
        5× Intercessors · Bolt Rifle · vs 10× Boyz
      </div>
      <div style={{ marginBottom: '16px', display: 'flex', alignItems: 'flex-end', gap: '24px' }}>
        <div>
          <div style={{ fontFamily: 'Space Mono, monospace', fontWeight: 700, fontSize: 'clamp(48px, 5vw, 72px)', lineHeight: 1, letterSpacing: '-2px', color: HIGHLIGHT }}>
            {summary.mean_damage.toFixed(2)}
          </div>
          <div style={{ fontFamily: 'Space Mono, monospace', fontSize: '9px', letterSpacing: '2px', textTransform: 'uppercase', color: TEXT_WEAK, marginTop: '8px' }}>
            Mean kills
          </div>
        </div>
        {result.kill_probabilities?.['1'] != null && (
          <div style={{ paddingBottom: '4px' }}>
            <div style={{ fontFamily: 'Space Mono, monospace', fontWeight: 700, fontSize: 'clamp(32px, 3.5vw, 52px)', lineHeight: 1, letterSpacing: '-1px', color: ACCENT }}>
              {(result.kill_probabilities['1'] * 100).toFixed(0)}%
            </div>
            <div style={{ fontFamily: 'Space Mono, monospace', fontSize: '9px', letterSpacing: '2px', textTransform: 'uppercase', color: TEXT_WEAK, marginTop: '8px' }}>
              At least 1 kill
            </div>
          </div>
        )}
      </div>
      <div style={{ borderTop: `1px solid ${BORDER}`, marginBottom: '12px' }} />
      {[
        ['Median',  summary.median_damage],
        ['Std dev', summary.std_dev.toFixed(2)],
        ['P10—P90', `${summary.p10} — ${summary.p90}`],
      ].map(([l, v]) => (
        <div key={l} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: `1px solid ${BORDER}` }}>
          <span style={{ fontFamily: 'Space Mono, monospace', fontSize: '9px', letterSpacing: '1.5px', textTransform: 'uppercase', color: TEXT_WEAK }}>{l}</span>
          <span style={{ fontFamily: 'Space Mono, monospace', fontSize: '12px', fontWeight: 700, color: TEXT_SEC }}>{v}</span>
        </div>
      ))}
      <div style={{ borderTop: `1px solid ${BORDER}`, margin: '14px 0 10px' }} />
      <div style={{ fontFamily: 'Space Mono, monospace', fontSize: '8px', letterSpacing: '2.5px', textTransform: 'uppercase', color: TEXT_WEAK, marginBottom: '10px' }}>
        Kill distribution (2000 trials)
      </div>
      <ResponsiveContainer width="100%" height={140}>
        <BarChart data={damage_histogram} margin={{ top: 0, right: 0, bottom: 0, left: -20 }} barCategoryGap="18%">
          <XAxis dataKey="damage" tick={{ fill: TEXT_WEAK, fontSize: 8, fontFamily: 'Space Mono, monospace' }} tickLine={{ stroke: BORDER }} axisLine={{ stroke: BORDER }} />
          <YAxis tickFormatter={(v) => `${(v * 100).toFixed(0)}%`} tick={{ fill: TEXT_WEAK, fontSize: 8, fontFamily: 'Space Mono, monospace' }} tickLine={{ stroke: BORDER }} axisLine={{ stroke: BORDER }} />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(47,224,255,0.04)' }} />
          <Bar dataKey="probability" radius={0} isAnimationActive animationDuration={350}>
            {damage_histogram.map((entry) => (
              <Cell key={entry.damage} fill={entry.probability === maxProb ? HIGHLIGHT : ACCENT} opacity={entry.probability === maxProb ? 0.9 : 0.45} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

// ── Progress bar ──────────────────────────────────────────────────────────────

function ProgressBar({ total, active }) {
  return (
    <div style={{ display: 'flex', height: '3px', background: SURFACE_E, gap: '2px' }}>
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} style={{ flex: 1, background: i <= active ? ACCENT : 'transparent', transition: 'background 300ms' }} />
      ))}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export function LearnPage() {
  const navigate = useNavigate()

  const [activeStep, setActiveStep] = useState(0)
  const sectionRefs = useRef([])

  const result = useMemo(() => simulate({
    attacks: [{ models: 5, weapon: ATTACKER_WEAPON, buffs: [] }],
    defender: DEFENDER,
    context: CONTEXT,
    n_trials: 2000,
  }), [])

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
  }, [])

  const scrollToStep = useCallback((i) => {
    sectionRefs.current[i]?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [])

  function handleNext(i) {
    if (i < STEPS.length - 1) {
      scrollToStep(i + 1)
    } else {
      localStorage.setItem('ph_onboarding_done', 'true')
      navigate('/')
    }
  }

  function handleSynergies() {
    localStorage.setItem('ph_onboarding_done', 'true')
    localStorage.setItem('ph_level', 'intermediate')
    window.scrollTo(0, 0)
    navigate('/onboarding')
  }

  function handleSkip() {
    localStorage.setItem('ph_onboarding_done', 'true')
    navigate('/')
  }

  const currentStep = STEPS[activeStep]

  return (
    <div style={{ minHeight: '100vh', background: BG, display: 'flex', flexDirection: 'column' }}>

      {/* Top bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px', borderBottom: `1px solid ${BORDER}`, height: '52px', flexShrink: 0, position: 'sticky', top: 0, zIndex: 10, background: BG }}>
        <div style={{ fontFamily: 'Space Mono, monospace', fontSize: '12px', fontWeight: 700, letterSpacing: '3px', color: ACCENT }}>
          PROB<span style={{ opacity: 0.4 }}>'</span>HAMMER
        </div>
        <div style={{ fontFamily: 'Space Mono, monospace', fontSize: '9px', letterSpacing: '2px', color: TEXT_WEAK }}>
          {activeStep + 1} / {STEPS.length}
        </div>
        <span onClick={handleSkip} style={{ fontFamily: 'Space Mono, monospace', fontSize: '9px', letterSpacing: '2px', textTransform: 'uppercase', color: TEXT_OFF, cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: '3px' }}>
          Skip
        </span>
      </div>

      <ProgressBar total={STEPS.length} active={activeStep} />

      {/* Two-column layout */}
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', alignItems: 'start' }}>

        {/* Left — scrollable sections */}
        <div style={{ borderRight: `1px solid ${BORDER}` }}>
          {STEPS.map((_, i) => (
            <section
              key={i}
              ref={(el) => { sectionRefs.current[i] = el }}
              style={{ minHeight: 'calc(100vh - 55px)', padding: '56px 48px', display: 'flex', flexDirection: 'column', gap: '20px', justifyContent: 'center', borderBottom: i < STEPS.length - 1 ? `1px solid ${BORDER}` : 'none' }}
            >
              <StepContent step={i} onNext={() => handleNext(i)} onSynergies={handleSynergies} result={result} />
            </section>
          ))}
        </div>

        {/* Right — sticky panel */}
        <div style={{ position: 'sticky', top: '55px', height: 'calc(100vh - 55px)', padding: '40px', overflowY: 'auto' }}>
          {currentStep.showHisto
            ? <HistoPanel result={result} />
            : <CombatFunnel activePhase={currentStep.funnelHighlight} />
          }
        </div>
      </div>
    </div>
  )
}

import { useMemo, useState, useRef, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { simulate } from '../engine/simulation.js'
import {
  ACCENT, BG, BORDER, HIGHLIGHT, SURFACE, SURFACE_E,
  TEXT, TEXT_SEC, TEXT_WEAK, TEXT_OFF,
} from '../theme'

// ── Simulation configs ────────────────────────────────────────────────────────

const DEFENDER        = { toughness: 11, save: 3, invuln: 4,    wounds: 14, models: 1, fnp: null }
const DEFENDER_NO_INV = { toughness: 11, save: 3, invuln: null, wounds: 14, models: 1, fnp: null }
const CONTEXT   = { cover: false, half_range: false, attacker_moved: false, attacker_charged: false, target_visible: true }
const NO_KW     = []
const LETHAL    = [{ type: 'LETHAL_HITS' }]

// 1× Marshal, Master-crafted Power Weapon, no keywords
const SIM_BASE_1SB = {
  attacks: [{ models: 1, weapon: { attacks: '3', skill: 2, strength: 5, ap: -2, damage: '2', keywords: NO_KW }, buffs: [] }],
  defender: DEFENDER, context: CONTEXT, n_trials: 2000,
}

// Same, Maleceptor without invuln save — page 1
const SIM_BASE_NO_INV = {
  attacks: [{ models: 1, weapon: { attacks: '3', skill: 2, strength: 5, ap: -2, damage: '2', keywords: NO_KW }, buffs: [] }],
  defender: DEFENDER_NO_INV, context: CONTEXT, n_trials: 2000,
}

// Same weapon, -1 to hit from Encephalic Diffusion aura — page 3
const SIM_AURA = {
  attacks: [{ models: 1, weapon: { attacks: '3', skill: 2, strength: 5, ap: -2, damage: '2', keywords: NO_KW }, buffs: [{ type: 'HIT_MODIFIER', value: -1 }] }],
  defender: DEFENDER, context: CONTEXT, n_trials: 2000,
}

// 1× Marshal, Lethal Hits + aura −1 hit — page 4
const SIM_LETHAL_AURA = {
  attacks: [{ models: 1, weapon: { attacks: '3', skill: 2, strength: 5, ap: -2, damage: '2', keywords: LETHAL }, buffs: [{ type: 'HIT_MODIFIER', value: -1 }] }],
  defender: DEFENDER, context: CONTEXT, n_trials: 2000,
}

// Legacy key kept for intermediate mode
const SIM_LETHAL_1SB = {
  attacks: [{ models: 1, weapon: { attacks: '3', skill: 2, strength: 5, ap: -2, damage: '2', keywords: LETHAL }, buffs: [] }],
  defender: DEFENDER, context: CONTEXT, n_trials: 2000,
}

// Full squad (4 SB + Castellan A6 + Marshal A7), cumulative buffs — pages 5+
// aura −1 hit always active; WOUND_MODIFIER omitted: Accept Any Challenge +1 wound is
// cancelled by Encephalic Diffusion −1 wound (below half-strength) → net 6+ wound throughout
// simIdx 0 = squad base, 1 = (wound stays 6+), 2 = +1A marshal, 3 = reroll, 4 = crit5
function buildFullAttacks(simIdx) {
  const buffs = [{ type: 'HIT_MODIFIER', value: -1 }]
  if (simIdx >= 3) buffs.push({ type: 'REROLL_HITS', value: 'all' })
  if (simIdx >= 4) buffs.push({ type: 'CRITICAL_HIT_ON', value: 5 })
  return [
    { models: 4, weapon: { attacks: '3', skill: 2, strength: 5, ap: -2, damage: '2', keywords: LETHAL }, buffs: [...buffs] },
    { models: 1, weapon: { attacks: '6', skill: 2, strength: 5, ap: -2, damage: '2', keywords: LETHAL }, buffs: [...buffs] },
    { models: 1, weapon: { attacks: simIdx >= 2 ? '8' : '7', skill: 2, strength: 5, ap: -2, damage: '2', keywords: LETHAL }, buffs: [...buffs] },
  ]
}

// ── Step definitions ──────────────────────────────────────────────────────────

// panelType: 'simple' = mean damage only | 'full' = histogram + stats
// resultKey: key into the precomputed results map
const BEGINNER_STEPS = [
  { label: 'Weapon Stats',    panelType: 'full', resultKey: 'base_no_inv' },
  { label: 'Defender Stats',  panelType: 'full', resultKey: 'base_no_inv' },
  { label: 'Invuln. Save',         panelType: 'full', resultKey: 'base' },
  { label: 'Encephalic Diffusion', panelType: 'full', resultKey: 'base_aura' },
  { label: 'Lethal Hits',          panelType: 'full',   resultKey: 'lethal_aura' },
  { label: 'The Squad',            panelType: 'full',   resultKey: 'squad_base' },
  { label: 'Accept Any Challenge',  panelType: 'full',   resultKey: 'full0' },
  { label: 'Marshal +1A',          panelType: 'full',   resultKey: 'full1' },
  { label: 'Re-roll Hits',         panelType: 'full',   resultKey: 'full2' },
  { label: 'Critical Hit 5+',      panelType: 'full',   resultKey: 'full3' },
]

const INTERMEDIATE_STEPS = [
  { label: 'Setup',           panelType: 'simple', resultKey: 'base' },
  { label: 'Lethal Hits',     panelType: 'full',   resultKey: 'lethal' },
  { label: 'Wound +1',        panelType: 'full',   resultKey: 'full0' },
  { label: 'Marshal +1A',     panelType: 'full',   resultKey: 'full1' },
  { label: 'Re-roll Hits',    panelType: 'full',   resultKey: 'full2' },
  { label: 'Critical Hit 5+', panelType: 'full',   resultKey: 'full3' },
]

// ── Shared UI ─────────────────────────────────────────────────────────────────

function Tag({ children, color = ACCENT }) {
  return (
    <div style={{ display: 'inline-flex', border: `1px solid ${color}`, padding: '4px 10px', fontFamily: 'Space Mono, monospace', fontSize: '10px', letterSpacing: '2px', textTransform: 'uppercase', color, alignSelf: 'flex-start' }}>
      {children}
    </div>
  )
}

function Body({ children }) {
  return <p style={{ fontFamily: 'Georgia, serif', fontSize: '16px', lineHeight: 1.8, color: TEXT_SEC, margin: 0 }}>{children}</p>
}

function ContinueBtn({ onClick, label = 'Continue ↓', primary = false }) {
  const [hov, setHov] = useState(false)
  // Non-primary buttons are replaced by the fixed round button
  if (!primary) return null
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background: hov ? ACCENT : 'transparent',
        border: `1px solid ${ACCENT}`,
        color: hov ? BG : ACCENT,
        fontFamily: 'Space Mono, monospace', fontSize: '10px',
        letterSpacing: '2px', textTransform: 'uppercase', fontWeight: 700,
        padding: '14px 32px', cursor: 'pointer', alignSelf: 'flex-start',
        transition: 'background 160ms ease, color 160ms ease',
      }}
    >
      {label}
    </button>
  )
}

// ── Weapon stat card ──────────────────────────────────────────────────────────

function WeaponCard() {
  const stats = [
    { key: 'A',  value: '3',   label: 'Attacks',      desc: 'Roll 3 dice to attack' },
    { key: 'WS', value: '2+',  label: 'Weapon Skill', desc: 'Need 2+ to score a hit' },
    { key: 'S',  value: '5',   label: 'Strength',     desc: 'Compared to Toughness' },
    { key: 'AP', value: '-2',  label: 'Armour Pen.',  desc: 'Cuts armour save by 2' },
    { key: 'D',  value: '2',   label: 'Damage',       desc: 'Wounds dealt per hit' },
  ]
  return (
    <div style={{ border: `1px solid ${BORDER}`, background: SURFACE }}>
      <div style={{ padding: '12px 16px', borderBottom: `1px solid ${BORDER}` }}>
        <div style={{ fontFamily: 'Space Mono, monospace', fontSize: '11px', fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: TEXT }}>Master-crafted Power Weapon</div>
        <div style={{ fontFamily: 'Space Mono, monospace', fontSize: '10px', color: TEXT_WEAK, marginTop: '3px' }}>Sword Brethren · melee</div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)' }}>
        {stats.map((s, i) => (
          <div key={s.key} style={{ padding: '14px 8px', borderRight: i < 4 ? `1px solid ${BORDER}` : 'none', textAlign: 'center' }}>
            <div style={{ fontFamily: 'Space Mono, monospace', fontSize: '20px', fontWeight: 700, color: ACCENT, lineHeight: 1 }}>{s.value}</div>
            <div style={{ fontFamily: 'Space Mono, monospace', fontSize: '8px', letterSpacing: '1px', textTransform: 'uppercase', color: TEXT_WEAK, marginTop: '5px' }}>{s.key}</div>
          </div>
        ))}
      </div>
      <div style={{ borderTop: `1px solid ${BORDER}`, display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)' }}>
        {stats.map((s, i) => (
          <div key={s.key} style={{ padding: '8px', borderRight: i < 4 ? `1px solid ${BORDER}` : 'none', textAlign: 'center' }}>
            <div style={{ fontFamily: 'Georgia, serif', fontSize: '11px', color: TEXT_SEC, lineHeight: 1.4 }}>{s.desc}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Defender stat card ────────────────────────────────────────────────────────

function DefenderCard({ showInvuln = true }) {
  const allStats = [
    { key: 'M',   value: '8"',  sim: false, desc: '' },
    { key: 'T',   value: '11',  sim: true,  desc: 'Harder to wound' },
    { key: 'SV',  value: '3+',  sim: true,  desc: 'Roll to ignore wound' },
    { key: 'W',   value: '14',  sim: true,  desc: 'HP — wounds to kill' },
    { key: 'LD',  value: '7+',  sim: false, desc: '' },
    { key: 'OC',  value: '4',   sim: false, desc: '' },
    { key: 'INV', value: '4++', sim: true,  inv: true, desc: 'Not affected by AP' },
  ]
  const stats = showInvuln ? allStats : allStats.filter((s) => s.key !== 'INV')
  const cols = stats.length

  function valueColor(s) {
    if (!s.sim) return TEXT_WEAK
    if (s.inv)  return ACCENT
    return HIGHLIGHT
  }

  return (
    <div style={{ border: `1px solid ${BORDER}`, background: SURFACE }}>
      <div style={{ padding: '12px 16px', borderBottom: `1px solid ${BORDER}` }}>
        <div style={{ fontFamily: 'Space Mono, monospace', fontSize: '11px', fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: TEXT }}>Maleceptor</div>
        <div style={{ fontFamily: 'Space Mono, monospace', fontSize: '10px', color: TEXT_WEAK, marginTop: '3px' }}>Target — Tyranids</div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
        {stats.map((s, i) => (
          <div key={s.key} style={{ padding: '14px 8px', borderRight: i < cols - 1 ? `1px solid ${BORDER}` : 'none', textAlign: 'center', opacity: s.sim ? 1 : 0.35 }}>
            <div style={{ fontFamily: 'Space Mono, monospace', fontSize: '18px', fontWeight: 700, color: valueColor(s), lineHeight: 1 }}>{s.value}</div>
            <div style={{ fontFamily: 'Space Mono, monospace', fontSize: '8px', letterSpacing: '1px', textTransform: 'uppercase', color: TEXT_WEAK, marginTop: '5px' }}>{s.key}</div>
          </div>
        ))}
      </div>
      <div style={{ borderTop: `1px solid ${BORDER}`, display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
        {stats.map((s, i) => (
          <div key={s.key} style={{ padding: '8px', borderRight: i < cols - 1 ? `1px solid ${BORDER}` : 'none', textAlign: 'center', opacity: s.sim ? 1 : 0.35 }}>
            <div style={{ fontFamily: 'Georgia, serif', fontSize: '11px', color: TEXT_SEC, lineHeight: 1.4 }}>{s.desc || '—'}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Left panel content per step ───────────────────────────────────────────────

function StepContent({ stepKey, onNext, results }) {
  const content = {

    'beginner-0': (<>
      <Tag>Sword Brethren · Master-crafted Power Weapon</Tag>
      <h2 style={{ fontFamily: 'Space Mono, monospace', fontSize: 'clamp(16px, 2vw, 22px)', fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: TEXT, margin: 0 }}>
        Understanding weapon stats
      </h2>
      <Body>
        Every weapon has five core stats. This is a Sword Brethren's Master-crafted Power Weapon — the one we'll use throughout this example, for now without any keyword.
      </Body>
      <WeaponCard />
      <Body>
        These five numbers alone drive the base output. On the right, the mean damage against our target with just these stats.
      </Body>
      <ContinueBtn onClick={onNext} />
    </>),

    'beginner-1': (<>
      <Tag>Maleceptor</Tag>
      <h2 style={{ fontFamily: 'Space Mono, monospace', fontSize: 'clamp(16px, 2vw, 22px)', fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: TEXT, margin: 0 }}>
        Defensive stats
      </h2>
      <Body>
        Every defender has stats that resist incoming damage. The highlighted ones are what the simulation uses.
      </Body>
      <DefenderCard showInvuln={false} />
      <Body>
        Our AP-2 turns its <strong style={{ color: TEXT }}>3+ save</strong> into a <strong style={{ color: HIGHLIGHT }}>5+</strong>. With S5 vs T11, we wound on a <strong style={{ color: HIGHLIGHT }}>6+</strong> — only 1 in 6 wounds land. The right panel shows the damage with just these stats.
      </Body>
      <ContinueBtn onClick={onNext} />
    </>),

    'beginner-2': (<>
      <Tag>Maleceptor</Tag>
      <h2 style={{ fontFamily: 'Space Mono, monospace', fontSize: 'clamp(16px, 2vw, 22px)', fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: TEXT, margin: 0 }}>
        Invulnerable Save
      </h2>
      <Body>
        The Maleceptor also has a <strong style={{ color: ACCENT }}>4++ invulnerable save</strong> — completely unaffected by AP. Where our AP-2 made its armour a 5+, the invuln is a flat <strong style={{ color: ACCENT }}>4+</strong>. It will always use the better one.
      </Body>
      <DefenderCard showInvuln={true} />
      <Body>
        Compare the mean damage on the right to the previous page. That drop is the 4++ alone.
      </Body>
      <ContinueBtn onClick={onNext} />
    </>),

    'beginner-3': (<>
      <Tag>Maleceptor · Aura · Psychic</Tag>
      <h2 style={{ fontFamily: 'Space Mono, monospace', fontSize: 'clamp(16px, 2vw, 22px)', fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: TEXT, margin: 0 }}>
        Encephalic Diffusion
      </h2>
      <Body>
        While within 6" of the Maleceptor, every attacker subtracts <strong style={{ color: HIGHLIGHT }}>−1 from their Hit roll</strong>. Our WS2+ effectively becomes a <strong style={{ color: HIGHLIGHT }}>3+</strong> — one extra miss per six dice on average.
      </Body>
      <Body>
        If our unit were below half-strength, there would also be <strong style={{ color: HIGHLIGHT }}>−1 to wound</strong>. S5 vs T11 already wounds on a <strong style={{ color: TEXT }}>6+</strong> — a −1 would require a 7+, making normal wounding <strong style={{ color: HIGHLIGHT }}>impossible</strong>. This is exactly why Lethal Hits matters: a critical 6 to hit auto-wounds, bypassing the wound roll entirely.
      </Body>
      <ContinueBtn onClick={onNext} />
    </>),

    'beginner-4': (<>
      <Tag>Weapon keyword</Tag>
      <h2 style={{ fontFamily: 'Space Mono, monospace', fontSize: 'clamp(16px, 2vw, 22px)', fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: TEXT, margin: 0 }}>
        Lethal Hits
      </h2>
      <Body>
        The Master-crafted Power Weapon has <strong style={{ color: TEXT }}>Lethal Hits</strong>. Any unmodified hit roll of <strong style={{ color: ACCENT }}>6</strong> automatically wounds — no wound roll needed. The target still makes their save normally.
      </Body>
      <Body>
        The aura still penalizes us to <strong style={{ color: HIGHLIGHT }}>3+</strong> to hit. But a natural 6 skips the T11 wound roll entirely — the 4++ save still applies. Watch the damage recover.
      </Body>
      <ContinueBtn onClick={onNext} />
    </>),

    'beginner-5': (<>
      <Tag>Black Templars · Sword Brethren</Tag>
      <h2 style={{ fontFamily: 'Space Mono, monospace', fontSize: 'clamp(16px, 2vw, 22px)', fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: TEXT, margin: 0 }}>
        The full squad
      </h2>
      <Body>
        Our Sword Brethren doesn't fight alone. Three brothers join in, plus a Castellan and a Marshal — 6 models total, all with Lethal Hits, all under the aura.
      </Body>
      <div style={{ border: `1px solid ${BORDER}`, background: SURFACE }}>
        {[
          { unit: '4× Sword Brethren', profile: 'A3  WS2+  S5  AP-2  D2' },
          { unit: '1× Castellan',      profile: 'A6  WS2+  S5  AP-2  D2' },
          { unit: '1× Marshal',        profile: 'A7  WS2+  S5  AP-2  D2' },
        ].map(({ unit, profile }, i, arr) => (
          <div key={unit} style={{ display: 'grid', gridTemplateColumns: '1fr auto', padding: '10px 14px', borderBottom: i < arr.length - 1 ? `1px solid ${BORDER}` : 'none', alignItems: 'center' }}>
            <span style={{ fontFamily: 'Space Mono, monospace', fontSize: '10px', fontWeight: 700, color: TEXT }}>{unit}</span>
            <span style={{ fontFamily: 'Space Mono, monospace', fontSize: '10px', color: TEXT_WEAK }}>{profile}</span>
          </div>
        ))}
        <div style={{ padding: '8px 14px', borderTop: `1px solid ${BORDER}`, fontFamily: 'Space Mono, monospace', fontSize: '10px', color: ACCENT, letterSpacing: '1.5px' }}>
          All carry Lethal Hits · −1 to hit (aura)
        </div>
      </div>
      <Body>
        Six dice pools hitting in parallel. The damage jump on the right shows the raw power of the full squad before any synergies.
      </Body>
      <ContinueBtn onClick={onNext} />
    </>),

    'beginner-6': (<>
      <Tag color={ACCENT}>Accept Any Challenge, No Matter the Odds</Tag>
      <h2 style={{ fontFamily: 'Space Mono, monospace', fontSize: 'clamp(16px, 2vw, 22px)', fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: TEXT, margin: 0 }}>
        A buff that cancels out
      </h2>
      <Body>
        The ability reads: when <strong style={{ color: TEXT }}>S ≤ T</strong>, add +1 to wound. S5 vs T11 always triggers it — our 6+ would become a <strong style={{ color: ACCENT }}>5+</strong>. One extra wound chance per die.
      </Body>
      <Body>
        But Encephalic Diffusion has a second clause: while the attacker is <strong style={{ color: HIGHLIGHT }}>below half-strength</strong>, also apply −1 to wound. Our unit qualifies. The two modifiers cancel exactly.
      </Body>
      <div style={{ border: `1px solid ${BORDER}`, background: SURFACE }}>
        <div style={{ padding: '10px 14px', borderBottom: `1px solid ${BORDER}`, fontFamily: 'Space Mono, monospace', fontSize: '10px', letterSpacing: '2px', textTransform: 'uppercase', color: TEXT_WEAK }}>Wound modifiers — this matchup</div>
        {[
          { rule: 'Accept Any Challenge', mod: '+1 to wound', color: ACCENT },
          { rule: 'Encephalic Diffusion (< half-strength)', mod: '−1 to wound', color: HIGHLIGHT },
          { rule: 'Net result', mod: 'still 6+', color: TEXT },
        ].map(({ rule, mod, color }, i, arr) => (
          <div key={rule} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', borderBottom: i < arr.length - 1 ? `1px solid ${BORDER}` : 'none', gap: '8px' }}>
            <span style={{ fontFamily: 'Georgia, serif', fontSize: '13px', color: TEXT_SEC }}>{rule}</span>
            <span style={{ fontFamily: 'Space Mono, monospace', fontSize: '12px', fontWeight: 700, color, flexShrink: 0 }}>{mod}</span>
          </div>
        ))}
      </div>
      <Body>
        The graph on the right is intentionally the same as the previous page. This is a key insight for list-building: two rules that look like gains can cancel each other in a specific matchup.
      </Body>
      <ContinueBtn onClick={onNext} />
    </>),

    'beginner-7': (<>
      <Tag color={ACCENT}>Marshal · Master-Crafted Power Weapon</Tag>
      <h2 style={{ fontFamily: 'Space Mono, monospace', fontSize: 'clamp(16px, 2vw, 22px)', fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: TEXT, margin: 0 }}>
        Marshal bonus attacks
      </h2>
      <Body>
        The Marshal's weapon gains <strong style={{ color: ACCENT }}>+1 Attack</strong> per enemy unit within 6" (max +3). One enemy unit here: Marshal goes from A7 to <strong style={{ color: TEXT }}>A8</strong>.
      </Body>
      <Body>
        D2 per hit means that extra attack carries double the weight of a standard swing.
      </Body>
      <ContinueBtn onClick={onNext} />
    </>),

    'beginner-8': (<>
      <Tag color={ACCENT}>Castellan aura</Tag>
      <h2 style={{ fontFamily: 'Space Mono, monospace', fontSize: 'clamp(16px, 2vw, 22px)', fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: TEXT, margin: 0 }}>
        Re-roll hit rolls
      </h2>
      <Body>
        The Castellan's aura lets every model <strong style={{ color: TEXT }}>re-roll their hit roll</strong>. A 1 or 2 gets a second chance. The −1 aura still applies to the re-roll, so only a 3+ saves the die — but that re-rolled die can land a natural 6.
      </Body>
      <div style={{ border: `1px solid ${BORDER}`, background: SURFACE }}>
        <div style={{ padding: '10px 14px', borderBottom: `1px solid ${BORDER}`, fontFamily: 'Space Mono, monospace', fontSize: '10px', letterSpacing: '2px', textTransform: 'uppercase', color: TEXT_WEAK }}>Per attack — WS3+ effective · crit on 6 only · re-rolls active</div>
        {[
          { outcome: 'Miss (1–2, then 1–2 again)', prob: '≈ 11%', note: 'No damage', color: TEXT_WEAK },
          { outcome: 'Normal hit (3–5)', prob: '≈ 67%', note: '6+ wound → 4++ save → 2 dmg', color: TEXT_SEC },
          { outcome: 'Lethal crit (6)', prob: '≈ 22%', note: 'Auto-wound · 4++ save → 2 dmg', color: ACCENT },
        ].map(({ outcome, prob, note, color }, i, arr) => (
          <div key={outcome} style={{ padding: '10px 14px', borderBottom: i < arr.length - 1 ? `1px solid ${BORDER}` : 'none', display: 'flex', justifyContent: 'space-between', gap: '8px', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontFamily: 'Georgia, serif', fontSize: '13px', color: TEXT_SEC }}>{outcome}</div>
              <div style={{ fontFamily: 'Space Mono, monospace', fontSize: '10px', color: TEXT_WEAK, marginTop: '3px' }}>{note}</div>
            </div>
            <span style={{ fontFamily: 'Space Mono, monospace', fontSize: '12px', fontWeight: 700, color, flexShrink: 0 }}>{prob}</span>
          </div>
        ))}
      </div>
      <Body>
        Re-rolls lift the lethal crit rate from 1-in-6 to roughly 1-in-4.5. Every extra 6 skips the T11 wound roll — the 4++ save still applies, but avoiding the wound roll alone is a significant gain against T11.
      </Body>
      <ContinueBtn onClick={onNext} />
    </>),

    'beginner-9': (<>
      <Tag color={ACCENT}>Marshal aura</Tag>
      <h2 style={{ fontFamily: 'Space Mono, monospace', fontSize: 'clamp(16px, 2vw, 22px)', fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: TEXT, margin: 0 }}>
        Critical Hit on 5+
      </h2>
      <Body>
        The Marshal extends the Lethal Hits trigger: an unmodified <strong style={{ color: ACCENT }}>5 or 6</strong> scores a Critical Hit — auto-wounding, no wound roll needed. The target still rolls their save.
      </Body>
      <div style={{ border: `1px solid ${BORDER}`, background: SURFACE }}>
        <div style={{ padding: '10px 14px', borderBottom: `1px solid ${BORDER}`, fontFamily: 'Space Mono, monospace', fontSize: '10px', letterSpacing: '2px', textTransform: 'uppercase', color: TEXT_WEAK }}>Per attack — WS3+ effective · crit 5+ · re-rolls active</div>
        {[
          { outcome: 'Miss (1–2, then 1–2 again)', prob: '≈ 11%', note: 'No damage', color: TEXT_WEAK },
          { outcome: 'Normal hit (3–4)', prob: '≈ 44%', note: '6+ wound → 4++ save → 2 dmg', color: TEXT_SEC },
          { outcome: 'Lethal crit (5 or 6)', prob: '≈ 44%', note: 'Auto-wound · 4++ save → 2 dmg', color: ACCENT },
        ].map(({ outcome, prob, note, color }, i, arr) => (
          <div key={outcome} style={{ padding: '10px 14px', borderBottom: i < arr.length - 1 ? `1px solid ${BORDER}` : 'none', display: 'flex', justifyContent: 'space-between', gap: '8px', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontFamily: 'Georgia, serif', fontSize: '13px', color: TEXT_SEC }}>{outcome}</div>
              <div style={{ fontFamily: 'Space Mono, monospace', fontSize: '10px', color: TEXT_WEAK, marginTop: '3px' }}>{note}</div>
            </div>
            <span style={{ fontFamily: 'Space Mono, monospace', fontSize: '12px', fontWeight: 700, color, flexShrink: 0 }}>{prob}</span>
          </div>
        ))}
      </div>
      <div style={{ border: `1px solid ${BORDER}`, background: SURFACE }}>
        <div style={{ padding: '10px 14px', borderBottom: `1px solid ${BORDER}`, fontFamily: 'Space Mono, monospace', fontSize: '10px', letterSpacing: '2px', textTransform: 'uppercase', color: TEXT_WEAK }}>Attack volume — 26 total</div>
        {[
          { unit: '4× Sword Brethren', formula: '3A × 4', total: '12 attacks' },
          { unit: '1× Castellan',      formula: '6A',     total: '6 attacks' },
          { unit: '1× Marshal',        formula: '8A (+1A)', total: '8 attacks' },
        ].map(({ unit, formula, total }, i, arr) => (
          <div key={unit} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 14px', borderBottom: i < arr.length - 1 ? `1px solid ${BORDER}` : 'none', gap: '8px' }}>
            <span style={{ fontFamily: 'Space Mono, monospace', fontSize: '10px', color: TEXT_SEC }}>{unit}</span>
            <span style={{ fontFamily: 'Space Mono, monospace', fontSize: '10px', color: TEXT_WEAK }}>{formula}</span>
            <span style={{ fontFamily: 'Space Mono, monospace', fontSize: '10px', fontWeight: 700, color: TEXT }}>{total}</span>
          </div>
        ))}
        <div style={{ padding: '8px 14px', fontFamily: 'Space Mono, monospace', fontSize: '10px', color: TEXT_WEAK, borderTop: `1px solid ${BORDER}` }}>
          Normal hits still need a 6+ to wound, then a 4++ save.
          Crits skip the wound roll — the 4++ save still applies.
        </div>
      </div>
      <div style={{ padding: '16px', border: `1px solid ${ACCENT}`, background: 'rgba(47,224,255,0.04)' }}>
        <div style={{ fontFamily: 'Space Mono, monospace', fontSize: '10px', letterSpacing: '2px', textTransform: 'uppercase', color: ACCENT, marginBottom: '8px' }}>Full synergy — per attack die</div>
        <p style={{ fontFamily: 'Georgia, serif', fontSize: '14px', lineHeight: 1.7, color: TEXT_SEC, margin: 0 }}>
          1 attack die with no rules: <strong style={{ color: TEXT }}>{results?.single_base?.summary.mean_damage.toFixed(2)}</strong> mean damage.{' '}
          Same die with all five rules: <strong style={{ color: HIGHLIGHT }}>{results?.single_full?.summary.mean_damage.toFixed(2)}</strong> — a{' '}
          <strong style={{ color: ACCENT }}>
            +{results?.single_base && results?.single_full ? (((results.single_full.summary.mean_damage / results.single_base.summary.mean_damage) - 1) * 100).toFixed(0) : '?'}%
          </strong> increase per die.
        </p>
      </div>
      <ContinueBtn onClick={onNext} label="Open simulator →" primary />
    </>),

    'intermediate-0': (<>
      <Tag>Black Templars vs Abaddon</Tag>
      <h2 style={{ fontFamily: 'Space Mono, monospace', fontSize: 'clamp(16px, 2vw, 22px)', fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: TEXT, margin: 0 }}>
        The setup
      </h2>
      <Body>
        6 Black Templars — 4 Sword Brethren, 1 Castellan, 1 Marshal — all with Power Swords (S5 AP-3, Lethal Hits). Target: Abaddon the Despoiler (T5 Sv2+ 4++ W22).
      </Body>
      <div style={{ display: 'flex', flexDirection: 'column', border: `1px solid ${BORDER}` }}>
        {[
          ['4× Sword Brethren', 'A2 WS3+ S5 AP-3 D1', 'Lethal Hits'],
          ['1× Castellan',      'A4 WS2+ S5 AP-3 D1', 'Lethal Hits · re-roll hits aura'],
          ['1× Marshal',        'A5 WS2+ S5 AP-3 D2', 'Lethal Hits · Crit Hit 5+ aura'],
        ].map(([unit, profile, kw], i) => (
          <div key={i} style={{ padding: '10px 14px', borderBottom: i < 2 ? `1px solid ${BORDER}` : 'none' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontFamily: 'Space Mono, monospace', fontSize: '10px', fontWeight: 700, color: TEXT }}>{unit}</span>
              <span style={{ fontFamily: 'Space Mono, monospace', fontSize: '10px', color: TEXT_WEAK }}>{profile}</span>
            </div>
            <div style={{ fontFamily: 'Space Mono, monospace', fontSize: '10px', color: ACCENT, marginTop: '3px' }}>{kw}</div>
          </div>
        ))}
      </div>
      <ContinueBtn onClick={onNext} />
    </>),

    'intermediate-1': (<>
      <Tag>Weapon keyword</Tag>
      <h2 style={{ fontFamily: 'Space Mono, monospace', fontSize: 'clamp(16px, 2vw, 22px)', fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: TEXT, margin: 0 }}>Lethal Hits</h2>
      <Body>A natural 6 to hit auto-wounds — no wound roll. Already on every Power Sword in the unit. The graph shows the full unit's output with Lethal Hits active.</Body>
      <ContinueBtn onClick={onNext} />
    </>),

    'intermediate-2': (<>
      <Tag color={ACCENT}>Accept Any Challenge</Tag>
      <h2 style={{ fontFamily: 'Space Mono, monospace', fontSize: 'clamp(16px, 2vw, 22px)', fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: TEXT, margin: 0 }}>+1 to wound roll</h2>
      <Body>S5 vs T5 — the condition always triggers. Every wound roll gets +1. A modifier that compounds heavily with everything that follows.</Body>
      <ContinueBtn onClick={onNext} />
    </>),

    'intermediate-3': (<>
      <Tag color={ACCENT}>Marshal · Master-Crafted Power Weapon</Tag>
      <h2 style={{ fontFamily: 'Space Mono, monospace', fontSize: 'clamp(16px, 2vw, 22px)', fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: TEXT, margin: 0 }}>Marshal +1A</h2>
      <Body>One enemy unit within 6" → Marshal goes from A5 to A6. Higher D2 per swing makes this count.</Body>
      <ContinueBtn onClick={onNext} />
    </>),

    'intermediate-4': (<>
      <Tag color={ACCENT}>Castellan aura</Tag>
      <h2 style={{ fontFamily: 'Space Mono, monospace', fontSize: 'clamp(16px, 2vw, 22px)', fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: TEXT, margin: 0 }}>Re-roll hit rolls</h2>
      <Body>Every model re-rolls misses. More dice, more Lethal Hits procs.</Body>
      <ContinueBtn onClick={onNext} />
    </>),

    'intermediate-5': (<>
      <Tag color={ACCENT}>Marshal aura</Tag>
      <h2 style={{ fontFamily: 'Space Mono, monospace', fontSize: 'clamp(16px, 2vw, 22px)', fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: TEXT, margin: 0 }}>Critical Hit on 5+</h2>
      <Body>
        Unmodified 5+ triggers Lethal Hits. With re-rolls: roughly 44% of all attack dice proc it. Full synergy:{' '}
        <strong style={{ color: TEXT }}>{results?.base?.summary.mean_damage.toFixed(2)}</strong> →{' '}
        <strong style={{ color: HIGHLIGHT }}>{results?.full3?.summary.mean_damage.toFixed(2)}</strong> mean damage{' '}
        (<strong style={{ color: ACCENT }}>+{results?.base && results?.full3 ? (((results.full3.summary.mean_damage / results.base.summary.mean_damage) - 1) * 100).toFixed(0) : '?'}%</strong>).
      </Body>
      <ContinueBtn onClick={onNext} label="Open simulator →" primary />
    </>),
  }
  return content[stepKey] ?? null
}

// ── Right panels ──────────────────────────────────────────────────────────────

function SimpleDamagePanel({ result, label = '1× Sword Brethren · Power Sword · vs Abaddon' }) {
  if (!result) return null
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ fontFamily: 'Space Mono, monospace', fontSize: '10px', letterSpacing: '2px', textTransform: 'uppercase', color: TEXT_WEAK }}>
        {label}
      </div>
      <div>
        <div style={{ fontFamily: 'Space Mono, monospace', fontWeight: 700, fontSize: 'clamp(64px, 8vw, 100px)', lineHeight: 1, letterSpacing: '-3px', color: HIGHLIGHT }}>
          {result.summary.mean_damage.toFixed(2)}
        </div>
        <div style={{ fontFamily: 'Space Mono, monospace', fontSize: '10px', letterSpacing: '2px', textTransform: 'uppercase', color: TEXT_WEAK, marginTop: '10px' }}>
          Mean damage output
        </div>
      </div>
      <div style={{ borderTop: `1px solid ${BORDER}` }} />
      {[
        ['Median damage',  result.summary.median_damage],
        ['P10 — P90',      `${result.summary.p10} — ${result.summary.p90}`],
        ['Std deviation',  result.summary.std_dev.toFixed(2)],
      ].map(([label, value]) => (
        <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: `1px solid ${BORDER}` }}>
          <span style={{ fontFamily: 'Space Mono, monospace', fontSize: '10px', letterSpacing: '1.5px', textTransform: 'uppercase', color: TEXT_WEAK }}>{label}</span>
          <span style={{ fontFamily: 'Space Mono, monospace', fontSize: '12px', fontWeight: 700, color: TEXT_SEC }}>{value}</span>
        </div>
      ))}
    </div>
  )
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: BG, border: `1px solid ${ACCENT}`, padding: '8px 12px', fontFamily: 'Space Mono, monospace', fontSize: '10px', letterSpacing: '1.5px', color: TEXT }}>
      <div style={{ color: TEXT_WEAK, marginBottom: '3px' }}>DMG {label}</div>
      <div style={{ fontWeight: 700, color: ACCENT }}>{(payload[0].value * 100).toFixed(1)}%</div>
    </div>
  )
}

function FullDamagePanel({ result, label }) {
  if (!result) return null
  const { summary, damage_histogram } = result
  const maxProb = Math.max(...damage_histogram.map((b) => b.probability))
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
      <div style={{ fontFamily: 'Space Mono, monospace', fontSize: '10px', letterSpacing: '2px', textTransform: 'uppercase', color: TEXT_WEAK, marginBottom: '20px' }}>
        {label}
      </div>
      <div style={{ marginBottom: '16px', display: 'flex', alignItems: 'flex-end', gap: '24px' }}>
        <div>
          <div style={{ fontFamily: 'Space Mono, monospace', fontWeight: 700, fontSize: 'clamp(48px, 5vw, 72px)', lineHeight: 1, letterSpacing: '-2px', color: HIGHLIGHT }}>
            {summary.mean_damage.toFixed(2)}
          </div>
          <div style={{ fontFamily: 'Space Mono, monospace', fontSize: '10px', letterSpacing: '2px', textTransform: 'uppercase', color: TEXT_WEAK, marginTop: '8px' }}>
            Mean damage
          </div>
        </div>
        {result.kill_probabilities?.['1'] != null && (
          <div style={{ paddingBottom: '4px' }}>
            <div style={{ fontFamily: 'Space Mono, monospace', fontWeight: 700, fontSize: 'clamp(32px, 3.5vw, 52px)', lineHeight: 1, letterSpacing: '-1px', color: ACCENT }}>
              {(result.kill_probabilities['1'] * 100).toFixed(0)}%
            </div>
            <div style={{ fontFamily: 'Space Mono, monospace', fontSize: '10px', letterSpacing: '2px', textTransform: 'uppercase', color: TEXT_WEAK, marginTop: '8px' }}>
              Kill chance
            </div>
          </div>
        )}
      </div>
      <div style={{ borderTop: `1px solid ${BORDER}`, marginBottom: '12px' }} />
      {[
        ['Median',   summary.median_damage],
        ['Std dev',  summary.std_dev.toFixed(2)],
        ['P10—P90',  `${summary.p10} — ${summary.p90}`],
      ].map(([l, v]) => (
        <div key={l} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: `1px solid ${BORDER}` }}>
          <span style={{ fontFamily: 'Space Mono, monospace', fontSize: '10px', letterSpacing: '1.5px', textTransform: 'uppercase', color: TEXT_WEAK }}>{l}</span>
          <span style={{ fontFamily: 'Space Mono, monospace', fontSize: '12px', fontWeight: 700, color: TEXT_SEC }}>{v}</span>
        </div>
      ))}
      <div style={{ borderTop: `1px solid ${BORDER}`, margin: '14px 0 10px' }} />
      <div style={{ fontFamily: 'Space Mono, monospace', fontSize: '8px', letterSpacing: '2.5px', textTransform: 'uppercase', color: TEXT_WEAK, marginBottom: '10px' }}>
        Damage distribution
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

// ── Right panel label per resultKey ──────────────────────────────────────────

const PANEL_LABELS = {
  base:        '1× Sword Brethren · vs Maleceptor (T11 Sv3+ 4++ W14)',
  base_no_inv: '1× Sword Brethren · vs Maleceptor (T11 Sv3+ W14)',
  base_aura:   '1× Sword Brethren · Encephalic Diffusion (−1 hit) · vs Maleceptor',
  lethal:      '1× Sword Brethren · Lethal Hits · vs Maleceptor',
  lethal_aura: '1× Sword Brethren · Lethal Hits + aura (−1 hit) · vs Maleceptor',
  squad_base:  'Full squad · Lethal Hits + aura · vs Maleceptor',
  full0:       'Full unit · Accept Any Challenge · net wound still 6+ (cancelled)',
  full1:       'Full unit · + Marshal +1A',
  full2:       'Full unit · + Re-roll hits',
  full3:       'Full unit · all rules active',
}

// ── Main page ─────────────────────────────────────────────────────────────────

export function OnboardingPage() {
  const navigate = useNavigate()
  const level    = localStorage.getItem('ph_level') ?? 'beginner'
  const steps    = level === 'intermediate' ? INTERMEDIATE_STEPS : BEGINNER_STEPS
  const prefix   = level === 'intermediate' ? 'intermediate' : 'beginner'

  const [activeStep, setActiveStep] = useState(0)
  const [btnHov, setBtnHov] = useState(false)
  const sectionRefs = useRef([])

  const results = useMemo(() => ({
    base:        simulate(SIM_BASE_1SB),
    base_no_inv: simulate(SIM_BASE_NO_INV),
    base_aura:   simulate(SIM_AURA),
    lethal:      simulate(SIM_LETHAL_1SB),
    lethal_aura: simulate(SIM_LETHAL_AURA),
    squad_base:  simulate({ attacks: buildFullAttacks(0), defender: DEFENDER, context: CONTEXT, n_trials: 2000 }),
    full0: simulate({ attacks: buildFullAttacks(1), defender: DEFENDER, context: CONTEXT, n_trials: 2000 }),
    full1: simulate({ attacks: buildFullAttacks(2), defender: DEFENDER, context: CONTEXT, n_trials: 2000 }),
    full2: simulate({ attacks: buildFullAttacks(3), defender: DEFENDER, context: CONTEXT, n_trials: 2000 }),
    full3: simulate({ attacks: buildFullAttacks(4), defender: DEFENDER, context: CONTEXT, n_trials: 2000 }),
    // Per-die comparison for synergy box (1 attack, no rules vs all 5 rules)
    single_base: simulate({ attacks: [{ models: 1, weapon: { attacks: '1', skill: 2, strength: 5, ap: -2, damage: '2', keywords: NO_KW }, buffs: [] }], defender: DEFENDER, context: CONTEXT, n_trials: 4000 }),
    single_full: simulate({ attacks: [{ models: 1, weapon: { attacks: '1', skill: 2, strength: 5, ap: -2, damage: '2', keywords: LETHAL }, buffs: [{ type: 'HIT_MODIFIER', value: -1 }, { type: 'REROLL_HITS', value: 'all' }, { type: 'CRITICAL_HIT_ON', value: 5 }] }], defender: DEFENDER, context: CONTEXT, n_trials: 4000 }),
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

  const currentStep  = steps[activeStep]
  const activeResult = results[currentStep?.resultKey]

  return (
    <div style={{ minHeight: '100vh', background: BG, display: 'flex', flexDirection: 'column' }}>

      {/* Top bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px', borderBottom: `1px solid ${BORDER}`, height: '52px', flexShrink: 0, position: 'sticky', top: 0, zIndex: 10, background: BG }}>
        <div style={{ fontFamily: 'Space Mono, monospace', fontSize: '12px', fontWeight: 700, letterSpacing: '3px', color: ACCENT }}>
          PROB<span style={{ opacity: 0.4 }}>'</span>HAMMER
        </div>
        <div style={{ fontFamily: 'Space Mono, monospace', fontSize: '10px', letterSpacing: '2px', color: TEXT_WEAK }}>
          {activeStep + 1} / {steps.length}
        </div>
        <span onClick={handleSkip} style={{ fontFamily: 'Space Mono, monospace', fontSize: '10px', letterSpacing: '2px', textTransform: 'uppercase', color: TEXT_OFF, cursor: 'pointer' }}>
          Skip →
        </span>
      </div>

      <ProgressBar total={steps.length} active={activeStep} />

      {/* Two-column layout */}
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', alignItems: 'start' }}>

        {/* Left — scrollable sections */}
        <div style={{ borderRight: `1px solid ${BORDER}` }}>
          {steps.map((step, i) => (
            <section
              key={i}
              ref={(el) => { sectionRefs.current[i] = el }}
              style={{ minHeight: 'calc(100vh - 55px)', padding: '56px 48px', display: 'flex', flexDirection: 'column', gap: '24px', justifyContent: 'center', borderBottom: i < steps.length - 1 ? `1px solid ${BORDER}` : 'none' }}
            >
              <StepContent
                stepKey={`${prefix}-${i}`}
                onNext={() => handleNext(i)}
                results={results}
              />
            </section>
          ))}
        </div>

        {/* Right — sticky panel */}
        <div style={{ position: 'sticky', top: '55px', height: 'calc(100vh - 55px)', padding: '40px', overflowY: 'auto' }}>
          {currentStep?.panelType === 'simple'
            ? <SimpleDamagePanel result={activeResult} label={PANEL_LABELS[currentStep?.resultKey] ?? ''} />
            : <FullDamagePanel result={activeResult} label={PANEL_LABELS[currentStep?.resultKey] ?? ''} />
          }
        </div>
      </div>

      {/* Fixed scroll button */}
      <button
        onClick={() => handleNext(activeStep)}
        onMouseEnter={() => setBtnHov(true)}
        onMouseLeave={() => setBtnHov(false)}
        style={{ position: 'fixed', bottom: '40px', left: '25vw', transform: 'translateX(-50%)', border: `1px solid ${ACCENT}`, background: btnHov ? 'rgba(47,224,255,0.08)' : 'transparent', color: ACCENT, fontFamily: 'Space Mono, monospace', fontSize: '10px', letterSpacing: '2px', textTransform: 'uppercase', padding: '10px 20px', cursor: 'pointer', zIndex: 20, transition: 'background 150ms', display: 'flex', alignItems: 'center', gap: '8px' }}
      >
        <span style={{ display: 'inline-block', animation: 'arrowBounce 1.4s ease-in-out infinite', animationPlayState: btnHov ? 'paused' : 'running' }}>↓</span>
        Next
      </button>
    </div>
  )
}

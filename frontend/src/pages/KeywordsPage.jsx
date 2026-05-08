import { useEffect, useState, useMemo } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { KEYWORD_REGISTRY } from '../engine/keywords'
import { simulate } from '../engine/simulation'
import { ACCENT, BORDER, SURFACE, TEXT, TEXT_OFF, TEXT_SEC, TEXT_WEAK, SUCCESS, WARNING, TYPE } from '../theme'

const N_TRIALS = 1200

// ── Scenario definitions ───────────────────────────────────────────────────────
// Each scenario runs two simulations: without and with the keyword.

const SCENARIOS = {
  TORRENT: {
    label: '8 shots · BS 5+ · vs T4 Sv4+',
    note: 'With Torrent every shot connects — BS becomes irrelevant.',
    without: {
      attacks: [{ models: 1, weapon: { name: '', attacks: '8', skill: 5, strength: 4, ap: 0, damage: '1', keywords: [] }, buffs: [] }],
      defender: { toughness: 4, save: 4, invuln: null, wounds: 1, models: 10, fnp: null, keywords: [] },
      context: { cover: false, half_range: false, attacker_moved: false, attacker_charged: false, target_visible: true },
    },
    with: {
      attacks: [{ models: 1, weapon: { name: '', attacks: '8', skill: 5, strength: 4, ap: 0, damage: '1', keywords: [{ type: 'TORRENT' }] }, buffs: [] }],
      defender: { toughness: 4, save: 4, invuln: null, wounds: 1, models: 10, fnp: null, keywords: [] },
      context: { cover: false, half_range: false, attacker_moved: false, attacker_charged: false, target_visible: true },
    },
  },
  LETHAL_HITS: {
    label: '6 attacks · S4 vs T8 · wound on 6+',
    note: 'Critical hits auto-wound, skipping the near-impossible wound roll entirely.',
    without: {
      attacks: [{ models: 1, weapon: { name: '', attacks: '6', skill: 3, strength: 4, ap: -1, damage: '2', keywords: [] }, buffs: [] }],
      defender: { toughness: 8, save: 3, invuln: null, wounds: 10, models: 1, fnp: null, keywords: [] },
      context: { cover: false, half_range: false, attacker_moved: false, attacker_charged: false, target_visible: true },
    },
    with: {
      attacks: [{ models: 1, weapon: { name: '', attacks: '6', skill: 3, strength: 4, ap: -1, damage: '2', keywords: [{ type: 'LETHAL_HITS' }] }, buffs: [] }],
      defender: { toughness: 8, save: 3, invuln: null, wounds: 10, models: 1, fnp: null, keywords: [] },
      context: { cover: false, half_range: false, attacker_moved: false, attacker_charged: false, target_visible: true },
    },
  },
  SUSTAINED_HITS: {
    label: '6 attacks · Sustained Hits 2 · vs T4 Sv3+',
    note: 'Each crit generates 2 extra hits that go through the full wound/save sequence.',
    without: {
      attacks: [{ models: 1, weapon: { name: '', attacks: '6', skill: 3, strength: 5, ap: -1, damage: '1', keywords: [] }, buffs: [] }],
      defender: { toughness: 4, save: 3, invuln: null, wounds: 1, models: 10, fnp: null, keywords: [] },
      context: { cover: false, half_range: false, attacker_moved: false, attacker_charged: false, target_visible: true },
    },
    with: {
      attacks: [{ models: 1, weapon: { name: '', attacks: '6', skill: 3, strength: 5, ap: -1, damage: '1', keywords: [{ type: 'SUSTAINED_HITS', value: '2' }] }, buffs: [] }],
      defender: { toughness: 4, save: 3, invuln: null, wounds: 1, models: 10, fnp: null, keywords: [] },
      context: { cover: false, half_range: false, attacker_moved: false, attacker_charged: false, target_visible: true },
    },
  },
  HEAVY: {
    label: '6 attacks · BS 4+ · attacker Remained Stationary',
    note: 'Heavy grants a free +1 to hit — equivalent to upgrading BS 4+ to BS 3+.',
    without: {
      attacks: [{ models: 1, weapon: { name: '', attacks: '6', skill: 4, strength: 6, ap: -2, damage: '2', keywords: [] }, buffs: [] }],
      defender: { toughness: 5, save: 3, invuln: null, wounds: 3, models: 4, fnp: null, keywords: [] },
      context: { cover: false, half_range: false, attacker_moved: false, attacker_charged: false, target_visible: true },
    },
    with: {
      attacks: [{ models: 1, weapon: { name: '', attacks: '6', skill: 4, strength: 6, ap: -2, damage: '2', keywords: [{ type: 'HEAVY' }] }, buffs: [] }],
      defender: { toughness: 5, save: 3, invuln: null, wounds: 3, models: 4, fnp: null, keywords: [] },
      context: { cover: false, half_range: false, attacker_moved: false, attacker_charged: false, target_visible: true },
    },
  },
  RAPID_FIRE: {
    label: '5 models · 1 attack · Rapid Fire 1 at half range',
    note: 'At half range every model gains an extra attack — output doubles across the unit.',
    without: {
      attacks: [{ models: 5, weapon: { name: '', attacks: '1', skill: 3, strength: 4, ap: 0, damage: '1', keywords: [] }, buffs: [] }],
      defender: { toughness: 4, save: 4, invuln: null, wounds: 1, models: 10, fnp: null, keywords: [] },
      context: { cover: false, half_range: false, attacker_moved: false, attacker_charged: false, target_visible: true },
    },
    with: {
      attacks: [{ models: 5, weapon: { name: '', attacks: '1', skill: 3, strength: 4, ap: 0, damage: '1', keywords: [{ type: 'RAPID_FIRE', value: '1' }] }, buffs: [] }],
      defender: { toughness: 4, save: 4, invuln: null, wounds: 1, models: 10, fnp: null, keywords: [] },
      context: { cover: false, half_range: true, attacker_moved: false, attacker_charged: false, target_visible: true },
    },
  },
  INDIRECT_FIRE: {
    label: '6 attacks · target not visible',
    note: 'Indirect Fire forces −1 to hit and grants the target cover — even if they are in the open.',
    without: {
      attacks: [{ models: 1, weapon: { name: '', attacks: '6', skill: 3, strength: 5, ap: -1, damage: '2', keywords: [] }, buffs: [] }],
      defender: { toughness: 4, save: 4, invuln: null, wounds: 1, models: 10, fnp: null, keywords: [] },
      context: { cover: false, half_range: false, attacker_moved: false, attacker_charged: false, target_visible: true },
    },
    with: {
      attacks: [{ models: 1, weapon: { name: '', attacks: '6', skill: 3, strength: 5, ap: -1, damage: '2', keywords: [{ type: 'INDIRECT_FIRE' }] }, buffs: [] }],
      defender: { toughness: 4, save: 4, invuln: null, wounds: 1, models: 10, fnp: null, keywords: [] },
      context: { cover: false, half_range: false, attacker_moved: false, attacker_charged: false, target_visible: false },
    },
  },
  TWIN_LINKED: {
    label: '6 attacks · S4 vs T7 · wound on 6+',
    note: 'Re-rolling all wound rolls nearly doubles the effective wound rate on hard-to-wound targets.',
    without: {
      attacks: [{ models: 1, weapon: { name: '', attacks: '6', skill: 3, strength: 4, ap: -1, damage: '3', keywords: [] }, buffs: [] }],
      defender: { toughness: 7, save: 3, invuln: null, wounds: 8, models: 1, fnp: null, keywords: [] },
      context: { cover: false, half_range: false, attacker_moved: false, attacker_charged: false, target_visible: true },
    },
    with: {
      attacks: [{ models: 1, weapon: { name: '', attacks: '6', skill: 3, strength: 4, ap: -1, damage: '3', keywords: [{ type: 'TWIN_LINKED' }] }, buffs: [] }],
      defender: { toughness: 7, save: 3, invuln: null, wounds: 8, models: 1, fnp: null, keywords: [] },
      context: { cover: false, half_range: false, attacker_moved: false, attacker_charged: false, target_visible: true },
    },
  },
  DEVASTATING_WOUNDS: {
    label: '6 attacks · S5 AP-1 · vs 2+ save target',
    note: 'Critical wounds deal damage as mortal wounds — a 2+ save becomes completely irrelevant.',
    without: {
      attacks: [{ models: 1, weapon: { name: '', attacks: '6', skill: 3, strength: 5, ap: -1, damage: '2', keywords: [] }, buffs: [] }],
      defender: { toughness: 5, save: 2, invuln: null, wounds: 6, models: 1, fnp: null, keywords: [] },
      context: { cover: false, half_range: false, attacker_moved: false, attacker_charged: false, target_visible: true },
    },
    with: {
      attacks: [{ models: 1, weapon: { name: '', attacks: '6', skill: 3, strength: 5, ap: -1, damage: '2', keywords: [{ type: 'DEVASTATING_WOUNDS' }] }, buffs: [] }],
      defender: { toughness: 5, save: 2, invuln: null, wounds: 6, models: 1, fnp: null, keywords: [] },
      context: { cover: false, half_range: false, attacker_moved: false, attacker_charged: false, target_visible: true },
    },
  },
  LANCE: {
    label: '6 attacks · charging · S5 vs T6 · wound on 5+',
    note: 'Lance shifts wound rolls from 5+ to 4+ on the charge — a 50% increase in wound rate.',
    without: {
      attacks: [{ models: 1, weapon: { name: '', attacks: '6', skill: 3, strength: 5, ap: -2, damage: '2', keywords: [] }, buffs: [] }],
      defender: { toughness: 6, save: 3, invuln: null, wounds: 4, models: 3, fnp: null, keywords: [] },
      context: { cover: false, half_range: false, attacker_moved: false, attacker_charged: true, target_visible: true },
    },
    with: {
      attacks: [{ models: 1, weapon: { name: '', attacks: '6', skill: 3, strength: 5, ap: -2, damage: '2', keywords: [{ type: 'LANCE' }] }, buffs: [] }],
      defender: { toughness: 6, save: 3, invuln: null, wounds: 4, models: 3, fnp: null, keywords: [] },
      context: { cover: false, half_range: false, attacker_moved: false, attacker_charged: true, target_visible: true },
    },
  },
  MELTA: {
    label: '4 shots · D3 dmg · Melta 3 · vs T8 vehicle',
    note: 'Melta adds flat damage — D3 becomes D3+3, tripling minimum output at close range.',
    without: {
      attacks: [{ models: 1, weapon: { name: '', attacks: '4', skill: 3, strength: 9, ap: -4, damage: 'D3', keywords: [] }, buffs: [] }],
      defender: { toughness: 8, save: 3, invuln: null, wounds: 12, models: 1, fnp: null, keywords: [] },
      context: { cover: false, half_range: false, attacker_moved: false, attacker_charged: false, target_visible: true },
    },
    with: {
      attacks: [{ models: 1, weapon: { name: '', attacks: '4', skill: 3, strength: 9, ap: -4, damage: 'D3', keywords: [{ type: 'MELTA', value: '3' }] }, buffs: [] }],
      defender: { toughness: 8, save: 3, invuln: null, wounds: 12, models: 1, fnp: null, keywords: [] },
      context: { cover: false, half_range: true, attacker_moved: false, attacker_charged: false, target_visible: true },
    },
  },
  ANTI: {
    label: '6 attacks · Anti-MONSTER 4+ · vs T8',
    note: 'ANTI 4+ means 50% of successful wounds become critical — synergises directly with Devastating Wounds.',
    without: {
      attacks: [{ models: 1, weapon: { name: '', attacks: '6', skill: 3, strength: 6, ap: -1, damage: '2', keywords: [] }, buffs: [] }],
      defender: { toughness: 8, save: 3, invuln: null, wounds: 12, models: 1, fnp: null, keywords: ['MONSTER'] },
      context: { cover: false, half_range: false, attacker_moved: false, attacker_charged: false, target_visible: true },
    },
    with: {
      attacks: [{ models: 1, weapon: { name: '', attacks: '6', skill: 3, strength: 6, ap: -1, damage: '2', keywords: [{ type: 'ANTI', target: 'MONSTER', threshold: 4 }] }, buffs: [] }],
      defender: { toughness: 8, save: 3, invuln: null, wounds: 12, models: 1, fnp: null, keywords: ['MONSTER'] },
      context: { cover: false, half_range: false, attacker_moved: false, attacker_charged: false, target_visible: true },
    },
  },
  BLAST: {
    label: '1× Redemptor Dreadnought · Macro Plasma Incinerator (D6+1, BS3+, S8, AP-3, D2) · vs 20 Boyz',
    note: 'Against 20 Boyz, Blast adds +4 to the dice roll — the weapon goes from D6+1 to D6+5 attacks before rolling.',
    without: {
      attacks: [{ models: 1, weapon: { name: '', attacks: 'D6+1', skill: 3, strength: 8, ap: -3, damage: '2', keywords: [] }, buffs: [] }],
      defender: { toughness: 5, save: 5, invuln: 5, wounds: 1, models: 20, fnp: null, keywords: [] },
      context: { cover: false, half_range: false, attacker_moved: false, attacker_charged: false, target_visible: true },
    },
    with: {
      attacks: [{ models: 1, weapon: { name: '', attacks: 'D6+1', skill: 3, strength: 8, ap: -3, damage: '2', keywords: [{ type: 'BLAST' }] }, buffs: [] }],
      defender: { toughness: 5, save: 5, invuln: 5, wounds: 1, models: 20, fnp: null, keywords: [] },
      context: { cover: false, half_range: false, attacker_moved: false, attacker_charged: false, target_visible: true },
    },
  },
  EXTRA_ATTACKS: {
    label: '4 base attacks + 2 Extra Attacks · vs T4 Sv3+',
    note: 'Extra Attacks add directly to the pool before any roll — a flat improvement at all times.',
    without: {
      attacks: [{ models: 1, weapon: { name: '', attacks: '4', skill: 3, strength: 5, ap: -2, damage: '2', keywords: [] }, buffs: [] }],
      defender: { toughness: 4, save: 3, invuln: null, wounds: 2, models: 5, fnp: null, keywords: [] },
      context: { cover: false, half_range: false, attacker_moved: false, attacker_charged: false, target_visible: true },
    },
    with: {
      attacks: [{ models: 1, weapon: { name: '', attacks: '4', skill: 3, strength: 5, ap: -2, damage: '2', keywords: [{ type: 'EXTRA_ATTACKS', value: '2' }] }, buffs: [] }],
      defender: { toughness: 4, save: 3, invuln: null, wounds: 2, models: 5, fnp: null, keywords: [] },
      context: { cover: false, half_range: false, attacker_moved: false, attacker_charged: false, target_visible: true },
    },
  },
  CRITICAL_HIT_ON: {
    label: '6 attacks · Sustained Hits 2 · crit on 6+ vs 5+',
    note: 'Lowering the crit threshold doubles crit frequency — with Sustained Hits, that means twice as many bonus hits.',
    without: {
      attacks: [{ models: 1, weapon: { name: '', attacks: '6', skill: 3, strength: 5, ap: -1, damage: '1', keywords: [{ type: 'SUSTAINED_HITS', value: '2' }] }, buffs: [] }],
      defender: { toughness: 4, save: 3, invuln: null, wounds: 1, models: 10, fnp: null, keywords: [] },
      context: { cover: false, half_range: false, attacker_moved: false, attacker_charged: false, target_visible: true },
    },
    with: {
      attacks: [{ models: 1, weapon: { name: '', attacks: '6', skill: 3, strength: 5, ap: -1, damage: '1', keywords: [{ type: 'SUSTAINED_HITS', value: '2' }, { type: 'CRITICAL_HIT_ON', value: '5' }] }, buffs: [] }],
      defender: { toughness: 4, save: 3, invuln: null, wounds: 1, models: 10, fnp: null, keywords: [] },
      context: { cover: false, half_range: false, attacker_moved: false, attacker_charged: false, target_visible: true },
    },
  },
  IGNORES_COVER: {
    label: '6 attacks · AP-1 · vs target in cover (Sv4+)',
    note: 'Cover upgrades the save to 3+ — Ignores Cover removes that bonus entirely.',
    without: {
      attacks: [{ models: 1, weapon: { name: '', attacks: '6', skill: 3, strength: 4, ap: -1, damage: '1', keywords: [] }, buffs: [] }],
      defender: { toughness: 4, save: 4, invuln: null, wounds: 1, models: 10, fnp: null, keywords: [] },
      context: { cover: true, half_range: false, attacker_moved: false, attacker_charged: false, target_visible: true },
    },
    with: {
      attacks: [{ models: 1, weapon: { name: '', attacks: '6', skill: 3, strength: 4, ap: -1, damage: '1', keywords: [{ type: 'IGNORES_COVER' }] }, buffs: [] }],
      defender: { toughness: 4, save: 4, invuln: null, wounds: 1, models: 10, fnp: null, keywords: [] },
      context: { cover: true, half_range: false, attacker_moved: false, attacker_charged: false, target_visible: true },
    },
  },
}

// ── Sections ───────────────────────────────────────────────────────────────────

const SECTIONS = [
  { label: 'Hit Phase',   group: 'hit' },
  { label: 'Wound Phase', group: 'wound' },
  { label: 'Other',       group: 'other' },
  { label: 'Abilities',   group: 'ability' },
]

// ── Custom tooltip ─────────────────────────────────────────────────────────────

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: '#0F2230', border: `1px solid #1E3A4C`,
      padding: '8px 12px',
      fontFamily: 'Space Mono, monospace', fontSize: '10px',
    }}>
      <div style={{ color: TEXT_WEAK, marginBottom: '4px', letterSpacing: '1px' }}>DMG {label}</div>
      {payload.map((p) => (
        <div key={p.dataKey} style={{ color: p.fill, letterSpacing: '1px' }}>
          {p.name}: {(p.value * 100).toFixed(1)}%
        </div>
      ))}
    </div>
  )
}

// ── Stat chip ──────────────────────────────────────────────────────────────────

function StatChip({ label, value, color }) {
  return (
    <div style={{ flex: 1, padding: '14px 16px', background: '#0A1621', border: `1px solid #1E3A4C` }}>
      <div style={{ ...TYPE.label, marginBottom: '8px' }}>{label}</div>
      <div style={{ ...TYPE.statLg, color }}>{value}</div>
    </div>
  )
}

// ── Blast tier table ───────────────────────────────────────────────────────────

const BLAST_WPN     = { name: '', attacks: 'D6+1', skill: 3, strength: 8, ap: -3, damage: '2', keywords: [] }
const BLAST_WPN_KW  = { ...BLAST_WPN, keywords: [{ type: 'BLAST' }] }
const BLAST_CTX     = { cover: false, half_range: false, attacker_moved: false, attacker_charged: false, target_visible: true }
const BLAST_TIERS   = [5, 10, 15, 20]

function BlastTierTable() {
  const tiers = useMemo(() =>
    BLAST_TIERS.map((n) => {
      const def = { toughness: 5, save: 5, invuln: 5, wounds: 1, models: n, fnp: null, keywords: [] }
      const r0  = simulate({ attacks: [{ models: 1, weapon: BLAST_WPN,    buffs: [] }], defender: def, context: BLAST_CTX, n_trials: 1500 })
      const r1  = simulate({ attacks: [{ models: 1, weapon: BLAST_WPN_KW, buffs: [] }], defender: def, context: BLAST_CTX, n_trials: 1500 })
      const bonus = Math.floor(n / 5)
      return {
        n,
        bonus,
        totalBase: 'D6+1',
        totalWith: bonus === 0 ? 'D6+1' : `D6+${1 + bonus}`,
        killsBase:   r0.summary.mean_damage,
        killsBlast:  r1.summary.mean_damage,
      }
    })
  , [])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <div style={{ ...TYPE.label }}>Attack scaling by squad size</div>
      <div style={{ ...TYPE.label, color: TEXT_SEC }}>
        1× Redemptor Dreadnought · Macro Plasma Incinerator (D6+1) · vs Boyz (T5 SV5+ W1 INV5++)
      </div>

      {/* Column headers */}
      <div style={{ display: 'grid', gridTemplateColumns: '80px repeat(4, 1fr)', gap: '1px', background: BORDER }}>
        <div style={{ background: SURFACE, padding: '8px 10px' }} />
        {BLAST_TIERS.map((n) => (
          <div key={n} style={{ background: SURFACE, padding: '8px 10px', textAlign: 'center' }}>
            <span style={{ ...TYPE.label }}>{n} models</span>
          </div>
        ))}

        {/* Base attacks row */}
        <div style={{ background: '#0A1621', padding: '10px 10px', ...TYPE.label, display: 'flex', alignItems: 'center' }}>
          Attacks<br/>no Blast
        </div>
        {tiers.map(({ n, totalBase }) => (
          <div key={n} style={{ background: '#0A1621', padding: '10px 6px', textAlign: 'center', ...TYPE.heading, color: TEXT_SEC, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {totalBase}
          </div>
        ))}

        {/* Blast bonus row */}
        <div style={{ background: '#0A1621', padding: '10px 10px', ...TYPE.label, display: 'flex', alignItems: 'center' }}>
          Blast<br/>bonus
        </div>
        {tiers.map(({ n, bonus }) => (
          <div key={n} style={{ background: '#0A1621', padding: '10px 6px', textAlign: 'center', ...TYPE.statMd, color: ACCENT, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            +{bonus}
          </div>
        ))}

        {/* Total attacks row */}
        <div style={{ background: SURFACE, padding: '10px 10px', ...TYPE.label, color: TEXT_SEC, display: 'flex', alignItems: 'center' }}>
          Total<br/>attacks
        </div>
        {tiers.map(({ n, totalWith }) => (
          <div key={n} style={{ background: SURFACE, padding: '10px 6px', textAlign: 'center', ...TYPE.heading, color: TEXT, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {totalWith}
          </div>
        ))}

        {/* Avg kills row */}
        <div style={{ background: '#0A1621', padding: '10px 10px', ...TYPE.label, display: 'flex', alignItems: 'center' }}>
          Avg kills<br/>(simul.)
        </div>
        {tiers.map(({ n, killsBase, killsBlast }) => {
          const diff = (killsBlast - killsBase).toFixed(1)
          return (
            <div key={n} style={{ background: '#0A1621', padding: '10px 6px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '3px' }}>
              <span style={{ ...TYPE.statMd, color: ACCENT }}>{killsBlast}</span>
              <span style={{ ...TYPE.label, color: SUCCESS }}>+{diff}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Comparison panel ───────────────────────────────────────────────────────────

function ComparisonPanel({ kwType }) {
  const results = useMemo(() => {
    const scenario = SCENARIOS[kwType]
    if (!scenario) return null
    try {
      const without = simulate({ ...scenario.without, n_trials: N_TRIALS })
      const with_   = simulate({ ...scenario.with,    n_trials: N_TRIALS })
      return { without, with: with_ }
    } catch {
      return null
    }
  }, [kwType])

  const scenario = SCENARIOS[kwType]
  if (!scenario || !results) return null

  const { without: r0, with: r1 } = results

  // Merge histograms on same x-axis
  const maxDmg = Math.max(
    r0.damage_histogram.at(-1)?.damage ?? 0,
    r1.damage_histogram.at(-1)?.damage ?? 0,
  )
  const chartData = []
  for (let d = 0; d <= maxDmg; d++) {
    chartData.push({
      damage: d,
      without: r0.damage_histogram.find((h) => h.damage === d)?.probability ?? 0,
      with:    r1.damage_histogram.find((h) => h.damage === d)?.probability ?? 0,
    })
  }

  const meanDiff = r1.summary.mean_damage - r0.summary.mean_damage
  const diffSign = meanDiff >= 0 ? '+' : ''
  const diffColor = meanDiff > 0.05 ? SUCCESS : meanDiff < -0.05 ? '#FF5C7A' : TEXT_WEAK

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

      {/* Scenario header */}
      <div>
        <div style={{
          fontFamily: 'Space Mono, monospace', fontSize: '9px',
          letterSpacing: '2px', textTransform: 'uppercase',
          color: TEXT_WEAK, marginBottom: '6px',
        }}>
          Scenario
        </div>
        <div style={{
          fontFamily: 'Space Mono, monospace', fontSize: '10px',
          letterSpacing: '1px', color: TEXT_SEC,
          padding: '8px 12px', border: `1px solid #1E3A4C`,
          background: '#0A1621',
        }}>
          {scenario.label}
        </div>
        <p style={{ ...TYPE.note, color: TEXT_SEC, margin: '8px 0 0' }}>
          {scenario.note}
        </p>
      </div>

      {/* Stats comparison */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr',
          gap: '1px', background: '#1E3A4C',
        }}>
          {/* Labels row */}
          <div style={{ background: '#0F2230', padding: '8px 16px' }}>
            <span style={{
              fontFamily: 'Space Mono, monospace', fontSize: '9px',
              letterSpacing: '2px', textTransform: 'uppercase', color: TEXT_WEAK,
            }}>
              Without
            </span>
          </div>
          <div style={{ background: '#0F2230', padding: '8px 16px', borderLeft: `2px solid ${ACCENT}` }}>
            <span style={{
              fontFamily: 'Space Mono, monospace', fontSize: '9px',
              letterSpacing: '2px', textTransform: 'uppercase', color: ACCENT,
            }}>
              With keyword
            </span>
          </div>

          {/* Mean */}
          <div style={{ background: '#0A1621', padding: '16px 16px 12px' }}>
            <div style={{ fontFamily: 'Space Mono, monospace', fontSize: '9px', ...TYPE.label, marginBottom: '6px' }}>Mean dmg</div>
            <div style={{ fontFamily: 'Space Mono, monospace', fontSize: '22px', fontWeight: 700, color: TEXT }}>{r0.summary.mean_damage}</div>
          </div>
          <div style={{ background: '#0A1621', padding: '16px 16px 12px', borderLeft: `2px solid ${ACCENT}` }}>
            <div style={{ fontFamily: 'Space Mono, monospace', fontSize: '9px', ...TYPE.label, marginBottom: '6px' }}>Mean dmg</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px' }}>
              <div style={{ fontFamily: 'Space Mono, monospace', fontSize: '22px', fontWeight: 700, color: ACCENT }}>{r1.summary.mean_damage}</div>
              <div style={{ fontFamily: 'Space Mono, monospace', fontSize: '11px', fontWeight: 700, color: diffColor }}>{diffSign}{meanDiff.toFixed(2)}</div>
            </div>
          </div>

          {/* P90 */}
          <div style={{ background: '#0A1621', padding: '12px 16px 16px' }}>
            <div style={{ fontFamily: 'Space Mono, monospace', fontSize: '9px', ...TYPE.label, marginBottom: '6px' }}>P90 (best 10%)</div>
            <div style={{ fontFamily: 'Space Mono, monospace', fontSize: '22px', fontWeight: 700, color: TEXT }}>{r0.summary.p90}</div>
          </div>
          <div style={{ background: '#0A1621', padding: '12px 16px 16px', borderLeft: `2px solid ${ACCENT}` }}>
            <div style={{ fontFamily: 'Space Mono, monospace', fontSize: '9px', ...TYPE.label, marginBottom: '6px' }}>P90 (best 10%)</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px' }}>
              <div style={{ fontFamily: 'Space Mono, monospace', fontSize: '22px', fontWeight: 700, color: ACCENT }}>{r1.summary.p90}</div>
              {r1.summary.p90 !== r0.summary.p90 && (
                <div style={{ fontFamily: 'Space Mono, monospace', fontSize: '11px', fontWeight: 700, color: diffColor }}>
                  {r1.summary.p90 > r0.summary.p90 ? '+' : ''}{r1.summary.p90 - r0.summary.p90}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Histogram */}
      <div>
        <div style={{
          fontFamily: 'Space Mono, monospace', fontSize: '9px',
          letterSpacing: '2px', textTransform: 'uppercase',
          color: TEXT_WEAK, marginBottom: '10px',
        }}>
          Damage distribution
        </div>

        {/* Legend */}
        <div style={{ display: 'flex', gap: '20px', marginBottom: '10px' }}>
          {[['#4A6A7A', 'Without'], [ACCENT, 'With keyword']].map(([color, label]) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{ width: 10, height: 10, background: color }} />
              <span style={{ ...TYPE.label }}>{label}</span>
            </div>
          ))}
        </div>

        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={chartData} barGap={1} barCategoryGap="20%">
            <XAxis
              dataKey="damage"
              tick={{ fontFamily: 'Space Mono, monospace', fontSize: 9, fill: TEXT_OFF }}
              axisLine={{ stroke: '#1E3A4C' }}
              tickLine={false}
              label={{ value: 'Damage', position: 'insideBottom', offset: -2, fontFamily: 'Space Mono, monospace', fontSize: 8, fill: TEXT_OFF }}
            />
            <YAxis
              tickFormatter={(v) => `${(v * 100).toFixed(0)}%`}
              tick={{ fontFamily: 'Space Mono, monospace', fontSize: 8, fill: TEXT_OFF }}
              axisLine={false}
              tickLine={false}
              width={34}
            />
            <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
            <Bar dataKey="without" name="Without" fill="#4A6A7A" radius={0} />
            <Bar dataKey="with"    name="With"    fill={ACCENT}   radius={0} opacity={0.85} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

// ── Keyword row ────────────────────────────────────────────────────────────────

function KeywordRow({ kw, selected, onClick }) {
  const [hov, setHov] = useState(false)
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        padding: '10px 16px',
        borderLeft: `2px solid ${selected ? ACCENT : 'transparent'}`,
        background: selected ? 'rgba(47,224,255,0.06)' : hov ? 'rgba(47,224,255,0.03)' : 'transparent',
        cursor: 'pointer',
        transition: 'background 100ms, border-color 100ms',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        gap: '8px',
      }}
    >
      <span style={{
        fontFamily: 'Space Mono, monospace', fontSize: '11px',
        fontWeight: selected ? 700 : 400,
        letterSpacing: '1px', textTransform: 'uppercase',
        color: (selected || hov) ? ACCENT : TEXT_SEC,
        transition: 'color 100ms',
      }}>
        {kw.label}
      </span>
      {kw.notSimulated && (
        <span style={{
          fontFamily: 'Space Mono, monospace', fontSize: '8px',
          letterSpacing: '1px', textTransform: 'uppercase',
          color: TEXT_OFF, padding: '2px 6px',
          border: `1px solid #1E3A4C`, flexShrink: 0,
        }}>
          display only
        </span>
      )}
    </div>
  )
}

// ── Detail panel ───────────────────────────────────────────────────────────────

function DetailPanel({ kw }) {
  if (!kw) {
    return (
      <div style={{
        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: TEXT_WEAK, fontFamily: 'Space Mono, monospace',
        fontSize: '10px', letterSpacing: '2px', textTransform: 'uppercase',
      }}>
        Select a keyword
      </div>
    )
  }

  return (
    <div style={{ flex: 1, overflowY: 'auto' }}>
      <div style={{ padding: '36px 44px', display: 'flex', flexDirection: 'column', gap: '28px' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px' }}>
          <div>
            <div style={{
              fontFamily: 'Space Mono, monospace', fontSize: '9px',
              letterSpacing: '3px', textTransform: 'uppercase',
              color: TEXT_WEAK, marginBottom: '10px',
            }}>
              {kw.phase}
            </div>
            <h2 style={{
              fontFamily: 'Space Mono, monospace', fontSize: '20px',
              fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase',
              color: TEXT, margin: 0,
            }}>
              {kw.label}
            </h2>
          </div>
          <div style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            padding: '6px 12px',
            border: `1px solid ${kw.notSimulated ? BORDER : 'rgba(61,220,151,0.3)'}`,
            background: kw.notSimulated ? 'transparent' : 'rgba(61,220,151,0.06)',
            flexShrink: 0,
          }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: kw.notSimulated ? TEXT_OFF : SUCCESS }} />
            <span style={{
              fontFamily: 'Space Mono, monospace', fontSize: '8px',
              letterSpacing: '1.5px', textTransform: 'uppercase',
              color: kw.notSimulated ? TEXT_OFF : SUCCESS,
            }}>
              {kw.notSimulated ? 'Display only' : 'Simulated'}
            </span>
          </div>
        </div>

        {/* Rule */}
        <div>
          <div style={{ fontFamily: 'Space Mono, monospace', fontSize: '9px', letterSpacing: '2px', textTransform: 'uppercase', color: TEXT_WEAK, marginBottom: '10px' }}>
            Official Rule
          </div>
          <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, padding: '14px 18px', fontFamily: 'Georgia, serif', fontSize: '14px', lineHeight: 1.75, color: TEXT_SEC }}>
            {kw.rule}
          </div>
        </div>

        {/* When to use */}
        <div>
          <div style={{ fontFamily: 'Space Mono, monospace', fontSize: '9px', letterSpacing: '2px', textTransform: 'uppercase', color: ACCENT, marginBottom: '10px', opacity: 0.8 }}>
            When to use
          </div>
          <p style={{ fontFamily: 'Georgia, serif', fontSize: '14px', lineHeight: 1.8, color: TEXT_SEC, margin: 0 }}>
            {kw.when}
          </p>
        </div>

        {/* Blast tier breakdown */}
        {kw.type === 'BLAST' && (
          <div>
            <div style={{ fontFamily: 'Space Mono, monospace', fontSize: '9px', letterSpacing: '2px', textTransform: 'uppercase', color: TEXT_WEAK, marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span>Threshold breakdown</span>
              <div style={{ flex: 1, height: '1px', background: BORDER }} />
            </div>
            <BlastTierTable />
          </div>
        )}

        {/* Comparison simulation */}
        {!kw.notSimulated && SCENARIOS[kw.type] && (
          <div>
            <div style={{
              fontFamily: 'Space Mono, monospace', fontSize: '9px',
              letterSpacing: '2px', textTransform: 'uppercase',
              color: TEXT_WEAK, marginBottom: '14px',
              display: 'flex', alignItems: 'center', gap: '10px',
            }}>
              <span>Live comparison · vs 20 Boyz</span>
              <div style={{ flex: 1, height: '1px', background: BORDER }} />
            </div>
            <ComparisonPanel kwType={kw.type} />
          </div>
        )}

        {/* Simulator note */}
        <div>
          <div style={{ ...TYPE.label, marginBottom: '10px' }}>Simulator note</div>
          <p style={{ ...TYPE.note, color: TEXT_SEC, margin: 0, borderLeft: `2px solid ${BORDER}`, paddingLeft: '14px' }}>
            {kw.note}
          </p>
        </div>

      </div>
    </div>
  )
}

// ── Page ───────────────────────────────────────────────────────────────────────

export function KeywordsPage() {
  const [selected, setSelected] = useState(KEYWORD_REGISTRY[0])

  useEffect(() => {
    document.title = "Keywords — Prob'Hammer"
  }, [])

  return (
    <div style={{ paddingTop: '52px', height: '100vh', display: 'flex', flexDirection: 'column', color: TEXT_SEC }}>

      {/* Header */}
      <div style={{
        padding: '20px 40px',
        borderBottom: `1px solid ${BORDER}`,
        display: 'flex', alignItems: 'baseline', gap: '24px',
        flexShrink: 0,
      }}>
        <h1 style={{
          fontFamily: 'Space Mono, monospace', fontSize: '13px',
          fontWeight: 700, letterSpacing: '3px', textTransform: 'uppercase',
          color: TEXT, margin: 0,
        }}>
          Keyword Reference
        </h1>
        <span style={{
          fontFamily: 'Space Mono, monospace', fontSize: '9px',
          letterSpacing: '2px', textTransform: 'uppercase', color: TEXT_WEAK,
        }}>
          {KEYWORD_REGISTRY.length} keywords · 10th Edition
        </span>
      </div>

      {/* Split layout */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', minHeight: 0 }}>

        {/* Left — list */}
        <div style={{
          width: '220px', flexShrink: 0,
          borderRight: `1px solid ${BORDER}`,
          overflowY: 'auto',
          paddingTop: '8px', paddingBottom: '24px',
        }}>
          {SECTIONS.map(({ label, group }) => {
            const keys = KEYWORD_REGISTRY.filter((k) => k.group === group)
            if (!keys.length) return null
            return (
              <div key={group} style={{ marginBottom: '8px' }}>
                <div style={{
                  padding: '12px 16px 6px',
                  fontFamily: 'Space Mono, monospace', fontSize: '8px',
                  letterSpacing: '2.5px', textTransform: 'uppercase', color: TEXT_OFF,
                }}>
                  {label}
                </div>
                {keys.map((kw) => (
                  <KeywordRow
                    key={kw.type}
                    kw={kw}
                    selected={selected?.type === kw.type}
                    onClick={() => setSelected(kw)}
                  />
                ))}
              </div>
            )
          })}
        </div>

        {/* Right — detail */}
        <DetailPanel kw={selected} />

      </div>
    </div>
  )
}

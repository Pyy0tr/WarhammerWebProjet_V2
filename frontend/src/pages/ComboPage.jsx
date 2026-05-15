import { useState, useRef, useEffect, useCallback } from 'react'
import { useSimulatorStore } from '../store/simulatorStore'
import { AttackerPanel } from '../components/AttackerPanel'
import { DefenderPanel } from '../components/DefenderPanel'
import { AbilityText } from '../components/AbilityText'
import { simulate } from '../engine/simulation'
import { KEYWORD_BY_TYPE } from '../engine/keywords.js'
import {
  ACCENT, BG, BORDER, ERROR, SURFACE, SURFACE_E,
  TEXT, TEXT_OFF, TEXT_SEC, TEXT_WEAK, SUCCESS, TYPE,
} from '../theme'

const N_TRIALS = 2000

// ── Preset defender profiles ──────────────────────────────────────────────────

const DEFENDERS = [
  { id: 'chaff',   label: 'Chaff',       sub: 'T3 Sv5+ W1 ×10',      toughness: 3,  save: 5, invuln: null, wounds: 1,  models: 10, fnp: null, dmg_reduction: false, debuff_hit_roll: false, keywords: [] },
  { id: 'guard',   label: 'Light Inf.',  sub: 'T4 Sv4+ W1 ×10',      toughness: 4,  save: 4, invuln: null, wounds: 1,  models: 10, fnp: null, dmg_reduction: false, debuff_hit_roll: false, keywords: [] },
  { id: 'marine',  label: 'Marine',      sub: 'T4 Sv3+ W2 ×5',       toughness: 4,  save: 3, invuln: null, wounds: 2,  models:  5, fnp: null, dmg_reduction: false, debuff_hit_roll: false, keywords: [] },
  { id: 'marin4',  label: 'Marine+4++',  sub: 'T4 Sv3+ 4++ W2 ×5',   toughness: 4,  save: 3, invuln: 4,    wounds: 2,  models:  5, fnp: null, dmg_reduction: false, debuff_hit_roll: false, keywords: [] },
  { id: 'term',    label: 'Terminator',  sub: 'T5 Sv2+ 4++ W3 ×3',   toughness: 5,  save: 2, invuln: 4,    wounds: 3,  models:  3, fnp: null, dmg_reduction: false, debuff_hit_roll: false, keywords: [] },
  { id: 'elite',   label: 'Tough Elite', sub: 'T6 Sv4+ 5++ FNP6+ ×2', toughness: 6, save: 4, invuln: 5,    wounds: 4,  models:  2, fnp: 6,    dmg_reduction: false, debuff_hit_roll: false, keywords: [] },
  { id: 'vehicle', label: 'Vehicle',     sub: 'T10 Sv2+ W12',         toughness: 10, save: 2, invuln: null, wounds: 12, models:  1, fnp: null, dmg_reduction: false, debuff_hit_roll: false, keywords: [] },
  { id: 'super',   label: 'Super-Heavy', sub: 'T12 Sv2+ 4++ W18',     toughness: 12, save: 2, invuln: 4,    wounds: 18, models:  1, fnp: null, dmg_reduction: false, debuff_hit_roll: false, keywords: [] },
]

// ── Keyword rows ──────────────────────────────────────────────────────────────

const KW_ROWS = [
  { id: 'base',   label: 'Baseline',        kw: null,                                      buff: null },
  { id: 'lethal', label: '+ Lethal Hits',   kw: { type: 'LETHAL_HITS' },                  buff: null },
  { id: 'sust',   label: '+ Sustained 1',   kw: { type: 'SUSTAINED_HITS', value: '1' },   buff: null },
  { id: 'dev',    label: '+ Dev. Wounds',   kw: { type: 'DEVASTATING_WOUNDS' },            buff: null },
  { id: 'twin',   label: '+ Twin-Linked',   kw: { type: 'TWIN_LINKED' },                  buff: null },
  { id: 'rr_h',   label: '+ Reroll Hits',   kw: null, buff: { type: 'REROLL_HITS',    value: 'all' } },
  { id: 'rr_w',   label: '+ Reroll Wounds', kw: null, buff: { type: 'REROLL_WOUNDS',  value: 'all' } },
  { id: 'hit_p1', label: '+ Hit +1',        kw: null, buff: { type: 'HIT_MODIFIER',   value: 1 } },
  { id: 'wnd_p1', label: '+ Wound +1',      kw: null, buff: { type: 'WOUND_MODIFIER', value: 1 } },
  { id: 'ap_m1',  label: '+ AP -1',         kw: null, buff: { type: 'AP_MODIFIER',    value: -1 } },
]

// ── Matrix computation ────────────────────────────────────────────────────────

function buildAttacks(storeAttacks, row) {
  return storeAttacks.map(({ models, weapon, buffs }) => {
    const baseKws  = weapon.keywords ?? []
    const hasSame  = row.kw && baseKws.some(k => k.type === row.kw.type)
    const keywords = row.kw && !hasSame ? [...baseKws, row.kw] : baseKws
    const extraBuf = row.buff ? [row.buff] : []
    return { models, weapon: { ...weapon, keywords }, buffs: [...(buffs ?? []), ...extraBuf] }
  })
}

function computeMatrix(storeAttacks, storeContext) {
  const result = {}
  for (const row of KW_ROWS) {
    result[row.id] = {}
    const attacks = buildAttacks(storeAttacks, row)
    for (const def of DEFENDERS) {
      const { id: _i, label: _l, sub: _s, ...defenderStats } = def
      const res = simulate({ attacks, defender: defenderStats, context: storeContext, n_trials: N_TRIALS })
      result[row.id][def.id] = res.summary.mean_damage
    }
  }
  return result
}

function cellBg(ratio) {
  return `rgba(61,220,151,${(0.06 + ratio * 0.42).toFixed(2)})`
}

// ── Step bar (identical to SimulatorPage) ────────────────────────────────────

const STEPS = [
  { n: 1, label: 'Attack' },
  { n: 2, label: 'Review' },
  { n: 3, label: 'Context' },
  { n: 4, label: 'Matrix' },
]

function StepBar({ current, onStep }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', padding: '0 48px', borderBottom: `1px solid ${BORDER}` }}>
      {STEPS.map((s) => {
        const active    = s.n === current
        const completed = s.n < current
        const clickable = s.n < current
        return (
          <button key={s.n} onClick={() => clickable && onStep(s.n)} style={{
            flex: 1, padding: '14px 0 12px',
            background: 'none', border: 'none',
            borderBottom: active ? `2px solid ${ACCENT}` : '2px solid transparent',
            cursor: clickable ? 'pointer' : 'default',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
            transition: 'border-color 150ms',
          }}>
            <span style={{
              width: '20px', height: '20px', borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: active ? ACCENT : completed ? SURFACE_E : 'transparent',
              border: `1px solid ${active || completed ? ACCENT : BORDER}`,
              fontFamily: 'Space Mono, monospace', fontSize: '10px', fontWeight: 700,
              color: active ? BG : completed ? ACCENT : TEXT_OFF,
              transition: 'all 150ms',
            }}>
              {completed ? '✓' : s.n}
            </span>
            <span style={{
              fontFamily: 'Space Mono, monospace', fontSize: '10px',
              letterSpacing: '1.5px', textTransform: 'uppercase',
              color: active ? ACCENT : completed ? TEXT_SEC : TEXT_OFF,
              fontWeight: active ? 700 : 400, transition: 'color 150ms',
            }}>
              {s.label}
            </span>
          </button>
        )
      })}
    </div>
  )
}

// ── Separator (identical to SimulatorPage) ───────────────────────────────────

function Separator() {
  return (
    <div style={{
      fontFamily: 'Space Mono, monospace', fontSize: '10px', letterSpacing: '3px',
      color: ACCENT, overflow: 'hidden', whiteSpace: 'nowrap', lineHeight: 1,
      padding: '10px 0', userSelect: 'none', opacity: 0.4,
    }}>
      {'≈ '.repeat(300)}
    </div>
  )
}

// ── Attack card (identical to SimulatorPage) ─────────────────────────────────

function AttackCard({ attack, idx, onEdit, onRemove }) {
  const w     = attack.weapon
  const kwList = (w.keywords ?? []).map((k) => {
    if (k.type === 'ANTI') return `Anti-${k.target} ${k.threshold}+`
    if (k.value !== undefined) return `${k.type.replace(/_/g, ' ')} ${k.value}`
    return k.type.replace(/_/g, ' ')
  })
  return (
    <div style={{ border: `1px solid ${BORDER}`, padding: '14px 16px', background: SURFACE, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '4px' }}>
          <span style={{ fontFamily: 'Space Mono, monospace', fontSize: '8px', letterSpacing: '1.5px', color: TEXT_OFF }}>#{idx + 1}</span>
          <span style={{ fontFamily: 'Space Mono, monospace', fontSize: '12px', fontWeight: 700, color: ACCENT }}>{w.name || 'Custom weapon'}</span>
        </div>
        <div style={{ fontFamily: 'Space Mono, monospace', fontSize: '10px', color: TEXT_SEC, letterSpacing: '0.5px' }}>
          {attack.models}× · A{w.attacks} · BS{w.skill}+ · S{w.strength} · AP{w.ap} · D{w.damage}
        </div>
        {kwList.length > 0 && (
          <div style={{ fontFamily: 'Space Mono, monospace', fontSize: '8px', color: TEXT_WEAK, marginTop: '4px', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
            {kwList.join(' · ')}
          </div>
        )}
        {attack.buffs?.length > 0 && (
          <div style={{ fontFamily: 'Space Mono, monospace', fontSize: '8px', color: 'rgba(194,143,133,0.7)', marginTop: '3px', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
            {attack.buffs.map((b) => `${b.type.replace(/_/g, ' ')} (${b.value})`).join(' · ')}
          </div>
        )}
      </div>
      <div style={{ display: 'flex', gap: '6px', marginLeft: '12px', flexShrink: 0 }}>
        <button onClick={() => onEdit(idx)} style={{ background: 'none', border: `1px solid ${BORDER}`, color: ACCENT, fontFamily: 'Space Mono, monospace', fontSize: '8px', letterSpacing: '1px', textTransform: 'uppercase', padding: '4px 8px', cursor: 'pointer' }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = ACCENT }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = BORDER }}>Edit</button>
        <button onClick={() => onRemove(idx)} style={{ background: 'none', border: `1px solid rgba(255,92,122,0.3)`, color: ERROR, fontFamily: 'Space Mono, monospace', fontSize: '8px', letterSpacing: '1px', textTransform: 'uppercase', padding: '4px 8px', cursor: 'pointer' }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = ERROR }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,92,122,0.3)' }}>×</button>
      </div>
    </div>
  )
}

// ── Step 1: Attack ────────────────────────────────────────────────────────────

function AttackStep() {
  const addAttack  = useSimulatorStore((s) => s.addAttack)
  const weapon     = useSimulatorStore((s) => s.attacker.weapon)
  const editingIdx = useSimulatorStore((s) => s.editingIdx)
  const attacks    = useSimulatorStore((s) => s.attacks)
  const setStep    = useSimulatorStore((s) => s.setStep)
  const hasWeapon  = Boolean(weapon.name)

  return (
    <div style={{ maxWidth: '560px', margin: '0 auto' }}>
      <AttackerPanel />
      <div style={{ display: 'flex', gap: '12px', marginTop: '28px' }}>
        <button onClick={addAttack} disabled={!hasWeapon} style={{
          flex: 1, padding: '14px',
          background: hasWeapon ? ACCENT : 'transparent',
          border: `1px solid ${hasWeapon ? ACCENT : BORDER}`,
          color: hasWeapon ? BG : TEXT_OFF,
          fontFamily: 'Space Mono, monospace', fontSize: '10px',
          fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase',
          cursor: hasWeapon ? 'pointer' : 'default', opacity: hasWeapon ? 1 : 0.4, transition: 'opacity 120ms',
        }}
          onMouseEnter={e => { if (hasWeapon) e.currentTarget.style.opacity = '0.85' }}
          onMouseLeave={e => { e.currentTarget.style.opacity = hasWeapon ? '1' : '0.4' }}>
          {editingIdx !== null ? 'Save changes →' : 'Confirm attack →'}
        </button>
      </div>
      {attacks.length > 0 && (
        <div style={{ marginTop: '16px', textAlign: 'center', fontFamily: 'Space Mono, monospace', fontSize: '10px', color: TEXT_WEAK }}>
          {attacks.length} attack{attacks.length > 1 ? 's' : ''} configured —{' '}
          <button onClick={() => setStep(2)} style={{ background: 'none', border: 'none', color: ACCENT, fontFamily: 'Space Mono, monospace', fontSize: '10px', cursor: 'pointer', textDecoration: 'underline', padding: 0 }}>
            review
          </button>
        </div>
      )}
    </div>
  )
}

// ── Step 2: Review ────────────────────────────────────────────────────────────

function ReviewStep() {
  const attacks       = useSimulatorStore((s) => s.attacks)
  const setStep       = useSimulatorStore((s) => s.setStep)
  const editAttack    = useSimulatorStore((s) => s.editAttack)
  const removeAttack  = useSimulatorStore((s) => s.removeAttack)
  const resetAttacker = useSimulatorStore((s) => s.resetAttacker)

  return (
    <div style={{ maxWidth: '640px', margin: '0 auto' }}>
      <div style={{ fontFamily: 'Space Mono, monospace', fontSize: '8px', letterSpacing: '2px', textTransform: 'uppercase', color: TEXT_WEAK, marginBottom: '16px' }}>
        Attacks configured ({attacks.length})
      </div>
      {attacks.length === 0 && (
        <div style={{ padding: '32px', border: `1px dashed ${BORDER}`, textAlign: 'center', fontFamily: 'Space Mono, monospace', fontSize: '10px', color: TEXT_WEAK }}>
          No attacks yet. Add at least one to continue.
        </div>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '24px' }}>
        {attacks.map((atk, i) => (
          <AttackCard key={atk._id} attack={atk} idx={i} onEdit={editAttack} onRemove={removeAttack} />
        ))}
      </div>
      <div style={{ display: 'flex', gap: '12px' }}>
        <button onClick={() => { resetAttacker(); setStep(1) }} style={{
          flex: 1, padding: '12px', background: 'transparent', border: `1px solid ${BORDER}`,
          color: ACCENT, fontFamily: 'Space Mono, monospace', fontSize: '10px',
          letterSpacing: '1.5px', textTransform: 'uppercase', cursor: 'pointer', transition: 'background 100ms',
        }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(47,224,255,0.07)' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}>
          + Add another attack
        </button>
        {attacks.length > 0 && (
          <button onClick={() => setStep(3)} style={{
            flex: 1, padding: '12px', background: ACCENT, border: `1px solid ${ACCENT}`,
            color: BG, fontFamily: 'Space Mono, monospace', fontSize: '10px',
            fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', cursor: 'pointer', transition: 'opacity 100ms',
          }}
            onMouseEnter={e => { e.currentTarget.style.opacity = '0.85' }}
            onMouseLeave={e => { e.currentTarget.style.opacity = '1' }}>
            Next: Context →
          </button>
        )}
      </div>
    </div>
  )
}

// ── Step 3: Context (defender panel reused, but Run Matrix button) ────────────

function ContextStep({ onRunMatrix, running }) {
  const setStep = useSimulatorStore((s) => s.setStep)

  return (
    <div style={{ maxWidth: '560px', margin: '0 auto' }}>
      <DefenderPanel />
      <div style={{ display: 'flex', gap: '12px', marginTop: '28px' }}>
        <button onClick={() => setStep(2)} style={{
          padding: '12px 20px', background: 'transparent', border: `1px solid ${BORDER}`,
          color: TEXT_WEAK, fontFamily: 'Space Mono, monospace', fontSize: '10px',
          letterSpacing: '1.5px', textTransform: 'uppercase', cursor: 'pointer', transition: 'color 100ms',
        }}
          onMouseEnter={e => { e.currentTarget.style.color = ACCENT }}
          onMouseLeave={e => { e.currentTarget.style.color = TEXT_WEAK }}>
          ← Back
        </button>
        <button onClick={onRunMatrix} disabled={running} style={{
          flex: 1, padding: '14px',
          background: running ? SURFACE : ACCENT, border: `1px solid ${ACCENT}`,
          color: running ? TEXT_WEAK : BG,
          fontFamily: 'Space Mono, monospace', fontSize: '11px',
          fontWeight: 700, letterSpacing: '3px', textTransform: 'uppercase',
          cursor: running ? 'default' : 'pointer', opacity: running ? 0.5 : 1, transition: 'opacity 120ms',
        }}
          onMouseEnter={e => { if (!running) e.currentTarget.style.opacity = '0.85' }}
          onMouseLeave={e => { e.currentTarget.style.opacity = running ? '0.5' : '1' }}>
          {running ? 'Computing…' : 'Run Matrix →'}
        </button>
      </div>
    </div>
  )
}

// ── Step 4: Matrix results ────────────────────────────────────────────────────

function MatrixStep({ matrix, onBack }) {
  const attacks = useSimulatorStore((s) => s.attacks)
  const resetAll = useSimulatorStore((s) => s.resetAll)

  const colStats = {}
  for (const d of DEFENDERS) {
    const vals = KW_ROWS.map(r => matrix[r.id][d.id])
    colStats[d.id] = { min: Math.min(...vals), max: Math.max(...vals) }
  }
  const baseDmg = matrix['base']

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
      {/* Summary chips */}
      {attacks.length > 0 && (
        <div style={{ marginBottom: '24px' }}>
          <div style={{ fontFamily: 'Space Mono, monospace', fontSize: '8px', letterSpacing: '2px', textTransform: 'uppercase', color: TEXT_WEAK, marginBottom: '10px' }}>
            Attacks ({attacks.length}) · {N_TRIALS.toLocaleString()} trials per cell
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {attacks.map((atk) => (
              <div key={atk._id} style={{ padding: '6px 10px', border: `1px solid ${BORDER}`, fontFamily: 'Space Mono, monospace', fontSize: '10px', color: TEXT_SEC }}>
                {atk.models}× {atk.weapon.name || 'Custom'}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Matrix table */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ borderCollapse: 'collapse', tableLayout: 'fixed', width: '100%' }}>
          <colgroup>
            <col style={{ width: '160px' }} />
            {DEFENDERS.map(d => <col key={d.id} style={{ width: '130px' }} />)}
          </colgroup>
          <thead>
            <tr>
              <th style={{ padding: '0 0 16px', textAlign: 'left', verticalAlign: 'bottom', borderBottom: `1px solid ${BORDER}` }}>
                <span style={{ ...TYPE.label, color: TEXT_OFF }}>Keyword</span>
              </th>
              {DEFENDERS.map(def => (
                <th key={def.id} style={{ padding: '0 8px 16px', textAlign: 'center', verticalAlign: 'bottom', borderBottom: `1px solid ${BORDER}` }}>
                  <div style={{ ...TYPE.heading, color: TEXT, marginBottom: '4px' }}>{def.label}</div>
                  <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '8px', letterSpacing: '1px', textTransform: 'uppercase', color: TEXT_WEAK, lineHeight: 1.4 }}>{def.sub}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {KW_ROWS.map((row, ri) => {
              const isBase = row.id === 'base'
              return (
                <tr key={row.id} style={{ borderTop: ri > 0 ? `1px solid ${BORDER}` : 'none' }}>
                  <td style={{ padding: '12px 0', verticalAlign: 'middle' }}>
                    <span style={{ fontFamily: 'Space Mono, monospace', fontSize: '10px', letterSpacing: '1.5px', textTransform: 'uppercase', color: isBase ? TEXT_SEC : TEXT }}>
                      {row.label}
                    </span>
                  </td>
                  {DEFENDERS.map(def => {
                    const val   = matrix[row.id][def.id]
                    const stats = colStats[def.id]
                    const range = stats.max - stats.min
                    const ratio = range < 0.001 ? 0 : (val - stats.min) / range
                    const bg    = cellBg(ratio)
                    const pct   = (isBase || !baseDmg[def.id])
                      ? null
                      : ((val - baseDmg[def.id]) / Math.max(baseDmg[def.id], 0.01)) * 100
                    return (
                      <td key={def.id} style={{ padding: '10px 8px', textAlign: 'center', verticalAlign: 'middle', background: bg }}>
                        <div style={{ fontFamily: 'Space Mono, monospace', fontSize: '14px', fontWeight: 700, color: ratio > 0.55 ? SUCCESS : TEXT, lineHeight: 1 }}>
                          {val.toFixed(1)}
                        </div>
                        {!isBase && pct !== null && (
                          <div style={{ fontFamily: 'Space Mono, monospace', fontSize: '9px', color: pct > 0.5 ? SUCCESS : TEXT_OFF, marginTop: '4px', lineHeight: 1 }}>
                            {pct > 0.5 ? `+${pct.toFixed(0)}%` : '—'}
                          </div>
                        )}
                      </td>
                    )
                  })}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginTop: '16px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div style={{ width: '32px', height: '8px', background: cellBg(0),   border: `1px solid ${BORDER}` }} />
          <div style={{ width: '32px', height: '8px', background: cellBg(0.5), border: `1px solid ${BORDER}` }} />
          <div style={{ width: '32px', height: '8px', background: cellBg(1.0), border: `1px solid ${BORDER}` }} />
          <span style={{ ...TYPE.label, color: TEXT_OFF }}>Low → High damage (per column)</span>
        </div>
        <span style={{ ...TYPE.label, color: TEXT_OFF }}>% = gain vs Baseline · — = &lt;0.5%</span>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: '12px', marginTop: '32px' }}>
        <button onClick={onBack} style={{
          padding: '10px 18px', background: 'transparent', border: `1px solid ${BORDER}`,
          color: TEXT_WEAK, fontFamily: 'Space Mono, monospace', fontSize: '10px',
          letterSpacing: '1.5px', textTransform: 'uppercase', cursor: 'pointer', transition: 'color 100ms',
        }}
          onMouseEnter={e => { e.currentTarget.style.color = ACCENT }}
          onMouseLeave={e => { e.currentTarget.style.color = TEXT_WEAK }}>
          ← Change context
        </button>
        <button onClick={resetAll} style={{
          padding: '10px 18px', background: 'transparent', border: `1px solid ${ERROR}44`,
          color: ERROR, fontFamily: 'Space Mono, monospace', fontSize: '10px',
          letterSpacing: '1.5px', textTransform: 'uppercase', cursor: 'pointer', transition: 'background 100ms, border-color 100ms',
        }}
          onMouseEnter={e => { e.currentTarget.style.background = `${ERROR}18`; e.currentTarget.style.borderColor = ERROR }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = `${ERROR}44` }}>
          ↺ New matrix
        </button>
      </div>
    </div>
  )
}

// ── Keyword definition panel (identical to SimulatorPage) ────────────────────

function KeywordDefinitionPanel() {
  const hoveredKeyword = useSimulatorStore((s) => s.hoveredKeyword)
  const lastDefRef     = useRef(null)
  const [visible, setVisible] = useState(false)
  const def     = hoveredKeyword ? KEYWORD_BY_TYPE[hoveredKeyword] : null
  if (def) lastDefRef.current = def
  const display = def || lastDefRef.current

  useEffect(() => {
    if (def) setVisible(true)
    else {
      const t = setTimeout(() => setVisible(false), 220)
      return () => clearTimeout(t)
    }
  }, [def])

  return (
    <div style={{ position: 'fixed', left: '48px', top: '50%', transform: 'translateY(-50%)', width: 'calc((100vw - 560px) / 2 - 48px)', maxWidth: '320px', display: 'flex', justifyContent: 'center', padding: '0 16px', boxSizing: 'border-box', pointerEvents: def ? 'auto' : 'none', zIndex: 10 }}>
      <div style={{ width: '100%', maxWidth: '300px', opacity: def ? 1 : 0, transform: def ? 'translateX(0)' : 'translateX(-12px)', transition: 'opacity 200ms ease, transform 200ms ease' }}>
        {(visible || def) && display && (
          <div style={{ border: `1px solid ${def ? ACCENT + '44' : BORDER}`, background: SURFACE, padding: '22px', transition: 'border-color 200ms ease' }}>
            <div style={{ fontFamily: 'Space Mono, monospace', fontSize: '7px', letterSpacing: '2.5px', textTransform: 'uppercase', color: TEXT_OFF, marginBottom: '10px' }}>{display.phase}</div>
            <div style={{ fontFamily: 'Space Mono, monospace', fontSize: '14px', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: ACCENT, marginBottom: '16px', lineHeight: 1.2 }}>{display.label}</div>
            <div style={{ height: '1px', background: `linear-gradient(to right, ${ACCENT}44, ${BORDER})`, marginBottom: '16px' }} />
            <p style={{ fontFamily: 'Georgia, serif', fontSize: '13px', lineHeight: 1.75, color: TEXT_SEC, margin: '0 0 14px 0' }}>{display.rule}</p>
            <div style={{ padding: '10px 12px', background: 'rgba(47,224,255,0.04)', borderLeft: `2px solid ${ACCENT}55` }}>
              <div style={{ fontFamily: 'Space Mono, monospace', fontSize: '7px', letterSpacing: '2px', textTransform: 'uppercase', color: TEXT_WEAK, marginBottom: '6px' }}>Note</div>
              <p style={{ fontFamily: 'Georgia, serif', fontSize: '12px', lineHeight: 1.7, color: TEXT_WEAK, margin: 0, fontStyle: 'italic' }}>{display.note}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Unit abilities panel (identical to SimulatorPage) ────────────────────────

const ABS_STYLE_ID = 'combo-abilities-keyframes'

function injectAbilitiesStyles() {
  if (document.getElementById(ABS_STYLE_ID)) return
  const s = document.createElement('style')
  s.id = ABS_STYLE_ID
  s.textContent = `
    @keyframes comboAbilityIn { from { opacity:0; transform:translateX(10px); } to { opacity:1; transform:translateX(0); } }
    @keyframes comboHeaderScan { 0% { letter-spacing:4px; opacity:0; } 60% { letter-spacing:1px; opacity:1; } 100% { letter-spacing:1px; opacity:1; } }
    @keyframes comboDividerGrow { from { transform:scaleX(0); transform-origin:left; } to { transform:scaleX(1); } }
    .combo-abilities-scroll::-webkit-scrollbar { width:4px; }
    .combo-abilities-scroll::-webkit-scrollbar-thumb { background:${ACCENT}33; border-radius:2px; }
    .combo-ability-card { padding:10px 12px; background:rgba(47,224,255,0.03); border-left:2px solid ${ACCENT}44; transition:background 150ms, border-left-color 150ms; }
    .combo-ability-card:hover { background:rgba(47,224,255,0.07); border-left-color:${ACCENT}99; }
  `
  document.head.appendChild(s)
}

function UnitAbilitiesPanel({ role }) {
  const unit = useSimulatorStore((s) => role === 'attacker' ? s.attackerUnit : s.defenderUnit)
  const abilities = unit?.abilities ?? []
  const [animKey, setAnimKey] = useState(0)
  const prevId = useRef(null)

  useEffect(() => { injectAbilitiesStyles() }, [])
  useEffect(() => {
    if (unit?.id !== prevId.current) { prevId.current = unit?.id ?? null; if (unit?.id) setAnimKey(k => k + 1) }
  }, [unit?.id])

  if (!abilities.length) return null
  return (
    <div style={{ position: 'fixed', left: 'calc(50% + 280px + 24px)', right: '48px', top: '50%', transform: 'translateY(-50%)', zIndex: 10 }}>
      <div style={{ border: `1px solid ${BORDER}`, background: SURFACE, padding: '18px', maxHeight: 'calc(100vh - 160px)', overflowY: 'auto' }} className="combo-abilities-scroll">
        <div style={{ fontFamily: 'Space Mono, monospace', fontSize: '7px', letterSpacing: '2.5px', textTransform: 'uppercase', color: TEXT_OFF, marginBottom: '6px' }}>{role} unit</div>
        <div key={`name-${animKey}`} style={{ fontFamily: 'Space Mono, monospace', fontSize: '13px', fontWeight: 700, textTransform: 'uppercase', color: ACCENT, marginBottom: '14px', lineHeight: 1.2, animation: 'comboHeaderScan 400ms ease forwards' }}>{unit.name}</div>
        <div key={`divider-${animKey}`} style={{ height: '1px', background: `linear-gradient(to right, ${ACCENT}44, ${BORDER})`, marginBottom: '14px', animation: 'comboDividerGrow 350ms ease forwards' }} />
        <div style={{ fontFamily: 'Space Mono, monospace', fontSize: '7px', letterSpacing: '2px', textTransform: 'uppercase', color: TEXT_WEAK, marginBottom: '12px' }}>{abilities.length} abilit{abilities.length !== 1 ? 'ies' : 'y'}</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {abilities.map((ab, i) => (
            <div key={`${animKey}-${i}`} className="combo-ability-card" style={{ animation: 'comboAbilityIn 280ms ease forwards', animationDelay: `${i * 40}ms`, opacity: 0 }}>
              <div style={{ fontFamily: 'Space Mono, monospace', fontSize: '10px', fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase', color: TEXT, marginBottom: '6px' }}>{ab.name}</div>
              {ab.desc && <p style={{ fontFamily: 'Georgia, serif', fontSize: '11px', lineHeight: 1.65, color: TEXT_SEC, margin: 0 }}><AbilityText text={ab.desc} /></p>}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export function ComboPage() {
  const step     = useSimulatorStore((s) => s.step)
  const setStep  = useSimulatorStore((s) => s.setStep)
  const resetAll = useSimulatorStore((s) => s.resetAll)

  const [matrix,  setMatrix]  = useState(null)
  const [running, setRunning] = useState(false)
  const [resetHover, setResetHover] = useState(false)
  const contentRef = useRef(null)

  useEffect(() => {
    contentRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [step])

  const handleRunMatrix = useCallback(() => {
    const { attacks, context } = useSimulatorStore.getState()
    if (!attacks.length) return
    setRunning(true)
    setTimeout(() => {
      try {
        setMatrix(computeMatrix(attacks, context))
        setStep(4)
      } finally {
        setRunning(false)
      }
    }, 0)
  }, [setStep])

  return (
    <div style={{ color: TEXT_SEC, minHeight: '100vh', paddingTop: '52px' }}>

      <div style={{ padding: '0 48px' }}>
        <Separator />
        <div style={{ padding: '18px 0 14px' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '16px' }}>
              <h1 style={{ fontFamily: 'Space Mono, monospace', fontWeight: 700, fontSize: 'clamp(18px, 2vw, 26px)', letterSpacing: '0.05em', textTransform: 'uppercase', lineHeight: 1, color: TEXT }}>
                Keyword Matrix
              </h1>
              <span style={{ fontFamily: 'Space Mono, monospace', fontSize: '10px', letterSpacing: '2px', textTransform: 'uppercase', color: TEXT_WEAK }}>
                Combo Builder · WH40K 10e
              </span>
            </div>
            <button onClick={resetAll}
              onMouseEnter={() => setResetHover(true)}
              onMouseLeave={() => setResetHover(false)}
              style={{
                background: resetHover ? ERROR : `${ERROR}22`,
                border: `1px solid ${ERROR}`, color: resetHover ? BG : ERROR,
                fontFamily: 'Space Mono, monospace', fontSize: '10px',
                fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase',
                padding: '9px 20px', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: '8px',
                transition: 'background 120ms, color 120ms',
              }}>
              <svg width="13" height="13" viewBox="0 0 13 13" fill="none" style={{ flexShrink: 0 }}>
                <path d="M11 2.5A5.5 5.5 0 1 0 11.5 6.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                <polyline points="9,0.5 11,2.5 9,4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Reset
            </button>
          </div>
        </div>
        <Separator />
      </div>

      <StepBar current={step} onStep={setStep} />

      <section ref={contentRef} style={{ padding: '36px 48px 80px', minHeight: 'calc(100vh - 200px)', position: 'relative' }}>
        {step === 1 && <KeywordDefinitionPanel />}
        {step === 1 && <UnitAbilitiesPanel role="attacker" />}
        {step === 1 && <AttackStep />}
        {step === 2 && <ReviewStep />}
        {step === 3 && <UnitAbilitiesPanel role="defender" />}
        {step === 3 && <ContextStep onRunMatrix={handleRunMatrix} running={running} />}
        {step === 4 && matrix && <MatrixStep matrix={matrix} onBack={() => setStep(3)} />}
      </section>

      <div style={{ padding: '0 48px 24px' }}>
        <Separator />
        <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '12px', fontFamily: 'Space Mono, monospace', fontSize: '10px', letterSpacing: '2px', textTransform: 'uppercase', color: TEXT_OFF }}>
          <span>WH40K KEYWORD MATRIX — V2</span>
          <span>SIMULATION RUNS IN BROWSER — ZERO LATENCY</span>
        </div>
      </div>
    </div>
  )
}

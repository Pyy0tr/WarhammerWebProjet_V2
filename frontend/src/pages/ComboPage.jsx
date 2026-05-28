import { useState, useEffect, useCallback, useMemo } from 'react'
import { useIsMobile } from '../hooks/useIsMobile'
import { useSimulatorStore } from '../store/simulatorStore'
import { AttackerPanel } from '../components/AttackerPanel'
import { AbilityText } from '../components/AbilityText'
import { simulate } from '../engine/simulation'
import { KEYWORD_BY_TYPE } from '../engine/keywords.js'
import {
  ACCENT_TEXT, ACCENT, BG, BORDER, ERROR, SURFACE, SURFACE_E,
  TEXT, TEXT_OFF, TEXT_SEC, TEXT_WEAK, SUCCESS, TYPE, FONT_UI, ACCENT_LIGHT,
} from '../theme'

const N_TRIALS = 2000

// ── Synergy columns ───────────────────────────────────────────────────────────

const SYNERGY_PRESETS = [
  {
    id: 'base',
    label: 'Baseline',
    desc: 'No additional synergies',
    keywords: [],
    buffs: [],
  },
  {
    id: 'rr1s',
    label: 'Re-roll 1s',
    desc: 'Re-roll hit rolls of 1',
    keywords: [],
    buffs: [{ type: 'REROLL_HITS', value: 'ones' }],
  },
  {
    id: 'lethal',
    label: 'Lethal Hits',
    desc: 'Critical hits wound automatically',
    keywords: [{ type: 'LETHAL_HITS' }],
    buffs: [],
  },
  {
    id: 'extra_ap',
    label: 'Extra AP',
    desc: 'AP improves by 1 (e.g. AP0 → AP−1)',
    keywords: [],
    buffs: [{ type: 'AP_MODIFIER', value: -1 }],
  },
  {
    id: 'helbrecht',
    label: 'Helbrecht',
    desc: '+1 Attack and +1 Strength to all weapons',
    keywords: [],
    buffs: [{ type: 'ATTACKS_MODIFIER', value: 1 }, { type: 'STRENGTH_MODIFIER', value: 1 }],
  },
  {
    id: 'rr_hits',
    label: 'Re-roll Hits',
    desc: 'Re-roll all failed hit rolls',
    keywords: [],
    buffs: [{ type: 'REROLL_HITS', value: 'all' }],
  },
  {
    id: 'helb_cast',
    label: 'Helb. & Cast.',
    desc: '+1A +1S and Lethal Hits (two leaders)',
    keywords: [{ type: 'LETHAL_HITS' }],
    buffs: [{ type: 'ATTACKS_MODIFIER', value: 1 }, { type: 'STRENGTH_MODIFIER', value: 1 }],
  },
  {
    id: 'grimaldus',
    label: 'Grimaldus',
    desc: 'Re-roll wound rolls of 1',
    keywords: [],
    buffs: [{ type: 'REROLL_WOUNDS', value: 'ones' }],
  },
]

const SYNERGY_BY_ID = Object.fromEntries(SYNERGY_PRESETS.map((s) => [s.id, s]))

// ── Defender presets ──────────────────────────────────────────────────────────

const DEFENDERS = [
  { id: 'meq',     label: 'MEQ',           sub: 'T4 Sv3+ W2 ×5',       toughness: 4,  save: 3, invuln: null, wounds: 2,  models: 5,  fnp: null, dmg_reduction: false, debuff_hit_roll: false, keywords: [] },
  { id: 't5_3p',   label: 'T5 3+',         sub: 'T5 Sv3+ W2 ×5',       toughness: 5,  save: 3, invuln: null, wounds: 2,  models: 5,  fnp: null, dmg_reduction: false, debuff_hit_roll: false, keywords: [] },
  { id: 'rhino',   label: 'Rhino/Armiger', sub: 'T9 Sv3+ W8 ×1',       toughness: 9,  save: 3, invuln: null, wounds: 8,  models: 1,  fnp: null, dmg_reduction: false, debuff_hit_roll: false, keywords: [] },
  { id: 't10_3p',  label: 'T10 3+',        sub: 'T10 Sv3+ W12 ×1',     toughness: 10, save: 3, invuln: null, wounds: 12, models: 1,  fnp: null, dmg_reduction: false, debuff_hit_roll: false, keywords: [] },
  { id: 't12_2p',  label: 'T12 2+',        sub: 'T12 Sv2+ W18 ×1',     toughness: 12, save: 2, invuln: null, wounds: 18, models: 1,  fnp: null, dmg_reduction: false, debuff_hit_roll: false, keywords: [] },
  { id: 'knight',  label: 'Big Knight',    sub: 'T12 Sv2+ 4++ W24 ×1', toughness: 12, save: 2, invuln: 4,    wounds: 24, models: 1,  fnp: null, dmg_reduction: false, debuff_hit_roll: false, keywords: [] },
]

// ── Defender helpers ──────────────────────────────────────────────────────────

function generateSub(d) {
  const pts = [`T${d.toughness}`, `Sv${d.save}+`]
  if (d.invuln != null) pts.push(`${d.invuln}++`)
  if (d.fnp != null)    pts.push(`FNP${d.fnp}+`)
  pts.push(`W${d.wounds}`)
  if (d.models > 1)     pts.push(`×${d.models}`)
  return pts.join(' ')
}

const UNIT_KEYWORDS = ['INFANTRY', 'CAVALRY', 'FLY', 'BEAST', 'SWARM', 'MONSTER', 'VEHICLE', 'TITANIC']

// ── Engine helpers ────────────────────────────────────────────────────────────

function buildAttacksForColumn(baseAttacks, col) {
  return baseAttacks.map(({ models, weapon, buffs }) => {
    const baseKws = weapon.keywords ?? []
    let newKws = [...baseKws]
    for (const kw of (col.keywords ?? [])) {
      if (!newKws.some((k) => k.type === kw.type)) newKws.push(kw)
    }
    return {
      models,
      weapon: { ...weapon, keywords: newKws },
      buffs: [...(buffs ?? []), ...(col.buffs ?? [])],
    }
  })
}

function computeMatrix(baseAttacks, colIds, defenders, context) {
  const result = {}
  for (const id of colIds) {
    const col = SYNERGY_BY_ID[id]
    if (!col) continue
    result[id] = {}
    const attacks = buildAttacksForColumn(baseAttacks, col)
    for (const def of defenders) {
      const { id: _i, label: _l, sub: _s, ...defStats } = def
      const res = simulate({ attacks, defender: defStats, context, n_trials: N_TRIALS })
      result[id][def.id] = res.summary.mean_damage
    }
  }
  return result
}

function cellBg(ratio) {
  return `rgba(61,220,151,${(0.05 + ratio * 0.40).toFixed(2)})`
}

// ── Separator ─────────────────────────────────────────────────────────────────

function Separator() {
  return <div style={{ height: '1px', background: BORDER }} />
}

// ── Attack card ───────────────────────────────────────────────────────────────

function AttackCard({ attack, idx, onEdit, onRemove }) {
  const w = attack.weapon
  const kwList = (w.keywords ?? []).map((k) => {
    if (k.type === 'ANTI') return `Anti-${k.target} ${k.threshold}+`
    if (k.value !== undefined) return `${k.type.replace(/_/g, ' ')} ${k.value}`
    return k.type.replace(/_/g, ' ')
  })
  return (
    <div style={{ border: `1px solid ${BORDER}`, padding: '12px 14px', background: SURFACE, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '3px' }}>
          <span style={{ fontFamily: FONT_UI, fontSize: '11px', letterSpacing: '1.5px', color: TEXT_OFF }}>#{idx + 1}</span>
          <span style={{ fontFamily: FONT_UI, fontSize: '12px', fontWeight: 700, color: ACCENT_TEXT }}>{w.name || 'Custom weapon'}</span>
        </div>
        <div style={{ fontFamily: FONT_UI, fontSize: '10px', color: TEXT_SEC, letterSpacing: '0.5px' }}>
          {attack.models}× · A{w.attacks} · BS{w.skill}+ · S{w.strength} · AP{w.ap} · D{w.damage}
        </div>
        {kwList.length > 0 && (
          <div style={{ fontFamily: FONT_UI, fontSize: '10px', color: TEXT_WEAK, marginTop: '3px', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
            {kwList.join(' · ')}
          </div>
        )}
        {attack.buffs?.length > 0 && (
          <div style={{ fontFamily: FONT_UI, fontSize: '10px', color: 'rgba(194,143,133,0.7)', marginTop: '2px', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
            {attack.buffs.map((b) => `${b.type.replace(/_/g, ' ')} (${b.value})`).join(' · ')}
          </div>
        )}
      </div>
      <div style={{ display: 'flex', gap: '6px', marginLeft: '12px', flexShrink: 0 }}>
        <button onClick={() => onEdit(idx)}
          style={{ background: 'none', border: `1px solid ${BORDER}`, color: ACCENT_TEXT, fontFamily: FONT_UI, fontSize: '11px', letterSpacing: '1px', textTransform: 'uppercase', padding: '4px 8px', cursor: 'pointer' }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = ACCENT }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = BORDER }}>
          Edit
        </button>
        <button onClick={() => onRemove(idx)}
          style={{ background: 'none', border: `1px solid rgba(255,92,122,0.3)`, color: ERROR, fontFamily: FONT_UI, fontSize: '11px', letterSpacing: '1px', textTransform: 'uppercase', padding: '4px 8px', cursor: 'pointer' }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = ERROR }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(255,92,122,0.3)' }}>
          ×
        </button>
      </div>
    </div>
  )
}

// ── Squad drawer ──────────────────────────────────────────────────────────────

function SquadDrawer({ open, onClose }) {
  const attacks       = useSimulatorStore((s) => s.attacks)
  const addAttack     = useSimulatorStore((s) => s.addAttack)
  const editAttack    = useSimulatorStore((s) => s.editAttack)
  const removeAttack  = useSimulatorStore((s) => s.removeAttack)
  const resetAttacker = useSimulatorStore((s) => s.resetAttacker)
  const editingIdx    = useSimulatorStore((s) => s.editingIdx)
  const weapon        = useSimulatorStore((s) => s.attacker.weapon)
  const hasWeapon     = Boolean(weapon.name)

  if (!open) return null
  return (
    <div style={{ position: 'fixed', inset: 0, background: BG, zIndex: 200, overflowY: 'auto', paddingTop: '52px' }}>
      <div style={{ padding: '0 32px' }}>
        <Separator />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 0 14px' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px' }}>
            <span style={{ fontFamily: FONT_UI, fontSize: '11px', letterSpacing: '2.5px', textTransform: 'uppercase', color: TEXT_OFF }}>SQUAD</span>
            <span style={{ fontFamily: FONT_UI, fontSize: '14px', fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: TEXT }}>Configure</span>
          </div>
          <button onClick={onClose}
            style={{ background: ACCENT, border: `1px solid ${ACCENT}`, color: BG, fontFamily: FONT_UI, fontSize: '10px', fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', padding: '9px 20px', cursor: 'pointer', transition: 'opacity 100ms' }}
            onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.85' }}
            onMouseLeave={(e) => { e.currentTarget.style.opacity = '1' }}>
            Done →
          </button>
        </div>
        <Separator />
      </div>

      <div style={{ maxWidth: '560px', margin: '0 auto', padding: '32px 32px 80px' }}>
        <AttackerPanel />

        <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
          <button onClick={addAttack} disabled={!hasWeapon}
            style={{ flex: 1, padding: '13px', background: hasWeapon ? ACCENT : 'transparent', border: `1px solid ${hasWeapon ? ACCENT : BORDER}`, color: hasWeapon ? BG : TEXT_OFF, fontFamily: FONT_UI, fontSize: '10px', fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', cursor: hasWeapon ? 'pointer' : 'default', opacity: hasWeapon ? 1 : 0.4, transition: 'opacity 120ms' }}
            onMouseEnter={(e) => { if (hasWeapon) e.currentTarget.style.opacity = '0.85' }}
            onMouseLeave={(e) => { e.currentTarget.style.opacity = hasWeapon ? '1' : '0.4' }}>
            {editingIdx !== null ? 'Save changes →' : 'Add to squad →'}
          </button>
        </div>

        {attacks.length > 0 && (
          <div style={{ marginTop: '32px' }}>
            <div style={{ fontFamily: FONT_UI, fontSize: '11px', letterSpacing: '2px', textTransform: 'uppercase', color: TEXT_WEAK, marginBottom: '12px' }}>
              Squad weapons ({attacks.length})
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {attacks.map((atk, i) => (
                <AttackCard key={atk._id} attack={atk} idx={i}
                  onEdit={(idx) => { editAttack(idx) }}
                  onRemove={removeAttack} />
              ))}
            </div>
            <button onClick={() => { resetAttacker() }}
              style={{ marginTop: '12px', background: 'none', border: `1px solid ${BORDER}`, color: TEXT_WEAK, fontFamily: FONT_UI, fontSize: '10px', letterSpacing: '1.5px', textTransform: 'uppercase', padding: '9px 16px', cursor: 'pointer', transition: 'color 100ms' }}
              onMouseEnter={(e) => { e.currentTarget.style.color = ACCENT }}
              onMouseLeave={(e) => { e.currentTarget.style.color = TEXT_WEAK }}>
              + Add another weapon
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Defender edit modal ───────────────────────────────────────────────────────

const SAVE_OPTS   = [{ v: null, l: 'None' }, { v: 4, l: '4+' }, { v: 5, l: '5+' }, { v: 6, l: '6+' }]
const FNP_OPTS    = [{ v: null, l: 'None' }, { v: 4, l: '4+' }, { v: 5, l: '5+' }, { v: 6, l: '6+' }]

function OptChips({ value, opts, onChange }) {
  return (
    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
      {opts.map((o) => {
        const sel = value === o.v
        return (
          <button key={o.l} onClick={() => onChange(o.v)}
            style={{ padding: '4px 9px', background: sel ? `${ACCENT}22` : 'transparent', border: `1px solid ${sel ? ACCENT : BORDER}`, color: sel ? ACCENT_TEXT : TEXT_WEAK, fontFamily: "'Space Mono', monospace", fontSize: '11px', cursor: 'pointer', transition: 'all 80ms' }}>
            {o.l}
          </button>
        )
      })}
    </div>
  )
}

function NumIn({ value, onChange, min = 1, max = 20 }) {
  return (
    <input type="number" value={value} min={min} max={max}
      onChange={(e) => onChange(Math.max(min, Math.min(max, Number(e.target.value))))}
      style={{ width: '52px', padding: '5px 8px', background: SURFACE, border: `1px solid ${BORDER}`, color: TEXT, fontFamily: "'Space Mono', monospace", fontSize: '13px', textAlign: 'center', outline: 'none' }} />
  )
}

function ToggleBtn({ active, onClick, label }) {
  return (
    <button onClick={onClick}
      style={{ padding: '5px 11px', background: active ? `${ACCENT}22` : 'transparent', border: `1px solid ${active ? ACCENT : BORDER}`, color: active ? ACCENT_TEXT : TEXT_WEAK, fontFamily: FONT_UI, fontSize: '10px', letterSpacing: '1px', textTransform: 'uppercase', cursor: 'pointer', transition: 'all 80ms' }}>
      {label}
    </button>
  )
}

function FieldRow({ label, children }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap', marginBottom: '14px' }}>
      <div style={{ fontFamily: FONT_UI, fontSize: '10px', letterSpacing: '1.5px', textTransform: 'uppercase', color: TEXT_OFF, width: '72px', flexShrink: 0 }}>{label}</div>
      {children}
    </div>
  )
}

function DefenderEditModal({ defender, onApply, onClose }) {
  const [form, setForm] = useState({ ...defender })
  const f = (key) => (val) => setForm((p) => ({ ...p, [key]: val }))

  function applyPreset(p) {
    setForm((prev) => ({ ...p, id: prev.id }))
  }

  function toggleKw(kw) {
    setForm((p) => ({
      ...p,
      keywords: p.keywords.includes(kw) ? p.keywords.filter((k) => k !== kw) : [...p.keywords, kw],
    }))
  }

  function handleApply() {
    onApply({ ...form, sub: generateSub(form) })
    onClose()
  }

  const SAVE_NB_OPTS = [2, 3, 4, 5, 6].map((n) => ({ v: n, l: `${n}+` }))

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 300 }} />
      <div style={{
        position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
        width: 'min(520px, calc(100vw - 32px))', maxHeight: 'calc(100vh - 64px)', overflowY: 'auto',
        background: BG, border: `1px solid ${BORDER}`, zIndex: 301, padding: '24px 28px 28px',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <div style={{ fontFamily: FONT_UI, fontSize: '12px', fontWeight: 700, letterSpacing: '2.5px', textTransform: 'uppercase', color: TEXT }}>
            Edit Defender
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button onClick={handleApply}
              style={{ padding: '8px 18px', background: ACCENT, border: `1px solid ${ACCENT}`, color: BG, fontFamily: FONT_UI, fontSize: '10px', fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', cursor: 'pointer', transition: 'opacity 80ms' }}
              onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.85' }}
              onMouseLeave={(e) => { e.currentTarget.style.opacity = '1' }}>
              Apply →
            </button>
            <button onClick={onClose}
              style={{ background: 'none', border: `1px solid ${BORDER}`, color: TEXT_WEAK, fontFamily: FONT_UI, fontSize: '16px', lineHeight: 1, padding: '6px 10px', cursor: 'pointer' }}>
              ×
            </button>
          </div>
        </div>

        {/* Quick presets */}
        <div style={{ fontFamily: FONT_UI, fontSize: '10px', letterSpacing: '2px', textTransform: 'uppercase', color: TEXT_OFF, marginBottom: '8px' }}>Quick preset</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '20px' }}>
          {DEFENDERS.map((p) => (
            <button key={p.id} onClick={() => applyPreset(p)}
              style={{ padding: '5px 10px', background: 'transparent', border: `1px solid ${BORDER}`, color: TEXT_WEAK, fontFamily: FONT_UI, fontSize: '10px', letterSpacing: '1px', textTransform: 'uppercase', cursor: 'pointer', transition: 'all 80ms' }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = ACCENT; e.currentTarget.style.color = ACCENT_TEXT }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = BORDER; e.currentTarget.style.color = TEXT_WEAK }}>
              {p.label}
            </button>
          ))}
        </div>

        <div style={{ height: '1px', background: BORDER, marginBottom: '20px' }} />

        {/* Label */}
        <FieldRow label="Label">
          <input value={form.label} onChange={(e) => f('label')(e.target.value)}
            style={{ flex: 1, padding: '5px 10px', background: SURFACE, border: `1px solid ${BORDER}`, color: TEXT, fontFamily: FONT_UI, fontSize: '12px', outline: 'none' }} />
        </FieldRow>

        {/* Core stats */}
        <FieldRow label="Toughness">
          <NumIn value={form.toughness} onChange={f('toughness')} min={1} max={14} />
        </FieldRow>
        <FieldRow label="Save">
          <OptChips value={form.save} opts={SAVE_NB_OPTS} onChange={f('save')} />
        </FieldRow>
        <FieldRow label="Wounds">
          <NumIn value={form.wounds} onChange={f('wounds')} min={1} max={40} />
        </FieldRow>
        <FieldRow label="Models">
          <NumIn value={form.models} onChange={f('models')} min={1} max={20} />
        </FieldRow>

        {/* Defensive options */}
        <FieldRow label="Invuln">
          <OptChips value={form.invuln} opts={SAVE_OPTS} onChange={f('invuln')} />
        </FieldRow>
        <FieldRow label="Feel No Pain">
          <OptChips value={form.fnp} opts={FNP_OPTS} onChange={f('fnp')} />
        </FieldRow>
        <FieldRow label="Options">
          <ToggleBtn active={form.dmg_reduction}    onClick={() => f('dmg_reduction')(!form.dmg_reduction)} label="Dmg −1" />
          <ToggleBtn active={form.debuff_hit_roll}  onClick={() => f('debuff_hit_roll')(!form.debuff_hit_roll)} label="−1 to hit" />
        </FieldRow>

        {/* Keywords (Anti- targeting) */}
        <FieldRow label="Keywords">
          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
            {UNIT_KEYWORDS.map((kw) => {
              const has = form.keywords.includes(kw)
              return (
                <button key={kw} onClick={() => toggleKw(kw)}
                  style={{ padding: '4px 9px', background: has ? `${ACCENT}22` : 'transparent', border: `1px solid ${has ? ACCENT : BORDER}`, color: has ? ACCENT_TEXT : TEXT_WEAK, fontFamily: FONT_UI, fontSize: '10px', letterSpacing: '1px', textTransform: 'uppercase', cursor: 'pointer', transition: 'all 80ms' }}>
                  {kw}
                </button>
              )
            })}
          </div>
        </FieldRow>
      </div>
    </>
  )
}

// ── Column toggle chips ────────────────────────────────────────────────────────

function ColToggleRow({ activeCols, onToggle }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', padding: '12px 0' }}>
      {SYNERGY_PRESETS.map((col) => {
        const active  = activeCols.includes(col.id)
        const isBase  = col.id === 'base'
        return (
          <button
            key={col.id}
            onClick={() => !isBase && onToggle(col.id)}
            title={col.desc}
            style={{
              padding: '5px 10px',
              background: active ? `${ACCENT}22` : 'transparent',
              border: `1px solid ${active ? ACCENT : BORDER}`,
              color: active ? ACCENT_TEXT : TEXT_WEAK,
              fontFamily: FONT_UI, fontSize: '10px',
              letterSpacing: '1px', textTransform: 'uppercase',
              cursor: isBase ? 'default' : 'pointer',
              transition: 'all 100ms',
              opacity: isBase ? 0.6 : 1,
            }}
          >
            {col.label}
          </button>
        )
      })}
    </div>
  )
}

// ── Matrix table ──────────────────────────────────────────────────────────────

function MatrixTable({ matrix, activeCols, defenders, onEditDef, isMobile }) {
  const [hoveredDefId, setHoveredDefId] = useState(null)
  const cols    = activeCols.map((id) => SYNERGY_BY_ID[id]).filter(Boolean)
  const baseId  = 'base'
  const baseDmg = matrix[baseId] ?? {}

  // Per-row colour range: compare synergies for the same defender row
  const rowStats = {}
  for (const def of defenders) {
    const vals = cols.map((col) => matrix[col.id]?.[def.id] ?? 0)
    rowStats[def.id] = { min: Math.min(...vals), max: Math.max(...vals) }
  }

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ borderCollapse: 'collapse', tableLayout: 'fixed', width: '100%', minWidth: isMobile ? '600px' : 'auto' }}>
        <colgroup>
          <col style={{ width: '160px' }} />
          {cols.map((c) => <col key={c.id} style={{ width: '120px' }} />)}
        </colgroup>
        <thead>
          <tr>
            {/* top-left corner label */}
            <th style={{ padding: '0 0 14px', textAlign: 'left', verticalAlign: 'bottom', borderBottom: `1px solid ${BORDER}` }}>
              <div style={{ fontFamily: FONT_UI, fontSize: '10px', letterSpacing: '2px', textTransform: 'uppercase', color: TEXT_OFF }}>Target</div>
            </th>
            {cols.map((col) => (
              <th key={col.id} style={{ padding: '0 8px 14px', textAlign: 'center', verticalAlign: 'bottom', borderBottom: `1px solid ${BORDER}` }}>
                <div style={{ fontFamily: FONT_UI, fontSize: '11px', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: col.id === baseId ? TEXT_SEC : TEXT, lineHeight: 1.2 }}>
                  {col.label}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {defenders.map((def, di) => {
            const hovered = hoveredDefId === def.id
            const stats   = rowStats[def.id]
            return (
              <tr key={def.id} style={{ borderTop: di > 0 ? `1px solid ${BORDER}` : 'none' }}>
                {/* Row header — hover/click to edit this defender */}
                <td
                  onMouseEnter={() => setHoveredDefId(def.id)}
                  onMouseLeave={() => setHoveredDefId(null)}
                  onClick={() => onEditDef(di)}
                  style={{ padding: '12px 8px 12px 0', verticalAlign: 'middle', cursor: 'pointer', userSelect: 'none', borderRight: `1px solid ${hovered ? ACCENT : BORDER}`, transition: 'border-color 120ms' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <div>
                      <div style={{ fontFamily: FONT_UI, fontSize: '12px', fontWeight: 700, letterSpacing: '0.5px', color: hovered ? ACCENT_TEXT : TEXT, lineHeight: 1.2, transition: 'color 120ms' }}>
                        {def.label}
                      </div>
                      <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '10px', color: hovered ? ACCENT : TEXT_WEAK, letterSpacing: '0.5px', marginTop: '2px', lineHeight: 1.3, transition: 'color 120ms' }}>
                        {def.sub}
                      </div>
                    </div>
                    {hovered && (
                      <svg width="10" height="10" viewBox="0 0 10 10" fill="none" style={{ flexShrink: 0, marginLeft: 'auto', opacity: 0.7 }}>
                        <path d="M1 7.5V9h1.5l4.4-4.4-1.5-1.5L1 7.5zM8.7 3.3a.4.4 0 0 0 0-.56L7.27 1.3a.4.4 0 0 0-.57 0L5.7 2.3l1.5 1.5 1.5-1.5z" fill={ACCENT_TEXT}/>
                      </svg>
                    )}
                  </div>
                </td>
                {cols.map((col) => {
                  const val    = matrix[col.id]?.[def.id] ?? 0
                  const isBase = col.id === baseId
                  const range  = stats.max - stats.min
                  const ratio  = range < 0.001 ? 0 : (val - stats.min) / range
                  const base   = baseDmg[def.id] ?? 0
                  const pct    = isBase ? null : ((val - base) / Math.max(base, 0.01)) * 100

                  return (
                    <td key={col.id} style={{ padding: '10px 8px', textAlign: 'center', verticalAlign: 'middle', background: cellBg(ratio) }}>
                      <div style={{ fontFamily: FONT_UI, fontSize: '15px', fontWeight: 700, color: ratio > 0.6 ? SUCCESS : TEXT, lineHeight: 1 }}>
                        {val.toFixed(1)}
                      </div>
                      {!isBase && pct !== null && (
                        <div style={{ fontFamily: FONT_UI, fontSize: '10px', color: pct > 0.5 ? SUCCESS : TEXT_OFF, marginTop: '3px', lineHeight: 1 }}>
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
  )
}

// ── Unit abilities panel ──────────────────────────────────────────────────────

const ABS_STYLE_ID = 'combo-abilities-keyframes'

function injectAbilitiesStyles() {
  if (document.getElementById(ABS_STYLE_ID)) return
  const s = document.createElement('style')
  s.id = ABS_STYLE_ID
  s.textContent = `
    @keyframes comboAbilityIn { from { opacity:0; transform:translateX(10px); } to { opacity:1; transform:translateX(0); } }
    .combo-abilities-scroll::-webkit-scrollbar { width:4px; }
    .combo-abilities-scroll::-webkit-scrollbar-thumb { background:${ACCENT}33; border-radius:2px; }
    .combo-ability-card { padding:10px 12px; background:rgba(47,224,255,0.03); border-left:2px solid ${ACCENT}44; transition:background 150ms, border-left-color 150ms; }
    .combo-ability-card:hover { background:rgba(47,224,255,0.07); border-left-color:${ACCENT}99; }
  `
  document.head.appendChild(s)
}

function UnitAbilitiesPanel() {
  const unit      = useSimulatorStore((s) => s.attackerUnit)
  const abilities = unit?.abilities ?? []

  useEffect(() => { injectAbilitiesStyles() }, [])

  if (!unit || !abilities.length) return null
  return (
    <div style={{ position: 'fixed', right: '24px', top: '50%', transform: 'translateY(-50%)', width: '220px', zIndex: 10, pointerEvents: 'none' }}>
      <div style={{ border: `1px solid ${BORDER}`, background: SURFACE, padding: '16px', maxHeight: 'calc(100vh - 160px)', overflowY: 'auto' }} className="combo-abilities-scroll">
        <div style={{ fontFamily: FONT_UI, fontSize: '10px', letterSpacing: '2px', textTransform: 'uppercase', color: TEXT_OFF, marginBottom: '4px' }}>Attacker unit</div>
        <div style={{ fontFamily: FONT_UI, fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', color: ACCENT_TEXT, marginBottom: '12px', lineHeight: 1.2 }}>{unit.name}</div>
        <div style={{ height: '1px', background: `linear-gradient(to right, ${ACCENT}44, ${BORDER})`, marginBottom: '12px' }} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {abilities.map((ab, i) => (
            <div key={i} className="combo-ability-card" style={{ animation: 'comboAbilityIn 280ms ease forwards', animationDelay: `${i * 40}ms`, opacity: 0 }}>
              <div style={{ fontFamily: FONT_UI, fontSize: '10px', fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase', color: TEXT, marginBottom: '4px' }}>{ab.name}</div>
              {ab.desc && <p style={{ fontFamily: 'Inter, -apple-system, system-ui, sans-serif', fontSize: '11px', lineHeight: 1.6, color: TEXT_SEC, margin: 0 }}><AbilityText text={ab.desc} /></p>}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export function ComboPage() {
  const isMobile  = useIsMobile()
  const attacks   = useSimulatorStore((s) => s.attacks)
  const context   = useSimulatorStore((s) => s.context)
  const _resetAll = useSimulatorStore((s) => s.resetAll)
  const unitName  = useSimulatorStore((s) => s.attackerUnit?.name ?? null)

  const [squadOpen,     setSquadOpen]     = useState(attacks.length === 0)
  const [activeCols,    setActiveCols]    = useState(SYNERGY_PRESETS.map((c) => c.id))
  const [defRows,       setDefRows]       = useState(DEFENDERS.map((d) => ({ ...d })))
  const [editingDefIdx, setEditingDefIdx] = useState(null)
  const [matrix,        setMatrix]        = useState(null)
  const [running,       setRunning]       = useState(false)
  const [resetHover,    setResetHover]    = useState(false)

  const resetAll = useCallback(() => { _resetAll(); setSquadOpen(true) }, [_resetAll])

  const hPad = isMobile ? '0 16px' : '0 48px'
  const sPad = isMobile ? '20px 16px 80px' : '28px 48px 80px'

  function toggleCol(id) {
    setActiveCols((prev) => {
      if (prev.includes(id)) return prev.length > 1 ? prev.filter((c) => c !== id) : prev
      return [...prev, id]
    })
  }

  function handleApplyDefender(idx, updated) {
    setDefRows((prev) => prev.map((d, i) => (i === idx ? updated : d)))
  }

  // Reorder: baseline always first
  const orderedCols = useMemo(
    () => ['base', ...activeCols.filter((id) => id !== 'base')],
    [activeCols],
  )

  const handleRunMatrix = useCallback(() => {
    if (!attacks.length) return
    setRunning(true)
    setTimeout(() => {
      try {
        setMatrix(computeMatrix(attacks, orderedCols, defRows, context))
      } finally {
        setRunning(false)
      }
    }, 0)
  }, [attacks, orderedCols, defRows, context])

  // Auto-run whenever attacks, columns or defenders change
  useEffect(() => {
    if (attacks.length > 0) {
      handleRunMatrix()
    } else {
      setMatrix(null)
    }
  }, [attacks, activeCols, defRows]) // eslint-disable-line

  const hasAttacks = attacks.length > 0

  // Squad profile label
  const squadLabel = unitName
    ? `${unitName} · ${attacks.length} weapon${attacks.length !== 1 ? 's' : ''}`
    : attacks.length > 0
      ? `Custom · ${attacks.length} weapon${attacks.length !== 1 ? 's' : ''}`
      : null

  return (
    <div style={{ color: TEXT_SEC, minHeight: '100vh', paddingTop: '52px' }}>
      <SquadDrawer open={squadOpen} onClose={() => setSquadOpen(false)} />
      {editingDefIdx !== null && (
        <DefenderEditModal
          defender={defRows[editingDefIdx]}
          onApply={(updated) => handleApplyDefender(editingDefIdx, updated)}
          onClose={() => setEditingDefIdx(null)}
        />
      )}

      {/* Header */}
      <div style={{ padding: hPad }}>
        <Separator />
        <div style={{ padding: '18px 0 14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px' }}>
              <h1 style={{ fontFamily: FONT_UI, fontWeight: 700, fontSize: isMobile ? '16px' : 'clamp(18px, 2vw, 26px)', letterSpacing: '0.05em', textTransform: 'uppercase', lineHeight: 1, color: TEXT, margin: 0 }}>
                Synergy Matrix
              </h1>
              {!isMobile && (
                <span style={{ fontFamily: FONT_UI, fontSize: '10px', letterSpacing: '2px', textTransform: 'uppercase', color: TEXT_WEAK }}>
                  Combo Builder · WH40K 10e
                </span>
              )}
            </div>
            <button onClick={resetAll}
              onMouseEnter={() => setResetHover(true)}
              onMouseLeave={() => setResetHover(false)}
              style={{ background: resetHover ? ERROR : `${ERROR}22`, border: `1px solid ${ERROR}`, color: resetHover ? BG : ERROR, fontFamily: FONT_UI, fontSize: '10px', fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', padding: isMobile ? '7px 14px' : '9px 20px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', transition: 'background 120ms, color 120ms' }}>
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

      <section style={{ padding: sPad }}>
        {!isMobile && hasAttacks && <UnitAbilitiesPanel />}

        {/* Squad + controls row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px', flexWrap: 'wrap' }}>
          {/* Squad profile chip */}
          <button
            onClick={() => setSquadOpen(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              padding: '8px 14px',
              background: hasAttacks ? `${ACCENT}18` : 'transparent',
              border: `1px solid ${hasAttacks ? ACCENT : BORDER}`,
              color: hasAttacks ? ACCENT_TEXT : TEXT_OFF,
              fontFamily: FONT_UI, fontSize: '11px',
              letterSpacing: '1px', textTransform: 'uppercase',
              cursor: 'pointer', transition: 'all 100ms',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = `${ACCENT}28` }}
            onMouseLeave={(e) => { e.currentTarget.style.background = hasAttacks ? `${ACCENT}18` : 'transparent' }}
          >
            <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
              <circle cx="5.5" cy="5.5" r="4.5" stroke="currentColor" strokeWidth="1.2"/>
              <path d="M3.5 5.5h4M5.5 3.5v4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
            </svg>
            {squadLabel ?? 'Select squad'}
            <span style={{ opacity: 0.5 }}>▾</span>
          </button>

          {/* Run button (shown when stale or no matrix yet) */}
          {hasAttacks && running && (
            <span style={{ fontFamily: FONT_UI, fontSize: '10px', letterSpacing: '1.5px', textTransform: 'uppercase', color: TEXT_WEAK }}>
              Computing…
            </span>
          )}
        </div>

        {/* Column toggles */}
        <ColToggleRow activeCols={activeCols} onToggle={toggleCol} />

        {/* Matrix or placeholder */}
        {!hasAttacks ? (
          <div style={{ marginTop: '32px', padding: '48px 32px', border: `1px dashed ${BORDER}`, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
            <div style={{ fontFamily: FONT_UI, fontSize: '11px', letterSpacing: '2px', textTransform: 'uppercase', color: TEXT_WEAK, lineHeight: 1.8, maxWidth: '320px' }}>
              Configure a squad to compare synergies across target profiles
            </div>
            <button
              onClick={() => setSquadOpen(true)}
              style={{ background: ACCENT, border: `1px solid ${ACCENT}`, color: BG, fontFamily: FONT_UI, fontSize: '10px', fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', padding: '13px 28px', cursor: 'pointer', transition: 'opacity 100ms' }}
              onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.85' }}
              onMouseLeave={(e) => { e.currentTarget.style.opacity = '1' }}
            >
              Configure squad →
            </button>
          </div>
        ) : matrix ? (
          <div style={{ marginTop: '20px' }}>
            <MatrixTable matrix={matrix} activeCols={orderedCols} defenders={defRows} onEditDef={setEditingDefIdx} isMobile={isMobile} />

            {/* Legend */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginTop: '14px', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div style={{ width: '28px', height: '7px', background: cellBg(0),   border: `1px solid ${BORDER}` }} />
                <div style={{ width: '28px', height: '7px', background: cellBg(0.5), border: `1px solid ${BORDER}` }} />
                <div style={{ width: '28px', height: '7px', background: cellBg(1.0), border: `1px solid ${BORDER}` }} />
                <span style={{ fontFamily: FONT_UI, fontSize: '10px', letterSpacing: '1.5px', textTransform: 'uppercase', color: TEXT_OFF }}>Low → High (per row)</span>
              </div>
              <span style={{ fontFamily: FONT_UI, fontSize: '10px', letterSpacing: '1.5px', textTransform: 'uppercase', color: TEXT_OFF }}>
                % = gain vs Baseline · — = &lt;0.5% · {N_TRIALS.toLocaleString()} trials/cell
              </span>
            </div>
          </div>
        ) : null}
      </section>

      {/* Footer */}
      <div style={{ padding: isMobile ? '0 16px 24px' : '0 48px 24px' }}>
        <Separator />
        {!isMobile && (
          <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '12px', fontFamily: FONT_UI, fontSize: '10px', letterSpacing: '2px', textTransform: 'uppercase', color: TEXT_OFF }}>
            <span>WH40K SYNERGY MATRIX — V2</span>
            <span>SIMULATION RUNS IN BROWSER — ZERO LATENCY</span>
          </div>
        )}
      </div>
    </div>
  )
}

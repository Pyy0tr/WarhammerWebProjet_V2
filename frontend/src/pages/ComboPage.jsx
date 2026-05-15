import { useState, useMemo, useEffect, useCallback } from 'react'
import { useDataStore } from '../store/dataStore'
import { simulate } from '../engine/simulation'
import {
  BG, SURFACE, SURFACE_E, BORDER, TEXT, TEXT_SEC, TEXT_WEAK, TEXT_OFF,
  ACCENT, SUCCESS, ERROR, TYPE,
} from '../theme'

const N_TRIALS = 2000

// ── Preset defender profiles (squishy → tanky) ────────────────────────────────

const DEFENDERS = [
  { id: 'chaff',   label: 'Chaff',       sub: 'T3 Sv5+ W1 ×10',      toughness: 3,  save: 5, invuln: null, wounds: 1,  models: 10, fnp: null, dmg_reduction: false, debuff_hit_roll: false, keywords: [] },
  { id: 'guard',   label: 'Light Inf.',  sub: 'T4 Sv4+ W1 ×10',      toughness: 4,  save: 4, invuln: null, wounds: 1,  models: 10, fnp: null, dmg_reduction: false, debuff_hit_roll: false, keywords: [] },
  { id: 'marine',  label: 'Marine',      sub: 'T4 Sv3+ W2 ×5',       toughness: 4,  save: 3, invuln: null, wounds: 2,  models:  5, fnp: null, dmg_reduction: false, debuff_hit_roll: false, keywords: [] },
  { id: 'marin4',  label: 'Marine+4++',  sub: 'T4 Sv3+ 4++ W2 ×5',   toughness: 4,  save: 3, invuln: 4,    wounds: 2,  models:  5, fnp: null, dmg_reduction: false, debuff_hit_roll: false, keywords: [] },
  { id: 'term',    label: 'Terminator',  sub: 'T5 Sv2+ 4++ W3 ×3',   toughness: 5,  save: 2, invuln: 4,    wounds: 3,  models:  3, fnp: null, dmg_reduction: false, debuff_hit_roll: false, keywords: [] },
  { id: 'elite',   label: 'Tough Elite', sub: 'T6 Sv4+ 5++ FNP6+ ×2', toughness: 6,  save: 4, invuln: 5,    wounds: 4,  models:  2, fnp: 6,    dmg_reduction: false, debuff_hit_roll: false, keywords: [] },
  { id: 'vehicle', label: 'Vehicle',     sub: 'T10 Sv2+ W12',         toughness: 10, save: 2, invuln: null, wounds: 12, models:  1, fnp: null, dmg_reduction: false, debuff_hit_roll: false, keywords: [] },
  { id: 'super',   label: 'Super-Heavy', sub: 'T12 Sv2+ 4++ W18',     toughness: 12, save: 2, invuln: 4,    wounds: 18, models:  1, fnp: null, dmg_reduction: false, debuff_hit_roll: false, keywords: [] },
]

// ── Keyword/buff rows ─────────────────────────────────────────────────────────

const KW_ROWS = [
  { id: 'base',    label: 'Baseline',         kw: null,                                      buff: null },
  { id: 'lethal',  label: '+ Lethal Hits',    kw: { type: 'LETHAL_HITS' },                  buff: null },
  { id: 'sust',    label: '+ Sustained 1',    kw: { type: 'SUSTAINED_HITS', value: '1' },   buff: null },
  { id: 'dev',     label: '+ Dev. Wounds',    kw: { type: 'DEVASTATING_WOUNDS' },            buff: null },
  { id: 'twin',    label: '+ Twin-Linked',    kw: { type: 'TWIN_LINKED' },                  buff: null },
  { id: 'rr_h',    label: '+ Reroll Hits',    kw: null, buff: { type: 'REROLL_HITS',    value: 'all' } },
  { id: 'rr_w',    label: '+ Reroll Wounds',  kw: null, buff: { type: 'REROLL_WOUNDS',  value: 'all' } },
  { id: 'hit_p1',  label: '+ Hit +1',         kw: null, buff: { type: 'HIT_MODIFIER',   value: 1 } },
  { id: 'wnd_p1',  label: '+ Wound +1',       kw: null, buff: { type: 'WOUND_MODIFIER', value: 1 } },
  { id: 'ap_m1',   label: '+ AP -1',          kw: null, buff: { type: 'AP_MODIFIER',    value: -1 } },
]

const CTX = { cover: false, half_range: false, attacker_moved: false, attacker_charged: false, target_visible: true }

// ── Simulation helpers ────────────────────────────────────────────────────────

function buildAttacks(entries, row) {
  return entries.map(({ unit, weapon }) => {
    const baseKws = weapon.keywords ?? []
    const hasSameKw = row.kw && baseKws.some(k => k.type === row.kw.type)
    const keywords = (row.kw && !hasSameKw) ? [...baseKws, row.kw] : baseKws
    const buffs    = row.buff ? [row.buff] : []
    return { models: unit.min_models ?? 1, weapon: { ...weapon, keywords }, buffs }
  })
}

function runMatrix(entries) {
  const result = {}
  for (const row of KW_ROWS) {
    result[row.id] = {}
    const attacks = buildAttacks(entries, row)
    for (const def of DEFENDERS) {
      const { id: _i, label: _l, sub: _s, ...defenderStats } = def
      const res = simulate({ attacks, defender: defenderStats, context: CTX, n_trials: N_TRIALS })
      result[row.id][def.id] = res.summary.mean_damage
    }
  }
  return result
}

function cellBg(ratio) {
  const alpha = 0.06 + ratio * 0.42
  return `rgba(61,220,151,${alpha.toFixed(2)})`
}

// ── Styles ────────────────────────────────────────────────────────────────────

const SEL = {
  background: SURFACE,
  border: `1px solid ${BORDER}`,
  color: TEXT,
  fontFamily: "'Space Mono', monospace",
  fontSize: '11px',
  padding: '8px 10px',
  outline: 'none',
  cursor: 'pointer',
}

const LABEL_ST = { ...TYPE.label, color: TEXT_WEAK, marginBottom: '6px', display: 'block' }

// ── Component ─────────────────────────────────────────────────────────────────

export function ComboPage() {
  const { factions, unitsByFaction, getUnitWeapons, load, loaded } = useDataStore()

  useEffect(() => { load() }, [load])

  const [faction,  setFaction]  = useState('')
  const [unitId,   setUnitId]   = useState('')
  const [weaponId, setWeaponId] = useState('')
  const [entries,  setEntries]  = useState([])  // [{ unit, weapon }]
  const [matrix,   setMatrix]   = useState(null)
  const [running,  setRunning]  = useState(false)

  const factionList  = useMemo(() => [...factions].sort(), [factions])
  const factionUnits = faction ? (unitsByFaction[faction] ?? []) : []
  const selectedUnit = factionUnits.find(u => u.id === unitId) ?? null
  const unitWeapons  = selectedUnit ? getUnitWeapons(selectedUnit) : []
  const selWeapon    = unitWeapons.find(w => w.id === weaponId) ?? null

  function handleFactionChange(f) { setFaction(f); setUnitId(''); setWeaponId('') }
  function handleUnitChange(id)   { setUnitId(id); setWeaponId('') }

  function addEntry() {
    if (!selectedUnit || !selWeapon) return
    setEntries(prev => [...prev, { unit: selectedUnit, weapon: selWeapon }])
    setMatrix(null)
  }

  function removeEntry(i) {
    setEntries(prev => prev.filter((_, j) => j !== i))
    setMatrix(null)
  }

  const handleRun = useCallback(() => {
    if (!entries.length) return
    setRunning(true)
    // defer to next tick so the UI re-renders with "Computing…" first
    setTimeout(() => {
      try {
        setMatrix(runMatrix(entries))
      } finally {
        setRunning(false)
      }
    }, 0)
  }, [entries])

  // Per-column min/max for heatmap normalisation
  const colStats = useMemo(() => {
    if (!matrix) return {}
    const s = {}
    for (const d of DEFENDERS) {
      const vals = KW_ROWS.map(r => matrix[r.id][d.id])
      s[d.id] = { min: Math.min(...vals), max: Math.max(...vals) }
    }
    return s
  }, [matrix])

  if (!loaded) {
    return (
      <div style={{ minHeight: '100vh', background: BG, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ ...TYPE.label, color: TEXT_OFF }}>Loading data…</span>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: BG, padding: '80px 40px 80px', boxSizing: 'border-box' }}>
      <div style={{ maxWidth: '1560px', margin: '0 auto' }}>

        {/* ── Header ── */}
        <div style={{ marginBottom: '32px' }}>
          <div style={{ ...TYPE.label, color: TEXT_OFF, marginBottom: '6px' }}>COMBO.001</div>
          <div style={{ ...TYPE.display, marginBottom: '10px' }}>Keyword Impact Matrix</div>
          <p style={{ ...TYPE.body, margin: 0, maxWidth: '580px', color: TEXT_SEC }}>
            Select attacker units from the same faction. The matrix compares how each keyword or buff affects damage across standard defender profiles — from squishy chaff to super-heavies.
          </p>
        </div>

        {/* ── Setup panel ── */}
        <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, padding: '24px 28px', marginBottom: '32px' }}>
          <div style={{ ...TYPE.label, color: TEXT_OFF, marginBottom: '18px' }}>Attacker setup</div>

          {/* Pickers */}
          <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-end', flexWrap: 'wrap', marginBottom: '20px' }}>

            <div>
              <span style={LABEL_ST}>Faction</span>
              <select value={faction} onChange={e => handleFactionChange(e.target.value)} style={{ ...SEL, minWidth: '200px' }}>
                <option value="">Select faction…</option>
                {factionList.map(f => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>

            <div>
              <span style={LABEL_ST}>Unit</span>
              <select value={unitId} onChange={e => handleUnitChange(e.target.value)}
                disabled={!faction} style={{ ...SEL, minWidth: '220px', opacity: faction ? 1 : 0.4 }}>
                <option value="">Select unit…</option>
                {factionUnits.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </div>

            <div>
              <span style={LABEL_ST}>Weapon</span>
              <select value={weaponId} onChange={e => setWeaponId(e.target.value)}
                disabled={!unitId} style={{ ...SEL, minWidth: '200px', opacity: unitId ? 1 : 0.4 }}>
                <option value="">Select weapon…</option>
                {unitWeapons.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
              </select>
            </div>

            <button
              onClick={addEntry}
              disabled={!selectedUnit || !selWeapon}
              style={{
                ...TYPE.ui,
                background: (selectedUnit && selWeapon) ? ACCENT : 'transparent',
                border: `1px solid ${(selectedUnit && selWeapon) ? ACCENT : BORDER}`,
                color: (selectedUnit && selWeapon) ? BG : TEXT_OFF,
                padding: '8px 20px',
                cursor: (selectedUnit && selWeapon) ? 'pointer' : 'default',
                transition: 'all 120ms',
                whiteSpace: 'nowrap',
              }}
            >
              + Add
            </button>
          </div>

          {/* Entry chips */}
          {entries.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '20px' }}>
              {entries.map(({ unit, weapon }, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  background: SURFACE_E, border: `1px solid ${BORDER}`,
                  padding: '6px 10px',
                }}>
                  <span style={{ ...TYPE.ui, color: TEXT }}>{unit.name}</span>
                  <span style={{ color: BORDER }}>·</span>
                  <span style={{ ...TYPE.ui, color: TEXT_SEC }}>{weapon.name}</span>
                  <span style={{ ...TYPE.label, color: TEXT_OFF }}>×{unit.min_models ?? 1}</span>
                  <button
                    onClick={() => removeEntry(i)}
                    style={{
                      background: 'none', border: 'none', color: TEXT_WEAK,
                      cursor: 'pointer', padding: '0 2px', fontSize: '14px', lineHeight: 1,
                      marginLeft: '4px',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.color = ERROR }}
                    onMouseLeave={e => { e.currentTarget.style.color = TEXT_WEAK }}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Run button */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <button
              onClick={handleRun}
              disabled={!entries.length || running}
              style={{
                ...TYPE.ui,
                background: (entries.length && !running) ? 'transparent' : 'transparent',
                border: `1px solid ${(entries.length && !running) ? ACCENT : BORDER}`,
                color: (entries.length && !running) ? ACCENT : TEXT_OFF,
                padding: '10px 28px',
                cursor: (entries.length && !running) ? 'pointer' : 'default',
                transition: 'all 120ms',
              }}
              onMouseEnter={e => { if (entries.length && !running) { e.currentTarget.style.background = 'rgba(47,224,255,0.08)' } }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
            >
              {running ? 'Computing…' : '▶ Run Matrix'}
            </button>
            {entries.length === 0 && (
              <span style={{ ...TYPE.label, color: TEXT_OFF }}>Add at least one unit to run</span>
            )}
            {matrix && !running && (
              <span style={{ ...TYPE.label, color: TEXT_OFF }}>
                {N_TRIALS.toLocaleString()} trials · {entries.length} weapon{entries.length > 1 ? 's' : ''} · {KW_ROWS.length - 1} keyword variants
              </span>
            )}
          </div>
        </div>

        {/* ── Matrix ── */}
        {matrix && !running && (
          <div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ borderCollapse: 'collapse', width: '100%', tableLayout: 'fixed' }}>

                {/* Column widths */}
                <colgroup>
                  <col style={{ width: '170px' }} />
                  {DEFENDERS.map(d => <col key={d.id} style={{ width: '134px' }} />)}
                </colgroup>

                {/* Header */}
                <thead>
                  <tr>
                    <th style={{ padding: '0 0 14px', textAlign: 'left', verticalAlign: 'bottom', borderBottom: `1px solid ${BORDER}` }}>
                      <span style={{ ...TYPE.label, color: TEXT_OFF }}>Keyword</span>
                    </th>
                    {DEFENDERS.map(def => (
                      <th key={def.id} style={{ padding: '0 8px 14px', textAlign: 'center', verticalAlign: 'bottom', borderBottom: `1px solid ${BORDER}` }}>
                        <div style={{ ...TYPE.heading, color: TEXT, marginBottom: '4px' }}>{def.label}</div>
                        <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '8px', letterSpacing: '1.5px', textTransform: 'uppercase', color: TEXT_WEAK, lineHeight: 1.4 }}>{def.sub}</div>
                      </th>
                    ))}
                  </tr>
                </thead>

                {/* Rows */}
                <tbody>
                  {KW_ROWS.map((row, ri) => {
                    const isBase = row.id === 'base'
                    const baseDmg = matrix['base']
                    return (
                      <tr
                        key={row.id}
                        style={{ borderTop: ri > 0 ? `1px solid ${BORDER}` : 'none' }}
                      >
                        {/* Row label */}
                        <td style={{ padding: '12px 0', verticalAlign: 'middle' }}>
                          <span style={{ ...TYPE.ui, color: isBase ? TEXT_SEC : TEXT }}>{row.label}</span>
                        </td>

                        {/* Data cells */}
                        {DEFENDERS.map(def => {
                          const val   = matrix[row.id][def.id]
                          const stats = colStats[def.id]
                          const range = stats.max - stats.min
                          const ratio = range < 0.001 ? 0 : (val - stats.min) / range
                          const bg    = cellBg(ratio)
                          const delta = isBase ? null : val - baseDmg[def.id]
                          const pct   = (isBase || !baseDmg[def.id]) ? null
                            : ((val - baseDmg[def.id]) / Math.max(baseDmg[def.id], 0.01)) * 100

                          return (
                            <td key={def.id} style={{ padding: '10px 8px', textAlign: 'center', verticalAlign: 'middle', background: bg, transition: 'background 200ms' }}>
                              <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '14px', fontWeight: 700, color: ratio > 0.55 ? SUCCESS : TEXT, lineHeight: 1 }}>
                                {val.toFixed(1)}
                              </div>
                              {!isBase && pct !== null && (
                                <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '9px', color: pct > 0.5 ? SUCCESS : TEXT_OFF, marginTop: '4px', lineHeight: 1 }}>
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginTop: '20px', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '40px', height: '10px', background: cellBg(0), border: `1px solid ${BORDER}` }} />
                <div style={{ width: '40px', height: '10px', background: cellBg(0.5), border: `1px solid ${BORDER}` }} />
                <div style={{ width: '40px', height: '10px', background: cellBg(1.0), border: `1px solid ${BORDER}` }} />
                <span style={{ ...TYPE.label, color: TEXT_OFF }}>Low → High damage (per column)</span>
              </div>
              <span style={{ ...TYPE.label, color: TEXT_OFF }}>
                % = gain vs Baseline · — = negligible (&lt;0.5%)
              </span>
            </div>
          </div>
        )}

        {!matrix && !running && entries.length > 0 && (
          <div style={{ padding: '60px', textAlign: 'center', border: `1px solid ${BORDER}`, color: TEXT_OFF }}>
            <span style={TYPE.label}>Click Run Matrix to compute results</span>
          </div>
        )}

      </div>
    </div>
  )
}

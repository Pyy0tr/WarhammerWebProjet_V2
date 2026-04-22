import { useState, useEffect } from 'react'
import { useSimulatorStore } from '../store/simulatorStore'
import { useDataStore }      from '../store/dataStore'
import { useArmyStore }      from '../store/armyStore'
import { useAuthStore }      from '../store/authStore'
import { StatInput }  from './StatInput'
import { SearchInput } from './SearchInput'
import { UnitDrawer } from './UnitDrawer'

const BLUE = '#09A2C4'
const BG   = '#041428'

// ── Keyword definitions ───────────────────────────────────────────────────────

// Organised by game phase for the visual picker
const KW_GROUPS = [
  {
    label: 'Hit phase',
    keys: [
      { type: 'TORRENT',          label: 'Torrent',         tip: 'Auto-hit, no roll needed' },
      { type: 'CRITICAL_HIT_ON', label: 'Crit Hit On X+', tip: 'Critical hits trigger on X+ instead of 6+', valued: true, default: '5' },
      { type: 'LETHAL_HITS',    label: 'Lethal Hits',     tip: 'Critical hit → auto-wound' },
      { type: 'SUSTAINED_HITS', label: 'Sustained Hits',  tip: 'Crit → X extra hit rolls', valued: true, default: '1' },
      { type: 'TWIN_LINKED',    label: 'Twin-linked',     tip: 'Re-roll all wound rolls' },
      { type: 'HEAVY',          label: 'Heavy',           tip: '+1 to hit if attacker didn\'t move' },
      { type: 'ASSAULT',        label: 'Assault',         tip: 'No penalty for advancing' },
      { type: 'RAPID_FIRE',     label: 'Rapid Fire',      tip: '+X attacks at half range', valued: true, default: '1' },
      { type: 'EXTRA_ATTACKS',  label: 'Extra Attacks',   tip: '+X attacks per model', valued: true, default: '1' },
      { type: 'INDIRECT_FIRE',  label: 'Indirect Fire',   tip: '-1 to hit if target not visible' },
      { type: 'PISTOL',         label: 'Pistol',          tip: 'Can shoot in engagement range' },
    ],
  },
  {
    label: 'Wound phase',
    keys: [
      { type: 'DEVASTATING_WOUNDS', label: 'Dev. Wounds', tip: 'Critical wound → mortal wounds = damage' },
      { type: 'LANCE',              label: 'Lance',        tip: '+1 to wound if attacker charged' },
      { type: 'MELTA',              label: 'Melta',        tip: '+X damage at half range', valued: true, default: '2' },
      { type: 'ANTI',               label: 'Anti',         tip: 'Crits against specific keyword on Y+', special: 'anti' },
    ],
  },
  {
    label: 'Other',
    keys: [
      { type: 'BLAST',         label: 'Blast',          tip: '+1 attack per 5 defender models' },
      { type: 'IGNORES_COVER', label: 'Ignores Cover',  tip: 'Cover bonus negated' },
      { type: 'PRECISION',     label: 'Precision',      tip: 'Can allocate to character' },
      { type: 'HAZARDOUS',     label: 'Hazardous',      tip: 'Risk to own models' },
      { type: 'PSYCHIC',       label: 'Psychic',        tip: 'Psychic weapon' },
    ],
  },
]

function fmtKw(kw) {
  if (kw.type === 'ANTI') return `Anti-${kw.target} ${kw.threshold}+`
  if (kw.value !== undefined) return `${kw.type.replace(/_/g, ' ')} ${kw.value}`
  return kw.type.replace(/_/g, ' ')
}

// ── KeywordPicker ─────────────────────────────────────────────────────────────

function KeywordPicker() {
  const keywords  = useSimulatorStore((s) => s.attacker.weapon.keywords)
  const setWeapon = useSimulatorStore((s) => s.setWeapon)

  // Pending valued state: type → draft value (before confirming)
  const [drafts, setDrafts] = useState({})
  // ANTI special state
  const [antiTarget,    setAntiTarget]    = useState('INFANTRY')
  const [antiThreshold, setAntiThreshold] = useState('4')

  function getActive(type) {
    return keywords.find((k) => k.type === type) ?? null
  }

  function toggle(kd) {
    const active = getActive(kd.type)
    if (active) {
      // Remove
      setWeapon({ keywords: keywords.filter((k) => k.type !== kd.type) })
      setDrafts((d) => { const n = { ...d }; delete n[kd.type]; return n })
    } else {
      // Add
      if (kd.special === 'anti') {
        setWeapon({ keywords: [...keywords, { type: 'ANTI', target: antiTarget.toUpperCase(), threshold: parseInt(antiThreshold) || 4 }] })
      } else if (kd.valued) {
        const val = drafts[kd.type] ?? kd.default ?? '1'
        setWeapon({ keywords: [...keywords, { type: kd.type, value: val }] })
      } else {
        setWeapon({ keywords: [...keywords, { type: kd.type }] })
      }
    }
  }

  function updateValue(type, val) {
    setDrafts((d) => ({ ...d, [type]: val }))
    setWeapon({ keywords: keywords.map((k) => k.type === type ? { ...k, value: val } : k) })
  }

  function updateAnti(field, val) {
    if (field === 'target')    setAntiTarget(val)
    if (field === 'threshold') setAntiThreshold(val)
    const active = getActive('ANTI')
    if (active) {
      setWeapon({ keywords: keywords.map((k) => k.type === 'ANTI' ? {
        ...k,
        target:    field === 'target'    ? val.toUpperCase() : k.target,
        threshold: field === 'threshold' ? (parseInt(val) || k.threshold) : k.threshold,
      } : k) })
    }
  }

  const chipBase = {
    fontFamily: 'Space Mono, monospace', fontSize: '8.5px',
    letterSpacing: '1px', textTransform: 'uppercase',
    padding: '5px 9px', cursor: 'pointer',
    border: '1px solid rgba(9,162,196,0.25)',
    background: 'transparent', color: TEXT_MUTED,
    transition: 'all 80ms', lineHeight: 1.2,
    display: 'inline-flex', alignItems: 'center', gap: '5px',
  }
  const chipActive = {
    ...chipBase,
    border: `1px solid ${BLUE}`,
    background: 'rgba(9,162,196,0.12)',
    color: BLUE,
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {KW_GROUPS.map((group) => (
        <div key={group.label}>
          <div style={{
            fontFamily: 'Space Mono, monospace', fontSize: '7.5px',
            letterSpacing: '2px', textTransform: 'uppercase',
            color: 'rgba(184,210,228,0.3)', marginBottom: '7px',
          }}>
            {group.label}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {group.keys.map((kd) => {
              const active = getActive(kd.type)
              const style  = active ? chipActive : chipBase
              return (
                <div key={kd.type} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <button
                    title={kd.tip}
                    onClick={() => toggle(kd)}
                    style={style}
                    onMouseEnter={(e) => { if (!active) { e.currentTarget.style.borderColor = 'rgba(9,162,196,0.5)'; e.currentTarget.style.color = 'rgba(184,210,228,0.7)' } }}
                    onMouseLeave={(e) => { if (!active) { e.currentTarget.style.borderColor = 'rgba(9,162,196,0.25)'; e.currentTarget.style.color = TEXT_MUTED } }}
                  >
                    {active ? '✓ ' : ''}{kd.label}
                    {active && kd.valued && <span style={{ opacity: 0.7 }}>: {active.value}</span>}
                    {active && kd.special === 'anti' && <span style={{ opacity: 0.7 }}>: {active.target} {active.threshold}+</span>}
                  </button>

                  {/* Valued inline controls when active */}
                  {active && kd.valued && (
                    <input
                      type="text"
                      value={active.value}
                      onChange={(e) => updateValue(kd.type, e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      style={{
                        width: '36px', background: PANEL,
                        border: `1px solid ${BLUE}`,
                        color: BLUE, fontFamily: 'Space Mono, monospace',
                        fontSize: '10px', padding: '4px 6px',
                        outline: 'none', textAlign: 'center',
                      }}
                    />
                  )}

                  {/* Anti inline controls when active */}
                  {active && kd.special === 'anti' && (
                    <>
                      <input type="text" value={antiTarget}
                        onChange={(e) => updateAnti('target', e.target.value)}
                        placeholder="INFANTRY"
                        style={{ width: '78px', background: PANEL, border: `1px solid ${BLUE}`, color: BLUE, fontFamily: 'Space Mono, monospace', fontSize: '9px', padding: '4px 6px', outline: 'none' }}
                      />
                      <input type="number" value={antiThreshold} min={2} max={6}
                        onChange={(e) => updateAnti('threshold', e.target.value)}
                        style={{ width: '36px', background: PANEL, border: `1px solid ${BLUE}`, color: BLUE, fontFamily: 'Space Mono, monospace', fontSize: '10px', padding: '4px 6px', outline: 'none', textAlign: 'center' }}
                      />
                      <span style={{ fontFamily: 'Space Mono, monospace', fontSize: '9px', color: BLUE }}>+</span>
                    </>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Shared constants ──────────────────────────────────────────────────────────

const TEXT_MUTED = 'rgba(184,210,228,0.45)'
const TEXT_H     = '#FFFFFF'
const PANEL      = '#071e38'
const BORDER     = 'rgba(9,162,196,0.15)'

const inputStyle = {
  background: 'transparent', border: `1px solid rgba(9,162,196,0.35)`,
  color: BLUE, fontFamily: 'Space Mono, monospace', fontSize: '10px',
  letterSpacing: '1px', padding: '5px 8px', outline: 'none',
  borderRadius: 0, width: '100%',
}

// ── Army Picker ───────────────────────────────────────────────────────────────

function ArmyPicker() {
  const armies      = useArmyStore((s) => s.armies)
  const weaponsById = useDataStore((s) => s.weaponsById)
  const user        = useAuthStore((s) => s.user)
  const init        = useArmyStore((s) => s.init)
  const setWeapon   = useSimulatorStore((s) => s.setWeapon)
  const setAttacker = useSimulatorStore((s) => s.setAttacker)
  const weapon      = useSimulatorStore((s) => s.attacker.weapon)

  // Ensure armies are loaded
  useState(() => { init(user) })

  const [armyId,   setArmyId]   = useState(armies[0]?.id ?? '')
  const [unitUid,  setUnitUid]  = useState('')
  const [weaponId, setWeaponId] = useState('')
  const [firing,   setFiring]   = useState(1)

  const army    = armies.find((a) => a.id === armyId) ?? null
  const unit    = army?.units.find((u) => u.uid === unitUid) ?? null
  const weapons = (unit?.weapons ?? []).map((ref) => ({ ref, w: weaponsById[ref.id] })).filter((x) => x.w)
  const selectedWeapon = weapons.find((x) => x.ref.id === weaponId)?.w ?? null

  // Sync to simulator store whenever weapon or firing count changes
  useEffect(() => {
    if (selectedWeapon) {
      setWeapon({
        name:     selectedWeapon.name,
        attacks:  selectedWeapon.A,
        skill:    selectedWeapon.BS,
        strength: selectedWeapon.S,
        ap:       selectedWeapon.AP,
        damage:   selectedWeapon.D,
        keywords: mapKeywords(selectedWeapon.kw ?? []),
      })
    }
  }, [selectedWeapon, setWeapon])   // eslint-disable-line

  useEffect(() => {
    setAttacker({ models: firing })
  }, [firing, setAttacker])         // eslint-disable-line

  // Reset downstream selections on change
  const handleArmyChange = (id) => { setArmyId(id); setUnitUid(''); setWeaponId(''); setFiring(1) }
  const handleUnitChange = (uid) => {
    setUnitUid(uid)
    setWeaponId('')
    const u = army?.units.find((x) => x.uid === uid)
    setFiring(u?.models ?? 1)
  }
  const handleWeaponChange = (id) => setWeaponId(id)

  if (armies.length === 0) {
    return (
      <div style={{
        padding: '20px 0',
        fontFamily: 'Space Mono, monospace', fontSize: '10px',
        color: TEXT_MUTED, lineHeight: 1.7,
      }}>
        No saved armies.{' '}
        <a href="/armies" style={{ color: BLUE, textDecoration: 'none' }}>
          Create one →
        </a>
      </div>
    )
  }

  const selectStyle = {
    width: '100%', background: PANEL,
    border: `1px solid rgba(9,162,196,0.3)`,
    color: TEXT_H, fontFamily: 'Space Mono, monospace',
    fontSize: '11px', padding: '8px 10px',
    outline: 'none', cursor: 'pointer',
  }

  const labelStyle = {
    fontFamily: 'Space Mono, monospace', fontSize: '8px',
    letterSpacing: '2px', textTransform: 'uppercase',
    color: TEXT_MUTED, marginBottom: '6px', display: 'block',
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

      {/* Army */}
      <div>
        <span style={labelStyle}>Army</span>
        <select value={armyId} onChange={(e) => handleArmyChange(e.target.value)} style={selectStyle}>
          {armies.map((a) => (
            <option key={a.id} value={a.id}>{a.name}</option>
          ))}
        </select>
      </div>

      {/* Unit */}
      {army && (
        <div>
          <span style={labelStyle}>Squad</span>
          {army.units.length === 0 ? (
            <div style={{ fontFamily: 'Space Mono, monospace', fontSize: '10px', color: TEXT_MUTED }}>
              No units in this army.
            </div>
          ) : (
            <div style={{
              border: `1px solid ${BORDER}`, maxHeight: '180px', overflowY: 'auto',
            }}>
              {army.units.map((u) => {
                const active = u.uid === unitUid
                return (
                  <div
                    key={u.uid}
                    onClick={() => handleUnitChange(u.uid)}
                    style={{
                      padding: '10px 12px', cursor: 'pointer',
                      background: active ? 'rgba(9,162,196,0.1)' : 'transparent',
                      borderLeft: `2px solid ${active ? BLUE : 'transparent'}`,
                      borderBottom: `1px solid ${BORDER}`,
                      transition: 'background 80ms',
                    }}
                    onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = 'rgba(9,162,196,0.04)' }}
                    onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = 'transparent' }}
                  >
                    <div style={{ fontFamily: 'Space Mono, monospace', fontSize: '11px', color: active ? BLUE : TEXT_H, fontWeight: active ? 700 : 400 }}>
                      {u.name}
                    </div>
                    <div style={{ fontFamily: 'Space Mono, monospace', fontSize: '8px', color: TEXT_MUTED, marginTop: '2px' }}>
                      {u.models} models · T{u.T} · Sv{u.Sv}+
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Weapon */}
      {unit && weapons.length > 0 && (
        <div>
          <span style={labelStyle}>Weapon</span>
          <div style={{ border: `1px solid ${BORDER}`, maxHeight: '200px', overflowY: 'auto' }}>
            {weapons.map(({ ref, w }) => {
              const active = ref.id === weaponId
              return (
                <div
                  key={ref.id}
                  onClick={() => handleWeaponChange(ref.id)}
                  style={{
                    padding: '10px 12px', cursor: 'pointer',
                    background: active ? 'rgba(9,162,196,0.1)' : 'transparent',
                    borderLeft: `2px solid ${active ? BLUE : 'transparent'}`,
                    borderBottom: `1px solid ${BORDER}`,
                    transition: 'background 80ms',
                  }}
                  onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = 'rgba(9,162,196,0.04)' }}
                  onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = 'transparent' }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <span style={{ fontFamily: 'Space Mono, monospace', fontSize: '11px', color: active ? BLUE : TEXT_H, fontWeight: active ? 700 : 400 }}>
                      {ref.name}
                    </span>
                    <span style={{ fontFamily: 'Space Mono, monospace', fontSize: '9px', color: TEXT_MUTED }}>
                      A{w.A} · S{w.S} · AP{w.AP} · D{w.D}
                    </span>
                  </div>
                  {(w.kw ?? []).filter((k) => k !== '-').length > 0 && (
                    <div style={{ fontFamily: 'Space Mono, monospace', fontSize: '8px', color: TEXT_MUTED, marginTop: '2px', letterSpacing: '0.5px' }}>
                      {(w.kw ?? []).filter((k) => k !== '-').join(', ')}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Firing models */}
      {unit && (
        <div>
          <span style={labelStyle}>Firing models</span>
          <input
            type="number"
            min={1}
            max={unit.max_models ?? undefined}
            value={firing}
            onChange={(e) => setFiring(Math.max(1, parseInt(e.target.value) || 1))}
            style={{
              width: '80px', background: PANEL,
              border: `1px solid rgba(9,162,196,0.3)`,
              color: BLUE, fontFamily: 'Space Mono, monospace',
              fontSize: '13px', padding: '7px 10px',
              outline: 'none', textAlign: 'center',
            }}
          />
          {unit.max_models && (
            <span style={{ fontFamily: 'Space Mono, monospace', fontSize: '9px', color: TEXT_MUTED, marginLeft: '8px' }}>
              / {unit.max_models}
            </span>
          )}
        </div>
      )}

      {/* ── Weapon stats + keywords (editable) ── */}
      {unit && selectedWeapon && (<>

        <div style={{ borderTop: `1px solid ${BORDER}`, paddingTop: '16px' }}>
          <span style={labelStyle}>Weapon stats</span>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <StatInput label="Attacks (A)" type="text" value={weapon.attacks}
              placeholder="D6, 2D3+1…" onChange={(v) => setWeapon({ attacks: v })} />
            <StatInput label="Skill (BS/WS)" value={weapon.skill}
              min={2} max={6} onChange={(v) => setWeapon({ skill: v })} />
            <StatInput label="Strength (S)" value={weapon.strength}
              min={1} max={20} onChange={(v) => setWeapon({ strength: v })} />
            <StatInput label="AP" value={weapon.ap}
              min={-6} max={0} onChange={(v) => setWeapon({ ap: v })} />
            <StatInput label="Damage (D)" type="text" value={weapon.damage}
              placeholder="D3, D6+1…" onChange={(v) => setWeapon({ damage: v })} />
          </div>
        </div>

        {/* Keywords */}
        <div>
          <span style={labelStyle}>Keywords</span>
          <KeywordPicker />
        </div>

        <div style={{
          padding: '10px 12px', border: `1px solid rgba(9,162,196,0.2)`,
          background: 'rgba(9,162,196,0.03)',
          fontFamily: 'Space Mono, monospace', fontSize: '9px',
          color: BLUE, letterSpacing: '1px',
        }}>
          ✓ {firing}× {selectedWeapon.name} — click Run Simulation
        </div>
      </>)}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────

const BUFF_LABELS = {
  'REROLL_HITS:ones': 'Reroll hit 1s',
  'REROLL_HITS:all':  'Reroll failed hits',
  'REROLL_WOUNDS:ones': 'Reroll wound 1s',
  'REROLL_WOUNDS:all':  'Reroll failed wounds',
}

export function AttackerPanel() {
  const weapon      = useSimulatorStore((s) => s.attacker.weapon)
  const models      = useSimulatorStore((s) => s.attacker.models)
  const buffs       = useSimulatorStore((s) => s.attacker.buffs)
  const setWeapon   = useSimulatorStore((s) => s.setWeapon)
  const setAttacker = useSimulatorStore((s) => s.setAttacker)

  function hasBuff(type, value) {
    return buffs.some((b) => b.type === type && b.value === value)
  }
  function toggleBuff(type, value) {
    if (hasBuff(type, value)) {
      setAttacker({ buffs: buffs.filter((b) => !(b.type === type && b.value === value)) })
    } else {
      // Rerolls are mutually exclusive per category
      const filtered = buffs.filter((b) => b.type !== type)
      setAttacker({ buffs: [...filtered, { type, value }] })
    }
  }

  const searchWeapons = useDataStore((s) => s.searchWeapons)
  const [weaponResults, setWeaponResults] = useState([])
  const [drawerOpen, setDrawerOpen]       = useState(false)
  const [selectedUnit, setSelectedUnit]   = useState(null)
  const [mode, setMode]                   = useState('manual')  // 'manual' | 'army'

  function handleWeaponSearch(query) {
    setWeaponResults(searchWeapons(query))
  }

  function handleWeaponSelect(w) {
    applyWeapon(w)
    setWeaponResults([])
  }

  function applyWeapon(w) {
    setWeapon({
      name:     w.name,
      attacks:  w.A,
      skill:    w.BS,
      strength: w.S,
      ap:       w.AP,
      damage:   w.D,
      keywords: mapKeywords(w.kw),
    })
  }

  function handleDrawerSelect(unit, weapon) {
    setSelectedUnit(unit)
    // Also set model count from unit data if useful
    if (weapon) applyWeapon(weapon)
  }

  return (
    <>
    <section>
      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px' }}>
          <span style={{
            fontFamily: 'Space Mono, monospace', fontSize: '8px',
            letterSpacing: '2px', textTransform: 'uppercase', opacity: 0.3,
          }}>UNIT.001</span>
          <span style={{
            fontFamily: 'Space Mono, monospace', fontSize: '11px',
            fontWeight: 700, letterSpacing: '3px', textTransform: 'uppercase',
          }}>Attacker</span>
        </div>
        {mode === 'manual' && (
          <button
            onClick={() => setDrawerOpen(true)}
            style={{
              background: 'transparent', border: `1px solid rgba(9,162,196,0.4)`,
              color: BLUE, fontFamily: 'Space Mono, monospace', fontSize: '8.5px',
              letterSpacing: '2px', textTransform: 'uppercase', padding: '5px 12px',
              cursor: 'pointer', borderRadius: 0,
              transition: 'border-color 100ms, background 100ms',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = BLUE; e.currentTarget.style.background = 'rgba(9,162,196,0.05)' }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(9,162,196,0.4)'; e.currentTarget.style.background = 'transparent' }}
          >
            Browse units →
          </button>
        )}
      </div>

      {/* ── Mode tabs ── */}
      <div style={{ display: 'flex', borderBottom: `1px solid rgba(9,162,196,0.15)`, marginBottom: '20px' }}>
        {[['manual', 'Manual'], ['army', 'From Army']].map(([id, label]) => (
          <button
            key={id}
            onClick={() => setMode(id)}
            style={{
              flex: 1, padding: '8px 0',
              background: 'none', border: 'none',
              borderBottom: mode === id ? `2px solid ${BLUE}` : '2px solid transparent',
              color: mode === id ? BLUE : 'rgba(200,216,232,0.35)',
              fontFamily: 'Space Mono, monospace', fontSize: '9px',
              letterSpacing: '2px', textTransform: 'uppercase',
              cursor: 'pointer', marginBottom: '-1px',
              transition: 'color 100ms',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {mode === 'army' ? (
        <ArmyPicker />
      ) : (<>

      {/* Selected unit chip */}
      {selectedUnit && (
        <div style={{
          marginBottom: '20px', padding: '10px 14px',
          border: `1px solid rgba(9,162,196,0.25)`,
          background: 'rgba(9,162,196,0.04)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <div>
            <div style={{
              fontFamily: 'Space Mono, monospace', fontSize: '12px',
              fontWeight: 700, color: BLUE,
            }}>
              {selectedUnit.name}
            </div>
            <div style={{
              fontFamily: 'Space Mono, monospace', fontSize: '8.5px',
              opacity: 0.45, marginTop: '3px', letterSpacing: '1px',
            }}>
              T{selectedUnit.T} · SV{selectedUnit.Sv}+ · W{selectedUnit.W}
              {selectedUnit.invuln ? ` · ${selectedUnit.invuln}++` : ''}
            </div>
          </div>
          <button
            onClick={() => setDrawerOpen(true)}
            style={{
              background: 'none', border: 'none', color: BLUE,
              fontFamily: 'Space Mono, monospace', fontSize: '8px',
              letterSpacing: '1.5px', textTransform: 'uppercase',
              cursor: 'pointer', opacity: 0.5, padding: 0,
            }}
            onMouseEnter={(e) => { e.currentTarget.style.opacity = '1' }}
            onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.5' }}
          >
            Change
          </button>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <SearchInput
          label="Search weapon"
          value={weapon.name}
          placeholder="Type to search (e.g. bolter, lascannon…)"
          onSearch={handleWeaponSearch}
          results={weaponResults}
          onSelect={handleWeaponSelect}
          renderItem={(w) => (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <span style={{ fontFamily: 'Space Mono, monospace', fontSize: '13px', fontWeight: 700 }}>
                  {w.name}
                </span>
                <span style={{
                  fontFamily: 'Space Mono, monospace', fontSize: '11px', opacity: 0.45,
                }}>
                  {`${w.A} · S${w.S} · AP${w.AP} · D${w.D}`}
                </span>
              </div>
              {w.users?.length > 0 && (
                <div style={{
                  fontFamily: 'Georgia, serif', fontSize: '12px', fontStyle: 'italic',
                  opacity: 0.3, marginTop: '2px',
                }}>
                  {w.users.join(', ')}
                </div>
              )}
            </div>
          )}
        />

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          <StatInput
            label="Attacks (A)"
            type="text"
            value={weapon.attacks}
            placeholder="D6, 2D3+1…"
            onChange={(v) => setWeapon({ attacks: v })}
          />
          <StatInput
            label="Skill (BS/WS)"
            value={weapon.skill}
            min={2} max={6}
            onChange={(v) => setWeapon({ skill: v })}
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          <StatInput
            label="Strength (S)"
            value={weapon.strength}
            min={1} max={20}
            onChange={(v) => setWeapon({ strength: v })}
          />
          <StatInput
            label="AP"
            value={weapon.ap}
            min={-6} max={0}
            onChange={(v) => setWeapon({ ap: v })}
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          <StatInput
            label="Damage (D)"
            type="text"
            value={weapon.damage}
            placeholder="D3, D6+1…"
            onChange={(v) => setWeapon({ damage: v })}
          />
          <StatInput
            label="Number of models"
            value={models}
            min={1}
            onChange={(v) => setAttacker({ models: v })}
          />
        </div>

        {/* ── Keywords ─────────────────────────────────────────────────────── */}
        <div>
          <div style={{
            fontFamily: 'Space Mono, monospace', fontSize: '8px',
            letterSpacing: '2px', textTransform: 'uppercase', opacity: 0.4,
            marginBottom: '10px',
          }}>
            Keywords
          </div>
          <KeywordPicker />
        </div>
      </div>
      </>)}

      {/* ── Attacker abilities (always visible) ──────────────────────────── */}
      <div style={{ marginTop: '24px', paddingTop: '20px', borderTop: `1px solid ${BORDER}` }}>
        <div style={{
          fontFamily: 'Space Mono, monospace', fontSize: '8px',
          letterSpacing: '2px', textTransform: 'uppercase', color: TEXT_MUTED,
          marginBottom: '12px',
        }}>
          Attacker abilities
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {[
            ['REROLL_HITS',   'ones', 'Reroll hit 1s'],
            ['REROLL_HITS',   'all',  'Reroll failed hits'],
            ['REROLL_WOUNDS', 'ones', 'Reroll wound 1s'],
            ['REROLL_WOUNDS', 'all',  'Reroll failed wounds'],
          ].map(([type, value, label]) => {
            const active = hasBuff(type, value)
            return (
              <button
                key={`${type}:${value}`}
                onClick={() => toggleBuff(type, value)}
                style={{
                  background: active ? 'rgba(9,162,196,0.15)' : 'transparent',
                  border: `1px solid ${active ? BLUE : 'rgba(9,162,196,0.25)'}`,
                  color: active ? BLUE : TEXT_MUTED,
                  fontFamily: 'Space Mono, monospace', fontSize: '8.5px',
                  letterSpacing: '1px', textTransform: 'uppercase',
                  padding: '5px 10px', cursor: 'pointer',
                  transition: 'all 100ms',
                }}
                onMouseEnter={(e) => { if (!active) { e.currentTarget.style.borderColor = 'rgba(9,162,196,0.5)'; e.currentTarget.style.color = 'rgba(184,210,228,0.7)' } }}
                onMouseLeave={(e) => { if (!active) { e.currentTarget.style.borderColor = 'rgba(9,162,196,0.25)'; e.currentTarget.style.color = TEXT_MUTED } }}
              >
                {active ? `✓ ${label}` : label}
              </button>
            )
          })}
        </div>
      </div>
    </section>

    <UnitDrawer
      isOpen={drawerOpen}
      onClose={() => setDrawerOpen(false)}
      role="attacker"
      onSelect={handleDrawerSelect}
    />
    </>
  )
}

/**
 * Map BSData keyword strings to engine keyword objects.
 */
function mapKeywords(kwStrings) {
  if (!kwStrings?.length) return []
  const result = []

  for (const raw of kwStrings) {
    const upper = raw.toUpperCase().replace(/\s+/g, '_')

    const simpleTypes = [
      'TORRENT', 'LETHAL_HITS', 'DEVASTATING_WOUNDS', 'TWIN-LINKED',
      'BLAST', 'HEAVY', 'LANCE', 'IGNORES_COVER', 'INDIRECT_FIRE',
      'ASSAULT', 'PISTOL', 'PSYCHIC', 'PRECISION', 'HAZARDOUS',
    ]
    const mapped = upper.replace(/-/g, '_').replace(/\s/g, '_')

    if (simpleTypes.includes(mapped)) {
      result.push({ type: mapped.replace('TWIN_LINKED', 'TWIN_LINKED') })
      continue
    }

    // Sustained Hits X
    const sus = raw.match(/sustained\s*hits\s*(\d+|D\d+)/i)
    if (sus) { result.push({ type: 'SUSTAINED_HITS', value: sus[1] }); continue }

    // Rapid Fire X
    const rf = raw.match(/rapid\s*fire\s*(\d+|D\d+)/i)
    if (rf) { result.push({ type: 'RAPID_FIRE', value: rf[1] }); continue }

    // Melta X
    const melta = raw.match(/melta\s*(\d+|D\d+)/i)
    if (melta) { result.push({ type: 'MELTA', value: melta[1] }); continue }

    // Anti-X Y+
    const anti = raw.match(/anti-(\w+)\s*(\d+)\+/i)
    if (anti) { result.push({ type: 'ANTI', target: anti[1].toUpperCase(), threshold: parseInt(anti[2]) }); continue }

    // Extra Attacks X
    const ea = raw.match(/extra\s*attacks?\s*(\d+|D\d+)/i)
    if (ea) { result.push({ type: 'EXTRA_ATTACKS', value: ea[1] }); continue }
  }

  return result
}

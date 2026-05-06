import { useState, useEffect } from 'react'
import { useSimulatorStore } from '../store/simulatorStore'
import { useDataStore }      from '../store/dataStore'
import { useArmyStore }      from '../store/armyStore'
import { useAuthStore }      from '../store/authStore'
import { StatInput }  from './StatInput'
import { UnitDrawer } from './UnitDrawer'
import { ACCENT, ACCENT_H, BG, SURFACE, SURFACE_E, BORDER, TEXT, TEXT_SEC, TEXT_WEAK, TEXT_OFF } from '../theme'
import { KW_GROUPS, SIMPLE_KW_TYPES } from '../engine/keywords.js'

// ── KeywordPicker ─────────────────────────────────────────────────────────────

function KeywordPicker() {
  const keywords  = useSimulatorStore((s) => s.attacker.weapon.keywords)
  const setWeapon = useSimulatorStore((s) => s.setWeapon)
  const setHoveredKeyword = useSimulatorStore((s) => s.setHoveredKeyword)

  const [drafts, setDrafts] = useState({})
  const [antiTarget,    setAntiTarget]    = useState('INFANTRY')
  const [antiThreshold, setAntiThreshold] = useState('4')

  function getActive(type) {
    return keywords.find((k) => k.type === type) ?? null
  }

  function toggle(kd) {
    const active = getActive(kd.type)
    if (active) {
      setWeapon({ keywords: keywords.filter((k) => k.type !== kd.type) })
      setDrafts((d) => { const n = { ...d }; delete n[kd.type]; return n })
    } else {
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
    border: `1px solid ${BORDER}`,
    background: SURFACE, color: TEXT_SEC,
    transition: 'all 80ms', lineHeight: 1.2,
    display: 'inline-flex', alignItems: 'center', gap: '5px',
  }
  const chipActive = {
    ...chipBase,
    border: `1px solid ${ACCENT}`,
    background: 'rgba(47,224,255,0.15)',
    color: TEXT,
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {KW_GROUPS.map((group) => (
        <div key={group.label}>
          <div style={{
            fontFamily: 'Space Mono, monospace', fontSize: '7.5px',
            letterSpacing: '2px', textTransform: 'uppercase',
            color: TEXT_OFF, marginBottom: '7px',
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
                    onMouseEnter={(e) => { setHoveredKeyword(kd.type); if (!active) { e.currentTarget.style.borderColor = ACCENT; e.currentTarget.style.color = TEXT } }}
                    onMouseLeave={(e) => { setHoveredKeyword(null); if (!active) { e.currentTarget.style.borderColor = BORDER; e.currentTarget.style.color = TEXT_SEC } }}
                  >
                    {active ? '✓ ' : ''}{kd.label}
                    {active && kd.valued && <span style={{ opacity: 0.7 }}>: {active.value}</span>}
                    {active && kd.special === 'anti' && <span style={{ opacity: 0.7 }}>: {active.target} {active.threshold}+</span>}
                  </button>

                  {active && kd.valued && (
                    <input
                      type="text"
                      value={active.value}
                      onChange={(e) => updateValue(kd.type, e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      style={{
                        width: '36px', background: SURFACE,
                        border: `1px solid ${ACCENT}`,
                        color: TEXT, fontFamily: 'Space Mono, monospace',
                        fontSize: '10px', padding: '4px 6px',
                        outline: 'none', textAlign: 'center',
                      }}
                    />
                  )}

                  {active && kd.special === 'anti' && (
                    <>
                      <input type="text" value={antiTarget}
                        onChange={(e) => updateAnti('target', e.target.value)}
                        placeholder="INFANTRY"
                        style={{ width: '78px', background: SURFACE, border: `1px solid ${ACCENT}`, color: TEXT, fontFamily: 'Space Mono, monospace', fontSize: '9px', padding: '4px 6px', outline: 'none' }}
                      />
                      <input type="number" value={antiThreshold} min={2} max={6}
                        onChange={(e) => updateAnti('threshold', e.target.value)}
                        style={{ width: '36px', background: SURFACE, border: `1px solid ${ACCENT}`, color: TEXT, fontFamily: 'Space Mono, monospace', fontSize: '10px', padding: '4px 6px', outline: 'none', textAlign: 'center' }}
                      />
                      <span style={{ fontFamily: 'Space Mono, monospace', fontSize: '9px', color: ACCENT }}>+</span>
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

// ── Army Picker ───────────────────────────────────────────────────────────────

function ArmyPicker() {
  const armies      = useArmyStore((s) => s.armies)
  const weaponsById = useDataStore((s) => s.weaponsById)
  const getUnitById = useDataStore((s) => s.getUnitById)
  const user        = useAuthStore((s) => s.user)
  const init        = useArmyStore((s) => s.init)
  const setWeapon   = useSimulatorStore((s) => s.setWeapon)
  const setAttacker = useSimulatorStore((s) => s.setAttacker)
  const setAttackerUnit = useSimulatorStore((s) => s.setAttackerUnit)
  const weapon      = useSimulatorStore((s) => s.attacker.weapon)

  useEffect(() => { init(user) }, [])  // eslint-disable-line

  const [armyId,   setArmyId]   = useState('')
  const [unitUid,  setUnitUid]  = useState('')
  const [weaponId, setWeaponId] = useState('')
  const [firing,   setFiring]   = useState(1)

  // Once armies load, auto-select the first one if nothing is selected yet
  useEffect(() => {
    if (!armyId && armies.length > 0) setArmyId(armies[0].id)
  }, [armies])  // eslint-disable-line

  const army    = armies.find((a) => a.id === armyId) ?? null
  const unit    = army?.units.find((u) => u.uid === unitUid) ?? null
  const weapons = (unit?.weapons ?? []).map((ref) => ({ ref, w: weaponsById[ref.id] })).filter((x) => x.w)
  const selectedWeapon = weapons.find((x) => x.ref.id === weaponId)?.w ?? null

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
  }, [selectedWeapon, setWeapon])

  useEffect(() => {
    setAttacker({ models: firing })
  }, [firing, setAttacker])

  const handleArmyChange = (id) => { setArmyId(id); setUnitUid(''); setWeaponId(''); setFiring(1) }
  const handleUnitChange = (uid) => {
    setUnitUid(uid)
    setWeaponId('')
    const u = army?.units.find((x) => x.uid === uid)
    setFiring(u?.models ?? 1)
    if (u) {
      const fullUnit = getUnitById(u.unit_id)
      setAttackerUnit(fullUnit || u)
    }
  }
  const handleWeaponChange = (id) => setWeaponId(id)

  if (armies.length === 0) {
    return (
      <div style={{
        padding: '20px 0',
        fontFamily: 'Space Mono, monospace', fontSize: '10px',
        color: TEXT_WEAK, lineHeight: 1.7,
      }}>
        No saved armies.{' '}
        <a href="/armies" style={{ color: ACCENT, textDecoration: 'none' }}>
          Create one →
        </a>
      </div>
    )
  }

  const selectStyle = {
    width: '100%', background: SURFACE,
    border: `1px solid ${BORDER}`,
    color: TEXT, fontFamily: 'Space Mono, monospace',
    fontSize: '11px', padding: '8px 10px',
    outline: 'none', cursor: 'pointer',
  }

  const labelStyle = {
    fontFamily: 'Space Mono, monospace', fontSize: '8px',
    letterSpacing: '2px', textTransform: 'uppercase',
    color: TEXT_WEAK, marginBottom: '6px', display: 'block',
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

      <div>
        <span style={labelStyle}>Army</span>
        <select value={armyId} onChange={(e) => handleArmyChange(e.target.value)} style={selectStyle}>
          {armies.map((a) => (
            <option key={a.id} value={a.id}>{a.name}</option>
          ))}
        </select>
      </div>

      {army && (
        <div>
          <span style={labelStyle}>Squad</span>
          {army.units.length === 0 ? (
            <div style={{ fontFamily: 'Space Mono, monospace', fontSize: '10px', color: TEXT_WEAK }}>
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
                      background: active ? SURFACE_E : 'transparent',
                      borderLeft: `2px solid ${active ? ACCENT : 'transparent'}`,
                      borderBottom: `1px solid ${BORDER}`,
                      transition: 'background 80ms',
                    }}
                    onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = SURFACE }}
                    onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = 'transparent' }}
                  >
                    <div style={{ fontFamily: 'Space Mono, monospace', fontSize: '11px', color: active ? ACCENT : TEXT, fontWeight: active ? 700 : 400 }}>
                      {u.name}
                    </div>
                    <div style={{ fontFamily: 'Space Mono, monospace', fontSize: '8px', color: TEXT_WEAK, marginTop: '2px' }}>
                      {u.models} models · T{u.T} · Sv{u.Sv}+
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

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
                    background: active ? SURFACE_E : 'transparent',
                    borderLeft: `2px solid ${active ? ACCENT : 'transparent'}`,
                    borderBottom: `1px solid ${BORDER}`,
                    transition: 'background 80ms',
                  }}
                  onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = SURFACE }}
                  onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = 'transparent' }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <span style={{ fontFamily: 'Space Mono, monospace', fontSize: '11px', color: active ? ACCENT : TEXT, fontWeight: active ? 700 : 400 }}>
                      {ref.name}
                    </span>
                    <span style={{ fontFamily: 'Space Mono, monospace', fontSize: '9px', color: TEXT_WEAK }}>
                      A{w.A} · S{w.S} · AP{w.AP} · D{w.D}
                    </span>
                  </div>
                  {(w.kw ?? []).filter((k) => k !== '-').length > 0 && (
                    <div style={{ fontFamily: 'Space Mono, monospace', fontSize: '8px', color: TEXT_WEAK, marginTop: '2px', letterSpacing: '0.5px' }}>
                      {(w.kw ?? []).filter((k) => k !== '-').join(', ')}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

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
              width: '80px', background: SURFACE,
              border: `1px solid ${BORDER}`,
              color: TEXT, fontFamily: 'Space Mono, monospace',
              fontSize: '13px', padding: '7px 10px',
              outline: 'none', textAlign: 'center',
            }}
          />
          {unit.max_models && (
            <span style={{ fontFamily: 'Space Mono, monospace', fontSize: '9px', color: TEXT_WEAK, marginLeft: '8px' }}>
              / {unit.max_models}
            </span>
          )}
        </div>
      )}

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

        <div>
          <span style={labelStyle}>Keywords</span>
          <KeywordPicker />
        </div>

        <div style={{
          padding: '10px 12px', border: `1px solid ${BORDER}`,
          background: 'rgba(47,224,255,0.05)',
          fontFamily: 'Space Mono, monospace', fontSize: '9px',
          color: ACCENT, letterSpacing: '1px',
        }}>
          ✓ {firing}× {selectedWeapon.name} — click Confirm attack
        </div>
      </>)}
    </div>
  )
}

// ── Attacker abilities (4 phases) ────────────────────────────────────────────

const PHASE_LABEL = {
  fontFamily: 'Space Mono, monospace', fontSize: '7.5px',
  letterSpacing: '2px', textTransform: 'uppercase',
  color: TEXT_OFF, marginBottom: '8px',
}

function AbilityBtn({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: active ? 'rgba(47,224,255,0.15)' : SURFACE,
        border: `1px solid ${active ? ACCENT : BORDER}`,
        color: active ? TEXT : TEXT_SEC,
        fontFamily: 'Space Mono, monospace', fontSize: '8.5px',
        letterSpacing: '1px', textTransform: 'uppercase',
        padding: '5px 10px', cursor: 'pointer',
        transition: 'border-color 80ms, color 80ms, background 80ms',
      }}
      onMouseEnter={(e) => { if (!active) { e.currentTarget.style.borderColor = ACCENT; e.currentTarget.style.color = TEXT } }}
      onMouseLeave={(e) => { if (!active) { e.currentTarget.style.borderColor = BORDER; e.currentTarget.style.color = TEXT_SEC } }}
    >
      {active ? `✓ ${children}` : children}
    </button>
  )
}

function AbilitiesSection({ _buffs, toggleBuff, hasBuff, keywords, setWeapon }) {
  const [critDraft,  setCritDraft]  = useState('5')
  const [extraDraft, setExtraDraft] = useState('1')

  const getKw = (type) => keywords.find((k) => k.type === type) ?? null

  function toggleKw(type, valued, draft) {
    const active = getKw(type)
    if (active) {
      setWeapon({ keywords: keywords.filter((k) => k.type !== type) })
    } else {
      setWeapon({ keywords: [...keywords, valued ? { type, value: draft } : { type }] })
    }
  }

  function updateKwValue(type, val) {
    setWeapon({ keywords: keywords.map((k) => k.type === type ? { ...k, value: val } : k) })
  }

  const activeCrit  = getKw('CRITICAL_HIT_ON')
  const activeExtra = getKw('EXTRA_ATTACKS')
  const activeCover = getKw('IGNORES_COVER')

  const phases = [
    {
      label: 'Attacks',
      content: (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' }}>
          <AbilityBtn active={!!activeExtra} onClick={() => toggleKw('EXTRA_ATTACKS', true, extraDraft)}>
            Extra Attacks{activeExtra ? ` +${activeExtra.value}` : ''}
          </AbilityBtn>
          {activeExtra && (
            <input type="text" value={activeExtra.value}
              onChange={(e) => { setExtraDraft(e.target.value); updateKwValue('EXTRA_ATTACKS', e.target.value) }}
              onClick={(e) => e.stopPropagation()}
              style={{ width: '36px', background: SURFACE, border: `1px solid ${ACCENT}`, color: TEXT, fontFamily: 'Space Mono, monospace', fontSize: '10px', padding: '4px 6px', outline: 'none', textAlign: 'center' }}
            />
          )}
        </div>
      ),
    },
    {
      label: 'Hit',
      content: (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' }}>
          <AbilityBtn active={hasBuff('REROLL_HITS', 'ones')} onClick={() => toggleBuff('REROLL_HITS', 'ones')}>
            Reroll hit 1s
          </AbilityBtn>
          <AbilityBtn active={hasBuff('REROLL_HITS', 'all')} onClick={() => toggleBuff('REROLL_HITS', 'all')}>
            Reroll failed hits
          </AbilityBtn>
          <AbilityBtn active={!!activeCrit} onClick={() => toggleKw('CRITICAL_HIT_ON', true, critDraft)}>
            Crit Hit On{activeCrit ? ` ${activeCrit.value}+` : ' X+'}
          </AbilityBtn>
          {activeCrit && (
            <input type="text" value={activeCrit.value}
              onChange={(e) => { setCritDraft(e.target.value); updateKwValue('CRITICAL_HIT_ON', e.target.value) }}
              onClick={(e) => e.stopPropagation()}
              style={{ width: '36px', background: SURFACE, border: `1px solid ${ACCENT}`, color: TEXT, fontFamily: 'Space Mono, monospace', fontSize: '10px', padding: '4px 6px', outline: 'none', textAlign: 'center' }}
            />
          )}
        </div>
      ),
    },
    {
      label: 'Wound',
      content: (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
          <AbilityBtn active={hasBuff('REROLL_WOUNDS', 'ones')} onClick={() => toggleBuff('REROLL_WOUNDS', 'ones')}>
            Reroll wound 1s
          </AbilityBtn>
          <AbilityBtn active={hasBuff('REROLL_WOUNDS', 'all')} onClick={() => toggleBuff('REROLL_WOUNDS', 'all')}>
            Reroll failed wounds
          </AbilityBtn>
        </div>
      ),
    },
    {
      label: 'Save',
      content: (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
          <AbilityBtn active={!!activeCover} onClick={() => toggleKw('IGNORES_COVER', false, null)}>
            Ignores Cover
          </AbilityBtn>
        </div>
      ),
    },
  ]

  return (
    <div style={{ marginTop: '24px', paddingTop: '20px', borderTop: `1px solid ${BORDER}` }}>
      <div style={{
        fontFamily: 'Space Mono, monospace', fontSize: '8px',
        letterSpacing: '2px', textTransform: 'uppercase', color: TEXT_WEAK,
        marginBottom: '16px',
      }}>
        Attacker abilities
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {phases.map(({ label, content }) => (
          <div key={label}>
            <div style={PHASE_LABEL}>{label}</div>
            {content}
          </div>
        ))}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────

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
      const filtered = buffs.filter((b) => b.type !== type)
      setAttacker({ buffs: [...filtered, { type, value }] })
    }
  }

  const selectedUnit    = useSimulatorStore((s) => s.attackerUnit)
  const setSelectedUnit = useSimulatorStore((s) => s.setAttackerUnit)
  const getUnitWeapons  = useDataStore((s) => s.getUnitWeapons)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [mode, setMode]             = useState('browse')

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

  function handleDrawerSelect(unit) {
    setSelectedUnit(unit)
    const m = unit.min_models ?? unit.max_models ?? 1
    setAttacker({ models: m })
  }

  const hasWeapon = Boolean(weapon.name)

  return (
    <>
    <section>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', marginBottom: '20px' }}>
        <span style={{
          fontFamily: 'Space Mono, monospace', fontSize: '8px',
          letterSpacing: '2px', textTransform: 'uppercase', color: TEXT_OFF,
        }}>UNIT.001</span>
        <span style={{
          fontFamily: 'Space Mono, monospace', fontSize: '11px',
          fontWeight: 700, letterSpacing: '3px', textTransform: 'uppercase', color: TEXT,
        }}>Attacker</span>
      </div>

      <div style={{ display: 'flex', borderBottom: `1px solid ${BORDER}`, marginBottom: '20px' }}>
        {[['browse', 'Browse Units'], ['army', 'From Army']].map(([id, label]) => (
          <button
            key={id}
            onClick={() => setMode(id)}
            style={{
              flex: 1, padding: '8px 0',
              background: 'none', border: 'none',
              borderBottom: mode === id ? `2px solid ${ACCENT}` : '2px solid transparent',
              color: mode === id ? ACCENT : TEXT_OFF,
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

      {/* Browse Units mode — 3 states:
          1. no unit, no weapon  → placeholder + Browse button
          2. unit selected, no weapon → unit card + inline weapon picker
          3. weapon selected → full weapon config (existing UI)        */}
      {!hasWeapon && !selectedUnit ? (
        <div style={{
          padding: '32px', border: `1px dashed ${BORDER}`,
          textAlign: 'center',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px',
        }}>
          <div style={{
            fontFamily: 'Space Mono, monospace', fontSize: '10px',
            letterSpacing: '1.5px', textTransform: 'uppercase',
            color: TEXT_WEAK, lineHeight: 1.7,
          }}>
            Select a unit to configure your attack
          </div>
          <button
            onClick={() => setDrawerOpen(true)}
            style={{
              background: ACCENT, border: `1px solid ${ACCENT}`,
              color: BG, fontFamily: 'Space Mono, monospace', fontSize: '10px',
              fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase',
              padding: '12px 28px', cursor: 'pointer', borderRadius: 0,
              transition: 'opacity 100ms',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.85' }}
            onMouseLeave={(e) => { e.currentTarget.style.opacity = '1' }}
          >
            Browse units →
          </button>
        </div>

      ) : !hasWeapon && selectedUnit ? (() => {
        const unitWeapons = getUnitWeapons(selectedUnit)
        return (
          <div>
            {/* Unit card */}
            <div style={{
              marginBottom: '20px', padding: '10px 14px',
              border: `1px solid ${BORDER}`, background: SURFACE,
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <div>
                <div style={{ fontFamily: 'Space Mono, monospace', fontSize: '12px', fontWeight: 700, color: ACCENT }}>
                  {selectedUnit.name}
                </div>
                <div style={{ fontFamily: 'Space Mono, monospace', fontSize: '8.5px', color: TEXT_WEAK, marginTop: '3px', letterSpacing: '1px' }}>
                  T{selectedUnit.T} · SV{selectedUnit.Sv}+ · W{selectedUnit.W}
                  {selectedUnit.invuln ? ` · ${selectedUnit.invuln}++` : ''}
                </div>
              </div>
              <button
                onClick={() => { setSelectedUnit(null) }}
                style={{
                  background: 'none', border: 'none', color: ACCENT,
                  fontFamily: 'Space Mono, monospace', fontSize: '8px',
                  letterSpacing: '1.5px', textTransform: 'uppercase',
                  cursor: 'pointer', opacity: 0.6, padding: 0,
                }}
                onMouseEnter={(e) => { e.currentTarget.style.opacity = '1' }}
                onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.6' }}
              >
                Change
              </button>
            </div>

            {/* Inline weapon picker */}
            <div style={{ fontFamily: 'Space Mono, monospace', fontSize: '8px', letterSpacing: '2px', textTransform: 'uppercase', color: TEXT_WEAK, marginBottom: '10px' }}>
              Choose a weapon
            </div>
            {unitWeapons.length === 0 ? (
              <div style={{ padding: '16px', border: `1px dashed ${BORDER}`, fontFamily: 'Space Mono, monospace', fontSize: '9px', color: TEXT_OFF, textAlign: 'center' }}>
                No weapon data — configure manually below
              </div>
            ) : (
              <div style={{ border: `1px solid ${BORDER}` }}>
                {unitWeapons.map((w) => (
                  <div
                    key={w.id}
                    onClick={() => { applyWeapon(w) }}
                    style={{
                      padding: '10px 14px', borderBottom: `1px solid ${BORDER}`,
                      cursor: 'pointer', transition: 'background 60ms',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = SURFACE_E }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                      <span style={{ fontFamily: 'Space Mono, monospace', fontSize: '11px', fontWeight: 700, color: ACCENT }}>
                        {w.name}
                      </span>
                      <span style={{ fontFamily: 'Space Mono, monospace', fontSize: '9px', color: TEXT_WEAK, whiteSpace: 'nowrap', marginLeft: '12px' }}>
                        A{w.A} · BS{w.BS}+ · S{w.S} AP{w.AP} D{w.D}
                      </span>
                    </div>
                    {(w.kw ?? []).filter((k) => k !== '-').length > 0 && (
                      <div style={{ fontFamily: 'Space Mono, monospace', fontSize: '8px', color: TEXT_OFF, marginTop: '3px', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
                        {(w.kw ?? []).filter((k) => k !== '-').join(' · ')}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      })() : (
        <>
        {selectedUnit && (
          <div style={{
            marginBottom: '20px', padding: '10px 14px',
            border: `1px solid ${BORDER}`,
            background: SURFACE,
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <div>
              <div style={{
                fontFamily: 'Space Mono, monospace', fontSize: '12px',
                fontWeight: 700, color: ACCENT,
              }}>
                {selectedUnit.name}
              </div>
              <div style={{
                fontFamily: 'Space Mono, monospace', fontSize: '8.5px',
                color: TEXT_WEAK, marginTop: '3px', letterSpacing: '1px',
              }}>
                T{selectedUnit.T} · SV{selectedUnit.Sv}+ · W{selectedUnit.W}
                {selectedUnit.invuln ? ` · ${selectedUnit.invuln}++` : ''}
              </div>
            </div>
            <button
              onClick={() => setDrawerOpen(true)}
              style={{
                background: 'none', border: 'none', color: ACCENT,
                fontFamily: 'Space Mono, monospace', fontSize: '8px',
                letterSpacing: '1.5px', textTransform: 'uppercase',
                cursor: 'pointer', opacity: 0.6, padding: 0,
              }}
              onMouseEnter={(e) => { e.currentTarget.style.opacity = '1' }}
              onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.6' }}
            >
              Change
            </button>
          </div>
        )}

        {!selectedUnit && (
          <div style={{
            marginBottom: '20px', display: 'flex', justifyContent: 'flex-end',
          }}>
            <button
              onClick={() => setDrawerOpen(true)}
              style={{
                background: 'transparent', border: `1px solid ${BORDER}`,
                color: ACCENT, fontFamily: 'Space Mono, monospace', fontSize: '8.5px',
                letterSpacing: '2px', textTransform: 'uppercase', padding: '5px 12px',
                cursor: 'pointer', borderRadius: 0,
                transition: 'border-color 100ms, background 100ms',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = ACCENT; e.currentTarget.style.background = 'rgba(47,224,255,0.07)' }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = BORDER; e.currentTarget.style.background = 'transparent' }}
            >
              Change unit →
            </button>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{
            padding: '10px 14px', border: `1px solid ${BORDER}`, background: SURFACE,
          }}>
            <div style={{
              fontFamily: 'Space Mono, monospace', fontSize: '12px',
              fontWeight: 700, color: TEXT, letterSpacing: '0.5px',
            }}>
              {weapon.name}
            </div>
            <div style={{
              fontFamily: 'Space Mono, monospace', fontSize: '9px',
              color: TEXT_WEAK, marginTop: '4px', letterSpacing: '0.5px',
            }}>
              A{weapon.attacks} · BS{weapon.skill}+ · S{weapon.strength} · AP{weapon.ap} · D{weapon.damage}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <StatInput label="Attacks (A)" type="text" value={weapon.attacks}
              placeholder="D6, 2D3+1…" onChange={(v) => setWeapon({ attacks: v })} />
            <StatInput label="Skill (BS/WS)" value={weapon.skill}
              min={2} max={6} onChange={(v) => setWeapon({ skill: v })} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <StatInput label="Strength (S)" value={weapon.strength}
              min={1} max={20} onChange={(v) => setWeapon({ strength: v })} />
            <StatInput label="AP" value={weapon.ap}
              min={-6} max={0} onChange={(v) => setWeapon({ ap: v })} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <StatInput label="Damage (D)" type="text" value={weapon.damage}
              placeholder="D3, D6+1…" onChange={(v) => setWeapon({ damage: v })} />
            <div>
              <div style={{
                fontFamily: 'Space Mono, monospace', fontSize: '8px',
                letterSpacing: '2px', textTransform: 'uppercase',
                color: TEXT_WEAK, marginBottom: '6px',
                display: 'flex', alignItems: 'baseline', gap: '6px',
              }}>
                <span>Firing models</span>
                {selectedUnit && (selectedUnit.min_models || selectedUnit.max_models) && (
                  <span style={{ fontSize: '7px', color: TEXT_OFF }}>
                    ({selectedUnit.min_models ?? 1}–{selectedUnit.max_models ?? '?'})
                  </span>
                )}
              </div>
              <input
                type="number"
                min={1}
                max={selectedUnit?.max_models ?? undefined}
                value={models}
                onChange={(e) => setAttacker({ models: Math.max(1, parseInt(e.target.value) || 1) })}
                style={{
                  width: '100%', boxSizing: 'border-box',
                  background: 'rgba(47,224,255,0.04)',
                  border: `1px solid ${BORDER}`,
                  color: TEXT, fontFamily: 'Space Mono, monospace',
                  fontSize: '13px', padding: '9px 10px',
                  outline: 'none',
                }}
              />
            </div>
          </div>

          <div>
            <div style={{
              fontFamily: 'Space Mono, monospace', fontSize: '8px',
              letterSpacing: '2px', textTransform: 'uppercase', color: TEXT_WEAK,
              marginBottom: '10px',
            }}>
              Keywords
            </div>
            <KeywordPicker />
          </div>
        </div>
        </>
      )}
      </>)}

      {hasWeapon && <AbilitiesSection
        buffs={buffs} toggleBuff={toggleBuff} hasBuff={hasBuff}
        keywords={weapon.keywords} setWeapon={setWeapon}
      />}
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

function mapKeywords(kwStrings) {
  if (!kwStrings?.length) return []
  const result = []

  for (const raw of kwStrings) {
    const upper = raw.toUpperCase().replace(/\s+/g, '_')

    const mapped = upper.replace(/-/g, '_').replace(/\s/g, '_')

    if (SIMPLE_KW_TYPES.includes(mapped)) {
      result.push({ type: mapped })
      continue
    }

    const sus = raw.match(/sustained\s*hits\s*(\d+|D\d+)/i)
    if (sus) { result.push({ type: 'SUSTAINED_HITS', value: sus[1] }); continue }

    const rf = raw.match(/rapid\s*fire\s*(\d+|D\d+)/i)
    if (rf) { result.push({ type: 'RAPID_FIRE', value: rf[1] }); continue }

    const melta = raw.match(/melta\s*(\d+|D\d+)/i)
    if (melta) { result.push({ type: 'MELTA', value: melta[1] }); continue }

    const anti = raw.match(/anti-(\w+)\s*(\d+)\+/i)
    if (anti) { result.push({ type: 'ANTI', target: anti[1].toUpperCase(), threshold: parseInt(anti[2]) }); continue }

    const ea = raw.match(/extra\s*attacks?\s*(\d+|D\d+)/i)
    if (ea) { result.push({ type: 'EXTRA_ATTACKS', value: ea[1] }); continue }
  }

  return result
}

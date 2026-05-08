import { useState, useEffect } from 'react'
import { useSimulatorStore } from '../store/simulatorStore'
import { useDataStore } from '../store/dataStore'
import { useArmyStore } from '../store/armyStore'
import { useAuthStore } from '../store/authStore'
import { StatInput } from './StatInput'
import { Toggle } from './Toggle'
import { UnitDrawer } from './UnitDrawer'
import { ACCENT, BG, BORDER, SURFACE, SURFACE_E, TEXT, TEXT_SEC, TEXT_WEAK, TEXT_OFF } from '../theme'

// ── Army Picker (Defender) ───────────────────────────────────────────────────

function DefenderArmyPicker() {
  const armies      = useArmyStore((s) => s.armies)
  const user        = useAuthStore((s) => s.user)
  const init        = useArmyStore((s) => s.init)
  const setDefender = useSimulatorStore((s) => s.setDefender)
  const setDefenderUnit = useSimulatorStore((s) => s.setDefenderUnit)
  const getUnitById = useDataStore((s) => s.getUnitById)

  useEffect(() => { init(user) }, [])  // eslint-disable-line

  const [armyId, setArmyId]   = useState('')
  const [unitUid, setUnitUid] = useState('')

  // Once armies load, auto-select the first one if nothing is selected yet
  useEffect(() => {
    if (!armyId && armies.length > 0) setArmyId(armies[0].id)
  }, [armies])  // eslint-disable-line

  const army = armies.find((a) => a.id === armyId) ?? null
  const unit = army?.units.find((u) => u.uid === unitUid) ?? null

  useEffect(() => {
    if (unit) {
      setDefender({
        toughness: unit.T,
        save:      unit.Sv,
        wounds:    unit.W,
        invuln:        unit.invuln ?? null,
        models:        unit.models ?? 1,
        fnp:           null,
        dmg_reduction: null,
        keywords:      unit.kw ?? [],
      })
      const fullUnit = getUnitById(unit.unit_id)
      setDefenderUnit(fullUnit || unit)
    }
  }, [unit, setDefender, setDefenderUnit, getUnitById])

  const handleArmyChange = (id) => { setArmyId(id); setUnitUid('') }
  const handleUnitChange = (uid) => setUnitUid(uid)

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
          <span style={labelStyle}>Target unit</span>
          {army.units.length === 0 ? (
            <div style={{ fontFamily: 'Space Mono, monospace', fontSize: '10px', color: TEXT_WEAK }}>
              No units in this army.
            </div>
          ) : (
            <div style={{
              border: `1px solid ${BORDER}`, maxHeight: '200px', overflowY: 'auto',
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
                      {u.models} models · T{u.T} · Sv{u.Sv}+ · W{u.W}
                      {u.invuln ? ` · ${u.invuln}++` : ''}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {unit && (
        <div style={{
          padding: '10px 14px', border: `1px solid ${BORDER}`, background: SURFACE,
        }}>
          <div style={{
            fontFamily: 'Space Mono, monospace', fontSize: '12px',
            fontWeight: 700, color: ACCENT,
          }}>
            {unit.name}
          </div>
          <div style={{
            fontFamily: 'Space Mono, monospace', fontSize: '9px',
            color: TEXT_WEAK, marginTop: '4px', letterSpacing: '0.5px',
          }}>
            T{unit.T} · Sv{unit.Sv}+ · W{unit.W}
            {unit.invuln ? ` · ${unit.invuln}++` : ''}
            · {unit.models} models
          </div>
        </div>
      )}
    </div>
  )
}

// ── Main DefenderPanel ───────────────────────────────────────────────────────

export function DefenderPanel() {
  const defender    = useSimulatorStore((s) => s.defender)
  const context     = useSimulatorStore((s) => s.context)
  const setDefender = useSimulatorStore((s) => s.setDefender)
  const setContext  = useSimulatorStore((s) => s.setContext)

  const selectedUnit    = useSimulatorStore((s) => s.defenderUnit)
  const setSelectedUnit = useSimulatorStore((s) => s.setDefenderUnit)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [mode, setMode]             = useState('browse')

  function applyUnit(u) {
    setSelectedUnit(u)
    setDefender({
      toughness: u.T,
      save:      u.Sv,
      wounds:    u.W,
      invuln:        u.invuln ?? null,
      models:        u.min_models ?? u.max_models ?? defender.models,
      fnp:           null,
      dmg_reduction: null,
      keywords:      u.kw ?? [],
    })
  }

  function handleDrawerSelect(unit) {
    applyUnit(unit)
  }

  const hasUnit = Boolean(selectedUnit)

  return (
    <>
    <section>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', marginBottom: '20px' }}>
        <span style={{
          fontFamily: 'Space Mono, monospace', fontSize: '8px',
          letterSpacing: '2px', textTransform: 'uppercase', color: TEXT_OFF,
        }}>UNIT.002</span>
        <span style={{
          fontFamily: 'Space Mono, monospace', fontSize: '11px',
          fontWeight: 700, letterSpacing: '3px', textTransform: 'uppercase', color: TEXT,
        }}>Defender</span>
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
        <DefenderArmyPicker />
      ) : (<>

      {/* Browse Units mode */}
      {!hasUnit ? (
        <div style={{
          padding: '32px', border: `1px dashed ${BORDER}`,
          textAlign: 'center',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px',
          marginBottom: '20px',
        }}>
          <div style={{
            fontFamily: 'Space Mono, monospace', fontSize: '10px',
            letterSpacing: '1.5px', textTransform: 'uppercase',
            color: TEXT_WEAK, lineHeight: 1.7,
          }}>
            Select the target unit
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
      ) : (
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
              T{defender.toughness} · SV{defender.save}+ · W{defender.wounds}
              {defender.invuln ? ` · ${defender.invuln}++` : ''}
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
      </>)}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginBottom: '28px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          <StatInput label="Toughness (T)" value={defender.toughness}
            min={1} max={14} onChange={(v) => setDefender({ toughness: v })} />
          <StatInput label="Save (Sv)" value={defender.save}
            min={2} max={7} onChange={(v) => setDefender({ save: v })} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          <StatInput label="Wounds (W)" value={defender.wounds}
            min={1} max={24} onChange={(v) => setDefender({ wounds: v })} />
          <div>
            <div style={{
              fontFamily: 'Space Mono, monospace', fontSize: '8px',
              letterSpacing: '2px', textTransform: 'uppercase',
              color: TEXT_WEAK, marginBottom: '6px',
              display: 'flex', alignItems: 'baseline', gap: '6px',
            }}>
              <span>Number of models</span>
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
              value={defender.models}
              onChange={(e) => setDefender({ models: Math.max(1, parseInt(e.target.value) || 1) })}
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

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          <StatInput label="Invulnerable save" value={defender.invuln ?? ''}
            placeholder="None" min={2} max={6} onChange={(v) => setDefender({ invuln: v })} />
          <StatInput label="Feel no pain" value={defender.fnp ?? ''}
            placeholder="None" min={2} max={6} onChange={(v) => setDefender({ fnp: v })} />
          <StatInput label="Dmg reduction" value={defender.dmg_reduction ?? ''}
            placeholder="None" min={1} max={5} onChange={(v) => setDefender({ dmg_reduction: v })} />
        </div>
      </div>

      <div style={{ borderTop: `1px solid ${BORDER}`, paddingTop: '22px' }}>
        <div style={{
          fontFamily: 'Space Mono, monospace', fontSize: '9px',
          letterSpacing: '2.5px', textTransform: 'uppercase',
          color: TEXT_WEAK, marginBottom: '18px',
        }}>
          Special rules
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <Toggle label="In cover (+1 to armour save)" checked={context.cover}
            onChange={(v) => setContext({ cover: v })} />
          <Toggle label="Within half range (Melta, Rapid Fire)" checked={context.half_range}
            onChange={(v) => setContext({ half_range: v })} />
          <Toggle label="Attacker charged this turn (Lance)" checked={context.attacker_charged}
            onChange={(v) => setContext({ attacker_charged: v })} />
          <Toggle label="Attacker moved this turn (Heavy penalty)" checked={context.attacker_moved}
            onChange={(v) => setContext({ attacker_moved: v })} />
        </div>
      </div>
    </section>

    <UnitDrawer
      isOpen={drawerOpen}
      onClose={() => setDrawerOpen(false)}
      role="defender"
      onSelect={handleDrawerSelect}
    />
    </>
  )
}

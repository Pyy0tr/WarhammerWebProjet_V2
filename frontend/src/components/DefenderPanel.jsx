import { useState } from 'react'
import { useSimulatorStore } from '../store/simulatorStore'
import { useDataStore } from '../store/dataStore'
import { StatInput } from './StatInput'
import { Toggle } from './Toggle'
import { SearchInput } from './SearchInput'
import { UnitDrawer } from './UnitDrawer'
import { ACCENT, BORDER, SURFACE, TEXT, TEXT_SEC, TEXT_WEAK, TEXT_OFF } from '../theme'

export function DefenderPanel() {
  const defender    = useSimulatorStore((s) => s.defender)
  const context     = useSimulatorStore((s) => s.context)
  const setDefender = useSimulatorStore((s) => s.setDefender)
  const setContext  = useSimulatorStore((s) => s.setContext)

  const searchUnits = useDataStore((s) => s.searchUnits)
  const [unitResults, setUnitResults] = useState([])
  const [unitName, setUnitName]       = useState('')
  const [drawerOpen, setDrawerOpen]   = useState(false)

  function handleUnitSearch(query) {
    setUnitName(query)
    setUnitResults(searchUnits(query))
  }

  function handleUnitSelect(u) {
    applyUnit(u)
    setUnitResults([])
  }

  function applyUnit(u) {
    setUnitName(u.name)
    setDefender({
      toughness: u.T,
      save:      u.Sv,
      wounds:    u.W,
      invuln:    u.invuln,
      models:    defender.models,
      fnp:       null,
      keywords:  u.kw,
    })
  }

  function handleDrawerSelect(unit) {
    applyUnit(unit)
  }

  return (
    <>
    <section>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px' }}>
          <span style={{
            fontFamily: 'Space Mono, monospace', fontSize: '8px',
            letterSpacing: '2px', textTransform: 'uppercase', color: TEXT_OFF,
          }}>UNIT.002</span>
          <span style={{
            fontFamily: 'Space Mono, monospace', fontSize: '11px',
            fontWeight: 700, letterSpacing: '3px', textTransform: 'uppercase', color: TEXT,
          }}>Defender</span>
        </div>
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
          Browse units →
        </button>
      </div>

      {unitName && (
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
              {unitName}
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

      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginBottom: '28px' }}>
        <SearchInput
          label="Search unit"
          value={unitName}
          placeholder="Type to search (e.g. Intercessors, Wraithknight…)"
          onSearch={handleUnitSearch}
          results={unitResults}
          onSelect={handleUnitSelect}
          renderItem={(u) => (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <span style={{ fontFamily: 'Space Mono, monospace', fontSize: '11px', fontWeight: 700, color: TEXT }}>
                  {u.name}
                </span>
                <span style={{
                  fontFamily: 'Space Mono, monospace', fontSize: '9px', color: TEXT_WEAK,
                }}>
                  T{u.T} · Sv{u.Sv}+ · W{u.W}
                </span>
              </div>
              <div style={{
                fontFamily: 'Georgia, serif', fontSize: '10px',
                color: TEXT_OFF, marginTop: '2px',
              }}>
                {u.factions?.[0] ?? u.faction}
              </div>
            </div>
          )}
        />

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          <StatInput label="Toughness (T)" value={defender.toughness}
            min={1} max={14} onChange={(v) => setDefender({ toughness: v })} />
          <StatInput label="Save (Sv)" value={defender.save}
            min={2} max={7} onChange={(v) => setDefender({ save: v })} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          <StatInput label="Wounds (W)" value={defender.wounds}
            min={1} max={24} onChange={(v) => setDefender({ wounds: v })} />
          <StatInput label="Number of models" value={defender.models}
            min={1} onChange={(v) => setDefender({ models: v })} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          <StatInput label="Invulnerable save" value={defender.invuln ?? ''}
            placeholder="None" min={2} max={6} onChange={(v) => setDefender({ invuln: v })} />
          <StatInput label="Feel no pain" value={defender.fnp ?? ''}
            placeholder="None" min={2} max={6} onChange={(v) => setDefender({ fnp: v })} />
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

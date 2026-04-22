import { useState } from 'react'
import { useSimulatorStore } from '../store/simulatorStore'
import { useDataStore } from '../store/dataStore'
import { StatInput } from './StatInput'
import { SearchInput } from './SearchInput'
import { UnitDrawer } from './UnitDrawer'

const BLUE = '#09A2C4'
const BG   = '#041428'

const SIMPLE_KEYWORDS = [
  'LETHAL_HITS', 'DEVASTATING_WOUNDS', 'TORRENT', 'TWIN_LINKED',
  'BLAST', 'HEAVY', 'LANCE', 'IGNORES_COVER', 'INDIRECT_FIRE',
  'ASSAULT', 'PISTOL', 'PSYCHIC', 'PRECISION', 'HAZARDOUS',
]

const VALUED_KEYWORDS = ['SUSTAINED_HITS', 'RAPID_FIRE', 'MELTA', 'EXTRA_ATTACKS']

function fmtKw(kw) {
  if (kw.type === 'ANTI') return `ANTI-${kw.target} ${kw.threshold}+`
  if (kw.value !== undefined) return `${kw.type.replace(/_/g, ' ')} ${kw.value}`
  return kw.type.replace(/_/g, ' ')
}

export function AttackerPanel() {
  const weapon      = useSimulatorStore((s) => s.attacker.weapon)
  const models      = useSimulatorStore((s) => s.attacker.models)
  const setWeapon   = useSimulatorStore((s) => s.setWeapon)
  const setAttacker = useSimulatorStore((s) => s.setAttacker)

  const searchWeapons = useDataStore((s) => s.searchWeapons)
  const [weaponResults, setWeaponResults] = useState([])
  const [drawerOpen, setDrawerOpen]       = useState(false)
  const [selectedUnit, setSelectedUnit]   = useState(null)

  // Keyword picker state
  const [pickerType, setPickerType]           = useState('')
  const [pickerValue, setPickerValue]         = useState('1')
  const [pickerTarget, setPickerTarget]       = useState('INFANTRY')
  const [pickerThreshold, setPickerThreshold] = useState('4')

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

  function addKeyword() {
    if (!pickerType) return
    let kw
    if (VALUED_KEYWORDS.includes(pickerType)) {
      kw = { type: pickerType, value: pickerValue }
    } else if (pickerType === 'ANTI') {
      kw = { type: 'ANTI', target: pickerTarget.toUpperCase(), threshold: parseInt(pickerThreshold) }
    } else {
      kw = { type: pickerType }
    }
    setWeapon({ keywords: [...(weapon.keywords || []), kw] })
    setPickerType('')
    setPickerValue('1')
  }

  function removeKeyword(idx) {
    setWeapon({ keywords: weapon.keywords.filter((_, i) => i !== idx) })
  }

  const inputStyle = {
    background: 'transparent', border: `1px solid rgba(9,162,196,0.35)`,
    color: BLUE, fontFamily: 'Space Mono, monospace', fontSize: '10px',
    letterSpacing: '1px', padding: '5px 8px', outline: 'none',
    borderRadius: 0, width: '100%',
  }

  return (
    <>
    <section>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '24px' }}>
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
      </div>

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

          {/* Active keyword badges */}
          {weapon.keywords?.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '12px' }}>
              {weapon.keywords.map((kw, i) => (
                <span key={i} style={{
                  display: 'inline-flex', alignItems: 'center', gap: '6px',
                  border: `1px solid rgba(9,162,196,0.3)`,
                  padding: '3px 6px 3px 8px',
                  fontFamily: 'Space Mono, monospace',
                  fontSize: '8.5px', letterSpacing: '1px', textTransform: 'uppercase',
                  opacity: 0.8,
                }}>
                  {fmtKw(kw)}
                  <button
                    onClick={() => removeKeyword(i)}
                    style={{
                      background: 'none', border: 'none', color: BLUE,
                      cursor: 'pointer', padding: '0 2px', lineHeight: 1,
                      fontSize: '11px', opacity: 0.5,
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.opacity = '1' }}
                    onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.5' }}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}

          {/* Keyword picker */}
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
            <select
              value={pickerType}
              onChange={(e) => { setPickerType(e.target.value); setPickerValue('1') }}
              style={{ ...inputStyle, width: 'auto', flex: '1', minWidth: '160px', cursor: 'pointer' }}
            >
              <option value="">+ Add keyword…</option>
              <optgroup label="Simple">
                {SIMPLE_KEYWORDS.map((k) => (
                  <option key={k} value={k}>{k.replace(/_/g, ' ')}</option>
                ))}
              </optgroup>
              <optgroup label="Valued">
                <option value="SUSTAINED_HITS">SUSTAINED HITS X</option>
                <option value="RAPID_FIRE">RAPID FIRE X</option>
                <option value="MELTA">MELTA X</option>
                <option value="EXTRA_ATTACKS">EXTRA ATTACKS X</option>
              </optgroup>
              <optgroup label="Special">
                <option value="ANTI">ANTI-X Y+</option>
              </optgroup>
            </select>

            {VALUED_KEYWORDS.includes(pickerType) && (
              <input
                type="text"
                value={pickerValue}
                onChange={(e) => setPickerValue(e.target.value)}
                placeholder="1"
                style={{ ...inputStyle, width: '52px', flex: 'none' }}
              />
            )}

            {pickerType === 'ANTI' && (
              <>
                <input
                  type="text"
                  value={pickerTarget}
                  onChange={(e) => setPickerTarget(e.target.value)}
                  placeholder="INFANTRY"
                  style={{ ...inputStyle, width: '100px', flex: 'none' }}
                />
                <input
                  type="number"
                  value={pickerThreshold}
                  onChange={(e) => setPickerThreshold(e.target.value)}
                  min={2} max={6}
                  placeholder="4"
                  style={{ ...inputStyle, width: '48px', flex: 'none' }}
                />
                <span style={{
                  fontFamily: 'Space Mono, monospace', fontSize: '11px', opacity: 0.4,
                }}>+</span>
              </>
            )}

            {pickerType && (
              <button
                onClick={addKeyword}
                style={{
                  background: 'transparent', border: `1px solid ${BLUE}`,
                  color: BLUE, fontFamily: 'Space Mono, monospace',
                  fontSize: '9px', letterSpacing: '1.5px', textTransform: 'uppercase',
                  padding: '5px 12px', cursor: 'pointer', borderRadius: 0,
                  transition: 'background 100ms, color 100ms',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = BLUE; e.currentTarget.style.color = BG }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = BLUE }}
              >
                Add
              </button>
            )}
          </div>
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

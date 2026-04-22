import { useState, useEffect, useRef } from 'react'
import { useDataStore } from '../store/dataStore'

const BLUE  = '#09A2C4'
const BG    = '#041428'
const DIM   = 'rgba(9,162,196,0.15)'
const MUTED = 'rgba(9,162,196,0.45)'

// ── Helpers ───────────────────────────────────────────────────────────────────

/** "Aeldari - Craftworlds" → { group: "Aeldari", sub: "Craftworlds" } */
function parseFaction(name) {
  const idx = name.indexOf(' - ')
  if (idx === -1) return { group: name, sub: null }
  return { group: name.slice(0, idx), sub: name.slice(idx + 3) }
}

function groupFactions(factions) {
  const map = {}
  for (const f of factions) {
    const { group } = parseFaction(f)
    if (!map[group]) map[group] = []
    map[group].push(f)
  }
  return map   // { "Aeldari": ["Aeldari - Craftworlds", ...], ... }
}

function fmtWeaponLine(w) {
  return `${w.A} att · ${w.BS}+ · S${w.S} AP${w.AP} D${w.D}`
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SectionLabel({ children }) {
  return (
    <div style={{
      fontFamily: 'Space Mono, monospace', fontSize: '8px',
      letterSpacing: '2.5px', textTransform: 'uppercase',
      color: BLUE, opacity: 0.4, padding: '16px 20px 8px',
    }}>
      {children}
    </div>
  )
}

function UnitRow({ unit, onClick }) {
  const [hover, setHover] = useState(false)
  return (
    <div
      onClick={() => onClick(unit)}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        padding: '10px 20px',
        borderBottom: `1px solid rgba(9,162,196,0.07)`,
        cursor: 'pointer',
        background: hover ? 'rgba(9,162,196,0.05)' : 'transparent',
        transition: 'background 60ms',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <span style={{
          fontFamily: 'Space Mono, monospace', fontSize: '12px',
          fontWeight: 700, color: BLUE,
        }}>
          {unit.name}
        </span>
        <span style={{
          fontFamily: 'Space Mono, monospace', fontSize: '9px',
          opacity: 0.45, whiteSpace: 'nowrap', marginLeft: '12px',
        }}>
          T{unit.T} · {unit.Sv}+ · W{unit.W}
          {unit.invuln ? ` · ${unit.invuln}++` : ''}
        </span>
      </div>
    </div>
  )
}

function WeaponRow({ weapon, onClick }) {
  const [hover, setHover] = useState(false)
  return (
    <div
      onClick={() => onClick(weapon)}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        padding: '11px 20px',
        borderBottom: `1px solid rgba(9,162,196,0.07)`,
        cursor: 'pointer',
        background: hover ? 'rgba(9,162,196,0.05)' : 'transparent',
        transition: 'background 60ms',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <span style={{
          fontFamily: 'Space Mono, monospace', fontSize: '12px',
          fontWeight: 700, color: BLUE,
        }}>
          {weapon.name}
        </span>
        <span style={{
          fontFamily: 'Space Mono, monospace', fontSize: '9px',
          opacity: 0.45, whiteSpace: 'nowrap', marginLeft: '12px',
        }}>
          {fmtWeaponLine(weapon)}
        </span>
      </div>
      {weapon.kw?.length > 0 && (
        <div style={{
          marginTop: '3px',
          fontFamily: 'Space Mono, monospace', fontSize: '8px',
          letterSpacing: '1px', opacity: 0.35, textTransform: 'uppercase',
        }}>
          {weapon.kw.slice(0, 4).join(' · ')}
        </div>
      )}
    </div>
  )
}

// ── Browsing panel (factions + units) ────────────────────────────────────────

function BrowsePanel({ onSelectUnit }) {
  const factions      = useDataStore((s) => s.factions)
  const unitsByFaction = useDataStore((s) => s.unitsByFaction)

  const [openGroup, setOpenGroup]     = useState(null)   // top-level group
  const [openFaction, setOpenFaction] = useState(null)   // subfaction

  const grouped = groupFactions(factions)
  const groups  = Object.keys(grouped).sort()

  return (
    <div>
      {groups.map((group) => {
        const subfactions = grouped[group]
        const isGroupOpen = openGroup === group

        return (
          <div key={group}>
            {/* Group header */}
            <div
              onClick={() => setOpenGroup(isGroupOpen ? null : group)}
              style={{
                padding: '11px 20px',
                borderBottom: `1px solid rgba(9,162,196,0.1)`,
                cursor: 'pointer',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                background: isGroupOpen ? 'rgba(9,162,196,0.04)' : 'transparent',
              }}
            >
              <span style={{
                fontFamily: 'Space Mono, monospace', fontSize: '11px',
                fontWeight: 700, color: BLUE, letterSpacing: '1px',
              }}>
                {group}
              </span>
              <span style={{
                fontFamily: 'Space Mono, monospace', fontSize: '9px',
                opacity: 0.4, marginLeft: '8px',
              }}>
                {isGroupOpen ? '▲' : '▼'}
              </span>
            </div>

            {/* Subfactions */}
            {isGroupOpen && subfactions.map((faction) => {
              const { sub } = parseFaction(faction)
              const units   = unitsByFaction[faction] ?? []
              const isFactionOpen = openFaction === faction

              // If no subfaction distinction, show units directly
              const label = sub ?? group

              return (
                <div key={faction}>
                  <div
                    onClick={() => setOpenFaction(isFactionOpen ? null : faction)}
                    style={{
                      padding: '9px 20px 9px 32px',
                      borderBottom: `1px solid rgba(9,162,196,0.06)`,
                      cursor: 'pointer',
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      background: isFactionOpen ? 'rgba(9,162,196,0.06)' : 'transparent',
                    }}
                  >
                    <span style={{
                      fontFamily: 'Space Mono, monospace', fontSize: '10px',
                      color: BLUE, opacity: isFactionOpen ? 1 : 0.7, letterSpacing: '0.5px',
                    }}>
                      {label}
                    </span>
                    <span style={{
                      fontFamily: 'Space Mono, monospace', fontSize: '8px', opacity: 0.35,
                    }}>
                      {isFactionOpen ? '▲' : `${units.length}`}
                    </span>
                  </div>

                  {/* Units list */}
                  {isFactionOpen && (
                    <div style={{ borderBottom: `1px solid rgba(9,162,196,0.1)` }}>
                      {units.length === 0 ? (
                        <div style={{
                          padding: '12px 20px 12px 40px',
                          fontFamily: 'Space Mono, monospace', fontSize: '9px',
                          opacity: 0.35,
                        }}>
                          No units
                        </div>
                      ) : (
                        units.map((u) => (
                          <UnitRow key={u.id} unit={u} onClick={onSelectUnit} />
                        ))
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )
      })}
    </div>
  )
}

// ── Search results panel ──────────────────────────────────────────────────────

function SearchResults({ results, onSelectUnit }) {
  if (results.length === 0) {
    return (
      <div style={{
        padding: '32px 20px', textAlign: 'center',
        fontFamily: 'Space Mono, monospace', fontSize: '9px',
        letterSpacing: '2px', opacity: 0.3, textTransform: 'uppercase',
      }}>
        No results
      </div>
    )
  }
  return (
    <div>
      <SectionLabel>Results — {results.length}</SectionLabel>
      {results.map((u) => <UnitRow key={u.id} unit={u} onClick={onSelectUnit} />)}
    </div>
  )
}

// ── Weapon selection panel (attacker only) ────────────────────────────────────

function WeaponStep({ unit, onSelectWeapon, onBack }) {
  const getUnitWeapons = useDataStore((s) => s.getUnitWeapons)
  const weapons = getUnitWeapons(unit)

  return (
    <div>
      {/* Unit summary */}
      <div style={{
        padding: '16px 20px',
        borderBottom: `1px solid rgba(9,162,196,0.15)`,
        background: 'rgba(9,162,196,0.04)',
      }}>
        <div style={{
          fontFamily: 'Space Mono, monospace', fontSize: '13px',
          fontWeight: 700, color: BLUE, marginBottom: '6px',
        }}>
          {unit.name}
        </div>
        <div style={{
          fontFamily: 'Space Mono, monospace', fontSize: '9px',
          opacity: 0.5, letterSpacing: '1px',
        }}>
          T{unit.T} · SV{unit.Sv}+ · W{unit.W}
          {unit.invuln ? ` · ${unit.invuln}++` : ''}
        </div>
      </div>

      <SectionLabel>Choose a weapon</SectionLabel>

      {weapons.length === 0 ? (
        <div style={{
          padding: '24px 20px',
          fontFamily: 'Space Mono, monospace', fontSize: '9px',
          opacity: 0.35, letterSpacing: '1px',
        }}>
          No weapon data available. Configure manually.
        </div>
      ) : (
        weapons.map((w) => (
          <WeaponRow key={w.id} weapon={w} onClick={onSelectWeapon} />
        ))
      )}
    </div>
  )
}

// ── Main drawer ───────────────────────────────────────────────────────────────

/**
 * Props:
 *   isOpen      boolean
 *   onClose     () => void
 *   role        'attacker' | 'defender'
 *   onSelect    (unit, weapon?) => void
 *                 – for defender: called with (unit)
 *                 – for attacker: called with (unit, weapon)
 */
export function UnitDrawer({ isOpen, onClose, role, onSelect }) {
  const searchUnits   = useDataStore((s) => s.searchUnits)
  const load          = useDataStore((s) => s.load)
  const loaded        = useDataStore((s) => s.loaded)

  const [query,          setQuery]         = useState('')
  const [searchResults,  setSearchResults] = useState([])
  const [step,           setStep]          = useState('unit')   // 'unit' | 'weapon'
  const [pendingUnit,    setPendingUnit]    = useState(null)

  const inputRef = useRef(null)

  useEffect(() => { if (!loaded) load() }, [loaded, load])

  // Reset state when opening
  useEffect(() => {
    if (isOpen) {
      setQuery(''); setSearchResults([]); setStep('unit'); setPendingUnit(null)
      setTimeout(() => inputRef.current?.focus(), 120)
    }
  }, [isOpen])

  // ESC to close / go back
  useEffect(() => {
    function handler(e) {
      if (!isOpen) return
      if (e.key === 'Escape') {
        if (step === 'weapon') { setStep('unit'); setPendingUnit(null) }
        else onClose()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [isOpen, step, onClose])

  function handleSearch(e) {
    const q = e.target.value
    setQuery(q)
    setSearchResults(q.length >= 2 ? searchUnits(q) : [])
  }

  function handleSelectUnit(unit) {
    if (role === 'defender') {
      onSelect(unit)
      onClose()
    } else {
      // Attacker: go to weapon step
      setPendingUnit(unit)
      setStep('weapon')
    }
  }

  function handleSelectWeapon(weapon) {
    onSelect(pendingUnit, weapon)
    onClose()
  }

  function goBack() {
    setStep('unit')
    setPendingUnit(null)
  }

  const title = step === 'weapon'
    ? 'Select weapon'
    : role === 'attacker' ? 'Select attacker' : 'Select defender'

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 200,
          background: 'rgba(4,20,40,0.7)',
          opacity: isOpen ? 1 : 0,
          pointerEvents: isOpen ? 'auto' : 'none',
          transition: 'opacity 180ms ease',
        }}
      />

      {/* Drawer panel */}
      <div
        style={{
          position: 'fixed', top: 0, right: 0, bottom: 0,
          width: 'clamp(340px, 38vw, 520px)',
          background: BG,
          borderLeft: `1px solid rgba(9,162,196,0.25)`,
          zIndex: 201,
          display: 'flex', flexDirection: 'column',
          transform: isOpen ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 200ms cubic-bezier(0.4,0,0.2,1)',
        }}
      >
        {/* Header */}
        <div style={{
          padding: '0 20px',
          borderBottom: `1px solid rgba(9,162,196,0.15)`,
          flexShrink: 0,
        }}>
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '16px 0 12px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {step === 'weapon' && (
                <button
                  onClick={goBack}
                  style={{
                    background: 'none', border: 'none', color: BLUE,
                    fontFamily: 'Space Mono, monospace', fontSize: '10px',
                    letterSpacing: '1px', cursor: 'pointer', padding: '0 8px 0 0',
                    opacity: 0.6,
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.opacity = '1' }}
                  onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.6' }}
                >
                  ← Back
                </button>
              )}
              <span style={{
                fontFamily: 'Space Mono, monospace', fontSize: '10px',
                fontWeight: 700, letterSpacing: '3px', textTransform: 'uppercase',
                color: BLUE,
              }}>
                {title}
              </span>
            </div>
            <button
              onClick={onClose}
              style={{
                background: 'none', border: 'none', color: BLUE,
                cursor: 'pointer', padding: '4px', opacity: 0.5, lineHeight: 1,
              }}
              onMouseEnter={(e) => { e.currentTarget.style.opacity = '1' }}
              onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.5' }}
            >
              <svg width="14" height="14" viewBox="0 0 14 14">
                <line x1="2" y1="2" x2="12" y2="12" stroke={BLUE} strokeWidth="1.5" />
                <line x1="12" y1="2" x2="2" y2="12" stroke={BLUE} strokeWidth="1.5" />
              </svg>
            </button>
          </div>

          {/* Search input — only in unit step */}
          {step === 'unit' && (
            <div style={{ position: 'relative', paddingBottom: '14px' }}>
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={handleSearch}
                placeholder="Search unit…"
                style={{
                  width: '100%', boxSizing: 'border-box',
                  background: 'transparent',
                  border: `1px solid ${query.length >= 2 ? BLUE : 'rgba(9,162,196,0.3)'}`,
                  borderRadius: 0, color: BLUE,
                  fontFamily: 'Space Mono, monospace', fontSize: '13px',
                  fontWeight: 700, padding: '9px 36px 9px 12px',
                  outline: 'none', transition: 'border-color 100ms',
                }}
              />
              {query ? (
                <button
                  onClick={() => { setQuery(''); setSearchResults([]) }}
                  style={{
                    position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                    color: BLUE, opacity: 0.5, lineHeight: 1,
                  }}
                >
                  <svg width="12" height="12" viewBox="0 0 12 12">
                    <line x1="2" y1="2" x2="10" y2="10" stroke={BLUE} strokeWidth="1.5" />
                    <line x1="10" y1="2" x2="2" y2="10" stroke={BLUE} strokeWidth="1.5" />
                  </svg>
                </button>
              ) : (
                <svg
                  width="14" height="14" viewBox="0 0 14 14" fill="none"
                  style={{
                    position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)',
                    opacity: 0.35, pointerEvents: 'none',
                  }}
                >
                  <circle cx="5.5" cy="5.5" r="4" stroke={BLUE} strokeWidth="1.2" />
                  <line x1="8.5" y1="8.5" x2="12.5" y2="12.5" stroke={BLUE} strokeWidth="1.2" />
                </svg>
              )}
            </div>
          )}
        </div>

        {/* Body — scrollable */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {step === 'weapon' ? (
            <WeaponStep
              unit={pendingUnit}
              onSelectWeapon={handleSelectWeapon}
              onBack={goBack}
            />
          ) : query.length >= 2 ? (
            <SearchResults results={searchResults} onSelectUnit={handleSelectUnit} />
          ) : (
            <BrowsePanel onSelectUnit={handleSelectUnit} />
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '12px 20px',
          borderTop: `1px solid rgba(9,162,196,0.1)`,
          flexShrink: 0,
          fontFamily: 'Space Mono, monospace', fontSize: '8px',
          letterSpacing: '2px', opacity: 0.3, textTransform: 'uppercase',
        }}>
          {loaded ? `${useDataStore.getState().units.length} units · ${useDataStore.getState().factions.length} factions` : 'Loading…'}
        </div>
      </div>
    </>
  )
}

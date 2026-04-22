import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDataStore } from '../store/dataStore'
import { useSimulatorStore } from '../store/simulatorStore'

const BLUE  = '#09A2C4'
const BG    = '#041428'

// ── Helpers ───────────────────────────────────────────────────────────────────

function parseFaction(name) {
  const idx = name.indexOf(' - ')
  if (idx === -1) return { group: name, sub: null }
  return { group: name.slice(0, idx), sub: name.slice(idx + 3) }
}

function groupFactions(factions, unitsByFaction) {
  const map = {}
  for (const f of factions) {
    const { group } = parseFaction(f)
    if (!map[group]) map[group] = []
    map[group].push({ name: f, count: (unitsByFaction[f] || []).length })
  }
  return map
}

function isLibrary(name) {
  return name.includes('Library') || name.includes('Legends')
}

function mapKeywords(kwStrings) {
  if (!kwStrings?.length) return []
  const result = []
  for (const raw of kwStrings) {
    const upper = raw.toUpperCase().replace(/[\s-]+/g, '_')
    const simpleTypes = ['TORRENT','LETHAL_HITS','DEVASTATING_WOUNDS','TWIN_LINKED','BLAST','HEAVY',
      'LANCE','IGNORES_COVER','INDIRECT_FIRE','ASSAULT','PISTOL','PSYCHIC','PRECISION','HAZARDOUS']
    if (simpleTypes.includes(upper)) { result.push({ type: upper }); continue }
    const sus = raw.match(/sustained\s*hits\s*(\d+|D\d+)/i)
    if (sus) { result.push({ type: 'SUSTAINED_HITS', value: sus[1] }); continue }
    const rf = raw.match(/rapid\s*fire\s*(\d+|D\d+)/i)
    if (rf) { result.push({ type: 'RAPID_FIRE', value: rf[1] }); continue }
    const melta = raw.match(/melta\s*(\d+|D\d+)/i)
    if (melta) { result.push({ type: 'MELTA', value: melta[1] }); continue }
    const anti = raw.match(/anti-(\w+)\s*(\d+)\+/i)
    if (anti) { result.push({ type: 'ANTI', target: anti[1].toUpperCase(), threshold: parseInt(anti[2]) }); continue }
  }
  return result
}

// ── Shared components ─────────────────────────────────────────────────────────

function SearchBar({ value, onChange, placeholder }) {
  return (
    <div style={{ position: 'relative', maxWidth: '480px' }}>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          width: '100%', boxSizing: 'border-box',
          background: 'transparent',
          border: `1px solid ${value ? BLUE : 'rgba(9,162,196,0.3)'}`,
          borderRadius: 0, color: BLUE,
          fontFamily: 'Space Mono, monospace', fontSize: '13px',
          fontWeight: 700, padding: '10px 36px 10px 14px',
          outline: 'none', transition: 'border-color 100ms',
        }}
      />
      {value ? (
        <button
          onClick={() => onChange('')}
          style={{
            position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)',
            background: 'none', border: 'none', cursor: 'pointer', color: BLUE, opacity: 0.5,
          }}
        >
          <svg width="12" height="12" viewBox="0 0 12 12">
            <line x1="2" y1="2" x2="10" y2="10" stroke={BLUE} strokeWidth="1.5"/>
            <line x1="10" y1="2" x2="2" y2="10" stroke={BLUE} strokeWidth="1.5"/>
          </svg>
        </button>
      ) : (
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none"
          style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', opacity: 0.35, pointerEvents: 'none' }}>
          <circle cx="5.5" cy="5.5" r="4" stroke={BLUE} strokeWidth="1.2"/>
          <line x1="8.5" y1="8.5" x2="12.5" y2="12.5" stroke={BLUE} strokeWidth="1.2"/>
        </svg>
      )}
    </div>
  )
}

function BackButton({ onClick, label }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: 'none', border: 'none', color: BLUE, cursor: 'pointer', padding: 0,
        fontFamily: 'Space Mono, monospace', fontSize: '9px',
        letterSpacing: '2px', textTransform: 'uppercase', opacity: 0.5,
        display: 'flex', alignItems: 'center', gap: '6px',
        transition: 'opacity 100ms',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.opacity = '1' }}
      onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.5' }}
    >
      ← {label}
    </button>
  )
}

function Chip({ children, dim }) {
  return (
    <span style={{
      display: 'inline-block',
      border: `1px solid rgba(9,162,196,${dim ? '0.2' : '0.35'})`,
      padding: '3px 8px',
      fontFamily: 'Space Mono, monospace', fontSize: '8px',
      letterSpacing: '1px', textTransform: 'uppercase',
      opacity: dim ? 0.45 : 0.8,
    }}>
      {children}
    </span>
  )
}

// ── VIEW 1: Factions grid ─────────────────────────────────────────────────────

function FactionsView({ onSelectFaction }) {
  const factions       = useDataStore((s) => s.factions)
  const unitsByFaction = useDataStore((s) => s.unitsByFaction)
  const units          = useDataStore((s) => s.units)

  const [search, setSearch] = useState('')

  const grouped = useMemo(
    () => groupFactions(factions, unitsByFaction),
    [factions, unitsByFaction]
  )

  // When searching: show matching units (across all factions)
  const searchResults = useMemo(() => {
    const q = search.toLowerCase().trim()
    if (q.length < 2) return []
    return units.filter((u) => u.name.toLowerCase().includes(q)).slice(0, 40)
  }, [search, units])

  const mainGroups    = Object.keys(grouped).filter((g) => !isLibrary(g)).sort()
  const libraryGroups = Object.keys(grouped).filter((g) => isLibrary(g)).sort()

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <div style={{
          fontFamily: 'Space Mono, monospace', fontSize: '8px',
          letterSpacing: '3px', textTransform: 'uppercase', opacity: 0.35,
          marginBottom: '12px',
        }}>
          Warhammer 40,000 — 10th Edition
        </div>
        <h1 style={{
          fontFamily: 'Space Mono, monospace', fontSize: 'clamp(20px, 2.5vw, 32px)',
          fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase',
          lineHeight: 1, marginBottom: '24px',
        }}>
          Factions
        </h1>
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder="Rechercher une unité ou une faction…"
        />
      </div>

      {/* Search results */}
      {search.length >= 2 ? (
        <div>
          <div style={{
            fontFamily: 'Space Mono, monospace', fontSize: '8px',
            letterSpacing: '2px', textTransform: 'uppercase', opacity: 0.35,
            marginBottom: '16px',
          }}>
            {searchResults.length} résultats
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '12px' }}>
            {searchResults.map((u) => (
              <UnitCard key={u.id} unit={u} onClick={() => onSelectFaction(u.factions?.[0] || u.faction, u)} />
            ))}
          </div>
        </div>
      ) : (
        /* Faction groups */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>
          {mainGroups.map((group) => (
            <FactionGroup
              key={group}
              group={group}
              subfactions={grouped[group]}
              onSelect={onSelectFaction}
            />
          ))}

          {/* Library / Legends — collapsed by default */}
          {libraryGroups.length > 0 && (
            <LibrarySection groups={libraryGroups} grouped={grouped} onSelect={onSelectFaction} />
          )}
        </div>
      )}
    </div>
  )
}

function FactionGroup({ group, subfactions, onSelect }) {
  return (
    <div>
      <div style={{
        fontFamily: 'Space Mono, monospace', fontSize: '9px',
        fontWeight: 700, letterSpacing: '3px', textTransform: 'uppercase',
        opacity: 0.5, marginBottom: '14px',
        display: 'flex', alignItems: 'center', gap: '16px',
      }}>
        {group}
        <div style={{ flex: 1, height: '1px', background: 'rgba(9,162,196,0.15)' }} />
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
        {subfactions.map(({ name, count }) => (
          <FactionChip key={name} name={name} count={count} onClick={() => onSelect(name)} />
        ))}
      </div>
    </div>
  )
}

function FactionChip({ name, count, onClick }) {
  const [hover, setHover] = useState(false)
  const { sub } = parseFaction(name)
  const label = sub ?? name

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        background: hover ? 'rgba(9,162,196,0.08)' : 'transparent',
        border: `1px solid ${hover ? BLUE : 'rgba(9,162,196,0.3)'}`,
        color: BLUE, cursor: 'pointer', borderRadius: 0,
        padding: '10px 18px', textAlign: 'left',
        transition: 'border-color 100ms, background 100ms',
      }}
    >
      <div style={{
        fontFamily: 'Space Mono, monospace', fontSize: '11px',
        fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase',
        marginBottom: '4px',
      }}>
        {label}
      </div>
      <div style={{
        fontFamily: 'Space Mono, monospace', fontSize: '8px',
        letterSpacing: '1.5px', opacity: 0.4,
      }}>
        {count} units
      </div>
    </button>
  )
}

function LibrarySection({ groups, grouped, onSelect }) {
  const [open, setOpen] = useState(false)
  return (
    <div>
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          background: 'none', border: 'none', color: BLUE, cursor: 'pointer', padding: 0,
          fontFamily: 'Space Mono, monospace', fontSize: '9px',
          letterSpacing: '2px', textTransform: 'uppercase', opacity: 0.4,
          display: 'flex', alignItems: 'center', gap: '8px',
        }}
      >
        {open ? '▲' : '▼'} Library & Legends
      </button>
      {open && (
        <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '32px' }}>
          {groups.map((group) => (
            <FactionGroup key={group} group={group} subfactions={grouped[group]} onSelect={onSelect} />
          ))}
        </div>
      )}
    </div>
  )
}

// ── VIEW 2: Units list ────────────────────────────────────────────────────────

function UnitsView({ faction, initialUnit, onSelectUnit, onBack }) {
  const unitsByFaction = useDataStore((s) => s.unitsByFaction)
  const [search, setSearch]   = useState('')
  const [sort, setSort]       = useState('alpha')   // 'alpha' | 'pts'
  const [showLegends, setShowLegends] = useState(false)

  const allUnits = unitsByFaction[faction] || []

  const filtered = useMemo(() => {
    let list = showLegends ? allUnits : allUnits.filter((u) => !u.is_legends)
    if (search.length >= 2) {
      const q = search.toLowerCase()
      list = list.filter((u) => u.name.toLowerCase().includes(q))
    }
    if (sort === 'alpha') list = [...list].sort((a, b) => a.name.localeCompare(b.name))
    if (sort === 'pts')   list = [...list].sort((a, b) => (b.pts ?? 0) - (a.pts ?? 0))
    return list
  }, [allUnits, search, sort, showLegends])

  const legendsCount = allUnits.filter((u) => u.is_legends).length
  const { sub } = parseFaction(faction)

  // Auto-open unit detail if passed from search
  const [selectedUnit, setSelectedUnit] = useState(initialUnit || null)

  if (selectedUnit) {
    return (
      <UnitDetailView
        unit={selectedUnit}
        onBack={() => setSelectedUnit(null)}
        factionLabel={sub ?? faction}
      />
    )
  }

  return (
    <div>
      {/* Breadcrumb */}
      <div style={{ marginBottom: '28px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <BackButton onClick={onBack} label="Factions" />
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '16px', flexWrap: 'wrap' }}>
          <h2 style={{
            fontFamily: 'Space Mono, monospace',
            fontSize: 'clamp(16px, 2vw, 26px)',
            fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', lineHeight: 1,
          }}>
            {sub ?? faction}
          </h2>
          <span style={{
            fontFamily: 'Space Mono, monospace', fontSize: '8px',
            letterSpacing: '2px', opacity: 0.35, textTransform: 'uppercase',
          }}>
            {filtered.length} / {allUnits.length} units
          </span>
        </div>

        {/* Controls */}
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
          <SearchBar value={search} onChange={setSearch} placeholder="Filtrer…" />

          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            style={{
              background: 'transparent',
              border: `1px solid rgba(9,162,196,0.3)`,
              color: BLUE, borderRadius: 0,
              fontFamily: 'Space Mono, monospace', fontSize: '9px',
              letterSpacing: '1px', textTransform: 'uppercase',
              padding: '10px 12px', cursor: 'pointer', outline: 'none',
            }}
          >
            <option value="alpha">A → Z</option>
            <option value="pts">Points ↓</option>
          </select>

          {legendsCount > 0 && (
            <label style={{
              display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer',
              fontFamily: 'Space Mono, monospace', fontSize: '8.5px',
              letterSpacing: '1.5px', textTransform: 'uppercase', opacity: 0.55,
            }}>
              <input
                type="checkbox" checked={showLegends}
                onChange={(e) => setShowLegends(e.target.checked)}
                style={{ accentColor: BLUE, cursor: 'pointer' }}
              />
              Show Legends ({legendsCount})
            </label>
          )}
        </div>
      </div>

      {/* Units grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
        gap: '12px',
      }}>
        {filtered.map((u) => (
          <UnitCard key={u.id} unit={u} onClick={() => setSelectedUnit(u)} />
        ))}
        {filtered.length === 0 && (
          <div style={{
            gridColumn: '1 / -1', padding: '40px 0',
            fontFamily: 'Space Mono, monospace', fontSize: '9px',
            letterSpacing: '2px', opacity: 0.3, textTransform: 'uppercase',
          }}>
            No units match
          </div>
        )}
      </div>
    </div>
  )
}

function UnitCard({ unit, onClick }) {
  const [hover, setHover] = useState(false)

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        border: `1px solid ${hover ? BLUE : 'rgba(9,162,196,0.2)'}`,
        padding: '14px 16px',
        cursor: 'pointer',
        background: hover ? 'rgba(9,162,196,0.04)' : 'transparent',
        transition: 'border-color 100ms, background 100ms',
        position: 'relative',
      }}
    >
      {unit.is_legends && (
        <div style={{
          position: 'absolute', top: '10px', right: '10px',
          fontFamily: 'Space Mono, monospace', fontSize: '7px',
          letterSpacing: '1px', textTransform: 'uppercase',
          opacity: 0.4, border: '1px solid rgba(9,162,196,0.3)',
          padding: '2px 5px',
        }}>
          Legends
        </div>
      )}
      <div style={{
        fontFamily: 'Space Mono, monospace', fontSize: '12px',
        fontWeight: 700, letterSpacing: '0.5px', marginBottom: '8px',
        paddingRight: unit.is_legends ? '52px' : '0',
      }}>
        {unit.name}
      </div>
      <div style={{
        fontFamily: 'Space Mono, monospace', fontSize: '8.5px',
        letterSpacing: '1px', opacity: 0.5, marginBottom: '8px',
      }}>
        T{unit.T} · SV{unit.Sv}+ · W{unit.W}
        {unit.invuln ? ` · ${unit.invuln}++` : ''}
        {unit.M ? ` · M${unit.M}` : ''}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
          {unit.kw?.slice(0, 3).map((k) => (
            <Chip key={k} dim>{k}</Chip>
          ))}
        </div>
        {unit.pts != null && (
          <span style={{
            fontFamily: 'Space Mono, monospace', fontSize: '10px',
            fontWeight: 700, opacity: 0.7, whiteSpace: 'nowrap', marginLeft: '8px',
          }}>
            {unit.pts} pts
          </span>
        )}
      </div>
    </div>
  )
}

// ── VIEW 3: Unit detail ───────────────────────────────────────────────────────

function WeaponsTable({ weapons }) {
  const weaponsById = useDataStore((s) => s.weaponsById)

  const full = weapons
    .map((ref) => weaponsById[ref.id])
    .filter(Boolean)

  const ranged = full.filter((w) => w.type === 'Ranged')
  const melee  = full.filter((w) => w.type !== 'Ranged')

  if (full.length === 0) {
    return (
      <div style={{ fontFamily: 'Space Mono, monospace', fontSize: '9px', opacity: 0.3 }}>
        No weapon data
      </div>
    )
  }

  function Table({ title, rows }) {
    if (!rows.length) return null
    return (
      <div style={{ marginBottom: '28px' }}>
        <div style={{
          fontFamily: 'Space Mono, monospace', fontSize: '8px',
          letterSpacing: '2px', textTransform: 'uppercase', opacity: 0.4,
          marginBottom: '10px',
        }}>
          {title}
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '520px' }}>
            <thead>
              <tr>
                {['Name', 'Range', 'A', 'BS/WS', 'S', 'AP', 'D', 'Keywords'].map((h) => (
                  <th key={h} style={{
                    fontFamily: 'Space Mono, monospace', fontSize: '8px',
                    letterSpacing: '1.5px', textTransform: 'uppercase',
                    opacity: 0.4, padding: '6px 10px 6px 0',
                    textAlign: 'left', fontWeight: 400,
                    borderBottom: '1px solid rgba(9,162,196,0.15)',
                    whiteSpace: 'nowrap',
                  }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((w) => (
                <tr key={w.id} style={{ borderBottom: '1px solid rgba(9,162,196,0.06)' }}>
                  <td style={{ fontFamily: 'Space Mono, monospace', fontSize: '11px', fontWeight: 700, padding: '9px 10px 9px 0', whiteSpace: 'nowrap' }}>{w.name}</td>
                  <td style={tdStyle}>{w.type === 'Melee' ? '—' : (w.range ?? '—')}</td>
                  <td style={tdStyle}>{w.A}</td>
                  <td style={tdStyle}>{w.BS}+</td>
                  <td style={tdStyle}>{w.S}</td>
                  <td style={tdStyle}>{w.AP}</td>
                  <td style={tdStyle}>{w.D}</td>
                  <td style={{ ...tdStyle, opacity: 0.45, fontSize: '8px', letterSpacing: '0.5px' }}>
                    {(w.kw || []).filter((k) => k !== '-').join(', ') || '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  return (
    <div>
      <Table title="Ranged" rows={ranged} />
      <Table title="Melee" rows={melee} />
    </div>
  )
}

const tdStyle = {
  fontFamily: 'Space Mono, monospace', fontSize: '10px',
  padding: '9px 10px 9px 0', whiteSpace: 'nowrap', opacity: 0.75,
}

function UnitDetailView({ unit, onBack, factionLabel }) {
  const navigate      = useNavigate()
  const setDefender   = useSimulatorStore((s) => s.setDefender)
  const setWeapon     = useSimulatorStore((s) => s.setWeapon)
  const setAttacker   = useSimulatorStore((s) => s.setAttacker)
  const weaponsById   = useDataStore((s) => s.weaponsById)
  const [expandAbilities, setExpandAbilities] = useState(false)

  function simulateAsDefender() {
    setDefender({
      toughness: unit.T,
      save:      unit.Sv,
      wounds:    unit.W,
      invuln:    unit.invuln,
      fnp:       null,
      keywords:  unit.kw,
    })
    navigate('/simulator')
  }

  function simulateAsAttacker() {
    // Pre-fill first available weapon
    const firstWeapon = unit.weapons?.[0] ? weaponsById[unit.weapons[0].id] : null
    if (firstWeapon) {
      setWeapon({
        name:     firstWeapon.name,
        attacks:  firstWeapon.A,
        skill:    firstWeapon.BS,
        strength: firstWeapon.S,
        ap:       firstWeapon.AP,
        damage:   firstWeapon.D,
        keywords: mapKeywords(firstWeapon.kw || []),
      })
    }
    navigate('/simulator')
  }

  const pts = unit.pts
  const minM = unit.min_models
  const maxM = unit.max_models

  return (
    <div>
      {/* Breadcrumb */}
      <div style={{ marginBottom: '28px' }}>
        <BackButton onClick={onBack} label={factionLabel} />
      </div>

      {/* Title + meta */}
      <div style={{
        borderBottom: '1px solid rgba(9,162,196,0.15)',
        paddingBottom: '24px', marginBottom: '28px',
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
          <div>
            {unit.is_legends && (
              <div style={{
                fontFamily: 'Space Mono, monospace', fontSize: '8px',
                letterSpacing: '2px', textTransform: 'uppercase',
                opacity: 0.4, marginBottom: '8px',
                border: '1px solid rgba(9,162,196,0.3)', display: 'inline-block', padding: '3px 8px',
              }}>
                Legends
              </div>
            )}
            <h2 style={{
              fontFamily: 'Space Mono, monospace', fontSize: 'clamp(18px, 2.5vw, 30px)',
              fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase',
              lineHeight: 1.1,
            }}>
              {unit.name}
            </h2>
          </div>
          {pts != null && (
            <div style={{ textAlign: 'right' }}>
              <div style={{
                fontFamily: 'Space Mono, monospace', fontSize: '24px',
                fontWeight: 700, lineHeight: 1,
              }}>
                {pts}
              </div>
              <div style={{
                fontFamily: 'Space Mono, monospace', fontSize: '8px',
                letterSpacing: '2px', textTransform: 'uppercase', opacity: 0.4,
              }}>
                points
              </div>
              {(minM != null || maxM != null) && (
                <div style={{
                  fontFamily: 'Space Mono, monospace', fontSize: '8.5px',
                  opacity: 0.45, marginTop: '4px',
                }}>
                  {minM != null && maxM != null
                    ? `${minM}–${maxM} models`
                    : maxM != null ? `max ${maxM} models` : `min ${minM} models`}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Stats block */}
      <div style={{ marginBottom: '32px' }}>
        <div style={{
          fontFamily: 'Space Mono, monospace', fontSize: '8px',
          letterSpacing: '2px', textTransform: 'uppercase', opacity: 0.35,
          marginBottom: '12px',
        }}>
          Profil
        </div>
        <div style={{ display: 'flex', gap: '0', flexWrap: 'wrap' }}>
          {[
            ['M',  unit.M || '—'],
            ['T',  unit.T],
            ['SV', `${unit.Sv}+`],
            ['W',  unit.W],
            ['LD', unit.LD || '—'],
            ['OC', unit.OC || '—'],
            ...(unit.invuln ? [['INV', `${unit.invuln}++`]] : []),
          ].map(([label, val]) => (
            <div key={label} style={{
              border: '1px solid rgba(9,162,196,0.2)',
              padding: '12px 20px',
              marginRight: '-1px', marginBottom: '-1px',
              textAlign: 'center', minWidth: '60px',
            }}>
              <div style={{
                fontFamily: 'Space Mono, monospace', fontSize: '7.5px',
                letterSpacing: '1.5px', textTransform: 'uppercase',
                opacity: 0.4, marginBottom: '6px',
              }}>
                {label}
              </div>
              <div style={{
                fontFamily: 'Space Mono, monospace', fontSize: '16px',
                fontWeight: 700,
              }}>
                {val}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Keywords */}
      {unit.kw?.length > 0 && (
        <div style={{ marginBottom: '32px' }}>
          <div style={{
            fontFamily: 'Space Mono, monospace', fontSize: '8px',
            letterSpacing: '2px', textTransform: 'uppercase', opacity: 0.35,
            marginBottom: '10px',
          }}>
            Keywords
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {unit.kw.map((k) => <Chip key={k}>{k}</Chip>)}
          </div>
        </div>
      )}

      {/* Weapons */}
      {unit.weapons?.length > 0 && (
        <div style={{ marginBottom: '32px' }}>
          <div style={{
            fontFamily: 'Space Mono, monospace', fontSize: '8px',
            letterSpacing: '2px', textTransform: 'uppercase', opacity: 0.35,
            marginBottom: '14px',
          }}>
            Armement — {unit.weapons.length} armes
          </div>
          <WeaponsTable weapons={unit.weapons} />
        </div>
      )}

      {/* Abilities */}
      {unit.abilities?.length > 0 && (
        <div style={{ marginBottom: '36px' }}>
          <button
            onClick={() => setExpandAbilities((v) => !v)}
            style={{
              background: 'none', border: 'none', color: BLUE, cursor: 'pointer', padding: 0,
              fontFamily: 'Space Mono, monospace', fontSize: '8px',
              letterSpacing: '2px', textTransform: 'uppercase',
              display: 'flex', alignItems: 'center', gap: '8px', opacity: 0.6,
              marginBottom: expandAbilities ? '16px' : '0',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.opacity = '1' }}
            onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.6' }}
          >
            {expandAbilities ? '▲' : '▼'} Abilities ({unit.abilities.length})
          </button>

          {expandAbilities && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {unit.abilities.map((ab, i) => (
                <div key={i} style={{
                  borderLeft: '2px solid rgba(9,162,196,0.25)',
                  paddingLeft: '14px',
                }}>
                  <div style={{
                    fontFamily: 'Space Mono, monospace', fontSize: '10px',
                    fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase',
                    marginBottom: '6px',
                  }}>
                    {ab.name}
                  </div>
                  {ab.desc && (
                    <p style={{
                      fontFamily: 'Georgia, serif', fontSize: '13px',
                      lineHeight: 1.65, opacity: 0.7,
                    }}>
                      {ab.desc}{ab.desc.length >= 400 ? '…' : ''}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Action buttons */}
      <div style={{
        display: 'flex', gap: '12px', flexWrap: 'wrap',
        paddingTop: '24px', borderTop: '1px solid rgba(9,162,196,0.1)',
      }}>
        <ActionButton onClick={simulateAsAttacker} primary>
          → Simuler en tant qu'attaquant
        </ActionButton>
        <ActionButton onClick={simulateAsDefender}>
          → Simuler en tant que défenseur
        </ActionButton>
      </div>
    </div>
  )
}

function ActionButton({ children, onClick, primary }) {
  const [hover, setHover] = useState(false)
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        background: primary
          ? (hover ? 'rgba(9,162,196,0.85)' : BLUE)
          : (hover ? 'rgba(9,162,196,0.08)' : 'transparent'),
        border: `1px solid ${BLUE}`,
        color: primary ? BG : BLUE,
        fontFamily: 'Space Mono, monospace', fontSize: '9px',
        fontWeight: primary ? 700 : 400,
        letterSpacing: '2px', textTransform: 'uppercase',
        padding: '12px 24px', cursor: 'pointer', borderRadius: 0,
        transition: 'background 100ms',
      }}
    >
      {children}
    </button>
  )
}

// ── Page root ─────────────────────────────────────────────────────────────────

export function FactionsPage() {
  const loaded = useDataStore((s) => s.loaded)

  // 3 states: 'factions' | 'units' | (unit handled inside UnitsView)
  const [view, setView]             = useState('factions')
  const [activeFaction, setActiveFaction] = useState(null)
  const [jumpToUnit, setJumpToUnit] = useState(null)

  function handleSelectFaction(factionName, unit = null) {
    setActiveFaction(factionName)
    setJumpToUnit(unit || null)
    setView('units')
  }

  function handleBackToFactions() {
    setView('factions')
    setActiveFaction(null)
    setJumpToUnit(null)
  }

  if (!loaded) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        height: 'calc(100vh - 52px)',
        fontFamily: 'Space Mono, monospace', fontSize: '9px',
        letterSpacing: '3px', textTransform: 'uppercase', opacity: 0.35, color: BLUE,
      }}>
        Loading…
      </div>
    )
  }

  return (
    <div style={{ color: BLUE, minHeight: '100vh', paddingTop: '52px' }}>
      <div style={{ padding: '40px 56px 80px', maxWidth: '1400px', margin: '0 auto' }}>
        {view === 'factions' ? (
          <FactionsView onSelectFaction={handleSelectFaction} />
        ) : (
          <UnitsView
            faction={activeFaction}
            initialUnit={jumpToUnit}
            onSelectUnit={() => {}}
            onBack={handleBackToFactions}
          />
        )}
      </div>
    </div>
  )
}

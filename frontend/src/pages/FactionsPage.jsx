import { useState, useMemo } from 'react'
import { useDataStore }  from '../store/dataStore'
import { useArmyStore }  from '../store/armyStore'
import { useAuthStore }  from '../store/authStore'
import { ACCENT, BG, SURFACE, BORDER, TEXT, TEXT_SEC, TEXT_WEAK } from '../theme'

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
  const [focused, setFocused] = useState(false)
  return (
    <div style={{ position: 'relative', maxWidth: '480px' }}>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{
          width: '100%', boxSizing: 'border-box',
          background: 'rgba(47,224,255,0.04)',
          border: `1px solid ${focused || value ? ACCENT : BORDER}`,
          borderRadius: 0, color: TEXT,
          fontFamily: 'Space Mono, monospace', fontSize: '13px',
          padding: '11px 36px 11px 14px',
          outline: 'none', transition: 'border-color 100ms',
        }}
      />
      {value ? (
        <button onClick={() => onChange('')} style={{
          position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)',
          background: 'none', border: 'none', cursor: 'pointer', color: TEXT_WEAK,
        }}>
          <svg width="12" height="12" viewBox="0 0 12 12">
            <line x1="2" y1="2" x2="10" y2="10" stroke={TEXT_WEAK} strokeWidth="1.5"/>
            <line x1="10" y1="2" x2="2" y2="10" stroke={TEXT_WEAK} strokeWidth="1.5"/>
          </svg>
        </button>
      ) : (
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none"
          style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', opacity: 0.4, pointerEvents: 'none' }}>
          <circle cx="5.5" cy="5.5" r="4" stroke={ACCENT} strokeWidth="1.2"/>
          <line x1="8.5" y1="8.5" x2="12.5" y2="12.5" stroke={ACCENT} strokeWidth="1.2"/>
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
        background: 'none', border: 'none', color: ACCENT, cursor: 'pointer', padding: 0,
        fontFamily: 'Space Mono, monospace', fontSize: '10px',
        letterSpacing: '2px', textTransform: 'uppercase',
        display: 'flex', alignItems: 'center', gap: '6px',
        transition: 'opacity 100ms', opacity: 0.7,
      }}
      onMouseEnter={(e) => { e.currentTarget.style.opacity = '1' }}
      onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.7' }}
    >
      ← {label}
    </button>
  )
}

function Chip({ children, dim }) {
  return (
    <span style={{
      display: 'inline-block',
      border: `1px solid ${BORDER}`,
      padding: '3px 9px',
      fontFamily: 'Space Mono, monospace', fontSize: '9px',
      letterSpacing: '1px', textTransform: 'uppercase',
      color: dim ? TEXT_WEAK : TEXT_SEC,
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

  const grouped = useMemo(() => groupFactions(factions, unitsByFaction), [factions, unitsByFaction])

  const searchResults = useMemo(() => {
    const q = search.toLowerCase().trim()
    if (q.length < 2) return []
    return units.filter((u) => u.name.toLowerCase().includes(q)).slice(0, 40)
  }, [search, units])

  const mainGroups    = Object.keys(grouped).filter((g) => !isLibrary(g)).sort()
  const libraryGroups = Object.keys(grouped).filter((g) => isLibrary(g)).sort()

  return (
    <div>
      <div style={{ marginBottom: '36px' }}>
        <div style={{
          fontFamily: 'Space Mono, monospace', fontSize: '10px',
          letterSpacing: '3px', textTransform: 'uppercase',
          color: TEXT_WEAK, marginBottom: '14px',
        }}>
          Warhammer 40,000 — 10th Edition
        </div>
        <h1 style={{
          fontFamily: 'Space Mono, monospace', fontSize: 'clamp(22px, 2.5vw, 34px)',
          fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase',
          lineHeight: 1, color: TEXT, marginBottom: '28px',
        }}>
          Factions
        </h1>
        <SearchBar value={search} onChange={setSearch} placeholder="Search a unit or faction…" />
      </div>

      {search.length >= 2 ? (
        <div>
          <div style={{
            fontFamily: 'Space Mono, monospace', fontSize: '10px',
            letterSpacing: '2px', textTransform: 'uppercase',
            color: TEXT_WEAK, marginBottom: '20px',
          }}>
            {searchResults.length} results
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '12px' }}>
            {searchResults.map((u) => (
              <UnitCard key={u.id} unit={u} onClick={() => onSelectFaction(u.factions?.[0] || u.faction, u)} />
            ))}
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>
          {mainGroups.map((group) => (
            <FactionGroup key={group} group={group} subfactions={grouped[group]} onSelect={onSelectFaction} />
          ))}
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
        fontFamily: 'Space Mono, monospace', fontSize: '10px',
        fontWeight: 700, letterSpacing: '3px', textTransform: 'uppercase',
        color: TEXT_WEAK, marginBottom: '16px',
        display: 'flex', alignItems: 'center', gap: '16px',
      }}>
        {group}
        <div style={{ flex: 1, height: '1px', background: BORDER }} />
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
        background: hover ? 'rgba(47,224,255,0.08)' : 'rgba(47,224,255,0.03)',
        border: `1px solid ${hover ? ACCENT : BORDER}`,
        cursor: 'pointer', borderRadius: 0,
        padding: '11px 20px', textAlign: 'left',
        transition: 'border-color 100ms, background 100ms',
      }}
    >
      <div style={{
        fontFamily: 'Space Mono, monospace', fontSize: '12px',
        fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase',
        color: hover ? TEXT : TEXT_SEC, marginBottom: '4px',
        transition: 'color 100ms',
      }}>
        {label}
      </div>
      <div style={{
        fontFamily: 'Space Mono, monospace', fontSize: '9px',
        letterSpacing: '1.5px', color: TEXT_WEAK,
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
          background: 'none', border: 'none', cursor: 'pointer', padding: 0,
          fontFamily: 'Space Mono, monospace', fontSize: '10px',
          letterSpacing: '2px', textTransform: 'uppercase', color: TEXT_WEAK,
          display: 'flex', alignItems: 'center', gap: '8px',
        }}
      >
        {open ? '▲' : '▼'} Library & Legends
      </button>
      {open && (
        <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '32px' }}>
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
  const [search, setSearch]           = useState('')
  const [sort, setSort]               = useState('alpha')
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
  const [selectedUnit, setSelectedUnit] = useState(initialUnit || null)

  if (selectedUnit) {
    return <UnitDetailView unit={selectedUnit} onBack={() => setSelectedUnit(null)} factionLabel={sub ?? faction} />
  }

  return (
    <div>
      <div style={{ marginBottom: '28px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <BackButton onClick={onBack} label="Factions" />
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '16px', flexWrap: 'wrap' }}>
          <h2 style={{
            fontFamily: 'Space Mono, monospace',
            fontSize: 'clamp(18px, 2vw, 28px)',
            fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase',
            lineHeight: 1, color: TEXT,
          }}>
            {sub ?? faction}
          </h2>
          <span style={{
            fontFamily: 'Space Mono, monospace', fontSize: '10px',
            letterSpacing: '2px', color: TEXT_WEAK, textTransform: 'uppercase',
          }}>
            {filtered.length} / {allUnits.length} units
          </span>
        </div>

        <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
          <SearchBar value={search} onChange={setSearch} placeholder="Filter…" />

          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            style={{
              background: 'rgba(47,224,255,0.04)',
              border: `1px solid ${BORDER}`,
              color: TEXT_SEC, borderRadius: 0,
              fontFamily: 'Space Mono, monospace', fontSize: '10px',
              letterSpacing: '1px', textTransform: 'uppercase',
              padding: '11px 12px', cursor: 'pointer', outline: 'none',
            }}
          >
            <option value="alpha">A → Z</option>
            <option value="pts">Points ↓</option>
          </select>

          {legendsCount > 0 && (
            <label style={{
              display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer',
              fontFamily: 'Space Mono, monospace', fontSize: '10px',
              letterSpacing: '1.5px', textTransform: 'uppercase', color: TEXT_WEAK,
            }}>
              <input
                type="checkbox" checked={showLegends}
                onChange={(e) => setShowLegends(e.target.checked)}
                style={{ accentColor: ACCENT, cursor: 'pointer' }}
              />
              Show Legends ({legendsCount})
            </label>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '12px' }}>
        {filtered.map((u) => (
          <UnitCard key={u.id} unit={u} onClick={() => setSelectedUnit(u)} />
        ))}
        {filtered.length === 0 && (
          <div style={{
            gridColumn: '1 / -1', padding: '40px 0',
            fontFamily: 'Space Mono, monospace', fontSize: '10px',
            letterSpacing: '2px', color: TEXT_WEAK, textTransform: 'uppercase',
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
        border: `1px solid ${hover ? ACCENT : BORDER}`,
        cursor: 'pointer',
        transition: 'border-color 150ms, transform 150ms',
        transform: hover ? 'translateY(-2px)' : 'none',
      }}
    >
      <div style={{
        padding: '14px 16px',
        background: hover ? 'rgba(47,224,255,0.04)' : 'transparent',
        transition: 'background 100ms',
      }}>
        {unit.is_legends && (
          <div style={{
            display: 'inline-block', marginBottom: '6px',
            fontFamily: 'Space Mono, monospace', fontSize: '8px',
            letterSpacing: '1px', textTransform: 'uppercase',
            color: TEXT_WEAK, border: `1px solid ${BORDER}`,
            padding: '2px 6px',
          }}>
            Legends
          </div>
        )}

        <div style={{
          fontFamily: 'Space Mono, monospace', fontSize: '13px',
          fontWeight: 700, letterSpacing: '0.5px', marginBottom: '7px',
          color: TEXT,
        }}>
          {unit.name}
        </div>

        <div style={{
          fontFamily: 'Space Mono, monospace', fontSize: '9px',
          letterSpacing: '1px', color: TEXT_WEAK, marginBottom: '9px',
        }}>
          T{unit.T} · SV{unit.Sv}+ · W{unit.W}
          {unit.invuln ? ` · ${unit.invuln}++` : ''}
          {unit.M ? ` · M${unit.M}` : ''}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
            {unit.kw?.slice(0, 3).map((k) => <Chip key={k} dim>{k}</Chip>)}
          </div>
          {unit.pts != null && (
            <span style={{
              fontFamily: 'Space Mono, monospace', fontSize: '11px',
              fontWeight: 700, color: TEXT_SEC, whiteSpace: 'nowrap', marginLeft: '8px',
            }}>
              {unit.pts} pts
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

// ── VIEW 3: Unit detail ───────────────────────────────────────────────────────

function WeaponsTable({ weapons }) {
  const weaponsById = useDataStore((s) => s.weaponsById)
  const full   = weapons.map((ref) => weaponsById[ref.id]).filter(Boolean)
  const ranged = full.filter((w) => w.type === 'Ranged')
  const melee  = full.filter((w) => w.type !== 'Ranged')

  if (full.length === 0) {
    return <div style={{ fontFamily: 'Space Mono, monospace', fontSize: '10px', color: TEXT_WEAK }}>No weapon data</div>
  }

  function Table({ title, rows }) {
    if (!rows.length) return null
    return (
      <div style={{ marginBottom: '28px' }}>
        <div style={{
          fontFamily: 'Space Mono, monospace', fontSize: '10px',
          letterSpacing: '2px', textTransform: 'uppercase',
          color: TEXT_WEAK, marginBottom: '12px',
        }}>
          {title}
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '520px' }}>
            <thead>
              <tr>
                {['Name', 'Range', 'A', 'BS/WS', 'S', 'AP', 'D', 'Keywords'].map((h) => (
                  <th key={h} style={{
                    fontFamily: 'Space Mono, monospace', fontSize: '9px',
                    letterSpacing: '1.5px', textTransform: 'uppercase',
                    color: TEXT_WEAK, padding: '6px 12px 6px 0',
                    textAlign: 'left', fontWeight: 400,
                    borderBottom: `1px solid ${BORDER}`,
                    whiteSpace: 'nowrap',
                  }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((w) => (
                <tr key={w.id} style={{ borderBottom: `1px solid rgba(30,58,76,0.5)` }}>
                  <td style={{ fontFamily: 'Space Mono, monospace', fontSize: '12px', fontWeight: 700, color: TEXT, padding: '10px 12px 10px 0', whiteSpace: 'nowrap' }}>{w.name}</td>
                  <td style={tdStyle}>{w.type === 'Melee' ? '—' : (w.range ?? '—')}</td>
                  <td style={tdStyle}>{w.A}</td>
                  <td style={tdStyle}>{w.BS}+</td>
                  <td style={tdStyle}>{w.S}</td>
                  <td style={tdStyle}>{w.AP}</td>
                  <td style={tdStyle}>{w.D}</td>
                  <td style={{ ...tdStyle, color: TEXT_WEAK, fontSize: '9px' }}>
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
  fontFamily: 'Space Mono, monospace', fontSize: '11px', color: TEXT_SEC,
  padding: '10px 12px 10px 0', whiteSpace: 'nowrap',
}

function UnitDetailView({ unit, onBack, factionLabel }) {
  const armies  = useArmyStore((s) => s.armies)
  const activeId = useArmyStore((s) => s.activeId)
  const addUnit  = useArmyStore((s) => s.addUnit)
  const user     = useAuthStore((s) => s.user)

  const [expandAbilities, setExpandAbilities] = useState(false)
  const [targetArmyId, setTargetArmyId]       = useState(() => activeId ?? armies[0]?.id ?? '')
  const [added, setAdded]                     = useState(false)

  async function handleAddToArmy() {
    if (!targetArmyId) return
    const store = useArmyStore.getState()
    const prevActive = store.activeId
    if (prevActive !== targetArmyId) store.setActive(targetArmyId)

    await addUnit({
      unit_id:    unit.id,
      name:       unit.name,
      T:          unit.T,
      Sv:         unit.Sv,
      W:          unit.W,
      invuln:     unit.invuln ?? null,
      kw:         unit.kw ?? [],
      weapons:    unit.weapons ?? [],
      min_models: unit.min_models ?? null,
      max_models: unit.max_models ?? null,
    }, user)

    if (prevActive !== targetArmyId) store.setActive(prevActive)
    setAdded(true)
    setTimeout(() => setAdded(false), 2000)
  }

  const pts = unit.pts, minM = unit.min_models, maxM = unit.max_models

  return (
    <div>
      <div style={{ marginBottom: '28px' }}>
        <BackButton onClick={onBack} label={factionLabel} />
      </div>

      {/* Title + pts */}
      <div style={{ borderBottom: `1px solid ${BORDER}`, paddingBottom: '24px', marginBottom: '32px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
          <div>
            {unit.is_legends && (
              <div style={{
                fontFamily: 'Space Mono, monospace', fontSize: '9px',
                letterSpacing: '2px', textTransform: 'uppercase',
                color: TEXT_WEAK, marginBottom: '10px',
                border: `1px solid ${BORDER}`, display: 'inline-block', padding: '3px 8px',
              }}>
                Legends
              </div>
            )}
            <h2 style={{
              fontFamily: 'Space Mono, monospace', fontSize: 'clamp(20px, 2.5vw, 32px)',
              fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase',
              lineHeight: 1.1, color: TEXT,
            }}>
              {unit.name}
            </h2>
          </div>
          {pts != null && (
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontFamily: 'Space Mono, monospace', fontSize: '28px', fontWeight: 700, lineHeight: 1, color: TEXT }}>
                {pts}
              </div>
              <div style={{ fontFamily: 'Space Mono, monospace', fontSize: '9px', letterSpacing: '2px', textTransform: 'uppercase', color: TEXT_WEAK, marginTop: '4px' }}>
                points
              </div>
              {(minM != null || maxM != null) && (
                <div style={{ fontFamily: 'Space Mono, monospace', fontSize: '9px', color: TEXT_WEAK, marginTop: '4px' }}>
                  {minM != null && maxM != null ? `${minM}–${maxM} models` : maxM != null ? `max ${maxM} models` : `min ${minM} models`}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Stats block */}
      <div style={{ marginBottom: '32px' }}>
        <div style={{ fontFamily: 'Space Mono, monospace', fontSize: '10px', letterSpacing: '2px', textTransform: 'uppercase', color: TEXT_WEAK, marginBottom: '14px' }}>
          Profile
        </div>
        <div style={{ display: 'flex', gap: '0', flexWrap: 'wrap' }}>
          {[
            ['M', unit.M || '—'], ['T', unit.T], ['SV', `${unit.Sv}+`],
            ['W', unit.W], ['LD', unit.LD || '—'], ['OC', unit.OC || '—'],
            ...(unit.invuln ? [['INV', `${unit.invuln}++`]] : []),
          ].map(([label, val]) => (
            <div key={label} style={{
              border: `1px solid ${BORDER}`, padding: '14px 22px',
              marginRight: '-1px', marginBottom: '-1px', textAlign: 'center', minWidth: '64px',
            }}>
              <div style={{ fontFamily: 'Space Mono, monospace', fontSize: '8px', letterSpacing: '1.5px', textTransform: 'uppercase', color: TEXT_WEAK, marginBottom: '8px' }}>
                {label}
              </div>
              <div style={{ fontFamily: 'Space Mono, monospace', fontSize: '18px', fontWeight: 700, color: TEXT }}>
                {val}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Keywords */}
      {unit.kw?.length > 0 && (
        <div style={{ marginBottom: '32px' }}>
          <div style={{ fontFamily: 'Space Mono, monospace', fontSize: '10px', letterSpacing: '2px', textTransform: 'uppercase', color: TEXT_WEAK, marginBottom: '12px' }}>
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
          <div style={{ fontFamily: 'Space Mono, monospace', fontSize: '10px', letterSpacing: '2px', textTransform: 'uppercase', color: TEXT_WEAK, marginBottom: '16px' }}>
            Weapons — {unit.weapons.length} weapon{unit.weapons.length !== 1 ? 's' : ''}
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
              background: 'none', border: 'none', cursor: 'pointer', padding: 0,
              fontFamily: 'Space Mono, monospace', fontSize: '10px',
              letterSpacing: '2px', textTransform: 'uppercase',
              color: ACCENT, display: 'flex', alignItems: 'center', gap: '8px',
              marginBottom: expandAbilities ? '18px' : '0',
              transition: 'opacity 100ms', opacity: 0.75,
            }}
            onMouseEnter={(e) => { e.currentTarget.style.opacity = '1' }}
            onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.75' }}
          >
            {expandAbilities ? '▲' : '▼'} Abilities ({unit.abilities.length})
          </button>

          {expandAbilities && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              {unit.abilities.map((ab, i) => (
                <div key={i} style={{ borderLeft: `2px solid ${BORDER}`, paddingLeft: '16px' }}>
                  <div style={{
                    fontFamily: 'Space Mono, monospace', fontSize: '11px',
                    fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase',
                    color: TEXT, marginBottom: '7px',
                  }}>
                    {ab.name}
                  </div>
                  {ab.desc && (
                    <p style={{ fontFamily: 'Georgia, serif', fontSize: '14px', lineHeight: 1.7, color: TEXT_SEC, margin: 0 }}>
                      {ab.desc}{ab.desc.length >= 400 ? '…' : ''}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div style={{ paddingTop: '24px', borderTop: `1px solid ${BORDER}` }}>
        {armies.length === 0 ? (
          <div style={{ fontFamily: 'Space Mono, monospace', fontSize: '10px', color: TEXT_WEAK, lineHeight: 1.7 }}>
            No armies yet.{' '}
            <a href="/armies" style={{ color: ACCENT, textDecoration: 'none' }}>Create one →</a>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
            {armies.length > 1 && (
              <select
                value={targetArmyId}
                onChange={(e) => setTargetArmyId(e.target.value)}
                style={{
                  background: SURFACE, border: `1px solid ${BORDER}`,
                  color: TEXT, fontFamily: 'Space Mono, monospace', fontSize: '10px',
                  padding: '10px 12px', outline: 'none', cursor: 'pointer',
                }}
              >
                {armies.map((a) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            )}
            <button
              onClick={handleAddToArmy}
              disabled={added}
              style={{
                background: added ? 'rgba(47,224,255,0.12)' : ACCENT,
                border: `1px solid ${ACCENT}`,
                color: added ? ACCENT : BG,
                fontFamily: 'Space Mono, monospace', fontSize: '10px',
                fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase',
                padding: '12px 24px', cursor: added ? 'default' : 'pointer',
                transition: 'background 150ms, color 150ms',
              }}
            >
              {added
                ? `✓ Added to ${armies.find((a) => a.id === targetArmyId)?.name ?? 'army'}`
                : `+ Add to ${armies.length === 1 ? armies[0].name : 'army'}`
              }
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Page root ─────────────────────────────────────────────────────────────────

export function FactionsPage() {
  const loaded = useDataStore((s) => s.loaded)
  const [view, setView]                   = useState('factions')
  const [activeFaction, setActiveFaction] = useState(null)
  const [jumpToUnit, setJumpToUnit]       = useState(null)

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
        fontFamily: 'Space Mono, monospace', fontSize: '10px',
        letterSpacing: '3px', textTransform: 'uppercase', color: TEXT_WEAK,
      }}>
        Loading…
      </div>
    )
  }

  return (
    <div style={{ color: TEXT_SEC, minHeight: '100vh', paddingTop: '52px' }}>
      <div style={{ padding: '40px 56px 80px', maxWidth: '1400px', margin: '0 auto' }}>
        {view === 'factions' ? (
          <FactionsView onSelectFaction={handleSelectFaction} />
        ) : (
          <UnitsView faction={activeFaction} initialUnit={jumpToUnit} onSelectUnit={() => {}} onBack={handleBackToFactions} />
        )}
      </div>
    </div>
  )
}

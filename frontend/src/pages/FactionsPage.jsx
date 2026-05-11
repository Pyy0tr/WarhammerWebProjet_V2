import { useState, useMemo, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { useDataStore }  from '../store/dataStore'
import { useArmyStore }  from '../store/armyStore'
import { useAuthStore }  from '../store/authStore'
import { ACCENT, BG, SURFACE, BORDER, TEXT, TEXT_SEC, TEXT_WEAK, TEXT_OFF } from '../theme'
import { AbilityText } from '../components/AbilityText'

// ── Helpers ───────────────────────────────────────────────────────────────────

function parseFaction(name) {
  const idx = name.indexOf(' - ')
  if (idx === -1) return { group: name, sub: null }
  return { group: name.slice(0, idx), sub: name.slice(idx + 3) }
}

const ALLIANCE_ORDER = ['Imperium', 'Chaos', 'Xenos']

const ALLIANCE_META = {
  Imperium: { color: '#C9A227' },
  Chaos:    { color: '#CC3344' },
  Xenos:    { color: '#2FE0FF' },
}


function isLibraryFaction(name) {
  return name.includes('Library') || name.includes('Legends')
}

function getGrandAlliance(name) {
  if (name.startsWith('Imperium')) return 'Imperium'
  if (name.startsWith('Chaos'))    return 'Chaos'
  return 'Xenos'
}

// Returns { alliances: { Imperium: {group: [...]}, Chaos: {...}, Xenos: {...} }, library: [{name, count, label}] }
function organizeByAlliance(factions, unitsByFaction) {
  const alliances = { Imperium: {}, Chaos: {}, Xenos: {} }
  const library = []

  for (const f of factions) {
    const count = (unitsByFaction[f] || []).length
    if (count === 0) continue

    if (isLibraryFaction(f)) {
      const { sub } = parseFaction(f)
      library.push({ name: f, count, label: sub ?? f })
      continue
    }

    const alliance = getGrandAlliance(f)
    const { group, sub } = parseFaction(f)

    if (!alliances[alliance][group]) alliances[alliance][group] = []
    alliances[alliance][group].push({ name: f, count, label: sub ?? f })
  }

  return { alliances, library }
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

function AlliancePills({ active, onChange }) {
  const pills = [
    { key: null,       label: 'All',      color: ACCENT },
    { key: 'Imperium', label: 'Imperium', color: ALLIANCE_META.Imperium.color },
    { key: 'Chaos',    label: 'Chaos',    color: ALLIANCE_META.Chaos.color },
    { key: 'Xenos',    label: 'Xenos',    color: ALLIANCE_META.Xenos.color },
  ]
  return (
    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
      {pills.map(({ key, label, color }) => {
        const isActive = active === key
        return (
          <button
            key={key ?? 'all'}
            onClick={() => onChange(isActive && key !== null ? null : key)}
            style={{
              background: isActive ? color : 'transparent',
              border: `1px solid ${isActive ? color : BORDER}`,
              color: isActive ? BG : TEXT_WEAK,
              fontFamily: 'Space Mono, monospace', fontSize: '9px',
              letterSpacing: '2px', textTransform: 'uppercase',
              padding: '6px 14px', cursor: 'pointer', borderRadius: 0,
              transition: 'all 100ms',
            }}
            onMouseEnter={(e) => { if (!isActive) { e.currentTarget.style.borderColor = color; e.currentTarget.style.color = color } }}
            onMouseLeave={(e) => { if (!isActive) { e.currentTarget.style.borderColor = BORDER; e.currentTarget.style.color = TEXT_WEAK } }}
          >
            {label}
          </button>
        )
      })}
    </div>
  )
}

// ── VIEW 1: Factions grid ─────────────────────────────────────────────────────

function FactionsView({ onSelectFaction }) {
  const factions       = useDataStore((s) => s.factions)
  const unitsByFaction = useDataStore((s) => s.unitsByFaction)
  const units          = useDataStore((s) => s.units)
  const [search, setSearch]               = useState('')
  const [activeAlliance, setActiveAlliance] = useState(null)
  const [dense, setDense]                   = useState(false)

  const { alliances, library } = useMemo(
    () => organizeByAlliance(factions, unitsByFaction),
    [factions, unitsByFaction]
  )

  const searchResults = useMemo(() => {
    const q = search.toLowerCase().trim()
    if (q.length < 2) return []
    return units.filter((u) => u.name.toLowerCase().includes(q)).slice(0, 48)
  }, [search, units])

  const visibleAlliances = activeAlliance
    ? ALLIANCE_ORDER.filter((a) => a === activeAlliance)
    : ALLIANCE_ORDER

  const isSearching = search.length >= 2

  return (
    <div>
      {/* ── Page header ── */}
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

        {/* Search + pills row */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <SearchBar
            value={search}
            onChange={(v) => { setSearch(v); if (v) setActiveAlliance(null) }}
            placeholder="Search units by name…"
          />
          {!isSearching && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              <AlliancePills active={activeAlliance} onChange={setActiveAlliance}/>
              <button
                onClick={() => setDense((v) => !v)}
                title={dense ? 'Expanded view' : 'Compact view'}
                style={{
                  background: dense ? 'rgba(47,224,255,0.08)' : 'transparent',
                  border: `1px solid ${dense ? ACCENT : BORDER}`,
                  color: dense ? ACCENT : TEXT_WEAK,
                  fontFamily: 'Space Mono, monospace', fontSize: '9px',
                  letterSpacing: '2px', textTransform: 'uppercase',
                  padding: '6px 12px', cursor: 'pointer', borderRadius: 0,
                  transition: 'all 100ms',
                  display: 'flex', alignItems: 'center', gap: '6px',
                }}
                onMouseEnter={(e) => { if (!dense) { e.currentTarget.style.borderColor = ACCENT; e.currentTarget.style.color = ACCENT } }}
                onMouseLeave={(e) => { if (!dense) { e.currentTarget.style.borderColor = BORDER; e.currentTarget.style.color = TEXT_WEAK } }}
              >
                <svg width="12" height="10" viewBox="0 0 12 10" fill="none">
                  <rect x="0" y="0" width="4" height="4" stroke="currentColor" strokeWidth="1"/>
                  <rect x="5" y="0" width="4" height="4" stroke="currentColor" strokeWidth="1"/>
                  <rect x="0" y="5" width="4" height="4" stroke="currentColor" strokeWidth="1"/>
                  <rect x="5" y="5" width="4" height="4" stroke="currentColor" strokeWidth="1"/>
                </svg>
                {dense ? 'Compact' : 'Full'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Search results ── */}
      {isSearching ? (
        <div>
          <div style={{
            fontFamily: 'Space Mono, monospace', fontSize: '10px',
            letterSpacing: '2px', textTransform: 'uppercase',
            color: TEXT_WEAK, marginBottom: '20px',
            display: 'flex', alignItems: 'baseline', gap: '16px',
          }}>
            <span>
              {searchResults.length > 0
                ? `${searchResults.length} unit${searchResults.length !== 1 ? 's' : ''} found`
                : 'No units found'}
            </span>
            {searchResults.length > 0 && (
              <span style={{ opacity: 0.5, fontSize: '9px' }}>
                · click a card to browse its faction
              </span>
            )}
          </div>
          {searchResults.length > 0 ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '12px' }}>
              {searchResults.map((u) => (
                <UnitCard
                  key={u.id} unit={u} showFaction
                  onClick={() => onSelectFaction(u.factions?.[0] || u.faction, u)}
                />
              ))}
            </div>
          ) : (
            <div style={{
              padding: '48px 0',
              fontFamily: 'Space Mono, monospace', fontSize: '10px',
              letterSpacing: '2px', color: TEXT_WEAK, textTransform: 'uppercase',
            }}>
              Try a unit name like "Intercessors", "Wraithknight" or "Necron Warriors"
            </div>
          )}
        </div>
      ) : (
        /* ── Faction grid ── */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '48px' }}>
          {visibleAlliances.map((alliance) => (
            <AllianceSection
              key={alliance}
              alliance={alliance}
              groups={alliances[alliance]}
              onSelect={onSelectFaction}
              dense={dense}
            />
          ))}
          {!activeAlliance && library.length > 0 && (
            <LibrarySection items={library} onSelect={onSelectFaction} dense={dense} />
          )}
        </div>
      )}
    </div>
  )
}

function AllianceHeader({ alliance, factionCount, unitCount, collapsed, onToggle }) {
  const { color } = ALLIANCE_META[alliance]
  return (
    <div
      onClick={onToggle}
      style={{ marginBottom: collapsed ? '0' : '28px', cursor: 'pointer', userSelect: 'none' }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '12px' }}>
        <span style={{
          fontFamily: 'Space Mono, monospace',
          fontSize: 'clamp(15px, 1.6vw, 21px)',
          fontWeight: 700, letterSpacing: '5px', textTransform: 'uppercase',
          color, lineHeight: 1,
        }}>
          {alliance}
        </span>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <span style={{
            fontFamily: 'Space Mono, monospace', fontSize: '9px',
            letterSpacing: '2px', textTransform: 'uppercase', color: TEXT_WEAK,
          }}>
            {factionCount} faction{factionCount !== 1 ? 's' : ''}
          </span>
          <span style={{
            fontFamily: 'Space Mono, monospace', fontSize: '9px',
            letterSpacing: '2px', textTransform: 'uppercase', color: TEXT_WEAK,
            opacity: 0.6,
          }}>
            ·
          </span>
          <span style={{
            fontFamily: 'Space Mono, monospace', fontSize: '9px',
            letterSpacing: '2px', textTransform: 'uppercase', color: TEXT_WEAK,
          }}>
            {unitCount} unit{unitCount !== 1 ? 's' : ''}
          </span>
        </div>
        <span style={{
          fontFamily: 'Space Mono, monospace', fontSize: '10px',
          color: TEXT_WEAK, opacity: 0.5,
          transition: 'transform 150ms', display: 'inline-block',
          transform: collapsed ? 'rotate(-90deg)' : 'none',
        }}>
          ▾
        </span>
      </div>
      <div style={{ height: '1px', background: `linear-gradient(to right, ${color}55, ${BORDER} 55%)` }}/>
    </div>
  )
}

function SubGroupLabel({ children }) {
  return (
    <div style={{
      fontFamily: 'Space Mono, monospace', fontSize: '9px',
      fontWeight: 700, letterSpacing: '3px', textTransform: 'uppercase',
      color: TEXT_WEAK, marginBottom: '12px',
      display: 'flex', alignItems: 'center', gap: '10px',
    }}>
      {children}
      <div style={{ width: '20px', height: '1px', background: BORDER }}/>
    </div>
  )
}

function FactionChip({ _name, count, label, onClick, allianceColor, dense }) {
  const [hover, setHover] = useState(false)
  const ac = allianceColor || ACCENT
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      title={dense ? `${count} unit${count !== 1 ? 's' : ''}` : undefined}
      style={{
        position: 'relative',
        background: hover ? `${ac}14` : `${ac}05`,
        border: `1px solid ${hover ? ac : BORDER}`,
        boxShadow: hover ? `inset 3px 0 0 ${ac}` : 'inset 3px 0 0 transparent',
        cursor: 'pointer', borderRadius: 0,
        padding: dense ? '8px 30px 8px 14px' : '11px 34px 11px 16px',
        textAlign: 'left',
        transition: 'border-color 100ms, background 100ms, box-shadow 100ms',
      }}
    >
      <div style={{
        fontFamily: 'Space Mono, monospace', fontSize: dense ? '10px' : '12px',
        fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase',
        color: hover ? TEXT : TEXT_SEC,
        transition: 'color 100ms',
      }}>
        {label}
      </div>
      {!dense && (
        <div style={{
          fontFamily: 'Space Mono, monospace', fontSize: '9px',
          letterSpacing: '1px', color: TEXT_WEAK, marginTop: '5px',
        }}>
          {`${count} unit${count !== 1 ? 's' : ''}`}
        </div>
      )}
      <span style={{
        position: 'absolute', right: '9px', top: '50%',
        transform: 'translateY(-50%)',
        fontFamily: 'Space Mono, monospace', fontSize: '11px',
        color: ac, opacity: hover ? 0.75 : 0,
        transition: 'opacity 100ms',
        pointerEvents: 'none',
      }}>
        →
      </span>
    </button>
  )
}

const CHIP_GRID = 'repeat(auto-fill, minmax(200px, 1fr))'
const CHIP_GRID_DENSE = 'repeat(auto-fill, minmax(160px, 1fr))'

// Flat alliance (Imperium / Chaos): one group key = all factions as chips
// Xenos: mix of sub-groups (Aeldari) + standalone factions
function AllianceSection({ alliance, groups, onSelect, dense }) {
  const [collapsed, setCollapsed] = useState(false)
  const allianceColor = ALLIANCE_META[alliance].color

  const groupKeys = Object.keys(groups)
  if (groupKeys.length === 0) return null

  // Compute total unit count across all factions in this alliance
  const allFactions = Object.values(groups).flat()
  const totalUnits = allFactions.reduce((sum, sf) => sum + sf.count, 0)

  const isFlat = groupKeys.length === 1 && groupKeys[0] === alliance

  const grid = dense ? CHIP_GRID_DENSE : CHIP_GRID

  if (isFlat) {
    const chips = [...groups[alliance]].sort((a, b) => a.label.localeCompare(b.label))
    return (
      <div>
        <AllianceHeader
          alliance={alliance} factionCount={chips.length} unitCount={totalUnits}
          collapsed={collapsed} onToggle={() => setCollapsed((v) => !v)}
        />
        {!collapsed && (
          <div style={{ display: 'grid', gridTemplateColumns: grid, gap: dense ? '6px' : '10px' }}>
            {chips.map((sf) => (
              <FactionChip key={sf.name} {...sf} allianceColor={allianceColor} dense={dense}
                onClick={() => onSelect(sf.name)} />
            ))}
          </div>
        )}
      </div>
    )
  }

  // Xenos layout: sub-groups first, then standalone chips
  const subGroups = Object.entries(groups)
    .filter(([, subs]) => subs.length > 1)
    .sort(([a], [b]) => a.localeCompare(b))

  const standalone = Object.values(groups)
    .filter((subs) => subs.length === 1)
    .map((subs) => subs[0])
    .sort((a, b) => a.label.localeCompare(b.label))

  const totalCount = subGroups.reduce((s, [, subs]) => s + subs.length, 0) + standalone.length

  return (
    <div>
      <AllianceHeader
        alliance={alliance} factionCount={totalCount} unitCount={totalUnits}
        collapsed={collapsed} onToggle={() => setCollapsed((v) => !v)}
      />
      {!collapsed && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {subGroups.map(([group, subs]) => (
            <div key={group}>
              <SubGroupLabel>{group}</SubGroupLabel>
              <div style={{ display: 'grid', gridTemplateColumns: grid, gap: dense ? '6px' : '10px' }}>
                {subs.map((sf) => (
                  <FactionChip key={sf.name} {...sf} allianceColor={allianceColor} dense={dense}
                    onClick={() => onSelect(sf.name)} />
                ))}
              </div>
            </div>
          ))}
          {standalone.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: grid, gap: dense ? '6px' : '10px' }}>
              {standalone.map((sf) => (
                <FactionChip key={sf.name} {...sf} allianceColor={allianceColor} dense={dense}
                  onClick={() => onSelect(sf.name)} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function LibrarySection({ items, onSelect, dense }) {
  const [open, setOpen] = useState(false)
  const [showInfo, setShowInfo] = useState(false)
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <button
          onClick={() => setOpen((v) => !v)}
          style={{
            background: 'none', border: 'none', cursor: 'pointer', padding: 0,
            fontFamily: 'Space Mono, monospace', fontSize: '10px',
            letterSpacing: '2px', textTransform: 'uppercase', color: TEXT_WEAK,
            display: 'flex', alignItems: 'center', gap: '8px',
            opacity: 0.7,
          }}
          onMouseEnter={(e) => { e.currentTarget.style.opacity = '1' }}
          onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.7' }}
        >
          {open ? '▲' : '▼'} Library & Legends
        </button>
        <button
          onClick={() => setShowInfo((v) => !v)}
          title="What is Library & Legends?"
          style={{
            background: 'none', border: `1px solid ${showInfo ? TEXT_WEAK : BORDER}`,
            cursor: 'pointer', padding: '1px 6px', borderRadius: '50%',
            fontFamily: 'Space Mono, monospace', fontSize: '9px',
            color: showInfo ? TEXT_SEC : TEXT_WEAK,
            lineHeight: 1.4, transition: 'border-color 100ms, color 100ms',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = TEXT_WEAK; e.currentTarget.style.color = TEXT_SEC }}
          onMouseLeave={(e) => { if (!showInfo) { e.currentTarget.style.borderColor = BORDER; e.currentTarget.style.color = TEXT_WEAK } }}
        >
          i
        </button>
      </div>
      {showInfo && (
        <div style={{
          marginTop: '10px',
          padding: '12px 16px',
          background: 'rgba(255,255,255,0.02)',
          border: `1px solid ${BORDER}`,
          fontFamily: 'Space Mono, monospace', fontSize: '9px',
          letterSpacing: '1px', color: TEXT_WEAK, lineHeight: 1.8,
          maxWidth: '560px',
        }}>
          Extended datasheets from older publications and supplements. These units are not part of the main competitive roster
          and may not reflect current balance. Use them for casual or narrative play.
        </div>
      )}
      {open && (
        <div style={{ marginTop: '20px' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: dense ? '6px' : '10px' }}>
            {items.map(({ name, count, label }) => (
              <FactionChip key={name} name={name} count={count} label={label} dense={dense}
                onClick={() => onSelect(name)} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ── VIEW 2: Units list ────────────────────────────────────────────────────────

function UnitsView({ faction, initialUnit, _onSelectUnit, onBack }) {
  const unitsByFaction = useDataStore((s) => s.unitsByFaction)
  const [search, setSearch]           = useState('')
  const [sort, setSort]               = useState('alpha')
  const [showLegends, setShowLegends] = useState(false)

  const allUnits = useMemo(() => unitsByFaction[faction] || [], [unitsByFaction, faction])

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

function UnitCard({ unit, onClick, showFaction = false }) {
  const [hover, setHover] = useState(false)

  // Derive faction label for search results
  const factionLabel = showFaction
    ? (() => {
        const raw = unit.factions?.[0] || unit.faction || ''
        const idx = raw.indexOf(' - ')
        return idx !== -1 ? raw.slice(idx + 3) : raw
      })()
    : null

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

        {factionLabel && (
          <div style={{
            fontFamily: 'Space Mono, monospace', fontSize: '8px',
            letterSpacing: '1.5px', textTransform: 'uppercase',
            color: ACCENT, opacity: 0.7, marginBottom: '6px',
          }}>
            {factionLabel}
          </div>
        )}

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

function StatCell({ label, value }) {
  return (
    <div style={{
      border: `1px solid ${BORDER}`, padding: '14px 22px',
      marginRight: '-1px', marginBottom: '-1px', textAlign: 'center', minWidth: '64px',
    }}>
      <div style={{ fontFamily: 'Space Mono, monospace', fontSize: '8px', letterSpacing: '1.5px', textTransform: 'uppercase', color: TEXT_WEAK, marginBottom: '8px' }}>
        {label}
      </div>
      <div style={{ fontFamily: 'Space Mono, monospace', fontSize: '18px', fontWeight: 700, color: TEXT }}>
        {value}
      </div>
    </div>
  )
}

function ProfileRow({ name, M, T, Sv, W, LD, OC, invuln, primary }) {
  const cells = [
    ['M', M || '—'], ['T', T], ['SV', `${Sv}+`],
    ['W', W], ['LD', LD || '—'], ['OC', OC || '—'],
    ...(invuln ? [['INV', `${invuln}++`]] : []),
  ]
  return (
    <div style={{ marginBottom: primary ? '0' : '-1px' }}>
      {!primary && (
        <div style={{
          fontFamily: 'Space Mono, monospace', fontSize: '9px',
          letterSpacing: '1.5px', textTransform: 'uppercase',
          color: TEXT_WEAK, padding: '10px 0 6px',
          borderTop: `1px solid ${BORDER}`, marginTop: '12px',
        }}>
          {name}
        </div>
      )}
      <div style={{ display: 'flex', gap: '0', flexWrap: 'wrap' }}>
        {cells.map(([label, val]) => <StatCell key={label} label={label} value={val} />)}
      </div>
    </div>
  )
}

function WeaponSubTable({ title, rows }) {
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

function WeaponsTable({ weapons }) {
  const weaponsById = useDataStore((s) => s.weaponsById)
  const full   = weapons.map((ref) => weaponsById[ref.id]).filter(Boolean)
  const ranged = full.filter((w) => w.type === 'Ranged')
  const melee  = full.filter((w) => w.type !== 'Ranged')

  if (full.length === 0) {
    return <div style={{ fontFamily: 'Space Mono, monospace', fontSize: '10px', color: TEXT_WEAK }}>No weapon data</div>
  }

  return (
    <div>
      <WeaponSubTable title="Ranged" rows={ranged} />
      <WeaponSubTable title="Melee" rows={melee} />
    </div>
  )
}

function ModelOptionsWeapons({ modelOptions, unit }) {
  const weaponsById = useDataStore((s) => s.weaponsById)

  return (
    <div>
      {modelOptions.map((mo) => {
        // Compute stat fields that differ from the unit main profile
        const s = mo.stats
        const diffStats = s ? [
          s.M  !== unit.M   && { key: 'M',  label: 'M',  val: s.M },
          s.T  !== unit.T   && { key: 'T',  label: 'T',  val: s.T },
          s.Sv !== unit.Sv  && { key: 'Sv', label: 'SV', val: `${s.Sv}+` },
          s.W  !== unit.W   && { key: 'W',  label: 'W',  val: s.W },
          s.LD !== unit.LD  && { key: 'LD', label: 'LD', val: s.LD },
          s.OC !== unit.OC  && { key: 'OC', label: 'OC', val: s.OC },
        ].filter(Boolean) : []

        return (
          <div key={mo.name} style={{ marginBottom: '32px' }}>
            <div style={{
              fontFamily: 'Space Mono, monospace', fontSize: '9px',
              letterSpacing: '2px', textTransform: 'uppercase',
              color: ACCENT, marginBottom: '14px',
              paddingBottom: '8px', borderBottom: `1px solid ${BORDER}`,
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <span>{mo.name}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                {diffStats.map(({ key, label, val }) => (
                  <span key={key} style={{ color: TEXT_SEC, fontSize: '9px', letterSpacing: '1px' }}>
                    {label} <span style={{ color: TEXT }}>{val}</span>
                  </span>
                ))}
                {mo.max != null && (
                  <span style={{ color: TEXT_WEAK, fontSize: '8px' }}>
                    ×{mo.min != null && mo.min !== mo.max ? `${mo.min}–${mo.max}` : mo.max}
                  </span>
                )}
              </div>
            </div>
            {mo.groups.map((g, gi) => {
              const rows = g.wids.map((id) => weaponsById[id]).filter(Boolean)
              if (!rows.length) return null
              return (
                <div key={gi} style={{ marginBottom: '20px' }}>
                  {g.group && (
                    <div style={{
                      fontFamily: 'Space Mono, monospace', fontSize: '8px',
                      letterSpacing: '1.5px', textTransform: 'uppercase',
                      color: TEXT_WEAK, marginBottom: '8px',
                      display: 'flex', alignItems: 'center', gap: '8px',
                    }}>
                      {g.group}
                      {g.pick != null && (
                        <span style={{ color: TEXT_OFF }}>— pick {g.pick}</span>
                      )}
                    </div>
                  )}
                  <WeaponSubTable title="" rows={rows} />
                </div>
              )
            })}
          </div>
        )
      })}
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

      {/* Stats block — stacked profile rows (Option C) */}
      <div style={{ marginBottom: '32px' }}>
        <div style={{ fontFamily: 'Space Mono, monospace', fontSize: '10px', letterSpacing: '2px', textTransform: 'uppercase', color: TEXT_WEAK, marginBottom: '14px' }}>
          Profile
        </div>
        <ProfileRow name={unit.name} M={unit.M} T={unit.T} Sv={unit.Sv} W={unit.W} LD={unit.LD} OC={unit.OC} invuln={unit.invuln} primary />
        {unit.model_profiles?.map((p) => (
          <ProfileRow key={p.name} name={p.name} M={p.M} T={p.T} Sv={p.Sv} W={p.W} LD={p.LD} OC={p.OC} />
        ))}
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

      {/* Weapons — use grouped view only when model_options covers all unit weapons */}
      {unit.weapons?.length > 0 && (() => {
        const moWids = new Set(
          (unit.model_options ?? []).flatMap((mo) => mo.groups.flatMap((g) => g.wids))
        )
        const useGrouped = moWids.size >= (unit.weapons?.length ?? 0)
        return (
          <div style={{ marginBottom: '32px' }}>
            <div style={{ fontFamily: 'Space Mono, monospace', fontSize: '10px', letterSpacing: '2px', textTransform: 'uppercase', color: TEXT_WEAK, marginBottom: '16px' }}>
              Weapons
            </div>
            {useGrouped
              ? <ModelOptionsWeapons modelOptions={unit.model_options} unit={unit} />
              : <WeaponsTable weapons={unit.weapons} />
            }
          </div>
        )
      })()}

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
                      <AbilityText text={ab.desc} />
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
  const loaded      = useDataStore((s) => s.loaded)
  const unitsById   = useDataStore((s) => s.unitsById)
  const location    = useLocation()

  useEffect(() => {
    document.title = "Factions & Units — 46 Factions, 1487 Units | Prob'Hammer WH40K"
  }, [])

  const [view, setView]                   = useState('factions')
  const [activeFaction, setActiveFaction] = useState(null)
  const [jumpToUnit, setJumpToUnit]       = useState(null)

  // Jump to unit when navigated from ArmiesPage
  useEffect(() => {
    const unitId = location.state?.unit_id
    if (!unitId || !loaded) return
    const unit = unitsById?.[unitId]
    if (!unit) return
    const faction = unit.factions?.[0] || unit.faction
    if (!faction) return
    setActiveFaction(faction)
    setJumpToUnit(unit)
    setView('units')
  }, [location.state, loaded, unitsById])

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

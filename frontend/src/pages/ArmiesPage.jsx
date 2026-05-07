import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useArmyStore } from '../store/armyStore'
import { useAuthStore } from '../store/authStore'
import { useDataStore } from '../store/dataStore'
import { ACCENT, BG, SURFACE, SURFACE_E, BORDER, TEXT, TEXT_SEC, TEXT_WEAK, ERROR, HIGHLIGHT } from '../theme'

// ── Small helpers ─────────────────────────────────────────────────────────────


function IconBtn({ children, onClick, danger, title }) {
  const [hov, setHov] = useState(false)
  return (
    <button
      title={title}
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background: 'none', border: 'none',
        color: danger ? (hov ? ERROR : 'rgba(255,92,122,0.4)') : (hov ? TEXT : TEXT_WEAK),
        cursor: 'pointer', padding: '2px 6px',
        fontFamily: 'Space Mono, monospace', fontSize: '13px', lineHeight: 1,
        transition: 'color 100ms',
      }}
    >
      {children}
    </button>
  )
}

function SmallBtn({ children, onClick, primary, danger }) {
  const [hov, setHov] = useState(false)
  const bgColor = primary
    ? (hov ? 'rgba(47,224,255,0.85)' : ACCENT)
    : danger
      ? (hov ? 'rgba(255,92,122,0.12)' : 'none')
      : (hov ? 'rgba(47,224,255,0.08)' : 'none')
  const borderColor = primary ? ACCENT : danger ? (hov ? ERROR : 'rgba(255,92,122,0.4)') : (hov ? ACCENT : BORDER)
  const textColor = primary ? BG : danger ? (hov ? ERROR : 'rgba(255,92,122,0.6)') : (hov ? ACCENT : TEXT_WEAK)
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background: bgColor,
        border: `1px solid ${borderColor}`,
        color: textColor,
        fontFamily: 'Space Mono, monospace', fontSize: '8px',
        letterSpacing: '1.5px', textTransform: 'uppercase',
        padding: '5px 10px', cursor: 'pointer',
        transition: 'all 100ms',
      }}
    >
      {children}
    </button>
  )
}

// ── Inline editable name ──────────────────────────────────────────────────────

function EditableName({ value, onSave, style }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft]     = useState(value)
  const inputRef = useRef()

  useEffect(() => { setDraft(value) }, [value])
  useEffect(() => { if (editing) inputRef.current?.select() }, [editing])

  const commit = () => {
    setEditing(false)
    if (draft.trim() && draft !== value) onSave(draft.trim())
    else setDraft(value)
  }

  const [hovering, setHovering] = useState(false)

  if (editing) {
    return (
      <input
        ref={inputRef}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') { setDraft(value); setEditing(false) } }}
        style={{
          ...style,
          background: 'rgba(47,224,255,0.05)',
          border: `1px solid ${ACCENT}`,
          outline: 'none', padding: '4px 8px',
          borderRadius: 0,
        }}
      />
    )
  }

  return (
    <span
      onClick={() => setEditing(true)}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      title="Click to rename"
      style={{
        ...style,
        cursor: 'text',
        borderBottom: hovering ? `1px dashed rgba(47,224,255,0.5)` : '1px dashed transparent',
        transition: 'border-bottom-color 120ms',
      }}
    >
      {value}
    </span>
  )
}

// ── Army unit card ────────────────────────────────────────────────────────────

function ArmyUnitCard({ entry, user }) {
  const removeUnit  = useArmyStore((s) => s.removeUnit)
  const updateUnit  = useArmyStore((s) => s.updateUnit)
  const weaponsById = useDataStore((s) => s.weaponsById)
  const unitsById   = useDataStore((s) => s.unitsById)
  const navigate    = useNavigate()
  const [hov, setHov] = useState(false)

  // Fallback vers les données BSData pour les unités ajoutées avant le nouveau schema
  const ref        = unitsById?.[entry.unit_id] ?? {}
  const M          = entry.M          ?? ref.M          ?? null
  const LD         = entry.LD         ?? ref.LD         ?? null
  const OC         = entry.OC         ?? ref.OC         ?? null
  const ptsBase    = entry.pts        ?? ref.pts        ?? null
  const ptsOptions = entry.pts_options ?? ref.pts_options ?? []
  const invuln     = entry.invuln     ?? ref.invuln     ?? null

  const minM = entry.min_models ?? 1
  const maxM = entry.max_models ?? null
  const models = entry.models ?? minM

  // pts est le coût TOTAL de l'escouade au format minimum, pas un coût par modèle.
  // pts_options définit les tranches pour les autres tailles.
  function resolvePoints(base, options, n) {
    if (!base) return null
    if (!options || options.length === 0) return base
    const exact = options.find(o => o.condition === 'exact' && o.n_models === n)
    if (exact) return exact.pts
    const atLeast = [...options]
      .filter(o => o.condition === 'atLeast' && o.n_models <= n)
      .sort((a, b) => b.n_models - a.n_models)[0]
    if (atLeast) return atLeast.pts
    return base
  }
  const totalPts = resolvePoints(ptsBase, ptsOptions, models)

  const weaponNames = (entry.weapons ?? [])
    .map((ref) => weaponsById[ref.id]?.name)
    .filter(Boolean)

  const stats = [
    { key: 'M',   value: M  ?? '—',                          sim: false },
    { key: 'T',   value: entry.T  ?? '—',                    sim: true  },
    { key: 'SV',  value: entry.Sv != null ? `${entry.Sv}+` : '—', sim: true },
    { key: 'W',   value: entry.W  ?? '—',                    sim: true  },
    { key: 'LD',  value: LD ?? '—',                          sim: false },
    { key: 'OC',  value: OC ?? '—',                          sim: false },
  ]
  if (invuln) stats.splice(3, 0, { key: 'INV', value: `${invuln}++`, sim: true, inv: true })
  const cols = stats.length

  return (
    <div
      onClick={() => navigate('/factions', { state: { unit_id: entry.unit_id } })}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        border: `1px solid ${hov ? ACCENT : BORDER}`,
        borderLeft: `3px solid ${hov ? ACCENT : 'transparent'}`,
        background: SURFACE,
        cursor: 'pointer',
        transition: 'border-color 120ms',
      }}
    >
      {/* Header: name + pts + delete */}
      <div style={{
        padding: '10px 14px', borderBottom: `1px solid ${BORDER}`,
        display: 'flex', alignItems: 'center', gap: '12px',
      }}>
        <div style={{
          fontFamily: 'Space Mono, monospace', fontSize: '12px', fontWeight: 700,
          color: hov ? ACCENT : TEXT, whiteSpace: 'nowrap', overflow: 'hidden',
          textOverflow: 'ellipsis', transition: 'color 120ms', flex: 1, minWidth: 0,
        }}>
          {entry.name}
        </div>
        {totalPts !== null && (
          <div style={{ flexShrink: 0, textAlign: 'right', lineHeight: 1 }}>
            <span style={{ fontFamily: 'Space Mono, monospace', fontSize: '15px', fontWeight: 700, color: ACCENT }}>
              {totalPts}
            </span>
            <span style={{ fontFamily: 'Space Mono, monospace', fontSize: '8px', color: TEXT_WEAK, marginLeft: '4px', letterSpacing: '1px' }}>
              pts
            </span>
          </div>
        )}
        <button
          onClick={(e) => { e.stopPropagation(); removeUnit(entry.uid, user) }}
          title="Remove unit"
          style={{
            flexShrink: 0, cursor: 'pointer', background: 'none',
            border: `1px solid ${hov ? ERROR : 'rgba(255,92,122,0.3)'}`,
            color: hov ? ERROR : 'rgba(255,92,122,0.55)',
            fontFamily: 'Space Mono, monospace', fontSize: '18px', lineHeight: 1,
            padding: '5px 12px', transition: 'all 120ms',
          }}
        >×</button>
      </div>

      {/* Stats grid — même structure que DefenderCard sur la learn page */}
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, borderBottom: `1px solid ${BORDER}` }}>
        {stats.map((s, i) => (
          <div key={s.key} style={{
            padding: '12px 8px', textAlign: 'center',
            borderRight: i < cols - 1 ? `1px solid ${BORDER}` : 'none',
            opacity: s.sim ? 1 : 0.65,
          }}>
            <div style={{
              fontFamily: 'Space Mono, monospace', fontSize: '18px', fontWeight: 700, lineHeight: 1,
              color: s.inv ? ACCENT : s.sim ? HIGHLIGHT : TEXT_WEAK,
            }}>{s.value}</div>
            <div style={{
              fontFamily: 'Space Mono, monospace', fontSize: '7px',
              letterSpacing: '1px', textTransform: 'uppercase', color: TEXT_WEAK, marginTop: '5px',
            }}>{s.key}</div>
          </div>
        ))}
      </div>

      {/* Footer: models + weapons */}
      <div style={{
        padding: '8px 14px', display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', gap: '8px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          onClick={(e) => e.stopPropagation()}
        >
          <span style={{ fontFamily: 'Space Mono, monospace', fontSize: '8px', color: TEXT_WEAK, letterSpacing: '1px' }}>
            Models
          </span>
          <input
            type="number" min={minM} max={maxM ?? undefined} value={entry.models}
            onClick={(e) => e.stopPropagation()}
            onChange={(e) => {
              let v = parseInt(e.target.value) || minM
              v = Math.max(minM, v)
              if (maxM !== null) v = Math.min(maxM, v)
              updateUnit(entry.uid, { models: v }, user)
            }}
            style={{
              width: '44px', background: 'rgba(47,224,255,0.05)',
              border: `1px solid ${BORDER}`, color: ACCENT,
              fontFamily: 'Space Mono, monospace', fontSize: '11px',
              padding: '2px 4px', outline: 'none', textAlign: 'center',
            }}
          />
          {maxM !== null && (
            <span style={{ fontFamily: 'Space Mono, monospace', fontSize: '8px', color: TEXT_WEAK }}>/ {maxM}</span>
          )}
        </div>
        {weaponNames.length > 0 && (
          <div style={{
            fontFamily: 'Space Mono, monospace', fontSize: '9px', color: TEXT_WEAK,
            letterSpacing: '0.5px', flex: 1, whiteSpace: 'nowrap',
            overflow: 'hidden', textOverflow: 'ellipsis', textAlign: 'right',
          }}>
            {weaponNames.slice(0, 5).join(' · ')}
            {weaponNames.length > 5 && <span style={{ color: ACCENT }}> +{weaponNames.length - 5}</span>}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Army editor (right panel) ─────────────────────────────────────────────────

function ArmyEditor({ user, onNewArmy }) {
  const armies      = useArmyStore((s) => s.armies)
  const activeId    = useArmyStore((s) => s.activeId)
  const rename      = useArmyStore((s) => s.rename)
  const deleteArmy  = useArmyStore((s) => s.deleteArmy)
  const addUnit     = useArmyStore((s) => s.addUnit)
  const searchUnits = useDataStore((s) => s.searchUnits)

  const [query, setQuery]     = useState('')
  const [results, setResults] = useState([])
  const [confirm, setConfirm] = useState(false)
  const searchRef = useRef()

  const army = armies.find((a) => a.id === activeId) ?? null

  useEffect(() => { setQuery(''); setResults([]) }, [activeId])

  const handleSearch = (q) => {
    setQuery(q)
    setResults(q.length >= 2 ? searchUnits(q) : [])
  }

  const handleAdd = (unit) => {
    addUnit({
      unit_id:     unit.id,
      name:        unit.name,
      pts:         unit.pts ?? null,
      pts_options: unit.pts_options ?? [],
      M:           unit.M  ?? null,
      T:           unit.T,
      Sv:          unit.Sv,
      W:           unit.W,
      LD:          unit.LD ?? null,
      OC:          unit.OC ?? null,
      invuln:      unit.invuln ?? null,
      kw:          unit.kw ?? [],
      weapons:     unit.weapons ?? [],
      min_models:  unit.min_models ?? null,
      max_models:  unit.max_models ?? null,
    }, user)
    setQuery('')
    setResults([])
  }

  if (!army) {
    return (
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: '20px',
      }}>
        <div style={{
          fontFamily: 'Space Mono, monospace', fontSize: '10px',
          letterSpacing: '2px', textTransform: 'uppercase', color: TEXT_WEAK,
        }}>
          No army selected
        </div>
        <button
          onClick={onNewArmy}
          style={{
            background: ACCENT, border: `1px solid ${ACCENT}`,
            color: BG, fontFamily: 'Space Mono, monospace',
            fontSize: '10px', letterSpacing: '3px', textTransform: 'uppercase',
            fontWeight: 700, padding: '12px 28px', cursor: 'pointer',
            transition: 'opacity 100ms',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.85' }}
          onMouseLeave={(e) => { e.currentTarget.style.opacity = '1' }}
        >
          + New Army
        </button>
      </div>
    )
  }

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '32px 40px 60px' }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '32px' }}>
        <EditableName
          value={army.name}
          onSave={(n) => rename(army.id, n, user)}
          style={{
            fontFamily: 'Space Mono, monospace', fontSize: '24px',
            fontWeight: 700, letterSpacing: '1px', color: TEXT,
          }}
        />
        {confirm ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontFamily: 'Space Mono, monospace', fontSize: '9px', color: ERROR, letterSpacing: '1px' }}>
              Confirm deletion?
            </span>
            <SmallBtn onClick={() => { deleteArmy(army.id, user); setConfirm(false) }}>Yes</SmallBtn>
            <SmallBtn onClick={() => setConfirm(false)}>No</SmallBtn>
          </div>
        ) : (
          <SmallBtn danger onClick={() => setConfirm(true)}>Delete army</SmallBtn>
        )}
      </div>

      {/* ── Divider ── */}
      <div style={{ borderTop: `1px solid ${BORDER}`, marginBottom: '28px' }} />

      {/* ── Search ── */}
      <div style={{ marginBottom: '28px', position: 'relative' }}>
        <div style={{
          fontFamily: 'Space Mono, monospace', fontSize: '9px',
          letterSpacing: '2px', textTransform: 'uppercase', color: TEXT_WEAK,
          marginBottom: '10px',
        }}>
          Add a unit
        </div>
        <input
          ref={searchRef}
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="Search (e.g. Intercessors, Orks…)"
          style={{
            width: '100%', boxSizing: 'border-box',
            background: 'rgba(47,224,255,0.04)', border: `1px solid ${query ? ACCENT : BORDER}`,
            color: TEXT_SEC, fontFamily: 'Space Mono, monospace', fontSize: '12px',
            padding: '10px 14px', outline: 'none', transition: 'border-color 120ms',
          }}
        />

        {results.length > 0 && (
          <div style={{
            position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 20,
            background: SURFACE_E, border: `1px solid ${ACCENT}`,
            borderTop: 'none', maxHeight: '280px', overflowY: 'auto',
          }}>
            {results.map((unit) => (
              <div
                key={unit.id}
                onClick={() => handleAdd(unit)}
                style={{
                  padding: '10px 14px', cursor: 'pointer',
                  borderBottom: `1px solid ${BORDER}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  transition: 'background 80ms',
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(47,224,255,0.07)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              >
                <div>
                  <div style={{ fontFamily: 'Space Mono, monospace', fontSize: '12px', color: TEXT }}>
                    {unit.name}
                  </div>
                  <div style={{ fontFamily: 'Space Mono, monospace', fontSize: '9px', color: TEXT_WEAK, marginTop: '2px' }}>
                    T{unit.T} · SV{unit.Sv}+ · W{unit.W}
                    {unit.invuln ? ` · ${unit.invuln}++` : ''}
                  </div>
                </div>
                <span style={{ fontFamily: 'Space Mono, monospace', fontSize: '9px', color: ACCENT }}>+ Add</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Divider ── */}
      <div style={{ borderTop: `1px solid ${BORDER}`, marginBottom: '24px' }} />

      {/* ── Unit list ── */}
      <div style={{
        fontFamily: 'Space Mono, monospace', fontSize: '9px',
        letterSpacing: '3px', textTransform: 'uppercase', color: TEXT_SEC,
        marginBottom: '12px',
        display: 'flex', alignItems: 'center', gap: '10px',
      }}>
        Units
        <span style={{
          color: ACCENT, border: `1px solid rgba(47,224,255,0.3)`,
          padding: '1px 6px', fontSize: '8px',
        }}>
          {army.units.length}
        </span>
        {(() => {
          const total = army.units.reduce((sum, e) => {
            const base = e.pts ?? 0
            const opts = e.pts_options ?? []
            const n = e.models ?? e.min_models ?? 1
            const exact = opts.find(o => o.condition === 'exact' && o.n_models === n)
            if (exact) return sum + exact.pts
            const atLeast = [...opts].filter(o => o.condition === 'atLeast' && o.n_models <= n).sort((a,b) => b.n_models - a.n_models)[0]
            return sum + (atLeast ? atLeast.pts : base)
          }, 0)
          return total > 0 ? (
            <span style={{
              fontFamily: 'Space Mono, monospace', fontSize: '13px',
              fontWeight: 700, color: TEXT, letterSpacing: '0px',
              marginLeft: 'auto',
            }}>
              {total.toLocaleString()} <span style={{ fontSize: '9px', color: TEXT_WEAK, fontWeight: 400, letterSpacing: '1px' }}>PTS</span>
            </span>
          ) : null
        })()}
      </div>

      {army.units.length === 0 ? (
        <div style={{ display: 'flex', gap: '16px', paddingTop: '8px', flexWrap: 'wrap' }}>
          {/* Option A — Search */}
          <div
            onClick={() => searchRef.current?.focus()}
            style={{
              flex: 1, minWidth: '200px', padding: '24px',
              border: `1px solid ${BORDER}`, cursor: 'pointer',
              background: 'rgba(47,224,255,0.03)', transition: 'background 120ms',
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(47,224,255,0.07)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(47,224,255,0.03)'}
          >
            <div style={{
              fontFamily: 'Space Mono, monospace', fontSize: '20px',
              color: ACCENT, marginBottom: '12px', lineHeight: 1,
            }}>⌕</div>
            <div style={{
              fontFamily: 'Space Mono, monospace', fontSize: '11px',
              fontWeight: 700, color: TEXT, letterSpacing: '1px', marginBottom: '8px',
            }}>
              Search & add units
            </div>
            <div style={{
              fontFamily: 'Space Mono, monospace', fontSize: '9px',
              color: TEXT_WEAK, lineHeight: 1.6, letterSpacing: '0.5px',
            }}>
              Browse all 1,487 units from the BSData database and add them to your army one by one.
            </div>
          </div>

          {/* Option B — BattleScribe (coming soon) */}
          <div style={{
            flex: 1, minWidth: '200px', padding: '24px',
            border: `1px solid ${BORDER}`,
            background: 'transparent', opacity: 0.5,
          }}>
            <div style={{
              fontFamily: 'Space Mono, monospace', fontSize: '20px',
              color: TEXT_WEAK, marginBottom: '12px', lineHeight: 1,
            }}>↑</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <div style={{
                fontFamily: 'Space Mono, monospace', fontSize: '11px',
                fontWeight: 700, color: TEXT_SEC, letterSpacing: '1px',
              }}>
                Import BattleScribe
              </div>
              <span style={{
                fontFamily: 'Space Mono, monospace', fontSize: '7px',
                letterSpacing: '1.5px', textTransform: 'uppercase',
                color: ACCENT, border: `1px solid ${ACCENT}`, padding: '1px 5px',
              }}>
                Soon
              </span>
            </div>
            <div style={{
              fontFamily: 'Space Mono, monospace', fontSize: '9px',
              color: TEXT_WEAK, lineHeight: 1.6, letterSpacing: '0.5px',
            }}>
              Import a .ros or .rosz roster file directly from BattleScribe or New Recruit.
            </div>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {army.units.map((entry) => (
            <ArmyUnitCard key={entry.uid} entry={entry} user={user} />
          ))}
        </div>
      )}
    </div>
  )
}

// ── Army sidebar (left panel) ─────────────────────────────────────────────────

function ArmySidebar({ user, onNewArmy }) {
  const armies    = useArmyStore((s) => s.armies)
  const activeId  = useArmyStore((s) => s.activeId)
  const setActive = useArmyStore((s) => s.setActive)

  const fmt = (iso) => new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit' })

  return (
    <div style={{
      width: '260px', flexShrink: 0,
      borderRight: `1px solid ${BORDER}`,
      display: 'flex', flexDirection: 'column',
      background: SURFACE,
    }}>
      {/* Header */}
      <div style={{
        padding: '16px 16px 12px',
        borderBottom: `1px solid ${BORDER}`,
      }}>
        <div style={{
          fontFamily: 'Space Mono, monospace', fontSize: '9px',
          letterSpacing: '3px', textTransform: 'uppercase', color: TEXT_WEAK,
          marginBottom: '10px',
        }}>
          My Armies
        </div>
        <button
          onClick={onNewArmy}
          style={{
            width: '100%',
            background: ACCENT, border: `1px solid ${ACCENT}`,
            color: BG, fontFamily: 'Space Mono, monospace', fontSize: '9px',
            letterSpacing: '2px', textTransform: 'uppercase', fontWeight: 700,
            padding: '9px 0', cursor: 'pointer', transition: 'opacity 100ms',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.85' }}
          onMouseLeave={(e) => { e.currentTarget.style.opacity = '1' }}
        >
          + New Army
        </button>
      </div>

      {/* List */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {armies.length === 0 ? (
          <div style={{
            padding: '20px 16px',
            fontFamily: 'Space Mono, monospace', fontSize: '10px',
            color: TEXT_WEAK, lineHeight: 1.7,
          }}>
            No armies yet.<br />Click <span style={{ color: ACCENT }}>+ New Army</span> to get started.
          </div>
        ) : (
          armies.map((army) => {
            const active = army.id === activeId
            return (
              <div
                key={army.id}
                onClick={() => setActive(army.id)}
                style={{
                  padding: '14px 20px',
                  cursor: 'pointer',
                  borderBottom: `1px solid ${BORDER}`,
                  borderLeft: `3px solid ${active ? ACCENT : 'transparent'}`,
                  background: active ? 'rgba(47,224,255,0.06)' : 'transparent',
                  transition: 'background 100ms, border-left-color 100ms',
                }}
                onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = 'rgba(47,224,255,0.03)' }}
                onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = 'transparent' }}
              >
                <div style={{
                  fontFamily: 'Space Mono, monospace', fontSize: '11px',
                  fontWeight: active ? 700 : 400, color: active ? TEXT : TEXT_SEC,
                  marginBottom: '4px',
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                }}>
                  {army.name}
                </div>
                <div style={{
                  fontFamily: 'Space Mono, monospace', fontSize: '8px',
                  color: TEXT_WEAK, letterSpacing: '0.5px',
                }}>
                  {army.units.length} unit{army.units.length !== 1 ? 's' : ''} · {fmt(army.created_at)}
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Footer hint */}
      {!user && (
        <div style={{
          padding: '12px 16px',
          borderTop: `1px solid ${BORDER}`,
          fontFamily: 'Space Mono, monospace', fontSize: '8px',
          color: TEXT_WEAK, lineHeight: 1.6, letterSpacing: '0.5px',
        }}>
          Sign in to save your armies online and access them from any device.
        </div>
      )}
    </div>
  )
}

// ── New Army Modal ────────────────────────────────────────────────────────────

function NewArmyModal({ onClose, onCreate }) {
  const [name, setName]   = useState('')
  const [busy, setBusy]   = useState(false)
  const [error, setError] = useState('')
  const inputRef = useRef()

  useEffect(() => { inputRef.current?.focus() }, [])
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const handleCreate = async () => {
    if (!name.trim()) { setError('Army name is required'); return }
    setBusy(true)
    setError('')
    try {
      await onCreate(name.trim())
      onClose()
    } catch (e) {
      const msg = e.message ?? ''
      if (msg.includes('schema cache') || msg.includes('does not exist') || msg.includes('relation'))
        setError('Database table not set up yet — run the armies SQL in your Supabase dashboard.')
      else
        setError(msg || 'Failed to create army')
      setBusy(false)
    }
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        background: 'rgba(10,22,33,0.85)', backdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: '420px', position: 'relative',
          background: SURFACE_E, border: `1px solid ${ACCENT}`,
          padding: '36px 32px 32px', display: 'flex', flexDirection: 'column', gap: '20px',
        }}
      >
        {/* Close */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute', top: '14px', right: '18px',
            background: 'none', border: 'none',
            color: TEXT_WEAK, fontSize: '20px', cursor: 'pointer', lineHeight: 1,
          }}
        >×</button>

        {/* Title */}
        <div>
          <div style={{
            fontFamily: 'Space Mono, monospace', fontSize: '9px',
            letterSpacing: '3px', textTransform: 'uppercase', color: ACCENT, marginBottom: '6px',
          }}>
            New Army
          </div>
          <div style={{
            fontFamily: 'Space Mono, monospace', fontSize: '14px',
            fontWeight: 700, color: TEXT,
          }}>
            Name your army
          </div>
        </div>

        {/* Input */}
        <input
          ref={inputRef}
          value={name}
          onChange={(e) => { setName(e.target.value); setError('') }}
          onKeyDown={(e) => { if (e.key === 'Enter') handleCreate() }}
          placeholder="e.g. Ultramarines Strike Force"
          maxLength={60}
          style={{
            background: 'rgba(47,224,255,0.05)',
            border: `1px solid ${error ? ERROR : (name ? ACCENT : BORDER)}`,
            color: TEXT_SEC, fontFamily: 'Space Mono, monospace', fontSize: '13px',
            padding: '12px 14px', outline: 'none', width: '100%', boxSizing: 'border-box',
            transition: 'border-color 120ms',
          }}
        />

        {error && (
          <div style={{
            fontFamily: 'Space Mono, monospace', fontSize: '9px',
            color: ERROR, letterSpacing: '1px', marginTop: '-12px',
          }}>
            {error}
          </div>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={handleCreate}
            disabled={busy || !name.trim()}
            style={{
              flex: 1,
              background: busy || !name.trim() ? 'rgba(47,224,255,0.15)' : ACCENT,
              border: 'none',
              color: busy || !name.trim() ? TEXT_WEAK : BG,
              fontFamily: 'Space Mono, monospace', fontSize: '9px',
              letterSpacing: '2px', textTransform: 'uppercase', fontWeight: 700,
              padding: '12px', cursor: busy || !name.trim() ? 'default' : 'pointer',
              transition: 'opacity 100ms',
            }}
          >
            {busy ? '…' : 'Create Army'}
          </button>
          <button
            onClick={onClose}
            style={{
              background: 'none', border: `1px solid ${BORDER}`,
              color: TEXT_WEAK, fontFamily: 'Space Mono, monospace',
              fontSize: '9px', letterSpacing: '2px', textTransform: 'uppercase',
              padding: '12px 16px', cursor: 'pointer',
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export function ArmiesPage() {
  const user   = useAuthStore((s) => s.user)
  const init   = useArmyStore((s) => s.init)
  const create = useArmyStore((s) => s.create)

  useEffect(() => {
    document.title = "Army Builder — Save & Compare Lists | Prob'Hammer WH40K"
  }, [])

  const [showModal, setShowModal] = useState(false)

  useEffect(() => { init(user) }, [user, init])

  const handleCreate = async (name) => {
    await create(user, name)
  }

  return (
    <div style={{
      display: 'flex', height: '100vh', paddingTop: '52px',
      background: BG, color: TEXT_SEC,
    }}>
      <ArmySidebar user={user} onNewArmy={() => setShowModal(true)} />
      <ArmyEditor  user={user} onNewArmy={() => setShowModal(true)} />

      {showModal && (
        <NewArmyModal
          onClose={() => setShowModal(false)}
          onCreate={handleCreate}
        />
      )}
    </div>
  )
}

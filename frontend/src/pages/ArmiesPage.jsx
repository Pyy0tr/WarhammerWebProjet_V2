import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useArmyStore }      from '../store/armyStore'
import { useAuthStore }      from '../store/authStore'
import { useDataStore }      from '../store/dataStore'
import { useSimulatorStore } from '../store/simulatorStore'

const BLUE       = '#09A2C4'
const BG         = '#041428'
const PANEL      = '#071e38'
const BORDER     = 'rgba(9,162,196,0.15)'
const BORDER_ACT = 'rgba(9,162,196,0.55)'
const TEXT_H     = '#FFFFFF'
const TEXT_BODY  = '#C8DCE8'
const TEXT_MUTED = 'rgba(184,210,228,0.45)'
const RED        = '#e05c5c'

// ── Keyword mapper (subset of AttackerPanel's mapKeywords) ────────────────────

function mapKeywords(kwStrings) {
  if (!kwStrings?.length) return []
  const result = []
  for (const raw of kwStrings) {
    const sus   = raw.match(/sustained\s*hits\s*(\d+|D\d+)/i)
    const rf    = raw.match(/rapid\s*fire\s*(\d+|D\d+)/i)
    const melta = raw.match(/melta\s*(\d+|D\d+)/i)
    const anti  = raw.match(/anti-(\w+)\s*(\d+)\+/i)
    const ea    = raw.match(/extra\s*attacks?\s*(\d+|D\d+)/i)
    if (sus)   { result.push({ type: 'SUSTAINED_HITS', value: sus[1] }); continue }
    if (rf)    { result.push({ type: 'RAPID_FIRE', value: rf[1] }); continue }
    if (melta) { result.push({ type: 'MELTA', value: melta[1] }); continue }
    if (anti)  { result.push({ type: 'ANTI', target: anti[1].toUpperCase(), threshold: parseInt(anti[2]) }); continue }
    if (ea)    { result.push({ type: 'EXTRA_ATTACKS', value: ea[1] }); continue }
    const simple = raw.toUpperCase().replace(/[\s-]/g, '_')
    result.push({ type: simple })
  }
  return result
}

// ── Small helpers ─────────────────────────────────────────────────────────────

function Chip({ children }) {
  return (
    <span style={{
      fontFamily: 'Space Mono, monospace', fontSize: '8px',
      letterSpacing: '1px', textTransform: 'uppercase',
      color: TEXT_MUTED, border: `1px solid ${BORDER}`,
      padding: '2px 6px',
    }}>
      {children}
    </span>
  )
}

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
        color: danger ? (hov ? RED : 'rgba(224,92,92,0.4)') : (hov ? TEXT_H : TEXT_MUTED),
        cursor: 'pointer', padding: '2px 6px',
        fontFamily: 'Space Mono, monospace', fontSize: '13px', lineHeight: 1,
        transition: 'color 100ms',
      }}
    >
      {children}
    </button>
  )
}

function SmallBtn({ children, onClick, primary }) {
  const [hov, setHov] = useState(false)
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background: primary ? (hov ? 'rgba(9,162,196,0.9)' : BLUE) : (hov ? 'rgba(9,162,196,0.08)' : 'none'),
        border: `1px solid ${hov ? BLUE : BORDER}`,
        color: primary ? BG : (hov ? BLUE : TEXT_MUTED),
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
          background: 'rgba(9,162,196,0.05)',
          border: `1px solid ${BLUE}`,
          outline: 'none', padding: '4px 8px',
          borderRadius: 0,
        }}
      />
    )
  }

  return (
    <span
      onClick={() => setEditing(true)}
      title="Click to rename"
      style={{ ...style, cursor: 'text', borderBottom: `1px dashed ${BORDER_ACT}` }}
    >
      {value}
    </span>
  )
}

// ── Army unit card ────────────────────────────────────────────────────────────

function ArmyUnitCard({ entry, user }) {
  const removeUnit    = useArmyStore((s) => s.removeUnit)
  const updateUnit    = useArmyStore((s) => s.updateUnit)
  const weaponsById   = useDataStore((s) => s.weaponsById)
  const setAttacker   = useSimulatorStore((s) => s.setAttacker)
  const setWeapon     = useSimulatorStore((s) => s.setWeapon)
  const setDefender   = useSimulatorStore((s) => s.setDefender)
  const navigate      = useNavigate()

  const [hov, setHov] = useState(false)

  const loadAsAttacker = () => {
    // Use first weapon of the unit
    const weaponRef = entry.weapons?.[0]
    const weapon    = weaponRef ? weaponsById[weaponRef.id] : null
    setAttacker({ models: entry.models })
    if (weapon) {
      setWeapon({
        name:     weapon.name,
        attacks:  weapon.A  ?? '2',
        skill:    weapon.BS ?? weapon.WS ?? 4,
        strength: weapon.S  ?? 4,
        ap:       weapon.AP ?? 0,
        damage:   weapon.D  ?? '1',
        keywords: mapKeywords(weapon.kw ?? []),
      })
    }
    navigate('/simulator')
  }

  const loadAsDefender = () => {
    setDefender({
      toughness: entry.T     ?? 4,
      save:      entry.Sv    ?? 4,
      invuln:    entry.invuln ?? null,
      wounds:    entry.W     ?? 2,
      models:    entry.models,
      fnp:       null,
      keywords:  entry.kw    ?? [],
    })
    navigate('/simulator')
  }

  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        border: `1px solid ${hov ? BORDER_ACT : BORDER}`,
        padding: '14px 16px',
        transition: 'border-color 120ms',
        background: hov ? 'rgba(9,162,196,0.025)' : 'transparent',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>

        {/* Left: name + stats */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontFamily: 'Space Mono, monospace', fontSize: '12px',
            fontWeight: 700, color: TEXT_H, marginBottom: '6px',
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>
            {entry.name}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '10px' }}>
            <Chip>T{entry.T}</Chip>
            <Chip>SV{entry.Sv}+</Chip>
            <Chip>W{entry.W}</Chip>
            {entry.invuln && <Chip>{entry.invuln}++</Chip>}
          </div>

          {/* Models */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontFamily: 'Space Mono, monospace', fontSize: '9px', color: TEXT_MUTED, letterSpacing: '1px' }}>
              Models
            </span>
            <input
              type="number"
              min={1}
              value={entry.models}
              onChange={(e) => {
                const v = Math.max(1, parseInt(e.target.value) || 1)
                updateUnit(entry.uid, { models: v }, user)
              }}
              style={{
                width: '52px', background: 'rgba(9,162,196,0.05)',
                border: `1px solid ${BORDER}`, color: BLUE,
                fontFamily: 'Space Mono, monospace', fontSize: '11px',
                padding: '3px 6px', outline: 'none', textAlign: 'center',
              }}
            />
          </div>
        </div>

        {/* Right: actions */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px', flexShrink: 0 }}>
          <IconBtn danger onClick={() => removeUnit(entry.uid, user)}>×</IconBtn>
          <div style={{ display: 'flex', gap: '4px', marginTop: '6px' }}>
            <SmallBtn onClick={loadAsAttacker}>ATT →</SmallBtn>
            <SmallBtn onClick={loadAsDefender}>CIB →</SmallBtn>
          </div>
        </div>
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
      unit_id: unit.id,
      name:    unit.name,
      T:       unit.T,
      Sv:      unit.Sv,
      W:       unit.W,
      invuln:  unit.invuln ?? null,
      kw:      unit.kw ?? [],
      weapons: unit.weapons ?? [],
      max_models: unit.max_models,
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
          letterSpacing: '2px', textTransform: 'uppercase', color: TEXT_MUTED,
        }}>
          No army selected
        </div>
        <button
          onClick={onNewArmy}
          style={{
            background: BLUE, border: `1px solid ${BLUE}`,
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
            fontFamily: 'Space Mono, monospace', fontSize: '18px',
            fontWeight: 700, letterSpacing: '1px', color: TEXT_H,
          }}
        />
        {confirm ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontFamily: 'Space Mono, monospace', fontSize: '9px', color: RED, letterSpacing: '1px' }}>
              Confirm deletion?
            </span>
            <SmallBtn onClick={() => { deleteArmy(army.id, user); setConfirm(false) }}>Yes</SmallBtn>
            <SmallBtn onClick={() => setConfirm(false)}>No</SmallBtn>
          </div>
        ) : (
          <SmallBtn onClick={() => setConfirm(true)}>Delete army</SmallBtn>
        )}
      </div>

      {/* ── Divider ── */}
      <div style={{ borderTop: `1px solid ${BORDER}`, marginBottom: '28px' }} />

      {/* ── Search ── */}
      <div style={{ marginBottom: '28px', position: 'relative' }}>
        <div style={{
          fontFamily: 'Space Mono, monospace', fontSize: '9px',
          letterSpacing: '2px', textTransform: 'uppercase', color: TEXT_MUTED,
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
            background: 'rgba(9,162,196,0.04)', border: `1px solid ${query ? BLUE : BORDER}`,
            color: TEXT_BODY, fontFamily: 'Space Mono, monospace', fontSize: '12px',
            padding: '10px 14px', outline: 'none', transition: 'border-color 120ms',
          }}
        />

        {results.length > 0 && (
          <div style={{
            position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 20,
            background: PANEL, border: `1px solid ${BORDER_ACT}`,
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
                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(9,162,196,0.07)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              >
                <div>
                  <div style={{ fontFamily: 'Space Mono, monospace', fontSize: '12px', color: TEXT_H }}>
                    {unit.name}
                  </div>
                  <div style={{ fontFamily: 'Space Mono, monospace', fontSize: '9px', color: TEXT_MUTED, marginTop: '2px' }}>
                    T{unit.T} · SV{unit.Sv}+ · W{unit.W}
                    {unit.invuln ? ` · ${unit.invuln}++` : ''}
                  </div>
                </div>
                <span style={{ fontFamily: 'Space Mono, monospace', fontSize: '9px', color: BLUE }}>+ Add</span>
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
        letterSpacing: '2px', textTransform: 'uppercase', color: TEXT_MUTED,
        marginBottom: '14px',
      }}>
        Units ({army.units.length})
      </div>

      {army.units.length === 0 ? (
        <div style={{ display: 'flex', gap: '16px', paddingTop: '8px', flexWrap: 'wrap' }}>
          {/* Option A — Search */}
          <div
            onClick={() => searchRef.current?.focus()}
            style={{
              flex: 1, minWidth: '200px', padding: '24px',
              border: `1px solid ${BORDER_ACT}`, cursor: 'pointer',
              background: 'rgba(9,162,196,0.03)', transition: 'background 120ms',
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(9,162,196,0.07)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(9,162,196,0.03)'}
          >
            <div style={{
              fontFamily: 'Space Mono, monospace', fontSize: '20px',
              color: BLUE, marginBottom: '12px', lineHeight: 1,
            }}>⌕</div>
            <div style={{
              fontFamily: 'Space Mono, monospace', fontSize: '11px',
              fontWeight: 700, color: TEXT_H, letterSpacing: '1px', marginBottom: '8px',
            }}>
              Search & add units
            </div>
            <div style={{
              fontFamily: 'Space Mono, monospace', fontSize: '9px',
              color: TEXT_MUTED, lineHeight: 1.6, letterSpacing: '0.5px',
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
              color: TEXT_MUTED, marginBottom: '12px', lineHeight: 1,
            }}>↑</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <div style={{
                fontFamily: 'Space Mono, monospace', fontSize: '11px',
                fontWeight: 700, color: TEXT_BODY, letterSpacing: '1px',
              }}>
                Import BattleScribe
              </div>
              <span style={{
                fontFamily: 'Space Mono, monospace', fontSize: '7px',
                letterSpacing: '1.5px', textTransform: 'uppercase',
                color: BLUE, border: `1px solid ${BLUE}`, padding: '1px 5px',
              }}>
                Soon
              </span>
            </div>
            <div style={{
              fontFamily: 'Space Mono, monospace', fontSize: '9px',
              color: TEXT_MUTED, lineHeight: 1.6, letterSpacing: '0.5px',
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

  const fmt = (iso) => new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' })

  return (
    <div style={{
      width: '260px', flexShrink: 0,
      borderRight: `1px solid ${BORDER}`,
      display: 'flex', flexDirection: 'column',
      background: 'rgba(7,30,56,0.4)',
    }}>
      {/* Header */}
      <div style={{
        padding: '16px 16px 12px',
        borderBottom: `1px solid ${BORDER}`,
      }}>
        <div style={{
          fontFamily: 'Space Mono, monospace', fontSize: '9px',
          letterSpacing: '3px', textTransform: 'uppercase', color: TEXT_MUTED,
          marginBottom: '10px',
        }}>
          My Armies
        </div>
        <button
          onClick={onNewArmy}
          style={{
            width: '100%',
            background: BLUE, border: `1px solid ${BLUE}`,
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
            color: TEXT_MUTED, lineHeight: 1.7,
          }}>
            No armies yet.<br />Click <span style={{ color: BLUE }}>+ New Army</span> to get started.
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
                  borderLeft: `3px solid ${active ? BLUE : 'transparent'}`,
                  background: active ? 'rgba(9,162,196,0.06)' : 'transparent',
                  transition: 'background 100ms, border-left-color 100ms',
                }}
                onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = 'rgba(9,162,196,0.03)' }}
                onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = 'transparent' }}
              >
                <div style={{
                  fontFamily: 'Space Mono, monospace', fontSize: '11px',
                  fontWeight: active ? 700 : 400, color: active ? TEXT_H : TEXT_BODY,
                  marginBottom: '4px',
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                }}>
                  {army.name}
                </div>
                <div style={{
                  fontFamily: 'Space Mono, monospace', fontSize: '8px',
                  color: TEXT_MUTED, letterSpacing: '0.5px',
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
          color: TEXT_MUTED, lineHeight: 1.6, letterSpacing: '0.5px',
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
        background: 'rgba(4,20,40,0.85)', backdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: '420px', position: 'relative',
          background: PANEL, border: `1px solid ${BORDER_ACT}`,
          padding: '36px 32px 32px', display: 'flex', flexDirection: 'column', gap: '20px',
        }}
      >
        {/* Close */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute', top: '14px', right: '18px',
            background: 'none', border: 'none',
            color: TEXT_MUTED, fontSize: '20px', cursor: 'pointer', lineHeight: 1,
          }}
        >×</button>

        {/* Title */}
        <div>
          <div style={{
            fontFamily: 'Space Mono, monospace', fontSize: '9px',
            letterSpacing: '3px', textTransform: 'uppercase', color: BLUE, marginBottom: '6px',
          }}>
            New Army
          </div>
          <div style={{
            fontFamily: 'Space Mono, monospace', fontSize: '14px',
            fontWeight: 700, color: TEXT_H,
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
            background: 'rgba(9,162,196,0.05)',
            border: `1px solid ${error ? '#e05c5c' : (name ? BLUE : BORDER_ACT)}`,
            color: TEXT_BODY, fontFamily: 'Space Mono, monospace', fontSize: '13px',
            padding: '12px 14px', outline: 'none', width: '100%', boxSizing: 'border-box',
            transition: 'border-color 120ms',
          }}
        />

        {error && (
          <div style={{
            fontFamily: 'Space Mono, monospace', fontSize: '9px',
            color: '#e05c5c', letterSpacing: '1px', marginTop: '-12px',
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
              background: busy || !name.trim() ? 'rgba(9,162,196,0.2)' : BLUE,
              border: 'none',
              color: busy || !name.trim() ? TEXT_MUTED : BG,
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
              background: 'none', border: `1px solid ${BORDER_ACT}`,
              color: TEXT_MUTED, fontFamily: 'Space Mono, monospace',
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

  const [showModal, setShowModal] = useState(false)

  useEffect(() => { init(user) }, [user, init])

  const handleCreate = async (name) => {
    await create(user, name)
    // Modal closes after this resolves (or throws)
  }

  return (
    <div style={{
      display: 'flex', height: '100vh', paddingTop: '52px',
      background: BG, color: TEXT_BODY,
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

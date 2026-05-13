import { useEffect, useState, useMemo } from 'react'
import {
  ACCENT, BORDER, BG, ERROR, SUCCESS, SURFACE, SURFACE_E, TEXT, TEXT_OFF,
  TEXT_SEC, TEXT_WEAK, TYPE, WARNING,
} from '../theme'

// ── Phase colors ─────────────────────────────────────────────────────────────

const PHASE_COLOR = {
  shooting:  ACCENT,
  fight:     ERROR,
  command:   WARNING,
  movement:  SUCCESS,
  any:       TEXT_WEAK,
}

function phaseColor(phases) {
  if (!phases?.length) return TEXT_WEAK
  const p = phases[0].toLowerCase()
  for (const [key, col] of Object.entries(PHASE_COLOR)) {
    if (p.includes(key)) return col
  }
  return TEXT_WEAK
}

function PhaseChip({ phases }) {
  const label = phases?.length ? phases.map(p => p.replace(/^\w/, c => c.toUpperCase())).join(', ') : '—'
  const color = phaseColor(phases)
  return (
    <span style={{
      ...TYPE.label,
      color,
      border: `1px solid ${color}`,
      padding: '2px 6px',
      borderRadius: '2px',
      opacity: 0.85,
      whiteSpace: 'nowrap',
    }}>
      {label}
    </span>
  )
}

function CpBadge({ cost }) {
  const n = typeof cost === 'number' ? cost : parseInt(cost, 10)
  const color = n >= 2 ? WARNING : ACCENT
  return (
    <span style={{
      ...TYPE.statSm,
      color,
      border: `1px solid ${color}`,
      padding: '1px 7px',
      borderRadius: '2px',
      minWidth: '28px',
      textAlign: 'center',
      display: 'inline-block',
    }}>
      {cost}CP
    </span>
  )
}

// ── Stratagem row ─────────────────────────────────────────────────────────────

function StratRow({ strat }) {
  const [open, setOpen] = useState(false)
  return (
    <div
      style={{
        borderBottom: `1px solid ${BORDER}`,
        cursor: 'pointer',
        transition: 'background 120ms',
        background: open ? 'rgba(47,224,255,0.03)' : 'transparent',
      }}
      onClick={() => setOpen(v => !v)}
    >
      {/* Summary row */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '60px 1fr auto auto',
        gap: '12px',
        alignItems: 'center',
        padding: '10px 16px',
      }}>
        <CpBadge cost={strat.cost} />
        <div>
          <div style={{ ...TYPE.heading, color: TEXT, marginBottom: '2px' }}>{strat.name}</div>
          <div style={{ ...TYPE.label, color: TEXT_WEAK }}>{strat.type}</div>
        </div>
        <PhaseChip phases={strat.phase} />
        <span style={{ ...TYPE.label, color: open ? ACCENT : TEXT_OFF, transition: 'color 120ms' }}>
          {open ? '▲' : '▼'}
        </span>
      </div>

      {/* Expanded details */}
      {open && (
        <div style={{
          padding: '0 16px 14px',
          display: 'flex', flexDirection: 'column', gap: '10px',
        }}>
          {strat.when && (
            <div>
              <div style={{ ...TYPE.label, color: TEXT_WEAK, marginBottom: '4px' }}>When</div>
              <p style={{ ...TYPE.body, fontSize: '13px', margin: 0 }}>{strat.when}</p>
            </div>
          )}
          {strat.target && (
            <div>
              <div style={{ ...TYPE.label, color: TEXT_WEAK, marginBottom: '4px' }}>Target</div>
              <p style={{ ...TYPE.body, fontSize: '13px', margin: 0 }}>{strat.target}</p>
            </div>
          )}
          {strat.effect && (
            <div>
              <div style={{ ...TYPE.label, color: TEXT_WEAK, marginBottom: '4px' }}>Effect</div>
              <p style={{ ...TYPE.body, fontSize: '13px', margin: 0 }}>{strat.effect}</p>
            </div>
          )}
          {strat.restrictions && (
            <div>
              <div style={{ ...TYPE.label, color: WARNING, marginBottom: '4px' }}>Restrictions</div>
              <p style={{ ...TYPE.body, fontSize: '13px', margin: 0, color: TEXT_WEAK }}>{strat.restrictions}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Enhancement card ──────────────────────────────────────────────────────────

function EnhCard({ enh }) {
  return (
    <div style={{
      background: SURFACE_E,
      border: `1px solid ${BORDER}`,
      borderRadius: '3px',
      padding: '12px 14px',
      display: 'flex', flexDirection: 'column', gap: '6px',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
        <div style={{ ...TYPE.heading, color: TEXT }}>{enh.name}</div>
        {enh.cost && (
          <span style={{ ...TYPE.label, color: SUCCESS, border: `1px solid ${SUCCESS}`, padding: '1px 6px', borderRadius: '2px', whiteSpace: 'nowrap' }}>
            {enh.cost} pts
          </span>
        )}
      </div>
      <p style={{ ...TYPE.body, fontSize: '13px', margin: 0 }}>{enh.description}</p>
      {enh.excludes?.length > 0 && (
        <div style={{ ...TYPE.label, color: WARNING }}>
          Excludes: {enh.excludes.join(', ')}
        </div>
      )}
    </div>
  )
}

// ── Detachment section ────────────────────────────────────────────────────────

function DetachmentSection({ det }) {
  const [open, setOpen] = useState(false)
  const hasContent = det.stratagems.length > 0 || det.enhancements.length > 0

  return (
    <div style={{ border: `1px solid ${BORDER}`, borderRadius: '3px', overflow: 'hidden' }}>
      {/* Header */}
      <div
        onClick={() => hasContent && setOpen(v => !v)}
        style={{
          background: SURFACE_E,
          padding: '12px 16px',
          display: 'flex', alignItems: 'center', gap: '12px',
          cursor: hasContent ? 'pointer' : 'default',
          transition: 'background 120ms',
        }}
        onMouseEnter={(e) => { if (hasContent) e.currentTarget.style.background = 'rgba(47,224,255,0.06)' }}
        onMouseLeave={(e) => { e.currentTarget.style.background = SURFACE_E }}
      >
        <div style={{ ...TYPE.heading, color: open ? ACCENT : TEXT, transition: 'color 120ms', flex: 1 }}>
          {det.name}
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {det.stratagems.length > 0 && (
            <span style={{ ...TYPE.label, color: ACCENT, border: `1px solid rgba(47,224,255,0.3)`, padding: '1px 7px', borderRadius: '2px' }}>
              {det.stratagems.length} strats
            </span>
          )}
          {det.enhancements.length > 0 && (
            <span style={{ ...TYPE.label, color: SUCCESS, border: `1px solid rgba(61,220,151,0.3)`, padding: '1px 7px', borderRadius: '2px' }}>
              {det.enhancements.length} enhs
            </span>
          )}
          {hasContent && (
            <span style={{ ...TYPE.label, color: open ? ACCENT : TEXT_OFF, transition: 'color 120ms' }}>
              {open ? '▲' : '▼'}
            </span>
          )}
        </div>
      </div>

      {/* Content */}
      {open && (
        <div style={{ background: SURFACE }}>
          {/* Enhancements */}
          {det.enhancements.length > 0 && (
            <div style={{ padding: '16px' }}>
              <div style={{ ...TYPE.label, color: SUCCESS, marginBottom: '10px' }}>Enhancements</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '10px' }}>
                {det.enhancements.map((e) => <EnhCard key={e.name} enh={e} />)}
              </div>
            </div>
          )}

          {/* Stratagems */}
          {det.stratagems.length > 0 && (
            <div style={det.enhancements.length > 0 ? { borderTop: `1px solid ${BORDER}` } : {}}>
              <div style={{ ...TYPE.label, color: ACCENT, padding: '12px 16px 0' }}>Stratagems</div>
              {det.stratagems.map((s) => <StratRow key={s.name} strat={s} />)}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Army rules ────────────────────────────────────────────────────────────────

function ArmyRulesSection({ rules }) {
  const [open, setOpen] = useState(false)
  if (!rules?.length) return null
  return (
    <div style={{ border: `1px solid ${BORDER}`, borderRadius: '3px', overflow: 'hidden', marginBottom: '16px' }}>
      <div
        onClick={() => setOpen(v => !v)}
        style={{
          background: SURFACE_E, padding: '12px 16px',
          display: 'flex', alignItems: 'center', gap: '12px',
          cursor: 'pointer',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(47,224,255,0.06)' }}
        onMouseLeave={(e) => { e.currentTarget.style.background = SURFACE_E }}
      >
        <div style={{ ...TYPE.heading, color: open ? ACCENT : TEXT, flex: 1, transition: 'color 120ms' }}>
          Army Rules
        </div>
        <span style={{ ...TYPE.label, color: open ? ACCENT : TEXT_OFF }}>{open ? '▲' : '▼'}</span>
      </div>
      {open && (
        <div style={{ background: SURFACE, padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {rules.map((r) => (
            <div key={r.name}>
              {r.name && <div style={{ ...TYPE.heading, color: TEXT, marginBottom: '8px' }}>{r.name}</div>}
              <p style={{ ...TYPE.body, fontSize: '13px', margin: 0, whiteSpace: 'pre-wrap' }}>{r.text}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Core stratagems panel ─────────────────────────────────────────────────────

function CorePanel({ stratagems }) {
  return (
    <div style={{ flex: 1, minWidth: 0, overflowY: 'auto', padding: '24px 28px' }}>
      <div style={{ ...TYPE.display, fontSize: '16px', color: TEXT, marginBottom: '6px' }}>
        Core Stratagems
      </div>
      <div style={{ ...TYPE.body, fontSize: '13px', color: TEXT_SEC, marginBottom: '20px' }}>
        Universal stratagems available to every army.
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
        {stratagems.map((s) => <StratRow key={s.name} strat={s} />)}
      </div>
    </div>
  )
}

// ── Faction detail panel ──────────────────────────────────────────────────────

function FactionPanel({ faction }) {
  const updatedDate = faction.updated
    ? new Date(faction.updated).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
    : null

  return (
    <div style={{ flex: 1, minWidth: 0, overflowY: 'auto', padding: '24px 28px' }}>
      {/* Header */}
      <div style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px', flexWrap: 'wrap', marginBottom: '4px' }}>
          <div style={{ ...TYPE.display, fontSize: '16px', color: TEXT }}>{faction.name}</div>
          {faction.is_subfaction && faction.parent_name && (
            <div style={{ ...TYPE.label, color: TEXT_WEAK }}>Subfaction of {faction.parent_name}</div>
          )}
        </div>
        <div style={{ ...TYPE.label, color: TEXT_OFF }}>
          {faction.detachments.length} detachments
          {updatedDate && ` · Data updated ${updatedDate}`}
        </div>
      </div>

      {/* Army rules */}
      <ArmyRulesSection rules={faction.army_rules} />

      {/* Detachments */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {faction.detachments.map((det) => (
          <DetachmentSection key={det.name} det={det} />
        ))}
      </div>
    </div>
  )
}

// ── Faction list item ─────────────────────────────────────────────────────────

function FactionItem({ faction, selected, onClick }) {
  const [hov, setHov] = useState(false)
  const active = selected || hov
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        padding: '9px 16px',
        cursor: 'pointer',
        background: selected ? 'rgba(47,224,255,0.07)' : hov ? 'rgba(255,255,255,0.03)' : 'transparent',
        borderLeft: `2px solid ${selected ? ACCENT : 'transparent'}`,
        transition: 'background 100ms, border-color 100ms',
        display: 'flex', flexDirection: 'column', gap: '2px',
      }}
    >
      <div style={{ ...TYPE.ui, fontSize: '10px', color: active ? ACCENT : TEXT_SEC, transition: 'color 100ms' }}>
        {faction.name}
      </div>
      {faction.is_subfaction && (
        <div style={{ ...TYPE.label, color: TEXT_OFF, fontSize: '9px' }}>
          {faction.parent_name}
        </div>
      )}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export function DetachmentsPage() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState('core')

  useEffect(() => {
    document.title = "Detachments — Prob'Hammer"
    fetch('/data/gdc.json')
      .then((r) => { if (!r.ok) throw new Error(r.status); return r.json() })
      .then((d) => { setData(d); setLoading(false) })
      .catch((e) => { setError(e.message); setLoading(false) })
  }, [])

  const filtered = useMemo(() => {
    if (!data) return []
    const q = query.trim().toLowerCase()
    if (!q) return data.factions
    return data.factions.filter((f) =>
      f.name.toLowerCase().includes(q) ||
      (f.parent_name || '').toLowerCase().includes(q)
    )
  }, [data, query])

  const fetchedDate = data
    ? new Date(data.fetched_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
    : null

  const selectedFaction = data?.factions.find((f) => f.id === selected)

  // ── Skeleton / error ────────────────────────────────────────────────────────
  if (loading) return (
    <div style={{ paddingTop: '52px', display: 'flex', alignItems: 'center', justifyContent: 'center', height: 'calc(100vh - 52px)', color: TEXT_WEAK, ...TYPE.ui }}>
      Loading data…
    </div>
  )

  if (error) return (
    <div style={{ paddingTop: '52px', display: 'flex', alignItems: 'center', justifyContent: 'center', height: 'calc(100vh - 52px)', color: ERROR, ...TYPE.body }}>
      Failed to load: {error}
    </div>
  )

  return (
    <div style={{ paddingTop: '52px', display: 'flex', height: 'calc(100vh - 52px)', overflow: 'hidden' }}>

      {/* ── Left sidebar ───────────────────────────────────────────────────── */}
      <div style={{
        width: '220px', flexShrink: 0,
        borderRight: `1px solid ${BORDER}`,
        display: 'flex', flexDirection: 'column',
        background: SURFACE,
        overflow: 'hidden',
      }}>
        {/* Search */}
        <div style={{ padding: '12px 12px 8px', borderBottom: `1px solid ${BORDER}` }}>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search faction…"
            style={{
              width: '100%', boxSizing: 'border-box',
              background: 'rgba(47,224,255,0.04)',
              border: `1px solid ${BORDER}`,
              borderRadius: '2px',
              color: TEXT,
              fontFamily: 'Space Mono, monospace',
              fontSize: '11px',
              padding: '7px 10px',
              outline: 'none',
              transition: 'border-color 100ms',
            }}
            onFocus={(e) => { e.target.style.borderColor = ACCENT }}
            onBlur={(e) => { e.target.style.borderColor = BORDER }}
          />
        </div>

        {/* Data source info */}
        <div style={{ padding: '8px 16px', borderBottom: `1px solid ${BORDER}` }}>
          <div style={{ ...TYPE.label, color: TEXT_OFF, lineHeight: 1.5 }}>
            game-datacards/datasources
          </div>
          {fetchedDate && (
            <div style={{ ...TYPE.label, color: TEXT_OFF, marginTop: '2px' }}>
              Fetched {fetchedDate}
            </div>
          )}
        </div>

        {/* Faction list */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {/* Core */}
          <FactionItem
            faction={{ id: 'core', name: 'Core Stratagems', is_subfaction: false }}
            selected={selected === 'core'}
            onClick={() => setSelected('core')}
          />
          <div style={{ height: '1px', background: BORDER, margin: '4px 0' }} />

          {/* Main factions */}
          {filtered.filter(f => !f.is_subfaction).map((f) => (
            <FactionItem
              key={f.id}
              faction={f}
              selected={selected === f.id}
              onClick={() => setSelected(f.id)}
            />
          ))}

          {/* Subfactions */}
          {filtered.some(f => f.is_subfaction) && (
            <>
              <div style={{ ...TYPE.label, color: TEXT_OFF, padding: '10px 16px 4px' }}>Subfactions</div>
              {filtered.filter(f => f.is_subfaction).map((f) => (
                <FactionItem
                  key={f.id}
                  faction={f}
                  selected={selected === f.id}
                  onClick={() => setSelected(f.id)}
                />
              ))}
            </>
          )}

          {filtered.length === 0 && (
            <div style={{ ...TYPE.body, fontSize: '13px', color: TEXT_WEAK, padding: '20px 16px' }}>
              No factions match "{query}"
            </div>
          )}
        </div>
      </div>

      {/* ── Right panel ────────────────────────────────────────────────────── */}
      {selected === 'core' && data ? (
        <CorePanel stratagems={data.core_stratagems} />
      ) : selectedFaction ? (
        <FactionPanel faction={selectedFaction} />
      ) : (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: TEXT_WEAK, ...TYPE.ui }}>
          Select a faction
        </div>
      )}
    </div>
  )
}

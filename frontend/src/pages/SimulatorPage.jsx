import { useRef, useEffect } from 'react'
import { useSimulatorStore } from '../store/simulatorStore'
import { AttackerPanel } from '../components/AttackerPanel'
import { DefenderPanel } from '../components/DefenderPanel'
import { ResultsPanel } from '../components/ResultsPanel'

const BLUE       = '#09A2C4'
const BG         = '#041428'
const TEXT_H     = '#FFFFFF'
const TEXT_MUTED = 'rgba(184,210,228,0.45)'
const PANEL      = '#071e38'
const BORDER     = 'rgba(9,162,196,0.15)'

// ── Step indicator ───────────────────────────────────────────────────────────

const STEPS = [
  { n: 1, label: 'Attack' },
  { n: 2, label: 'Review' },
  { n: 3, label: 'Defender' },
  { n: 4, label: 'Results' },
]

function StepBar({ current, onStep }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '0',
      padding: '0 48px', borderBottom: `1px solid ${BORDER}`,
    }}>
      {STEPS.map((s, i) => {
        const active    = s.n === current
        const completed = s.n < current
        const clickable = s.n < current || (s.n === 2 && current === 1)
        return (
          <button
            key={s.n}
            onClick={() => clickable && onStep(s.n)}
            style={{
              flex: 1, padding: '14px 0 12px',
              background: 'none', border: 'none',
              borderBottom: active ? `2px solid ${BLUE}` : '2px solid transparent',
              cursor: clickable ? 'pointer' : 'default',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              transition: 'border-color 150ms',
            }}
          >
            <span style={{
              width: '20px', height: '20px', borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: active ? BLUE : completed ? 'rgba(9,162,196,0.2)' : 'transparent',
              border: `1px solid ${active || completed ? BLUE : 'rgba(9,162,196,0.25)'}`,
              fontFamily: 'Space Mono, monospace', fontSize: '9px', fontWeight: 700,
              color: active ? BG : completed ? BLUE : TEXT_MUTED,
              transition: 'all 150ms',
            }}>
              {completed ? '\u2713' : s.n}
            </span>
            <span style={{
              fontFamily: 'Space Mono, monospace', fontSize: '9px',
              letterSpacing: '1.5px', textTransform: 'uppercase',
              color: active ? BLUE : completed ? 'rgba(9,162,196,0.6)' : TEXT_MUTED,
              fontWeight: active ? 700 : 400,
              transition: 'color 150ms',
            }}>
              {s.label}
            </span>
          </button>
        )
      })}
    </div>
  )
}

// ── Attack summary card ──────────────────────────────────────────────────────

function AttackCard({ attack, idx, onEdit, onRemove }) {
  const w = attack.weapon
  const kwList = (w.keywords ?? []).map((k) => {
    if (k.type === 'ANTI') return `Anti-${k.target} ${k.threshold}+`
    if (k.value !== undefined) return `${k.type.replace(/_/g, ' ')} ${k.value}`
    return k.type.replace(/_/g, ' ')
  })

  return (
    <div style={{
      border: `1px solid ${BORDER}`, padding: '14px 16px',
      background: PANEL, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
    }}>
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '4px' }}>
          <span style={{
            fontFamily: 'Space Mono, monospace', fontSize: '8px',
            letterSpacing: '1.5px', color: TEXT_MUTED,
          }}>
            #{idx + 1}
          </span>
          <span style={{
            fontFamily: 'Space Mono, monospace', fontSize: '12px',
            fontWeight: 700, color: BLUE,
          }}>
            {w.name || 'Custom weapon'}
          </span>
        </div>
        <div style={{
          fontFamily: 'Space Mono, monospace', fontSize: '10px',
          color: 'rgba(184,210,228,0.6)', letterSpacing: '0.5px',
        }}>
          {attack.models}x &middot; A{w.attacks} &middot; BS{w.skill}+ &middot; S{w.strength} &middot; AP{w.ap} &middot; D{w.damage}
        </div>
        {kwList.length > 0 && (
          <div style={{
            fontFamily: 'Space Mono, monospace', fontSize: '8px',
            color: TEXT_MUTED, marginTop: '4px', letterSpacing: '0.5px', textTransform: 'uppercase',
          }}>
            {kwList.join(' \u00b7 ')}
          </div>
        )}
        {attack.buffs?.length > 0 && (
          <div style={{
            fontFamily: 'Space Mono, monospace', fontSize: '8px',
            color: 'rgba(194,143,133,0.7)', marginTop: '3px', letterSpacing: '0.5px', textTransform: 'uppercase',
          }}>
            {attack.buffs.map((b) => `${b.type.replace(/_/g, ' ')} (${b.value})`).join(' \u00b7 ')}
          </div>
        )}
      </div>
      <div style={{ display: 'flex', gap: '6px', marginLeft: '12px', flexShrink: 0 }}>
        <button
          onClick={() => onEdit(idx)}
          style={{
            background: 'none', border: `1px solid rgba(9,162,196,0.3)`,
            color: BLUE, fontFamily: 'Space Mono, monospace', fontSize: '8px',
            letterSpacing: '1px', textTransform: 'uppercase', padding: '4px 8px',
            cursor: 'pointer', transition: 'border-color 100ms',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = BLUE }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(9,162,196,0.3)' }}
        >
          Edit
        </button>
        <button
          onClick={() => onRemove(idx)}
          style={{
            background: 'none', border: `1px solid rgba(224,92,92,0.3)`,
            color: '#e05c5c', fontFamily: 'Space Mono, monospace', fontSize: '8px',
            letterSpacing: '1px', textTransform: 'uppercase', padding: '4px 8px',
            cursor: 'pointer', transition: 'border-color 100ms',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#e05c5c' }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(224,92,92,0.3)' }}
        >
          ×
        </button>
      </div>
    </div>
  )
}

// ── Step 2: Review attacks ───────────────────────────────────────────────────

function ReviewStep() {
  const attacks      = useSimulatorStore((s) => s.attacks)
  const setStep      = useSimulatorStore((s) => s.setStep)
  const editAttack   = useSimulatorStore((s) => s.editAttack)
  const removeAttack = useSimulatorStore((s) => s.removeAttack)
  const resetAttacker = useSimulatorStore((s) => s.resetAttacker)

  return (
    <div style={{ maxWidth: '640px', margin: '0 auto' }}>
      <div style={{
        fontFamily: 'Space Mono, monospace', fontSize: '8px',
        letterSpacing: '2px', textTransform: 'uppercase', color: TEXT_MUTED,
        marginBottom: '16px',
      }}>
        Attacks configured ({attacks.length})
      </div>

      {attacks.length === 0 && (
        <div style={{
          padding: '32px', border: `1px dashed rgba(9,162,196,0.2)`,
          textAlign: 'center', fontFamily: 'Space Mono, monospace',
          fontSize: '10px', color: TEXT_MUTED,
        }}>
          No attacks yet. Add at least one attack to continue.
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '24px' }}>
        {attacks.map((atk, i) => (
          <AttackCard key={atk._id} attack={atk} idx={i} onEdit={editAttack} onRemove={removeAttack} />
        ))}
      </div>

      <div style={{ display: 'flex', gap: '12px' }}>
        <button
          onClick={() => { resetAttacker(); setStep(1) }}
          style={{
            flex: 1, padding: '12px',
            background: 'transparent', border: `1px solid rgba(9,162,196,0.3)`,
            color: BLUE, fontFamily: 'Space Mono, monospace', fontSize: '9px',
            letterSpacing: '1.5px', textTransform: 'uppercase', cursor: 'pointer',
            transition: 'background 100ms',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(9,162,196,0.06)' }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
        >
          + Add another attack
        </button>
        {attacks.length > 0 && (
          <button
            onClick={() => setStep(3)}
            style={{
              flex: 1, padding: '12px',
              background: 'transparent', border: `1px solid ${BLUE}`,
              color: TEXT_H, fontFamily: 'Space Mono, monospace', fontSize: '9px',
              fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase',
              cursor: 'pointer', transition: 'background 100ms, color 100ms',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = BLUE; e.currentTarget.style.color = BG }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = TEXT_H }}
          >
            Next: Choose Defender \u2192
          </button>
        )}
      </div>
    </div>
  )
}

// ── Step 3: Defender wrapper ─────────────────────────────────────────────────

function DefenderStep() {
  const setStep        = useSimulatorStore((s) => s.setStep)
  const runSimulation  = useSimulatorStore((s) => s.runSimulation)
  const loading        = useSimulatorStore((s) => s.loading)
  const error          = useSimulatorStore((s) => s.error)

  return (
    <div style={{ maxWidth: '560px', margin: '0 auto' }}>
      <DefenderPanel />

      {error && (
        <div style={{
          marginTop: '16px', border: `1px solid rgba(224,92,92,0.5)`,
          padding: '10px 14px', fontFamily: 'Space Mono, monospace',
          fontSize: '10px', letterSpacing: '1.5px', textTransform: 'uppercase',
          color: '#e05c5c',
        }}>
          ERROR \u2014 {error}
        </div>
      )}

      <div style={{ display: 'flex', gap: '12px', marginTop: '28px' }}>
        <button
          onClick={() => setStep(2)}
          style={{
            padding: '12px 20px',
            background: 'transparent', border: `1px solid rgba(9,162,196,0.3)`,
            color: TEXT_MUTED, fontFamily: 'Space Mono, monospace', fontSize: '9px',
            letterSpacing: '1.5px', textTransform: 'uppercase', cursor: 'pointer',
            transition: 'color 100ms',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.color = BLUE }}
          onMouseLeave={(e) => { e.currentTarget.style.color = TEXT_MUTED }}
        >
          \u2190 Back
        </button>
        <button
          onClick={runSimulation}
          disabled={loading}
          style={{
            flex: 1, padding: '14px',
            background: loading ? 'rgba(9,162,196,0.06)' : 'transparent',
            border: `1px solid ${BLUE}`,
            color: loading ? TEXT_MUTED : TEXT_H,
            fontFamily: 'Space Mono, monospace', fontSize: '11px',
            fontWeight: 700, letterSpacing: '3px', textTransform: 'uppercase',
            cursor: loading ? 'default' : 'pointer',
            opacity: loading ? 0.5 : 1,
            transition: 'background 120ms, color 120ms',
          }}
          onMouseEnter={(e) => {
            if (!loading) { e.currentTarget.style.background = BLUE; e.currentTarget.style.color = BG }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = loading ? 'rgba(9,162,196,0.06)' : 'transparent'
            e.currentTarget.style.color = loading ? TEXT_MUTED : TEXT_H
          }}
        >
          {loading ? 'Running\u2026' : 'Run Simulation \u2192'}
        </button>
      </div>
    </div>
  )
}

// ── Step 4: Results wrapper ──────────────────────────────────────────────────

function ResultsStep() {
  const result  = useSimulatorStore((s) => s.result)
  const setStep = useSimulatorStore((s) => s.setStep)
  const attacks = useSimulatorStore((s) => s.attacks)

  return (
    <div>
      {/* Attack summary */}
      {attacks.length > 0 && (
        <div style={{ marginBottom: '28px' }}>
          <div style={{
            fontFamily: 'Space Mono, monospace', fontSize: '8px',
            letterSpacing: '2px', textTransform: 'uppercase', color: TEXT_MUTED,
            marginBottom: '10px',
          }}>
            Attacks ({attacks.length})
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {attacks.map((atk, i) => (
              <div key={atk._id} style={{
                padding: '6px 10px', border: `1px solid ${BORDER}`,
                fontFamily: 'Space Mono, monospace', fontSize: '9px', color: 'rgba(184,210,228,0.6)',
              }}>
                {atk.models}x {atk.weapon.name || 'Custom'}
              </div>
            ))}
          </div>
        </div>
      )}

      <ResultsPanel result={result} />

      <div style={{ display: 'flex', gap: '12px', marginTop: '32px' }}>
        <button
          onClick={() => setStep(2)}
          style={{
            padding: '10px 18px',
            background: 'transparent', border: `1px solid rgba(9,162,196,0.3)`,
            color: TEXT_MUTED, fontFamily: 'Space Mono, monospace', fontSize: '9px',
            letterSpacing: '1.5px', textTransform: 'uppercase', cursor: 'pointer',
            transition: 'color 100ms',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.color = BLUE }}
          onMouseLeave={(e) => { e.currentTarget.style.color = TEXT_MUTED }}
        >
          \u2190 Change attacks
        </button>
        <button
          onClick={() => setStep(3)}
          style={{
            padding: '10px 18px',
            background: 'transparent', border: `1px solid rgba(9,162,196,0.3)`,
            color: TEXT_MUTED, fontFamily: 'Space Mono, monospace', fontSize: '9px',
            letterSpacing: '1.5px', textTransform: 'uppercase', cursor: 'pointer',
            transition: 'color 100ms',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.color = BLUE }}
          onMouseLeave={(e) => { e.currentTarget.style.color = TEXT_MUTED }}
        >
          \u2190 Change defender
        </button>
      </div>
    </div>
  )
}

// ── Separator ────────────────────────────────────────────────────────────────

function Separator() {
  return (
    <div style={{
      fontFamily: 'Space Mono, monospace', fontSize: '9px', letterSpacing: '3px',
      color: BLUE, overflow: 'hidden', whiteSpace: 'nowrap', lineHeight: 1,
      padding: '10px 0', userSelect: 'none', opacity: 0.6,
    }}>
      {'\u2248 '.repeat(300)}
    </div>
  )
}

// ── Step 1: Attack wrapper ───────────────────────────────────────────────────

function AttackStep() {
  const addAttack   = useSimulatorStore((s) => s.addAttack)
  const weapon      = useSimulatorStore((s) => s.attacker.weapon)
  const editingIdx  = useSimulatorStore((s) => s.editingIdx)
  const attacks     = useSimulatorStore((s) => s.attacks)
  const setStep     = useSimulatorStore((s) => s.setStep)

  const hasWeapon = Boolean(weapon.name)

  return (
    <div style={{ maxWidth: '560px', margin: '0 auto' }}>
      <AttackerPanel />

      <div style={{ display: 'flex', gap: '12px', marginTop: '28px' }}>
        <button
          onClick={addAttack}
          disabled={!hasWeapon}
          style={{
            flex: 1, padding: '14px',
            background: 'transparent',
            border: `1px solid ${hasWeapon ? BLUE : 'rgba(9,162,196,0.15)'}`,
            color: hasWeapon ? TEXT_H : TEXT_MUTED,
            fontFamily: 'Space Mono, monospace', fontSize: '10px',
            fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase',
            cursor: hasWeapon ? 'pointer' : 'default',
            opacity: hasWeapon ? 1 : 0.4,
            transition: 'background 120ms, color 120ms',
          }}
          onMouseEnter={(e) => {
            if (hasWeapon) { e.currentTarget.style.background = BLUE; e.currentTarget.style.color = BG }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent'
            e.currentTarget.style.color = hasWeapon ? TEXT_H : TEXT_MUTED
          }}
        >
          {editingIdx !== null ? 'Save changes \u2192' : 'Confirm attack \u2192'}
        </button>
      </div>

      {attacks.length > 0 && (
        <div style={{
          marginTop: '16px', textAlign: 'center',
          fontFamily: 'Space Mono, monospace', fontSize: '9px', color: TEXT_MUTED,
        }}>
          {attacks.length} attack{attacks.length > 1 ? 's' : ''} already configured \u2014{' '}
          <button
            onClick={() => setStep(2)}
            style={{
              background: 'none', border: 'none', color: BLUE,
              fontFamily: 'Space Mono, monospace', fontSize: '9px',
              cursor: 'pointer', textDecoration: 'underline', padding: 0,
            }}
          >
            review
          </button>
        </div>
      )}
    </div>
  )
}

// ── Main page ────────────────────────────────────────────────────────────────

export function SimulatorPage() {
  const step    = useSimulatorStore((s) => s.step)
  const setStep = useSimulatorStore((s) => s.setStep)

  const contentRef = useRef(null)
  useEffect(() => {
    contentRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [step])

  return (
    <div style={{ color: '#C8DCE8', minHeight: '100vh', paddingTop: '52px' }}>

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div style={{ padding: '0 48px' }}>
        <Separator />
        <div style={{ padding: '18px 0 14px' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '16px' }}>
            <h1 style={{
              fontFamily: 'Space Mono, monospace', fontWeight: 700,
              fontSize: 'clamp(18px, 2vw, 26px)', letterSpacing: '0.05em',
              textTransform: 'uppercase', lineHeight: 1, color: TEXT_H,
            }}>
              Probability Simulator
            </h1>
            <span style={{
              fontFamily: 'Space Mono, monospace', fontSize: '10px',
              letterSpacing: '2px', textTransform: 'uppercase', color: TEXT_MUTED,
            }}>
              Monte Carlo &middot; WH40K 10e
            </span>
          </div>
        </div>
        <Separator />
      </div>

      {/* ── Step bar ────────────────────────────────────────────────────── */}
      <StepBar current={step} onStep={setStep} />

      {/* ── Content ─────────────────────────────────────────────────────── */}
      <section ref={contentRef} style={{ padding: '36px 48px 80px', minHeight: 'calc(100vh - 200px)' }}>
        {step === 1 && <AttackStep />}
        {step === 2 && <ReviewStep />}
        {step === 3 && <DefenderStep />}
        {step === 4 && <ResultsStep />}
      </section>

      {/* ── Footer ──────────────────────────────────────────────────────── */}
      <div style={{ padding: '0 48px 24px' }}>
        <Separator />
        <div style={{
          display: 'flex', justifyContent: 'space-between', paddingTop: '12px',
          fontFamily: 'Space Mono, monospace', fontSize: '9px',
          letterSpacing: '2px', textTransform: 'uppercase', color: TEXT_MUTED,
        }}>
          <span>WH40K PROBABILITY ENGINE &mdash; V2</span>
          <span>SIMULATION RUNS IN BROWSER &mdash; ZERO LATENCY</span>
        </div>
      </div>
    </div>
  )
}

import { useRef, useEffect } from 'react'
import { useSimulatorStore } from '../store/simulatorStore'
import { AttackerPanel } from '../components/AttackerPanel'
import { DefenderPanel } from '../components/DefenderPanel'
import { ResultsPanel } from '../components/ResultsPanel'

const BLUE = '#09A2C4'
const BG   = '#041428'

function Separator() {
  return (
    <div style={{
      fontFamily: 'Space Mono, monospace', fontSize: '9px', letterSpacing: '3px',
      color: BLUE, overflow: 'hidden', whiteSpace: 'nowrap', lineHeight: 1,
      padding: '10px 0', userSelect: 'none', opacity: 0.6,
    }}>
      {'≈ '.repeat(300)}
    </div>
  )
}

export function SimulatorPage() {
  const result        = useSimulatorStore((s) => s.result)
  const loading       = useSimulatorStore((s) => s.loading)
  const error         = useSimulatorStore((s) => s.error)
  const runSimulation = useSimulatorStore((s) => s.runSimulation)

  const resultsRef = useRef(null)
  const prevResult = useRef(null)

  useEffect(() => {
    if (result && result !== prevResult.current) {
      prevResult.current = result
      setTimeout(() => {
        resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 60)
    }
  }, [result])

  return (
    <div style={{ color: BLUE, minHeight: '100vh', paddingTop: '52px' }}>

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div style={{ padding: '0 48px' }}>
        <Separator />
        <div style={{ padding: '18px 0 14px' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '16px' }}>
            <h1 style={{
              fontFamily: 'Space Mono, monospace', fontWeight: 700,
              fontSize: 'clamp(16px, 2vw, 24px)', letterSpacing: '0.05em',
              textTransform: 'uppercase', lineHeight: 1,
            }}>
              Probability Simulator
            </h1>
            <span style={{
              fontFamily: 'Space Mono, monospace', fontSize: '8px',
              letterSpacing: '2px', textTransform: 'uppercase', opacity: 0.4,
            }}>
              Monte Carlo · WH40K 10e
            </span>
          </div>
        </div>
        <Separator />
      </div>

      {/* ── Selection section (fills viewport) ───────────────────────────── */}
      <section style={{ display: 'flex', flexDirection: 'column', minHeight: 'calc(100vh - 112px)' }}>

        {/* Two panels side by side */}
        <div style={{ display: 'flex', flex: 1 }}>

          {/* LEFT — Attacker */}
          <div style={{
            flex: 1,
            borderRight: `1px solid rgba(9,162,196,0.25)`,
            padding: '36px 40px 36px 48px',
            overflowY: 'auto',
          }}>
            <AttackerPanel />
          </div>

          {/* RIGHT — Defender */}
          <div style={{
            flex: 1,
            padding: '36px 48px 36px 40px',
            overflowY: 'auto',
          }}>
            <DefenderPanel />
          </div>
        </div>

        {/* Run button — full width at the bottom */}
        <div style={{
          borderTop: `1px solid rgba(9,162,196,0.25)`,
          padding: '20px 48px 28px',
        }}>
          {error && (
            <div style={{
              marginBottom: '12px', border: `1px solid ${BLUE}`,
              padding: '10px 14px', fontFamily: 'Space Mono, monospace',
              fontSize: '8.5px', letterSpacing: '1.5px', textTransform: 'uppercase',
            }}>
              ERROR — {error}
            </div>
          )}
          <button
            onClick={runSimulation}
            disabled={loading}
            style={{
              display: 'block', width: '100%',
              border: `1px solid ${BLUE}`,
              background: loading ? `rgba(9,162,196,0.06)` : 'transparent',
              color: BLUE,
              fontFamily: 'Space Mono, monospace', fontSize: '11px',
              fontWeight: 700, letterSpacing: '4px', textTransform: 'uppercase',
              padding: '16px', borderRadius: 0,
              cursor: loading ? 'default' : 'pointer',
              opacity: loading ? 0.5 : 1,
              transition: 'background 120ms, color 120ms, opacity 120ms',
            }}
            onMouseEnter={(e) => {
              if (!loading) { e.currentTarget.style.background = BLUE; e.currentTarget.style.color = BG }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent'
              e.currentTarget.style.color = BLUE
            }}
          >
            {loading ? 'Running…' : 'Run Simulation →'}
          </button>
        </div>
      </section>

      {/* ── Separator ─────────────────────────────────────────────────────── */}
      <div style={{ padding: '0 48px' }}>
        <Separator />
      </div>

      {/* ── Results section ───────────────────────────────────────────────── */}
      <section ref={resultsRef} style={{ minHeight: '80vh', padding: '36px 48px 80px' }}>
        <div style={{
          fontFamily: 'Space Mono, monospace', fontSize: '8.5px',
          letterSpacing: '3px', textTransform: 'uppercase',
          opacity: 0.45, marginBottom: '32px',
        }}>
          Results
        </div>

        <div
          key={result ? `${result.summary.mean_damage}-${result.n_trials}` : 'empty'}
          className={result ? 'results-enter' : undefined}
        >
          <ResultsPanel result={result} />
        </div>
      </section>

      {/* ── Footer ────────────────────────────────────────────────────────── */}
      <div style={{ padding: '0 48px 24px' }}>
        <Separator />
        <div style={{
          display: 'flex', justifyContent: 'space-between', paddingTop: '12px',
          fontFamily: 'Space Mono, monospace', fontSize: '8px',
          letterSpacing: '2px', textTransform: 'uppercase', opacity: 0.35,
        }}>
          <span>WH40K PROBABILITY ENGINE — V2</span>
          <span>SIMULATION RUNS IN BROWSER — ZERO LATENCY</span>
        </div>
      </div>

    </div>
  )
}

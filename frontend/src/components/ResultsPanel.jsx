import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from 'recharts'

const BLUE   = '#09A2C4'
const BG     = '#041428'
const ACCENT = '#C28F85'

const StatRow = ({ label, value, highlight = false }) => (
  <div style={{
    display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
    padding: '10px 0',
    borderBottom: '1px solid rgba(9,162,196,0.12)',
  }}>
    <span style={{
      fontFamily: 'Space Mono, monospace', fontSize: '9px',
      letterSpacing: '1.5px', textTransform: 'uppercase',
      opacity: highlight ? 0.8 : 0.5,
    }}>
      {label}
    </span>
    <span style={{
      fontFamily: 'Space Mono, monospace',
      fontSize: highlight ? '15px' : '13px',
      fontWeight: 700,
      opacity: highlight ? 1 : 0.85,
    }}>
      {value}
    </span>
  </div>
)

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: BG, border: `1px solid ${BLUE}`,
      padding: '8px 12px', fontFamily: 'Space Mono, monospace',
      fontSize: '9px', letterSpacing: '1.5px', color: BLUE,
    }}>
      <div style={{ marginBottom: '3px', opacity: 0.5 }}>DAMAGE {label}</div>
      <div style={{ fontWeight: 700 }}>{(payload[0].value * 100).toFixed(1)}%</div>
    </div>
  )
}

export function ResultsPanel({ result }) {
  if (!result) {
    return (
      <div style={{ paddingTop: '16px' }}>
        {/* Placeholder big number */}
        <div style={{
          fontFamily: 'Space Mono, monospace', fontWeight: 700,
          fontSize: 'clamp(64px, 8vw, 100px)', lineHeight: 1,
          opacity: 0.08, letterSpacing: '-2px',
        }}>
          —
        </div>
        <div style={{
          fontFamily: 'Space Mono, monospace', fontSize: '9px',
          letterSpacing: '3px', textTransform: 'uppercase',
          opacity: 0.25, marginTop: '12px',
        }}>
          Mean damage
        </div>
        <div style={{
          marginTop: '40px',
          fontFamily: 'Georgia, serif', fontSize: '14px',
          lineHeight: 1.75, opacity: 0.3, fontStyle: 'italic',
          maxWidth: '320px',
        }}>
          Configure the attacker and defender parameters, then run the simulation to compute the damage distribution.
        </div>
      </div>
    )
  }

  const { summary, damage_histogram, kill_probabilities, n_trials } = result
  const maxProb = Math.max(...damage_histogram.map((b) => b.probability))

  return (
    <div>
      {/* ── Primary result — big number ───────────────────────────────────── */}
      <div style={{ marginBottom: '8px' }}>
        <div style={{
          fontFamily: 'Space Mono, monospace', fontWeight: 700,
          fontSize: 'clamp(64px, 8vw, 100px)', lineHeight: 1,
          letterSpacing: '-2px', color: ACCENT,
        }}>
          {summary.mean_damage.toFixed(2)}
        </div>
        <div style={{
          fontFamily: 'Space Mono, monospace', fontSize: '9px',
          letterSpacing: '3px', textTransform: 'uppercase',
          opacity: 0.5, marginTop: '8px',
        }}>
          Mean damage output
        </div>
      </div>

      <div style={{ borderTop: `1px solid rgba(9,162,196,0.2)`, margin: '24px 0 4px' }} />

      {/* ── Stat rows ────────────────────────────────────────────────────── */}
      <StatRow label="Median damage"      value={summary.median_damage}                 highlight />
      <StatRow label="Avg models killed"  value={summary.mean_models_killed.toFixed(2)} highlight />
      <StatRow label="Std deviation"      value={summary.std_dev.toFixed(2)} />
      <StatRow label="P25 — P75"          value={`${summary.p25} — ${summary.p75}`} />
      <StatRow label="P10 — P90"          value={`${summary.p10} — ${summary.p90}`} />
      <StatRow label="Trials"             value={n_trials.toLocaleString()} />

      <div style={{ borderTop: `1px solid rgba(9,162,196,0.2)`, margin: '24px 0 16px' }} />

      {/* ── Histogram ────────────────────────────────────────────────────── */}
      <div style={{
        fontFamily: 'Space Mono, monospace', fontSize: '8px',
        letterSpacing: '2.5px', textTransform: 'uppercase',
        opacity: 0.4, marginBottom: '14px',
      }}>
        FIG.003 — Damage distribution
      </div>

      <ResponsiveContainer width="100%" height={140}>
        <BarChart
          data={damage_histogram}
          margin={{ top: 0, right: 0, bottom: 0, left: -20 }}
          barCategoryGap="18%"
        >
          <XAxis
            dataKey="damage"
            tick={{ fill: BLUE, fontSize: 8, fontFamily: 'Space Mono, monospace', opacity: 0.55 }}
            tickLine={{ stroke: BLUE, opacity: 0.25 }}
            axisLine={{ stroke: BLUE, opacity: 0.25 }}
          />
          <YAxis
            tickFormatter={(v) => `${(v * 100).toFixed(0)}%`}
            tick={{ fill: BLUE, fontSize: 8, fontFamily: 'Space Mono, monospace', opacity: 0.55 }}
            tickLine={{ stroke: BLUE, opacity: 0.25 }}
            axisLine={{ stroke: BLUE, opacity: 0.25 }}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(9,162,196,0.04)' }} />
          <Bar dataKey="probability" radius={0}>
            {damage_histogram.map((entry) => (
              <Cell
                key={entry.damage}
                fill={entry.probability === maxProb ? ACCENT : BLUE}
                opacity={entry.probability === maxProb ? 0.9 : 0.35}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      <div style={{ borderTop: `1px solid rgba(9,162,196,0.2)`, margin: '20px 0 16px' }} />

      {/* ── Kill probabilities ───────────────────────────────────────────── */}
      <div style={{
        fontFamily: 'Space Mono, monospace', fontSize: '8px',
        letterSpacing: '2.5px', textTransform: 'uppercase',
        opacity: 0.4, marginBottom: '14px',
      }}>
        P(≥ k models destroyed)
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
        {Object.entries(kill_probabilities).map(([k, v]) => (
          <div key={k} style={{
            border: `1px solid rgba(9,162,196,0.35)`,
            padding: '6px 14px',
            fontFamily: 'Space Mono, monospace',
          }}>
            <span style={{ fontSize: '8px', letterSpacing: '1px', opacity: 0.5 }}>≥{k}  </span>
            <span style={{ fontSize: '13px', fontWeight: 700 }}>{(v * 100).toFixed(1)}%</span>
          </div>
        ))}
      </div>
    </div>
  )
}

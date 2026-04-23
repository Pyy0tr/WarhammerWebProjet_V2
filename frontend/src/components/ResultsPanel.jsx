import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from 'recharts'
import { ACCENT, BG, BORDER, TEXT, TEXT_SEC, TEXT_WEAK, HIGHLIGHT, SURFACE } from '../theme'

const StatRow = ({ label, value, highlight = false }) => (
  <div style={{
    display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
    padding: '10px 0',
    borderBottom: `1px solid ${BORDER}`,
  }}>
    <span style={{
      fontFamily: 'Space Mono, monospace', fontSize: '9px',
      letterSpacing: '1.5px', textTransform: 'uppercase',
      color: highlight ? TEXT_SEC : TEXT_WEAK,
    }}>
      {label}
    </span>
    <span style={{
      fontFamily: 'Space Mono, monospace',
      fontSize: highlight ? '15px' : '13px',
      fontWeight: 700,
      color: highlight ? TEXT : TEXT_SEC,
    }}>
      {value}
    </span>
  </div>
)

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: BG, border: `1px solid ${ACCENT}`,
      padding: '8px 12px', fontFamily: 'Space Mono, monospace',
      fontSize: '9px', letterSpacing: '1.5px', color: TEXT,
    }}>
      <div style={{ marginBottom: '3px', color: TEXT_WEAK }}>DAMAGE {label}</div>
      <div style={{ fontWeight: 700, color: ACCENT }}>{(payload[0].value * 100).toFixed(1)}%</div>
    </div>
  )
}

export function ResultsPanel({ result }) {
  if (!result) {
    return (
      <div style={{ paddingTop: '16px' }}>
        <div style={{
          fontFamily: 'Space Mono, monospace', fontWeight: 700,
          fontSize: 'clamp(64px, 8vw, 100px)', lineHeight: 1,
          opacity: 0.08, letterSpacing: '-2px', color: TEXT,
        }}>
          —
        </div>
        <div style={{
          fontFamily: 'Space Mono, monospace', fontSize: '9px',
          letterSpacing: '3px', textTransform: 'uppercase',
          color: TEXT_WEAK, marginTop: '12px',
        }}>
          Mean damage
        </div>
        <div style={{
          marginTop: '40px',
          fontFamily: 'Georgia, serif', fontSize: '14px',
          lineHeight: 1.75, color: TEXT_WEAK, fontStyle: 'italic',
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
      {/* Primary result */}
      <div style={{ marginBottom: '8px' }}>
        <div style={{
          fontFamily: 'Space Mono, monospace', fontWeight: 700,
          fontSize: 'clamp(64px, 8vw, 100px)', lineHeight: 1,
          letterSpacing: '-2px', color: HIGHLIGHT,
        }}>
          {summary.mean_damage.toFixed(2)}
        </div>
        <div style={{
          fontFamily: 'Space Mono, monospace', fontSize: '9px',
          letterSpacing: '3px', textTransform: 'uppercase',
          color: TEXT_WEAK, marginTop: '8px',
        }}>
          Mean damage output
        </div>
      </div>

      <div style={{ borderTop: `1px solid ${BORDER}`, margin: '24px 0 4px' }} />

      <StatRow label="Median damage"      value={summary.median_damage}                 highlight />
      <StatRow label="Avg models killed"  value={summary.mean_models_killed.toFixed(2)} highlight />
      <StatRow label="Std deviation"      value={summary.std_dev.toFixed(2)} />
      <StatRow label="P25 — P75"          value={`${summary.p25} — ${summary.p75}`} />
      <StatRow label="P10 — P90"          value={`${summary.p10} — ${summary.p90}`} />
      <StatRow label="Trials"             value={n_trials.toLocaleString()} />

      <div style={{ borderTop: `1px solid ${BORDER}`, margin: '24px 0 16px' }} />

      {/* Histogram */}
      <div style={{
        fontFamily: 'Space Mono, monospace', fontSize: '8px',
        letterSpacing: '2.5px', textTransform: 'uppercase',
        color: TEXT_WEAK, marginBottom: '14px',
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
            tick={{ fill: TEXT_WEAK, fontSize: 8, fontFamily: 'Space Mono, monospace' }}
            tickLine={{ stroke: BORDER }}
            axisLine={{ stroke: BORDER }}
          />
          <YAxis
            tickFormatter={(v) => `${(v * 100).toFixed(0)}%`}
            tick={{ fill: TEXT_WEAK, fontSize: 8, fontFamily: 'Space Mono, monospace' }}
            tickLine={{ stroke: BORDER }}
            axisLine={{ stroke: BORDER }}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(47,224,255,0.04)' }} />
          <Bar dataKey="probability" radius={0}>
            {damage_histogram.map((entry) => (
              <Cell
                key={entry.damage}
                fill={entry.probability === maxProb ? HIGHLIGHT : ACCENT}
                opacity={entry.probability === maxProb ? 0.9 : 0.4}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      <div style={{ borderTop: `1px solid ${BORDER}`, margin: '20px 0 16px' }} />

      {/* Kill probabilities */}
      <div style={{
        fontFamily: 'Space Mono, monospace', fontSize: '8px',
        letterSpacing: '2.5px', textTransform: 'uppercase',
        color: TEXT_WEAK, marginBottom: '14px',
      }}>
        P(≥ k models destroyed)
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
        {Object.entries(kill_probabilities).map(([k, v]) => (
          <div key={k} style={{
            border: `1px solid ${BORDER}`,
            padding: '6px 14px',
            fontFamily: 'Space Mono, monospace',
          }}>
            <span style={{ fontSize: '8px', letterSpacing: '1px', color: TEXT_WEAK }}>≥{k}  </span>
            <span style={{ fontSize: '13px', fontWeight: 700, color: TEXT }}>{(v * 100).toFixed(1)}%</span>
          </div>
        ))}
      </div>
    </div>
  )
}

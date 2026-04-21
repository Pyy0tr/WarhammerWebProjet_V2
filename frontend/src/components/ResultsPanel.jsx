import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from 'recharts'

function StatBox({ label, value }) {
  return (
    <div className="bg-gray-800 rounded-lg p-3 text-center">
      <div className="text-xl font-bold text-white">{value}</div>
      <div className="text-xs text-gray-400 mt-1">{label}</div>
    </div>
  )
}

export function ResultsPanel({ result }) {
  if (!result) {
    return (
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 flex items-center justify-center min-h-48">
        <p className="text-gray-600 text-sm">Run a simulation to see results.</p>
      </div>
    )
  }

  const { summary, damage_histogram, kill_probabilities, n_trials } = result

  const maxProb = Math.max(...damage_histogram.map((b) => b.probability))

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex flex-col gap-5">
      <h2 className="text-sm font-semibold text-green-400 uppercase tracking-widest">
        Results <span className="text-gray-600 font-normal normal-case">({n_trials} trials)</span>
      </h2>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <StatBox label="Mean damage" value={summary.mean_damage.toFixed(2)} />
        <StatBox label="Median" value={summary.median_damage} />
        <StatBox label="Std dev" value={summary.std_dev.toFixed(2)} />
        <StatBox label="Avg models killed" value={summary.mean_models_killed.toFixed(2)} />
      </div>

      <div>
        <p className="text-xs text-gray-500 uppercase tracking-wider mb-3">Damage distribution</p>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={damage_histogram} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
            <XAxis dataKey="damage" tick={{ fill: '#6b7280', fontSize: 11 }} />
            <YAxis tickFormatter={(v) => `${(v * 100).toFixed(0)}%`} tick={{ fill: '#6b7280', fontSize: 11 }} />
            <Tooltip
              formatter={(v) => [`${(v * 100).toFixed(1)}%`, 'Probability']}
              contentStyle={{ background: '#1f2937', border: '1px solid #374151', borderRadius: 6 }}
              labelStyle={{ color: '#d1d5db' }}
            />
            <Bar dataKey="probability" radius={[3, 3, 0, 0]}>
              {damage_histogram.map((entry) => (
                <Cell
                  key={entry.damage}
                  fill={entry.probability === maxProb ? '#ef4444' : '#374151'}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div>
        <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Kill probability</p>
        <div className="flex flex-wrap gap-2">
          {Object.entries(kill_probabilities).map(([k, v]) => (
            <div key={k} className="bg-gray-800 rounded px-3 py-1.5 text-sm">
              <span className="text-gray-400">≥{k} model: </span>
              <span className="text-white font-medium">{(v * 100).toFixed(1)}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

import { useSimulatorStore } from '../store/simulatorStore'
import { runSimulation } from '../api/simulate'
import { AttackerPanel } from '../components/AttackerPanel'
import { DefenderPanel } from '../components/DefenderPanel'
import { ResultsPanel } from '../components/ResultsPanel'

export function SimulatorPage() {
  const attacker = useSimulatorStore((s) => s.attacker)
  const defender = useSimulatorStore((s) => s.defender)
  const context = useSimulatorStore((s) => s.context)
  const n_trials = useSimulatorStore((s) => s.n_trials)
  const result = useSimulatorStore((s) => s.result)
  const loading = useSimulatorStore((s) => s.loading)
  const error = useSimulatorStore((s) => s.error)
  const setResult = useSimulatorStore((s) => s.setResult)
  const setLoading = useSimulatorStore((s) => s.setLoading)
  const setError = useSimulatorStore((s) => s.setError)

  async function handleSimulate() {
    setLoading(true)
    try {
      const data = await runSimulation({ attacker, defender, context, n_trials })
      setResult(data)
    } catch (e) {
      setError(e.message)
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <header className="border-b border-gray-800 px-6 py-4 flex items-center gap-3">
        <span className="text-red-500 font-black text-lg tracking-tight">WH40K</span>
        <span className="text-gray-600">|</span>
        <span className="text-sm text-gray-400">Probability Simulator</span>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6 flex flex-col gap-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <AttackerPanel />
          <DefenderPanel />
        </div>

        {error && (
          <div className="bg-red-950 border border-red-800 text-red-300 rounded-lg px-4 py-3 text-sm">
            {error}
          </div>
        )}

        <button
          onClick={handleSimulate}
          disabled={loading}
          className="w-full bg-red-600 hover:bg-red-500 disabled:bg-gray-700 disabled:text-gray-500
                     text-white font-semibold py-3 rounded-xl transition-colors text-sm tracking-wide"
        >
          {loading ? 'Simulating…' : 'Run Simulation'}
        </button>

        <ResultsPanel result={result} />
      </main>
    </div>
  )
}

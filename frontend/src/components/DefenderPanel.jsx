import { useSimulatorStore } from '../store/simulatorStore'
import { StatInput } from './StatInput'
import { Toggle } from './Toggle'

export function DefenderPanel() {
  const defender = useSimulatorStore((s) => s.defender)
  const context = useSimulatorStore((s) => s.context)
  const setDefender = useSimulatorStore((s) => s.setDefender)
  const setContext = useSimulatorStore((s) => s.setContext)

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex flex-col gap-4">
      <h2 className="text-sm font-semibold text-blue-400 uppercase tracking-widest">
        Defender
      </h2>

      <div className="grid grid-cols-2 gap-3">
        <StatInput
          label="Toughness"
          value={defender.toughness}
          min={1} max={14}
          onChange={(v) => setDefender({ toughness: v })}
        />
        <StatInput
          label="Save"
          value={defender.save}
          min={2} max={7}
          onChange={(v) => setDefender({ save: v })}
        />
        <StatInput
          label="Wounds"
          value={defender.wounds}
          min={1} max={24}
          onChange={(v) => setDefender({ wounds: v })}
        />
        <StatInput
          label="Models"
          value={defender.models}
          min={1}
          onChange={(v) => setDefender({ models: v })}
        />
        <StatInput
          label="Invuln (blank = none)"
          value={defender.invuln ?? ''}
          placeholder="4, 5, 6…"
          min={2} max={6}
          onChange={(v) => setDefender({ invuln: v })}
        />
        <StatInput
          label="FNP (blank = none)"
          value={defender.fnp ?? ''}
          placeholder="5, 6…"
          min={2} max={6}
          onChange={(v) => setDefender({ fnp: v })}
        />
      </div>

      <div className="border-t border-gray-800 pt-3 flex flex-col gap-2">
        <p className="text-xs text-gray-500 mb-1 uppercase tracking-wider">Context</p>
        <Toggle
          label="In cover (+1 armour save)"
          checked={context.cover}
          onChange={(v) => setContext({ cover: v })}
        />
        <Toggle
          label="Half range (Melta / Rapid Fire)"
          checked={context.half_range}
          onChange={(v) => setContext({ half_range: v })}
        />
        <Toggle
          label="Attacker charged (Lance)"
          checked={context.attacker_charged}
          onChange={(v) => setContext({ attacker_charged: v })}
        />
        <Toggle
          label="Attacker moved (Heavy penalty)"
          checked={context.attacker_moved}
          onChange={(v) => setContext({ attacker_moved: v })}
        />
      </div>
    </div>
  )
}

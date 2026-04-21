import { useSimulatorStore } from '../store/simulatorStore'
import { StatInput } from './StatInput'

export function AttackerPanel() {
  const weapon = useSimulatorStore((s) => s.attacker.weapon)
  const models = useSimulatorStore((s) => s.attacker.models)
  const setWeapon = useSimulatorStore((s) => s.setWeapon)
  const setAttacker = useSimulatorStore((s) => s.setAttacker)

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex flex-col gap-4">
      <h2 className="text-sm font-semibold text-red-400 uppercase tracking-widest">
        Attacker
      </h2>

      <StatInput
        label="Models"
        value={models}
        min={1}
        onChange={(v) => setAttacker({ models: v })}
      />

      <div className="border-t border-gray-800 pt-4">
        <p className="text-xs text-gray-500 mb-3 uppercase tracking-wider">Weapon</p>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <StatInput
              label="Name"
              type="text"
              value={weapon.name}
              placeholder="e.g. Bolter"
              onChange={(v) => setWeapon({ name: v })}
            />
          </div>
          <StatInput
            label="Attacks"
            type="text"
            value={weapon.attacks}
            placeholder="2, D6, 2D3+1"
            onChange={(v) => setWeapon({ attacks: v })}
          />
          <StatInput
            label="Skill (BS/WS)"
            value={weapon.skill}
            min={2} max={6}
            onChange={(v) => setWeapon({ skill: v })}
          />
          <StatInput
            label="Strength"
            value={weapon.strength}
            min={1} max={20}
            onChange={(v) => setWeapon({ strength: v })}
          />
          <StatInput
            label="AP"
            value={weapon.ap}
            min={-6} max={0}
            onChange={(v) => setWeapon({ ap: v })}
          />
          <div className="col-span-2">
            <StatInput
              label="Damage"
              type="text"
              value={weapon.damage}
              placeholder="1, D3, D6+1"
              onChange={(v) => setWeapon({ damage: v })}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

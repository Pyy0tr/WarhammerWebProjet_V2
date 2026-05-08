import { create } from 'zustand'
import { simulate } from '../engine/simulation.js'

const defaultWeapon = {
  name: '',
  attacks: '2',
  skill: 3,
  strength: 4,
  ap: 0,
  damage: '1',
  keywords: [],
}

const defaultAttacker = {
  models: 1,
  weapon: { ...defaultWeapon },
  buffs: [],
}

const defaultDefender = {
  toughness: 4,
  save: 3,
  invuln: null,
  wounds: 2,
  models: 5,
  fnp: null,
  dmg_reduction: false,
  keywords: [],
}

const defaultContext = {
  cover: false,
  half_range: false,
  attacker_moved: false,
  attacker_charged: false,
  target_visible: true,
}

let _atkId = 0
function nextAtkId() { return ++_atkId }

export const useSimulatorStore = create((set) => ({
  // Step management: 1=attack, 2=review attacks, 3=defender, 4=results
  step: 1,

  // Current attack being edited
  attacker: { ...defaultAttacker },

  // Finalized attacks list
  attacks: [],

  // Index being edited (null = new attack)
  editingIdx: null,

  // Defender
  defender: { ...defaultDefender },
  context: { ...defaultContext },
  n_trials: 1000,

  // Selected units (for ability panels)
  attackerUnit: null,
  defenderUnit: null,
  setAttackerUnit: (unit) => set({ attackerUnit: unit }),
  setDefenderUnit: (unit) => set({ defenderUnit: unit }),

  // Hovered keyword (for definition panel)
  hoveredKeyword: null,
  setHoveredKeyword: (kw) => set({ hoveredKeyword: kw }),

  // Results
  result: null,
  loading: false,
  error: null,

  // ── Step navigation ──────────────────────────────────────────────────
  setStep: (step) => set({ step }),

  // ── Attacker (current edit) ──────────────────────────────────────────
  setAttacker: (patch) =>
    set((s) => ({ attacker: { ...s.attacker, ...patch } })),

  setWeapon: (patch) =>
    set((s) => ({
      attacker: { ...s.attacker, weapon: { ...s.attacker.weapon, ...patch } },
    })),

  // ── Attacks list ─────────────────────────────────────────────────────
  addAttack: () =>
    set((s) => {
      const entry = {
        _id: nextAtkId(),
        models: s.attacker.models,
        weapon: { ...s.attacker.weapon },
        buffs: [...s.attacker.buffs],
      }
      const attacks = s.editingIdx !== null
        ? s.attacks.map((a, i) => i === s.editingIdx ? entry : a)
        : [...s.attacks, entry]
      return {
        attacks,
        attacker: { ...defaultAttacker },
        editingIdx: null,
        step: 2,
      }
    }),

  removeAttack: (idx) =>
    set((s) => ({ attacks: s.attacks.filter((_, i) => i !== idx) })),

  editAttack: (idx) =>
    set((s) => {
      const a = s.attacks[idx]
      return {
        attacker: { models: a.models, weapon: { ...a.weapon }, buffs: [...a.buffs] },
        editingIdx: idx,
        step: 1,
      }
    }),

  resetAttacker: () =>
    set({ attacker: { ...defaultAttacker }, editingIdx: null }),

  // ── Defender ─────────────────────────────────────────────────────────
  setDefender: (patch) =>
    set((s) => ({ defender: { ...s.defender, ...patch } })),

  setContext: (patch) =>
    set((s) => ({ context: { ...s.context, ...patch } })),

  // ── Simulation ───────────────────────────────────────────────────────
  runSimulation: () => {
    set({ loading: true, error: null })
    try {
      const s = useSimulatorStore.getState()
      if (s.attacks.length === 0) {
        set({ error: 'No attacks configured', loading: false })
        return
      }
      const result = simulate({
        attacks:  s.attacks,
        defender: s.defender,
        context:  s.context,
        n_trials: s.n_trials,
      })
      set({ result, loading: false, step: 4 })
    } catch (e) {
      set({ error: e.message, loading: false })
    }
  },

  setResult: (result) => set({ result, loading: false, error: null }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error, loading: false }),

  // ── Full reset ────────────────────────────────────────────────────────
  resetAll: () => set({
    step: 1,
    attacker: { ...defaultAttacker },
    attacks: [],
    editingIdx: null,
    defender: { ...defaultDefender },
    context: { ...defaultContext },
    attackerUnit: null,
    defenderUnit: null,
    hoveredKeyword: null,
    result: null,
    loading: false,
    error: null,
  }),
}))

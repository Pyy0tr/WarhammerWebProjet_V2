import { create } from 'zustand'

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
  keywords: [],
}

const defaultContext = {
  cover: false,
  half_range: false,
  attacker_moved: false,
  attacker_charged: false,
  target_visible: true,
}

export const useSimulatorStore = create((set) => ({
  attacker: defaultAttacker,
  defender: defaultDefender,
  context: defaultContext,
  n_trials: 1000,

  result: null,
  loading: false,
  error: null,

  setAttacker: (patch) =>
    set((s) => ({ attacker: { ...s.attacker, ...patch } })),

  setWeapon: (patch) =>
    set((s) => ({
      attacker: { ...s.attacker, weapon: { ...s.attacker.weapon, ...patch } },
    })),

  setDefender: (patch) =>
    set((s) => ({ defender: { ...s.defender, ...patch } })),

  setContext: (patch) =>
    set((s) => ({ context: { ...s.context, ...patch } })),

  setResult: (result) => set({ result, loading: false, error: null }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error, loading: false }),
}))

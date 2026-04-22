import { create } from 'zustand'

export const useDataStore = create((set, get) => ({
  units: [],
  weapons: [],
  weaponsById: {},
  unitsById: {},
  factions: [],
  unitsByFaction: {},   // faction name → unit[]
  loaded: false,

  load: async () => {
    if (get().loaded) return
    const [units, weapons, factions] = await Promise.all([
      fetch('/data/units.json').then((r) => r.json()),
      fetch('/data/weapons.json').then((r) => r.json()),
      fetch('/data/factions.json').then((r) => r.json()),
    ])

    const weaponsById = {}
    for (const w of weapons) weaponsById[w.id] = w

    const unitsById = {}
    for (const u of units) unitsById[u.id] = u

    // Group units by playable faction (factions[] field), fallback to faction
    const unitsByFaction = {}
    for (const u of units) {
      const buckets = u.factions?.length ? u.factions : [u.faction]
      for (const f of buckets) {
        if (!unitsByFaction[f]) unitsByFaction[f] = []
        unitsByFaction[f].push(u)
      }
    }

    set({ units, weapons, weaponsById, unitsById, factions, unitsByFaction, loaded: true })
  },

  getUnitById: (id) => get().unitsById[id] ?? null,

  // Return full weapon objects for a unit's weapon id list
  getUnitWeapons: (unit) => {
    if (!unit?.weapons?.length) return []
    const { weaponsById } = get()
    return unit.weapons
      .map((ref) => weaponsById[ref.id])
      .filter(Boolean)
  },

  searchWeapons: (query) => {
    const q = query.toLowerCase().trim()
    if (q.length < 2) return []
    return get().weapons
      .filter((w) => w.name.toLowerCase().includes(q))
      .slice(0, 20)
  },

  searchUnits: (query) => {
    const q = query.toLowerCase().trim()
    if (q.length < 2) return []
    return get().units
      .filter((u) => u.name.toLowerCase().includes(q))
      .slice(0, 20)
  },
}))

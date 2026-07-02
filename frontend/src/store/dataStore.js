import { create } from 'zustand'

// V11 data is a staging preview — parsed from an unofficial community
// dataset. Its own simulation engine (simulation_v11.js/keywords_v11.js)
// is wired in via edition-aware stores, but the underlying rules are not
// yet cross-checked against the official GW rulebook.
const EDITION_DATA_DIR = { v10: '/data', v11: '/data/v11' }
const VALID_EDITIONS = Object.keys(EDITION_DATA_DIR)
const EDITION_STORAGE_KEY = 'probhammer_edition'

function readStoredEdition() {
  try {
    const stored = localStorage.getItem(EDITION_STORAGE_KEY)
    return VALID_EDITIONS.includes(stored) ? stored : 'v10'
  } catch {
    return 'v10'
  }
}

export const useDataStore = create((set, get) => ({
  edition: readStoredEdition(),
  units: [],
  weapons: [],
  weaponsById: {},
  unitsById: {},
  factions: [],
  unitsByFaction: {},   // faction name → unit[]
  loaded: false,

  load: async () => {
    if (get().loaded) return
    await get()._fetchEdition(get().edition)
  },

  setEdition: async (edition) => {
    if (!VALID_EDITIONS.includes(edition) || edition === get().edition) return
    try {
      localStorage.setItem(EDITION_STORAGE_KEY, edition)
    } catch {
      // localStorage unavailable (private browsing etc.) — edition just won't persist
    }
    set({ edition, loaded: false })
    await get()._fetchEdition(edition)
  },

  _fetchEdition: async (edition) => {
    const dir = EDITION_DATA_DIR[edition]
    const [units, weapons, factions] = await Promise.all([
      fetch(`${dir}/units.json`).then((r) => r.json()),
      fetch(`${dir}/weapons.json`).then((r) => r.json()),
      fetch(`${dir}/factions.json`).then((r) => r.json()),
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

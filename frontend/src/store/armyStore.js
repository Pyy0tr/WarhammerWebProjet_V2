import { create } from 'zustand'
import { api } from '../lib/api'
import { useDataStore } from './dataStore'

const LS_KEY = 'probhammer_armies'

function uid()  { return crypto.randomUUID() }
function now()  { return new Date().toISOString() }

function lsLoad() {
  try { return JSON.parse(localStorage.getItem(LS_KEY) ?? '[]') }
  catch { return [] }
}
function lsSave(armies) {
  localStorage.setItem(LS_KEY, JSON.stringify(armies))
}

// The in-memory `armies` array is always filtered to the current edition —
// merge it back against the OTHER edition's armies on disk instead of
// overwriting the whole localStorage list, or we'd silently wipe them out.
function lsSaveForEdition(armies, edition) {
  const others = lsLoad().filter((a) => (a.edition ?? 'v10') !== edition)
  lsSave([...others, ...armies])
}

function withArmy(armies, id, fn) {
  return armies.map((a) => a.id === id ? fn(a) : a)
}

export const useArmyStore = create((set, get) => ({
  armies:     [],
  activeId:   null,
  loaded:     false,
  _loadedFor: undefined,

  // ── Init ──────────────────────────────────────────────────────────────────
  // Armies are permanently tied to the edition they were created in (V10/V11
  // datasets use unrelated unit/weapon IDs, so mixing them silently breaks
  // stat/weapon lookups). Cache key includes edition so switching the
  // V10/V11 toggle forces a refetch of the right list.
  init: async (user) => {
    const currentUid = user?.id ?? null
    const edition = useDataStore.getState().edition
    const cacheKey = `${currentUid}::${edition}`
    if (get().loaded && get()._loadedFor === cacheKey) return

    let armies = []

    if (user) {
      // Migrer les armées localStorage vers l'API si l'utilisateur vient de se connecter
      // (chaque armée locale garde l'édition sous laquelle elle a été créée).
      const local = lsLoad()
      if (local.length > 0) {
        const created = await Promise.all(
          local.map((a) => api.post('/armies', { name: a.name, edition: a.edition ?? 'v10' }).catch(() => null))
        )
        // Pour chaque armée créée, mettre à jour les units si besoin
        await Promise.all(
          created.filter(Boolean).map((a, i) =>
            local[i].units?.length > 0
              ? api.put(`/armies/${a.id}`, { units: local[i].units }).catch(() => null)
              : null
          )
        )
        lsSave([])
      }
      armies = await api.get(`/armies?edition=${encodeURIComponent(edition)}`)
    } else {
      armies = lsLoad().filter((a) => (a.edition ?? 'v10') === edition)
    }

    set({ armies, activeId: armies[0]?.id ?? null, loaded: true, _loadedFor: cacheKey })
  },

  setActive: (id) => set({ activeId: id }),

  // ── Create ────────────────────────────────────────────────────────────────
  create: async (user, name = 'New Army') => {
    const edition = useDataStore.getState().edition
    if (user) {
      const army = await api.post('/armies', { name, edition })
      set((s) => ({ armies: [army, ...s.armies], activeId: army.id }))
    } else {
      const draft = { id: uid(), name, units: [], edition, created_at: now(), updated_at: now() }
      set((s) => {
        const armies = [draft, ...s.armies]
        lsSaveForEdition(armies, edition)
        return { armies, activeId: draft.id }
      })
    }
  },

  // ── Rename ────────────────────────────────────────────────────────────────
  rename: async (id, name, user) => {
    const ts = now()
    set((s) => ({ armies: withArmy(s.armies, id, (a) => ({ ...a, name, updated_at: ts })) }))
    if (user) await api.put(`/armies/${id}`, { name })
    else lsSaveForEdition(get().armies, useDataStore.getState().edition)
  },

  // ── Delete ────────────────────────────────────────────────────────────────
  deleteArmy: async (id, user) => {
    if (user) await api.delete(`/armies/${id}`)
    set((s) => {
      const armies = s.armies.filter((a) => a.id !== id)
      if (!user) lsSaveForEdition(armies, useDataStore.getState().edition)
      return { armies, activeId: s.activeId === id ? (armies[0]?.id ?? null) : s.activeId }
    })
  },

  // ── Add unit ──────────────────────────────────────────────────────────────
  addUnit: async (unitData, user) => {
    const minModels = unitData.min_models ?? unitData.constraints?.min_models ?? 1
    const entry = { uid: uid(), models: minModels, ...unitData }
    const ts = now()
    set((s) => ({
      armies: withArmy(s.armies, s.activeId, (a) => ({
        ...a, units: [...a.units, entry], updated_at: ts,
      })),
    }))
    await get()._persist(get().activeId, user)
    return entry
  },

  // ── Remove unit ───────────────────────────────────────────────────────────
  removeUnit: async (entryUid, user) => {
    const ts = now()
    set((s) => ({
      armies: withArmy(s.armies, s.activeId, (a) => ({
        ...a, units: a.units.filter((u) => u.uid !== entryUid), updated_at: ts,
      })),
    }))
    await get()._persist(get().activeId, user)
  },

  // ── Update unit ───────────────────────────────────────────────────────────
  updateUnit: async (entryUid, patch, user) => {
    const ts = now()
    set((s) => ({
      armies: withArmy(s.armies, s.activeId, (a) => ({
        ...a,
        units: a.units.map((u) => u.uid === entryUid ? { ...u, ...patch } : u),
        updated_at: ts,
      })),
    }))
    await get()._persist(get().activeId, user)
  },

  // ── Internal persist ──────────────────────────────────────────────────────
  _persist: async (id, user) => {
    const army = get().armies.find((a) => a.id === id)
    if (!army) return
    if (user) await api.put(`/armies/${id}`, { units: army.units })
    else lsSaveForEdition(get().armies, useDataStore.getState().edition)
  },
}))

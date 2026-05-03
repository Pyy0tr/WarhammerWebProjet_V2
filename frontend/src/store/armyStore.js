import { create } from 'zustand'
import { api } from '../lib/api'

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

function withArmy(armies, id, fn) {
  return armies.map((a) => a.id === id ? fn(a) : a)
}

export const useArmyStore = create((set, get) => ({
  armies:     [],
  activeId:   null,
  loaded:     false,
  _loadedFor: undefined,

  // ── Init ──────────────────────────────────────────────────────────────────
  init: async (user) => {
    const currentUid = user?.id ?? null
    if (get().loaded && get()._loadedFor === currentUid) return

    let armies = []

    if (user) {
      // Migrer les armées localStorage vers l'API si l'utilisateur vient de se connecter
      const local = lsLoad()
      if (local.length > 0) {
        const created = await Promise.all(
          local.map((a) => api.post('/armies', { name: a.name }).catch(() => null))
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
      armies = await api.get('/armies')
    } else {
      armies = lsLoad()
    }

    set({ armies, activeId: armies[0]?.id ?? null, loaded: true, _loadedFor: currentUid })
  },

  setActive: (id) => set({ activeId: id }),

  // ── Create ────────────────────────────────────────────────────────────────
  create: async (user, name = 'New Army') => {
    if (user) {
      const army = await api.post('/armies', { name })
      set((s) => ({ armies: [army, ...s.armies], activeId: army.id }))
    } else {
      const draft = { id: uid(), name, units: [], created_at: now(), updated_at: now() }
      set((s) => {
        const armies = [draft, ...s.armies]
        lsSave(armies)
        return { armies, activeId: draft.id }
      })
    }
  },

  // ── Rename ────────────────────────────────────────────────────────────────
  rename: async (id, name, user) => {
    const ts = now()
    set((s) => ({ armies: withArmy(s.armies, id, (a) => ({ ...a, name, updated_at: ts })) }))
    if (user) await api.put(`/armies/${id}`, { name })
    else lsSave(get().armies)
  },

  // ── Delete ────────────────────────────────────────────────────────────────
  deleteArmy: async (id, user) => {
    if (user) await api.delete(`/armies/${id}`)
    set((s) => {
      const armies = s.armies.filter((a) => a.id !== id)
      if (!user) lsSave(armies)
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
    else lsSave(get().armies)
  },
}))

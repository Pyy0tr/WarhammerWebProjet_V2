import { create } from 'zustand'
import { supabase } from '../lib/supabase'

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

// Mutate armies immutably, optionally persist
function withArmy(armies, id, fn) {
  return armies.map((a) => a.id === id ? fn(a) : a)
}

export const useArmyStore = create((set, get) => ({
  armies:     [],
  activeId:   null,
  loaded:     false,
  _loadedFor: undefined,   // uid | null — tracks which user context was loaded

  // ── Init ──────────────────────────────────────────────────────────────────
  init: async (user) => {
    const currentUid = user?.id ?? null
    // Skip if already loaded for the same user context
    if (get().loaded && get()._loadedFor === currentUid) return

    let armies = []

    if (user) {
      // Migrate any anonymous localStorage armies to Supabase first
      const local = lsLoad()
      if (local.length > 0) {
        const inserts = await Promise.all(
          local.map((a) =>
            supabase
              .from('armies')
              .insert({ name: a.name, units: a.units ?? [], user_id: user.id })
              .select('id, name, units, created_at, updated_at')
              .single()
          )
        )
        lsSave([])   // clear local storage after migration
        const migrated = inserts.map((r) => r.data).filter(Boolean)
        armies = migrated
      }

      // Load all armies from Supabase (includes just-migrated ones)
      const { data } = await supabase
        .from('armies')
        .select('id, name, units, created_at, updated_at')
        .order('created_at', { ascending: false })
      armies = data ?? []
    } else {
      armies = lsLoad()
    }

    set({ armies, activeId: armies[0]?.id ?? null, loaded: true, _loadedFor: currentUid })
  },

  setActive: (id) => set({ activeId: id }),

  // ── Create ────────────────────────────────────────────────────────────────
  create: async (user, name = 'New Army') => {
    const draft = { id: uid(), name, units: [], created_at: now(), updated_at: now() }
    if (user) {
      const { data, error } = await supabase
        .from('armies').insert({ name: draft.name, units: [], user_id: user.id }).select().single()
      if (error) throw error
      draft.id = data.id
      draft.created_at = data.created_at
      draft.updated_at = data.updated_at
    }
    set((s) => {
      const armies = [draft, ...s.armies]
      if (!user) lsSave(armies)
      return { armies, activeId: draft.id }
    })
  },

  // ── Rename ────────────────────────────────────────────────────────────────
  rename: async (id, name, user) => {
    const ts = now()
    set((s) => ({ armies: withArmy(s.armies, id, (a) => ({ ...a, name, updated_at: ts })) }))
    if (user) await supabase.from('armies').update({ name, updated_at: ts }).eq('id', id)
    else lsSave(get().armies)
  },

  // ── Delete ────────────────────────────────────────────────────────────────
  deleteArmy: async (id, user) => {
    if (user) await supabase.from('armies').delete().eq('id', id)
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

  // ── Update unit (models count, etc.) ─────────────────────────────────────
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
    if (user) {
      await supabase.from('armies').update({ units: army.units, updated_at: army.updated_at }).eq('id', id)
    } else {
      lsSave(get().armies)
    }
  },
}))

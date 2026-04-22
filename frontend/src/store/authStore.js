import { create } from 'zustand'
import { supabase } from '../lib/supabase'

export const useAuthStore = create((set, get) => ({
  user:    null,   // Supabase User object | null
  loading: true,   // true while the initial session check is in flight

  // ── Bootstrap ──────────────────────────────────────────────────────────────
  // Call once at app mount. Loads the persisted session and subscribes to
  // future auth state changes (token refresh, sign-out from another tab, etc.)
  init: () => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      set({ user: session?.user ?? null, loading: false })
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        set({ user: session?.user ?? null, loading: false })
      }
    )

    // Return unsubscribe so callers can clean up (useEffect return)
    return () => subscription.unsubscribe()
  },

  // ── Register ───────────────────────────────────────────────────────────────
  register: async (email, password) => {
    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error) throw error
    // User object is set via onAuthStateChange — no manual set() needed
    return data
  },

  // ── Login ──────────────────────────────────────────────────────────────────
  login: async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    return data
  },

  // ── Logout ─────────────────────────────────────────────────────────────────
  logout: async () => {
    await supabase.auth.signOut()
    // onAuthStateChange fires → sets user: null automatically
  },

  // ── Helpers ────────────────────────────────────────────────────────────────
  isLoggedIn: () => get().user !== null,
}))

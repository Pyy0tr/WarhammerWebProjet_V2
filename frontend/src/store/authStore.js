import { create } from 'zustand'
import { supabase, SUPABASE_ENABLED } from '../lib/supabase'

export const useAuthStore = create((set, get) => ({
  user:    null,
  loading: false,

  init: () => {
    if (!SUPABASE_ENABLED) {
      set({ loading: false })
      return () => {}
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      set({ user: session?.user ?? null, loading: false })
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === 'PASSWORD_RECOVERY') {
          set({ isPasswordRecovery: true, loading: false })
        } else {
          set({ user: session?.user ?? null, loading: false, isPasswordRecovery: false })
        }
      }
    )

    return () => subscription.unsubscribe()
  },

  register: async (email, password) => {
    if (!SUPABASE_ENABLED) throw new Error('Auth not configured')
    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error) throw error
    return data
  },

  login: async (email, password) => {
    if (!SUPABASE_ENABLED) throw new Error('Auth not configured')
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    return data
  },

  logout: async () => {
    if (!SUPABASE_ENABLED) return
    await supabase.auth.signOut()
  },

  sendPasswordReset: async (email) => {
    if (!SUPABASE_ENABLED) throw new Error('Auth not configured')
    const redirectTo = `${window.location.origin}/?reset=1`
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo })
    if (error) throw error
  },

  updatePassword: async (newPassword) => {
    if (!SUPABASE_ENABLED) throw new Error('Auth not configured')
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    if (error) throw error
  },

  isPasswordRecovery: false,
  setPasswordRecovery: (val) => set({ isPasswordRecovery: val }),

  // ── Helpers ────────────────────────────────────────────────────────────────
  isLoggedIn: () => get().user !== null,
}))

import { create } from 'zustand'
import { api } from '../lib/api'

const TOKEN_KEY = 'ph_token'

function decodeUser(token) {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    if (payload.exp * 1000 > Date.now()) {
      return { id: payload.sub, email: payload.email }
    }
  } catch {}
  return null
}

export const useAuthStore = create((set, get) => ({
  user:    null,
  loading: true,

  init: () => {
    const token = localStorage.getItem(TOKEN_KEY)
    if (token) {
      const user = decodeUser(token)
      if (user) { set({ user, loading: false }); return () => {} }
    }
    localStorage.removeItem(TOKEN_KEY)
    set({ loading: false })
    return () => {}
  },

  register: async (email, password) => {
    const data = await api.post('/auth/register', { email, password })
    localStorage.setItem(TOKEN_KEY, data.access_token)
    set({ user: { id: data.user_id, email: data.email } })
  },

  login: async (email, password) => {
    // /auth/login uses OAuth2PasswordRequestForm → form-urlencoded, champ "username"
    const data = await api.postForm('/auth/login', { username: email, password })
    localStorage.setItem(TOKEN_KEY, data.access_token)
    set({ user: { id: data.user_id, email: data.email } })
  },

  logout: () => {
    localStorage.removeItem(TOKEN_KEY)
    set({ user: null })
  },

  isLoggedIn: () => get().user !== null,
}))

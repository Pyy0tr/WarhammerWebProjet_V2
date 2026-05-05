import { create } from 'zustand'
import { api } from '../lib/api'

const TOKEN_KEY = 'ph_token'

function decodeUser(token) {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    if (payload.exp * 1000 > Date.now()) {
      return { id: payload.sub, username: payload.username }
    }
  } catch (_) {}
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

  register: async (username, password) => {
    const data = await api.post('/auth/register', { username, password })
    localStorage.setItem(TOKEN_KEY, data.access_token)
    set({ user: { id: data.user_id, username: data.username } })
  },

  login: async (username, password) => {
    const data = await api.postForm('/auth/login', { username, password })
    localStorage.setItem(TOKEN_KEY, data.access_token)
    set({ user: { id: data.user_id, username: data.username } })
  },

  logout: () => {
    localStorage.removeItem(TOKEN_KEY)
    set({ user: null })
  },

  isLoggedIn: () => get().user !== null,
}))

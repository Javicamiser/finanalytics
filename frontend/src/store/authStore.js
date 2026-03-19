import { create } from 'zustand'
import { authService } from '../services/api'

export const useAuthStore = create((set, get) => ({
  user:    null,
  token:   localStorage.getItem('token'),
  loading: false,

  login: async (email, password) => {
    set({ loading: true })
    const data = await authService.login(email, password)
    localStorage.setItem('token', data.access_token)
    const user = await authService.me()
    set({ token: data.access_token, user, loading: false })
    return user
  },

  logout: () => {
    localStorage.removeItem('token')
    set({ user: null, token: null })
  },

  loadUser: async () => {
    const token = localStorage.getItem('token')
    if (!token) return
    try {
      const user = await authService.me()
      set({ user })
    } catch {
      localStorage.removeItem('token')
      set({ user: null, token: null })
    }
  },
}))
import { defineStore } from 'pinia'
import api from '../services/api'

const STORAGE_KEY = 'pb_user'

export const useUserStore = defineStore('user', {
  state: () => ({
    currentUser: null,
    token: null
  }),
  actions: {
    hydrate() {
      try {
        const raw = localStorage.getItem(STORAGE_KEY)
        if (!raw) return
        const data = JSON.parse(raw)
        this.currentUser = data.user ?? data.currentUser ?? null
        this.token = data.token ?? null
      } catch (e) {
        // if parsing fails, clear bad data
        localStorage.removeItem(STORAGE_KEY)
      }
    },
    async login(username, password) {
      try {
        const res = await api.post('/PasswordAuthentication/authenticate', { username, password })
        // Only set currentUser if no error in response
        if (res.data?.error) {
          throw res.data.error
        }
        this.currentUser = res.data?.user ?? res.data ?? null
        // persist minimal user payload; include token if backend returns it
        const token = res.data?.token ?? null
        this.token = token
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ user: this.currentUser, token })) } catch {}
        return this.currentUser
      } catch (err) {
        // rethrow to let UI handle error message
        throw err?.response?.data?.error || err.message || err
      }
    },
    async register(username, password) {
      try {
        const res = await api.post('/PasswordAuthentication/register', { username, password })
        this.currentUser = res.data?.user ?? null
        const token = res.data?.token ?? null
        this.token = token
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ user: this.currentUser, token })) } catch {}
        return this.currentUser
      } catch (err) {
        throw err?.response?.data?.error || err.message || err
      }
    },
    logout() {
      this.currentUser = null
      this.token = null
      try { localStorage.removeItem(STORAGE_KEY) } catch {}
    }
  }
})

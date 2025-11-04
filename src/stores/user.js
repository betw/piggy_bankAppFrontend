import { defineStore } from 'pinia'
import api from '../services/api'

const STORAGE_KEY = 'pb_user'

export const useUserStore = defineStore('user', {
  state: () => ({
    currentUser: null,
    token: null,
    username: '',
    // holds the last registration error message (not persisted)
    registerError: null
  }),
  actions: {
    hydrate() {
      try {
        const raw = localStorage.getItem(STORAGE_KEY)
        if (!raw) return
        const data = JSON.parse(raw)
        this.currentUser = data.user ?? data.currentUser ?? null
        this.token = data.token ?? null
        this.username = data.username ?? ''
      } catch (e) {
        // if parsing fails, clear bad data
        localStorage.removeItem(STORAGE_KEY)
        this.username = ''
        return
      }
      if (this.currentUser && !this.username) {
        this.refreshUsername().catch(() => {})
      }
    },
    _persistState() {
      try {
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({ user: this.currentUser, token: this.token, username: this.username })
        )
      } catch {}
    },
    async refreshUsername() {
      if (!this.currentUser) {
        this.username = ''
        this._persistState()
        return ''
      }

      let identifier = null
      const user = this.currentUser
      if (typeof user === 'string' || typeof user === 'number') {
        identifier = user
      } else if (user && typeof user === 'object') {
        identifier =
          user.id ??
          user.userId ??
          user.userID ??
          user.user ??
          user.username ??
          null
      }

      const payload = { user: identifier ?? user }

      try {
        const res = await api.post('/PasswordAuthentication/_getUserUsername', payload)
        const data = res?.data
        let resolved = ''
        if (Array.isArray(data)) {
          resolved = data[0]?.username ?? ''
        } else if (data && typeof data === 'object') {
          resolved = data.username ?? data.user?.username ?? ''
        } else if (typeof data === 'string') {
          resolved = data
        }
        this.username = resolved || ''
      } catch (err) {
        console.error('[user] refreshUsername failed:', err)
      }

      this._persistState()
      return this.username
    },
    async login(username, password) {
      try {
        const res = await api.post('/PasswordAuthentication/authenticate', { username, password })
        // Only set currentUser if no error in response
        if (res.data?.error) {
          throw res.data.error
        }
        this.currentUser = res.data?.user ?? res.data ?? null
        this.username = username
        // persist minimal user payload; include token if backend returns it
        const token = res.data?.token ?? null
        this.token = token
        await this.refreshUsername()
        this._persistState()
        return this.currentUser
      } catch (err) {
        // rethrow to let UI handle error message
        throw err?.response?.data?.error || err.message || err
      }
    },
    async register(username, password) {
      this.registerError = null
      try {
        const res = await api.post('/PasswordAuthentication/register', { username, password })
        // Some backends return 200 with an error field; handle that
        const possibleError = res?.data?.message || res?.data?.error
        if (possibleError) {
          this.registerError = possibleError
          throw new Error(possibleError)
        }

        this.currentUser = res.data?.user ?? null
        this.username = username
        const token = res.data?.token ?? null
        this.token = token
        await this.refreshUsername()
        this._persistState()
        return this.currentUser
      } catch (err) {
        // Surface a friendly error for the UI to display
        const message = err?.response?.data?.message || err?.response?.data?.error || err.message || 'Registration failed'
        this.registerError = message
        throw message
      }
    },
    logout() {
      this.currentUser = null
      this.token = null
      this.username = ''
      try { localStorage.removeItem(STORAGE_KEY) } catch {}
    }
  }
})

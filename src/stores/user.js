import { defineStore } from 'pinia'
import api, { authAPI } from '../services/api'
// Persist only session/username under piggybank_* keys; do not use a blob key

export const useUserStore = defineStore('user', {
  state: () => ({
    // auth/session state (primary source for app auth)
    session: localStorage.getItem('piggybank_session') || null,
    username: localStorage.getItem('piggybank_username') || '',

    // compatibility fields used elsewhere in the app
    currentUser: null,
    token: null,

    // holds the last registration error message (not persisted)
    registerError: null
  }),
  getters: {
    isAuthenticated: (state) => !!state.session
  },
  actions: {
    hydrate() {
      // Load piggybank_* keys for session + username
      try {
        const session = localStorage.getItem('piggybank_session')
        const username = localStorage.getItem('piggybank_username')
        if (session) this.session = session
        if (username) this.username = username
      } catch {}

      // If no explicit user object is saved, treat username as the identifier
      if (!this.currentUser && this.username) {
        this.currentUser = this.username
      }

      if (this.currentUser && !this.username) {
        this.refreshUsername().catch(() => {})
      }
    },
    // No blob persistence; currentUser/token are in-memory only
    async refreshUsername() {
      // If no currentUser, don't clobber any existing username; just return it.
      if (!this.currentUser) {
        return this.username || ''
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
      return this.username
    },
    async login(username, password) {
      try {
        // Use authAPI for application login
        const res = await authAPI.login(username, password)
        const data = res?.data ?? res
        // Only set currentUser if no error in response
        if (data?.error) {
          throw data.error
        }
        // Session/token
        this.session = data.session

        // Identity
        this.username = username
        this.currentUser = data?.user ?? username

        // Persist session + username (primary)
        try {
          if (this.session) localStorage.setItem('piggybank_session', this.session)
          if (this.username) localStorage.setItem('piggybank_username', this.username)
        } catch {}

        // Optionally refresh canonical username if backend supports it
        await this.refreshUsername()
        return data
      } catch (err) {
        // rethrow to let UI handle error message
        throw err?.response?.data?.error || err.message || err
      }
    },
    async register(username, password) {
      this.registerError = null
      try {
        // Use authAPI for application registration
        const res = await authAPI.register(username, password)
        const data = res?.data ?? res
        // Some backends return 200 with an error field; handle that
        const possibleError = data?.message || data?.error
        if (possibleError) {
          this.registerError = possibleError
          throw new Error(possibleError)
        }

        // Do NOT log in automatically after registration.
        // Do NOT set session/currentUser/username or persist anything here.
        // Let the UI prompt the user to sign in with their new credentials.
        return data?.user ?? null
      } catch (err) {
        // Surface a friendly error for the UI to display
        const message = err?.response?.data?.message || err?.response?.data?.error || err.message || 'Registration failed'
        this.registerError = message
        throw message
      }
    },
    async logout() {
      if (this.session) {
        try {
          await authAPI.logout(this.session)
        } catch (error) {
          // Continue logout even if API call fails
          console.error('Logout API call failed:', error)
        }
      }

      this.session = null
      this.token = null
      this.currentUser = null
      this.username = null

      try { localStorage.removeItem('piggybank_session') } catch {}
      try { localStorage.removeItem('piggybank_username') } catch {}
    }
  }
})

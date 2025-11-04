import axios from 'axios'

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api/'
const api = axios.create({
  baseURL: API_BASE,
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' }
})

/**
 * Authentication API
 */
export const authAPI = {
  async register(username, password) {
    return api.post('/PasswordAuthentication/register', { username, password })
  },

  async login(username, password) {
    return api.post('/login', { username, password })
  },

  async logout(session) {
    return api.post('/logout', { session })
  }
}

export default api

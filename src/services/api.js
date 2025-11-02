import axios from 'axios'

const instance = axios.create({
  baseURL: '/api/',
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' }
})
const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api'
export default instance

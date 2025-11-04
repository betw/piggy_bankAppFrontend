import axios from 'axios'

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api/'
const instance = axios.create({
  baseURL: API_BASE,
  timeout: 100000,
  headers: { 'Content-Type': 'application/json' }
})

export default instance

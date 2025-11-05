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

/**
 * Trip Cost Estimation API
 * Mirrors endpoints defined under /api/TripCostEstimation/* (API_BASE already includes /api/)
 */
export const costEstimateAPI = {
  // Travel plan lifecycle
  async createTravelPlan(payload) {
    // payload: { user, fromCity, toCity, fromDate, toDate, session? }
    return api.post('TripCostEstimation/createTravelPlan', payload)
  },
  async deleteTravelPlan(payload) {
    // payload: { user, travelPlan }
    return api.post('TripCostEstimation/deleteTravelPlan', payload)
  },

  // Necessities
  async updateNecessity(payload) {
    // payload: { user, travelPlan, accommodation, diningFlag }
    return api.post('TripCostEstimation/updateNecessity', payload)
  },
  async resetNecessity(payload) {
    // payload: { user, travelPlan }
    return api.post('TripCostEstimation/resetNecessity', payload)
  },

  // Estimates (AI and manual)
  async generateAICostEstimate(payload) {
    // payload: { user, travelPlan }
    return api.post('TripCostEstimation/generateAICostEstimate', payload)
  },
  async estimateCost(payload){
    return api.post('TripCostEstimation/estimateCost', payload)
  },
  async editEstimateCost(payload) {
    // payload: { user, travelPlan, flight, roomsPerNight, foodDaily }
    return api.post('TripCostEstimation/editEstimateCost', payload)
  },
  async deleteEstimateCost(payload) {
    // payload: { user, costEstimate }
    return api.post('TripCostEstimation/deleteEstimateCost', payload)
  },

  // Queries
  async getTravelCities(payload) {
    // payload: { user, travelPlan }
    return api.post('TripCostEstimation/getTravelCities', payload)
  },
  async getTravelDates(payload) {
    // payload: { user, travelPlan }
    return api.post('TripCostEstimation/getTravelDates', payload)
  },
  async getAllTravelPlans(payload) {
    // payload: { user }
    return api.post('TripCostEstimation/_getAllTravelPlans', payload)
  }
}

export default api

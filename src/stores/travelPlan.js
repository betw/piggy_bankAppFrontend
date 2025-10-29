import { defineStore } from 'pinia'
import api from '../services/api'

const STORAGE_KEY = 'pb_travel_plans'

export const useTravelPlanStore = defineStore('travelPlan', {
  state: () => ({
    // single current travel plan (most recently viewed/created)
    currentPlan: null,
    // cached plans by id
    plans: {}
  }),
  actions: {
    hydrate() {
      try {
        const raw = localStorage.getItem(STORAGE_KEY)
        if (!raw) return
        const data = JSON.parse(raw)
        // Replace state objects to keep reactivity intact
        this.plans = data.plans || {}
        const cp = data.currentPlanId && this.plans[data.currentPlanId] ? this.plans[data.currentPlanId] : null
        this.currentPlan = cp
      } catch (e) {
        localStorage.removeItem(STORAGE_KEY)
      }
    },
    persist() {
      try {
        const currentPlanId = this.currentPlan?.id ?? null
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ currentPlanId, plans: this.plans }))
      } catch (e) {
        // ignore storage errors
      }
    },
    setCurrentPlan(plan) {
      this.currentPlan = plan
      if (plan?.id) this.plans[plan.id] = plan
      this.persist()
    },
    async createTravelPlan(payload) {
      // payload: { user, fromCity, toCity, fromDate, toDate }
      // log payload so client console shows attempt to create plan
      try {
  console.log('[travelPlan] createTravelPlan payload:', payload)
        const res = await api.post('TripCostEstimation/createTravelPlan', payload)
        if (res.data?.error) throw new Error(res.data.error)
        const travelPlan = res.data?.travelPlan ?? res.data
        if (travelPlan === undefined || travelPlan === null) throw new Error('No travelPlan returned')

        // Backend returns the id directly; build a minimal plan object
        const id = travelPlan
        const planObj = {
          id,
          fromCity: payload.fromCity,
          toCity: payload.toCity,
          fromDate: payload.fromDate,
          toDate: payload.toDate
        }
        this.setCurrentPlan(planObj)
        return planObj
      } catch (err) {
        // Log and rethrow so the UI can present an error; logging helps debugging when network doesn't fire
        console.error('[travelPlan] createTravelPlan error:', err)
        throw err
      }
    },
    // store a fetched plan
    cachePlan(plan) {
      if (!plan) return
      const id = plan.id ?? plan.travelPlanID
      if (id) {
        this.plans[id] = plan
        this.persist()
      }
    }
  }
})

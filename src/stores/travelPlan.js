import { defineStore } from 'pinia'
import api from '../services/api'

const STORAGE_KEY = 'pb_travel_plans'

function resolveUserId(user) {
  if (!user) return null
  if (typeof user === 'string') return user
  if (typeof user === 'object') {
    return user.id ?? user.userId ?? user.userID ?? user.username ?? user.name ?? null
  }
  return null
}

function resolvePlanIdentifiers(store, planId) {
  if (!planId) return { id: null, plan: null }
  const id = String(planId)
  const plan = store.plans?.[id] || (store.currentPlan && String(store.currentPlan.id) === id ? store.currentPlan : null)
  const travelPlanId = plan?.travelPlanID ?? plan?.travelPlanId ?? plan?.travel_plan_id ?? plan?.id ?? id
  return { id, plan, travelPlanId: String(travelPlanId) }
}

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
      if (plan?.id) {
        const planId = String(plan.id)
        const normalizedPlan = { ...plan, id: planId }
        this.currentPlan = normalizedPlan
        this.plans[planId] = normalizedPlan
      } else {
        this.currentPlan = plan
      }
      this.persist()
    },
    _mergePlanUpdate(planId, update) {
      if (!planId) return
      const id = String(planId)
      const merged = { ...(this.plans[id] || {}), ...update, id }
      this.plans[id] = merged
      if (this.currentPlan && String(this.currentPlan.id) === id) {
        this.currentPlan = merged
      }
      this.persist()
      return merged
    },
    async createTravelPlan(payload) {
      // payload: { user, fromCity, toCity, fromDate, toDate }
      // log payload so client console shows attempt to create plan
      try {
  console.log('[travelPlan] createTravelPlan payload:', payload)
  const res = await api.post('TripCostEstimation/createTravelPlan', payload)
  console.log('[travelPlan] createTravelPlan response:', res.data)
        if (res.data?.error) throw new Error(res.data.error)
        let travelPlan = res.data?.travelPlan ?? res.data
        if (travelPlan === undefined || travelPlan === null) throw new Error('No travelPlan returned')

        // Normalize plan object/id
        let id
        if (typeof travelPlan === 'object') {
          id = travelPlan.id ?? travelPlan.travelPlanID ?? travelPlan.travelPlanId ?? travelPlan.travel_plan_id
        } else {
          id = travelPlan
          travelPlan = null
        }
        if (id === undefined || id === null) throw new Error('No travelPlan id returned')
        const planId = String(id)
        const planObj = {
          id: planId,
          fromCity: payload.fromCity,
          toCity: payload.toCity,
          fromDate: payload.fromDate,
          toDate: payload.toDate,
          ...(typeof travelPlan === 'object' ? travelPlan : {})
        }
        this.setCurrentPlan(planObj)
        return planObj
      } catch (err) {
        // Log and rethrow so the UI can present an error; logging helps debugging when network doesn't fire
        console.error('[travelPlan] createTravelPlan error:', err)
        throw err
      }
    },
    async deleteTravelPlan(id, user) {
      if (!id) throw new Error('deleteTravelPlan: missing travel plan id')
      // API spec requires `user` to be an ID, not an object
      const userId = resolveUserId(user)
      if (!userId) throw new Error('deleteTravelPlan: missing user id')
      const { id: planId, travelPlanId } = resolvePlanIdentifiers(this, id)
      const payload = { user: userId, travelPlan: travelPlanId }
      try {
        console.log('[travelPlan] deleteTravelPlan request:', payload)
        // Call backend to delete
        const res = await api.post('TripCostEstimation/deleteTravelPlan', payload)
        if (res.data?.error) throw new Error(res.data.error)
      } catch (err) {
        console.error('[travelPlan] deleteTravelPlan error:', err)
        throw err?.response?.data?.error || err.message || err
      }
      // Update local state regardless of backend response shape
      try {
        // remove from cache
        if (this.plans && Object.prototype.hasOwnProperty.call(this.plans, planId)) {
          const copy = { ...this.plans }
          delete copy[planId]
          this.plans = copy
        }
        // clear currentPlan if it was the deleted one
        if (this.currentPlan && String(this.currentPlan.id) === planId) {
          this.currentPlan = null
        }
        this.persist()
      } catch {}
    },
    async generateCostEstimate(planId, user) {
      const userId = resolveUserId(user)
      if (!planId) throw new Error('generateCostEstimate: missing travel plan id')
      if (!userId) throw new Error('generateCostEstimate: missing user id')
      const { travelPlanId } = resolvePlanIdentifiers(this, planId)
      const payload = { user: userId, travelPlan: travelPlanId }
      try {
        console.log('[travelPlan] generateCostEstimate request:', payload)
        const res = await api.post('TripCostEstimation/generateAICostEstimate', payload)
        if (res.data?.error) throw new Error(res.data.error)
        const estimate = res.data?.costEstimate ?? res.data
        this._mergePlanUpdate(planId, {
          latestCostEstimate: estimate,
          costEstimate: estimate,
          mostRecentCostEstimate: estimate
        })
        return estimate
      } catch (err) {
        console.error('[travelPlan] generateCostEstimate error:', err)
        throw err?.response?.data?.error || err.message || err
      }
    },
    async estimateTotalCost(planId, user) {
      const userId = resolveUserId(user)
      if (!planId) throw new Error('estimateTotalCost: missing travel plan id')
      if (!userId) throw new Error('estimateTotalCost: missing user id')
      const { travelPlanId } = resolvePlanIdentifiers(this, planId)
      const payload = { user: userId, travelPlan: travelPlanId }
      try {
        console.log('[travelPlan] estimateTotalCost request:', payload)
        const res = await api.post('TripCostEstimation/estimateCost', payload)
        if (res.data?.error) throw new Error(res.data.error)
        const totalCost = res.data?.totalCost ?? res.data
        this._mergePlanUpdate(planId, { totalCost })
        return totalCost
      } catch (err) {
        console.error('[travelPlan] estimateTotalCost error:', err)
        throw err?.response?.data?.error || err.message || err
      }
    },
    async editCostEstimate(planId, user, { flight, roomsPerNight, foodDaily }) {
      const userId = resolveUserId(user)
      if (!planId) throw new Error('editCostEstimate: missing travel plan id')
      if (!userId) throw new Error('editCostEstimate: missing user id')
      const { travelPlanId } = resolvePlanIdentifiers(this, planId)
      const payload = {
        user: userId,
        travelPlan: travelPlanId,
        flight,
        roomsPerNight,
        foodDaily
      }
      try {
        console.log('[travelPlan] editCostEstimate request:', payload)
        const res = await api.post('TripCostEstimation/editEstimateCost', payload)
        if (res.data?.error) throw new Error(res.data.error)
        const estimate = res.data?.costEstimate ?? res.data
        this._mergePlanUpdate(planId, {
          latestCostEstimate: estimate,
          costEstimate: estimate,
          mostRecentCostEstimate: estimate
        })
        return estimate
      } catch (err) {
        console.error('[travelPlan] editCostEstimate error:', err)
        throw err?.response?.data?.error || err.message || err
      }
    },
  async updateNecessity(planId, user, { accommodation, diningFlag }) {
      const userId = resolveUserId(user)
      if (!planId) throw new Error('updateNecessity: missing travel plan id')
      if (!userId) throw new Error('updateNecessity: missing user id')
      const { travelPlanId } = resolvePlanIdentifiers(this, planId)
      const payload = {
        user: userId,
        travelPlan: travelPlanId,
        accommodation: Boolean(accommodation),
        diningFlag: Boolean(diningFlag)
      }
      try {
        console.log('[travelPlan] updateNecessity request:', payload)
        const res = await api.post('TripCostEstimation/updateNecessity', payload)
        if (res.data?.error) throw new Error(res.data.error)
        const responsePlan = typeof res.data?.travelPlan === 'object' ? res.data.travelPlan : null
        const responseNecessity = res.data?.necessity ?? {
          accommodation: payload.accommodation,
          diningFlag: payload.diningFlag
        }
        const update = {
          necessity: responseNecessity
        }
        if (responsePlan) {
          const sanitizedPlan = { ...responsePlan }
          delete sanitizedPlan.id
          Object.assign(update, sanitizedPlan)
        }
        return this._mergePlanUpdate(planId, update)
      } catch (err) {
        console.error('[travelPlan] updateNecessity error:', err)
        throw err?.response?.data?.error || err.message || err
      }
  },
    updateSavingsPlan(planId, savingsPlan) {
      if (!planId) return null
      const id = String(planId)
      const existingPlan = this.plans[id]?.savingsPlan || {}
      let mergedPlan = savingsPlan ? { ...existingPlan, ...savingsPlan } : null
      if (mergedPlan && mergedPlan.planId != null) {
        mergedPlan = { ...mergedPlan, planId: String(mergedPlan.planId) }
      }
      return this._mergePlanUpdate(id, {
        savingsPlan: mergedPlan
      })
    },
    updateSavingsProgress(planId, savingsProgress) {
      if (!planId) return null
      const id = String(planId)
      const existingProgress = this.plans[id]?.savingsProgress || {}
      const mergedProgress = savingsProgress ? { ...existingProgress, ...savingsProgress } : null
      return this._mergePlanUpdate(id, {
        savingsProgress: mergedProgress
      })
    },
    // store a fetched plan
    cachePlan(plan) {
      if (!plan) return
      const id = plan.id ?? plan.travelPlanID
      if (id) {
        const planId = String(id)
        this.plans[planId] = { ...plan, id: planId }
        if (this.currentPlan && String(this.currentPlan.id) === planId) {
          this.currentPlan = { ...plan, id: planId }
        }
        this.persist()
      }
    }
  }
})

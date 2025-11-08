import { defineStore } from 'pinia'
import api, { costEstimateAPI } from '../services/api'
import { useNotificationStore } from './notification'
import { useUserStore } from './user'

const STORAGE_KEY_PREFIX = 'pb_travel_plans'
const HALF_MESSAGE = 'You are halfway there!'
const GOAL_MESSAGE = 'Goal completed!'
const SAVINGS_REMINDER_TYPE = 'savings_reminder'
const SAVINGS_REMINDER_LABEL = 'Savings reminder'

function normalizeId(value) {
  if (value === undefined || value === null) return null
  if (typeof value === 'number' && Number.isFinite(value)) return String(value)
  if (typeof value === 'string') {
    const trimmed = value.trim()
    return trimmed.length ? trimmed : null
  }
  return null
}

function resolveUserId(user) {
      if (!user) return null
      if (typeof user === 'string') return user
      if (typeof user === 'object') return user.id || user.userId || user.userID || user.username || user.name || null
      return null
    }

    function resolveStorageScope() {
      try {
        const userStore = useUserStore()
        const identifier = resolveUserId(userStore?.currentUser) || userStore?.username || 'anonymous'
        const trimmed = String(identifier).trim()
        return trimmed.length ? `${STORAGE_KEY_PREFIX}::${trimmed}` : `${STORAGE_KEY_PREFIX}::anonymous`
      } catch (e) {
        return `${STORAGE_KEY_PREFIX}::anonymous`
      }
    }

    function extractProgressTrackingId(plan) {
      if (!plan || typeof plan !== 'object') return null
      const savings = plan.savingsPlan || plan.savings_plan || {}
      const progress = plan.savingsProgress || plan.savings_progress || {}
      const candidates = [
        plan.progressTrackingId,
        plan.progressTrackingID,
        plan.progress_tracking_id,
        plan.progressId,
        plan.progressID,
        plan.progress,
        savings.progressTrackingId,
        savings.progressTrackingID,
        savings.progress_tracking_id,
        savings.planId,
        savings.id,
        progress.progressTrackingId,
        progress.progressTrackingID,
        progress.progress_tracking_id,
        progress.planId,
        progress.id
      ]
      for (const c of candidates) {
        const n = normalizeId(c)
        if (n) return n
      }
      return normalizeId(plan.id)
    }

    function calculateProgressPercent(plan) {
      if (!plan || typeof plan !== 'object') return null
      const savingsPlan = plan.savingsPlan || {}
      const savingsProgress = plan.savingsProgress || {}
      const goal = Number(
        savingsPlan.goalAmount ||
          savingsPlan.goal_amount ||
          plan.goalAmount ||
          plan.goal_amount ||
          plan.totalCost ||
          plan.total_cost
      )
      const current = Number(savingsPlan.currentAmount || savingsPlan.current_amount)
      if (Number.isFinite(goal) && goal > 0 && Number.isFinite(current)) return (current / goal) * 100
      const manual = Number(
        savingsProgress.manualContribution ||
          savingsProgress.savedAmount ||
          savingsProgress.amount ||
          savingsProgress.saved_amount
      )
      if (Number.isFinite(goal) && goal > 0 && Number.isFinite(manual)) return (manual / goal) * 100
      const base = Number(
        savingsProgress.basePercent ||
          savingsProgress.base_percent ||
          savingsProgress.base ||
          plan.progress ||
          plan.progressPercent ||
          plan.progress_percentage
      )
      return Number.isFinite(base) ? base : null
    }

    function isHalfwayNotified(plan) {
      const s = plan?.savingsPlan || {}
      const flags = [s.halfwayNotified, s.halfway_notified, plan.halfwayNotified, plan.halfway_notified]
      return flags.some((v) => v === true || v === 'true' || v === 1 || v === '1')
    }
    function isGoalNotified(plan) {
      const s = plan?.savingsPlan || {}
      const flags = [
        s.goalNotified,
        s.goal_notified,
        plan.goalNotified,
        plan.goal_notified,
        plan.goalCompletedNotified,
        plan.goal_completed_notified
      ]
      return flags.some((v) => v === true || v === 'true' || v === 1 || v === '1')
    }

    function resolveFrequency(plan) {
      const s = plan?.savingsPlan || {}
      const raw = Number(s.paymentPeriod || s.payment_period || plan.paymentPeriod)
      return Number.isFinite(raw) && raw > 0 ? raw : 0
    }

    function resolvePlanIdentifiers(store, planId) {
      if (!planId) return { id: null, travelPlanId: null }
      const id = String(planId)
      const plan = store.plans?.[id] || (store.currentPlan && String(store.currentPlan.id) === id ? store.currentPlan : null)
      // According to API spec, travelPlan field IS the TravelPlan ID
      const travelPlanId = plan?.id || id
      return { id, travelPlanId: String(travelPlanId) }
    }

    export const useTravelPlanStore = defineStore('travelPlan', {
      state: () => ({
        currentPlan: null,
        plans: {},
        halfwayRequests: {},
        goalRequests: {},
        storageScope: null
      }),
      actions: {
        _resetState() {
          this.currentPlan = null
          this.plans = {}
          this.halfwayRequests = {}
          this.goalRequests = {}
        },
        hydrate() {
          const scopeKey = resolveStorageScope()
          if (this.storageScope !== scopeKey) {
            this._resetState()
            this.storageScope = scopeKey
          }
          try {
            const raw = localStorage.getItem(scopeKey)
            if (!raw) return
            const data = JSON.parse(raw)
            this.plans = data.plans || {}
            const cp = data.currentPlanId && this.plans[data.currentPlanId] ? this.plans[data.currentPlanId] : null
            this.currentPlan = cp
            Object.keys(this.plans).forEach((pid) => this._scheduleHalfwayCheck(pid))
            if (cp?.id) this._scheduleHalfwayCheck(cp.id)
          } catch {}
        },
        persist() {
          const scopeKey = resolveStorageScope()
          if (this.storageScope !== scopeKey) this.storageScope = scopeKey
          try {
            const currentPlanId = this.currentPlan?.id ?? null
            localStorage.setItem(scopeKey, JSON.stringify({ currentPlanId, plans: this.plans }))
          } catch {}
        },
        setCurrentPlan(plan) {
          if (plan?.id) {
            const planId = String(plan.id)
            const base = { ...plan, id: planId }
            const progressTrackingId = extractProgressTrackingId(base)
            const normalized = progressTrackingId ? { ...base, progressTrackingId } : base
            this.currentPlan = normalized
            this.plans[planId] = normalized
            this._scheduleHalfwayCheck(planId)
          } else {
            this.currentPlan = plan
          }
          this.persist()
        },
        _mergePlanUpdate(planId, update) {
          if (!planId) return
          const id = String(planId)
          const existing = this.plans[id] || {}
          const mergedBase = { ...existing, ...update, id }
          const progressTrackingId = extractProgressTrackingId(mergedBase)
          const merged = progressTrackingId ? { ...mergedBase, progressTrackingId } : mergedBase
          this.plans[id] = merged
          if (this.currentPlan && String(this.currentPlan.id) === id) this.currentPlan = merged
          this.persist()
          this._scheduleHalfwayCheck(id)
          return merged
        },
        async createTravelPlan(payload) {
          try {
            try {
              const userStore = useUserStore()
              if (userStore?.session) payload = { ...payload, session: userStore.session }
            } catch {}
            const res = await costEstimateAPI.createTravelPlan(payload)
            if (res.data?.error) throw new Error(res.data.error)
            
            // According to API spec, response is { travelPlan: "TravelPlan" }
            const travelPlanId = res.data?.travelPlan
            if (!travelPlanId) throw new Error('No travelPlan returned')
            
            const planId = String(travelPlanId)
            const planObj = {
              id: planId,
              fromCity: payload.fromCity,
              toCity: payload.toCity,
              fromDate: payload.fromDate,
              toDate: payload.toDate,
              progressTrackingId: null
            }
            this.setCurrentPlan(planObj)
            return planObj
          } catch (err) {
            console.error('[travelPlan] createTravelPlan error:', err)
            throw err
          }
        },
        async deleteTravelPlan(id) {
          if (!id) throw new Error('deleteTravelPlan: missing travel plan id')
          const { id: planId, travelPlanId } = resolvePlanIdentifiers(this, id)
          let payload = { travelPlan: travelPlanId }
          try {
            try {
              const userStore = useUserStore()
              if (userStore?.session) payload = { ...payload, session: userStore.session }
            } catch {}
            const res = await costEstimateAPI.deleteTravelPlan(payload)
            if (res.data?.error) throw new Error(res.data.error)
          } catch (err) {
            console.error('[travelPlan] deleteTravelPlan error:', err)
            throw err?.response?.data?.error || err.message || err
          }
          try {
            if (this.plans[planId]) {
              const copy = { ...this.plans }
              delete copy[planId]
              this.plans = copy
            }
            if (this.currentPlan && String(this.currentPlan.id) === planId) this.currentPlan = null
            this.persist()
          } catch {}
        },
        async generateCostEstimate(planId) {
          if (!planId) throw new Error('generateCostEstimate: missing travel plan id')
          const { travelPlanId } = resolvePlanIdentifiers(this, planId)
          let payload = { travelPlan: travelPlanId }
          try {
            try {
              const userStore = useUserStore()
              if (userStore?.session) payload = { ...payload, session: userStore.session }
            } catch {}
            const res = await costEstimateAPI.generateAICostEstimate(payload)
            if (res.data?.error) throw new Error(res.data.error)
            
            // According to API spec, response is { costEstimate: "CostEstimate" }
            const estimate = res.data?.costEstimate
            this._mergePlanUpdate(planId, { latestCostEstimate: estimate, costEstimate: estimate, mostRecentCostEstimate: estimate })
            return estimate
          } catch (err) {
            console.error('[travelPlan] generateCostEstimate error:', err)
            throw err?.response?.data?.error || err.message || err
          }
        },
        async estimateTotalCost(planId) {
          if (!planId) throw new Error('estimateTotalCost: missing travel plan id')
          const { travelPlanId } = resolvePlanIdentifiers(this, planId)
          let payload = { travelPlan: travelPlanId }
          try {
            try {
              const userStore = useUserStore()
              if (userStore?.session) payload = { ...payload, session: userStore.session }
            } catch {}
            const res = await costEstimateAPI.estimateCost(payload)
            if (res.data?.error) throw new Error(res.data.error)
            
            // According to API spec, response is { totalCost: "Number" }
            const totalCost = res.data?.totalCost
            this._mergePlanUpdate(planId, { totalCost })
            return totalCost
          } catch (err) {
            console.error('[travelPlan] estimateTotalCost error:', err)
            throw err?.response?.data?.error || err.message || err
          }
        },
        async editCostEstimate(planId, _user, { flight, roomsPerNight, foodDaily }) {
          if (!planId) throw new Error('editCostEstimate: missing travel plan id')
          const { travelPlanId } = resolvePlanIdentifiers(this, planId)
          let payload = { travelPlan: travelPlanId, flight, roomsPerNight, foodDaily }
          try {
            try {
              const userStore = useUserStore()
              if (userStore?.session) payload = { ...payload, session: userStore.session }
            } catch {}
            const res = await costEstimateAPI.editEstimateCost(payload)
            if (res.data?.error) throw new Error(res.data.error)
            const estimate = res.data?.costEstimate ?? res.data
            this._mergePlanUpdate(planId, { latestCostEstimate: estimate, costEstimate: estimate, mostRecentCostEstimate: estimate })
            return estimate
          } catch (err) {
            console.error('[travelPlan] editCostEstimate error:', err)
            throw err?.response?.data?.error || err.message || err
          }
        },
        async updateNecessity(planId, _user, { accommodation, diningFlag }) {
          if (!planId) throw new Error('updateNecessity: missing travel plan id')
          const { travelPlanId } = resolvePlanIdentifiers(this, planId)
          let payload = { travelPlan: travelPlanId, accommodation: Boolean(accommodation), diningFlag: Boolean(diningFlag) }
          try {
            try {
              const userStore = useUserStore()
              if (userStore?.session) payload = { ...payload, session: userStore.session }
            } catch {}
            const res = await costEstimateAPI.updateNecessity(payload)
            if (res.data?.error) throw new Error(res.data.error)
            const responsePlan = typeof res.data?.travelPlan === 'object' ? res.data.travelPlan : null
            const responseNecessity = res.data?.necessity ?? { accommodation: payload.accommodation, diningFlag: payload.diningFlag }
            const update = { necessity: responseNecessity }
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
          const existing = this.plans[id]?.savingsPlan || {}
          let mergedPlan = savingsPlan ? { ...existing, ...savingsPlan } : null
          if (mergedPlan && mergedPlan.planId != null) mergedPlan = { ...mergedPlan, planId: String(mergedPlan.planId) }
          const update = { savingsPlan: mergedPlan }
          if (mergedPlan) {
            const derived = extractProgressTrackingId({ savingsPlan: mergedPlan })
            if (derived) update.progressTrackingId = derived
          }
          return this._mergePlanUpdate(id, update)
        },
        updateSavingsProgress(planId, savingsProgress) {
          if (!planId) return null
          const id = String(planId)
          const existing = this.plans[id]?.savingsProgress || {}
          const mergedProgress = savingsProgress ? { ...existing, ...savingsProgress } : null
          const update = { savingsProgress: mergedProgress }
          if (mergedProgress) {
            const derived = extractProgressTrackingId({ savingsProgress: mergedProgress })
            if (derived) update.progressTrackingId = derived
          }
          return this._mergePlanUpdate(id, update)
        },
        _scheduleHalfwayCheck(planId) {
          const id = normalizeId(planId)
          if (!id) return
          Promise.resolve().then(() => {
            const plan = this.plans[id] || (this.currentPlan && normalizeId(this.currentPlan.id) === id ? this.currentPlan : null)
            if (plan) {
              this._maybeTriggerHalfway(id, plan)
              this._maybeTriggerGoalCompletion(id, plan)
            }
          })
        },
        async _maybeTriggerHalfway(planId, plan) {
          const progressValue = calculateProgressPercent(plan)
          if (progressValue == null) return
          const pct = Number(progressValue)
          if (!Number.isFinite(pct) || pct < 50) return
          if (isHalfwayNotified(plan)) return
          const canonicalPlanId = normalizeId(planId)
          const progressTrackingId = extractProgressTrackingId(plan) || canonicalPlanId
          if (!progressTrackingId) return
          const notificationStore = useNotificationStore()
          const existing = notificationStore.notifications.find((n) => n?.progress === progressTrackingId && n?.message === HALF_MESSAGE)
          if (existing) {
            notificationStore.setNotificationMeta?.(existing.id, { planId: canonicalPlanId || planId, progress: progressTrackingId })
            this._markHalfwayNotified(planId, existing.id)
            return
          }
          const requestKey = canonicalPlanId || planId
          if (this.halfwayRequests[requestKey]) return
          this.halfwayRequests = { ...this.halfwayRequests, [requestKey]: true }
          try {
            const frequency = resolveFrequency(plan)
            const created = await notificationStore.createNotification(
              { progress: progressTrackingId, message: HALF_MESSAGE, frequency },
              { planId: canonicalPlanId || planId, reminderType: 'milestone_halfway' }
            )
            if (created?.id) {
              notificationStore.setNotificationMeta?.(created.id, { planId: canonicalPlanId || planId, progress: progressTrackingId })
              this._markHalfwayNotified(planId, created.id)
            }
          } catch (e) {
            console.error('[travelPlan] halfway notification error:', e)
          } finally {
            const { [requestKey]: _ignore, ...rest } = this.halfwayRequests
            this.halfwayRequests = rest
          }
        },
        async _maybeTriggerGoalCompletion(planId, plan) {
          const progressValue = calculateProgressPercent(plan)
          if (progressValue == null) return
          const pct = Number(progressValue)
          if (!Number.isFinite(pct) || pct < 100) return
          if (isGoalNotified(plan)) return
          const canonicalPlanId = normalizeId(planId)
          const progressTrackingId = extractProgressTrackingId(plan) || canonicalPlanId
          if (!progressTrackingId) return
          const notificationStore = useNotificationStore()
          const existing = notificationStore.notifications.find((item) => {
            if (!item) return false
            const msg = String(item.message || '').toLowerCase()
            const isGoalMsg = msg.includes('goal') && (msg.includes('complete') || msg.includes('completion'))
            const progressMatch = normalizeId(item.progress) === progressTrackingId
            const planMatch = normalizeId(item.planId) === canonicalPlanId
            return isGoalMsg && (progressMatch || planMatch)
          })
          if (existing) {
            notificationStore.setNotificationMeta?.(existing.id, { planId: canonicalPlanId || planId, progress: progressTrackingId })
            this._markGoalNotified(planId, existing.id)
            return
          }
          const requestKey = canonicalPlanId || planId
          if (this.goalRequests[requestKey]) return
          this.goalRequests = { ...this.goalRequests, [requestKey]: true }
          try {
            const frequency = resolveFrequency(plan)
            const created = await notificationStore.createNotification(
              { progress: progressTrackingId, message: GOAL_MESSAGE, frequency },
              { planId: canonicalPlanId || planId, reminderType: 'milestone_goal' }
            )
            if (created?.id) {
              notificationStore.setNotificationMeta?.(created.id, { planId: canonicalPlanId || planId, progress: progressTrackingId })
              this._markGoalNotified(planId, created.id)
            }
          } catch (e) {
            console.error('[travelPlan] goal notification error:', e)
          } finally {
            const { [requestKey]: _ignore, ...rest } = this.goalRequests
            this.goalRequests = rest
          }
        },
        _markHalfwayNotified(planId, notificationId = null) {
          const id = normalizeId(planId)
          if (!id) return
          const existing = this.plans[id]
          if (!existing) return
          const updatedSavings = { ...(existing.savingsPlan || {}), halfwayNotified: true }
          const updated = { ...existing, savingsPlan: updatedSavings, halfwayNotificationId: notificationId || existing.halfwayNotificationId || null }
          this.plans = { ...this.plans, [id]: updated }
          if (this.currentPlan && normalizeId(this.currentPlan.id) === id) this.currentPlan = updated
          this.persist()
        },
        _markGoalNotified(planId, notificationId = null) {
          const id = normalizeId(planId)
          if (!id) return
          const existing = this.plans[id]
          if (!existing) return
          const updatedSavings = { ...(existing.savingsPlan || {}), goalNotified: true }
          const updated = { ...existing, savingsPlan: updatedSavings, goalNotificationId: notificationId || existing.goalNotificationId || null, goalNotified: true }
          this.plans = { ...this.plans, [id]: updated }
          if (this.currentPlan && normalizeId(this.currentPlan.id) === id) this.currentPlan = updated
          this.persist()
        },
        cachePlan(plan) {
          if (!plan) return
          const id = plan.id || plan.travelPlanID
          if (!id) return
          const planId = String(id)
          const base = { ...plan, id: planId }
          const progressTrackingId = extractProgressTrackingId(base)
          const normalized = progressTrackingId ? { ...base, progressTrackingId } : base
          this.plans[planId] = normalized
          if (this.currentPlan && String(this.currentPlan.id) === planId) this.currentPlan = normalized
          this.persist()
          this._scheduleHalfwayCheck(planId)
        }
      }
    })

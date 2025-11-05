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

function resolveStorageScope() {
  try {
    const userStore = useUserStore()
    const candidate = userStore?.currentUser ?? null
    let identifier = resolveUserId(candidate)
    if (!identifier && userStore?.username) {
      identifier = String(userStore.username)
    }
    if (!identifier) return `${STORAGE_KEY_PREFIX}::anonymous`
    const trimmed = String(identifier).trim()
    return trimmed.length ? `${STORAGE_KEY_PREFIX}::${trimmed}` : `${STORAGE_KEY_PREFIX}::anonymous`
  } catch (err) {
    console.error('[travelPlan] resolveStorageScope failed:', err)
    return `${STORAGE_KEY_PREFIX}::anonymous`
  }
}

function extractProgressTrackingId(plan) {
  if (!plan || typeof plan !== 'object') return null
  const savings = plan.savingsPlan || plan.savings_plan || {}
  const savingsProgress = plan.savingsProgress || plan.savings_progress || {}
  const candidates = [
    plan.progressTrackingId,
    plan.progressTrackingID,
    plan.progress_tracking_id,
    plan.progressId,
    plan.progressID,
    plan.progress,
    plan.progressTracking,
    savings.progressTrackingId,
    savings.progressTrackingID,
    savings.progress_tracking_id,
    savings.planId,
    savings.planID,
    savings.savingsPlanId,
    savings.savingsPlanID,
    savings.progressTracking,
    savings.id,
    savings.progressId,
    savings.progressID,
    savings.progress,
    savingsProgress.progressTrackingId,
    savingsProgress.progressTrackingID,
    savingsProgress.progress_tracking_id,
    savingsProgress.id,
    savingsProgress.planId,
    savingsProgress.planID,
    savingsProgress.progressTracking,
    savingsProgress.progressId,
    savingsProgress.progressID,
    savingsProgress.progress
  ]
  for (const candidate of candidates) {
    const normalized = normalizeId(candidate)
    if (normalized) return normalized
  }
  return normalizeId(plan.id)
}

function resolveSavingsPaymentPeriod(plan) {
  if (!plan || typeof plan !== 'object') return null
  const savings = plan.savingsPlan || {}
  const raw =
    savings.paymentPeriod ??
    savings.payment_period ??
    plan.paymentPeriod ??
    plan.payment_period ??
    null
  const value = Number(raw)
  return Number.isFinite(value) && value > 0 ? Math.max(1, Math.round(value)) : null
}

function resolveSavingsAmountPerPeriod(plan) {
  if (!plan || typeof plan !== 'object') return null
  const savings = plan.savingsPlan || {}
  const raw =
    savings.amountPerPeriod ??
    savings.amount_per_period ??
    savings.amount ??
    plan.amountPerPeriod ??
    plan.amount_per_period ??
    null
  const value = Number(raw)
  return Number.isFinite(value) && value > 0 ? value : null
}

function formatCurrencyUSD(amount) {
  if (!Number.isFinite(amount)) return 'USD savings amount'
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' }).format(amount)
  } catch (err) {
    return `$${amount.toFixed(2)}`
  }
}

function calculateProgressPercent(plan) {
  if (!plan || typeof plan !== 'object') return null
  const savingsPlan = plan.savingsPlan || plan.savings_plan || {}
  const savingsProgress = plan.savingsProgress || plan.savings_progress || {}
  const goal = Number(
    savingsPlan.goalAmount ??
      savingsPlan.goal_amount ??
      plan.goalAmount ??
      plan.goal_amount ??
      plan.totalCost ??
      plan.total_cost
  )
  const current = Number(savingsPlan.currentAmount ?? savingsPlan.current_amount)
  if (Number.isFinite(goal) && goal > 0 && Number.isFinite(current)) {
    return (current / goal) * 100
  }
  const manual = Number(
    savingsProgress.manualContribution ??
      savingsProgress.amount ??
      savingsProgress.savedAmount ??
      savingsProgress.saved_amount
  )
  if (Number.isFinite(goal) && goal > 0 && Number.isFinite(manual)) {
    return (manual / goal) * 100
  }
  const basePercent = Number(
    savingsProgress.basePercent ??
      savingsProgress.base_percent ??
      savingsProgress.base ??
      plan.progress ??
      plan.progressPercent ??
      plan.progress_percentage
  )
  if (Number.isFinite(basePercent)) return basePercent
  return null
}

function isHalfwayNotified(plan) {
  if (!plan || typeof plan !== 'object') return false
  const savings = plan.savingsPlan || {}
  const flags = [
    savings.halfwayNotified,
    savings.halfway_notified,
    savings.metadata?.halfwayNotified,
    plan.halfwayNotified,
    plan.halfway_notified
  ]
  return flags.some((value) => value === true || value === 'true' || value === 1 || value === '1')
}

function isGoalNotified(plan) {
  if (!plan || typeof plan !== 'object') return false
  const savings = plan.savingsPlan || {}
  const flags = [
    savings.goalNotified,
    savings.goal_notified,
    savings.metadata?.goalNotified,
    plan.goalNotified,
    plan.goal_notified,
    plan.goalCompletedNotified,
    plan.goal_completed_notified
  ]
  return flags.some((value) => value === true || value === 'true' || value === 1 || value === '1')
}

function resolveFrequency(plan) {
  if (!plan || typeof plan !== 'object') return 0
  const savings = plan.savingsPlan || {}
  const raw = Number(savings.paymentPeriod ?? savings.payment_period ?? plan.paymentPeriod)
  return Number.isFinite(raw) && raw > 0 ? raw : 0
}

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
  const travelPlanId = plan?.travelPlanID ?? plan?.travelPlanId ?? plan?.travel_plan_id ?? plan?.progressTrackingId ?? plan?.progressTrackingID ?? plan?.progress_tracking_id ?? plan?.progressId ?? plan?.progressID ?? plan?.progress ?? plan?.id ?? id
  return { id, plan, travelPlanId: String(travelPlanId) }
}

export const useTravelPlanStore = defineStore('travelPlan', {
  state: () => ({
    // single current travel plan (most recently viewed/created)
    currentPlan: null,
    // cached plans by id
    plans: {},
    // track in-flight halfway notification creation by plan id
    halfwayRequests: {},
    // track in-flight goal completion notification creation by plan id
    goalRequests: {},
    savingsReminderRequests: {},
    storageScope: null
  }),
  actions: {
    _resetState() {
      this.currentPlan = null
      this.plans = {}
      this.halfwayRequests = {}
      this.goalRequests = {}
      this.savingsReminderRequests = {}
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
        // Replace state objects to keep reactivity intact
        this.plans = data.plans || {}
        const cp = data.currentPlanId && this.plans[data.currentPlanId] ? this.plans[data.currentPlanId] : null
        this.currentPlan = cp
        this.halfwayRequests = {}
        this.goalRequests = {}
        this.savingsReminderRequests = {}
        Object.keys(this.plans || {}).forEach((planId) => this._scheduleHalfwayCheck(planId))
        if (cp?.id) {
          this._scheduleHalfwayCheck(cp.id)
        }
      } catch (e) {
        try {
          localStorage.removeItem(scopeKey)
        } catch {}
      }
    },
    persist() {
      const scopeKey = resolveStorageScope()
      if (this.storageScope !== scopeKey) {
        this.storageScope = scopeKey
      }
      try {
        const currentPlanId = this.currentPlan?.id ?? null
        localStorage.setItem(scopeKey, JSON.stringify({ currentPlanId, plans: this.plans }))
      } catch (e) {
        // ignore storage errors
      }
    },
    setCurrentPlan(plan) {
      if (plan?.id) {
        const planId = String(plan.id)
        const basePlan = {
          ...plan,
          id: planId,
          user: plan?.user ?? plan?.userId ?? plan?.userID ?? plan?.owner ?? plan?.ownerId ?? plan?.ownerID ?? this.currentPlan?.user ?? null
        }
        const progressTrackingId = basePlan.progressTrackingId ?? extractProgressTrackingId(basePlan)
        const normalizedPlan = progressTrackingId ? { ...basePlan, progressTrackingId } : basePlan
        this.currentPlan = normalizedPlan
        this.plans[planId] = normalizedPlan
        if (normalizedPlan.halfwayNotificationId) {
          try {
            const notificationStore = useNotificationStore()
            if (notificationStore && typeof notificationStore.setNotificationMeta === 'function') {
              notificationStore.setNotificationMeta(normalizedPlan.halfwayNotificationId, {
                planId,
                progress: normalizedPlan.progressTrackingId ?? progressTrackingId ?? null
              })
            }
          } catch (err) {
            console.error('[travelPlan] setCurrentPlan notification meta failed:', err)
          }
        }
        if (normalizedPlan.goalNotificationId) {
          try {
            const notificationStore = useNotificationStore()
            if (notificationStore && typeof notificationStore.setNotificationMeta === 'function') {
              notificationStore.setNotificationMeta(normalizedPlan.goalNotificationId, {
                planId,
                progress: normalizedPlan.progressTrackingId ?? progressTrackingId ?? null
              })
            }
          } catch (err) {
            console.error('[travelPlan] setCurrentPlan goal notification meta failed:', err)
          }
        }
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
      const progressTrackingId = mergedBase.progressTrackingId ?? extractProgressTrackingId(mergedBase)
      const merged = progressTrackingId ? { ...mergedBase, progressTrackingId } : mergedBase
      console.log('[travelPlan] merge plan update', { planId: id, progressTrackingId: merged.progressTrackingId, keys: Object.keys(update || {}) })
      this.plans[id] = merged
      if (this.currentPlan && String(this.currentPlan.id) === id) {
        this.currentPlan = merged
      }
      if (merged.halfwayNotificationId) {
        try {
          const notificationStore = useNotificationStore()
          if (notificationStore && typeof notificationStore.setNotificationMeta === 'function') {
            notificationStore.setNotificationMeta(merged.halfwayNotificationId, {
              planId: id,
              progress: merged.progressTrackingId ?? progressTrackingId ?? null
            })
          }
        } catch (err) {
          console.error('[travelPlan] merge plan set notification meta failed:', err)
        }
      }
      if (merged.goalNotificationId) {
        try {
          const notificationStore = useNotificationStore()
          if (notificationStore && typeof notificationStore.setNotificationMeta === 'function') {
            notificationStore.setNotificationMeta(merged.goalNotificationId, {
              planId: id,
              progress: merged.progressTrackingId ?? progressTrackingId ?? null
            })
          }
        } catch (err) {
          console.error('[travelPlan] merge plan set goal notification meta failed:', err)
        }
      }
      this.persist()
      this._scheduleHalfwayCheck(id)
      return merged
    },
    async createTravelPlan(payload) {
      // payload: { user, fromCity, toCity, fromDate, toDate }
      // log payload so client console shows attempt to create plan
      try {
  console.log('[travelPlan] createTravelPlan payload:', payload)
  // include session if available in the payload body
  try {
    const userStore = useUserStore()
    if (userStore?.session) {
      payload = { ...payload, session: userStore.session } // avoid mutating caller's object
    }
  } catch {}
  const res = await costEstimateAPI.createTravelPlan(payload)
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
        const ownerId = resolveUserId(payload.user)
        const progressTrackingId = extractProgressTrackingId(travelPlan)
        const planObj = {
          id: planId,
          fromCity: payload.fromCity,
          toCity: payload.toCity,
          fromDate: payload.fromDate,
          toDate: payload.toDate,
          user: ownerId,
          progressTrackingId: progressTrackingId ?? null,
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
  const res = await costEstimateAPI.deleteTravelPlan(payload)
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
  const res = await costEstimateAPI.generateAICostEstimate(payload)
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
  const res = await costEstimateAPI.estimateCost(payload)
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
  const res = await costEstimateAPI.editEstimateCost(payload)
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
  const res = await costEstimateAPI.updateNecessity(payload)
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
      const update = {
        savingsPlan: mergedPlan
      }
      if (mergedPlan) {
        const derivedProgressId = extractProgressTrackingId({ savingsPlan: mergedPlan })
        if (derivedProgressId) {
          update.progressTrackingId = derivedProgressId
        }
      }
      const merged = this._mergePlanUpdate(id, update)
      if (merged) {
        this._ensureSavingsReminder(id, merged)
      }
      return merged
    },
    updateSavingsProgress(planId, savingsProgress) {
      if (!planId) return null
      const id = String(planId)
      const existingProgress = this.plans[id]?.savingsProgress || {}
      const mergedProgress = savingsProgress ? { ...existingProgress, ...savingsProgress } : null
      const update = {
        savingsProgress: mergedProgress
      }
      if (mergedProgress) {
        const derivedProgressId = extractProgressTrackingId({ savingsProgress: mergedProgress })
        if (derivedProgressId) {
          update.progressTrackingId = derivedProgressId
        }
      }
      return this._mergePlanUpdate(id, update)
    },
    _scheduleHalfwayCheck(planId) {
      const id = normalizeId(planId)
      if (!id) return
      console.log('[travelPlan] schedule halfway check', id)
      Promise.resolve().then(() => {
        const plan = this.plans[id] || (this.currentPlan && normalizeId(this.currentPlan.id) === id ? this.currentPlan : null)
        console.log('[travelPlan] halfway check plan lookup', { id, hasPlan: Boolean(plan) })
        if (plan) {
          this._maybeTriggerHalfway(id, plan)
          this._maybeTriggerGoalCompletion(id, plan)
          this._ensureSavingsReminder(id, plan)
        }
      })
    },
    async _maybeTriggerHalfway(planId, plan) {
      const progressValue = calculateProgressPercent(plan)
      if (progressValue === null || progressValue === undefined) return
      const numericProgress = Number(progressValue)
      if (!Number.isFinite(numericProgress) || numericProgress < 50) return
      if (isHalfwayNotified(plan)) return

      const canonicalPlanId = normalizeId(planId)
      const progressTrackingId = extractProgressTrackingId(plan) ?? canonicalPlanId
      console.log('[travelPlan] halfway check', {
        planId,
        progressValue,
        progressTrackingId,
        halfwayNotified: isHalfwayNotified(plan)
      })
      if (!progressTrackingId) return

      let userId = resolveUserId(
        plan.user ??
          plan.userId ??
          plan.userID ??
          plan.owner ??
          plan.ownerId ??
          plan.ownerID ??
          (this.currentPlan && normalizeId(this.currentPlan.id) === normalizeId(plan.id) ? this.currentPlan.user : null)
      )
      if (!userId) {
        const userStore = useUserStore()
        userId = resolveUserId(userStore.currentUser)
      }
      if (!userId) return

      const notificationStore = useNotificationStore()
      const existingNotification = notificationStore.notifications.find(
        (item) => item?.progress === progressTrackingId && item?.message === HALF_MESSAGE
      )
      if (existingNotification) {
        if (typeof notificationStore.setNotificationMeta === 'function') {
          notificationStore.setNotificationMeta(existingNotification.id, {
            planId: canonicalPlanId ?? planId,
            progress: progressTrackingId
          })
        }
        this._markHalfwayNotified(planId, existingNotification.id)
        return
      }

      const requestKey = canonicalPlanId ?? planId
      if (requestKey && this.halfwayRequests[requestKey]) return
      this.halfwayRequests = requestKey
        ? { ...this.halfwayRequests, [requestKey]: true }
        : { ...this.halfwayRequests, [planId]: true }

      try {
        const frequency = resolveFrequency(plan)
        console.log('[travelPlan] creating halfway notification', {
          planId,
          userId,
          progressTrackingId,
          frequency
        })
        const created = await notificationStore.createNotification(
          {
            user: userId,
            progress: progressTrackingId,
            message: HALF_MESSAGE,
            frequency
          },
          { planId: canonicalPlanId ?? planId }
        )
        console.log('[travelPlan] halfway notification result', created)
        if (created?.id) {
          if (typeof notificationStore.setNotificationMeta === 'function') {
            notificationStore.setNotificationMeta(created.id, {
              planId: canonicalPlanId ?? planId,
              progress: progressTrackingId
            })
          }
          this._markHalfwayNotified(planId, created.id)
          if (typeof notificationStore.hydrateNotificationDetails === 'function') {
            try {
              await notificationStore.hydrateNotificationDetails(created.id, userId)
            } catch (hydrateErr) {
              console.error('[travelPlan] hydrateHalfwayNotification failed:', hydrateErr)
            }
          }
        }
      } catch (err) {
        console.error('[travelPlan] createHalfwayNotification error:', err)
      } finally {
        if (requestKey) {
          const { [requestKey]: _ignore, ...rest } = this.halfwayRequests
          this.halfwayRequests = rest
        } else {
          const { [planId]: _ignore, ...rest } = this.halfwayRequests
          this.halfwayRequests = rest
        }
      }
    },
    async _maybeTriggerGoalCompletion(planId, plan) {
      const progressValue = calculateProgressPercent(plan)
      if (progressValue === null || progressValue === undefined) return
      const numericProgress = Number(progressValue)
      if (!Number.isFinite(numericProgress) || numericProgress < 100) return
      if (isGoalNotified(plan)) return

      const canonicalPlanId = normalizeId(planId)
      const progressTrackingId = extractProgressTrackingId(plan) ?? canonicalPlanId
      console.log('[travelPlan] goal completion check', {
        planId,
        progressValue,
        progressTrackingId,
        goalNotified: isGoalNotified(plan)
      })
      if (!progressTrackingId) return

      let userId = resolveUserId(
        plan.user ??
          plan.userId ??
          plan.userID ??
          plan.owner ??
          plan.ownerId ??
          plan.ownerID ??
          (this.currentPlan && normalizeId(this.currentPlan.id) === normalizeId(plan.id) ? this.currentPlan.user : null)
      )
      if (!userId) {
        const userStore = useUserStore()
        userId = resolveUserId(userStore.currentUser)
      }
      if (!userId) return

      const notificationStore = useNotificationStore()
      const existingNotification = notificationStore.notifications.find((item) => {
        if (!item) return false
        const message = typeof item.message === 'string' ? item.message.toLowerCase().trim() : ''
        const isGoalMessage = message.includes('goal') && (message.includes('complete') || message.includes('completion'))
        const progressMatch = normalizeId(item?.progress) === progressTrackingId
        const planMatch = normalizeId(item?.planId) === canonicalPlanId
        return (progressMatch || planMatch) && isGoalMessage
      })
      if (existingNotification) {
        if (typeof notificationStore.setNotificationMeta === 'function') {
          notificationStore.setNotificationMeta(existingNotification.id, {
            planId: canonicalPlanId ?? planId,
            progress: progressTrackingId
          })
        }
        this._markGoalNotified(planId, existingNotification.id)
        return
      }

      const requestKey = canonicalPlanId ?? planId
      if (requestKey && this.goalRequests[requestKey]) return
      this.goalRequests = requestKey
        ? { ...this.goalRequests, [requestKey]: true }
        : { ...this.goalRequests, [planId]: true }

      try {
        const frequency = resolveFrequency(plan)
        console.log('[travelPlan] creating goal completion notification', {
          planId,
          userId,
          progressTrackingId,
          frequency
        })
        const created = await notificationStore.createNotification(
          {
            user: userId,
            progress: progressTrackingId,
            message: GOAL_MESSAGE,
            frequency
          },
          { planId: canonicalPlanId ?? planId }
        )
        console.log('[travelPlan] goal completion notification result', created)
        if (created?.id) {
          if (typeof notificationStore.setNotificationMeta === 'function') {
            notificationStore.setNotificationMeta(created.id, {
              planId: canonicalPlanId ?? planId,
              progress: progressTrackingId
            })
          }
          this._markGoalNotified(planId, created.id)
          if (typeof notificationStore.hydrateNotificationDetails === 'function') {
            try {
              await notificationStore.hydrateNotificationDetails(created.id, userId)
            } catch (hydrateErr) {
              console.error('[travelPlan] hydrateGoalNotification failed:', hydrateErr)
            }
          }
        }
      } catch (err) {
        console.error('[travelPlan] createGoalNotification error:', err)
      } finally {
        if (requestKey) {
          const { [requestKey]: _ignore, ...rest } = this.goalRequests
          this.goalRequests = rest
        } else {
          const { [planId]: _ignore, ...rest } = this.goalRequests
          this.goalRequests = rest
        }
      }
    },
    async _ensureSavingsReminder(planId, plan) {
      const canonicalPlanId = normalizeId(planId)
      if (!canonicalPlanId) return
      const paymentPeriod = resolveSavingsPaymentPeriod(plan)
      const amountPerPeriod = resolveSavingsAmountPerPeriod(plan)
      if (!paymentPeriod || !amountPerPeriod) return

      let userId = resolveUserId(
        plan.user ??
          plan.userId ??
          plan.userID ??
          plan.owner ??
          plan.ownerId ??
          plan.ownerID ??
          (this.currentPlan && normalizeId(this.currentPlan.id) === canonicalPlanId ? this.currentPlan.user : null)
      )
      if (!userId) {
        const userStore = useUserStore()
        userId = resolveUserId(userStore.currentUser)
      }
      if (!userId) return

      const notificationStore = useNotificationStore()
      if (!notificationStore) return

      const requestKey = canonicalPlanId
      if (requestKey && this.savingsReminderRequests[requestKey]) {
        return
      }

      this.savingsReminderRequests = requestKey
        ? { ...this.savingsReminderRequests, [requestKey]: true }
        : { ...this.savingsReminderRequests, [canonicalPlanId]: true }

      const existing = notificationStore.notifications.find((item) => {
        if (!item) return false
        const planMatch = normalizeId(item.planId) === canonicalPlanId
        const typeMarker = item.reminderType ?? item.raw?.reminderType ?? item.type ?? null
        return planMatch && typeMarker === SAVINGS_REMINDER_TYPE
      })

      const existingPeriod = existing
        ? Number(
            existing.paymentPeriod ??
              existing.frequency ??
              existing.raw?.paymentPeriod ??
              existing.raw?.frequency ??
              null
          )
        : null
      const existingAmount = existing
        ? Number(
            existing.amountPerPeriod ??
              existing.amount ??
              existing.raw?.amountPerPeriod ??
              existing.raw?.amount ??
              null
          )
        : null
      const periodMatches = Number.isFinite(existingPeriod) && existingPeriod === paymentPeriod
      const amountMatches = Number.isFinite(existingAmount)
        ? Math.abs(existingAmount - amountPerPeriod) < 0.005
        : false

      if (existing && periodMatches && amountMatches) {
        const { [requestKey]: _ignore, ...rest } = this.savingsReminderRequests
        this.savingsReminderRequests = rest
        return
      }

      if (existing && (!periodMatches || !amountMatches)) {
        try {
          if (typeof notificationStore.deleteNotification === 'function') {
            await notificationStore.deleteNotification(existing.id, userId)
          }
        } catch (err) {
          console.error('[travelPlan] deleteSavingsReminder failed:', err)
        }
      }

      try {
        const amountLabel = formatCurrencyUSD(amountPerPeriod)
        const cadence = paymentPeriod === 1 ? 'month' : `${paymentPeriod} months`
        const message = `${SAVINGS_REMINDER_LABEL}: set aside ${amountLabel} every ${cadence}.`
        const created = await notificationStore.createNotification(
          {
            user: userId,
            progress: extractProgressTrackingId(plan) ?? canonicalPlanId,
            message,
            frequency: paymentPeriod
          },
          { planId: canonicalPlanId, reminderType: SAVINGS_REMINDER_TYPE }
        )
        if (created?.id && typeof notificationStore.setNotificationMeta === 'function') {
          notificationStore.setNotificationMeta(created.id, {
            planId: canonicalPlanId,
            reminderType: SAVINGS_REMINDER_TYPE,
            paymentPeriod,
            amountPerPeriod,
            progress: extractProgressTrackingId(plan) ?? canonicalPlanId
          })
        }
      } catch (err) {
        console.error('[travelPlan] createSavingsReminder error:', err)
      } finally {
        const { [requestKey]: _ignore, ...rest } = this.savingsReminderRequests
        this.savingsReminderRequests = rest
      }
    },
    _markHalfwayNotified(planId, notificationId = null) {
      const id = normalizeId(planId)
      if (!id) return
      const existing = this.plans[id]
      if (!existing) return
      const updatedSavings = { ...(existing.savingsPlan || {}), halfwayNotified: true }
      const updatedPlan = {
        ...existing,
        savingsPlan: updatedSavings,
        halfwayNotificationId: notificationId ?? existing.halfwayNotificationId ?? null
      }
      this.plans = { ...this.plans, [id]: updatedPlan }
      if (this.currentPlan && normalizeId(this.currentPlan.id) === id) {
        this.currentPlan = updatedPlan
      }
      if (notificationId) {
        try {
          const notificationStore = useNotificationStore()
          if (notificationStore && typeof notificationStore.setNotificationMeta === 'function') {
            const progress = extractProgressTrackingId(updatedPlan) ?? id
            notificationStore.setNotificationMeta(notificationId, {
              planId: id,
              progress
            })
          }
        } catch (err) {
          console.error('[travelPlan] set notification meta failed:', err)
        }
      }
      this.persist()
    },
    _markGoalNotified(planId, notificationId = null) {
      const id = normalizeId(planId)
      if (!id) return
      const existing = this.plans[id]
      if (!existing) return
      const updatedSavings = { ...(existing.savingsPlan || {}), goalNotified: true }
      const updatedPlan = {
        ...existing,
        savingsPlan: updatedSavings,
        goalNotificationId: notificationId ?? existing.goalNotificationId ?? null,
        goalNotified: true
      }
      this.plans = { ...this.plans, [id]: updatedPlan }
      if (this.currentPlan && normalizeId(this.currentPlan.id) === id) {
        this.currentPlan = updatedPlan
      }
      if (notificationId) {
        try {
          const notificationStore = useNotificationStore()
          if (notificationStore && typeof notificationStore.setNotificationMeta === 'function') {
            const progress = extractProgressTrackingId(updatedPlan) ?? id
            notificationStore.setNotificationMeta(notificationId, {
              planId: id,
              progress
            })
          }
        } catch (err) {
          console.error('[travelPlan] set goal notification meta failed:', err)
        }
      }
      this.persist()
    },
    // store a fetched plan
    cachePlan(plan) {
      if (!plan) return
      const id = plan.id ?? plan.travelPlanID
      if (id) {
        const planId = String(id)
        const existingUser = this.plans[planId]?.user ?? this.currentPlan?.user ?? plan?.user
        const basePlan = { ...plan, id: planId, user: plan?.user ?? existingUser ?? null }
        const progressTrackingId = basePlan.progressTrackingId ?? extractProgressTrackingId(basePlan)
        const normalized = progressTrackingId ? { ...basePlan, progressTrackingId } : basePlan
        this.plans[planId] = normalized
        if (this.currentPlan && String(this.currentPlan.id) === planId) {
          this.currentPlan = normalized
        }
        this.persist()
        this._scheduleHalfwayCheck(planId)
      }
    }
  }
})

<template>
  <section class="goal-detail-section">
    <div class="goal-layout">
      <aside class="goal-actions-aside">
        <GoalActionsPanel
          :has-plan="hasPlan"
          :estimating="estimating"
          :manual-disabled="manualSubmitting || showManualCost"
          :necessity-disabled="necessitySubmitting || showNecessityForm"
          :status-message="statusMessage"
          :error-message="errorMessage"
          @estimate="onEstimate"
          @manual="openManualCost"
          @necessity="openNecessityForm"
          @home="goHome"
        />
      </aside>
      <div class="goal-main">
        <div v-if="hasPlan" class="goal-block-wrapper">
          <TripNotification
            :title="title"
            :message="message"
            :details="details"
            :travelPlan="planForDisplay"
            :show-plan-summary="false"
            @delete="onDelete"
          >
            <TravelProgressInfo
              :progress="progress"
              :user-id="userId"
              :travel-plan-id="activePlanId"
              :total-cost="totalCostDisplay"
              :savings-plan="planSavingsPlan"
              :savings-progress="planSavingsProgress"
            />
          </TripNotification>
        </div>
        <p v-else class="empty-state">Travel goal details will appear after creating your first travel goal.</p>
      </div>
    </div>
    <ManualCostForm
      :visible="showManualCost && hasPlan"
      :loading="manualSubmitting"
      :error="manualError"
      :initial-values="manualInitialValues"
      @submit="handleManualSubmit"
      @cancel="handleManualCancel"
    />
    <NecessityForm
      :visible="showNecessityForm && hasPlan"
      :loading="necessitySubmitting"
      :error="necessityError"
      :initial-values="necessityInitialValues"
      @submit="handleNecessitySubmit"
      @cancel="handleNecessityCancel"
    />
  </section>
</template>

<script>

import { computed, ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import TripNotification from '../components/TripNotification.vue'
import TravelProgressInfo from '../components/TravelProgressInfo.vue'
import GoalActionsPanel from '../components/GoalActionsPanel.vue'
import ManualCostForm from '../components/ManualCostForm.vue'
import NecessityForm from '../components/NecessityForm.vue'
import { useTravelPlanStore } from '../stores/travelPlan'
import { useUserStore } from '../stores/user'

export default {
  name: 'TravelGoalDetailView',
  components: { TripNotification, TravelProgressInfo, GoalActionsPanel, ManualCostForm, NecessityForm },
  setup() {
    // Dummy progress value for demo
  const router = useRouter()
  const route = useRoute()
  const travelPlanStore = useTravelPlanStore()
  const userStore = useUserStore()
  const q = route.query || {}

  // Reactively resolve the plan from Pinia; fallback to minimal object from query when needed
  const planForDisplay = computed(() => {
    const planId = route.params.id
    if (planId && travelPlanStore.plans[planId]) return travelPlanStore.plans[planId]
    if (travelPlanStore.currentPlan && (!planId || String(travelPlanStore.currentPlan.id) === String(planId))) {
      return travelPlanStore.currentPlan
    }
    const all = Object.values(travelPlanStore.plans || {})
    if (all.length) return all[all.length - 1]
    // minimal plan from query params
    const fromCity = q.fromCity || ''
    const toCity = q.toCity || ''
    const fromDate = q.fromDate || ''
    const toDate = q.toDate || ''
    if (fromCity || toCity || fromDate || toDate) return { fromCity, toCity, fromDate, toDate }
    return null
  })

  const planFromCity = computed(() => planForDisplay.value?.fromCity || '')
  const planToCity = computed(() => planForDisplay.value?.toCity || '')
  const planFromDate = computed(() => planForDisplay.value?.fromDate || '')
  const planToDate = computed(() => planForDisplay.value?.toDate || '')
  const hasPlan = computed(() => !!planForDisplay.value)
  const estimating = ref(false)
  const manualSubmitting = ref(false)
  const necessitySubmitting = ref(false)
  const showManualCost = ref(false)
  const showNecessityForm = ref(false)
  const manualError = ref('')
  const necessityError = ref('')
  const errorMessage = ref('')
  const totalCostDisplay = computed(() => planForDisplay.value?.totalCost ?? null)
  const planSavingsPlan = computed(() => {
    const base = planForDisplay.value?.savingsPlan
    const legacyProgress = planForDisplay.value?.savingsProgress
    const fallbackGoal = planForDisplay.value?.totalCost ?? null
    if (!base) {
      const provisional = {}
      if (fallbackGoal != null) provisional.goalAmount = fallbackGoal
      const legacyAmount = legacyProgress?.manualContribution ?? legacyProgress?.amount ?? legacyProgress?.savedAmount
      if (legacyAmount != null) provisional.currentAmount = legacyAmount
      return Object.keys(provisional).length ? provisional : null
    }
    const merged = { ...base }
    if (merged.goalAmount == null && fallbackGoal != null) {
      merged.goalAmount = fallbackGoal
    }
    if (merged.currentAmount == null && legacyProgress) {
      const legacyAmount = legacyProgress.manualContribution ?? legacyProgress.amount ?? legacyProgress.savedAmount
      if (legacyAmount != null) {
        merged.currentAmount = legacyAmount
      }
    }
    return merged
  })
  const planSavingsProgress = computed(() => planForDisplay.value?.savingsProgress ?? null)
  const progress = computed(() => {
    const goal = Number(planSavingsPlan.value?.goalAmount)
    const saved = Number(planSavingsPlan.value?.currentAmount)
    if (Number.isFinite(goal) && goal > 0 && Number.isFinite(saved)) {
      return (saved / goal) * 100
    }
    const legacyAmount = Number(
      planSavingsProgress.value?.manualContribution ??
        planSavingsProgress.value?.amount ??
        planSavingsProgress.value?.savedAmount
    )
    if (Number.isFinite(goal) && goal > 0 && Number.isFinite(legacyAmount)) {
      return (legacyAmount / goal) * 100
    }
    const stored = Number(planSavingsProgress.value?.basePercent)
    if (Number.isFinite(stored)) return stored
    const direct = planForDisplay.value?.progress ?? planForDisplay.value?.progressPercent ?? planForDisplay.value?.progress_percentage
    const numeric = Number(direct)
    return Number.isFinite(numeric) ? numeric : 0
  })
  const costEstimate = computed(() => planForDisplay.value?.latestCostEstimate || planForDisplay.value?.costEstimate || planForDisplay.value?.mostRecentCostEstimate || null)
  const costSummary = computed(() => {
    const estimate = costEstimate.value
    if (!estimate) return null
    const flight = estimate.flight ?? estimate.flight_cost ?? estimate.flightEstimate
    const rooms = estimate.roomsPerNight ?? estimate.rooms_per_night ?? estimate.room_nightly
    const food = estimate.foodDaily ?? estimate.food_daily
    const parts = []
    if (flight !== undefined && flight !== null) parts.push(`Flight: ${flight}`)
    if (rooms !== undefined && rooms !== null) parts.push(`Room/night: ${rooms}`)
    if (food !== undefined && food !== null) parts.push(`Food/day: ${food}`)
    return parts.join(' · ')
  })

  const manualInitialValues = computed(() => ({ flight: '', roomsPerNight: '', foodDaily: '' }))
  const necessityInitialValues = computed(() => {
    const n = planForDisplay.value?.necessity || {}
    return {
      accommodation: n.accommodation ?? true,
      diningFlag: n.diningFlag ?? true
    }
  })
  const statusMessage = computed(() => (estimating.value ? 'Takes a moment to generate cost estimate.' : ''))

  function resolveUserId(user) {
    if (!user) return null
    if (typeof user === 'string') return user
    if (typeof user === 'object') {
      return user.id ?? user.userId ?? user.userID ?? user.username ?? user.name ?? null
    }
    return null
  }

  const userId = computed(() => resolveUserId(userStore.currentUser))
  const activePlanId = computed(() => {
    const planId = planForDisplay.value?.id ?? route.params.id ?? null
    return planId ? String(planId) : null
  })

    function formatDate(d) {
      if (!d) return ''
      // Treat YYYY-MM-DD as a local date to avoid timezone-based day shifts
      if (typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d)) {
        const [y, m, day] = d.split('-').map(Number)
        const dt = new Date(y, m - 1, day)
        return new Intl.DateTimeFormat(undefined, { year: 'numeric', month: 'numeric', day: 'numeric' }).format(dt)
      }
      const dt = new Date(d)
      if (isNaN(dt)) return String(d)
      return dt.toLocaleDateString()
    }
  const title = computed(() => (planToCity.value ? `Trip to ${planToCity.value}` : 'Travel Goal'))
  const baseMessage = computed(() => [planFromCity.value ? `From: ${planFromCity.value}` : null,
           planFromDate.value ? `Depart: ${formatDate(planFromDate.value)}` : null,
           planToDate.value ? `Return: ${formatDate(planToDate.value)}` : null].filter(Boolean).join(' · '))

    // build details array from cached plan if available
    const details = computed(() => {
      const out = []
      const plan = planForDisplay.value
      if (plan?.necessity) {
        const n = plan.necessity
        if (n.accommodation !== undefined) out.push(`Accommodation: ${n.accommodation}`)
        if (n.diningFlag !== undefined) out.push(`Dining out: ${n.diningFlag ? 'Yes' : 'No'}`)
      }
      const summary = costSummary.value
      if (summary) out.push(summary)
      return out
    })
  const message = computed(() => [baseMessage.value].concat(details.value.length ? [''] : []).join(''))

    // Use cached plan if available, otherwise build a minimal plan from route query values
    function goHome() {
      router.push('/')
    }
    function openManualCost() {
      manualError.value = ''
      errorMessage.value = ''
      showManualCost.value = true
      showNecessityForm.value = false
    }
    function openNecessityForm() {
      necessityError.value = ''
      errorMessage.value = ''
      showNecessityForm.value = true
      showManualCost.value = false
    }
    async function onEstimate() {
      const plan = planForDisplay.value
      const id = plan?.id ?? route.params.id
      if (!id || estimating.value) return
      estimating.value = true
      errorMessage.value = ''
      try {
        await travelPlanStore.generateCostEstimate(id, userStore.currentUser)
        await travelPlanStore.estimateTotalCost(id, userStore.currentUser)
        showManualCost.value = false
        showNecessityForm.value = false
      } catch (e) {
        const rawMessage = e?.message || String(e)
        const normalized = rawMessage ? String(rawMessage).toLowerCase() : ''
        const looksLikeLlmFailure =
          normalized.includes('llm') ||
          normalized.includes('language model') ||
          normalized.includes('model is overloaded') ||
          normalized.includes('rate limit')

        if (looksLikeLlmFailure) {
          errorMessage.value = "Sorry, but Automatic Cost Estimation isn't working right now. Please try again later."
        } else {
          const fallbackDetail = rawMessage && rawMessage !== '[object Object]' ? rawMessage : 'Please try again.'
          errorMessage.value = 'Automatic estimate failed: ' + fallbackDetail
        }
        showManualCost.value = true
      } finally {
        estimating.value = false
      }
    }
    async function handleManualSubmit(payload) {
      const plan = planForDisplay.value
      const id = plan?.id ?? route.params.id
      if (!id) {
        manualError.value = 'Cannot save cost estimate without a travel plan.'
        return
      }
      manualSubmitting.value = true
      manualError.value = ''
      errorMessage.value = ''
      try {
        await travelPlanStore.editCostEstimate(id, userStore.currentUser, payload)
        await travelPlanStore.estimateTotalCost(id, userStore.currentUser)
        showManualCost.value = false
      } catch (e) {
        manualError.value = e?.message || String(e)
      } finally {
        manualSubmitting.value = false
      }
    }
    function handleManualCancel() {
      manualSubmitting.value = false
      manualError.value = ''
      showManualCost.value = false
    }
    async function handleNecessitySubmit(payload) {
      const plan = planForDisplay.value
      const id = plan?.id ?? route.params.id
      if (!id) {
        necessityError.value = 'Cannot update necessities without a travel plan.'
        return
      }
      necessitySubmitting.value = true
      necessityError.value = ''
      errorMessage.value = ''
      try {
        await travelPlanStore.updateNecessity(id, userStore.currentUser, payload)
        showNecessityForm.value = false
      } catch (e) {
        necessityError.value = e?.message || String(e)
      } finally {
        necessitySubmitting.value = false
      }
    }
    function handleNecessityCancel() {
      necessitySubmitting.value = false
      necessityError.value = ''
      showNecessityForm.value = false
    }
    async function onDelete() {
      const plan = planForDisplay.value
      const id = plan?.id ?? route.params.id
      if (!id) return
      const ok = window.confirm('Delete this travel plan? This cannot be undone.')
      if (!ok) return
      try {
        await travelPlanStore.deleteTravelPlan(id, userStore.currentUser)
        // Navigate to All Goals if any remain, else Home
        const remaining = Object.keys(travelPlanStore.plans || {}).length
        router.push(remaining ? '/goals' : '/')
      } catch (e) {
        alert('Failed to delete the travel plan: ' + (e?.message || e))
      }
    }
    return {
      progress,
      onEstimate,
      estimating,
      openManualCost,
      openNecessityForm,
      handleManualSubmit,
      handleManualCancel,
      handleNecessitySubmit,
      handleNecessityCancel,
      showManualCost,
      showNecessityForm,
      manualSubmitting,
      necessitySubmitting,
      manualError,
      necessityError,
      errorMessage,
      onDelete,
      goHome,
      title,
      message,
      details,
      planForDisplay,
      hasPlan,
      manualInitialValues,
      necessityInitialValues,
      statusMessage,
      userId,
      activePlanId,
      totalCostDisplay,
      planSavingsPlan,
      planSavingsProgress
    }
  }
}
</script>
<style scoped>
.goal-detail-section { display: block; }
.goal-layout {
  display: grid;
  grid-template-columns: 220px minmax(0, 1fr);
  gap: 1.25rem;
  align-items: start;
}
.goal-main { min-width: 0; }
.goal-actions-aside { position: sticky; top: 1rem; align-self: start; }
.goal-block-wrapper {
  width: 100%;
  max-width: none; /* allow the card to use available space in grid */
  transition: background 0.2s;
}
.goal-block-wrapper :deep(.trip-notification) { min-height: 220px; }
@media (max-width: 900px) {
  .goal-layout { grid-template-columns: 1fr; }
  .goal-actions-aside { position: static; order: 2; }
  .goal-main { order: 1; }
  .goal-block-wrapper :deep(.trip-notification) { min-height: unset; }
}
.empty-state {
  margin-top: 2rem;
  color: #666;
  font-size: 1rem;
}
</style>

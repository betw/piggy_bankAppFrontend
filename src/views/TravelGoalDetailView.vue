<template>
  <section class="goal-detail-section">
    <div v-if="hasPlan" class="goal-block-wrapper">
      <TripNotification
        :title="title"
        :message="message"
        :details="details"
        :travelPlan="planForDisplay"
      >
        <div class="progress-meter">
          <div class="progress-label">Progress</div>
          <div class="progress-bar">
            <div class="progress-fill" :style="{ width: progress + '%' }"></div>
          </div>
          <div class="progress-value">{{ progress }}%</div>
        </div>
      </TripNotification>
    </div>
    <p v-else class="empty-state">Travel goal details will appear after creating your first travel goal.</p>
    <div v-if="hasPlan" class="goal-actions">
      <button @click="onModify">Modify</button>
      <button @click="onEstimate" :disabled="estimating">{{ estimating ? 'Estimating…' : 'Estimate Cost' }}</button>
    <button @click="openManualCost" :disabled="manualSubmitting || showManualCost">Enter Cost Manually</button>
    <button @click="openNecessityForm" :disabled="necessitySubmitting || showNecessityForm">Update Necessities</button>
      <button @click="onDelete">Delete</button>
      <button @click="goHome">Home</button>
      <p v-if="estimating" class="status-message">Takes a moment to generate cost estimate.</p>
      <p v-if="errorMessage" class="error-message">{{ errorMessage }}</p>
    </div>
    <div v-if="showManualCost && hasPlan" class="manual-cost-form">
      <h3>Manual Cost Estimate</h3>
      <form @submit.prevent="submitManualCost">
        <label>
          Flight Cost
          <input v-model="manualCost.flight" type="number" min="0" step="0.01" placeholder="e.g. 450" />
        </label>
        <label>
          Rooms Per Night
          <input v-model="manualCost.roomsPerNight" type="number" min="0" step="0.01" placeholder="e.g. 180" />
        </label>
        <label>
          Food Per Day
          <input v-model="manualCost.foodDaily" type="number" min="0" step="0.01" placeholder="e.g. 75" />
        </label>
        <div class="form-footer">
          <button type="submit" :disabled="manualSubmitting">{{ manualSubmitting ? 'Saving…' : 'Save Estimate' }}</button>
          <button type="button" @click="cancelManualCost" :disabled="manualSubmitting">Cancel</button>
        </div>
        <p v-if="manualError" class="error-message">{{ manualError }}</p>
      </form>
    </div>
    <div v-if="showNecessityForm && hasPlan" class="necessity-form">
      <h3>Travel Necessities</h3>
      <form @submit.prevent="submitNecessity">
        <label>
          <input type="checkbox" v-model="necessityForm.accommodation" />
          Save for accommodation (rooms)
        </label>
        <label>
          <input type="checkbox" v-model="necessityForm.diningFlag" />
          Save for dining out
        </label>
        <div class="form-footer">
          <button type="submit" :disabled="necessitySubmitting">{{ necessitySubmitting ? 'Updating…' : 'Update Necessities' }}</button>
          <button type="button" @click="cancelNecessity" :disabled="necessitySubmitting">Cancel</button>
        </div>
        <p v-if="necessityError" class="error-message">{{ necessityError }}</p>
      </form>
    </div>
  </section>
</template>

<script>

import { computed, ref, reactive, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import TripNotification from '../components/TripNotification.vue'
import { useTravelPlanStore } from '../stores/travelPlan'
import { useUserStore } from '../stores/user'

export default {
  name: 'TravelGoalDetailView',
  components: { TripNotification },
  setup() {
    // Dummy progress value for demo
  const router = useRouter()
  const progress = 60
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
  const manualCost = reactive({ flight: '', roomsPerNight: '', foodDaily: '' })
  const necessityForm = reactive({ accommodation: true, diningFlag: true })
  const totalCostDisplay = computed(() => planForDisplay.value?.totalCost ?? null)
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

  function applyNecessityDefaults(plan) {
    const source = plan?.necessity || {}
    necessityForm.accommodation = source.accommodation ?? true
    necessityForm.diningFlag = source.diningFlag ?? true
  }

  watch(planForDisplay, (plan) => {
    applyNecessityDefaults(plan)
  }, { immediate: true })

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
      if (totalCostDisplay.value !== null && totalCostDisplay.value !== undefined) {
        out.push(`Total trip cost: ${totalCostDisplay.value}`)
      }
      return out
    })
  const message = computed(() => [baseMessage.value].concat(details.value.length ? [''] : []).join(''))

    // Use cached plan if available, otherwise build a minimal plan from route query values
    function onModify() {
      // Placeholder for modify action
    }
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
    function resetManualForm() {
      manualCost.flight = ''
      manualCost.roomsPerNight = ''
      manualCost.foodDaily = ''
    }
    function resetNecessityForm(plan) {
      applyNecessityDefaults(plan)
    }
    function cancelManualCost() {
      manualSubmitting.value = false
      manualError.value = ''
      showManualCost.value = false
      resetManualForm()
    }
    function cancelNecessity() {
      necessitySubmitting.value = false
      necessityError.value = ''
      showNecessityForm.value = false
      resetNecessityForm(planForDisplay.value)
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
        resetManualForm()
        showNecessityForm.value = false
      } catch (e) {
        errorMessage.value = 'Automatic estimate failed: ' + (e?.message || e)
        showManualCost.value = true
      } finally {
        estimating.value = false
      }
    }
    function parseCostField(val, label) {
      if (val === '' || val === null || val === undefined) return undefined
      const num = Number(val)
      if (!Number.isFinite(num) || num < 0) throw new Error(`${label} must be a non-negative number`)
      return num
    }
    async function submitManualCost() {
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
        const payload = {
          flight: manualCost.flight,
          roomsPerNight: manualCost.roomsPerNight,
          foodDaily: manualCost.foodDaily
        }
        const normalized = {
          flight: parseCostField(payload.flight, 'Flight cost'),
          roomsPerNight: parseCostField(payload.roomsPerNight, 'Rooms per night'),
          foodDaily: parseCostField(payload.foodDaily, 'Food per day')
        }
        const sanitized = {}
        Object.entries(normalized).forEach(([key, value]) => {
          if (value !== undefined) sanitized[key] = value
        })
        if (!Object.keys(sanitized).length) {
          throw new Error('Enter at least one cost field to save an estimate.')
        }
        await travelPlanStore.editCostEstimate(id, userStore.currentUser, sanitized)
        await travelPlanStore.estimateTotalCost(id, userStore.currentUser)
        showManualCost.value = false
        resetManualForm()
      } catch (e) {
        manualError.value = e?.message || String(e)
      } finally {
        manualSubmitting.value = false
      }
    }
    async function submitNecessity() {
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
        const payload = {
          accommodation: Boolean(necessityForm.accommodation),
          diningFlag: Boolean(necessityForm.diningFlag)
        }
        await travelPlanStore.updateNecessity(id, userStore.currentUser, payload)
        showNecessityForm.value = false
      } catch (e) {
        necessityError.value = e?.message || String(e)
      } finally {
        necessitySubmitting.value = false
      }
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
      onModify,
      onEstimate,
      estimating,
      openManualCost,
      openNecessityForm,
      submitManualCost,
      submitNecessity,
      manualCost,
  necessityForm,
      showManualCost,
      showNecessityForm,
      manualSubmitting,
      necessitySubmitting,
      manualError,
      necessityError,
      errorMessage,
      cancelManualCost,
      cancelNecessity,
      onDelete,
      goHome,
      title,
      message,
      details,
      planForDisplay,
      hasPlan
    }
  }
}
</script>
<style scoped>
.goal-detail-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 60vh;
}
.goal-block-wrapper {
  width: 100%;
  max-width: 700px;
  min-height: 220px;
  margin-bottom: 2rem;
  position: relative;
}
.trip-notification {
  width: 100%;
  padding: 1.5rem;
}
.goal-block-wrapper :deep(.trip-notification) {
  min-height: 220px;
  padding-bottom: 5rem;
}
.progress-meter {
  position: absolute;
  bottom: 28px;
  right: 28px;
  background: #fffbe6;
  border-radius: 12px;
  padding: 0.6rem 1.2rem;
  box-shadow: 0 2px 12px rgba(0,0,0,0.08);
  display: flex;
  align-items: center;
  gap: 0.75rem;
  border: 1px solid #ffe58f;
}
.progress-label {
  font-size: 1rem;
  color: #ad8b00;
  font-weight: 500;
}
.progress-bar {
  width: 140px;
  height: 12px;
  background: #ffe58f;
  border-radius: 6px;
  overflow: hidden;
  margin: 0 0.7rem;
}
.progress-fill {
  height: 100%;
  background: #ad8b00;
  border-radius: 6px;
  transition: width 0.3s;
}
.progress-value {
  font-size: 1rem;
  color: #333;
  font-weight: 500;
}
.goal-actions {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}
.goal-actions button {
  width: 120px;
  padding: 0.7rem 0;
  font-size: 1rem;
  border-radius: 6px;
  border: none;
  background: #fafafa;
  color: #333;
  box-shadow: 0 1px 4px rgba(0,0,0,0.04);
  cursor: pointer;
  transition: background 0.2s;
}
.goal-actions button:hover {
  background: #ffe58f;
}
.goal-actions button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
.status-message {
  margin-top: 0.5rem;
  color: #8a5d00;
  font-size: 0.95rem;
}
.error-message {
  margin-top: 0.5rem;
  color: #b3261e;
  font-size: 0.95rem;
}
.manual-cost-form,
.necessity-form {
  margin-top: 2rem;
  width: 100%;
  max-width: 420px;
  background: #fffefd;
  border: 1px solid #ffe58f;
  border-radius: 8px;
  padding: 1.25rem;
  box-shadow: 0 2px 10px rgba(0,0,0,0.04);
}
.manual-cost-form h3,
.necessity-form h3 {
  margin-top: 0;
  margin-bottom: 0.75rem;
  color: #8a5d00;
}
.manual-cost-form label {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  margin-bottom: 0.9rem;
  font-size: 0.95rem;
}
.necessity-form label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.9rem;
  font-size: 0.95rem;
}
.manual-cost-form input {
  padding: 0.45rem 0.6rem;
  border: 1px solid #d9d9d9;
  border-radius: 4px;
  font-size: 1rem;
}
.manual-cost-form .form-footer,
.necessity-form .form-footer {
  display: flex;
  gap: 0.75rem;
}
.manual-cost-form .form-footer button,
.necessity-form .form-footer button {
  flex: 1;
}
.manual-cost-form button,
.necessity-form button {
  padding: 0.55rem 1.1rem;
  border: none;
  border-radius: 4px;
  background: #ffe58f;
  color: #333;
  cursor: pointer;
  transition: background 0.2s;
}
.manual-cost-form button:hover,
.necessity-form button:hover {
  background: #ffd666;
}
.manual-cost-form button[disabled],
.necessity-form button[disabled] {
  opacity: 0.6;
  cursor: not-allowed;
}
.necessity-form input[type="checkbox"] {
  width: 18px;
  height: 18px;
}
.empty-state {
  margin-top: 2rem;
  color: #666;
  font-size: 1rem;
}
</style>

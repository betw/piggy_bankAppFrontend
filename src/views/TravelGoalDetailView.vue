<template>
  <section class="goal-detail-section">
    <div class="goal-block-wrapper">
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
    <div class="goal-actions">
      <button @click="onModify">Modify</button>
      <button @click="onDelete">Delete</button>
      <button @click="goHome">Home</button>
    </div>
  </section>
</template>

<script>

import { computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import TripNotification from '../components/TripNotification.vue'
import { useTravelPlanStore } from '../stores/travelPlan'

export default {
  name: 'TravelGoalDetailView',
  components: { TripNotification },
  setup() {
    // Dummy progress value for demo
  const router = useRouter()
  const progress = 60
  const route = useRoute()
  const travelPlanStore = useTravelPlanStore()
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
      const ci = plan?.latestCostEstimate ?? plan?.costEstimate ?? plan?.mostRecentCostEstimate
      if (ci) {
        const flight = ci.flight ?? ci.flight_cost ?? ci.flightEstimate
        const rooms = ci.rooms_per_night ?? ci.roomsPerNight ?? ci.room_nightly
        const food = ci.food_daily ?? ci.foodDaily
        const costParts = []
        if (flight) costParts.push(`Flight: ${flight}`)
        if (rooms) costParts.push(`Room/night: ${rooms}`)
        if (food) costParts.push(`Food/day: ${food}`)
        if (costParts.length) out.push(costParts.join(' · '))
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
    function onDelete() {
      router.push('/')
    }
    return { progress, onModify, onDelete, goHome, title, message, details, planForDisplay }
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
  min-height: 160px;
  margin-bottom: 2rem;
  position: relative;
}
.trip-notification {
  width: 100%;
  padding: 1.5rem;
}
.progress-meter {
  position: absolute;
  bottom: 18px;
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
</style>

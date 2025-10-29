<template>
  <div class="trip-notification" @click="$emit('click', $event)">
    <h3>{{ title }}</h3>
    <p>{{ computedMessage }}</p>

    <!-- If a structured travelPlan object is provided, render a compact plan summary -->
    <div v-if="travelPlan" class="plan-summary">
      <div class="plan-top">
        <div class="plan-cities">
          <div class="from">From: <strong>{{ travelPlan.fromCity || '-' }}</strong></div>
          <div class="to">To: <strong>{{ travelPlan.toCity || '-' }}</strong></div>
        </div>
        <div class="plan-dates">{{ formatDate(travelPlan.fromDate) }} — {{ formatDate(travelPlan.toDate) }}</div>
      </div>

      <div class="plan-meta">
        <div class="meta-row" v-if="travelPlan.id !== undefined && travelPlan.id !== null">Plan ID: <strong>{{ travelPlan.id }}</strong></div>
        <div class="necessity" v-if="travelPlan.necessity">
          <div class="meta-title">Necessity</div>
          <div class="meta-row" v-if="travelPlan.necessity.accommodation !== undefined">Accommodation: {{ travelPlan.necessity.accommodation }}</div>
          <div class="meta-row" v-if="travelPlan.necessity.diningFlag !== undefined">Dining out: {{ travelPlan.necessity.diningFlag ? 'Yes' : 'No' }}</div>
        </div>
        <div class="costs" v-if="travelPlan.latestCostEstimate || travelPlan.costEstimate || travelPlan.mostRecentCostEstimate">
          <div class="meta-title">Cost</div>
          <div class="meta-row">
            {{ buildCostSummary(travelPlan.latestCostEstimate || travelPlan.costEstimate || travelPlan.mostRecentCostEstimate) }}
          </div>
        </div>
      </div>
    </div>

    <!-- legacy/simple details prop (string or array) -->
    <div v-if="!travelPlan && details && (Array.isArray(details) ? details.length : details)" class="trip-details">
      <template v-if="Array.isArray(details)">
        <div v-for="(d, i) in details" :key="i" class="detail-item">{{ d }}</div>
      </template>
      <template v-else>
        <div class="detail-item">{{ details }}</div>
      </template>
    </div>

    <slot />
  </div>
</template>

<script>
export default {
  name: 'TripNotification',
  props: {
    title: { type: String, required: true },
    message: { type: String, required: true },
    // optional extra details displayed under the message. Can be string or array of strings
    details: { type: [String, Array], default: '' },
    // optional structured travelPlan object; when present it takes precedence over `details`
    travelPlan: { type: Object, default: null }
  },
  emits: ['click'],
  computed: {
    computedMessage() {
      if (this.message && String(this.message).trim().length) return this.message
      if (!this.travelPlan) return ''
      const parts = []
      if (this.travelPlan.fromCity) parts.push(`From: ${this.travelPlan.fromCity}`)
      if (this.travelPlan.fromDate) parts.push(`Depart: ${this.formatDate(this.travelPlan.fromDate)}`)
      if (this.travelPlan.toDate) parts.push(`Return: ${this.formatDate(this.travelPlan.toDate)}`)
      return parts.join(' · ')
    }
  },
  methods: {
    formatDate(d) {
      if (!d) return '-'
      // Treat YYYY-MM-DD as a local date to avoid timezone-based day shifts
      if (typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d)) {
        const [y, m, day] = d.split('-').map(Number)
        const dt = new Date(y, m - 1, day)
        return new Intl.DateTimeFormat(undefined, { year: 'numeric', month: 'numeric', day: 'numeric' }).format(dt)
      }
      const dt = new Date(d)
      if (isNaN(dt)) return String(d)
      return dt.toLocaleDateString()
    },
    buildCostSummary(ci) {
      if (!ci) return ''
      const flight = ci.flight ?? ci.flight_cost ?? ci.flightEstimate
      const rooms = ci.rooms_per_night ?? ci.roomsPerNight ?? ci.room_nightly
      const food = ci.food_daily ?? ci.foodDaily
      const parts = []
      if (flight !== undefined && flight !== null) parts.push(`Flight: ${flight}`)
      if (rooms !== undefined && rooms !== null) parts.push(`Room/night: ${rooms}`)
      if (food !== undefined && food !== null) parts.push(`Food/day: ${food}`)
      return parts.join(' · ') || ''
    }
  }
}
</script>

<style scoped>
.trip-notification {
  background: #fffbe6;
  border: 1px solid #ffe58f;
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 1rem;
  box-shadow: 0 2px 8px rgba(0,0,0,0.04);
  position: relative;
}
h3 {
  margin: 0 0 0.5rem 0;
  font-size: 1.1rem;
  color: #ad8b00;
}
p {
  margin: 0;
  color: #333;
}
/* additional detail lines */
.trip-details {
  margin-top: 0.6rem;
  color: #555;
  font-size: 0.95rem;
}
.trip-details .detail-item + .detail-item {
  margin-top: 0.2rem;
}

/* structured plan summary styles */
.plan-summary {
  margin-top: 0.6rem;
  padding: 0.6rem 0.8rem;
  background: rgba(255,250,230,0.6);
  border-radius: 6px;
  border: 1px dashed rgba(255,229,143,0.6);
}
.plan-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
}
.plan-cities { display:flex; gap:1.2rem; }
.plan-cities .from, .plan-cities .to { color: #555 }
.plan-dates { color: #777; font-size: 0.95rem }
.plan-meta { margin-top: 0.5rem; display:flex; gap:2rem; align-items:flex-start }
.meta-title { font-weight:600; color:#8a5d00; margin-bottom:0.2rem }
.meta-row { color:#555; font-size:0.95rem }
</style>

<template>
  <article
    class="halfway-notification"
    role="button"
    tabindex="0"
    @click="emitView"
    @keydown="handleKeydown"
  >
    <header class="header">
      <div class="header-main">
        <h3 class="title">{{ titleText }}</h3>
        <span class="badge">{{ badgeLabel }}</span>
      </div>
      <button
        type="button"
        class="delete-button"
        aria-label="Delete notification"
        @click.stop="emitDelete"
        @keydown.stop
      >
        Delete
      </button>
    </header>
    <div class="body">
      <p class="message">{{ notification.message }}</p>
      <div v-if="travelPlanSummary" class="plan-details">
        <div class="plan-row">
          <span class="label">From:</span>
          <span class="value">{{ travelPlanSummary.fromCity || '—' }}</span>
        </div>
        <div class="plan-row">
          <span class="label">To:</span>
          <span class="value">{{ travelPlanSummary.toCity || '—' }}</span>
        </div>
        <div class="plan-row">
          <span class="label">Depart:</span>
          <span class="value">{{ travelPlanSummary.fromDateFormatted }}</span>
        </div>
        <div class="plan-row">
          <span class="label">Return:</span>
          <span class="value">{{ travelPlanSummary.toDateFormatted }}</span>
        </div>
      </div>
    </div>
  </article>
</template>

<script setup>
import { computed } from 'vue'

const emits = defineEmits(['view', 'delete'])
const props = defineProps({
  notification: { type: Object, required: true },
  travelPlan: { type: Object, default: null }
})

const frequencyLabel = computed(() => {
  const raw = Number(props.notification?.frequency)
  if (!Number.isFinite(raw) || raw <= 0) return ''
  if (raw === 1) return 'Every month'
  return `Every ${raw} months`
})

const badgeLabel = computed(() => {
  const message = typeof props.notification?.message === 'string' ? props.notification.message.toLowerCase() : ''
  if (message.includes('goal') && (message.includes('complete') || message.includes('completion'))) {
    return '100%'
  }
  if (message.includes('halfway')) return '50%'
  return props.notification?.badge ? String(props.notification.badge) : 'Milestone'
})

const titleText = computed(() => {
  const message = typeof props.notification?.message === 'string' ? props.notification.message.toLowerCase() : ''
  if (message.includes('goal') && (message.includes('complete') || message.includes('completion'))) {
    return 'Goal Achieved'
  }
  return 'Milestone Unlocked'
})

const travelPlanSummary = computed(() => {
  if (!props.travelPlan || typeof props.travelPlan !== 'object') return null
  const plan = props.travelPlan
  return {
    fromCity: plan.fromCity ?? plan.origin ?? null,
    toCity: plan.toCity ?? plan.destination ?? null,
    fromDateFormatted: formatDate(plan.fromDate ?? plan.departureDate ?? plan.startDate),
    toDateFormatted: formatDate(plan.toDate ?? plan.returnDate ?? plan.endDate)
  }
})

const targetPlanId = computed(() => {
  const plan = props.travelPlan
  if (plan && typeof plan === 'object') {
    const candidates = [
      plan.id,
      plan.travelPlanID,
      plan.travelPlanId,
      plan.travel_plan_id,
      plan.progressTrackingId,
      plan.progressTrackingID,
      plan.progress_tracking_id
    ]
    for (const candidate of candidates) {
      const normalized = normalizeId(candidate)
      if (normalized) return normalized
    }
  }
  const notificationCandidates = [
    props.notification?.planId,
    props.notification?.travelPlan,
    props.notification?.travel_plan,
    props.notification?.progress
  ]
  for (const candidate of notificationCandidates) {
    const normalized = normalizeId(candidate)
    if (normalized) return normalized
  }
  return null
})

function formatDate(value) {
  if (!value) return '—'
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [y, m, d] = value.split('-').map(Number)
    const dt = new Date(y, m - 1, d)
    if (!Number.isNaN(dt.getTime())) {
      return new Intl.DateTimeFormat(undefined, { year: 'numeric', month: 'numeric', day: 'numeric' }).format(dt)
    }
  }
  const dt = new Date(value)
  return Number.isNaN(dt.getTime()) ? String(value) : dt.toLocaleDateString()
}

function normalizeId(value) {
  if (value === undefined || value === null) return null
  if (typeof value === 'string') {
    const trimmed = value.trim()
    return trimmed.length ? trimmed : null
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value)
  }
  return null
}

function emitView() {
  emits('view', normalizeId(targetPlanId.value))
}

function emitDelete() {
  emits('delete', normalizeId(props.notification?.id ?? targetPlanId.value ?? null))
}

function handleKeydown(event) {
  if (event.target && event.target.classList && event.target.classList.contains('delete-button')) {
    return
  }
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault()
    emitView()
  }
}
</script>

<style scoped>
.halfway-notification {
  background: var(--attn-bg);
  border: 1px solid var(--attn-border);
  border-radius: 10px;
  padding: 1.2rem 1.4rem;
  box-shadow: var(--shadow-sm);
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  cursor: pointer;
  transition: box-shadow 0.2s, transform 0.2s;
}
.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
}
.header-main {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
.title {
  margin: 0;
  color: var(--attn-title);
  font-size: 1.1rem;
  font-weight: 600;
}
.badge {
  background: #fecdd3;
  color: #9f1239;
  border-radius: 999px;
  padding: 0.15rem 0.75rem;
  font-size: 0.85rem;
  font-weight: 600;
}
.delete-button {
  background: transparent;
  border: none;
  color: #b91c1c; /* red */
  font-weight: 700;
  font-size: 0.95rem;
  padding: 0.2rem 0.4rem;
  border-radius: 4px;
  cursor: pointer;
  transition: background 0.2s, color 0.2s;
}
.delete-button:hover,
.delete-button:focus-visible {
  background: rgba(185, 28, 28, 0.12);
  color: #991b1b;
  outline: none;
}
.delete-button:active {
  background: rgba(185, 28, 28, 0.2);
}
.message {
  margin: 0;
  color: #7a294a;
  font-size: 1rem;
}
.body {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.plan-details {
  border-top: 1px solid rgba(0, 0, 0, 0.05);
  padding-top: 0.5rem;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 0.25rem 0.75rem;
}
.plan-row {
  display: flex;
  align-items: baseline;
  gap: 0.35rem;
  font-size: 0.9rem;
  color: #7a294a;
}
.plan-row .label {
  font-weight: 600;
}
.footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
}
.frequency {
  margin: 0;
  color: #b83280;
  font-size: 0.9rem;
}
.halfway-notification:hover {
  box-shadow: var(--shadow-md);
  transform: translateY(-2px);
}
.halfway-notification:focus-visible { box-shadow: var(--ring); outline: none; }
/* Currency inside notifications should not turn app-wide green */
.money { color: inherit; font-weight: 700; }
</style>

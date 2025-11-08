<template>
  <section class="progress-section">
    <div v-if="progress != null" class="progress-wrapper">
      <div class="progress-controls">
        <button
          type="button"
          class="adjust-btn"
          aria-label="Remove amount from savings progress"
          :disabled="!hasProgress"
          @click="openAdjust('remove')"
        >
          −
        </button>
        <div class="progress-meter">
          <div class="progress-header">
            <div class="progress-label">Progress</div>
            <div v-if="goalTarget != null" class="goal-target">Goal: <span class="money">{{ formatCurrency(goalTarget) }}</span></div>
          </div>
          <div class="progress-bar">
            <div class="progress-fill" :style="{ width: clampedProgress + '%' }"></div>
          </div>
          <div class="progress-value">{{ clampedProgress }}%</div>
          <div v-if="goalTarget !== null" class="current-amount">Current Amount: <span class="money">{{ formatCurrency(displayCurrentAmount) }}</span></div>
        </div>
        <button
          type="button"
          class="adjust-btn"
          aria-label="Add amount to savings progress"
          @click="openAdjust('add')"
        >
          +
        </button>
      </div>
      <div v-if="planSummary" class="plan-created-banner">
        <p class="plan-created-title">Plan</p>
        <p class="plan-created-details">
          <span>Payment Period: {{ planSummary.paymentPeriod }}</span>
          <span>Amount Per Period: <span class="money">{{ formatCurrency(planSummary.amountPerPeriod) }}</span></span>
        </p>
      </div>
      <div v-if="adjusting" class="adjust-card">
        <h5>{{ adjustMode === 'add' ? 'Add Amount' : 'Remove Amount' }}</h5>
        <form @submit.prevent="applyAdjustment">
          <label>
            Amount (USD)
            <input v-model="adjustAmount" type="number" min="0" step="0.01" />
          </label>
          <div class="adjust-actions">
            <button type="submit">{{ adjustMode === 'add' ? 'Add' : 'Remove' }}</button>
            <button type="button" class="secondary" @click="closeAdjust">Cancel</button>
          </div>
          <p v-if="adjustError" class="error">{{ adjustError }}</p>
        </form>
      </div>
      <p v-if="adjustNotice" class="adjust-notice">{{ adjustNotice }}</p>
    </div>

    <div class="plan-card">
      <button class="plan-toggle" type="button" @click="formOpen = !formOpen">
        <span>Create Savings Plan</span>
        <span aria-hidden="true">{{ formOpen ? '▴' : '▾' }}</span>
      </button>

      <transition name="collapse">
        <div v-show="formOpen" class="plan-body">
          <p class="warning" v-if="totalMismatch">manually enter the total cost then create a plan</p>
          <p class="hint" v-else-if="!hasResolvedTotalCost">Estimate or enter your trip cost before creating a savings plan.</p>
          <p class="hint" v-else-if="!formFieldsReady">Connect a travel goal and fill all fields to create a plan.</p>
          <form @submit.prevent="createPlan">
            <div class="form-grid">
              <label>
                Payment Period (months)
                <input v-model="form.paymentPeriod" type="number" min="0" step="1" />
              </label>
              <label>
                Amount Per Period (USD)
                <input v-model="form.amountPerPeriod" type="number" min="0" step="0.01" />
              </label>
              <label>
                Goal Amount (USD)
                <input v-model="form.goalAmount" type="number" min="0" step="0.01" />
              </label>
            </div>
            <div class="actions">
              <button type="submit" :disabled="submitting || !canSubmit">
                {{ submitting ? 'Creating…' : 'Create Plan' }}
              </button>
            </div>
            <p v-if="error" class="error">{{ error }}</p>
          </form>
        </div>
      </transition>
    </div>
  </section>
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { progressTrackingAPI } from '../services/api'
import { useTravelPlanStore } from '../stores/travelPlan'
import { useUserStore } from '../stores/user'
import { useNotificationStore } from '../stores/notification'

const props = defineProps({
  progress: { type: Number, default: 0 },
  userId: { type: [String, Number], default: null },
  travelPlanId: { type: [String, Number], default: null },
  totalCost: { type: Number, default: null },
  savingsPlan: { type: Object, default: null },
  savingsProgress: { type: Object, default: null }
})

const form = reactive({ paymentPeriod: '', amountPerPeriod: '', goalAmount: '' })
const submitting = ref(false)
const error = ref('')
const planSummary = ref(null)
// Tracks whether there's a real saved savings plan (not just a provisional one built from totalCost)
const hasActualPlan = ref(false)
const totalMismatch = ref(false)
const formOpen = ref(true)
const goalTarget = ref(null)
const currentAmountValue = ref(0)
const adjusting = ref(false)
const adjustMode = ref('add')
const adjustAmount = ref('')
const adjustError = ref('')
const adjustNotice = ref('')
const travelPlanStore = useTravelPlanStore()
const userStore = useUserStore()
const notificationStore = useNotificationStore()

const fallbackProgress = computed(() => (Number.isFinite(props.progress) ? props.progress : 0))

const progressPercent = computed(() => {
  if (goalTarget.value && goalTarget.value > 0) {
    const pct = (currentAmountValue.value / goalTarget.value) * 100
    return Number.isFinite(pct) ? pct : 0
  }
  return fallbackProgress.value
})

const clampedProgress = computed(() => Math.min(100, Math.max(0, Math.round(progressPercent.value))))

const displayCurrentAmount = computed(() => currentAmountValue.value)

const hasResolvedTotalCost = computed(() => {
  if (props.totalCost === null || props.totalCost === undefined || props.totalCost === '') return false
  const numericTotal = Number(props.totalCost)
  return Number.isFinite(numericTotal) && numericTotal > 0
})

const formFieldsReady = computed(() => {
  return form.paymentPeriod !== '' && form.amountPerPeriod !== '' && form.goalAmount !== ''
})

const canSubmit = computed(() => {
  return (
    props.userId &&
    props.travelPlanId &&
    hasResolvedTotalCost.value &&
    formFieldsReady.value &&
    !totalMismatch.value
  )
})

const hasProgress = computed(() => {
  return Number.isFinite(currentAmountValue.value) && currentAmountValue.value > 0
})

function parseNonNegative(value, label, allowFloat = true) {
  if (value === '' || value === null || value === undefined) {
    throw new Error(`${label} is required`)
  }
  const num = Number(value)
  if (!Number.isFinite(num) || num < 0) {
    throw new Error(`${label} must be a non-negative number`)
  }
  if (!allowFloat && !Number.isInteger(num)) {
    throw new Error(`${label} must be an integer`)
  }
  return num
}

function formatCurrency(amount) {
  if (amount === null || amount === undefined) return '—'
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' }).format(amount)
  } catch {
    return String(amount)
  }
}

async function createPlan() {
  error.value = ''
  const session = userStore?.session
  if (!canSubmit.value) {
    error.value = hasResolvedTotalCost.value
      ? 'Provide travel goal and plan details before submitting.'
      : 'Estimate or enter your trip cost before creating a savings plan.'
    return
  }

  if (Number.isFinite(currentAmountValue.value) && currentAmountValue.value > 0) {
    const proceed = window.confirm(
      'Creating a new savings plan will reset your current progress meter. Continue?'
    )
    if (!proceed) {
      return
    }
  }

  try {
    const payload = {
      trip: String(props.travelPlanId),
      paymentPeriod: parseNonNegative(form.paymentPeriod, 'Payment period', false),
      amountPerPeriod: parseNonNegative(form.amountPerPeriod, 'Amount per period'),
      goalAmount: parseNonNegative(form.goalAmount, 'Goal amount')
    }
    if (session) payload.session = session
    submitting.value = true
    console.log('[TravelProgress] Calling createPlan API with payload:', payload)
    const res = await progressTrackingAPI.createPlan(payload)
    console.log('[TravelProgress] createPlan API response:', res.data)
    if (res.data?.error) throw new Error(res.data.error)
    
    // According to API spec, response has: { plan: "Plan", paymentPeriod: "Number", amountPerPeriod: "Number" }
    const normalizedProgressId = res.data?.plan ? String(res.data.plan) : null
    
    console.log('[TravelProgress] Extracted progress ID:', {
      normalizedProgressId,
      willCreateNotification: !!normalizedProgressId
    })
    
    // According to API spec, response has: paymentPeriod and amountPerPeriod
    const summary = {
      paymentPeriod: res.data?.paymentPeriod ?? payload.paymentPeriod,
      amountPerPeriod: res.data?.amountPerPeriod ?? payload.amountPerPeriod,
      goalAmount: payload.goalAmount // API spec doesn't return goalAmount, use what we sent
    }
    planSummary.value = summary
    if (summary.paymentPeriod !== undefined && summary.paymentPeriod !== null) {
      form.paymentPeriod = summary.paymentPeriod
    }
    if (summary.amountPerPeriod !== undefined && summary.amountPerPeriod !== null) {
      form.amountPerPeriod = summary.amountPerPeriod
    }
    const rawGoal = summary.goalAmount
    const numericGoal = Number(rawGoal)
    goalTarget.value = Number.isFinite(numericGoal) ? numericGoal : null
    if (goalTarget.value !== null) {
      form.goalAmount = goalTarget.value
    }
    currentAmountValue.value = 0
    if (props.travelPlanId) {
      travelPlanStore.updateSavingsPlan(props.travelPlanId, {
        paymentPeriod: summary.paymentPeriod,
        amountPerPeriod: summary.amountPerPeriod,
        goalAmount: Number.isFinite(numericGoal) ? numericGoal : null,
        currentAmount: 0,
        planId: normalizedProgressId,
        progressTrackingId: normalizedProgressId,
        id: normalizedProgressId
      })
      travelPlanStore.updateSavingsProgress(props.travelPlanId, {
        manualContribution: 0,
        basePercent: 0,
        progressTrackingId: normalizedProgressId,
        planId: normalizedProgressId,
        id: normalizedProgressId
      })
    }
    
    console.log('[TravelProgress] About to create notification, normalizedProgressId:', normalizedProgressId)
    
    // Handle savings reminder notification from backend response
    // The backend does NOT automatically create a notification, so we must create it manually
    if (normalizedProgressId) {
      try {
        // Create a savings reminder notification
        const reminderMessage = `Savings reminder: set aside $${summary.amountPerPeriod} every ${summary.paymentPeriod} months.`
        
        console.log('[TravelProgress] Creating savings reminder notification with:', {
          progress: normalizedProgressId,
          message: reminderMessage,
          frequency: summary.paymentPeriod,
          planId: props.travelPlanId,
          session: session
        })
        
        const notificationPayload = {
          progress: normalizedProgressId,
          message: reminderMessage,
          frequency: summary.paymentPeriod ?? 0
        }
        
        const createdNotif = await notificationStore.createNotification(
          notificationPayload,
          {
            planId: props.travelPlanId,
            reminderType: 'savings_reminder'
          }
        )
        console.log('[TravelProgress] Created savings reminder notification:', createdNotif)
        console.log('[TravelProgress] Current notifications in store:', notificationStore.notifications)
        
        // Refetch notifications to ensure they are in sync with backend
        try {
          await notificationStore.fetchNotifications()
          console.log('[TravelProgress] After refetch, notifications in store:', notificationStore.notifications)
        } catch (fetchErr) {
          console.warn('[TravelProgress] Failed to refetch notifications:', fetchErr)
          // If refetch fails, the locally created notification should still be in the store
        }
      } catch (notifErr) {
        console.error('[TravelProgress] Failed to create savings reminder notification:', notifErr)
        alert('Failed to create savings reminder notification. Please check the console for details.')
      }
    }
    
    formOpen.value = false
    console.log('[TravelProgress] createPlan completed successfully')
  } catch (err) {
    console.error('[TravelProgress] createPlan error:', err)
    error.value = err?.message || String(err)
  } finally {
    submitting.value = false
  }
}

watch(
  () => props.totalCost,
  (newTotal) => {
    // Allow totalCost to drive the goal until a real savings plan exists
    if (!hasActualPlan.value) {
      if (newTotal !== null && newTotal !== undefined && newTotal !== '') {
        const numericTotal = Number(newTotal)
        if (Number.isFinite(numericTotal)) {
          goalTarget.value = numericTotal
          if (form.goalAmount === '' || form.goalAmount === null) {
            form.goalAmount = numericTotal
          }
        }
      } else {
        goalTarget.value = null
      }
    }
  },
  { immediate: true }
)

watch(
  () => form.goalAmount,
  (newGoal) => {
    const numericGoal = Number(newGoal)
    if (!planSummary.value && Number.isFinite(numericGoal)) {
      goalTarget.value = numericGoal
    }
    if (props.totalCost === null || props.totalCost === undefined || props.totalCost === '') {
      totalMismatch.value = false
      return
    }
    const totalValue = Number(props.totalCost)
    totalMismatch.value = Number.isFinite(numericGoal) && Number.isFinite(totalValue) ? numericGoal !== totalValue : true
  },
  { immediate: true }
)

function normalizeSavingsPlan(input) {
  if (!input || typeof input !== 'object') return null
  const paymentPeriod = input.paymentPeriod ?? input.payment_period ?? input.period ?? null
  const amountPerPeriod = input.amountPerPeriod ?? input.amount_per_period ?? input.amount ?? null
  const goalAmount = input.goalAmount ?? input.goal_amount ?? null
  const currentAmount = input.currentAmount ?? input.current_amount ?? input.saved ?? input.amountSaved ?? null
  if (paymentPeriod === null && amountPerPeriod === null && goalAmount === null && currentAmount === null) return null
  return { paymentPeriod, amountPerPeriod, goalAmount, currentAmount }
}

function normalizeSavingsProgress(input) {
  if (!input || typeof input !== 'object') return null
  const rawContribution = input.manualContribution ?? input.savedAmount ?? input.amount ?? 0
  const contribution = Number(rawContribution)
  const rawBase = input.basePercent ?? input.base_percent ?? input.base ?? null
  const baseNumeric = Number(rawBase)
  return {
    manualContribution: Number.isFinite(contribution) && contribution > 0 ? contribution : 0,
    basePercent: Number.isFinite(baseNumeric) ? baseNumeric : null
  }
}

watch(
  () => props.savingsPlan,
  (newPlan) => {
    const normalized = normalizeSavingsPlan(newPlan)
    planSummary.value = normalized
    hasActualPlan.value = !!(
      normalized && (
        normalized.paymentPeriod !== null && normalized.paymentPeriod !== undefined ||
        normalized.amountPerPeriod !== null && normalized.amountPerPeriod !== undefined
      )
    )
    if (normalized) {
      if (normalized.goalAmount !== undefined && normalized.goalAmount !== null) {
        const numericGoal = Number(normalized.goalAmount)
        if (Number.isFinite(numericGoal)) {
          goalTarget.value = numericGoal
          form.goalAmount = numericGoal
        }
      }
      if (normalized.paymentPeriod !== null && normalized.paymentPeriod !== undefined) {
        form.paymentPeriod = normalized.paymentPeriod
      }
      if (normalized.amountPerPeriod !== null && normalized.amountPerPeriod !== undefined) {
        form.amountPerPeriod = normalized.amountPerPeriod
      }
      if (normalized.currentAmount !== null && normalized.currentAmount !== undefined) {
        const numericCurrent = Number(normalized.currentAmount)
        if (Number.isFinite(numericCurrent)) {
          currentAmountValue.value = numericCurrent
        }
      }
    } else {
      if (props.totalCost === null || props.totalCost === undefined || props.totalCost === '') {
        if (form.goalAmount !== '') {
          form.goalAmount = ''
        }
        goalTarget.value = null
      }
      currentAmountValue.value = 0
    }
  },
  { immediate: true, deep: true }
)

watch(
  () => props.savingsProgress,
  (newProgress) => {
    const normalized = normalizeSavingsProgress(newProgress)
    if (!normalized) {
      if (!planSummary.value) {
        currentAmountValue.value = 0
      }
      return
    }
    if (planSummary.value && planSummary.value.currentAmount != null) {
      return
    }
    const manual = normalized.manualContribution ?? 0
    const basePercent = normalized.basePercent
    let combined = manual
    if (goalTarget.value && goalTarget.value > 0 && basePercent !== null && basePercent !== undefined) {
      const baseAmount = (goalTarget.value * basePercent) / 100
      if (Number.isFinite(baseAmount)) {
        combined += baseAmount
      }
    }
    if (Number.isFinite(combined)) {
      currentAmountValue.value = combined
    }
  },
  { immediate: true, deep: true }
)

watch(
  () => goalTarget.value,
  () => {
    if (goalTarget.value && adjustNotice.value) {
      adjustNotice.value = ''
    }
  }
)

function openAdjust(mode) {
  if (!goalTarget.value || goalTarget.value <= 0) {
    adjustNotice.value = 'Create a savings plan with a goal amount before adjusting progress.'
    return
  }
  if (mode === 'remove' && (!hasProgress.value || currentAmountValue.value <= 0)) {
    adjustNotice.value = 'No savings to remove yet.'
    return
  }
  adjustMode.value = mode
  adjustAmount.value = ''
  adjustError.value = ''
  adjustNotice.value = ''
  adjusting.value = true
}

function closeAdjust() {
  adjusting.value = false
  adjustAmount.value = ''
  adjustError.value = ''
}

function applyAdjustment() {
  adjustError.value = ''
  if (!goalTarget.value || goalTarget.value <= 0) {
    adjustError.value = 'Set a goal amount before adjusting progress.'
    return
  }
  let amount
  try {
    amount = parseNonNegative(adjustAmount.value, 'Amount')
  } catch (err) {
    adjustError.value = err?.message || String(err)
    return
  }
  if (amount <= 0) {
    adjustError.value = 'Enter an amount greater than zero.'
    return
  }
  if (adjustMode.value === 'add') {
    currentAmountValue.value = Number((currentAmountValue.value + amount).toFixed(2))
  } else {
    currentAmountValue.value = Number(Math.max(0, currentAmountValue.value - amount).toFixed(2))
  }

  if (props.travelPlanId) {
    const normalizedAmount = Number(currentAmountValue.value.toFixed(2))
    travelPlanStore.updateSavingsPlan(props.travelPlanId, {
      currentAmount: normalizedAmount
    })
    travelPlanStore.updateSavingsProgress(props.travelPlanId, {
      manualContribution: normalizedAmount,
      basePercent: progressPercent.value
    })
  }
  adjusting.value = false
  adjustAmount.value = ''
  adjustNotice.value = adjustMode.value === 'add' ? 'Amount added to your savings progress.' : 'Amount removed from your savings progress.'
}
</script>

<style scoped>
.progress-section {
  margin-top: 1rem;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}
.progress-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
}
.progress-controls {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}
.adjust-btn {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: 1px solid var(--ink-300);
  background: #fff;
  color: var(--ink-900);
  font-size: 1.4rem;
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background 0.2s, transform 0.2s;
}
.adjust-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  background: #f5f5f5;
  color: #bbb;
  border-color: #e0e0e0;
}
.adjust-btn:hover {
  background: var(--surface-1);
}
.adjust-btn:active {
  transform: scale(0.95);
}
.adjust-btn:focus-visible {
  outline: none;
  box-shadow: var(--ring);
}
.progress-meter {
  background: var(--card-bg);
  border-radius: 12px;
  padding: 0.8rem 1.4rem;
  box-shadow: var(--shadow-sm);
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 0.5rem;
  border: 1px solid var(--card-border);
  min-width: 240px;
}
.progress-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}
.progress-label { font-size: 1rem; color: var(--ink-900); font-weight: 600; }
.goal-target {
  font-size: 0.95rem;
  color: var(--ink-700);
  font-weight: 500;
}
.progress-bar {
  width: 200px;
  height: 12px;
  background: rgba(0, 200, 5, 0.18);
  border-radius: 6px;
  overflow: hidden;
  margin: 0 0.7rem;
}
.progress-fill {
  height: 100%;
  background: var(--green-500);
  border-radius: 6px;
  transition: width 0.3s;
}
.progress-value {
  font-size: 1rem;
  color: #333;
  font-weight: 500;
  align-self: center;
}
.current-amount {
  margin-top: 0.25rem;
  text-align: center;
  color: var(--ink-700);
  font-size: 0.95rem;
  font-weight: 500;
}
.money { color: var(--green-600); font-weight: 700; }
.plan-created-banner {
  background: var(--surface-1);
  border: 1px dashed var(--card-border);
  border-radius: 10px;
  padding: 0.8rem 1.2rem;
  text-align: center;
  max-width: 320px;
  width: 100%;
  box-shadow: var(--shadow-sm);
}
.plan-created-title {
  margin: 0;
  font-weight: 600;
  color: var(--ink-900);
  font-size: 1rem;
}
.plan-created-details {
  margin: 0.4rem 0 0;
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  color: #555;
  font-size: 0.95rem;
}
.adjust-card {
  width: 100%;
  max-width: 320px;
  background: var(--card-bg);
  border: 1px solid var(--card-border);
  border-radius: 8px;
  padding: 0.9rem 1rem;
  box-shadow: var(--shadow-sm);
}
.adjust-card h5 {
  margin: 0 0 0.6rem;
  font-size: 1rem;
  color: var(--ink-900);
}
.adjust-card label {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  font-size: 0.95rem;
}
.adjust-card input {
  padding: 0.45rem 0.6rem;
  border: 1px solid #d9d9d9;
  border-radius: 4px;
  font-size: 1rem;
}
.adjust-actions {
  margin-top: 0.9rem;
  display: flex;
  gap: 0.5rem;
}
.adjust-actions button {
  padding: 0.5rem 1.2rem;
  border-radius: 4px;
  border: 1px solid var(--ink-300);
  cursor: pointer;
  font-size: 0.95rem;
  transition: background 0.2s;
}
.adjust-actions button[type="submit"] {
  background: var(--green-500);
  color: #fff;
  border-color: var(--green-600);
}
.adjust-actions button[type="submit"]:hover {
  background: var(--green-400);
}
.adjust-actions .secondary {
  background: #fff;
  color: var(--ink-900);
  border-color: var(--ink-300);
}
.adjust-actions .secondary:hover {
  background: var(--surface-1);
}
.adjust-notice {
  margin: 0.4rem 0 0;
  color: var(--ink-700);
  font-size: 0.95rem;
  text-align: center;
}
.plan-card {
  background: var(--card-bg);
  border: 1px solid var(--card-border);
  border-radius: 8px;
  padding: 1.25rem;
  box-shadow: var(--shadow-sm);
}
.plan-toggle {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: none;
  border: none;
  font-size: 1.05rem;
  font-weight: 600;
  color: var(--ink-900);
  cursor: pointer;
  padding: 0;
}
.plan-toggle:focus-visible {
  outline: none;
  box-shadow: var(--ring);
}
.plan-body {
  margin-top: 1rem;
}
.hint {
  margin: 0 0 1rem;
  color: #777;
  font-size: 0.9rem;
}
.warning {
  margin: 0 0 1rem;
  color: #8a5d00;
  font-size: 0.95rem;
  font-weight: 500;
}
.form-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 1rem;
}
.form-grid label {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  font-size: 0.95rem;
}
.form-grid input {
  padding: 0.45rem 0.6rem;
  border: 1px solid #d9d9d9;
  border-radius: 4px;
  font-size: 1rem;
}
.actions {
  margin-top: 1rem;
}
.actions button {
  padding: 0.6rem 1.4rem;
  border: 1px solid var(--green-600);
  border-radius: 6px;
  background: var(--green-500);
  color: #fff;
  font-size: 1rem;
  cursor: pointer;
  transition: background 0.2s;
}
.actions button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
.actions button:not(:disabled):hover {
  background: var(--green-400);
}
.error {
  margin-top: 0.75rem;
  color: #b3261e;
  font-size: 0.95rem;
}
.collapse-enter-active,
.collapse-leave-active {
  transition: max-height 0.2s ease, opacity 0.2s ease;
}
.collapse-enter-from,
.collapse-leave-to {
  max-height: 0;
  opacity: 0;
  overflow: hidden;
}
.collapse-enter-to,
.collapse-leave-from {
  max-height: 600px;
  opacity: 1;
}
</style>

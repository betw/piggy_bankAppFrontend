<template>
  <div v-if="hasPlan" class="goal-actions">
      <div class="primary-actions">
        <button @click="$emit('estimate')" :disabled="estimating">
          {{ estimating ? 'Estimating…' : 'Automatic Trip Cost Estimate' }}
        </button>
        <button @click="$emit('necessity')" :disabled="necessityDisabled">
          Update Trip Necessities
        </button>
      </div>
      <p v-if="statusMessage" class="status-message">{{ statusMessage }}</p>
      <p v-if="errorMessage" class="error-message">{{ errorMessage }}</p>
      <button class="manual-button" @click="$emit('manual')" :disabled="manualDisabled">
        Manual Trip Cost Estimate
      </button>
      <div class="spacer" aria-hidden="true"></div>
      <button class="home-button" @click="$emit('home')">Home</button>
  </div>
</template>

<script setup>
const props = defineProps({
  hasPlan: { type: Boolean, default: false },
  estimating: { type: Boolean, default: false },
  manualDisabled: { type: Boolean, default: false },
  necessityDisabled: { type: Boolean, default: false },
  statusMessage: { type: String, default: '' },
  errorMessage: { type: String, default: '' }
})
</script>

<style scoped>
.goal-actions {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  /* Make sidebar tall enough to push Home down within viewport when sticky */
  min-height: calc(100vh - 12rem);
}
.primary-actions {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
}
.goal-actions button {
  width: 160px;
  padding: 0.65rem 0.9rem;
  font-size: 1rem;
  border-radius: 10px;
  border: 1px solid var(--green-600);
  background: var(--green-500);
  color: #fff;
  box-shadow: var(--shadow-sm);
  cursor: pointer;
  transition: background 0.2s, border-color 0.2s, box-shadow 0.2s;
}
.goal-actions button:hover {
  background: var(--green-400);
  border-color: var(--green-600);
}
.goal-actions button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
.goal-actions button:focus-visible {
  outline: none;
  box-shadow: var(--ring);
}
.status-message {
  margin-top: 0.5rem;
  color: #8a5d00;
  font-size: 0.95rem;
  text-align: center;
}
.error-message {
  margin-top: 0.5rem;
  color: #b3261e;
  font-size: 0.95rem;
  text-align: center;
}
.manual-button {
  margin-top: 0.5rem; /* slight extra separation from the primary actions */
}
.spacer { flex: 1 1 auto; }
.home-button {
  margin-top: 1.25rem;
}
@media (max-width: 900px) {
  .goal-actions {
    /* Avoid large empty space on small screens */
    min-height: unset;
  }
}
</style>

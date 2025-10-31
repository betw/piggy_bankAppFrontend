<template>
  <div v-if="hasPlan" class="goal-actions">
    <button @click="$emit('estimate')" :disabled="estimating">
      {{ estimating ? 'Estimating…' : 'Estimate Cost' }}
    </button>
    <button @click="$emit('manual')" :disabled="manualDisabled">
      Enter Cost Manually
    </button>
    <button @click="$emit('necessity')" :disabled="necessityDisabled">
      Update Necessities
    </button>
    <button @click="$emit('home')">Home</button>
    <p v-if="statusMessage" class="status-message">{{ statusMessage }}</p>
    <p v-if="errorMessage" class="error-message">{{ errorMessage }}</p>
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
}
.goal-actions button {
  width: 140px;
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
  text-align: center;
}
.error-message {
  margin-top: 0.5rem;
  color: #b3261e;
  font-size: 0.95rem;
  text-align: center;
}
</style>

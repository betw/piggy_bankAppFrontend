<template>
  <teleport to="body">
    <div v-if="visible" class="modal-root" @keydown.esc="onCancel">
      <div class="backdrop" @click="onCancel" aria-hidden="true"></div>
      <div class="modal" role="dialog" aria-modal="true" aria-labelledby="manual-cost-title" tabindex="-1">
        <div class="manual-cost-form">
          <h3 id="manual-cost-title">Manual Cost Estimate</h3>
          <form @submit.prevent="onSubmit">
            <label>
              Flight Cost
              <input v-model="form.flight" type="number" min="0" step="0.01" placeholder="e.g. 450" />
            </label>
            <label>
              Rooms Per Night
              <input v-model="form.roomsPerNight" type="number" min="0" step="0.01" placeholder="e.g. 180" />
            </label>
            <label>
              Food Per Day
              <input v-model="form.foodDaily" type="number" min="0" step="0.01" placeholder="e.g. 75" />
            </label>
            <div class="form-footer">
              <button type="submit" :disabled="loading">{{ loading ? 'Saving…' : 'Save Estimate' }}</button>
              <button type="button" @click="onCancel" :disabled="loading">Cancel</button>
            </div>
            <p v-if="displayError" class="error-message">{{ displayError }}</p>
          </form>
        </div>
      </div>
    </div>
  </teleport>
  
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue'

const props = defineProps({
  visible: { type: Boolean, default: false },
  loading: { type: Boolean, default: false },
  error: { type: String, default: '' },
  initialValues: {
    type: Object,
    default: () => ({ flight: '', roomsPerNight: '', foodDaily: '' })
  }
})

const emit = defineEmits(['submit', 'cancel'])

const form = reactive({ flight: '', roomsPerNight: '', foodDaily: '' })
const localError = ref('')

function resetForm(values) {
  form.flight = values?.flight ?? ''
  form.roomsPerNight = values?.roomsPerNight ?? ''
  form.foodDaily = values?.foodDaily ?? ''
  localError.value = ''
}

watch(() => props.visible, (visible) => {
  if (visible) {
    resetForm(props.initialValues)
  } else {
    localError.value = ''
  }
}, { immediate: true })

watch(() => props.initialValues, (values) => {
  if (props.visible) resetForm(values)
}, { deep: true })

function parseField(value, label) {
  if (value === '' || value === null || value === undefined) return undefined
  const num = Number(value)
  if (!Number.isFinite(num) || num < 0) {
    throw new Error(`${label} must be a non-negative number`)
  }
  return num
}

function onSubmit() {
  try {
    const normalized = {
      flight: parseField(form.flight, 'Flight cost'),
      roomsPerNight: parseField(form.roomsPerNight, 'Rooms per night'),
      foodDaily: parseField(form.foodDaily, 'Food per day')
    }
    const sanitized = {}
    Object.entries(normalized).forEach(([key, value]) => {
      if (value !== undefined) sanitized[key] = value
    })
    if (!Object.keys(sanitized).length) {
      throw new Error('Enter at least one cost field to save an estimate.')
    }
    localError.value = ''
    emit('submit', sanitized)
  } catch (err) {
    localError.value = err?.message || String(err)
  }
}

function onCancel() {
  localError.value = ''
  emit('cancel')
}

const displayError = computed(() => localError.value || props.error)
</script>

<style scoped>
/* modal layout */
.modal-root {
  position: fixed;
  inset: 0;
  z-index: 50;
}
.backdrop {
  position: absolute;
  inset: 0;
  background: rgba(0,0,0,0.45);
}
.modal {
  position: absolute;
  top: 50%; left: 50%;
  transform: translate(-50%, -50%);
  width: min(520px, 92vw);
  max-height: 80vh;
  overflow: auto;
}
.manual-cost-form {
  width: 100%;
  background: #fffefd;
  border: 1px solid #ffe58f;
  border-radius: 8px;
  padding: 0.9rem; /* tighter padding to reduce height */
  box-shadow: 0 6px 24px rgba(0,0,0,0.18);
}
.manual-cost-form h3 {
  margin-top: 0;
  margin-bottom: 0.5rem;
  color: #8a5d00;
}
.manual-cost-form label {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  margin-bottom: 0.5rem;
  font-size: 0.95rem;
}
.manual-cost-form input {
  padding: 0.4rem 0.55rem;
  border: 1px solid #d9d9d9;
  border-radius: 4px;
  font-size: 1rem;
}
.form-footer {
  display: flex;
  gap: 0.5rem;
}
.form-footer button {
  flex: 1;
  padding: 0.45rem 0.9rem;
  border: none;
  border-radius: 4px;
  background: #ffe58f;
  color: #333;
  cursor: pointer;
  transition: background 0.2s;
}
.form-footer button:hover {
  background: #ffd666;
}
.form-footer button[disabled] {
  opacity: 0.6;
  cursor: not-allowed;
}
.error-message {
  margin-top: 0.5rem;
  color: #b3261e;
  font-size: 0.95rem;
}
</style>

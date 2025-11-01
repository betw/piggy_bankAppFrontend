<template>
  <teleport to="body">
    <div v-if="visible" class="modal-root" @keydown.esc="onCancel">
      <div class="backdrop" @click="onCancel" aria-hidden="true"></div>
      <div class="modal" role="dialog" aria-modal="true" aria-labelledby="necessity-title" tabindex="-1">
        <div class="necessity-form">
          <h3 id="necessity-title">Travel Necessities</h3>
          <form @submit.prevent="onSubmit">
            <label>
              <input type="checkbox" v-model="form.accommodation" />
              Save for accommodation (rooms)
            </label>
            <label>
              <input type="checkbox" v-model="form.diningFlag" />
              Save for dining out
            </label>
            <div class="form-footer">
              <button type="submit" :disabled="loading">{{ loading ? 'Updating…' : 'Update Necessities' }}</button>
              <button type="button" @click="onCancel" :disabled="loading">Cancel</button>
            </div>
            <p v-if="error" class="error-message">{{ error }}</p>
          </form>
        </div>
      </div>
    </div>
  </teleport>
</template>

<script setup>
import { reactive, watch } from 'vue'

const props = defineProps({
  visible: { type: Boolean, default: false },
  loading: { type: Boolean, default: false },
  error: { type: String, default: '' },
  initialValues: {
    type: Object,
    default: () => ({ accommodation: true, diningFlag: true })
  }
})

const emit = defineEmits(['submit', 'cancel'])

const form = reactive({ accommodation: true, diningFlag: true })

function resetForm(values) {
  form.accommodation = Boolean(values?.accommodation ?? true)
  form.diningFlag = Boolean(values?.diningFlag ?? true)
}

watch(() => props.visible, (visible) => {
  if (visible) {
    resetForm(props.initialValues)
  }
}, { immediate: true })

watch(() => props.initialValues, (values) => {
  if (props.visible) resetForm(values)
}, { deep: true })

function onSubmit() {
  emit('submit', {
    accommodation: Boolean(form.accommodation),
    diningFlag: Boolean(form.diningFlag)
  })
}

function onCancel() {
  emit('cancel')
}
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
.necessity-form {
  width: 100%;
  background: #fffefd;
  border: 1px solid #ffe58f;
  border-radius: 8px;
  padding: 0.9rem; /* tighter padding to reduce height */
  box-shadow: 0 6px 24px rgba(0,0,0,0.18);
}
.necessity-form h3 {
  margin-top: 0;
  margin-bottom: 0.5rem;
  color: #8a5d00;
}
.necessity-form label {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  margin-bottom: 0.5rem;
  font-size: 0.95rem;
}
.necessity-form input[type="checkbox"] {
  width: 18px;
  height: 18px;
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

<template>
  <div v-if="visible" class="necessity-form">
    <h3>Travel Necessities</h3>
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
.necessity-form h3 {
  margin-top: 0;
  margin-bottom: 0.75rem;
  color: #8a5d00;
}
.necessity-form label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.9rem;
  font-size: 0.95rem;
}
.necessity-form input[type="checkbox"] {
  width: 18px;
  height: 18px;
}
.form-footer {
  display: flex;
  gap: 0.75rem;
}
.form-footer button {
  flex: 1;
  padding: 0.55rem 1.1rem;
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

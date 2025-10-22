<template>
  <section>
    <h2>Demo: Fetch Plans</h2>
    <button @click="loadPlans" :disabled="loading">Load Plans from Backend</button>

    <div v-if="error" style="color: red; margin-top: .5rem">Error: {{ error }}</div>
    <ul v-if="plans.length" style="margin-top: .5rem">
      <li v-for="(p, i) in plans" :key="i">Plan: {{ p.plan?.goalAmount ?? '—' }} goal, current: {{ p.plan?.currentAmount ?? 0 }}</li>
    </ul>

    <div v-else-if="!loading" style="margin-top: .5rem">No plans loaded.</div>
  </section>
</template>

<script>
import api from '../services/api'
import { ref } from 'vue'

export default {
  setup() {
    const plans = ref([])
    const loading = ref(false)
    const error = ref(null)

    // TODO: Replace dummy user object with real authentication/user context
    async function loadPlans() {
      loading.value = true
      error.value = null
      try {
        const res = await api.post('/ProgressTracking/_getPlans', { user: {} })
        plans.value = res.data || []
      } catch (err) {
        error.value = err?.message || String(err)
      } finally {
        loading.value = false
      }
    }

    return { plans, loading, error, loadPlans }
  }
}
</script>

<style scoped>
button { padding: .5rem 1rem; border-radius: 4px; }
</style>

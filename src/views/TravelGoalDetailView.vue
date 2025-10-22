<template>
  <section>
    <h2>Goal Detail</h2>
    <p>Detail for goal ID: {{ goalId }}</p>
    <button @click="back">Back to Home</button>
  </section>
</template>

<script>
import { useAppStore } from '../stores/app'

export default {
  setup() {
    const app = useAppStore()
    function back() { app.setView('Home') }
    return { goalId: app.selectedGoalId, back }
  }
}
</script>

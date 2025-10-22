<template>
  <nav class="nav">
    <button @click="go('Home')">Home</button>
    <button @click="go('AllGoals')">All Goals</button>
    <button @click="go('Notifications')">Notifications</button>
  </nav>
</template>

<script>
import { useAppStore } from '../stores/app'

export default {
  setup() {
    const app = useAppStore()
    function go(view) { app.setView(view) }
    return { go }
  }
}
</script>

<style scoped>
.nav { display: flex; gap: .5rem; }
button { padding: .5rem 1rem; }
</style>

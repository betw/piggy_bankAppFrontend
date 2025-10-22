<template>
  <div id="app">
    <header>
      <h1>Piggy Bank — Trip Savings</h1>
    </header>

    <NavigationBar />

    <main>
      <HomeView v-if="app.currentView === 'Home'" />
      <AllGoalsView v-else-if="app.currentView === 'AllGoals'" />
      <NotificationsView v-else-if="app.currentView === 'Notifications'" />
      <TravelGoalDetailView v-else-if="app.currentView === 'GoalDetail'" />
    </main>

  </div>
</template>

<script>
import NavigationBar from './components/NavigationBar.vue'
import HomeView from './views/HomeView.vue'
import AllGoalsView from './views/AllGoalsView.vue'
import NotificationsView from './views/NotificationsView.vue'
import TravelGoalDetailView from './views/TravelGoalDetailView.vue'
import { useAppStore } from './stores/app'

export default {
  name: 'App',
  components: { NavigationBar, HomeView, AllGoalsView, NotificationsView, TravelGoalDetailView },
  setup() {
    const app = useAppStore()
    return { app }
  }
}
</script>

<style>
body { font-family: system-ui, Arial, sans-serif; margin: 0; padding: 0; }
#app { padding: 1rem; }
header { background: #0b5fff; color: white; padding: 1rem; }
main { margin-top: 1rem; }
footer { margin-top: 2rem; color: #666; }
</style>

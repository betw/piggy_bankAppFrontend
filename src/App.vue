<template>
  <div id="app">
    <header>
      <h1>Piggy Bank — Trip Savings</h1>
    </header>

          <NavigationBar />

    <main>
            <router-view />
    </main>

  </div>
</template>

<script>
import { onMounted, watch } from 'vue'
import NavigationBar from './components/NavigationBar.vue'
import { useUserStore } from './stores/user'
import { useTravelPlanStore } from './stores/travelPlan'
import { useNotificationStore } from './stores/notification'

export default {
  name: 'App',
  components: { NavigationBar },
  setup() {
    const userStore = useUserStore()
    const travelPlanStore = useTravelPlanStore()
    const notificationStore = useNotificationStore()
    onMounted(() => {
      userStore.hydrate()
      travelPlanStore.hydrate()
      if (typeof notificationStore.hydrate === 'function') {
        notificationStore.hydrate()
      }
    })
    watch(
      () => userStore.currentUser,
      () => {
        travelPlanStore.hydrate()
        if (typeof notificationStore.hydrate === 'function') {
          notificationStore.hydrate()
        }
      }
    )
    return {}
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

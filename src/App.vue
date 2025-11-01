<template>
  <div id="app">
    <header class="app-header">
  <h1 class="brand-title">Piggy Bank <img class="brand-icon" :src="pigIcon" alt="" /></h1>
    </header>

    <NavigationBar />

    <main>
      <div class="container">
        <router-view />
      </div>
    </main>
  </div>
  
</template>

<script>
import { onMounted, watch } from 'vue'
import NavigationBar from './components/NavigationBar.vue'
import { useUserStore } from './stores/user'
import { useTravelPlanStore } from './stores/travelPlan'
import { useNotificationStore } from './stores/notification'
import pigIcon from '../piggybank.png'

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
    return { pigIcon }
  }
}
</script>

<style>
#app { min-height: 100vh; }
main { margin-top: .5rem; }
.app-header .brand-title { display: inline-flex; align-items: center; gap: .5rem; }
.brand-icon { width: 32px; height: 32px; border-radius: 4px; }
</style>

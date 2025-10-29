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
import { onMounted } from 'vue'
import NavigationBar from './components/NavigationBar.vue'
import { useUserStore } from './stores/user'
import { useTravelPlanStore } from './stores/travelPlan'

export default {
  name: 'App',
  components: { NavigationBar },
  setup() {
    const userStore = useUserStore()
    const travelPlanStore = useTravelPlanStore()
    onMounted(() => {
      userStore.hydrate()
      travelPlanStore.hydrate()
    })
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

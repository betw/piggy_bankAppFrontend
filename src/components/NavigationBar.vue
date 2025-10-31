<template>
  <nav class="nav">
    <div class="nav-left">
  <button @click="go('Home')">Home</button>
  <button @click="go('AllGoals')">All Goals</button>
  <button @click="go('Notifications')">Notifications</button>
  <button @click="go('GoalDetail')">Travel Goal</button>
    </div>
    <div class="nav-right" v-if="isLoggedIn">
      <span v-if="username" class="who">{{ username }}</span>
      <button @click="onLogout">Logout</button>
    </div>
  <!-- debug output removed -->
  </nav>
</template>

<script>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '../stores/user'
import { useTravelPlanStore } from '../stores/travelPlan'

export default {
  components: { },
  setup() {
    const router = useRouter()
    const userStore = useUserStore()
    const travelPlanStore = useTravelPlanStore()

  const isLoggedIn = computed(() => !!userStore.currentUser)
  const username = computed(() => userStore.username || '')
    const latestPlanId = computed(() => {
      if (!travelPlanStore.currentPlan?.id) {
        const plans = Object.values(travelPlanStore.plans || {})
        return plans.length ? plans[plans.length - 1].id : null
      }
      return travelPlanStore.currentPlan.id
    })

    function go(view) {
      if (view === 'Home') router.push('/')
      else if (view === 'AllGoals') router.push('/goals')
      else if (view === 'Notifications') router.push('/notifications')
      else if (view === 'GoalDetail') {
        const id = latestPlanId.value
        if (id) router.push(`/goal/${id}`)
      }
      else if (view === 'Login') router.push('/login')
    }
    function onLogout() {
      userStore.logout()
      router.push('/login')
    }

    return { go, onLogout, isLoggedIn, username }
  }
}
</script>

<style scoped>
.nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}
.nav-left {
  display: flex;
  gap: .5rem;
}
.nav-right {
  display: flex;
  align-items: center;
  gap: .75rem;
}
.who {
  font-weight: 500;
  margin-right: .5rem;
}
button {
  padding: .5rem 1rem;
  font-size: 1rem;
}
.debug {
  margin-left: 2rem;
  font-size: .95rem;
  color: #444;
}
</style>

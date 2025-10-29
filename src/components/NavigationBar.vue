<template>
  <nav class="nav">
    <div class="nav-left">
  <button @click="go('Home')">Home</button>
  <button @click="go('AllGoals')">All Goals</button>
  <button @click="go('Notifications')">Notifications</button>
  <button @click="go('GoalDetail')">Travel Goal</button>
    </div>
    <div class="nav-right" v-if="isLoggedIn">
      <span class="who">Hello {{ username }}</span>
      <button @click="onLogout">Logout</button>
    </div>
  <!-- debug output removed -->
  </nav>
</template>

<script>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '../stores/user'

export default {
  components: { },
  setup() {
    const router = useRouter()
    const userStore = useUserStore()

    const isLoggedIn = computed(() => !!userStore.currentUser)
    const username = computed(() => userStore.currentUser?.username ?? 'user')

    function go(view) {
      if (view === 'Home') router.push('/')
      else if (view === 'AllGoals') router.push('/goals')
      else if (view === 'Notifications') router.push('/notifications')
      else if (view === 'GoalDetail') router.push('/goal/1') // Example: id=1
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

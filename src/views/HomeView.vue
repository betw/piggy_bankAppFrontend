<template>
  <section>
    <h2 class="home-tagline">Save for your next trip!</h2>
    <div class="auth-banner" v-if="!userStore.currentUser">
      <p>You must be logged in to create a travel plan.</p>
      <button @click.prevent="goLogin">Login</button>
    </div>

    <form class="trip-form" @submit.prevent="onSubmit">
      <label>
        From City
        <input v-model="fromCity" type="text" required placeholder="Enter departure city" />
      </label>
      <label>
        To City
        <input v-model="toCity" type="text" required placeholder="Enter destination city" />
      </label>
      <label>
        From Date
        <input v-model="fromDate" type="date" required />
      </label>
      <label>
        To Date
        <input v-model="toDate" type="date" required />
      </label>
      <button type="submit" :disabled="loading || !userStore.currentUser">Select Trip</button>
    </form>
  </section>
  <div v-if="error" class="error">{{ error }}</div>
  
</template>

<script>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import api from '../services/api'
import { useUserStore } from '../stores/user'
import { useTravelPlanStore } from '../stores/travelPlan'

export default {
  name: 'HomeView',
  setup() {
    const fromCity = ref('')
    const toCity = ref('')
  const fromDate = ref('')
  const toDate = ref('')
    const loading = ref(false)
    const error = ref(null)

  const router = useRouter()
  const userStore = useUserStore()

    
    function resolveUserId(user) {
      if (!user) return null
      if (typeof user === 'string') return user
      if (typeof user === 'object') {
        return user.id ?? user.userId ?? user.userID ?? user.username ?? user.name ?? null
      }
      return null
    }

    async function onSubmit() {
      // guard to avoid double-submit
      if (loading.value) return
      console.log('[HomeView] onSubmit called')
      error.value = null
      // basic date validation
      if (!fromDate.value || !toDate.value) {
        error.value = 'Please select both from and to dates.'
        return
      }
      // Parse date-only strings as local dates to avoid UTC shifting
      const parseLocalDate = (s) => {
        if (typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s)) {
          const [y, m, d] = s.split('-').map(Number)
          return new Date(y, m - 1, d)
        }
        return new Date(s)
      }
      const f = parseLocalDate(fromDate.value)
      const t = parseLocalDate(toDate.value)
      const today = new Date()
      today.setHours(0,0,0,0)
      if (t < f) {
        error.value = 'To date must be the same or after From date.'
        return
      }
      if (f < today || t < today) {
        error.value = 'Dates must be today or later.'
        return
      }

        loading.value = true
        const travelPlanStore = useTravelPlanStore()
        try {
          const userId = resolveUserId(userStore.currentUser)
          if (!userId) {
            error.value = 'You must be logged in to create a travel plan.'
            router.push('/login')
            return
          }
          const body = {
            user: userId,
            fromCity: fromCity.value,
            toCity: toCity.value,
            fromDate: fromDate.value,
            toDate: toDate.value
          }
          // debug: show the payload in browser console so we can confirm handler ran
          console.log('[HomeView] submitting travel plan', body)
            // require login before creating a travel plan
            const travelPlan = await travelPlanStore.createTravelPlan(body)
          const id = travelPlan?.id ?? travelPlan
          if (id === undefined || id === null) {
            console.error('[HomeView] Missing travel plan id in response', travelPlan)
            error.value = 'Unexpected response: missing travel plan id.'
            return
          }
          // navigate to canonical route; store already has the plan cached
          router.push({ path: `/goal/${id}` })
        } catch (err) {
          error.value = err?.response?.data?.error || err.message || String(err)
        } finally {
          loading.value = false
        }
    }

    onMounted(() => console.log('[HomeView] mounted'))

    function goLogin() {
      router.push('/login')
    }
    return { fromCity, toCity, fromDate, toDate, loading, error, onSubmit, userStore, goLogin }
  }
} 
</script> 

<style scoped>
.home-tagline {
  margin: 0 0 1rem 0;
  font-size: 1.5rem;
  color: var(--ink-900, #0f172a);
  text-align: center;
}
.trip-form {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  flex-direction: column;
  align-items: stretch;
  width: min(520px, 100%);
  margin: 0 auto; /* center form horizontally */
}
.trip-form label { display: flex; flex-direction: column; gap: 0.25rem; }
input {
  padding: 0.4rem 0.55rem;
  font-size: 1rem;
}
.trip-form button {
  padding: 0.4rem 0.85rem; /* slightly shorter */
  font-size: 0.98rem;
  margin-top: 0.35rem;
  width: auto; /* don't stretch full width */
  align-self: center; /* center horizontally */
}
.error {
  color: #a00;
  margin-top: .5rem;
}
</style>

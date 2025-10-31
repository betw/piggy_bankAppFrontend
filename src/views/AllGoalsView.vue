<template>
  <section>
    <h2>All Goals</h2>
    <div v-if="plansList.length" class="goals-list">
      <TripNotification
        v-for="plan in plansList"
        :key="plan.id"
        title="Travel Goal"
        :message="''"
        :travelPlan="plan"
        :show-delete="false"
        @click="goToGoalDetail(plan.id)"
        style="cursor:pointer;"
      />
    </div>
    <p v-else class="empty-state">All goals will appear after creating your first travel goal.</p>
    <button @click="goHome">Home</button>
  </section>
  
</template>

<script>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import TripNotification from '../components/TripNotification.vue'
import { useTravelPlanStore } from '../stores/travelPlan'

export default {
  name: 'AllGoalsView',
  components: { TripNotification },
  setup() {
    const router = useRouter()
    const travelPlanStore = useTravelPlanStore()
    const plansList = computed(() => Object.values(travelPlanStore.plans || {}))
    function goHome() {
      router.push('/')
    }
    function goToGoalDetail(id) {
      router.push(`/goal/${id}`)
    }
    return { goHome, plansList, goToGoalDetail }
  }
}
</script>

<style scoped>
.trip-notification {
  background: #fffbe6;
  border: 1px solid #ffe58f;
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 1rem;
  box-shadow: 0 2px 8px rgba(0,0,0,0.04);
  transition: box-shadow 0.2s;
}
.trip-notification:hover {
  box-shadow: 0 4px 16px rgba(0,0,0,0.08);
}

.goals-list {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  margin-bottom: 2rem;
}
.empty-state {
  margin: 2rem 0;
  color: #666;
  font-size: 1rem;
}
</style>

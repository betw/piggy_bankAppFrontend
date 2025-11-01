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
        :show-plan-summary="false"
        :clickable="true"
        :show-delete="false"
        @click="goToGoalDetail(plan.id)"
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

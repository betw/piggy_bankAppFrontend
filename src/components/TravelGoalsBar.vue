<template>
  <div class="goals-bar" v-if="plansList.length">
    <div class="goals-list-wrapper">
      <ul class="goals-list">
        <li v-for="p in plansList" :key="p.id">
          <button class="goal-btn" @click="openGoal(p.id)">{{ p.toCity || ('Goal ' + p.id) }}</button>
        </li>
      </ul>
    </div>
  </div>
  <!-- Renders nothing when there are no plans -->
</template>

<script>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useTravelPlanStore } from '../stores/travelPlan'

export default {
  name: 'TravelGoalsBar',
  setup() {
    const router = useRouter()
    const travelPlanStore = useTravelPlanStore()
    const plansList = computed(() => Object.values(travelPlanStore.plans || {}))
    function openGoal(id) { router.push(`/goal/${id}`) }
    function goHome() { router.push('/') }
    return { plansList, openGoal, goHome }
  }
}
</script>

<style scoped>
.goals-bar {
  display: flex;
  align-items: center;
  gap: .5rem;
  margin-left: 2rem;
}
.goals-list {
  display: flex;
  gap: .5rem;
  list-style: none;
  margin: 0;
  padding: 0;
}
.goal-btn {
  padding: .25rem .75rem;
  font-size: .95rem;
  border-radius: 4px;
  border: 1px solid #ccc;
  background: #f7f7f7;
  cursor: pointer;
}
.goal-btn:hover {
  background: #e0eaff;
}
.no-goals { margin-left: .6rem; color:#666 }
</style>
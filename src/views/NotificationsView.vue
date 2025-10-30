<template>
  <section>
    <h2>Notifications</h2>
    <div v-if="notifications.length" class="notifications-list">
      <TripNotification
        v-for="(notif, idx) in notifications"
        :key="idx"
        :title="notif.title"
        :message="notif.message"
        @click="goToGoalDetail(notif.id)"
        style="cursor:pointer;"
      />
    </div>
    <p v-else class="empty-state">Notifications will appear after creating your first travel goal.</p>
    <button @click="goHome">Home</button>
  </section>
</template>

<script>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import TripNotification from '../components/TripNotification.vue'

export default {
  name: 'NotificationsView',
  components: { TripNotification },
  setup() {
    const router = useRouter()
    function goHome() {
      router.push('/')
    }
    const notifications = ref([])
    function goToGoalDetail(id) {
      router.push(`/goal/${id}`)
    }
    return { goHome, notifications, goToGoalDetail }
  }
}
</script>
<style scoped>
.notifications-list {
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
</style>

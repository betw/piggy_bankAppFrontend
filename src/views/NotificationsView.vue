<template>
  <section>
    <h2>Notifications</h2>
    <div class="notifications-list">
      <TripNotification
        v-for="(notif, idx) in notifications"
        :key="idx"
        :title="notif.title"
        :message="notif.message"
        @click="goToGoalDetail(notif.id)"
        style="cursor:pointer;"
      />
    </div>
    <button @click="goHome">Home</button>
  </section>
</template>

<script>
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
    // Dummy notifications for demo
    const notifications = [
      { id: 1, title: 'Trip to Paris', message: 'Don’t forget to book your hotel!' },
      { id: 2, title: 'Trip to Tokyo', message: 'Visa application deadline is next week.' },
      { id: 3, title: 'Trip to New York', message: 'Check your flight status.' }
    ]
    function goToGoalDetail(id) {
      router.push(`/goal/${id}`)
    }
    return { goHome, notifications, goToGoalDetail }
    return { goHome, notifications }
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

<template>
  <section>
    <h2>Notifications</h2>
    <div v-if="hasNotifications" class="notifications-list">
      <HalfwayNotification
        v-for="notif in milestoneNotifications"
        :key="notif.id || `milestone-${notif.progress}`"
        :notification="notif"
        @view="goToGoalDetail"
      />
      <TripNotification
        v-for="notif in otherNotifications"
        :key="notif.id || `notification-${notif.progress || notif.message}`"
        title="Notification"
        :message="notif.message"
        @click="goToGoalDetail(notif.progress)"
        style="cursor:pointer;"
      />
    </div>
    <p v-else class="empty-state">Notifications will appear after creating your first travel goal.</p>
    <button @click="goHome">Home</button>
  </section>
</template>

<script>
import { computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import TripNotification from '../components/TripNotification.vue'
import HalfwayNotification from '../components/HalfwayNotification.vue'
import { useNotificationStore } from '../stores/notification'
import { useUserStore } from '../stores/user'

export default {
  name: 'NotificationsView',
  components: { TripNotification, HalfwayNotification },
  setup() {
    const router = useRouter()
    const notificationStore = useNotificationStore()
    const userStore = useUserStore()

    const allNotifications = computed(() => notificationStore.notifications)
    const milestoneNotifications = computed(() => notificationStore.milestoneNotifications)
    const otherNotifications = computed(() =>
      allNotifications.value.filter((item) => item?.message !== 'You are halfway there!')
    )
    const hasNotifications = computed(() => allNotifications.value.length > 0)

    function goHome() {
      router.push('/')
    }

    function goToGoalDetail(id) {
      if (!id) return
      router.push(`/goal/${id}`)
    }

    async function loadNotificationsForUser(user) {
      if (!user) return
      try {
        await notificationStore.fetchNotifications(user)
      } catch (err) {
        console.error('[notifications view] failed to load notifications:', err)
      }
    }

    onMounted(() => {
      userStore.hydrate()
      if (userStore.currentUser) {
        loadNotificationsForUser(userStore.currentUser)
      }
    })

    watch(
      () => userStore.currentUser,
      (user) => {
        if (user) {
          loadNotificationsForUser(user)
        }
      },
      { immediate: false }
    )

    return {
      milestoneNotifications,
      otherNotifications,
      hasNotifications,
      goHome,
      goToGoalDetail
    }
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

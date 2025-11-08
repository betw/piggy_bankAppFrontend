<template>
  <section>
    <h2>Notifications</h2>
    <div v-if="hasNotifications" class="notifications-list">
      <HalfwayNotification
        v-for="notif in milestoneNotifications"
        :key="notif.id || `milestone-${notif.progress}`"
        :notification="notif"
        :travel-plan="planForNotification(notif.planId || notif.progress || notif.id)"
        @view="goToGoalDetail"
        @delete="removeNotification(notif)"
      />
      <TripNotification
        v-for="notif in otherNotifications"
        :key="notif.id || `notification-${notif.progress || notif.message}`"
        title="Notification"
        :message="notif.message"
        :details="frequencyLabel(notif)"
        :travel-plan="planForNotification(notif.planId || notif.progress || notif.id)"
        variant="attn"
        @click="navigateToNotification(notif)"
        @delete="removeNotification(notif)"
        style="cursor:pointer;"
      />
    </div>
    <p v-else class="empty-state">Notifications will appear after creating your first travel goal.</p>
    <button @click="goHome">Home</button>
  </section>
</template>

<script>
import { computed, onMounted, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useRouter } from 'vue-router'
import TripNotification from '../components/TripNotification.vue'
import HalfwayNotification from '../components/HalfwayNotification.vue'
import { useNotificationStore } from '../stores/notification'
import { useUserStore } from '../stores/user'
import { useTravelPlanStore } from '../stores/travelPlan'

export default {
  name: 'NotificationsView',
  components: { TripNotification, HalfwayNotification },
  setup() {
    const router = useRouter()
    const notificationStore = useNotificationStore()
    const travelPlanStore = useTravelPlanStore()
    const { notifications, milestoneNotifications: milestoneGetter } = storeToRefs(notificationStore)
    const userStore = useUserStore()

    const allNotifications = notifications
    const milestoneNotifications = milestoneGetter

    function isMilestoneNotification(item) {
      if (!item) return false
      const msg = item?.message
      if (!msg) return false
      const normalized = String(msg).trim().toLowerCase()
      if (normalized.includes('halfway')) return true
      if (normalized.includes('goal')) {
        return normalized.includes('complete') || normalized.includes('completion')
      }
      return false
    }

    const otherNotifications = computed(() => {
      const filtered = allNotifications.value.filter((item) => !isMilestoneNotification(item))
      return filtered
    })
    const hasNotifications = computed(() => allNotifications.value.length > 0)

    function normalizeId(value) {
      if (value === undefined || value === null) return null
      if (typeof value === 'string') {
        const trimmed = value.trim()
        return trimmed.length ? trimmed : null
      }
      if (typeof value === 'number' && Number.isFinite(value)) return String(value)
      return null
    }

    function collectPlanIdentifiers(plan) {
      if (!plan || typeof plan !== 'object') return []
      const candidates = [
        plan.id,
        plan.travelPlanID,
        plan.travelPlanId,
        plan.travel_plan_id,
        plan.progressTrackingId,
        plan.progressTrackingID,
        plan.progress_tracking_id,
        plan.progressId,
        plan.progressID,
        plan.progress,
        plan.halfwayNotificationId,
        plan.goalNotificationId
      ]
      return candidates
        .map((candidate) => normalizeId(candidate))
        .filter((value, index, arr) => value && arr.indexOf(value) === index)
    }

    const plansById = computed(() => {
      const map = new Map()
      const plans = travelPlanStore.plans || {}
      Object.values(plans).forEach((plan) => {
        collectPlanIdentifiers(plan).forEach((id) => {
          if (id && !map.has(id)) {
            map.set(id, plan)
          }
        })
      })
      const current = travelPlanStore.currentPlan
      if (current) {
        collectPlanIdentifiers(current).forEach((id) => {
          if (id && !map.has(id)) {
            map.set(id, current)
          }
        })
      }
      return map
    })

    function planForNotification(progressId) {
      const normalized = normalizeId(progressId)
      if (!normalized) return null
      const map = plansById.value
      return map.get(normalized) ?? null
    }

    watch(
      allNotifications,
      (current) => {
        const snapshot = Array.isArray(current)
          ? current.map((item) => ({ id: item?.id, message: item?.message, progress: item?.progress }))
          : current
      },
      { immediate: true, deep: true }
    )

    watch(
      milestoneNotifications,
      (current) => {
        const snapshot = Array.isArray(current)
          ? current.map((item) => ({ id: item?.id, message: item?.message, progress: item?.progress }))
          : current
      },
      { immediate: true, deep: true }
    )

    function goHome() {
      router.push('/')
    }

    function goToGoalDetail(id) {
      const planId = normalizeId(id)
      if (!planId) return
      const plan = planForNotification(planId) || travelPlanStore.plans?.[planId]
      if (!plan) {
        const loader = travelPlanStore.fetchTravelPlan?.(planId)
        if (loader && typeof loader.then === 'function') {
          loader.catch(() => {})
        }
      }
      const planToCache = plan ?? planForNotification(planId)
      if (planToCache && typeof travelPlanStore.cachePlan === 'function') {
        travelPlanStore.cachePlan(planToCache)
        if (typeof travelPlanStore.setCurrentPlan === 'function') {
          travelPlanStore.setCurrentPlan(planToCache)
        }
      } else if (typeof travelPlanStore.setCurrentPlan === 'function') {
        travelPlanStore.setCurrentPlan({ id: planId, progressTrackingId: planId })
      }
      const routeId = planToCache ? normalizeId(firstPlanIdentifier(planToCache)) ?? planId : planId
    router.push(`/goal/${routeId}`)
    }

    function firstPlanIdentifier(plan) {
      const ids = collectPlanIdentifiers(plan)
      return ids.length ? ids[0] : null
    }

    function findPlanOrNotification(notif) {
      if (!notif) return null
      const progressId = normalizeId(notif.progress)
      if (progressId) {
        const plan = planForNotification(progressId)
        if (plan) return { plan, id: progressId }
      }
      if (notif.planId) {
        const candidateId = normalizeId(notif.planId)
        const plan = candidateId ? planForNotification(candidateId) : null
        if (candidateId) {
          return { plan, id: candidateId }
        }
      }
      if (notif.id) {
        const notifId = normalizeId(notif.id)
        const plan = notifId ? planForNotification(notifId) : null
        if (notifId) {
          return { plan, id: notifId }
        }
      }
      return {
        plan: progressId ? planForNotification(progressId) : null,
        id: progressId ?? normalizeId(notif.id ?? notif.planId ?? null)
      }
    }

    function navigateToNotification(notif) {
      if (!notif) return
      const lookup = findPlanOrNotification(notif)
      if (lookup?.plan && notif?.id && typeof notificationStore.setNotificationMeta === 'function') {
        const canonicalId =
          firstPlanIdentifier(lookup.plan) ?? lookup.id ?? notif.planId ?? notif.progress ?? notif.id ?? null
        notificationStore.setNotificationMeta(notif.id, {
          planId: canonicalId ?? null,
          progress: lookup.id ?? notif.progress ?? null
        })
      }
      const target = lookup?.plan
        ? firstPlanIdentifier(lookup.plan) ?? lookup.id ?? notif.planId ?? notif.progress ?? notif.id
        : lookup?.id ?? notif.planId ?? notif.progress ?? notif.id
      goToGoalDetail(target)
    }

    async function removeNotification(notif) {
      if (!notif) return
      const notificationId = normalizeId(notif.id ?? null)
      if (!notificationId) return
      try {
        await notificationStore.deleteNotification(notificationId)
      } catch (err) {
        console.error('[notifications view] failed to delete notification:', err)
      }
    }

    function frequencyLabel(notif) {
      const value = Number(notif?.frequency)
      if (!Number.isFinite(value) || value <= 0) return ''
      return value === 1 ? 'Every month' : `Every ${value} months`
    }

    async function loadNotificationsForUser() {
      try {
        await notificationStore.fetchNotifications()
      } catch (err) {
        console.error('[notifications view] failed to load notifications:', err)
      }
    }

    onMounted(() => {
      if (typeof travelPlanStore.hydrate === 'function') {
        travelPlanStore.hydrate()
      }
      if (typeof notificationStore.hydrate === 'function') {
        notificationStore.hydrate()
      }
      userStore.hydrate()
      if (userStore.currentUser) {
        loadNotificationsForUser()
      }
    })

    watch(
      () => userStore.currentUser,
      (user) => {
        if (user) {
          if (typeof notificationStore.hydrate === 'function') {
            notificationStore.hydrate()
          }
          loadNotificationsForUser()
        }
      },
      { immediate: false }
    )

    return {
      milestoneNotifications,
      otherNotifications,
      hasNotifications,
      goHome,
      goToGoalDetail,
      planForNotification,
      navigateToNotification,
      removeNotification,
      frequencyLabel
    }
  }
}
</script>
<style scoped>
.notifications-list {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 1.25rem;
  margin-bottom: 2rem;
}
.empty-state {
  margin: 2rem 0;
  color: #666;
  font-size: 1rem;
}
/* TripNotification styling handled by its own variant; keep page layout minimal here */
</style>

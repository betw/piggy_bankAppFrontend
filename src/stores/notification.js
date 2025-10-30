import { defineStore } from 'pinia'
import api from '../services/api'

function normalizeNotification(payload) {
  if (!payload) return null
  const base = typeof payload === 'object' ? payload : { message: payload }
  const source = base.notification && typeof base.notification === 'object' ? base.notification : base
  const id = source.id ?? source.notificationId ?? source.notificationID ?? source.pk ?? source.PK ?? null
  const progress = source.progress ?? source.progressId ?? source.progressID ?? source.progressTrackingId ?? source.progress_tracking_id ?? null
  const user = source.user ?? source.userId ?? source.userID ?? null
  const frequency = source.frequency ?? source.frequencyValue ?? source.freq ?? base.frequency ?? 0
  const message = source.message ?? base.message ?? ''
  const createdAt = source.createdAt ?? source.created_at ?? source.timestamp ?? null

  return {
    id: id != null ? String(id) : null,
    progress: progress != null ? String(progress) : null,
    user: user != null ? String(user) : null,
    frequency: Number.isFinite(Number(frequency)) ? Number(frequency) : 0,
    message,
    createdAt,
    raw: source
  }
}

export const useNotificationStore = defineStore('notification', {
  state: () => ({
    notifications: []
  }),
  getters: {
    milestoneNotifications(state) {
      return state.notifications.filter((item) => item?.message === 'You are halfway there!')
    }
  },
  actions: {
    async fetchNotifications(user) {
      const userId = typeof user === 'object' ? (user?.id ?? user?.userId ?? user?.userID ?? user?.username ?? user?.name) : user
      if (!userId) return []
      try {
        const res = await api.post('/api/Notification/_getAllNotifications', { user: userId })
        const list = Array.isArray(res.data) ? res.data : res.data?.notifications ?? []
        const normalized = list
          .map((item) => normalizeNotification(item))
          .filter(Boolean)
        this.notifications = normalized
        return normalized
      } catch (err) {
        console.error('[notification] fetchNotifications error:', err)
        throw err?.response?.data?.error || err.message || err
      }
    },
    async createNotification(payload) {
      try {
        const res = await api.post('/api/Notification/createNotification', payload)
        if (res.data?.error) throw new Error(res.data.error)
        const normalized = normalizeNotification(res.data) ?? normalizeNotification(res.data?.notification) ?? normalizeNotification(payload)
        if (normalized) {
          const exists = this.notifications.some((item) => item.id && normalized.id && item.id === normalized.id)
          if (!exists) {
            this.notifications.push(normalized)
          }
        }
        return normalized
      } catch (err) {
        console.error('[notification] createNotification error:', err)
        throw err?.response?.data?.error || err.message || err
      }
    }
  }
})

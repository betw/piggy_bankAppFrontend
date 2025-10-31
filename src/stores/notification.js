import { defineStore } from 'pinia'
import api from '../services/api'
import { useUserStore } from './user'

const META_STORAGE_PREFIX = 'pb_notification_meta'
const NOTIFICATION_STORAGE_PREFIX = 'pb_notifications'
const STORAGE_SCOPE_FALLBACK = 'anonymous'

function loadMetaStore(storageKey) {
  if (!storageKey) return {}
  try {
    const raw = localStorage.getItem(storageKey)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    if (parsed && typeof parsed === 'object') {
      return parsed
    }
  } catch (err) {
    console.error('[notification] failed to parse meta store:', err)
  }
  return {}
}

function saveMetaStore(storageKey, meta) {
  if (!storageKey) return
  try {
    localStorage.setItem(storageKey, JSON.stringify(meta))
  } catch (err) {
    console.error('[notification] failed to persist meta store:', err)
  }
}

function loadNotificationCache(storageKey) {
  if (!storageKey) return []
  try {
    const raw = localStorage.getItem(storageKey)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) {
      return parsed
    }
    if (parsed && Array.isArray(parsed.notifications)) {
      return parsed.notifications
    }
  } catch (err) {
    console.error('[notification] failed to parse notification cache:', err)
  }
  return []
}

function saveNotificationCache(storageKey, notifications) {
  if (!storageKey) return
  try {
    localStorage.setItem(storageKey, JSON.stringify({ notifications }))
  } catch (err) {
    console.error('[notification] failed to persist notification cache:', err)
  }
}

function resolveNotificationScope() {
  try {
    const userStore = useUserStore()
    const candidate = userStore?.currentUser ?? null
    let identifier = null
    if (candidate && typeof candidate === 'object') {
      identifier =
        candidate.id ??
        candidate.userId ??
        candidate.userID ??
        candidate.user ??
        candidate.username ??
        candidate.name ??
        null
    } else if (candidate !== null && candidate !== undefined) {
      identifier = candidate
    }
    if (!identifier && userStore?.username) {
      identifier = userStore.username
    }
    const trimmed = identifier != null ? String(identifier).trim() : ''
    return trimmed.length ? trimmed : STORAGE_SCOPE_FALLBACK
  } catch (err) {
    console.error('[notification] resolveNotificationScope failed:', err)
    return STORAGE_SCOPE_FALLBACK
  }
}

function toMillis(value) {
  if (value === undefined || value === null) return 0
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.getTime()
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0
  if (typeof value === 'string') {
    const parsed = Date.parse(value)
    if (!Number.isNaN(parsed)) return parsed
    const numeric = Number(value)
    return Number.isFinite(numeric) ? numeric : 0
  }
  return 0
}

function notificationTimestamp(notification, metaStore) {
  if (!notification) return 0
  const meta = notification?.id ? metaStore?.[String(notification.id)] ?? null : null
  const candidates = [
    notification.createdAt,
    notification.created_at,
    notification.timestamp,
    notification.raw?.createdAt,
    notification.raw?.created_at,
    notification.raw?.timestamp,
    meta?.createdAt
  ]
  for (const candidate of candidates) {
    const millis = toMillis(candidate)
    if (millis) return millis
  }
  return 0
}

function sortNewestFirst(list, metaStore) {
  return [...list].sort((a, b) => notificationTimestamp(b, metaStore) - notificationTimestamp(a, metaStore))
}

function normalizeNotification(payload) {
  if (!payload) return null
  const container = typeof payload === 'object' ? payload : { notification: payload }
  const notificationValue =
    container.notification !== undefined ? container.notification : container

  let id = null
  if (typeof notificationValue === 'string' || typeof notificationValue === 'number') {
    id = String(notificationValue)
  } else if (notificationValue && typeof notificationValue === 'object') {
    const candidate =
      notificationValue.id ??
      notificationValue.notificationId ??
      notificationValue.notificationID ??
      null
    if (candidate !== null && candidate !== undefined) {
      id = String(candidate)
    }
  }
  if (!id) return null

  const rawProgress =
    container.progress ??
    (typeof notificationValue === 'object' ? notificationValue.progress : null)
  const rawUser =
    container.user ?? (typeof notificationValue === 'object' ? notificationValue.user : null)
  const rawFrequency =
    container.frequency ??
    (typeof notificationValue === 'object' ? notificationValue.frequency : null)
  const rawMessage =
    container.message ?? (typeof notificationValue === 'object' ? notificationValue.message : '')
  const createdAt =
    container.createdAt ??
    container.created_at ??
    container.timestamp ??
    (typeof notificationValue === 'object'
      ? notificationValue.createdAt ??
        notificationValue.created_at ??
        notificationValue.timestamp ??
        null
      : null)
  const planIdentifier =
    container.plan ??
    container.planId ??
    container.planID ??
    container.travelPlan ??
    container.travel_plan ??
    (typeof notificationValue === 'object'
      ? notificationValue.plan ??
        notificationValue.planId ??
        notificationValue.planID ??
        notificationValue.travelPlan ??
        notificationValue.travel_plan ??
        null
      : null)

  return {
    id,
    progress: rawProgress !== undefined && rawProgress !== null ? String(rawProgress) : null,
    user: rawUser !== undefined && rawUser !== null ? String(rawUser) : null,
    frequency: Number.isFinite(Number(rawFrequency)) ? Number(rawFrequency) : 0,
    message: rawMessage !== undefined && rawMessage !== null ? String(rawMessage) : '',
    planId: planIdentifier !== undefined && planIdentifier !== null ? String(planIdentifier) : null,
    createdAt,
    raw: container
  }
}

export const useNotificationStore = defineStore('notification', {
  state: () => ({
    notifications: [],
    storageKey: null,
    meta: {},
    metaStorageKey: null
  }),
  getters: {
    milestoneNotifications(state) {
      return state.notifications.filter((item) => {
        const raw = item?.message
        if (!raw) return false
        const normalized = String(raw).trim().toLowerCase()
        if (normalized.includes('halfway')) return true
        if (normalized.includes('goal')) return normalized.includes('complete') || normalized.includes('completion')
        return false
      })
    }
  },
  actions: {
    _sortNotifications() {
      this.notifications = sortNewestFirst(
        Array.isArray(this.notifications) ? this.notifications : [],
        this.meta
      )
    },
    _ensureScope() {
      const scope = resolveNotificationScope()
      const nextStorageKey = `${NOTIFICATION_STORAGE_PREFIX}::${scope}`
      const nextMetaKey = `${META_STORAGE_PREFIX}::${scope}`
      let changed = false
      if (this.storageKey !== nextStorageKey) {
        this.storageKey = nextStorageKey
        this.notifications = loadNotificationCache(nextStorageKey)
        changed = true
      }
      if (this.metaStorageKey !== nextMetaKey) {
        this.metaStorageKey = nextMetaKey
        this.meta = loadMetaStore(nextMetaKey)
        changed = true
      }
      if (changed) {
        this._sortNotifications()
      }
    },
    hydrate() {
      this._ensureScope()
      return this.notifications
    },
    _persistNotifications() {
      if (this.storageKey) {
        saveNotificationCache(this.storageKey, this.notifications)
      }
    },
    _persistMeta() {
      if (this.metaStorageKey) {
        saveMetaStore(this.metaStorageKey, this.meta)
      }
    },
    setNotificationMeta(id, data) {
      this._ensureScope()
      const normalizedId = id != null ? String(id) : null
      if (!normalizedId || !data) return
      const existing =
        this.meta[normalizedId] && typeof this.meta[normalizedId] === 'object'
          ? this.meta[normalizedId]
          : {}
      this.meta = { ...this.meta, [normalizedId]: { ...existing, ...data } }
      this._persistMeta()
      const idx = this.notifications.findIndex((item) => item?.id === normalizedId)
      if (idx !== -1) {
        this.notifications.splice(idx, 1, { ...this.notifications[idx], ...data })
        this._sortNotifications()
        this._persistNotifications()
      }
    },
    _mergeNotification(id, updates) {
      this._ensureScope()
      if (!id || !updates) return null
      const idx = this.notifications.findIndex((item) => item?.id === id)
      if (idx === -1) return null
      const merged = { ...this.notifications[idx], ...updates }
      this.notifications.splice(idx, 1, merged)
      this._persistNotifications()
      return merged
    },
    async hydrateNotificationDetails(notificationId, user) {
      this._ensureScope()
      const id = notificationId != null ? String(notificationId) : null
      const userId =
        typeof user === 'object'
          ? user?.id ?? user?.userId ?? user?.userID ?? user?.username ?? user?.name
          : user
      if (!id || !userId) return null
      try {
  const res = await api.post('Notification/getNotificationMessageAndFreq', {
          user: userId,
          notification: id
        })
        if (res.data?.error) throw new Error(res.data.error)
        const messageValue = res.data?.message ?? ''
        const frequencyValue = res.data?.frequency ?? 0
        const frequency = Number.isFinite(Number(frequencyValue)) ? Number(frequencyValue) : 0
        const result = this._mergeNotification(id, {
          message: messageValue !== null && messageValue !== undefined ? String(messageValue) : '',
          frequency
        })
        const existing =
          this.meta[id] && typeof this.meta[id] === 'object' ? this.meta[id] : {}
        this.meta = {
          ...this.meta,
          [id]: {
            ...existing,
            message: messageValue !== null && messageValue !== undefined ? String(messageValue) : '',
            frequency
          }
        }
        this._persistMeta()
        return result
      } catch (err) {
        console.error('[notification] hydrateNotificationDetails error:', err)
        throw err?.response?.data?.error || err.message || err
      }
    },
    async fetchNotifications(user) {
      this._ensureScope()
      const userId = typeof user === 'object' ? (user?.id ?? user?.userId ?? user?.userID ?? user?.username ?? user?.name) : user
      if (!userId) return []
      try {
        const existingById = new Map(
          Array.isArray(this.notifications)
            ? this.notifications.map((item) => [item?.id, item])
            : []
        )
        const res = await api.post('Notification/_getAllNotifications', { user: userId })
        const list = Array.isArray(res.data) ? res.data : res.data?.notifications ?? []
        const expanded = []
        list.forEach((entry) => {
          if (entry === null || entry === undefined) return
          if (Array.isArray(entry)) {
            entry.forEach((value) => {
              if (value !== null && value !== undefined) expanded.push({ notification: value })
            })
            return
          }
          if (typeof entry === 'object' && Array.isArray(entry.notifications)) {
            entry.notifications.forEach((value) => {
              if (value !== null && value !== undefined) expanded.push({ notification: value })
            })
            return
          }
          expanded.push(entry)
        })
        const normalized = expanded
          .map((item) => normalizeNotification(item))
          .filter(Boolean)
          .map((item) => {
            const existing = item?.id ? existingById.get(item.id) : null
            const meta = item?.id ? this.meta?.[item.id] ?? null : null
            const merged = existing ? { ...existing, ...item } : { ...item }
            if (meta) {
              if (merged.progress == null && meta.progress != null) merged.progress = String(meta.progress)
              if (merged.planId == null && meta.planId != null) merged.planId = String(meta.planId)
              if (meta.frequency != null && (merged.frequency == null || Number(merged.frequency) === 0)) {
                merged.frequency = meta.frequency
              }
              if (meta.message && (!merged.message || !merged.message.length)) {
                merged.message = String(meta.message)
              }
              if (merged.createdAt == null && meta.createdAt != null) {
                merged.createdAt = meta.createdAt
              }
              if (meta.reminderType && !merged.reminderType) {
                merged.reminderType = meta.reminderType
              }
              if (meta.paymentPeriod != null && merged.paymentPeriod == null) {
                merged.paymentPeriod = meta.paymentPeriod
              }
              if (meta.amountPerPeriod != null && merged.amountPerPeriod == null) {
                merged.amountPerPeriod = meta.amountPerPeriod
              }
            }
            return merged
          })
        console.log('[notification] fetchNotifications result', {
          raw: res.data,
          expanded: expanded,
          normalized: normalized.map((item) => ({ id: item.id, message: item.message, progress: item.progress }))
        })
        this.notifications = sortNewestFirst(normalized, this.meta)
        if (!normalized.length) {
          this._persistNotifications()
          return this.notifications
        }
        normalized.forEach((item) => {
          const existingMeta =
            item?.id && this.meta[item.id] && typeof this.meta[item.id] === 'object'
              ? this.meta[item.id]
              : {}
          if (item?.id) {
            this.meta = {
              ...this.meta,
              [item.id]: {
                ...existingMeta,
                progress: item.progress ?? null,
                planId: item.planId ?? null,
                message: item.message ?? null,
                frequency: item.frequency ?? null,
                createdAt: item.createdAt ?? null,
                reminderType: item.reminderType ?? item.raw?.reminderType ?? null,
                paymentPeriod: item.paymentPeriod ?? item.raw?.paymentPeriod ?? null,
                amountPerPeriod: item.amountPerPeriod ?? item.raw?.amountPerPeriod ?? null
              }
            }
          }
        })
        this._persistMeta()
        this._persistNotifications()
        await Promise.all(
          normalized.map((notif) =>
            this.hydrateNotificationDetails(notif.id, userId).catch((err) => {
              console.error('[notification] fetchNotifications hydrate error:', err)
              return null
            })
          )
        )
        this._sortNotifications()
        this._persistNotifications()
        return this.notifications
      } catch (err) {
        console.error('[notification] fetchNotifications error:', err)
        throw err?.response?.data?.error || err.message || err
      }
    },
    async deleteNotification(notificationId, user) {
      this._ensureScope()
      const id = notificationId != null ? String(notificationId) : null
      const userId =
        typeof user === 'object'
          ? user?.id ?? user?.userId ?? user?.userID ?? user?.username ?? user?.name
          : user
      if (!id) throw new Error('deleteNotification: missing notification id')
      if (!userId) throw new Error('deleteNotification: missing user id')
      try {
        await api.post('Notification/deleteNotification', { user: userId, notification: id })
      } catch (err) {
        console.error('[notification] deleteNotification error:', err)
        throw err?.response?.data?.error || err.message || err
      }
      const idx = this.notifications.findIndex((item) => item?.id === id)
      if (idx !== -1) {
        this.notifications.splice(idx, 1)
        this._sortNotifications()
        this._persistNotifications()
      }
      if (id && Object.prototype.hasOwnProperty.call(this.meta, id)) {
        const { [id]: _omit, ...rest } = this.meta
        this.meta = rest
        this._persistMeta()
      }
    },
    async createNotification(payload, options = {}) {
      this._ensureScope()
      const metaExtras = {
        planId:
          options?.planId !== undefined && options?.planId !== null
            ? String(options.planId)
            : options?.travelPlan !== undefined && options?.travelPlan !== null
            ? String(options.travelPlan)
            : null
      }
      try {
        const res = await api.post('Notification/createNotification', payload)
        if (res.data?.error) throw new Error(res.data.error)
        const normalizedFromResponse =
          normalizeNotification(res.data) || normalizeNotification(res.data?.notification)
        let normalized = normalizedFromResponse
          ? {
              ...normalizedFromResponse,
              progress:
                normalizedFromResponse.progress ??
                (payload?.progress !== undefined && payload?.progress !== null
                  ? String(payload.progress)
                  : null),
              user:
                normalizedFromResponse.user ??
                (payload?.user !== undefined && payload?.user !== null
                  ? String(payload.user)
                  : null),
              frequency:
                normalizedFromResponse.frequency !== undefined
                  ? normalizedFromResponse.frequency
                  : Number.isFinite(Number(payload?.frequency))
                  ? Number(payload.frequency)
                  : 0,
              message:
                normalizedFromResponse.message && normalizedFromResponse.message.length
                  ? normalizedFromResponse.message
                  : payload?.message
                  ? String(payload.message)
                  : '',
              planId:
                normalizedFromResponse.planId ??
                normalizedFromResponse.travelPlan ??
                normalizedFromResponse.travel_plan ??
                metaExtras.planId
            }
          : null
        if (!normalized) {
          const syntheticId = `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
          normalized = {
            id: syntheticId,
            progress:
              payload?.progress !== undefined && payload?.progress !== null
                ? String(payload.progress)
                : null,
            user:
              payload?.user !== undefined && payload?.user !== null
                ? String(payload.user)
                : null,
            frequency: Number.isFinite(Number(payload?.frequency)) ? Number(payload.frequency) : 0,
            message: payload?.message ? String(payload.message) : '',
            createdAt: new Date().toISOString(),
            synthetic: true,
            planId: metaExtras.planId
          }
        }
        if (!normalized) {
          return null
        }
        if (normalized.createdAt == null) {
          normalized.createdAt = new Date().toISOString()
        }

        const existingIndex = this.notifications.findIndex((item) => item?.id === normalized.id)
        if (existingIndex !== -1) {
          this.notifications.splice(existingIndex, 1, {
            ...this.notifications[existingIndex],
            ...normalized
          })
        } else {
          this.notifications.push(normalized)
        }
        this._sortNotifications()
        this._persistNotifications()

        if (normalized?.id) {
          const existingMeta =
            this.meta[normalized.id] && typeof this.meta[normalized.id] === 'object'
              ? this.meta[normalized.id]
              : {}
          this.meta = {
            ...this.meta,
            [normalized.id]: {
              ...existingMeta,
              planId: normalized.planId ?? metaExtras.planId ?? null,
              progress: normalized.progress ?? null,
              message: normalized.message ?? null,
              frequency: normalized.frequency ?? null,
              createdAt: normalized.createdAt ?? new Date().toISOString(),
              reminderType: options?.reminderType ?? null,
              paymentPeriod: normalized.paymentPeriod ?? null,
              amountPerPeriod: normalized.amountPerPeriod ?? null
            }
          }
          this._persistMeta()
        }

        console.log('[notification] stored notification', {
          id: normalized.id,
          message: normalized.message,
          progress: normalized.progress,
          count: this.notifications.length
        })
        return normalized
      } catch (err) {
        console.error('[notification] createNotification error:', err)
        throw err?.response?.data?.error || err.message || err
      }
    },
  }
})

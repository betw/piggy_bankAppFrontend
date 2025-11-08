import { defineStore } from 'pinia'
import { notificationAPI } from '../services/api'
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

  // According to API spec, notification response is just the Notification ID
  let id = null
  if (typeof notificationValue === 'string' || typeof notificationValue === 'number') {
    id = String(notificationValue)
  } else if (notificationValue && typeof notificationValue === 'object') {
    // Check common ID fields as fallback for hydrated objects
    id = notificationValue.id ? String(notificationValue.id) : null
  }
  if (!id) return null

  // These fields come from getNotificationMessageAndFreq or are added locally
  const rawProgress = container.progress ?? (typeof notificationValue === 'object' ? notificationValue.progress : null)
  const rawFrequency = container.frequency ?? (typeof notificationValue === 'object' ? notificationValue.frequency : null)
  const rawMessage = container.message ?? (typeof notificationValue === 'object' ? notificationValue.message : '')
  const createdAt = container.createdAt ?? (typeof notificationValue === 'object' ? notificationValue.createdAt : null)
  
  // planId is not in API spec but we track it locally for navigation
  const planIdentifier = container.planId ?? (typeof notificationValue === 'object' ? notificationValue.planId : null)

  return {
    id,
    progress: rawProgress !== undefined && rawProgress !== null ? String(rawProgress) : null,
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
    async hydrateNotificationDetails(notificationId) {
      this._ensureScope()
      const id = notificationId != null ? String(notificationId) : null
      const userStore = useUserStore()
      const session = userStore?.session
      if (!id) return null
      try {
        const payload = { notification: id }
        if (session) payload.session = session
        const res = await notificationAPI.getNotificationMessageAndFreq(payload)
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
    async fetchNotifications() {
      this._ensureScope()
      const userStore = useUserStore()
      const session = userStore?.session
      if (!session) return []
      
      console.log('[notification] fetchNotifications BEFORE - current notifications:', 
        this.notifications.map(n => ({ id: n.id, message: n.message?.substring(0, 30) })))
      
      try {
        const existingById = new Map(
          Array.isArray(this.notifications)
            ? this.notifications.map((item) => [item?.id, item])
            : []
        )
        
        console.log('[notification] existingById size:', existingById.size)
        
        // API uses session-based authentication
        const payload = { session }
        
        console.log('[notification] fetchNotifications payload:', payload)
        
        const res = await notificationAPI.getAllNotifications(payload)
        
        // According to API spec, response is [{ notification: "Notification" }]
        const list = Array.isArray(res.data) ? res.data : []
        const expanded = []
        list.forEach((entry) => {
          if (entry === null || entry === undefined) return
          // Each entry should be { notification: "Notification" }
          if (entry.notification !== undefined) {
            expanded.push(entry)
          }
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
          normalized: normalized.map((item) => ({ id: item.id, message: item.message, progress: item.progress })),
          existingLocal: Array.from(existingById.values()).map(n => ({ id: n.id, message: n.message, synthetic: n.synthetic }))
        })
        
        // Preserve locally created notifications that aren't in the backend response
        // This handles cases where the backend hasn't returned recently created notifications yet
        const backendIds = new Set(normalized.map(n => n.id))
        const localOnlyNotifications = Array.from(existingById.values())
          .filter(n => !backendIds.has(n.id))
        
        console.log('[notification] Preservation check:', {
          backendCount: normalized.length,
          localCount: existingById.size,
          localOnlyCount: localOnlyNotifications.length,
          backendIds: Array.from(backendIds),
          localIds: Array.from(existingById.keys())
        })
        
        if (localOnlyNotifications.length > 0) {
          console.log('[notification] Preserving local notifications not in backend response:', 
            localOnlyNotifications.map(n => ({ id: n.id, message: n.message, synthetic: n.synthetic })))
          normalized.push(...localOnlyNotifications)
        }
        
        console.log('[notification] FINAL normalized count:', normalized.length)
        
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
            this.hydrateNotificationDetails(notif.id).catch((err) => {
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
    async deleteNotification(notificationId) {
      this._ensureScope()
      const id = notificationId != null ? String(notificationId) : null
      const userStore = useUserStore()
      const session = userStore?.session
      if (!id) throw new Error('deleteNotification: missing notification id')
      if (!session) throw new Error('deleteNotification: missing session')
      try {
        const payload = { notification: id, session }
        await notificationAPI.deleteNotification(payload)
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
      const userStore = useUserStore()
      const session = userStore?.session
      
      const metaExtras = {
        planId:
          options?.planId !== undefined && options?.planId !== null
            ? String(options.planId)
            : options?.travelPlan !== undefined && options?.travelPlan !== null
            ? String(options.travelPlan)
            : null
      }
      try {
        const apiPayload = { ...payload }
        if (session) apiPayload.session = session
        // Remove user field - API uses session-based authentication only
        delete apiPayload.user
        
        console.log('[notification] createNotification API payload:', apiPayload)
        
        const res = await notificationAPI.createNotification(apiPayload)
        
        console.log('[notification] createNotification API response:', {
          status: res.status,
          data: res.data,
          hasError: !!res.data?.error
        })
        
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

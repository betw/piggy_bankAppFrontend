import { useRouter } from 'vue-router'

function normalizeId(value) {
  if (value === undefined || value === null) return null
  if (typeof value === 'string') {
    const trimmed = value.trim()
    return trimmed.length ? trimmed : null
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value)
  }
  return null
}

export function useGoalNavigation() {
  const router = useRouter()

  function openGoal(id, { fallback = '/' } = {}) {
    const normalized = normalizeId(id)
    if (!normalized) {
      if (fallback) {
        router.push(fallback)
      }
      return
    }
    router.push(`/goal/${normalized}`)
  }

  return {
    openGoal
  }
}
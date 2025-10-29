import { defineStore } from 'pinia'

export const useAppStore = defineStore('app', {
  state: () => ({
    selectedGoalId: null
  }),
  actions: {
    setGoalId(goalId) {
      this.selectedGoalId = goalId
    }
  }
})

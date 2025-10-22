import { defineStore } from 'pinia'

export const useAppStore = defineStore('app', {
  state: () => ({
    currentView: 'Home',
    selectedGoalId: null
  }),
  actions: {
    setView(viewName) {
      this.currentView = viewName
    },
    goToGoalDetail(goalId) {
      this.selectedGoalId = goalId
      this.currentView = 'GoalDetail'
    }
  }
})

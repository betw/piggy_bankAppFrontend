import { createRouter, createWebHistory } from 'vue-router'
import HomeView from './views/HomeView.vue'
import AllGoalsView from './views/AllGoalsView.vue'
import NotificationsView from './views/NotificationsView.vue'
import TravelGoalDetailView from './views/TravelGoalDetailView.vue'
import LoginView from './views/LoginView.vue'

const routes = [
  { path: '/', name: 'Home', component: HomeView },
  { path: '/goals', name: 'AllGoals', component: AllGoalsView },
  { path: '/notifications', name: 'Notifications', component: NotificationsView },
  { path: '/goal/:id', name: 'GoalDetail', component: TravelGoalDetailView, props: true },
  { path: '/login', name: 'Login', component: LoginView },
  { path: '/:pathMatch(.*)*', redirect: '/' }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router

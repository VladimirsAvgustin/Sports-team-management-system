import { createRouter, createWebHistory } from "vue-router";
import HomePage from "../views/HomePage.vue";
import AboutPage from "../views/AboutPage.vue";
import ContactPage from "../views/ContactPage.vue";
import RegisterPage from "../views/RegisterPage.vue";
import ServicesPage from "../views/ServicesPage.vue";
import ProfilePage from '../views/ProfilePage.vue'
import CreateTeam  from "../views/CreateTeam.vue";
import TeamDashboard from "../views/TeamDashboard.vue";
import TeamPlayers from "../views/TeamPlayers.vue";
import TeamStatistics from "../views/TeamStatistics.vue";
import TeamSchedule from "../views/TeamSchedule.vue";
import AdminPage from "../views/AdminPage.vue";
import ChatPage from "../views/ChatPage.vue";
import ForgotPasswordPage from "../views/ForgotPasswordPage.vue";
import ResetPasswordPage from "../views/ResetPasswordPage.vue";
import { useAuthStore } from "../stores/auth";

const routes = [
  { path: "/", component: HomePage },
  { path: "/about", component: AboutPage },
  { path: "/contact", component: ContactPage },
  { path: "/register", component: RegisterPage, meta: { guestOnly: true } },
  { path: "/forgot-password", component: ForgotPasswordPage },
  { path: "/reset-password", component: ResetPasswordPage },
  { path: "/services/:type", component: ServicesPage },
  { path: "/create-team", component: CreateTeam },
  { path: '/profile', component: ProfilePage },
  { path: '/team/:id', name:'TeamPage', component: TeamDashboard },
  { path: '/team/:id/overview', redirect: to => `/team/${to.params.id}` },
  { path: '/team/:id/players', name: 'TeamPlayers', component: TeamPlayers, meta: { requiresAuth: true } },
  { path: '/team/:id/statistics', name: 'TeamStatistics', component: TeamStatistics, meta: { requiresAuth: true } },
  { path: '/team/:id/settings', redirect: to => `/team/${to.params.id}` },
  {path: '/team-schedule/:id', name: 'TeamSchedule', component: () => import('@/views/TeamSchedule.vue')},
  {path: '/teams/:teamId/schedule', component: TeamSchedule},
  { path: '/admin', name: 'AdminPage', component: AdminPage, meta: { requiresAuth: true, requiresAdmin: true } },
  {path: '/chat', component: ChatPage, meta: { requiresAuth: true }},
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

// Add navigation guard for authentication
router.beforeEach(async (to, from, next) => {
  const authStore = useAuthStore()
  const requiresAuth = to.matched.some(record => record.meta.requiresAuth)
  const requiresAdmin = to.matched.some(record => record.meta.requiresAdmin)
  const guestOnly = to.matched.some(record => record.meta.guestOnly)

  if (authStore.token && !authStore.user) {
    await authStore.fetchUser()
  }

  if (guestOnly && authStore.isAuthenticated) {
    next('/')
  } else if (requiresAuth && !authStore.isAuthenticated) {
    // Redirect to home if trying to access protected route without auth
    next('/')
  } else if (requiresAdmin && (authStore.user?.role || '').toLowerCase() !== 'admin') {
    next('/')
  } else {
    next()
  }
})

export default router;

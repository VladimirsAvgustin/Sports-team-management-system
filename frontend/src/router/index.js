import { createRouter, createWebHistory } from "vue-router";
import HomePage from "../views/HomePage.vue";
import AboutPage from "../views/AboutPage.vue";
import ContactPage from "../views/ContactPage.vue";
import RegisterPage from "../views/RegisterPage.vue";
import ServicesPage from "../views/ServicesPage.vue";
import ProfilePage from '../views/ProfilePage.vue'
import CreateTeam  from "../views/CreateTeam.vue";
import TeamPage from "../views/TeamPage.vue";
import TeamSchedule from "../views/TeamSchedule.vue";
import AdminPage from "../views/AdminPage.vue";
import ChatPage from "../views/ChatPage.vue";
import { useAuthStore } from "../stores/auth";

const routes = [
  { path: "/", component: HomePage },
  { path: "/about", component: AboutPage },
  { path: "/contact", component: ContactPage },
  { path: "/register", component: RegisterPage },
  { path: "/services/:type", component: ServicesPage },
  { path: "/create-team", component: CreateTeam },
  { path: '/profile', component: ProfilePage },
  { path: '/team/:id', name:'TeamPage', component: TeamPage },
  {path: '/team-schedule/:id', name: 'TeamSchedule', component: () => import('@/views/TeamSchedule.vue')},
  {path: '/teams/:teamId/schedule', component: TeamSchedule},
  {path: '/team/:id', name: 'TeamPage', component: () => import('../views/TeamPage.vue'), meta: { requiresAuth: true }},
  {path: '/admin', component: AdminPage },
  {path: '/chat', component: ChatPage, meta: { requiresAuth: true }},
    

];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

// Add navigation guard for authentication
router.beforeEach((to, from, next) => {
  const authStore = useAuthStore()
  const requiresAuth = to.matched.some(record => record.meta.requiresAuth)
  
  if (requiresAuth && !authStore.isAuthenticated) {
    // Redirect to home if trying to access protected route without auth
    next('/')
  } else {
    next()
  }
})

export default router;

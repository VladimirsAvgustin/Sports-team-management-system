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
const routes = [
  { path: "/", component: () => import("../views/HomePage.vue") },
  { path: "/about", component: AboutPage },
  { path: "/contact", component: ContactPage },
  { path: "/register", component: RegisterPage },
  { path: "/services/:type", component: ServicesPage },
  { path: "/create-team", component: CreateTeam },
  { path: '/profile', component: ProfilePage },
  { path: '/team/:id', name:'TeamPage', component: TeamPage },
  {path: '/team-schedule/:id', name: 'TeamSchedule', component: () => import('@/views/TeamSchedule.vue')},
  {path: '/teams/:teamId/schedule', component: TeamSchedule}
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

export default router;

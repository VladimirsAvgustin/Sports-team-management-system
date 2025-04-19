import { createRouter, createWebHistory } from "vue-router";
import HomePage from "../views/HomePage.vue";
import AboutPage from "../views/AboutPage.vue";
import ContactPage from "../views/ContactPage.vue";
import RegisterPage from "../views/RegisterPage.vue";
import ServicesPage from "../views/ServicesPage.vue";

const routes = [
  { path: "/", component: HomePage },
  { path: "/about", component: AboutPage },
  { path: "/contact", component: ContactPage },
  { path: "/register", component: RegisterPage },
  { path: "/services/:type", component: ServicesPage }
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

export default router;

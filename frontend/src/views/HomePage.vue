
<template>
  <main>
    <h1>Welcome to TeamFlow</h1>
    <h2>Manage Your Team Effectively</h2>
    <p>
      TeamFlow allows you to organize schedules, track player statistics,
      and communicate with your team in one platform.
    </p>
     <!-- <img :src="logo" alt="Sports Logo" class="logo" /> -->

     <div class="card-container">
  <div class="card" id="card1">
    <img :src="loginImage" alt="Login" />
    <h3>Login</h3>
    <p>Sign in to your account to access team information and manage schedules.</p>
    <button class="btn login-btn" @click="showLoginModal">Login</button>
  </div>

  <div class="card">
    <img :src="scheduleImage" alt="Schedule" />
    <h3>Team Schedule</h3>
    <p>View and manage training sessions and match schedules easily.</p>
  </div>

  <div class="card">
    <img :src="registrationImage" alt="Registration" />
    <h3>Registration</h3>
    <p>Register your team and players to get started with TeamFlow.</p>
    <button class="btn registration-btn" @click="goToRegistration">Registration</button>
  </div>
</div>

  </main>



  <aside>
    <h3>Related Articles</h3>
    <ul>
      <li><a href="#">How to manage a sports team</a></li>
      <li><a href="#">Benefits of team collaboration</a></li>
      <li><a href="#">Tips for organizing schedules</a></li>
    </ul>
  </aside>

  <footer>
    <p>&copy; 2025 TeamFlow. All rights reserved.</p>
    <ul class="footer-links">
      <li><a href="#">Privacy Policy</a></li>
      <li><a href="#">Terms of Service</a></li>
      <li><a href="#">Contact Us</a></li>
    </ul>
  </footer>
</template>

<script>
import logo from '@/assets/sport_system_logo.png';
import loginImage from '@/assets/login_image.png';
import scheduleImage from '@/assets/schedule.png';
import registrationImage from '@/assets/registration.png';
import LoginModal from '@/components/LoginModal.vue';



export default {
  name: 'HomePage',
  components: {
    LoginModal,
  },
  data() {
    return {
      logo,
      loginImage,
      scheduleImage,
      registrationImage,
      showModal: false,
      username: '',
      password: '',
    };
  },
  methods: {
    showLoginModal() {
      this.showModal = true;
    },
    submitLogin() {
      console.log('Login attempted:', this.username);
      this.showModal = false;
    },
    closeModal() {
      this.showModal = false;
    },
    goToRegistration() {
      this.$router.push('/register');
    },
  },
};
</script>
<style>
/* General Reset */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
  font-family: 'Arial', sans-serif;
}

/* Body */
body {
  background-color: #f4f4f4;
  color: #333;
  transition: background 0.3s, color 0.3s;
}

/* Dark Mode */
.dark-mode body {
  background-color: #222;
  color: #f4f4f4;
}

/* Main Section */
main {
  text-align: center;
  padding: 50px 20px;
}

main h1 {
  font-size: 2.5em;
}

main h2 {
  font-size: 1.8em;
  margin: 10px 0;
}

main p {
  font-size: 1.2em;
  margin: 20px 0;
}

/* Logo */
.logo {
  width: 150px;
  height: auto;
  margin: 20px auto;
}

/* Cards */
.card-container {
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
  margin-top: 30px;
}

.card {
  background: white;
  width: 300px;
  padding: 20px;
  margin: 15px;
  border-radius: 10px;
  text-align: center;
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
  transition: transform 0.3s;
}

.card:hover {
  transform: scale(1.05);
}

.card img {
  width: 100%;
  height: 200px;
  object-fit: cover;
  border-radius: 8px;
}

.card h3 {
  margin: 15px 0;
}

.btn {
  background: #0073e6;
  color: white;
  border: none;
  padding: 10px 15px;
  cursor: pointer;
  margin-top: 10px;
  border-radius: 5px;
  transition: background 0.3s;
}

.btn:hover {
  background: #005bb5;
}

/* Dark Mode for Cards */
.dark-mode .card {
  background: #333;
}

.dark-mode .btn {
  background: #ff9800;
}

.dark-mode .btn:hover {
  background: #e68900;
}

.page-layout {
  display: flex; /* Размещаем aside и main в ряд */
  max-width: 1200px;
  margin: 40px auto;
  gap: 40px; /* расстояние между aside и main */
  padding: 0 20px;
}

/* Aside Section */
aside {
  background: #f8f9fa;
  padding: 20px;
  width: 400px;
  border-left: 5px solid #0073e6;
  border-radius: 10px;
  flex-shrink: 0; /* чтобы aside не сжимался */
}

aside h3 {
  font-size: 1.5em;
  margin-bottom: 10px;
}

aside ul {
  list-style: none;
  padding: 0;
}

aside ul li {
  margin-bottom: 10px;
}

aside ul li a {
  color: #0073e6;
  text-decoration: none;
  font-weight: bold;
}

aside ul li a:hover {
  text-decoration: underline;
}

/* Dark Mode for Aside */
.dark-mode aside {
  background: #333;
  border-left: 5px solid #ff9800;
}

.dark-mode aside ul li a {
  color: #ff9800;
}

/* Footer */
footer {
  text-align: center;
  background: #333;
  color: white;
  padding: 20px;
  margin-top: 50px;
}

.footer-links {
  list-style: none;
  margin-top: 10px;
}

.footer-links li {
  display: inline;
  margin: 0 10px;
}

.footer-links li a {
  color: white;
  text-decoration: none;
}

.footer-links li a:hover {
  text-decoration: underline;
}

/* Responsive */
@media (max-width: 768px) {
  .card-container {
    flex-direction: column;
    align-items: center;
  }

  aside {
    width: 90%;
  }
}

/* General Image Styling */
img {
  max-width: 100%;
  height: auto;
  display: block;
  margin: 10px auto;
  transition: transform 0.3s, box-shadow 0.3s;
}

img:hover {
  transform: scale(1.05);
  box-shadow: 0 4px 15px rgba(0, 115, 230, 0.3);
}

/* Dark mode for images */
.dark-mode img {
  filter: brightness(0.85);
}

</style>

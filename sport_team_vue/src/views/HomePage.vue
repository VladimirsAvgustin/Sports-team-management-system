<template>
  <main>
    <h1>Welcome to TeamFlow</h1>
    <h2>Manage Your Team Effectively</h2>
    <p>Organize schedules, track player statistics, and communicate with your team.</p>
    <img src="../assets/sport_system_logo.png" alt="Sports Logo">
    
    <div class="card-container">
      <div class="card">
        <img src="../assets/login_image.png" alt="Login">
        <h3>Login</h3>
        <p>Sign in to access team information.</p>
        <button class="btn" @click="$emit('show-login')">Login</button>
      </div>
      <div class="card">
        <img src="../assets/schedule.png" alt="Schedule">
        <h3>Team Schedule</h3>
        <p>Manage training and match schedules.</p>
      </div>
      <div class="card">
        <img src="../assets/registration.png" alt="Registration">
        <h3>Registration</h3>
        <p>Register your team and players.</p>
        <router-link to="/register" class="btn">Register</router-link>
      </div>
    </div>
  </main>
</template>

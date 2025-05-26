<script setup>
import { useAuthStore } from '@/stores/auth'
import { useRouter } from 'vue-router'
const auth = useAuthStore()
</script>

<template>
  <div class="user-container">
    <div class="user-card">
      <h1>Welcome, {{ auth.user.username }}!</h1>

      <button class="logout-btn" @click="auth.logout()">Logout</button>
    </div>
  </div>
</template>

<style scoped>
.user-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 80vh;
  
  padding: 20px;
}

.user-card {
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  padding: 30px;
  max-width: 400px;
  width: 100%;
  text-align: center;
  transition: transform 0.2s;
}

.user-card:hover {
  transform: translateY(-3px);
}

h1 {
  margin-bottom: 10px;
  font-size: 1.8rem;
}


.logout-btn {
  padding: 10px 20px;
  font-size: 1rem;
  background-color: #ff4d4f;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: background-color 0.3s ease;
}

.logout-btn:hover {
  background-color: #d9363e;
}
</style>

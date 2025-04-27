<script setup>
import { useAuthStore } from '@/stores/auth'
const auth = useAuthStore()
</script>

<template>
  <div>
    <h1>Welcome, {{ auth.user.username }}!</h1>
    <p>Email{{ auth.user.email }}</p>
    <button @click="auth.logout()">Logout</button>
  </div>
</template>
<!-- frontend/src/components/LoginModal.vue -->
<template>
  <div class="modal" @click.self="closeModal">
    <div class="modal-content">
      <span class="close-btn" @click="closeModal">&times;</span>
      <h2>Login</h2>
      <form @submit.prevent="submit">
        <label for="username">Username:</label>
        <input v-model="username" type="text" id="username" required />

        <label for="password">Password:</label>
        <input v-model="password" type="password" id="password" required />

        <button type="submit" class="btn">Login</button>
        
        <p v-if="errorMessage" style="color:red;">{{ errorMessage }}</p>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

// объявляем, какие события эмитим наружу
const emit = defineEmits(['close','login'])

const username = ref('')
const password = ref('')
const errorMessage = ref('')

// просто эмитим наверх, App.vue поймает 'login' и запустит auth.login(...)
function submit() {
  if (!username.value || !password.value) {
    errorMessage.value = 'Поля не должны быть пустыми'
    return
  }
  emit('login', username.value, password.value)
}

// крестик и клик по оверлейю
function closeModal() {
  emit('close')
}
</script>

<style scoped>
.modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0,0,0,0.6);
  display: flex;
  justify-content: center;
  align-items: center;
}
.modal-content {
  background: white;
  padding: 20px;
  border-radius: 10px;
  width: 350px;
  position: relative;
}
.close-btn {
  position: absolute;
  top: 10px;
  right: 10px;
  cursor: pointer;
  font-size: 24px;
}
</style>

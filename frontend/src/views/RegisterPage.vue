<template>
  <div class="register-page">
    <h1>Регистрация</h1>
    <form @submit.prevent="registerUser">
      <div class="form-group">
        <label for="username">Имя пользователя:</label>
        <input v-model="form.username" type="text" id="username" required />
      </div>

      <div class="form-group">
        <label for="email">Email:</label>
        <input v-model="form.email" type="email" id="email" required />
      </div>

      <div class="form-group">
        <label for="password">Пароль:</label>
        <input v-model="form.password" type="password" id="password" required />
      </div>

      <div class="form-group">
        <label for="role">Роль:</label>
        <select v-model="form.role" id="role" required>
          <option disabled value="">Выберите роль</option>
          <option value="user">Пользователь</option>
          <option value="admin">Администратор</option>
        </select>
      </div>

      <button type="submit">Зарегистрироваться</button>
    </form>

    <div v-if="message" :class="{'success': success, 'error': !success}">
      {{ message }}
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import axios from 'axios'

const form = ref({
  username: '',
  email: '',
  password: '',
  role: ''
})

const message = ref('')
const success = ref(false)

const registerUser = async () => {
  try {
    const response = await axios.post('http://localhost:3000/api/auth/register', form.value)
    message.value = response.data.message
    success.value = true
    form.value = { username: '', email: '', password: '', role: '' }
  } catch (error) {
    message.value = error.response?.data?.error || 'Ошибка при регистрации'
    success.value = false
  }
}
</script>

<style scoped>
.register-page {
  max-width: 400px;
  margin: 2rem auto;
  padding: 2rem;
  border: 1px solid #ddd;
  border-radius: 8px;
}

.form-group {
  margin-bottom: 1rem;
}

input, select {
  width: 100%;
  padding: 0.5rem;
  margin-top: 0.25rem;
}

button {
  padding: 0.75rem;
  width: 100%;
  background-color: #42b983;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.success {
  color: green;
  margin-top: 1rem;
}

.error {
  color: red;
  margin-top: 1rem;
}
</style>

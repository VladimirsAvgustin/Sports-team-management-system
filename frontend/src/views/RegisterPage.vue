<!-- RegisterPage.vue -->
<template>
  <div class="register-container">
    <h2>Регистрация</h2>
    <form @submit.prevent="register">
      <input v-model="name" type="text" placeholder="Имя" required />
      <input v-model="email" type="email" placeholder="Email" required />
      <input v-model="password" type="password" placeholder="Пароль" required />
      <select v-model="role">
        <option value="user">Пользователь</option>
        <option value="admin">Администратор</option>
      </select>
      <button type="submit">Зарегистрироваться</button>
      <p v-if="error" class="error">{{ error }}</p>
    </form>
  </div>
</template>

<script>

export default {
  data() {
    return {
      name: '',
      email: '',
      password: '',
      role: 'user',
      error: ''
    }
  },
  methods: {
    async register() {
      try {
        await axios.post('http://localhost:3000/api/register', {
          name: this.name,
          email: this.email,
          password: this.password,
          role: this.role
        })
        this.$router.push('/login')
      } catch (err) {
        this.error = 'Ошибка регистрации'
      }
    }
  }
}
</script>

<style scoped>
.register-container {
  max-width: 400px;
  margin: auto;
  padding: 20px;
  background: #f4f4f4;
  border-radius: 10px;
}
.error {
  color: red;
  margin-top: 10px;
}
</style>

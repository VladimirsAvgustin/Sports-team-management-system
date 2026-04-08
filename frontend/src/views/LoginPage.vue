<!-- LoginPage.vue -->
<template>
  <div class="login-container">
    <h2>{{ $t('buttons.login') }}</h2>
    <form @submit.prevent="login">
      <input v-model="email" type="email" :placeholder="$t('auth.email')" required />
      <input v-model="password" type="password" :placeholder="$t('auth.password')" required />
      <router-link to="/forgot-password" class="forgot-link">{{ $t('auth.forgotPassword') }}</router-link>
      <button type="submit">{{ $t('buttons.login') }}</button>
      <p v-if="error" class="error">{{ error }}</p>
    </form>
  </div>
</template>

<script>
import axios from 'axios'

export default {
  data() {
    return {
      email: '',
      password: '',
      error: ''
    }
  },
  methods: {
    async login() {
      try {
        const response = await axios.post('http://localhost:3000/api/auth/login', {
          email: this.email,
          password: this.password
        })
        localStorage.setItem('token', response.data.token)
        localStorage.setItem('user', JSON.stringify(response.data.user))
        this.$router.push('/')
      } catch (err) {
        this.error = 'Wrong login or password'
      }
    }
  }
}
</script>

<style scoped>
.login-container {
  max-width: 400px;
  margin: auto;
  padding: 20px;
  background: #f4f4f4;
  border-radius: 10px;
}

.login-container h2,
.login-container label,
.login-container button {
  color: #111827;
}

.login-container input {
  width: 100%;
  padding: 10px 12px;
  margin-bottom: 12px;
  border: 2px solid #9ca3af;
  border-radius: 8px;
  background: #ffffff;
  color: #111827;
}

.login-container input:focus {
  outline: 2px solid #93c5fd;
  outline-offset: 1px;
}

.login-container button {
  width: 100%;
  border: none;
  padding: 10px 12px;
  border-radius: 8px;
  background: #111827;
  color: #ffffff;
  cursor: pointer;
}
.error {
  color: red;
  margin-top: 10px;
}

.forgot-link {
  display: block;
  margin: 8px 0 12px;
  color: #1d4ed8;
  text-decoration: none;
}

.forgot-link:hover {
  text-decoration: underline;
}

:global(html.dark-mode) .login-container,
:global(body.dark-mode) .login-container {
  background: #111827;
  border: 1px solid #374151;
}

:global(html.dark-mode) .login-container h2,
:global(body.dark-mode) .login-container h2 {
  color: #f9fafb;
}

:global(html.dark-mode) .login-container input,
:global(body.dark-mode) .login-container input {
  background: #1f2937;
  color: #f9fafb;
  border-color: #6b7280;
}

:global(html.dark-mode) .login-container input::placeholder,
:global(body.dark-mode) .login-container input::placeholder {
  color: #9ca3af;
}

:global(html.dark-mode) .login-container button,
:global(body.dark-mode) .login-container button {
  background: #2563eb;
  color: #ffffff;
}

:global(html.dark-mode) .login-container button:hover,
:global(body.dark-mode) .login-container button:hover {
  background: #1d4ed8;
}

:global(html.dark-mode) .forgot-link,
:global(body.dark-mode) .forgot-link {
  color: #93c5fd;
}
</style>
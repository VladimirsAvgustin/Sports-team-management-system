<template>
  <div class="register-page">
    <h1>{{ $t('nav.register') }}</h1>
    <form @submit.prevent="registerUser">
      <div class="form-group">
        <label for="name">{{ $t('auth.name') }}:</label>
        <input v-model="form.name" type="text" id="name" required />
      </div>

      <div class="form-group">
        <label for="surname">{{ $t('auth.surname') }}:</label>
        <input v-model="form.surname" type="text" id="surname" required />
      </div>

      <div class="form-group">
        <label for="email">{{ $t('auth.email') }}:</label>
        <input v-model="form.email" type="email" id="email" required />
      </div>

      <div class="form-group">
        <label for="password">{{ $t('auth.password') }}:</label>
        <input v-model="form.password" type="password" id="password" required />
      </div>
      
      <div class="form-group">
        <label for="TeamCode">{{ $t('team.teamCode') }} (optional):</label>
        <input v-model="form.teamCode" type="text" id="teamCode" :disabled="isCoachRole" />
        <small v-if="isCoachRole" class="field-hint">
          Coaches request team access after registration.
        </small>
      </div>

      
      <div class="form-group">
        <label for="role">{{ $t('auth.role') }}:</label>
        <select v-model="form.role" id="role" required>
          <option disabled value="">Choose a role</option>
          <option value="Player">Player</option>
          <option value="Coach">Coach</option>
        </select>
      </div>

      <button type="submit">{{ $t('nav.register') }}</button>
    </form>

    <div v-if="message" :class="{'success': success, 'error': !success}">
      {{ message }}
    </div>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import axios from 'axios'
import { useRouter } from 'vue-router'

const router = useRouter()


const form = ref({
  name: '',
  surname: '',
  email: '',
  password: '',
  role: '',
   teamCode: ''
})

const message = ref('')
const success = ref(false)
const isCoachRole = computed(() => String(form.value.role || '').toLowerCase() === 'coach')

watch(isCoachRole, (nextValue) => {
  if (nextValue) {
    form.value.teamCode = ''
  }
})

const registerUser = async () => {
  try {
    const response = await axios.post('/api/auth/register', form.value)
    message.value = response.data.message
    success.value = true
    form.value = { name: '', surname: '', email: '', password: '', role: '', teamCode: '' }
    setTimeout(() => {
      router.push('/') 
    }, 1000)
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

.field-hint {
  display: block;
  margin-top: 0.5rem;
  color: #5f6c7b;
  font-size: 0.9rem;
}
</style>

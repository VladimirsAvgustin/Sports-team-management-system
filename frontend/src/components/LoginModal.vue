<!-- frontend/src/components/LoginModal.vue -->
<template>
  <div class="modal" @click.self="closeModal">
    <div class="modal-content">
      <span class="close-btn" @click="closeModal">&times;</span>
      <h2>{{ $t('buttons.login') }}</h2>
      <form @submit.prevent="submit">
        <label for="email">{{ $t('auth.email') }}:</label>
        <input v-model="email" type="email" id="email" required />

        <label for="password">{{ $t('auth.password') }}:</label>
        <input v-model="password" type="password" id="password" required />

        <router-link to="/forgot-password" class="forgot-link" @click="closeModal">{{ $t('auth.forgotPassword') }}</router-link>

        <button type="submit" class="btn">{{ $t('buttons.login') }}</button>
        
        <p v-if="errorMessage" style="color:red;">{{ errorMessage }}</p>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

// объявляем, какие события эмитим наружу
const emit = defineEmits(['close','login'])

const email = ref('')
const password = ref('')
const errorMessage = ref('')

// просто эмитим наверх, App.vue поймает 'login' и запустит auth.login(...)
function submit() {
  if (!email.value || !password.value) {
    errorMessage.value = t('messages.fieldsRequired')
    return
  }
  emit('login', email.value, password.value)
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

.modal-content h2,
.modal-content label {
  color: #111827;
}

.modal-content input {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  margin-bottom: 12px;
  background: #ffffff;
  color: #111827;
}

.modal-content input:focus {
  outline: 2px solid #93c5fd;
  outline-offset: 1px;
}
.close-btn {
  position: absolute;
  top: 10px;
  right: 10px;
  cursor: pointer;
  font-size: 24px;
}

.forgot-link {
  display: inline-block;
  margin-top: 10px;
  color: #1d4ed8;
  font-size: 14px;
  text-decoration: none;
}

.forgot-link:hover {
  text-decoration: underline;
}

.btn {
  transition: background-color 0.2s ease;
  width: 100%;
  padding: 10px 12px;
  border: 0;
  border-radius: 8px;
  background: #111827;
  color: #fff;
  cursor: pointer;
}

.btn:hover {
  transform: none;
}

:global(.dark-mode) .modal-content {
  background: #1f2937;
  border: none;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
}

:global(.dark-mode) .modal-content h2 {
  color: #ffffff;
}

:global(.dark-mode) .modal-content label {
  color: #ffffff;
}

:global(.dark-mode) .modal-content input {
  background: #374151;
  color: #ffffff;
  border: none;
  box-shadow: inset 0 0 0 1px rgba(100, 116, 139, 0.05);
}

:global(.dark-mode) .modal-content input:focus {
  outline: none;
  box-shadow: inset 0 0 0 1px rgba(96, 165, 250, 0.15);
}

:global(.dark-mode) .modal-content .btn {
  background: #fbbf24;
  color: #111827;
}

:global(.dark-mode) .modal-content .btn:hover {
  background: #f59e0b;
}

:global(.dark-mode) .forgot-link {
  color: #93c5fd;
}
</style>

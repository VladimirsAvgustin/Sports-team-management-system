<template>
  <div class="modal" @click.self="closeModal">
    <div class="modal-content">
      <span class="close-btn" @click="closeModal">&times;</span>
      <h2>Join a Team</h2>
      <form @submit.prevent="joinTeam">
        <label for="teamCode">Team Code:</label>
        <input
          v-model="teamCode"
          type="text"
          id="teamCode"
          required
          placeholder="Enter code"
        />

        <div class="actions">
          <button type="submit" class="btn">Join</button>
          <button type="button" class="btn cancel" @click="closeModal">Cancel</button>
        </div>

        <p v-if="error" class="error">{{ error }}</p>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const emit = defineEmits(['close', 'join'])

const teamCode = ref('')
const error = ref('')

function joinTeam() {
  if (!teamCode.value.trim()) {
    error.value = 'Please enter a team code.'
    return
  }
  emit('join', teamCode.value.trim())
}

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
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 2000;
}

.modal-content {
  background: white;
  padding: 20px 24px;
  border-radius: 10px;
  width: 360px;
  position: relative;
}

.close-btn {
  position: absolute;
  top: 10px;
  right: 14px;
  cursor: pointer;
  font-size: 22px;
}

input {
  width: 100%;
  padding: 8px;
  margin-top: 6px;
  margin-bottom: 16px;
  border: 1px solid #ccc;
  border-radius: 6px;
  font-size: 1rem;
}

.actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.btn {
  padding: 8px 16px;
  border: none;
  border-radius: 6px;
  background: #007bff;
  color: white;
  cursor: pointer;
  transition: background 0.2s ease;
}

.btn:hover {
  background: #0056b3;
}

.btn.cancel {
  background: #aaa;
}

.btn.cancel:hover {
  background: #888;
}

.error {
  margin-top: 10px;
  color: red;
}
</style>

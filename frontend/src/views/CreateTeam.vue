<template>
  <div class="create-team-page">
    <h1>Create a New Team</h1>
    <form @submit.prevent="createTeam">
      <div class="form-group">
        <label for="name">Team Name:</label>
        <input type="text" id="name" v-model="teamName" required />
      </div>

      <div class="form-group">
        <label for="teamCode">Team Code (auto-generated):</label>
        <input type="text" id="teamCode" v-model="teamCode" readonly />
      </div>

      <button type="submit" class="btn">Create Team</button>
    </form>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import axios from 'axios'
import { useAuthStore } from '@/stores/auth'
import { useRouter } from 'vue-router'

const auth = useAuthStore()
const router = useRouter()

const teamName = ref('')
const teamCode = ref('')

// Генерация случайного кода
function generateTeamCode() {
  const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let code = ''
  for (let i = 0; i < 6; i++) {
    code += charset.charAt(Math.floor(Math.random() * charset.length))
  }
  teamCode.value = code
}

// Создать команду
async function createTeam() {
  if (!auth.token) {
    alert('You must be logged in as a coach.')
    return
  }

  try {
    const response = await axios.post(
      '/api/auth/teams',
      {
        name: teamName.value,
        teamCode: teamCode.value,
      },
      {
        headers: { Authorization: `Bearer ${auth.token}` }
      }
    )

    // Обновим данные пользователя (чтобы получить team_id)
    await auth.fetchUser()

    alert('Team successfully created!')
    // Перейти на страницу команды
    const newTeam = response.data.team
    router.push(`/team/${newTeam.id}`)
  } catch (error) {
    console.error(error)
    alert('Error while creating the team: ' + (error.response?.data.error || error.message))
  }
}

onMounted(() => generateTeamCode())
</script>

<style scoped>
.create-team-page {
  max-width: 500px;
  margin: 50px auto;
  background: var(--background-color);
  padding: 30px;
  border-radius: 12px;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
  color: var(--text-color);
}

h1 {
  margin-bottom: 20px;
  text-align: center;
  color: var(--primary-color);
}

.form-group {
  margin-bottom: 20px;
}

label {
  display: block;
  margin-bottom: 8px;
  font-weight: bold;
}

input[type="text"] {
  width: 100%;
  padding: 10px;
  border: 1px solid var(--primary-color);
  border-radius: 8px;
  background-color: var(--background-color);
  color: var(--text-color);
}

input[type="text"]:read-only {
  background-color: #f0f0f0;
}

.btn {
  background: var(--button-color);
  color: white;
  padding: 12px 20px;
  border: none;
  width: 100%;
  font-size: 16px;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.3s;
}

.btn:hover {
  background: var(--primary-color);
}

/* Dark mode support */
.dark-mode .create-team-page {
  background: #333;
}

.dark-mode input[type="text"] {
  background: #444;
  border-color: #ff9800;
  color: white;
}

.dark-mode input[type="text"]:read-only {
  background-color: #555;
}

.dark-mode .btn {
  background: #ff9800;
}

.dark-mode .btn:hover {
  background: #e68900;
}
</style>
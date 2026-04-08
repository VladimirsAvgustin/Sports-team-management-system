<template>
  <div class="admin-container">
    <h1>{{ $t('admin.title') }}</h1>

    <div class="filters">
      <input
        v-model="searchQuery"
        type="text"
        :placeholder="$t('admin.searchPlaceholder')"
      />

      <select v-model="selectedRole">
        <option value="">{{ $t('admin.allRoles') }}</option>
        <option value="Admin">{{ $t('admin.admin') }}</option>
        <option value="Coach">{{ $t('admin.coach') }}</option>
        <option value="Player">{{ $t('admin.player') }}</option>
      </select>
    </div>

    <div v-if="loading" class="loading">{{ $t('admin.loading') }}</div>

    <table v-else class="users-table">
      <thead>
        <tr>
          <th>{{ $t('admin.id') }}</th>
          <th>{{ $t('admin.name') }}</th>
          <th>{{ $t('admin.surname') }}</th>
          <th>{{ $t('admin.email') }}</th>
          <th>{{ $t('admin.role') }}</th>
          <th>{{ $t('admin.teamId') }}</th>
          <th>{{ $t('admin.actions') }}</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="user in filteredUsers" :key="user.id">
          <td>{{ user.id }}</td>
          <td>
            <input v-model="user.name" @change="updateUser(user)" />
          </td>
          <td>
            <input v-model="user.surname" @change="updateUser(user)" />
          </td>
          <td>
            <input v-model="user.email" @change="updateUser(user)" />
          </td>
          <td>
            <select v-model="user.role" @change="updateUser(user)">
              <option value="Admin">{{ $t('admin.admin') }}</option>
              <option value="Coach">{{ $t('admin.coach') }}</option>
              <option value="Player">{{ $t('admin.player') }}</option>
            </select>
          </td>
          <td>
            <input type="number" v-model.number="user.team_id" @change="updateUser(user)" />
          </td>
          <td>
            <button class="btn btn-delete" @click="deleteUser(user.id)">{{ $t('admin.delete') }}</button>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import axios from 'axios'
import { useAuthStore } from '@/stores/auth'
import { useRouter } from 'vue-router'

const { t } = useI18n()
const authStore = useAuthStore()
const router = useRouter()

const users = ref([])
const loading = ref(true)
const searchQuery = ref('')
const selectedRole = ref('')

const getAuthConfig = () => ({
  headers: {
    Authorization: `Bearer ${authStore.token}`
  },
  withCredentials: true
})

const fetchUsers = async () => {
  try {
    const res = await axios.get('/api/admin/users', getAuthConfig())
    users.value = res.data.users
  } catch (err) {
    console.error('Error loading users:', err)
  } finally {
    loading.value = false
  }
}

const updateUser = async (user) => {
  try {
    await axios.put(`/api/admin/users/${user.id}`, user, getAuthConfig())
  } catch (err) {
    console.error('Error updating user:', err)
  }
}

const deleteUser = async (userId) => {
  if (!confirm(t('admin.deleteConfirm'))) return
  try {
    await axios.delete(`/api/admin/users/${userId}`, getAuthConfig())
    users.value = users.value.filter(u => u.id !== userId)
  } catch (err) {
    console.error(t('admin.errorDeleting'), err)
  }
}

onMounted(async () => {
  if ((authStore.user?.role || '').toLowerCase() !== 'admin') {
    router.push('/')
  } else {
    await fetchUsers()
  }
})

// Computed filtered list
const filteredUsers = computed(() => {
  return users.value.filter(user => {
    const matchesSearch =
      ((user.name || '') + ' ' + (user.surname || '')).toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.value.toLowerCase())

    const matchesRole = selectedRole.value
      ? user.role.toLowerCase() === selectedRole.value.toLowerCase()
      : true

    return matchesSearch && matchesRole
  })
})
</script>

<style scoped>
.admin-container {
  max-width: 1000px;
  margin: auto;
  padding: 20px;
  background-color: var(--background-color);
  color: var(--text-color);
  border-radius: 8px;
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
}

.filters {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 20px;
}

.filters input,
.filters select {
  flex: 1;
  padding: 8px;
  border-radius: 4px;
  border: 1px solid var(--text-color);
  background-color: transparent;
  color: var(--text-color);
}

.filters input:focus,
.filters select:focus {
  outline: none;
  border-color: var(--primary-color);
}

.users-table {
  width: 100%;
  border-collapse: collapse;
}

.users-table th,
.users-table td {
  border: 1px solid var(--text-color);
  padding: 8px;
}

.users-table input,
.users-table select {
  width: 100%;
  padding: 6px;
  border: 1px solid var(--text-color);
  background-color: transparent;
  color: var(--text-color);
  border-radius: 4px;
}
.dark-mode select option {
  background-color: #2d2d2d;
  color: #ffffff;
}
.users-table input:focus,
.users-table select:focus {
  outline: none;
  border-color: var(--primary-color);
}

button.btn-delete {
  padding: 5px 10px;
  background-color: var(--primary-color);
  color: white;
  border: none;
  cursor: pointer;
  border-radius: 4px;
  transition: background-color 0.3s;
}

button.btn-delete:hover {
  background-color: var(--button-color);
}

.loading {
  text-align: center;
  font-size: 18px;
  padding: 20px;
}
</style>

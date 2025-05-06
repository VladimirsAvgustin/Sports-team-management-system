<!-- src/pages/TeamPage.vue -->
<script setup>
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import axios from 'axios'

const route = useRoute()
const teamId = route.params.id

const team = ref(null)
const players = ref([])

onMounted(async () => {
  try {
    const { data } = await axios.get(`http://localhost:3000/api/teams/${teamId}`)
    team.value = data.team
    players.value = data.players
  } catch (err) {
    console.error('Ошибка загрузки данных команды:', err)
  }
})
</script>

<template>
  <div>
    <h1>Team: {{ team?.name }}</h1>
    <h2>Player Statistics</h2>
    <table v-if="players.length">
      <thead>
        <tr>
          <th>Name</th>
          <th>Matches</th>
          <th>Goals</th>
          <th>Assists</th>
          <th>Yellow Cards</th>
          <th>Red Cards</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="player in players" :key="player.id">
          <td>{{ player.name }}</td>
          <td>{{ player.matches }}</td>
          <td>{{ player.goals }}</td>
          <td>{{ player.assists }}</td>
          <td>{{ player.yellowCards }}</td>
          <td>{{ player.redCards }}</td>
        </tr>
      </tbody>
    </table>
    <p v-else>No players found.</p>
  </div>
</template>

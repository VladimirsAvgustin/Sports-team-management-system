<template>
  <div class="schedule-container">
    <!-- Header with navigation -->
    <div class="schedule-header">
      <h1>Team Schedule</h1>
      <div class="view-options">
        <button @click="viewMode = 'week'" :class="{ active: viewMode === 'week' }">Week</button>
        <button @click="viewMode = 'list'" :class="{ active: viewMode === 'list' }">List</button>
      </div>
    </div>

    <!-- Quick event addition -->
    <div v-if="userRole === 'Coach'" class="quick-add-form">
      <input v-model="quickAddText" placeholder="Add event (e.g.: Practice tomorrow at 18:00)" />
      <button @click="parseAndAddEvent">+</button>
    </div>

    <!-- Week view -->
    <div v-if="viewMode === 'week'" class="week-view">
      <div class="week-navigation">
        <button @click="changeWeek(-1)">← Previous</button>
        <h2>{{ currentWeekRange }}</h2>
        <button @click="changeWeek(1)">Next →</button>
      </div>

      <div class="calendar-grid">
        <div v-for="day in daysOfWeek" :key="day.date" class="day-column" :class="{ 'today': day.isToday }">
          <div class="day-header">
            <div class="day-name">{{ day.dayName }}</div>
            <div class="day-date">{{ day.date.format('D MMM') }}</div>
          </div>
          
          <div class="day-events">
            <div 
              v-for="event in day.events" 
              :key="event.id" 
              class="event-item"
              :class="event.event_type"
              @click="selectEvent(event)"
            >
              <div class="event-time">{{ event.event_time }}</div>
              <div class="event-main">
                <div class="event-title">{{ event.event_name }}</div>
                <div class="event-location">{{ event.location }}</div>
              </div>
            </div>
            
            <div 
              v-if="userRole === 'Coach'" 
              class="add-event-btn"
              @click="openAddModal(day.date.format('YYYY-MM-DD'))"
            >
              + Add Event
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- List view -->
    <div v-if="viewMode === 'list'" class="list-view">
      <div class="list-filters">
        <select v-model="typeFilter">
          <option value="">All Types</option>
          <option value="practice">Practices</option>
          <option value="game">Games</option>
          <option value="meeting">Meetings</option>
        </select>
        <input v-model="searchQuery" placeholder="Search events..." />
      </div>
      
      <div class="events-list">
        <div 
          v-for="event in filteredEvents" 
          :key="event.id" 
          class="list-event-item"
          :class="event.event_type"
        >
          <div class="event-date">
            <div class="event-day">{{ dayjs(event.event_date).format('ddd') }}</div>
            <div class="event-full-date">{{ dayjs(event.event_date).format('D MMM') }}</div>
          </div>
          
          <div class="event-details">
            <div class="event-time-type">
              <span class="time">{{ event.event_time }}</span>
              <span class="type-badge">{{ event.event_type }}</span>
            </div>
            <div class="event-title">{{ event.event_name }}</div>
            <div class="event-location">{{ event.location }}</div>
          </div>
          
          <div v-if="userRole === 'Coach'" class="event-actions">
            <button @click.stop="startEdit(event)">✏️</button>
            <button @click.stop="deleteEvent(event)" class="delete">🗑️</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal for adding/editing -->
    <div v-if="showEventModal" class="modal-overlay" @click.self="closeModal">
      <div class="modal-content">
        <h3>{{ modalMode === 'add' ? 'Add Event' : 'Edit Event' }}</h3>
        
        <div class="modal-form">
          <div class="form-row">
            <label>Title</label>
            <input v-model="currentEvent.event_name" placeholder="Practice, Game, etc." />
          </div>
          
          <div class="form-row">
            <label>Date</label>
            <input v-model="currentEvent.event_date" type="date" />
          </div>
          
          <div class="form-row">
            <label>Time</label>
            <input v-model="currentEvent.event_time" type="time" />
          </div>
          
          <div class="form-row">
            <label>Type</label>
            <select v-model="currentEvent.event_type">
              <option value="practice">Practice</option>
              <option value="game">Game</option>
              <option value="meeting">Meeting</option>
              <option value="other">Other</option>
            </select>
          </div>
          
          <div class="form-row">
            <label>Location</label>
            <input v-model="currentEvent.location" placeholder="Where will the event take place?" />
          </div>
          
          <div class="form-actions">
            <button @click="closeModal">Cancel</button>
            <button @click="modalMode === 'add' ? addEvent() : saveEdit()" class="save">
              {{ modalMode === 'add' ? 'Add' : 'Save' }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Event details -->
     <div v-if="selectedEvent" class="event-detail-overlay" @click.self="selectedEvent = null">
      <div class="event-detail-content">
        <button class="close-detail" @click="selectedEvent = null">×</button>
        
        <div class="event-detail-header" :class="selectedEvent.event_type">
          <div class="event-date-time">
            {{ dayjs(selectedEvent.event_date).format('dddd, D MMMM') }} at {{ selectedEvent.event_time }}
          </div>
          <h2>{{ selectedEvent.event_name }}</h2>
          <div class="event-location">📍 {{ selectedEvent.location }}</div>
        </div>
        
        <div class="event-detail-body">
          <div class="detail-section">
            <h3>Description</h3>
            <p>{{ selectedEvent.description || 'No additional description' }}</p>
          </div>
          
          <!-- <div class="detail-section">
            <h3>Participants</h3>
            <div class="attendees-list">
              <div v-for="player in teamPlayers" :key="player.id" class="attendee">
                <div class="attendee-name">{{ player.name }}</div>
                <div class="attendance-status">
                  <span :class="getAttendanceStatus(player.id)">{{ getAttendanceStatus(player.id) }}</span>
                </div>
              </div>
            </div>
          </div> -->
        <!-- </div>
        
        <div v-if="userRole === 'Coach'" class="event-detail-actions">
          <button @click="startEdit(selectedEvent)">Edit</button>
          <button @click="deleteEvent(selectedEvent)" class="delete">Delete</button>
        </div>
      </div>
    </div>
  </div>
  <div v-if="selectedEvent" class="event-detail-overlay" @click.self="selectedEvent = null">
    <div class="event-detail-content"> -->
      <!-- ... rest of event details code ... -->
      
      <!-- <div class="detail-section">
        <h3>Player Attendance</h3>
        <div class="attendance-list">
          <div v-for="player in teamPlayers" :key="player.id" class="attendance-item">
            <label>
              <input 
                type="checkbox" 
                :checked="isPlayerAttending(player.id, selectedEvent.id)"
                @change="toggleAttendance(player.id, selectedEvent.id)"
              />
              {{ player.name }}
            </label>
            <span class="attendance-count" v-if="userRole === 'Coach'">
              Attended: {{ getPlayerAttendanceCount(player.id) }} of {{ totalEventsCount }}
            </span> -->
          </div>
        </div>
      </div> 

      <!-- Coach buttons -->
       <!-- <div v-if="userRole === 'Coach'" class="event-detail-actions">
        <button @click="showStats = true">Team Statistics</button>
        
      </div> -->
    </div> 
  
  <!-- Statistics modal -->
  <div v-if="showStats" class="modal-overlay" @click.self="showStats = false">
    <div class="modal-content stats-modal">
      <h3>Attendance Statistics</h3>
      <table>
        <thead>
          <tr>
            <th>Player</th>
            <th>Attended</th>
            <th>Percentage</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="player in teamPlayers" :key="player.id">
            <td>{{ player.name }}</td>
            <td>{{ getPlayerAttendanceCount(player.id) }} of {{ totalEventsCount }}</td>
            <td>{{ getAttendancePercentage(player.id) }}%</td>
          </tr>
        </tbody>
      </table>
      <button @click="showStats = false">Close</button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import axios from 'axios'
import dayjs from 'dayjs'
import { useAuthStore } from '../stores/auth'

const auth = useAuthStore()
const route = useRoute()
const teamId = ref(route.params.id)
const events = ref([])
const teamPlayers = ref([])
const error = ref(null)
const viewMode = ref('week') // 'week' or 'list'
const typeFilter = ref('')
const searchQuery = ref('')
const currentWeek = ref(dayjs())
const quickAddText = ref('')

// Modals
const showEventModal = ref(false)
const modalMode = ref('add') // 'add' or 'edit'
const currentEvent = ref({
  event_name: '',
  event_date: dayjs().format('YYYY-MM-DD'),
  event_time: '18:00',
  event_type: 'practice',
  location: '',
  description: ''
})
const selectedEvent = ref(null)

// User role
const userRole = computed(() => auth.user?.role || 'player')

// Data loading
const fetchData = async () => {
  try {
    const [eventsRes, playersRes] = await Promise.all([
      axios.get(`/api/teams/${teamId.value}/schedule`),
      axios.get(`/api/teams/${teamId.value}/players`)
    ])
    events.value = eventsRes.data
    teamPlayers.value = playersRes.data
  } catch (err) {
    console.error('Error loading data:', err)
    error.value = 'Failed to load data'
  }
}

// Week view
const daysOfWeek = computed(() => {
  const startOfWeek = currentWeek.value.startOf('week')
  return Array.from({ length: 7 }, (_, i) => {
    const day = startOfWeek.add(i, 'day')
    return {
      date: day,
      dayName: day.format('ddd'),
      isToday: day.isSame(dayjs(), 'day'),
      events: events.value.filter(e => dayjs(e.event_date).isSame(day, 'day'))
    }
  })
})

const currentWeekRange = computed(() => {
  const start = currentWeek.value.startOf('week').format('D MMM')
  const end = currentWeek.value.endOf('week').format('D MMM')
  return `${start} - ${end}`
})

const changeWeek = (weeks) => {
  currentWeek.value = currentWeek.value.add(weeks, 'week')
}

// List view
const filteredEvents = computed(() => {
  let result = [...events.value]
  
  if (typeFilter.value) {
    result = result.filter(e => e.event_type === typeFilter.value)
  }
  
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    result = result.filter(e => 
      e.event_name.toLowerCase().includes(query) || 
      e.location.toLowerCase().includes(query)
    )
  }
  
  return result.sort((a, b) => {
    const dateA = dayjs(`${a.event_date} ${a.event_time}`)
    const dateB = dayjs(`${b.event_date} ${b.event_time}`)
    return dateA - dateB
  })
})

// Event management
const openAddModal = (date) => {
  modalMode.value = 'add'
  currentEvent.value = {
    event_name: '',
    event_date: date || dayjs().format('YYYY-MM-DD'),
    event_time: '18:00',
    event_type: 'practice',
    location: '',
    description: ''
  }
  showEventModal.value = true
}

const selectEvent = (event) => {
  selectedEvent.value = event
}

const closeModal = () => {
  showEventModal.value = false
}

const addEvent = async () => {
  try {
    const res = await axios.post(`/api/teams/${teamId.value}/schedule`, currentEvent.value)
    events.value.push(res.data)
    closeModal()
    quickAddText.value = ''
  } catch (err) {
    console.error(err)
    error.value = 'Error adding event'
  }
}

const startEdit = (event) => {
  modalMode.value = 'edit'
  currentEvent.value = { ...event }
  selectedEvent.value = null
  showEventModal.value = true
}

const saveEdit = async () => {
  try {
    const res = await axios.put(
      `/api/teams/${teamId.value}/schedule/${currentEvent.value.id}`,
      currentEvent.value
    )
    const index = events.value.findIndex(e => e.id === currentEvent.value.id)
    if (index !== -1) {
      events.value[index] = res.data
    }
    closeModal()
  } catch (err) {
    console.error(err)
    error.value = 'Error editing event'
  }
}

const deleteEvent = async (event) => {
  if (!confirm('Are you sure you want to delete this event?')) return
  
  try {
    await axios.delete(`/api/teams/${teamId.value}/schedule/${event.id}`)
    events.value = events.value.filter(e => e.id !== event.id)
    if (selectedEvent.value && selectedEvent.value.id === event.id) {
      selectedEvent.value = null
    }
  } catch (err) {
    console.error(err)
    error.value = 'Error deleting event'
  }
}

// Quick add (simple parsing)
const parseAndAddEvent = () => {
  const text = quickAddText.value.toLowerCase()
  const event = {
    event_name: quickAddText.value.split(' ')[0], // First word as title
    event_date: dayjs().format('YYYY-MM-DD'), // Default today
    event_time: '18:00', // Default
    event_type: text.includes('game') ? 'game' : 'practice',
    location: 'Gym' // Default
  }

  // Simple date parsing
  if (text.includes('tomorrow')) {
    event.event_date = dayjs().add(1, 'day').format('YYYY-MM-DD')
  } else if (text.includes('day after tomorrow')) {
    event.event_date = dayjs().add(2, 'day').format('YYYY-MM-DD')
  }

  // Time parsing
  const timeMatch = text.match(/(\d{1,2}):?(\d{2})?/)
  if (timeMatch) {
    event.event_time = `${timeMatch[1].padStart(2, '0')}:${timeMatch[2] || '00'}`
  }

  currentEvent.value = event
  addEvent()
}

// Attendance status (placeholder)
const getAttendanceStatus = (playerId) => {
  const statuses = ['confirmed', 'not confirmed', 'declined']
  return statuses[Math.floor(Math.random() * statuses.length)]
}

const showStats = ref(false)
const attendances = ref([]) // Attendance records

// Load attendance data
const fetchAttendances = async () => {
  try {
    const res = await axios.get(`/api/teams/${teamId.value}/attendances`)
    attendances.value = res.data
  } catch (err) {
    console.error('Error loading attendance:', err)
  }
}

// Check if player is attending event
const isPlayerAttending = (playerId, eventId) => {
  return attendances.value.some(a => 
    a.player_id === playerId && a.event_id === eventId && a.status === 'attending'
  )
}

// Toggle attendance status
const toggleAttendance = async (playerId, eventId) => {
  const isAttending = isPlayerAttending(playerId, eventId)
  
  try {
    if (isAttending) {
      await axios.delete(`/api/teams/${teamId.value}/attendances`, {
        data: { player_id: playerId, event_id: eventId }
      })
    } else {
      await axios.post(`/api/teams/${teamId.value}/attendances`, {
        player_id: playerId,
        event_id: eventId,
        status: 'attending'
      })
    }
    await fetchAttendances() // Refresh data
  } catch (err) {
    console.error('Error updating attendance:', err)
  }
}

// Statistics methods
const totalEventsCount = computed(() => events.value.length)

const getPlayerAttendanceCount = (playerId) => {
  return attendances.value.filter(a => 
    a.player_id === playerId && a.status === 'attending'
  ).length
}

const getAttendancePercentage = (playerId) => {
  if (totalEventsCount.value === 0) return 0
  return Math.round((getPlayerAttendanceCount(playerId) / totalEventsCount.value) * 100)
}

// Update mounted to load attendance
onMounted(async () => {
  await fetchData()
  await fetchAttendances()
})

onMounted(() => {
  fetchData()
})

</script>

<style scoped>
/* (Styles remain exactly the same as in original, only text content was translated) */
.schedule-container {
  max-width: 100%;
  padding: 20px;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
}

.schedule-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 15px;
  border-bottom: 1px solid #e0e0e0;
}

/* ... rest of the CSS remains identical ... */
</style>

<style scoped>
.schedule-container {
  max-width: 100%;
  padding: 20px;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
}

.schedule-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 15px;
  border-bottom: 1px solid #e0e0e0;
}

h1 {
  margin: 0;
  font-size: 28px;
  color: var(--text-color);
}

.view-options {
  display: flex;
  gap: 10px;
}

.view-options button {
  padding: 8px 16px;
  border: none;
  border-radius: 20px;
  background: #e0e0e0;
  cursor: pointer;
  transition: all 0.2s;
}

.view-options button.active {
  background: var(--primary-color);
  color: white;
}

.quick-add-form {
  display: flex;
  margin-bottom: 20px;
}

.quick-add-form input {
  flex: 1;
  padding: 12px 15px;
  border: 1px solid #ddd;
  border-radius: 8px 0 0 8px;
  font-size: 16px;
}

.quick-add-form button {
  padding: 0 20px;
  background: var(--primary-color);
  color: white;
  border: none;
  border-radius: 0 8px 8px 0;
  cursor: pointer;
  font-size: 20px;
}

/* Недельное представление */
.week-view {
  margin-top: 20px;
}

.week-navigation {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.week-navigation button {
  padding: 8px 15px;
  background: #f0f0f0;
  border: none;
  border-radius: 5px;
  cursor: pointer;
}

.week-navigation h2 {
  margin: 0;
  font-size: 18px;
  color: var(--text-color);
}

.calendar-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 15px;
  min-height: 70vh;
}

.day-column {
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.day-column.today {
  border: 2px solid var(--primary-color);
}

.day-header {
  padding: 12px;
  background: #f8f8f8;
  text-align: center;
  border-bottom: 1px solid #eee;
}

.day-name {
  font-weight: bold;
  font-size: 16px;
  color: var(--text-color);
}

.day-date {
  font-size: 14px;
  color: #666;
}

.day-events {
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.event-item {
  padding: 12px;
  border-radius: 8px;
  cursor: pointer;
  transition: transform 0.2s;
  background: #f9f9f9;
}

.event-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

.event-item.тренировка {
  border-left: 4px solid #4CAF50;
}

.event-item.игра {
  border-left: 4px solid #2196F3;
}

.event-item.собрание {
  border-left: 4px solid #FF9800;
}

.event-time {
  font-size: 12px;
  color: #666;
  margin-bottom: 5px;
}

.event-title {
  font-weight: 600;
  margin-bottom: 3px;
}

.event-location {
  font-size: 12px;
  color: #777;
}

.add-event-btn {
  padding: 10px;
  text-align: center;
  color: var(--primary-color);
  cursor: pointer;
  border: 1px dashed var(--primary-color);
  border-radius: 8px;
  margin-top: 5px;
}

.add-event-btn:hover {
  background: rgba(0, 115, 230, 0.1);
}

/* Списочное представление */
.list-view {
  margin-top: 20px;
}

.list-filters {
  display: flex;
  gap: 15px;
  margin-bottom: 20px;
}

.list-filters select, 
.list-filters input {
  padding: 10px 15px;
  border: 1px solid #ddd;
  border-radius: 8px;
  font-size: 14px;
}

.list-filters input {
  flex: 1;
}

.events-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.list-event-item {
  display: flex;
  background: white;
  border-radius: 10px;
  padding: 15px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.05);
  transition: all 0.2s;
}

.list-event-item:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.list-event-item.тренировка {
  border-left: 5px solid #4CAF50;
}

.list-event-item.игра {
  border-left: 5px solid #2196F3;
}

.list-event-item.собрание {
  border-left: 5px solid #FF9800;
}

.event-date {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-width: 60px;
  padding-right: 15px;
  border-right: 1px solid #eee;
}

.event-day {
  font-weight: bold;
  font-size: 16px;
  color: var(--text-color);
}

.event-full-date {
  font-size: 12px;
  color: #666;
}

.event-details {
  flex: 1;
  padding: 0 15px;
}

.event-time-type {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 5px;
}

.event-time-type .time {
  font-size: 14px;
  color: #666;
}

.type-badge {
  font-size: 12px;
  padding: 2px 8px;
  border-radius: 10px;
  background: #f0f0f0;
  color: #555;
}

.event-title {
  font-weight: 600;
  margin-bottom: 5px;
}

.event-location {
  font-size: 13px;
  color: #777;
}

.event-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.event-actions button {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 16px;
  opacity: 0.7;
  transition: opacity 0.2s;
}

.event-actions button:hover {
  opacity: 1;
}

.event-actions .delete {
  color: #e53935;
}

/* Модальные окна */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  border-radius: 12px;
  width: 90%;
  max-width: 500px;
  padding: 25px;
  box-shadow: 0 5px 20px rgba(0, 0, 0, 0.2);
}

.modal-content h3 {
  margin-top: 0;
  margin-bottom: 20px;
  font-size: 20px;
  color: var(--text-color);
}

.modal-form {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.form-row {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.form-row label {
  font-size: 14px;
  color: #555;
}

.form-row input,
.form-row select {
  padding: 10px 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 14px;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 20px;
}

.form-actions button {
  padding: 8px 16px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
}

.form-actions .save {
  background: var(--primary-color);
  color: white;
}

/* Детали события */
.event-detail-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  padding: 20px;
}

.event-detail-content {
  background: white;
  border-radius: 12px;
  width: 90%;
  max-width: 600px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 5px 20px rgba(0, 0, 0, 0.2);
  position: relative;
}

.close-detail {
  position: absolute;
  top: 15px;
  right: 15px;
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: #666;
}

.event-detail-header {
  padding: 25px;
  color: white;
  border-radius: 12px 12px 0 0;
}

.event-detail-header.тренировка {
  background: #4CAF50;
}

.event-detail-header.игра {
  background: #2196F3;
}

.event-detail-header.собрание {
  background: #FF9800;
}

.event-detail-header h2 {
  margin: 10px 0 5px;
  font-size: 24px;
}

.event-date-time {
  font-size: 14px;
  opacity: 0.9;
}

.event-location {
  font-size: 16px;
}

.event-detail-body {
  padding: 20px;
}

.detail-section {
  margin-bottom: 20px;
}

.detail-section h3 {
  margin-top: 0;
  margin-bottom: 10px;
  font-size: 18px;
  color: var(--text-color);
}

.attendees-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.attendee {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px;
  background: #f9f9f9;
  border-radius: 6px;
}

.attendee-name {
  font-weight: 500;
}

.attendance-status span {
  font-size: 12px;
  padding: 3px 8px;
  border-radius: 10px;
}

.attendance-status span.подтверждено {
  background: #e8f5e9;
  color: #2e7d32;
}

.attendance-status span.не_подтверждено {
  background: #fff8e1;
  color: #ff8f00;
}

.attendance-status span.отклонено {
  background: #ffebee;
  color: #c62828;
}

.event-detail-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 15px 20px;
  border-top: 1px solid #eee;
}

.event-detail-actions button {
  padding: 8px 16px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
}

.event-detail-actions .delete {
  background: #ffebee;
  color: #c62828;
}

/* Темная тема */
.dark-mode .day-column,
.dark-mode .list-event-item,
.dark-mode .modal-content,
.dark-mode .event-detail-content {
  background: #1e1e1e;
  color: #f0f0f0;
}

.dark-mode .day-header {
  background: #2d2d2d;
}

.dark-mode .event-item {
  background: #2d2d2d;
}

.dark-mode .form-row input,
.dark-mode .form-row select,
.dark-mode .list-filters select,
.dark-mode .list-filters input {
  background: #2d2d2d;
  border-color: #444;
  color: #f0f0f0;
}

.dark-mode .attendee {
  background: #2d2d2d;
}

@media (max-width: 768px) {
  .calendar-grid {
    grid-template-columns: 1fr;
  }
  
  .schedule-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 15px;
  }
  
  .list-event-item {
    flex-direction: column;
  }
  
  .event-date {
    flex-direction: row;
    justify-content: flex-start;
    gap: 15px;
    border-right: none;
    border-bottom: 1px solid #eee;
    padding-bottom: 10px;
    margin-bottom: 10px;
  }
  
  .event-actions {
    justify-content: flex-end;
    margin-top: 10px;
  }
}

.attendance-list {
  margin-top: 15px;
}

.attendance-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid #eee;
}

.attendance-count {
  font-size: 12px;
  color: #666;
}

.stats-modal {
  max-width: 800px;
}

.stats-modal table {
  width: 100%;
  border-collapse: collapse;
  margin: 20px 0;
}

.stats-modal th, .stats-modal td {
  padding: 10px;
  text-align: left;
  border-bottom: 1px solid #ddd;
}

.stats-modal th {
  background-color: #f5f5f5;
}

/* Для темной темы */
.dark-mode .stats-modal th {
  background-color: #2d2d2d;
}

.dark-mode .stats-modal th, 
.dark-mode .stats-modal td {
  border-bottom: 1px solid #444;
}
</style>
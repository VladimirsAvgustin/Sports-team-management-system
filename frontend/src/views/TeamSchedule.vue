<template>
  <div class="schedule-container">
    <!-- Header -->
    <div class="schedule-header">
      <div class="header-left">
        <h1>📅 {{ $t('schedule.title') }}</h1>
        <p class="header-subtitle">{{ upcomingCount }} {{ upcomingCount !== 1 ? $t('schedule.upcomingEvents') : $t('schedule.upcomingEvent') }}</p>
      </div>
      <div class="header-actions">
        <button v-if="userRole === 'Coach'" @click="showStats = true; fetchAttendanceStats()" class="header-btn stats-btn">
          📊 {{ $t('schedule.stats') }}
        </button>
        <button v-if="userRole === 'Coach'" @click="openAddModal()" class="header-btn add-btn">
          ＋ {{ $t('schedule.newEvent') }}
        </button>
        <div class="view-toggle">
          <button @click="viewMode = 'week'" :class="{ active: viewMode === 'week' }" :title="$t('schedule.weekView')">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M3 10h18"/><path d="M10 4v18"/></svg>
          </button>
          <button @click="viewMode = 'list'" :class="{ active: viewMode === 'list' }" :title="$t('schedule.listView')">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/></svg>
          </button>
        </div>
      </div>
    </div>

    <!-- Week view -->
    <div v-if="viewMode === 'week'" class="week-view">
      <div class="week-navigation">
        <button @click="changeWeek(-1)" class="nav-btn">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M15 18l-6-6 6-6"/></svg>
        </button>
        <div class="week-title">
          <h2>{{ currentWeekRange }}</h2>
          <button @click="currentWeek = dayjs()" class="today-btn" v-if="!currentWeek.isSame(dayjs(), 'week')">{{ $t('schedule.today') }}</button>
        </div>
        <button @click="changeWeek(1)" class="nav-btn">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M9 18l6-6-6-6"/></svg>
        </button>
      </div>

      <div class="calendar-grid">
        <div v-for="day in daysOfWeek" :key="day.date" class="day-column" :class="{ 'today': day.isToday, 'has-events': day.events.length > 0 }">
          <div class="day-header">
            <div class="day-name">{{ day.dayName }}</div>
            <div class="day-number" :class="{ 'today-number': day.isToday }">{{ day.date.format('D') }}</div>
          </div>
          
          <div class="day-events">
            <div 
              v-for="event in day.events" 
              :key="event.id" 
              class="event-card"
              :class="[event.event_type, { 'past-event': !isEventUpcoming(event) }]"
              @click="selectEvent(event)"
            >
              <div class="event-color-bar"></div>
              <div class="event-card-body">
                <div class="event-card-time">{{ formatTime(event.event_time) }}</div>
                <div class="event-card-title">{{ event.event_name }}</div>
                <div class="event-card-location" v-if="event.location">📍 {{ event.location }}</div>
              </div>
            </div>
            
            <div 
              v-if="userRole === 'Coach'" 
              class="add-event-cell"
              @click="openAddModal(day.date.format('YYYY-MM-DD'))"
            >
              <span>+</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- List view -->
    <div v-if="viewMode === 'list'" class="list-view">
      <div class="list-toolbar">
        <div class="filter-chips">
          <button 
            v-for="filter in eventFilters" 
            :key="filter.value" 
            @click="typeFilter = typeFilter === filter.value ? '' : filter.value"
            :class="['filter-chip', filter.value, { active: typeFilter === filter.value }]"
          >
            {{ filter.icon }} {{ filter.label }}
          </button>
        </div>
        <div class="search-box">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
          <input v-model="searchQuery" :placeholder="$t('schedule.searchEvents')" />
        </div>
      </div>
      
      <div v-if="filteredEvents.length === 0" class="empty-state">
        <div class="empty-icon">📭</div>
        <p>{{ $t('schedule.noEventsFound') }}</p>
      </div>

      <div class="events-list" v-else>
        <template v-for="(group, label) in groupedEvents" :key="label">
          <div class="date-group-label">{{ label }}</div>
          <div 
            v-for="event in group" 
            :key="event.id" 
            class="list-event-card"
            :class="[event.event_type, { 'past-event': !isEventUpcoming(event) }]"
            @click="selectEvent(event)"
          >
            <div class="list-event-color"></div>
            <div class="list-event-time">
              <span class="time-text">{{ formatTime(event.event_time) }}</span>
            </div>
            <div class="list-event-info">
              <div class="list-event-title">{{ event.event_name }}</div>
              <div class="list-event-meta">
                <span v-if="event.location">📍 {{ event.location }}</span>
              </div>
            </div>
            <div class="list-event-badge" :class="event.event_type">
              {{ getEventIcon(event.event_type) }} {{ getEventTypeLabel(event.event_type) }}
            </div>
            <div v-if="userRole === 'Coach'" class="list-event-actions">
              <button @click.stop="startEdit(event)" class="action-icon">✏️</button>
              <button @click.stop="deleteEvent(event)" class="action-icon delete">🗑️</button>
            </div>
          </div>
        </template>
      </div>
    </div>

    <!-- Modal for adding/editing -->
    <div v-if="showEventModal" class="modal-overlay" @click.self="closeModal">
      <div class="modal-content">
        <h3>{{ modalMode === 'add' ? $t('schedule.addEvent') : $t('schedule.editEvent') }}</h3>
        
        <div v-if="error" class="modal-error">{{ error }}</div>
        
        <div class="modal-form">
          <div class="form-row">
            <label>{{ $t('schedule.eventTitle') }}</label>
            <input v-model="currentEvent.event_name" :placeholder="$t('schedule.practice') + ', ' + $t('schedule.game') + ', ' + $t('schedule.other')" />
          </div>
          
          <div class="form-row">
            <label>{{ $t('schedule.eventDate') }}</label>
            <input v-model="currentEvent.event_date" type="date" />
          </div>
          
          <div class="form-row">
            <label>{{ $t('schedule.eventTime') }}</label>
            <input v-model="currentEvent.event_time" type="time" />
          </div>
          
          <div class="form-row">
            <label>{{ $t('schedule.eventType') }}</label>
            <select v-model="currentEvent.event_type">
              <option value="practice">{{ $t('schedule.practice') }}</option>
              <option value="game">{{ $t('schedule.game') }}</option>
              <option value="meeting">{{ $t('schedule.meeting') }}</option>
              <option value="other">{{ $t('schedule.other') }}</option>
            </select>
          </div>
          
          <div class="form-row">
            <label>{{ $t('schedule.eventLocation') }}</label>
            <input v-model="currentEvent.location" :placeholder="$t('schedule.eventLocation') + '?'" />
          </div>
          
          <div class="form-actions">
            <button @click="closeModal">{{ $t('schedule.cancel') }}</button>
            <button @click="modalMode === 'add' ? addEvent() : saveEdit()" class="save">
              {{ modalMode === 'add' ? $t('schedule.add') : $t('schedule.save') }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Event details -->
    <div v-if="selectedEvent" class="event-detail-overlay" @click.self="selectedEvent = null">
      <div class="event-detail-content" :class="selectedEvent.event_type">
        <button class="close-detail" @click="selectedEvent = null">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 6L6 18M6 6l12 12"/>
          </svg>
        </button>
        
        <!-- Type badge -->
        <div class="event-type-badge" :class="selectedEvent.event_type">
          <span class="type-icon">{{ getEventIcon(selectedEvent.event_type) }}</span>
          <span>{{ getEventTypeLabel(selectedEvent.event_type) }}</span>
        </div>
        
        <!-- Main info -->
        <div class="event-detail-main">
          <h2 class="event-title">{{ selectedEvent.event_name }}</h2>
          
          <div class="event-meta-grid">
            <div class="meta-item">
              <div class="meta-icon">📅</div>
              <div class="meta-content">
                <span class="meta-label">{{ $t('schedule.date') }}</span>
                <span class="meta-value">{{ dayjs(selectedEvent.event_date).format('dddd, D MMMM YYYY') }}</span>
              </div>
            </div>
            
            <div class="meta-item">
              <div class="meta-icon">🕐</div>
              <div class="meta-content">
                <span class="meta-label">{{ $t('schedule.time') }}</span>
                <span class="meta-value">{{ selectedEvent.event_time }}</span>
              </div>
            </div>
            
            <div class="meta-item full-width">
              <div class="meta-icon">📍</div>
              <div class="meta-content">
                <span class="meta-label">{{ $t('schedule.location') }}</span>
                <span class="meta-value">{{ selectedEvent.location || $t('schedule.notSpecified') }}</span>
              </div>
            </div>
          </div>
          
          <!-- Countdown or status -->
          <div class="event-countdown" v-if="isEventUpcoming(selectedEvent)">
            <span class="countdown-label">⏳ {{ $t('schedule.startsIn') }}</span>
            <span class="countdown-value">{{ getTimeUntilEvent(selectedEvent) }}</span>
          </div>
          <div class="event-countdown past" v-else>
            <span class="countdown-label">✓ {{ $t('schedule.eventCompleted') }}</span>
          </div>
        </div>
        
        <!-- Player's own attendance (for practices only, before event date) -->
        <div v-if="selectedEvent.event_type === 'practice' && userRole === 'Player' && isEventUpcoming(selectedEvent)" class="attendance-section">
          <h3>📋 {{ $t('schedule.yourResponse') }}</h3>
          <div class="attendance-choice">
            <button 
              @click="setMyAttendance('present')" 
              :class="{ active: myAttendanceStatus === 'present' }"
              class="attend-btn yes"
            >
              <span class="btn-icon">✓</span>
              <span class="btn-text">{{ $t('schedule.illBeThere') }}</span>
            </button>
            <button 
              @click="openDeclineModal()" 
              :class="{ active: myAttendanceStatus === 'absent' || myAttendanceStatus === 'excused' }"
              class="attend-btn no"
            >
              <span class="btn-icon">✗</span>
              <span class="btn-text">{{ $t('schedule.cantMakeIt') }}</span>
            </button>
          </div>
          <div v-if="myAttendanceStatus && myAttendanceStatus !== 'present'" class="my-reason-card">
            <span class="reason-icon">💬</span>
            <span>{{ myAttendanceNotes || $t('schedule.noReasonProvided') }}</span>
          </div>
        </div>

        <!-- Show attendance status if event passed -->
        <div v-if="selectedEvent.event_type === 'practice' && userRole === 'Player' && !isEventUpcoming(selectedEvent)" class="attendance-section past">
          <h3>📋 {{ $t('schedule.yourAttendance') }}</h3>
          <div class="attendance-result" :class="myAttendanceStatus || 'unmarked'">
            <span class="result-icon">{{ getStatusIcon(myAttendanceStatus) }}</span>
            <span class="result-text">{{ getStatusDisplayText(myAttendanceStatus) }}</span>
          </div>
        </div>
        
        <!-- Coach view: all players attendance (for practices) -->
        <div v-if="selectedEvent.event_type === 'practice' && userRole === 'Coach'" class="attendance-section coach">
          <h3>👥 {{ $t('schedule.teamResponses') }}</h3>
          <div class="attendance-stats-bar">
            <div class="stat-segment yes" :style="{ width: getAttendancePercent('present') + '%' }">
              <span v-if="attendanceSummary.present > 0">{{ attendanceSummary.present }}</span>
            </div>
            <div class="stat-segment no" :style="{ width: getAttendancePercent('absent') + '%' }">
              <span v-if="attendanceSummary.absent > 0">{{ attendanceSummary.absent }}</span>
            </div>
            <div class="stat-segment pending" :style="{ width: getAttendancePercent('unmarked') + '%' }">
              <span v-if="attendanceSummary.unmarked > 0">{{ attendanceSummary.unmarked }}</span>
            </div>
          </div>
          <div class="stats-legend">
            <span class="legend-item yes">✓ {{ $t('schedule.attending') }} ({{ attendanceSummary.present }})</span>
            <span class="legend-item no">✗ {{ $t('schedule.cantAttend') }} ({{ attendanceSummary.absent }})</span>
            <span class="legend-item pending">? {{ $t('schedule.noResponse') }} ({{ attendanceSummary.unmarked }})</span>
          </div>
          
          <div class="attendees-grid">
            <div v-for="player in eventAttendanceList" :key="player.user_id" class="attendee-card" :class="player.status || 'unmarked'">
              <div class="attendee-avatar">{{ getInitials(player.username) }}</div>
              <div class="attendee-details">
                <div class="attendee-name">{{ player.username }}</div>
                <div class="attendee-status">{{ getStatusDisplayText(player.status) }}</div>
              </div>
              <div class="status-indicator" :class="player.status || 'unmarked'">
                {{ getStatusIcon(player.status) }}
              </div>
              <div v-if="player.notes" class="attendee-note">
                {{ player.notes }}
              </div>
            </div>
          </div>
        </div>
        
        <!-- Coach buttons -->
        <div v-if="userRole === 'Coach'" class="event-detail-actions">
          <button @click="startEdit(selectedEvent)" class="edit-btn">
            <span>✏️</span> {{ $t('buttons.edit') }}
          </button>
          <button @click="deleteEvent(selectedEvent)" class="delete-btn">
            <span>🗑️</span> {{ $t('buttons.delete') }}
          </button>
        </div>
      </div>
    </div>

    <!-- Decline attendance modal -->
    <div v-if="showDeclineModal" class="modal-overlay" @click.self="showDeclineModal = false">
      <div class="modal-content decline-modal">
        <h3>{{ $t('schedule.whyCantAttend') }}</h3>
        <textarea 
          v-model="declineReason"
          :placeholder="$t('schedule.describeReason')"
          rows="4"
        ></textarea>
        <div class="modal-actions">
          <button @click="showDeclineModal = false" class="modal-btn cancel-btn">{{ $t('buttons.cancel') }}</button>
          <button @click="submitDecline" class="modal-btn confirm-btn" :disabled="!declineReason.trim()">{{ $t('buttons.confirm') }}</button>
        </div>
      </div>
    </div>
    
    <!-- Statistics modal -->
    <div v-if="showStats" class="modal-overlay" @click.self="showStats = false">
      <div class="modal-content stats-modal">
        <h3>📊 {{ $t('schedule.attendanceStats') }}</h3>
        <table>
          <thead>
            <tr>
              <th>{{ $t('schedule.player') }}</th>
              <th>{{ $t('schedule.attended') }}</th>
              <th>{{ $t('schedule.missed') }}</th>
              <th>{{ $t('schedule.rate') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="stat in attendanceStats" :key="stat.user_id">
              <td>
                <div class="player-cell">
                  <div class="player-avatar-sm">{{ getInitials(stat.username) }}</div>
                  {{ stat.username }}
                </div>
              </td>
              <td class="stat-present">{{ stat.present_count }}</td>
              <td class="stat-absent">{{ stat.absent_count }}</td>
              <td>
                <div class="rate-bar">
                  <div class="rate-fill" :style="{ width: stat.attendance_rate + '%' }"></div>
                  <span>{{ stat.attendance_rate }}%</span>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
        <div class="modal-actions">
          <button @click="showStats = false" class="modal-btn cancel-btn">{{ $t('buttons.close') }}</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'
import axios from 'axios'
import dayjs from 'dayjs'
import { useAuthStore } from '../stores/auth'

const { t } = useI18n()
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

// Event type filters for list view
const eventFilters = computed(() => [
  { value: 'practice', label: t('schedule.practice'), icon: '🏃' },
  { value: 'game', label: t('schedule.game'), icon: '⚽' },
  { value: 'meeting', label: t('schedule.meeting'), icon: '📋' },
])

// Upcoming events count
const upcomingCount = computed(() => {
  const now = dayjs()
  return events.value.filter(e => dayjs(`${e.event_date} ${e.event_time}`).isAfter(now)).length
})

// Format time (e.g. "18:00" -> "6:00 PM" or keep 24h)
const formatTime = (time) => {
  if (!time) return ''
  const [h, m] = time.split(':')
  return `${h}:${m}`
}

// Grouped events for list view (by date)
const groupedEvents = computed(() => {
  const groups = {}
  for (const event of filteredEvents.value) {
    const label = dayjs(event.event_date).format('dddd, D MMMM YYYY')
    if (!groups[label]) groups[label] = []
    groups[label].push(event)
  }
  return groups
})

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
  error.value = null
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

const hasTimeConflict = (date, time, excludeId = null) => {
  return events.value.some(e => {
    if (excludeId && e.id === excludeId) return false
    return e.event_date === date && e.event_time === time
  })
}

const addEvent = async () => {
  if (hasTimeConflict(currentEvent.value.event_date, currentEvent.value.event_time)) {
    error.value = 'An event already exists at this date and time'
    return
  }
  try {
    const res = await axios.post(`/api/teams/${teamId.value}/schedule`, currentEvent.value)
    events.value.push(res.data)
    closeModal()
    error.value = null
    quickAddText.value = ''
  } catch (err) {
    console.error(err)
    if (err.response?.data?.error) {
      error.value = err.response.data.error
    } else {
      error.value = 'Error adding event'
    }
  }
}

const startEdit = (event) => {
  modalMode.value = 'edit'
  error.value = null
  currentEvent.value = { ...event }
  selectedEvent.value = null
  showEventModal.value = true
}

const saveEdit = async () => {
  if (hasTimeConflict(currentEvent.value.event_date, currentEvent.value.event_time, currentEvent.value.id)) {
    error.value = 'An event already exists at this date and time'
    return
  }
  try {
    const res = await axios.put(
      `/api/teams/${teamId.value}/schedule/${currentEvent.value.id}`,
      currentEvent.value
    )
    const index = events.value.findIndex(e => e.id === currentEvent.value.id)
    if (index !== -1) {
      events.value[index] = { ...currentEvent.value }
    }
    closeModal()
    error.value = null
  } catch (err) {
    console.error(err)
    if (err.response?.data?.error) {
      error.value = err.response.data.error
    } else {
      error.value = 'Error editing event'
    }
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
const attendanceStats = ref([])
const eventAttendanceList = ref([])

// Decline modal
const showDeclineModal = ref(false)
const declineReason = ref('')

// Current user's attendance for selected event
const myAttendanceStatus = ref(null)
const myAttendanceNotes = ref('')

// Check if event is upcoming (can still RSVP)
const isEventUpcoming = (event) => {
  const eventDateTime = dayjs(`${event.event_date} ${event.event_time}`)
  return eventDateTime.isAfter(dayjs())
}

// Get initials
const getInitials = (name) => {
  if (!name) return '?'
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

// Get event icon
const getEventIcon = (type) => {
  const icons = {
    practice: '🏃',
    game: '⚽',
    meeting: '📋',
    other: '📌'
  }
  return icons[type] || icons.other
}

// Get event type label
const getEventTypeLabel = (type) => {
  const labels = {
    practice: 'Practice',
    game: 'Game',
    meeting: 'Meeting',
    other: 'Event'
  }
  return labels[type] || labels.other
}

// Get time until event
const getTimeUntilEvent = (event) => {
  const eventDateTime = dayjs(`${event.event_date} ${event.event_time}`)
  const now = dayjs()
  const diffDays = eventDateTime.diff(now, 'day')
  const diffHours = eventDateTime.diff(now, 'hour') % 24
  
  if (diffDays > 0) {
    return `${diffDays} day${diffDays > 1 ? 's' : ''}`
  } else if (diffHours > 0) {
    return `${diffHours} hour${diffHours > 1 ? 's' : ''}`
  } else {
    const diffMinutes = eventDateTime.diff(now, 'minute')
    return `${diffMinutes} minute${diffMinutes > 1 ? 's' : ''}`
  }
}

// Status display text
const getStatusDisplayText = (status) => {
  const texts = {
    present: t('schedule.willAttend'),
    absent: t('schedule.cantMakeIt'),
    excused: t('schedule.excused'),
    late: t('schedule.willBeLate'),
    unmarked: t('schedule.noResponse')
  }
  return texts[status] || texts.unmarked
}

// Get status icon
const getStatusIcon = (status) => {
  const icons = {
    present: '✓',
    absent: '✗',
    excused: '✗',
    late: '⏰',
    unmarked: '?'
  }
  return icons[status] || icons.unmarked
}

// Get attendance percentage for the bar
const getAttendancePercent = (type) => {
  const total = eventAttendanceList.value.length
  if (total === 0) return 0
  
  let count = 0
  if (type === 'present') {
    count = attendanceSummary.value.present
  } else if (type === 'absent') {
    count = attendanceSummary.value.absent
  } else {
    count = attendanceSummary.value.unmarked
  }
  
  return Math.round((count / total) * 100)
}

// Fetch attendance for selected event
const fetchEventAttendance = async (eventId) => {
  if (!eventId) return
  
  try {
    const res = await axios.get(`/api/teams/${teamId.value}/events/${eventId}/attendance/full`)
    eventAttendanceList.value = res.data
    
    // Find current user's attendance
    const myAttendance = res.data.find(a => a.user_id === auth.user?.id)
    myAttendanceStatus.value = myAttendance?.status || null
    myAttendanceNotes.value = myAttendance?.notes || ''
  } catch (err) {
    console.error('Error fetching event attendance:', err)
  }
}

// Attendance summary for coaches
const attendanceSummary = computed(() => {
  const present = eventAttendanceList.value.filter(a => a.status === 'present').length
  const absent = eventAttendanceList.value.filter(a => a.status === 'absent' || a.status === 'excused').length
  const unmarked = eventAttendanceList.value.filter(a => !a.status || a.status === 'unmarked').length
  return { present, absent, unmarked }
})

// Set my attendance (for players)
const setMyAttendance = async (status) => {
  if (!selectedEvent.value) return
  
  try {
    await axios.post(`/api/teams/${teamId.value}/events/${selectedEvent.value.id}/attendance`, {
      user_id: auth.user.id,
      status: status,
      notes: null
    })
    myAttendanceStatus.value = status
    myAttendanceNotes.value = ''
    await fetchEventAttendance(selectedEvent.value.id)
  } catch (err) {
    console.error('Error setting attendance:', err)
  }
}

// Open decline modal
const openDeclineModal = () => {
  declineReason.value = ''
  showDeclineModal.value = true
}

// Submit decline
const submitDecline = async () => {
  if (!selectedEvent.value || !declineReason.value.trim()) return
  
  const notes = declineReason.value.trim()
  
  try {
    await axios.post(`/api/teams/${teamId.value}/events/${selectedEvent.value.id}/attendance`, {
      user_id: auth.user.id,
      status: 'excused',
      notes: notes
    })
    myAttendanceStatus.value = 'excused'
    myAttendanceNotes.value = notes
    showDeclineModal.value = false
    await fetchEventAttendance(selectedEvent.value.id)
  } catch (err) {
    console.error('Error setting attendance:', err)
  }
}

// Fetch team attendance stats (practices only)
const fetchAttendanceStats = async () => {
  try {
    const res = await axios.get(`/api/teams/${teamId.value}/attendance/stats`)
    attendanceStats.value = res.data
  } catch (err) {
    console.error('Error fetching attendance stats:', err)
  }
}

// Watch for selected event changes
import { watch } from 'vue'
watch(selectedEvent, (newEvent) => {
  if (newEvent) {
    fetchEventAttendance(newEvent.id)
  }
})

// Load attendance data
const fetchAttendances = async () => {
  await fetchAttendanceStats()
}

// Check if player is attending event
const isPlayerAttending = (playerId, eventId) => {
  return eventAttendanceList.value.some(a => 
    a.user_id === playerId && a.status === 'present'
  )
}

// Toggle attendance status
const toggleAttendance = async (playerId, eventId) => {
  const isAttending = isPlayerAttending(playerId, eventId)
  
  try {
    await axios.post(`/api/teams/${teamId.value}/events/${eventId}/attendance`, {
      user_id: playerId,
      status: isAttending ? 'absent' : 'present',
      notes: null
    })
    await fetchEventAttendance(eventId)
  } catch (err) {
    console.error('Error updating attendance:', err)
  }
}

// Statistics methods
const totalPracticesCount = computed(() => 
  events.value.filter(e => e.event_type === 'practice').length
)

const getPlayerAttendanceCount = (playerId) => {
  const stat = attendanceStats.value.find(s => s.user_id === playerId)
  return stat?.present_count || 0
}

const getAttendancePercentage = (playerId) => {
  const stat = attendanceStats.value.find(s => s.user_id === playerId)
  return stat?.attendance_rate || 0
}

// Update mounted to load attendance
onMounted(async () => {
  await fetchData()
  await fetchAttendances()
})

</script>

<style scoped>
/* ==================== LAYOUT ==================== */
.schedule-container {
  max-width: 100%;
  padding: 24px;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
}

/* ==================== HEADER ==================== */
.schedule-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 28px;
}

.header-left h1 {
  margin: 0;
  font-size: 26px;
  font-weight: 700;
  color: var(--text-color);
}

.header-subtitle {
  margin: 4px 0 0;
  font-size: 13px;
  color: #9ca3af;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.header-btn {
  padding: 9px 18px;
  border: none;
  border-radius: 10px;
  font-weight: 600;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
}

.stats-btn {
  background: #f3f4f6;
  color: #374151;
}

.stats-btn:hover {
  background: #e5e7eb;
}

.add-btn {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.add-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

.view-toggle {
  display: flex;
  background: #f3f4f6;
  border-radius: 10px;
  padding: 3px;
}

.view-toggle button {
  padding: 7px 12px;
  border: none;
  border-radius: 8px;
  background: transparent;
  cursor: pointer;
  color: #9ca3af;
  display: flex;
  align-items: center;
  transition: all 0.2s;
}

.view-toggle button.active {
  background: white;
  color: #374151;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}

/* ==================== WEEK VIEW ==================== */
.week-view {
  margin-top: 4px;
}

.week-navigation {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 20px;
  margin-bottom: 20px;
}

.nav-btn {
  width: 36px;
  height: 36px;
  border: none;
  border-radius: 10px;
  background: #f3f4f6;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #6b7280;
  transition: all 0.2s;
}

.nav-btn:hover {
  background: #e5e7eb;
  color: #374151;
}

.week-title {
  display: flex;
  align-items: center;
  gap: 12px;
}

.week-title h2 {
  margin: 0;
  font-size: 17px;
  font-weight: 600;
  color: var(--text-color);
}

.today-btn {
  padding: 4px 12px;
  border: 1.5px solid #667eea;
  border-radius: 6px;
  background: transparent;
  color: #667eea;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.today-btn:hover {
  background: #667eea;
  color: white;
}

.calendar-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 8px;
  min-height: 65vh;
}

.day-column {
  background: var(--card-bg, white);
  border-radius: 14px;
  border: 1px solid #e5e7eb;
  overflow: hidden;
  transition: all 0.2s;
}

.day-column.today {
  border-color: #667eea;
  box-shadow: 0 0 0 1px #667eea;
}

.day-header {
  padding: 12px 10px;
  text-align: center;
  border-bottom: 1px solid #f3f4f6;
}

.day-name {
  font-weight: 600;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: #9ca3af;
  margin-bottom: 4px;
}

.day-number {
  font-size: 20px;
  font-weight: 700;
  color: var(--text-color);
}

.day-number.today-number {
  width: 36px;
  height: 36px;
  line-height: 36px;
  margin: 0 auto;
  border-radius: 50%;
  background: #667eea;
  color: white;
}

.day-events {
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

/* Event cards in week view */
.event-card {
  display: flex;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  overflow: hidden;
  background: white;
  border: 1px solid #f0f0f0;
}

.event-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.08);
}

.event-card.past-event {
  opacity: 0.5;
}

.event-color-bar {
  width: 4px;
  flex-shrink: 0;
}

.event-card.practice .event-color-bar { background: #10b981; }
.event-card.game .event-color-bar { background: #3b82f6; }
.event-card.meeting .event-color-bar { background: #f59e0b; }
.event-card.other .event-color-bar { background: #8b5cf6; }

.event-card-body {
  padding: 8px 10px;
  min-width: 0;
  flex: 1;
}

.event-card-time {
  font-size: 11px;
  font-weight: 600;
  color: #9ca3af;
  margin-bottom: 2px;
}

.event-card-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-color);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.event-card-location {
  font-size: 11px;
  color: #9ca3af;
  margin-top: 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.add-event-cell {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 36px;
  border-radius: 8px;
  border: 1.5px dashed #e5e7eb;
  color: #d1d5db;
  font-size: 18px;
  cursor: pointer;
  transition: all 0.2s;
}

.add-event-cell:hover {
  border-color: #667eea;
  color: #667eea;
  background: rgba(102, 126, 234, 0.04);
}

/* ==================== LIST VIEW ==================== */
.list-view {
  margin-top: 4px;
}

.list-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  margin-bottom: 24px;
  flex-wrap: wrap;
}

.filter-chips {
  display: flex;
  gap: 8px;
}

.filter-chip {
  padding: 7px 14px;
  border: 1.5px solid #e5e7eb;
  border-radius: 20px;
  background: transparent;
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
  color: #6b7280;
  transition: all 0.2s;
}

.filter-chip:hover {
  border-color: #d1d5db;
  background: #f9fafb;
}

.filter-chip.active.practice { border-color: #10b981; background: #ecfdf5; color: #065f46; }
.filter-chip.active.game { border-color: #3b82f6; background: #eff6ff; color: #1e40af; }
.filter-chip.active.meeting { border-color: #f59e0b; background: #fffbeb; color: #92400e; }

.search-box {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 14px;
  border: 1.5px solid #e5e7eb;
  border-radius: 10px;
  background: var(--card-bg, white);
  min-width: 220px;
  transition: border-color 0.2s;
}

.search-box:focus-within {
  border-color: #667eea;
}

.search-box svg {
  color: #9ca3af;
  flex-shrink: 0;
}

.search-box input {
  border: none;
  outline: none;
  font-size: 14px;
  background: transparent;
  color: var(--text-color);
  width: 100%;
}

.empty-state {
  text-align: center;
  padding: 60px 20px;
  color: #9ca3af;
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 12px;
}

.date-group-label {
  font-size: 13px;
  font-weight: 600;
  color: #9ca3af;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin: 20px 0 8px;
  padding-left: 4px;
}

.date-group-label:first-child {
  margin-top: 0;
}

.events-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.list-event-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 14px 18px;
  background: var(--card-bg, white);
  border-radius: 12px;
  border: 1px solid #e5e7eb;
  cursor: pointer;
  transition: all 0.2s;
}

.list-event-card:hover {
  border-color: #d1d5db;
  box-shadow: 0 2px 8px rgba(0,0,0,0.05);
}

.list-event-card.past-event {
  opacity: 0.5;
}

.list-event-color {
  width: 4px;
  height: 40px;
  border-radius: 2px;
  flex-shrink: 0;
}

.list-event-card.practice .list-event-color { background: #10b981; }
.list-event-card.game .list-event-color { background: #3b82f6; }
.list-event-card.meeting .list-event-color { background: #f59e0b; }
.list-event-card.other .list-event-color { background: #8b5cf6; }

.list-event-time {
  min-width: 50px;
  text-align: center;
}

.time-text {
  font-size: 14px;
  font-weight: 700;
  color: var(--text-color);
}

.list-event-info {
  flex: 1;
  min-width: 0;
}

.list-event-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-color);
  margin-bottom: 2px;
}

.list-event-meta {
  font-size: 13px;
  color: #9ca3af;
}

.list-event-badge {
  padding: 5px 12px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;
}

.list-event-badge.practice { background: #ecfdf5; color: #065f46; }
.list-event-badge.game { background: #eff6ff; color: #1e40af; }
.list-event-badge.meeting { background: #fffbeb; color: #92400e; }
.list-event-badge.other { background: #f5f3ff; color: #5b21b6; }

.list-event-actions {
  display: flex;
  gap: 4px;
  opacity: 0;
  transition: opacity 0.2s;
}

.list-event-card:hover .list-event-actions {
  opacity: 1;
}

.action-icon {
  width: 32px;
  height: 32px;
  border: none;
  background: #f3f4f6;
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  transition: all 0.2s;
}

.action-icon:hover {
  background: #e5e7eb;
}

.action-icon.delete:hover {
  background: #fee2e2;
}

/* ==================== ADD/EDIT MODAL ==================== */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  animation: fadeIn 0.15s ease;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slideUp {
  from { opacity: 0; transform: translateY(20px) scale(0.97); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}

.modal-content {
  background: var(--card-bg, white);
  border-radius: 16px;
  width: 90%;
  max-width: 480px;
  padding: 28px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15);
  animation: slideUp 0.25s ease;
}

.modal-content h3 {
  margin: 0 0 20px;
  font-size: 18px;
  font-weight: 700;
  color: var(--text-color);
}

.modal-error {
  background: #fee2e2;
  color: #dc2626;
  padding: 10px 14px;
  border-radius: 8px;
  font-size: 14px;
  margin-bottom: 14px;
  border: 1px solid #fca5a5;
}

.dark-mode .modal-error {
  background: rgba(220, 38, 38, 0.15);
  border-color: rgba(220, 38, 38, 0.3);
}

.modal-form {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.form-row {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-row label {
  font-size: 13px;
  font-weight: 600;
  color: #6b7280;
}

.form-row input,
.form-row select {
  padding: 10px 12px;
  border: 1.5px solid #e5e7eb;
  border-radius: 10px;
  font-size: 14px;
  color: var(--text-color);
  background: var(--card-bg, white);
  transition: border-color 0.2s;
}

.form-row input:focus,
.form-row select:focus {
  outline: none;
  border-color: #667eea;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 10px;
}

.form-actions button {
  padding: 10px 20px;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  border: 1.5px solid;
}

.form-actions button:first-child {
  background: transparent;
  border-color: #d1d5db;
  color: #6b7280;
}

.form-actions button:first-child:hover {
  background: #f3f4f6;
}

.form-actions .save {
  background: #667eea;
  border-color: #667eea;
  color: white;
}

.form-actions .save:hover {
  background: #5a6fd6;
}

/* ==================== EVENT DETAIL OVERLAY ==================== */
.event-detail-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(8px);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  padding: 20px;
  animation: fadeIn 0.15s ease;
}

.event-detail-content {
  background: var(--card-bg, white);
  border-radius: 20px;
  width: 90%;
  max-width: 500px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
  position: relative;
  animation: slideUp 0.3s ease;
  border-top: 4px solid #6366f1;
}

.event-detail-content.practice { border-top-color: #10b981; }
.event-detail-content.game { border-top-color: #3b82f6; }
.event-detail-content.meeting { border-top-color: #f59e0b; }
.event-detail-content.other { border-top-color: #8b5cf6; }

.close-detail {
  position: absolute;
  top: 16px;
  right: 16px;
  background: #f3f4f6;
  border: none;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  cursor: pointer;
  color: #6b7280;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  z-index: 10;
}

.close-detail:hover {
  background: #e5e7eb;
  color: #374151;
  transform: rotate(90deg);
}

.event-type-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
  margin: 20px 24px 0;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.event-type-badge.practice { background: #d1fae5; color: #065f46; }
.event-type-badge.game { background: #dbeafe; color: #1e40af; }
.event-type-badge.meeting { background: #fef3c7; color: #92400e; }
.event-type-badge.other { background: #ede9fe; color: #5b21b6; }

.type-icon { font-size: 14px; }

.event-detail-main {
  padding: 16px 24px 20px;
}

.event-detail-main .event-title {
  font-size: 24px;
  font-weight: 700;
  color: var(--text-color, #111827);
  margin: 0 0 20px;
  line-height: 1.2;
}

.event-meta-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.meta-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px;
  background: #f9fafb;
  border-radius: 12px;
}

.meta-item.full-width {
  grid-column: 1 / -1;
}

.meta-icon {
  font-size: 18px;
  width: 36px;
  height: 36px;
  background: white;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 1px 3px rgba(0,0,0,0.06);
  flex-shrink: 0;
}

.meta-content {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.meta-label {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: #9ca3af;
  font-weight: 600;
}

.meta-value {
  font-size: 14px;
  color: #374151;
  font-weight: 500;
}

.event-countdown {
  margin-top: 16px;
  padding: 12px 16px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: white;
}

.event-countdown.past {
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  justify-content: center;
}

.countdown-label {
  font-size: 13px;
  opacity: 0.9;
}

.countdown-value {
  font-size: 18px;
  font-weight: 700;
}

/* ==================== ATTENDANCE ==================== */
.attendance-section {
  padding: 20px 24px;
  border-top: 1px solid #f3f4f6;
}

.attendance-section h3 {
  margin: 0 0 16px;
  font-size: 16px;
  font-weight: 600;
  color: #374151;
}

.attendance-choice {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.attend-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 16px;
  border: 2px solid #e5e7eb;
  border-radius: 14px;
  background: var(--card-bg, white);
  cursor: pointer;
  transition: all 0.2s;
}

.attend-btn .btn-icon {
  font-size: 24px;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f3f4f6;
  transition: all 0.2s;
}

.attend-btn .btn-text {
  font-size: 14px;
  font-weight: 500;
  color: #6b7280;
}

.attend-btn.yes:hover, .attend-btn.yes.active {
  border-color: #10b981;
  background: #ecfdf5;
}

.attend-btn.yes:hover .btn-icon, .attend-btn.yes.active .btn-icon {
  background: #10b981;
  color: white;
}

.attend-btn.yes.active .btn-text { color: #065f46; }

.attend-btn.no:hover, .attend-btn.no.active {
  border-color: #ef4444;
  background: #fef2f2;
}

.attend-btn.no:hover .btn-icon, .attend-btn.no.active .btn-icon {
  background: #ef4444;
  color: white;
}

.attend-btn.no.active .btn-text { color: #991b1b; }

.my-reason-card {
  margin-top: 12px;
  padding: 12px 16px;
  background: #fef3c7;
  border-radius: 10px;
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 14px;
  color: #92400e;
}

.attendance-result {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  border-radius: 12px;
  font-size: 16px;
  font-weight: 500;
}

.attendance-result.present { background: #ecfdf5; color: #065f46; }
.attendance-result.absent, .attendance-result.excused { background: #fef2f2; color: #991b1b; }
.attendance-result.unmarked { background: #f3f4f6; color: #6b7280; }

.result-icon {
  font-size: 24px;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: white;
}

/* Coach attendance bar */
.attendance-stats-bar {
  display: flex;
  height: 28px;
  border-radius: 14px;
  overflow: hidden;
  background: #f3f4f6;
  margin-bottom: 12px;
}

.stat-segment {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 600;
  color: white;
  transition: width 0.3s ease;
  min-width: 0;
}

.stat-segment.yes { background: linear-gradient(135deg, #10b981, #059669); }
.stat-segment.no { background: linear-gradient(135deg, #ef4444, #dc2626); }
.stat-segment.pending { background: linear-gradient(135deg, #9ca3af, #6b7280); }

.stats-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 16px;
}

.legend-item { font-size: 12px; color: #6b7280; }
.legend-item.yes { color: #059669; }
.legend-item.no { color: #dc2626; }

.attendees-grid {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 300px;
  overflow-y: auto;
}

.attendee-card {
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 12px;
  align-items: center;
  padding: 10px 12px;
  background: #f9fafb;
  border-radius: 10px;
  border-left: 3px solid #e5e7eb;
}

.attendee-card.present { border-left-color: #10b981; }
.attendee-card.absent, .attendee-card.excused { border-left-color: #ef4444; }
.attendee-card.unmarked { border-left-color: #9ca3af; }

.attendee-card .attendee-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: 600;
}

.attendee-details { min-width: 0; }

.attendee-card .attendee-name {
  font-weight: 600;
  font-size: 14px;
  color: var(--text-color, #111827);
}

.attendee-status {
  font-size: 12px;
  color: #6b7280;
}

.status-indicator {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
}

.status-indicator.present { background: #d1fae5; color: #065f46; }
.status-indicator.absent, .status-indicator.excused { background: #fee2e2; color: #991b1b; }
.status-indicator.unmarked { background: #f3f4f6; color: #6b7280; }

.attendee-note {
  grid-column: 1 / -1;
  font-size: 12px;
  color: #6b7280;
  padding: 6px 10px;
  background: white;
  border-radius: 6px;
  font-style: italic;
}

/* Event detail actions */
.event-detail-actions {
  display: flex;
  gap: 12px;
  padding: 16px 24px 24px;
  border-top: 1px solid #f3f4f6;
}

.event-detail-actions button {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px 20px;
  border: none;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.edit-btn { background: #f3f4f6; color: #374151; }
.edit-btn:hover { background: #e5e7eb; }
.delete-btn { background: #fef2f2; color: #dc2626; }
.delete-btn:hover { background: #fee2e2; }

/* ==================== DECLINE MODAL ==================== */
.decline-modal {
  max-width: 450px;
}

.decline-modal h3 {
  margin-bottom: 20px;
  font-size: 1.1rem;
}

.decline-modal textarea {
  width: 100%;
  min-height: 100px;
  padding: 12px;
  border: 1.5px solid #e5e7eb;
  border-radius: 10px;
  resize: vertical;
  margin-bottom: 15px;
  font-family: inherit;
  font-size: 0.95rem;
  line-height: 1.5;
  color: var(--text-color, #333);
  background: var(--card-bg, #fff);
}

.decline-modal textarea:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.modal-actions {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
}

.modal-btn {
  padding: 10px 24px;
  border-radius: 10px;
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  border: 1.5px solid;
}

.modal-btn.cancel-btn {
  background: transparent;
  border-color: #d1d5db;
  color: #6b7280;
}

.modal-btn.cancel-btn:hover {
  background: #f3f4f6;
  border-color: #9ca3af;
}

.modal-btn.confirm-btn {
  background: #667eea;
  border-color: #667eea;
  color: white;
}

.modal-btn.confirm-btn:hover {
  background: #5a6fd6;
}

.modal-btn.confirm-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* ==================== STATS MODAL ==================== */
.stats-modal {
  max-width: 700px;
}

.stats-modal table {
  width: 100%;
  border-collapse: collapse;
  margin: 16px 0;
}

.stats-modal th, .stats-modal td {
  padding: 10px 12px;
  text-align: left;
  border-bottom: 1px solid #f3f4f6;
}

.stats-modal th {
  background: #f9fafb;
  font-size: 12px;
  font-weight: 600;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.player-cell {
  display: flex;
  align-items: center;
  gap: 10px;
}

.player-avatar-sm {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 11px;
}

.stat-present { color: #059669; font-weight: 600; }
.stat-absent { color: #dc2626; font-weight: 600; }

.rate-bar {
  display: flex;
  align-items: center;
  gap: 10px;
}

.rate-fill {
  height: 6px;
  background: linear-gradient(90deg, #667eea, #764ba2);
  border-radius: 3px;
  min-width: 4px;
  max-width: 100px;
  transition: width 0.3s;
}

.rate-bar span {
  font-weight: 600;
  font-size: 13px;
  min-width: 40px;
}

/* ==================== DARK MODE ==================== */
.dark-mode .schedule-header { border-bottom-color: #2d2d2d; }

.dark-mode .header-btn.stats-btn {
  background: #2d2d2d;
  color: #e5e7eb;
}

.dark-mode .header-btn.stats-btn:hover {
  background: #3d3d3d;
}

.dark-mode .view-toggle {
  background: #2d2d2d;
}

.dark-mode .view-toggle button {
  color: #6b7280;
}

.dark-mode .view-toggle button.active {
  background: #3d3d3d;
  color: #f0f0f0;
  box-shadow: none;
}

.dark-mode .nav-btn {
  background: #2d2d2d;
  color: #9ca3af;
}

.dark-mode .nav-btn:hover {
  background: #3d3d3d;
}

.dark-mode .today-btn {
  border-color: #667eea;
  color: #818cf8;
}

.dark-mode .day-column {
  background: #1e1e1e;
  border-color: #2d2d2d;
}

.dark-mode .day-column.today {
  border-color: #667eea;
  box-shadow: 0 0 0 1px #667eea;
}

.dark-mode .day-header {
  border-bottom-color: #2d2d2d;
}

.dark-mode .event-card {
  background: #2d2d2d;
  border-color: #3d3d3d;
}

.dark-mode .add-event-cell {
  border-color: #3d3d3d;
  color: #4d4d4d;
}

.dark-mode .add-event-cell:hover {
  border-color: #667eea;
  color: #667eea;
}

.dark-mode .filter-chip {
  border-color: #3d3d3d;
  color: #9ca3af;
}

.dark-mode .filter-chip:hover {
  background: #2d2d2d;
}

.dark-mode .filter-chip.active.practice { background: rgba(16,185,129,0.15); border-color: #10b981; color: #6ee7b7; }
.dark-mode .filter-chip.active.game { background: rgba(59,130,246,0.15); border-color: #3b82f6; color: #93c5fd; }
.dark-mode .filter-chip.active.meeting { background: rgba(245,158,11,0.15); border-color: #f59e0b; color: #fcd34d; }

.dark-mode .search-box {
  border-color: #3d3d3d;
  background: #2d2d2d;
}

.dark-mode .list-event-card {
  background: #1e1e1e;
  border-color: #2d2d2d;
}

.dark-mode .list-event-card:hover {
  border-color: #3d3d3d;
}

.dark-mode .list-event-badge.practice { background: rgba(16,185,129,0.15); color: #6ee7b7; }
.dark-mode .list-event-badge.game { background: rgba(59,130,246,0.15); color: #93c5fd; }
.dark-mode .list-event-badge.meeting { background: rgba(245,158,11,0.15); color: #fcd34d; }
.dark-mode .list-event-badge.other { background: rgba(139,92,246,0.15); color: #c4b5fd; }

.dark-mode .action-icon {
  background: #2d2d2d;
}

.dark-mode .action-icon:hover {
  background: #3d3d3d;
}

.dark-mode .modal-content {
  background: #1e1e1e;
}

.dark-mode .form-row input,
.dark-mode .form-row select {
  background: #2d2d2d;
  border-color: #3d3d3d;
  color: #f0f0f0;
}

.dark-mode .form-actions button:first-child {
  border-color: #3d3d3d;
  color: #9ca3af;
}

.dark-mode .form-actions button:first-child:hover {
  background: #2d2d2d;
}

.dark-mode .event-detail-content {
  background: #1e1e1e;
}

.dark-mode .close-detail {
  background: #2d2d2d;
  color: #9ca3af;
}

.dark-mode .close-detail:hover {
  background: #3d3d3d;
  color: #f0f0f0;
}

.dark-mode .meta-item {
  background: #2d2d2d;
}

.dark-mode .meta-icon {
  background: #3d3d3d;
}

.dark-mode .meta-value {
  color: #e5e7eb;
}

.dark-mode .attendance-section {
  border-top-color: #2d2d2d;
}

.dark-mode .attendance-section h3 {
  color: #e5e7eb;
}

.dark-mode .attend-btn {
  border-color: #3d3d3d;
  background: #2d2d2d;
}

.dark-mode .attend-btn .btn-icon {
  background: #3d3d3d;
}

.dark-mode .attend-btn .btn-text {
  color: #9ca3af;
}

.dark-mode .attend-btn.yes:hover,
.dark-mode .attend-btn.yes.active {
  background: rgba(16, 185, 129, 0.15);
}

.dark-mode .attend-btn.no:hover,
.dark-mode .attend-btn.no.active {
  background: rgba(239, 68, 68, 0.15);
}

.dark-mode .my-reason-card {
  background: rgba(245, 158, 11, 0.15);
  color: #fbbf24;
}

.dark-mode .attendance-result.unmarked {
  background: #2d2d2d;
  color: #9ca3af;
}

.dark-mode .attendee-card {
  background: #2d2d2d;
}

.dark-mode .attendee-card .attendee-name {
  color: #f0f0f0;
}

.dark-mode .attendee-note {
  background: #3d3d3d;
  color: #9ca3af;
}

.dark-mode .event-detail-actions {
  border-top-color: #2d2d2d;
}

.dark-mode .edit-btn {
  background: #2d2d2d;
  color: #e5e7eb;
}

.dark-mode .edit-btn:hover {
  background: #3d3d3d;
}

.dark-mode .delete-btn {
  background: rgba(239, 68, 68, 0.15);
}

.dark-mode .decline-modal textarea {
  background: #2d2d2d;
  border-color: #3d3d3d;
  color: var(--text-color);
}

.dark-mode .modal-btn.cancel-btn {
  border-color: #3d3d3d;
  color: #9ca3af;
}

.dark-mode .modal-btn.cancel-btn:hover {
  background: #2d2d2d;
}

.dark-mode .stats-modal th {
  background: #2d2d2d;
  color: #9ca3af;
}

.dark-mode .stats-modal th,
.dark-mode .stats-modal td {
  border-bottom-color: #2d2d2d;
}

.dark-mode .date-group-label {
  color: #6b7280;
}

/* ==================== RESPONSIVE ==================== */
@media (max-width: 1024px) {
  .calendar-grid {
    grid-template-columns: repeat(7, 1fr);
    gap: 4px;
  }
  
  .day-column {
    border-radius: 10px;
  }
  
  .event-card-body {
    padding: 6px 8px;
  }
}

@media (max-width: 768px) {
  .schedule-container {
    padding: 16px;
  }
  
  .schedule-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }
  
  .calendar-grid {
    grid-template-columns: 1fr;
    min-height: auto;
    gap: 8px;
  }
  
  .day-column {
    display: flex;
    flex-direction: row;
    align-items: stretch;
  }
  
  .day-header {
    min-width: 70px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    border-bottom: none;
    border-right: 1px solid #f3f4f6;
  }
  
  .day-events {
    flex-direction: row;
    flex-wrap: wrap;
    flex: 1;
  }
  
  .event-meta-grid {
    grid-template-columns: 1fr;
  }
  
  .list-toolbar {
    flex-direction: column;
    align-items: stretch;
  }
  
  .filter-chips {
    overflow-x: auto;
  }
  
  .search-box {
    min-width: auto;
  }
  
  .list-event-card {
    flex-wrap: wrap;
  }
  
  .list-event-actions {
    opacity: 1;
  }
}
</style>
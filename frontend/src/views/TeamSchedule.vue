<template>
    <div class="schedule-page">
      <h2 class="title">Расписание команды</h2>
      <FullCalendar
        :plugins="[dayGridPlugin, timeGridPlugin, interactionPlugin]"
        initial-view="dayGridMonth"
        locale="ru"
        :header-toolbar="{
          left: 'prev,next today',
          center: 'title',
          right: 'dayGridMonth,timeGridWeek'
        }"
        :events="events"
        :editable="true"
        :eventClick="handleEventClick"
        :dateClick="handleDateClick"
        :eventDrop="handleEventDrop"
      />
    </div>
  </template>
  
  <script setup>
  import { ref, onMounted } from 'vue'
  import FullCalendar from '@fullcalendar/vue3'
  import dayGridPlugin from '@fullcalendar/daygrid'
  import timeGridPlugin from '@fullcalendar/timegrid'
  import interactionPlugin from '@fullcalendar/interaction'
  import ruLocale from '@fullcalendar/core/locales/ru'
  
  const props = defineProps({
    teamId: Number
  })
  
  const events = ref([])
  
  onMounted(async () => {
    const res = await fetch(`/api/teams/${props.teamId}/schedule`)
    const data = await res.json()
    events.value = data.schedule.map((e) => ({
      id: e.id,
      title: `${e.description}${e.location ? ' — ' + e.location : ''}`,
      start: e.date,
      allDay: true
    }))
  })
  
  function handleDateClick(info) {
    const desc = prompt('Введите описание события:')
    if (!desc) return
  
    const location = prompt('Введите место:')
    const newEvent = {
      title: `${desc}${location ? ' — ' + location : ''}`,
      start: info.dateStr,
      allDay: true
    }
  
    // Добавление на сервер
    fetch(`/api/teams/${props.teamId}/schedule`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        date: info.dateStr,
        description: desc,
        location: location || '',
        time: '', // можно доработать
      })
    }).then(async (res) => {
      const result = await res.json()
      if (res.ok) {
        newEvent.id = result.eventId
        events.value = [...events.value, newEvent]
      } else {
        alert(result.error || 'Ошибка при добавлении события')
      }
    })
  }
  
  function handleEventClick(info) {
    const confirmed = confirm(`Удалить событие "${info.event.title}"?`)
    if (!confirmed) return
  
    fetch(`/api/teams/${props.teamId}/schedule/${info.event.id}`, {
      method: 'DELETE'
    }).then(async (res) => {
      if (res.ok) {
        info.event.remove()
      } else {
        const err = await res.json()
        alert(err.error || 'Ошибка удаления')
      }
    })
  }
  
  function handleEventDrop(info) {
    const newDate = info.event.startStr
  
    fetch(`/api/teams/${props.teamId}/schedule/${info.event.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        date: newDate,
        description: info.event.title.split(' — ')[0],
        location: info.event.title.split(' — ')[1] || ''
      })
    }).then(async (res) => {
      if (!res.ok) {
        const err = await res.json()
        alert(err.error || 'Ошибка обновления')
        info.revert()
      }
    })
  }
  </script>
  
  <style scoped>
  .schedule-page {
    max-width: 1000px;
    margin: 2rem auto;
    padding: 1rem;
    background-color: var(--background-color);
    border-radius: 12px;
    box-shadow: 0 0 10px rgba(0,0,0,0.1);
  }
  
  .title {
    margin-bottom: 1rem;
    color: var(--text-color);
    text-align: center;
    font-size: 1.8rem;
    font-weight: bold;
  }
  
  .fc {
    --fc-border-color: #ddd;
    --fc-daygrid-event-dot-width: 8px;
    font-family: 'Segoe UI', sans-serif;
    color: var(--text-color);
    background-color: var(--background-color);
  }
  </style>
  
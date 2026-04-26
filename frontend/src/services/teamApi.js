import axios from 'axios'
import { normalizeRole } from '../utils/teamAccess'

const buildPlayerStats = (stats = {}) => ({
  matches: Number(stats.matches) || 0,
  goals: Number(stats.goals) || 0,
  assists: Number(stats.assists) || 0,
  yellow_cards: Number(stats.yellow_cards) || 0,
  red_cards: Number(stats.red_cards) || 0
})

const fileToDataUrl = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader()
  reader.onload = (event) => resolve(event.target?.result || '')
  reader.onerror = () => reject(new Error('Neizdevās nolasīt attēla failu'))
  reader.readAsDataURL(file)
})

export const fetchTeamBundle = async (teamId) => {
  const response = await axios.get(`/api/auth/teams/${teamId}`)
  const team = response.data?.team || { name: '', coach_id: null, team_code: '', logo: null }
  const roster = Array.isArray(response.data?.players) ? response.data.players : []

  const players = await Promise.all(
    roster
      .filter((player) => normalizeRole(player.role) !== 'coach')
      .map(async (player) => {
        try {
          const statsResponse = await axios.get(`/api/auth/players/${player.id}/stats`)
          return {
            ...player,
            stats: buildPlayerStats(statsResponse.data?.stats)
          }
        } catch (error) {
          console.error(`Error loading stats for player ${player.id}:`, error)
          return {
            ...player,
            stats: buildPlayerStats()
          }
        }
      })
  )

  return { team, players }
}

export const fetchTeamSummary = async (teamId) => {
  const response = await axios.get(`/api/auth/teams/${teamId}/stats`)

  return {
    totalPlayers: Number(response.data?.totalPlayers) || 0,
    totalMatches: Number(response.data?.totalMatches) || 0,
    totalGoals: Number(response.data?.totalGoals) || 0,
    totalAssists: Number(response.data?.totalAssists) || 0,
    totalYellowCards: Number(response.data?.totalYellowCards) || 0,
    totalRedCards: Number(response.data?.totalRedCards) || 0,
    avgAttendance: Number(response.data?.avgAttendance) || 0,
    topScorers: Array.isArray(response.data?.topScorers) ? response.data.topScorers : [],
    topAssists: Array.isArray(response.data?.topAssists) ? response.data.topAssists : []
  }
}

export const fetchTeamSchedule = async (teamId) => {
  const response = await axios.get(`/api/teams/${teamId}/schedule`)
  return Array.isArray(response.data) ? response.data : []
}

export const uploadTeamLogo = async (teamId, file) => {
  const logo = await fileToDataUrl(file)
  const response = await axios.post(`/api/auth/teams/${teamId}/logo`, { logo })
  return response.data?.logo || logo
}

export const removeTeamLogo = async (teamId) => {
  await axios.delete(`/api/auth/teams/${teamId}/logo`)
}

export const uploadUserAvatar = async (file) => {
  const avatar = await fileToDataUrl(file)
  const response = await axios.post('/api/auth/avatar', { avatar })
  return response.data?.avatar || avatar
}

export const removeUserAvatar = async () => {
  await axios.delete('/api/auth/avatar')
}

export const leaveCurrentTeam = async () => {
  const response = await axios.post('/api/auth/leave-team')
  return response.data || {}
}

export const uploadPlayerAvatar = async (playerId, file) => {
  const avatar = await fileToDataUrl(file)
  const response = await axios.post(`/api/auth/players/${playerId}/avatar`, { avatar })
  return response.data?.avatar || avatar
}

export const removePlayerAvatar = async (playerId) => {
  await axios.delete(`/api/auth/players/${playerId}/avatar`)
}

export const fetchCoachJoinRequests = async (teamId) => {
  const response = await axios.get(`/api/auth/teams/${teamId}/coach-requests`)
  return Array.isArray(response.data?.requests) ? response.data.requests : []
}

export const approveCoachJoinRequest = async (teamId, requestId) => {
  const response = await axios.post(`/api/auth/teams/${teamId}/coach-requests/${requestId}/approve`)
  return response.data
}

export const rejectCoachJoinRequest = async (teamId, requestId) => {
  const response = await axios.post(`/api/auth/teams/${teamId}/coach-requests/${requestId}/reject`)
  return response.data
}

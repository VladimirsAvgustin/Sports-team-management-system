import { computed, unref } from 'vue'

const toFiniteNumber = (value) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

export const normalizeRole = (role) => {
  return typeof role === 'string' ? role.trim().toLowerCase() : ''
}

export const hasCoachRole = (user) => {
  return normalizeRole(user?.role) === 'coach'
}

export const canManageTeam = ({ userRef, teamRef, teamIdRef }) => computed(() => {
  const user = unref(userRef)

  if (!hasCoachRole(user)) {
    return false
  }

  const activeTeamId = toFiniteNumber(unref(teamIdRef))
  const userTeamId = toFiniteNumber(user?.team_id)

  if (activeTeamId !== null && userTeamId !== null && activeTeamId === userTeamId) {
    return true
  }

  const team = unref(teamRef)
  const coachId = toFiniteNumber(team?.coach_id)
  const userId = toFiniteNumber(user?.id)

  return coachId !== null && userId !== null && coachId === userId
})

export const isTeamOwner = ({ userRef, teamRef }) => computed(() => {
  const user = unref(userRef)

  if (!hasCoachRole(user)) {
    return false
  }

  const team = unref(teamRef)
  const coachId = toFiniteNumber(team?.coach_id)
  const userId = toFiniteNumber(user?.id)

  return coachId !== null && userId !== null && coachId === userId
})

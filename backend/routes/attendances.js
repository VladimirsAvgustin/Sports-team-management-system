const express = require('express')
const router = express.Router()
const db = require('../models')

// Получить все отметки посещения для команды
router.get('/:teamId/attendances', async (req, res) => {
  try {
    const attendances = await db.Attendance.findAll({
      include: [
        { model: db.Player, where: { team_id: req.params.teamId } },
        { model: db.Event }
      ]
    })
    res.json(attendances)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Добавить/изменить отметку посещения
router.post('/:teamId/attendances', async (req, res) => {
  try {
    const { player_id, event_id, status } = req.body
    
    const [attendance, created] = await db.Attendance.findOrCreate({
      where: { player_id, event_id },
      defaults: { status }
    })
    
    if (!created) {
      attendance.status = status
      await attendance.save()
    }
    
    res.json(attendance)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Удалить отметку посещения
router.delete('/:teamId/attendances', async (req, res) => {
  try {
    const { player_id, event_id } = req.body
    await db.Attendance.destroy({
      where: { player_id, event_id }
    })
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
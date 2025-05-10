const express = require('express')
const router = express.Router()
const db = require('../models')

// Получить всех игроков команды
router.get('/:teamId/players', async (req, res) => {
  try {
    const players = await db.Player.findAll({
      where: { team_id: req.params.teamId }
    })
    res.json(players)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
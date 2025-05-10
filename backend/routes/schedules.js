const express = require('express');
const router = express.Router();

module.exports = (db) => {
  // Получить расписание по команде
  router.get('/teams/:id/schedule', (req, res) => {
    const teamId = req.params.id;
    db.all('SELECT * FROM schedules WHERE team_id = ?', [teamId], (err, rows) => {
      if (err) {
        return res.status(500).json({ error: 'Ошибка при получении расписания' });
      }
      res.json(rows);
    });
  });

  // Добавить событие
  router.post('/teams/:id/schedule', (req, res) => {
    const teamId = req.params.id;
    const { event_name, event_date, location, event_time, event_type } = req.body;

    if (!event_name || !event_date) {
      return res.status(400).json({ error: 'event_name и event_date обязательны' });
    }

    db.run(
      `INSERT INTO schedules (team_id, event_name, event_date, location, event_time, event_type)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [teamId, event_name, event_date, location, event_time, event_type],
      function (err) {
        if (err) {
          return res.status(500).json({ error: 'Ошибка при добавлении события' });
        }
        res.json({ id: this.lastID, team_id: teamId, event_name, event_date, location, event_time, event_type });
      }
    );
  });

  // Обновить событие
  router.put('/teams/:teamId/schedule/:eventId', (req, res) => {
    const { teamId, eventId } = req.params;
    const { event_name, event_date, location, event_time, event_type } = req.body;

    db.run(
      `UPDATE schedules 
       SET event_name = ?, event_date = ?, location = ?, event_time = ?, event_type = ?
       WHERE id = ? AND team_id = ?`,
      [event_name, event_date, location, event_time, event_type, eventId, teamId],
      function (err) {
        if (err) {
          return res.status(500).json({ error: 'Ошибка при обновлении события' });
        }
        if (this.changes === 0) {
          return res.status(404).json({ error: 'Событие не найдено' });
        }
        res.json({ success: true });
      }
    );
  });

  // Удалить событие
  router.delete('/teams/:teamId/schedule/:eventId', (req, res) => {
    const { teamId, eventId } = req.params;

    db.run(
      `DELETE FROM schedules WHERE id = ? AND team_id = ?`,
      [eventId, teamId],
      function (err) {
        if (err) {
          return res.status(500).json({ error: 'Ошибка при удалении события' });
        }
        if (this.changes === 0) {
          return res.status(404).json({ error: 'Событие не найдено' });
        }
        res.json({ success: true });
      }
    );
  });

  router.get('/:teamId/attendances', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT * FROM attendances WHERE event_id IN (
        SELECT id FROM events WHERE team_id = $1
      )`, [req.params.teamId]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/teams/:teamId/attendances - добавить отметку
router.post('/:teamId/attendances', async (req, res) => {
  try {
    const { player_id, event_id, status } = req.body;
    const result = await db.query(
      `INSERT INTO attendances (player_id, event_id, status)
       VALUES ($1, $2, $3)
       ON CONFLICT (player_id, event_id) 
       DO UPDATE SET status = EXCLUDED.status
       RETURNING *`,
      [player_id, event_id, status]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/teams/:teamId/attendances - удалить отметку
router.delete('/:teamId/attendances', async (req, res) => {
  try {
    const { player_id, event_id } = req.body;
    await db.query(
      `DELETE FROM attendances 
       WHERE player_id = $1 AND event_id = $2`,
      [player_id, event_id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

  return router;
};

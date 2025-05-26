const express = require('express');
const router = express.Router();

module.exports = (db) => {
  // get schedule by team id
  router.get('/teams/:id/schedule', (req, res) => {
    const teamId = req.params.id;
    db.all('SELECT * FROM schedules WHERE team_id = ?', [teamId], (err, rows) => {
      if (err) {
        return res.status(500).json({ error: 'Ошибка при получении расписания' });
      }
      res.json(rows);
    });
  });

  // add event
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

  
//   // Получить все посещения по команде
//   router.get('/:teamId/attendances', (req, res) => {
//     const teamId = req.params.teamId;

//     const query = `
//       SELECT a.*
//       FROM attendances a
//       JOIN schedules s ON a.event_id = s.id
//       WHERE s.team_id = ?
//     `;

//     db.all(query, [teamId], (err, rows) => {
//       if (err) {
//         return res.status(500).json({ error: 'Ошибка при получении посещаемости' });
//       }
//       res.json(rows);
//     });
//   });

//   // Добавить/обновить посещение
//   router.post('/:teamId/attendances', (req, res) => {
//     const { player_id, event_id, status } = req.body;

//     const checkQuery = `
//       SELECT * FROM attendances WHERE player_id = ? AND event_id = ?
//     `;

//     db.get(checkQuery, [player_id, event_id], (err, row) => {
//       if (err) {
//         return res.status(500).json({ error: 'Ошибка при проверке посещаемости' });
//       }

//       if (row) {
//         // обновить
//         db.run(
//           `UPDATE attendances SET status = ? WHERE player_id = ? AND event_id = ?`,
//           [status, player_id, event_id],
//           function (err) {
//             if (err) return res.status(500).json({ error: 'Ошибка при обновлении посещаемости' });
//             res.json({ updated: true });
//           }
//         );
//       } else {
//         // вставить
//         db.run(
//           `INSERT INTO attendances (player_id, event_id, status) VALUES (?, ?, ?)`,
//           [player_id, event_id, status],
//           function (err) {
//             if (err) return res.status(500).json({ error: 'Ошибка при добавлении посещаемости' });
//             res.json({ id: this.lastID });
//           }
//         );
//       }
//     });
//   });

//   // Удалить посещение
//   router.delete('/:teamId/attendances', (req, res) => {
//     const { player_id, event_id } = req.body;

//     db.run(
//       `DELETE FROM attendances WHERE player_id = ? AND event_id = ?`,
//       [player_id, event_id],
//       function (err) {
//         if (err) {
//           return res.status(500).json({ error: 'Ошибка при удалении посещаемости' });
//         }
//         res.json({ success: true });
//       }
//     );
//   });
   // Получить игроков команды
  router.get('/teams/:teamId/players', (req, res) => {
    const teamId = req.params.teamId;
    
    db.all(`
        SELECT 
            u.id, 
            u.username, 
            u.email,
            ps.matches,
            ps.goals,
            ps.assists,
            ps.yellow_cards,
            ps.red_cards
        FROM users u
        LEFT JOIN player_stats ps ON u.id = ps.user_id
        WHERE u.team_id = ? AND u.role = 'Player'
    `, [teamId], (err, rows) => {
        if (err) {
            console.error('Ошибка при получении игроков:', err);
            return res.status(500).json({ error: 'Не удалось загрузить игроков команды' });
        }
        
        // Преобразуем null в 0, если статистики нет
        const players = rows.map(player => ({
            ...player,
            stats: {
                matches: player.matches || 0,
                goals: player.goals || 0,
                assists: player.assists || 0,
                yellow_cards: player.yellow_cards || 0,
                red_cards: player.red_cards || 0
            }
        }));
        
        res.json({ players });
    });
});
  return router;
};

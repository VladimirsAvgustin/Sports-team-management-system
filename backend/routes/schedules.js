const express = require('express');
const router = express.Router();

module.exports = (db) => {
  // get schedule by team id
  router.get('/teams/:id/schedule', (req, res) => {
    const teamId = req.params.id;
    db.all(
      `SELECT *
       FROM schedules
       WHERE team_id = ?
       ORDER BY event_date ASC, time(COALESCE(NULLIF(event_time, ''), '23:59:59')) ASC, id ASC`,
      [teamId],
      (err, rows) => {
      if (err) {
        return res.status(500).json({ error: 'Kļūda, ielādējot grafiku' });
      }
      res.json(rows);
      }
    );
  });

  // add event
  router.post('/teams/:id/schedule', (req, res) => {
    const teamId = req.params.id;
    const { event_name, event_date, location, event_time, event_type, description } = req.body;
    const createdAt = new Date().toISOString();

    if (!event_name || !event_date) {
        return res.status(400).json({ error: 'Notikuma nosaukums un datums ir obligāti' });
    }

    // Check for time conflict
    db.get(
      `SELECT id FROM schedules WHERE team_id = ? AND event_date = ? AND event_time = ?`,
      [teamId, event_date, event_time],
      (err, existing) => {
        if (err) {
          return res.status(500).json({ error: 'Kļūda, pārbaudot laika konfliktus' });
        }
        if (existing) {
          return res.status(409).json({ error: 'Šajā datumā un laikā jau ir notikums' });
        }

        db.run(
          `INSERT INTO schedules (team_id, event_name, event_date, location, description, event_time, event_type, createdAt)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [teamId, event_name, event_date, location, description || '', event_time, event_type, createdAt],
          function (err) {
            if (err) {
              return res.status(500).json({ error: 'Kļūda, pievienojot notikumu' });
            }
            res.json({ id: this.lastID, team_id: teamId, event_name, event_date, location, description: description || '', event_time, event_type, createdAt });
          }
        );
      }
    );
  });

  // Update event
  router.put('/teams/:teamId/schedule/:eventId', (req, res) => {
    const { teamId, eventId } = req.params;
    const { event_name, event_date, location, event_time, event_type, description } = req.body;

    // Check for time conflict (exclude current event)
    db.get(
      `SELECT id FROM schedules WHERE team_id = ? AND event_date = ? AND event_time = ? AND id != ?`,
      [teamId, event_date, event_time, eventId],
      (err, existing) => {
        if (err) {
          return res.status(500).json({ error: 'Kļūda, pārbaudot laika konfliktus' });
        }
        if (existing) {
          return res.status(409).json({ error: 'Šajā datumā un laikā jau ir notikums' });
        }

        db.run(
          `UPDATE schedules 
           SET event_name = ?, event_date = ?, location = ?, description = ?, event_time = ?, event_type = ?
           WHERE id = ? AND team_id = ?`,
          [event_name, event_date, location, description || '', event_time, event_type, eventId, teamId],
          function (err) {
            if (err) {
              return res.status(500).json({ error: 'Kļūda, atjauninot notikumu' });
            }
            if (this.changes === 0) {
                return res.status(404).json({ error: 'Notikums nav atrasts' });
            }
            res.json({ success: true });
          }
        );
      }
    );
  });

  // Delete event
  router.delete('/teams/:teamId/schedule/:eventId', (req, res) => {
    const { teamId, eventId } = req.params;

    db.run(
      `DELETE FROM schedules WHERE id = ? AND team_id = ?`,
      [eventId, teamId],
      function (err) {
        if (err) {
        return res.status(500).json({ error: 'Kļūda, dzēšot notikumu' });
        }
        if (this.changes === 0) {
          return res.status(404).json({ error: 'Notikums nav atrasts' });
        }
        res.json({ success: true });
      }
    );
  });

  // ==================== ATTENDANCE ROUTES ====================

  // Get attendance for a specific event
  router.get('/teams/:teamId/events/:eventId/attendance', (req, res) => {
    const { teamId, eventId } = req.params;

    db.all(`
      SELECT 
        a.id,
        a.user_id,
        a.event_id,
        a.status,
        a.checked_at,
        a.notes,
        u.name, u.surname,
        (u.name || ' ' || u.surname) as username,
        u.email
      FROM attendance a
      INNER JOIN users u ON a.user_id = u.id
      INNER JOIN schedules s ON a.event_id = s.id
      WHERE s.id = ? AND s.team_id = ?
    `, [eventId, teamId], (err, rows) => {
      if (err) {
        console.error('Kļūda, ielādējot apmeklējumu:', err);
        return res.status(500).json({ error: 'Kļūda, ielādējot apmeklējumu' });
      }
      res.json(rows);
    });
  });

  // Get all players with their attendance status for an event
  router.get('/teams/:teamId/events/:eventId/attendance/full', (req, res) => {
    const { teamId, eventId } = req.params;

    db.all(`
      SELECT 
        u.id as user_id,
        u.name, u.surname,
        (u.name || ' ' || u.surname) as username,
        u.email,
        COALESCE(a.status, 'unmarked') as status,
        a.checked_at,
        a.notes
      FROM users u
      LEFT JOIN attendance a ON u.id = a.user_id AND a.event_id = ?
      WHERE u.team_id = ? AND LOWER(u.role) = 'player'
      ORDER BY u.surname, u.name
    `, [eventId, teamId], (err, rows) => {
      if (err) {
        console.error('Error fetching full attendance:', err);
        return res.status(500).json({ error: 'Kļūda, ielādējot apmeklējumu' });
      }
      res.json(rows);
    });
  });

  // Set/update attendance for a player at an event
  router.post('/teams/:teamId/events/:eventId/attendance', (req, res) => {
    const { teamId, eventId } = req.params;
    const { user_id, status, notes } = req.body;

    const validStatuses = new Set(['present', 'absent', 'late', 'excused']);

    if (!user_id || !status) {
      return res.status(400).json({ error: 'Lietotāja ID un statuss ir obligāti' });
    }

    if (!validStatuses.has(status)) {
      return res.status(400).json({ error: 'Nederīgs apmeklējuma statuss' });
    }

    // Verify event belongs to team
    db.get('SELECT id, event_type FROM schedules WHERE id = ? AND team_id = ?', [eventId, teamId], (err, event) => {
      if (err) {
        return res.status(500).json({ error: 'Datubāzes kļūda' });
      }
      if (!event) {
        return res.status(404).json({ error: 'Notikums nav atrasts' });
      }

      if (String(event.event_type || '').toLowerCase() !== 'practice') {
        return res.status(400).json({ error: 'Apmeklējumu var atzīmēt tikai treniņiem' });
      }

      db.get(
        `SELECT id FROM users WHERE id = ? AND team_id = ? AND LOWER(role) = 'player'`,
        [user_id, teamId],
        (userErr, player) => {
          if (userErr) {
            return res.status(500).json({ error: 'Datubāzes kļūda' });
          }

          if (!player) {
            return res.status(403).json({ error: 'Spēlētājs nav šīs komandas dalībnieks' });
          }

          // Insert or update attendance
          db.run(`
            INSERT INTO attendance (user_id, event_id, status, notes)
            VALUES (?, ?, ?, ?)
            ON CONFLICT(user_id, event_id) DO UPDATE SET
              status = excluded.status,
              notes = excluded.notes,
              checked_at = CURRENT_TIMESTAMP
          `, [user_id, eventId, status, notes || null], function(err) {
            if (err) {
              console.error('Error setting attendance:', err);
              return res.status(500).json({ error: 'Kļūda, saglabājot apmeklējumu' });
            }
            res.json({
              success: true,
              id: this.lastID,
              user_id,
              event_id: eventId,
              status,
              notes
            });
          });
        }
      );
    });
  });

  // Bulk update attendance for an event
  router.post('/teams/:teamId/events/:eventId/attendance/bulk', (req, res) => {
    const { teamId, eventId } = req.params;
    const { attendances } = req.body; // Array of { user_id, status, notes }

    if (!Array.isArray(attendances)) {
      return res.status(400).json({ error: 'Apmeklējuma ierakstiem jābūt masīvam' });
    }

    // Verify event belongs to team
    db.get('SELECT id FROM schedules WHERE id = ? AND team_id = ?', [eventId, teamId], (err, event) => {
      if (err) {
        return res.status(500).json({ error: 'Datubāzes kļūda' });
      }
      if (!event) {
        return res.status(404).json({ error: 'Notikums nav atrasts' });
      }

      const stmt = db.prepare(`
        INSERT INTO attendance (user_id, event_id, status, notes)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(user_id, event_id) DO UPDATE SET
          status = excluded.status,
          notes = excluded.notes,
          checked_at = CURRENT_TIMESTAMP
      `);

      let errors = [];
      attendances.forEach(({ user_id, status, notes }) => {
        stmt.run([user_id, eventId, status, notes || null], (err) => {
          if (err) errors.push({ user_id, error: err.message });
        });
      });

      stmt.finalize((err) => {
        if (err) {
          return res.status(500).json({ error: 'Kļūda, atjauninot apmeklējumu' });
        }
        if (errors.length > 0) {
          return res.status(207).json({ partial: true, errors });
        }
        res.json({ success: true, updated: attendances.length });
      });
    });
  });

  // Delete attendance record
  router.delete('/teams/:teamId/events/:eventId/attendance/:userId', (req, res) => {
    const { teamId, eventId, userId } = req.params;

    db.run(`
      DELETE FROM attendance 
      WHERE user_id = ? AND event_id = ? 
        AND event_id IN (SELECT id FROM schedules WHERE team_id = ?)
    `, [userId, eventId, teamId], function(err) {
      if (err) {
        return res.status(500).json({ error: 'Kļūda, dzēšot apmeklējumu' });
      }
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Apmeklējuma ieraksts nav atrasts' });
      }
      res.json({ success: true });
    });
  });

  // Get attendance statistics for a player
  router.get('/players/:userId/attendance', (req, res) => {
    const { userId } = req.params;
    const { teamId } = req.query;

    let query = `
      SELECT 
        COUNT(*) as total_events,
        SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END) as present_count,
        SUM(CASE WHEN a.status = 'absent' THEN 1 ELSE 0 END) as absent_count,
        SUM(CASE WHEN a.status = 'late' THEN 1 ELSE 0 END) as late_count,
        SUM(CASE WHEN a.status = 'excused' THEN 1 ELSE 0 END) as excused_count
      FROM attendance a
      INNER JOIN schedules s ON a.event_id = s.id
      WHERE a.user_id = ?
    `;
    
    const params = [userId];
    if (teamId) {
      query += ' AND s.team_id = ?';
      params.push(teamId);
    }

    db.get(query, params, (err, row) => {
      if (err) {
        return res.status(500).json({ error: 'Kļūda, ielādējot apmeklējuma statistiku' });
      }
      
      const total = row.total_events || 0;
      const present = row.present_count || 0;
      
      res.json({
        ...row,
        attendance_rate: total > 0 ? Math.round((present / total) * 100) : 0
      });
    });
  });

  // Get attendance statistics for a team (practices only)
  router.get('/teams/:teamId/attendance/stats', (req, res) => {
    const { teamId } = req.params;

    // First get total practices count
    db.get(`
      SELECT COUNT(*) as total_practices 
      FROM schedules 
      WHERE team_id = ? AND LOWER(event_type) = 'practice'
    `, [teamId], (err, practiceCount) => {
      if (err) {
        console.error('Error counting practices:', err);
        return res.status(500).json({ error: 'Datubāzes kļūda' });
      }

      const totalPractices = practiceCount?.total_practices || 0;

      // Get per-player stats for practices only
      db.all(`
        SELECT 
          u.id as user_id,
          (u.name || ' ' || u.surname) as username,
          COUNT(a.id) as total_marked,
          SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END) as present_count,
          SUM(CASE WHEN a.status = 'absent' OR a.status = 'excused' THEN 1 ELSE 0 END) as absent_count,
          SUM(CASE WHEN a.status = 'late' THEN 1 ELSE 0 END) as late_count,
          SUM(CASE WHEN a.status = 'excused' THEN 1 ELSE 0 END) as excused_count
        FROM users u
        LEFT JOIN attendance a ON u.id = a.user_id
        LEFT JOIN schedules s ON a.event_id = s.id AND s.team_id = ? AND LOWER(s.event_type) = 'practice'
        WHERE u.team_id = ? AND LOWER(u.role) = 'player'
        GROUP BY u.id
        ORDER BY present_count DESC
      `, [teamId, teamId], (err, rows) => {
        if (err) {
          console.error('Error fetching team attendance stats:', err);
          return res.status(500).json({ error: 'Kļūda, ielādējot apmeklējuma statistiku' });
        }
        
        // Calculate attendance rate for each player based on total practices
        const stats = rows.map(row => ({
          ...row,
          total_practices: totalPractices,
          attendance_rate: totalPractices > 0 
            ? Math.round((row.present_count / totalPractices) * 100) 
            : 0
        }));
        
        res.json(stats);
      });
    });
  });

  // ==================== END ATTENDANCE ROUTES ====================

   // Get team players
  router.get('/teams/:teamId/players', (req, res) => {
    const teamId = req.params.teamId;
    
    db.all(`
        SELECT 
            u.id, 
            (u.name || ' ' || u.surname) as username,
            u.name,
            u.surname, 
            u.email,
            ps.matches,
            ps.goals,
            ps.assists,
            ps.yellow_cards,
            ps.red_cards
        FROM users u
        LEFT JOIN player_stats ps ON u.id = ps.user_id
        WHERE u.team_id = ? AND LOWER(u.role) = 'player'
    `, [teamId], (err, rows) => {
        if (err) {
            console.error('Error fetching players:', err);
            return res.status(500).json({ error: 'Neizdevās ielādēt komandas spēlētājus' });
        }
        
        // Convert null values to 0 when statistics are missing
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

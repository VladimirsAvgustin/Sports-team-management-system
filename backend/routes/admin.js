const express = require('express');
const router = express.Router();
const db = require('../db');
const jwt = require('jsonwebtoken');

const JWT_SECRET = 'your_jwt_secret';

function authenticateToken(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Autorizācijas tokens nav norādīts' });
  }

  const token = authHeader.split(' ')[1];

  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch (error) {
    return res.status(403).json({ error: 'Nederīgs autorizācijas tokens' });
  }
}

function requireRole(role) {
  return (req, res, next) => {
    if (!req.user || (req.user.role || '').toLowerCase() !== role.toLowerCase()) {
      return res.status(403).json({ error: 'Piekļuve liegta' });
    }

    next();
  };
}

const dbGet = (sql, params = []) => new Promise((resolve, reject) => {
  db.get(sql, params, (error, row) => {
    if (error) reject(error);
    else resolve(row);
  });
});

const dbAll = (sql, params = []) => new Promise((resolve, reject) => {
  db.all(sql, params, (error, rows) => {
    if (error) reject(error);
    else resolve(rows);
  });
});

const dbRun = (sql, params = []) => new Promise((resolve, reject) => {
  db.run(sql, params, function runCallback(error) {
    if (error) reject(error);
    else resolve(this);
  });
});

const normalizeTeamId = (value) => {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const parsedValue = Number(value);
  return Number.isInteger(parsedValue) && parsedValue > 0 ? parsedValue : NaN;
};

const normalizeTeamCode = (value) => (
  typeof value === 'string' ? value.trim().toUpperCase() : ''
);

const getTeamDetails = async (teamId) => dbGet(
  `SELECT
     t.*,
     CASE
       WHEN coach.id IS NULL THEN NULL
       WHEN TRIM(COALESCE(coach.name, '') || ' ' || COALESCE(coach.surname, '')) = '' THEN coach.email
       ELSE TRIM(COALESCE(coach.name, '') || ' ' || COALESCE(coach.surname, ''))
     END AS coach_name,
     (
       SELECT COUNT(*)
       FROM users u
       WHERE u.team_id = t.id
     ) AS member_count,
     (
       SELECT COUNT(*)
       FROM users u
       WHERE u.team_id = t.id AND LOWER(u.role) = 'player'
     ) AS player_count
   FROM teams t
   LEFT JOIN users coach ON coach.id = t.coach_id
   WHERE t.id = ?`,
  [teamId]
);

router.get('/users', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const users = await dbAll('SELECT * FROM users ORDER BY id ASC');
    res.json({ users });
  } catch (error) {
    console.error('Error retrieving users:', error);
    res.status(500).json({ error: 'Kļūda, ielādējot lietotājus' });
  }
});

router.get('/teams', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const teams = await dbAll(
      `SELECT
         t.*,
         CASE
           WHEN coach.id IS NULL THEN NULL
           WHEN TRIM(COALESCE(coach.name, '') || ' ' || COALESCE(coach.surname, '')) = '' THEN coach.email
           ELSE TRIM(COALESCE(coach.name, '') || ' ' || COALESCE(coach.surname, ''))
         END AS coach_name,
         (
           SELECT COUNT(*)
           FROM users u
           WHERE u.team_id = t.id
         ) AS member_count,
         (
           SELECT COUNT(*)
           FROM users u
           WHERE u.team_id = t.id AND LOWER(u.role) = 'player'
         ) AS player_count
       FROM teams t
       LEFT JOIN users coach ON coach.id = t.coach_id
       ORDER BY LOWER(t.name) ASC, t.id ASC`
    );

    res.json({ teams });
  } catch (error) {
    console.error('Error retrieving teams:', error);
    res.status(500).json({ error: 'Kļūda, ielādējot komandas' });
  }
});

router.delete('/users/:id', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    await dbRun('DELETE FROM users WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ error: 'Kļūda, dzēšot lietotāju' });
  }
});

router.put('/users/:id', authenticateToken, requireRole('admin'), async (req, res) => {
  const { name, surname, email, role, team_id } = req.body;
  const normalizedTeamId = normalizeTeamId(team_id);

  if (!String(email || '').trim()) {
    return res.status(400).json({ error: 'E-pasts ir obligāts' });
  }

  if (Number.isNaN(normalizedTeamId)) {
    return res.status(400).json({ error: 'Komandas ID jābūt pozitīvam skaitlim' });
  }

  try {
    if (normalizedTeamId) {
      const team = await dbGet('SELECT id FROM teams WHERE id = ?', [normalizedTeamId]);

      if (!team) {
        return res.status(404).json({ error: 'Atlasītā komanda nav atrasta' });
      }
    }

    const result = await dbRun(
      `UPDATE users
       SET name = ?, surname = ?, email = ?, role = ?, team_id = ?, updatedAt = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [name, surname, email, role, normalizedTeamId, req.params.id]
    );

    if (!result.changes) {
      return res.status(404).json({ error: 'Lietotājs nav atrasts' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ error: 'Kļūda, atjauninot lietotāju' });
  }
});

router.put('/teams/:id', authenticateToken, requireRole('admin'), async (req, res) => {
  const teamId = Number(req.params.id);
  const name = typeof req.body.name === 'string' ? req.body.name.trim() : '';
  const teamCode = normalizeTeamCode(req.body.team_code);

  if (!Number.isInteger(teamId) || teamId <= 0) {
    return res.status(400).json({ error: 'Nederīgs komandas ID' });
  }

  if (!name) {
    return res.status(400).json({ error: 'Komandas nosaukums ir obligāts' });
  }

  if (!teamCode) {
    return res.status(400).json({ error: 'Komandas kods ir obligāts' });
  }

  try {
    const duplicateTeam = await dbGet(
      'SELECT id FROM teams WHERE team_code = ? AND id != ?',
      [teamCode, teamId]
    );

    if (duplicateTeam) {
      return res.status(409).json({ error: 'Komandas kodam jābūt unikālam' });
    }

    const result = await dbRun(
      `UPDATE teams
       SET name = ?, team_code = ?, updatedAt = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [name, teamCode, teamId]
    );

    if (!result.changes) {
      return res.status(404).json({ error: 'Komanda nav atrasta' });
    }

    const team = await getTeamDetails(teamId);
    res.json({ success: true, team });
  } catch (error) {
    console.error('Error updating team:', error);
    res.status(500).json({ error: 'Kļūda, atjauninot komandu' });
  }
});

module.exports = router;

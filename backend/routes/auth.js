const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const JWT_SECRET = 'JWT_SECRET';

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token not provided' });
  }

  const token = authHeader.split(' ')[1];


  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // { id, username, role }
    next();
  } catch (err) {
    console.error('JWT verification failed:', err.message);
    return res.status(403).json({ error: 'Invalid token' });
  }
};

// В auth.js или store:
async function getMyTeam(token) {
  const res = await fetch('/my-team', {
    headers: { Authorization: `Bearer ${token}` }
  });
  const data = await res.json();
  return data.team.id;
}

module.exports = (db) => {
    const router = express.Router();
    router.post('/register', async (req, res) => {
        const { username, email, password, role, teamCode, createTeam, teamName } = req.body;
      
        if (!username || !email || !password) {
          return res.status(400).json({ error: 'Please fill in all fields.' });
        }
      
        const userRole = role || 'user';
      
        db.get('SELECT * FROM users WHERE email = ?', [email], async (err, row) => {
          if (err) {
            console.error(err.message);
            return res.status(500).json({ error: 'Server error' });
          }
      
          if (row) {
            return res.status(400).json({ error: 'User with this email already exists' });
          }
      
          try {
            const hashedPassword = await bcrypt.hash(password, 10);
      
            const insertUser = (team_id = null) => {
              db.run(
                'INSERT INTO users (username, role, email, password, team_id) VALUES (?, ?, ?, ?, ?)',
                [username, userRole, email, hashedPassword, team_id],
                function (insertErr) {
                  if (insertErr) {
                    console.error(insertErr.message);
                    return res.status(500).json({ error: 'Registration error' });
                  }
      
                  const userId = this.lastID;
      
                  if (userRole.toLowerCase() === 'player') {
                    db.run(
                      'INSERT INTO player_stats (user_id, matches, goals, assists, yellow_cards, red_cards) VALUES (?, 0, 0, 0, 0, 0)',
                      [userId],
                      (statsErr) => {
                        if (statsErr) {
                          console.error('Error adding player stats:', statsErr.message);
                        }
                        res.status(201).json({ message: 'User successfully registered', userId });
                      }
                    );
                  } else {
                    res.status(201).json({ message: 'User successfully registered', userId });
                  }
                }
              );
            };
      
            if (createTeam && userRole.toLowerCase() === 'coach') {
              if (!teamName || !teamCode) {
                return res.status(400).json({ error: 'Team name and code are required to create a team.' });
              }
      
              // Временная вставка юзера без team_id
              db.run(
                'INSERT INTO users (username, role, email, password) VALUES (?, ?, ?, ?)',
                [username, userRole, email, hashedPassword],
                function (userInsertErr) {
                  if (userInsertErr) {
                    console.error(userInsertErr.message);
                    return res.status(500).json({ error: 'Error registering coach' });
                  }
      
                  const coachId = this.lastID;
      
                  db.run(
                    'INSERT INTO teams (name, team_code, coach_id) VALUES (?, ?, ?)',
                    [teamName, teamCode, coachId],
                    function (teamInsertErr) {
                      if (teamInsertErr) {
                        console.error(teamInsertErr.message);
                        return res.status(500).json({ error: 'Error creating team' });
                      }
      
                      const teamId = this.lastID;
      
                      // Обновим user.team_id
                      db.run(
                        'UPDATE users SET team_id = ? WHERE id = ?',
                        [teamId, coachId],
                        (updateErr) => {
                          if (updateErr) {
                            console.error(updateErr.message);
                            return res.status(500).json({ error: 'Error updating user with team ID' });
                          }
      
                          res.status(201).json({
                            message: 'Coach and team successfully registered',
                            coachId,
                            team_id: teamId
                          });
                        }
                      );
                    }
                  );
                }
              );
            } else if (teamCode) {
              db.get('SELECT id FROM teams WHERE team_code = ?', [teamCode], (teamErr, teamRow) => {
                if (teamErr) {
                  console.error(teamErr.message);
                  return res.status(500).json({ error: 'Error searching for team' });
                }
      
                const team_id = teamRow ? teamRow.id : null;
                insertUser(team_id);
              });
            } else {
              insertUser(null);
            }
      
          } catch (hashError) {
            console.error(hashError.message);
            res.status(500).json({ error: 'Password hashing error' });
          }
        });
      });
      

  
  router.post('/login', (req, res) => {
    const { username, password } = req.body;
    console.log('Login request:', username, password);
    
    if (!username || !password) {
      return res.status(400).json({ error: 'Enter username and password' });
    }
  
    db.get('SELECT * FROM users WHERE username = ?', [username], async (err, user) => {
      if (err) {
        console.error(err.message);
        return res.status(500).json({ error: 'Server error' });
      }
  
      if (!user) {
        return res.status(400).json({ error: 'User not found' });
      }
  
      try {
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
          return res.status(400).json({ error: 'Incorrect password' });
        }
  
        // === GENERATE TOKEN ===
        const token = jwt.sign(
          { id: user.id, username: user.username, role: user.role },
          'JWT_SECRET',  // <-- use a secret here (or from .env)
          { expiresIn: '7d' } // token is valid for 7 days
        );
  
        res.status(200).json({ 
          message: 'Login successful', 
          user: { id: user.id, username: user.username, role: user.role },
          token // <-- Now the response will include the token
        });
  
      } catch (compareError) {
        console.error(compareError.message);
        res.status(500).json({ error: 'Password verification error' });
      }
    });
  });
  
      
  router.get('/me', (req, res) => {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Token not provided' });
        }

        const token = authHeader.split(' ')[1];

        try {
            const decoded = jwt.verify(token, JWT_SECRET);
            // decoded = { id: ..., username: ..., role: ... }

            res.status(200).json({ user: decoded });
        } catch (error) {
            console.error(error.message);
            res.status(401).json({ error: 'Invalid token' });
        }
    });


    router.post(
      '/teams',
      authenticateToken,            // <-- проверяем токен
      (req, res) => {
        const coachId = req.user.id;    // берём из токена
        const { name, teamCode } = req.body;
  
        if (!name || !teamCode) {
          return res
            .status(400)
            .json({ error: 'Please fill in all fields for the team' });
        }
  
        // 1) Вставляем новую команду
        db.run(
          `INSERT INTO teams (name, team_code, coach_id) VALUES (?, ?, ?)`,
          [name, teamCode, coachId],
          function (err) {
            if (err) {
              console.error('Error creating team:', err.message);
              return res
                .status(500)
                .json({ error: 'Error creating team' });
            }
  
            const newTeamId = this.lastID;
  
            // 2) Обновляем пользователя — ставим ему team_id
            db.run(
              `UPDATE users SET team_id = ? WHERE id = ?`,
              [newTeamId, coachId],
              function (updErr) {
                if (updErr) {
                  console.error(
                    'Error updating user with team ID:',
                    updErr.message
                  );
                  // команда уже создана, но привязка упала
                  return res
                    .status(500)
                    .json({
                      error:
                        'Team created, but failed to assign to coach',
                    });
                }
  
                // Всё ок, возвращаем новый team и обновлённого пользователя
                return res.status(201).json({
                  message: 'Team successfully created',
                  team: {
                    id: newTeamId,
                    name,
                    teamCode,
                    coachId,
                  },
                });
              }
            );
          }
        );
      }
    );
  

router.get('/teams/:id/players', (req, res) => {
    const team_id = req.params.id;

    db.all('SELECT id, username, email FROM users WHERE team_id = ?', [team_id], (err, rows) => {
        if (err) {
            console.error(err.message);
            return res.status(500).json({ error: 'Error fetching players' });
        }

        res.status(200).json({ players: rows });
    });
});

// Get team by coach_id
router.get('/teams/byCoach/:coachId', (req, res) => {
  const coachId = req.params.coachId;

  db.get('SELECT * FROM teams WHERE coach_id = ?', [coachId], (err, team) => {
      if (err) {
          console.error(err.message);
          return res.status(500).json({ error: 'Error searching for team' });
      }

      if (!team) {
          return res.status(404).json({ message: 'Team not found' });
      }

      res.status(200).json({ team });
  });
});


router.get('/teams/:teamId', async (req, res) => {
    const teamId = req.params.teamId;
  
    // Пример для SQLite без ORM:
    db.get('SELECT * FROM teams WHERE id = ?', [teamId], (err, team) => {
      if (err) {
        console.error(err.message);
        return res.status(500).json({ error: 'Error fetching team' });
      }
  
      if (!team) {
        return res.status(404).json({ error: 'Team not found' });
      }
  
      db.all('SELECT * FROM users WHERE team_id = ?', [teamId], (err2, players) => {
        if (err2) {
          console.error(err2.message);
          return res.status(500).json({ error: 'Error fetching players' });
        }
  
        res.status(200).json({ team, players });
      });
    });
  });
  
  router.get('/my-team', authenticateToken, (req, res) => {
    const userId = req.user.id;
  
    if (!userId) {
      return res.status(400).json({ error: 'User ID missing' });
    }
  
    db.get('SELECT team_id FROM users WHERE id = ?', [userId], (err, row) => {
      if (err) {
        console.error('Database error when fetching user:', err.message);
        return res.status(500).json({ error: 'Database error' });
      }
  
      if (!row || !row.team_id) {
        return res.status(404).json({ message: 'User has no team' });
      }
  
      const teamId = row.team_id;
  
      db.get('SELECT * FROM teams WHERE id = ?', [teamId], (teamErr, team) => {
        if (teamErr) {
          console.error('Error fetching team:', teamErr.message);
          return res.status(500).json({ error: 'Error fetching team' });
        }
  
        if (!team) {
          return res.status(404).json({ message: 'Team not found' });
        }
  
        res.status(200).json({ team });
      });
    });
  });

  router.get('/players/:id/stats', (req, res) => {
  const playerId = req.params.id;

  db.get(
    'SELECT * FROM player_stats WHERE user_id = ?',
    [playerId],
    (err, stats) => {
      if (err) {
        console.error(err.message);
        return res.status(500).json({ error: 'Error fetching player stats' });
      }

      res.status(200).json({ 
        stats: stats || { 
          matches: 0, 
          goals: 0, 
          assists: 0, 
          yellow_cards: 0, 
          red_cards: 0 
        } 
      });
    }
  );
});

// Обновление статистики игрока
router.put('/players/:id/stats', authenticateToken, (req, res) => {
  const playerId = req.params.id;
  const { matches, goals, assists, yellow_cards, red_cards } = req.body;

  // Проверяем, что пользователь - тренер команды
  db.get(
    'SELECT team_id FROM users WHERE id = ?',
    [req.user.id],
    (err, coach) => {
      if (err) {
        console.error(err.message);
        return res.status(500).json({ error: 'Error verifying coach' });
      }

      db.get(
        'SELECT team_id FROM users WHERE id = ?',
        [playerId],
        (err, player) => {
          if (err) {
            console.error(err.message);
            return res.status(500).json({ error: 'Error verifying player' });
          }

          // Проверяем, что тренер и игрок из одной команды
          if (coach.team_id !== player.team_id) {
            return res.status(403).json({ error: 'Not authorized to update this player' });
          }

          // Обновляем или создаем статистику
          db.run(
            `INSERT INTO player_stats 
             (user_id, matches, goals, assists, yellow_cards, red_cards) 
             VALUES (?, ?, ?, ?, ?, ?)
             ON CONFLICT(user_id) DO UPDATE SET
               matches = excluded.matches,
               goals = excluded.goals,
               assists = excluded.assists,
               yellow_cards = excluded.yellow_cards,
               red_cards = excluded.red_cards`,
            [playerId, matches, goals, assists, yellow_cards, red_cards],
            function (err) {
              if (err) {
                console.error(err.message);
                return res.status(500).json({ error: 'Error updating stats' });
              }

              res.status(200).json({ message: 'Stats updated successfully' });
            }
          );
        }
      );
    }
  );
});


router.post('/join-team', authenticateToken, async (req, res) => {
  const { teamCode } = req.body;
  const userId = req.user.id;

  // Проверяем, что пользователь еще не состоит в команде
  try {
    const user = await new Promise((resolve, reject) => {
      db.get('SELECT team_id FROM users WHERE id = ?', [userId], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (user && user.team_id) {
      return res.status(400).json({ message: 'User already belongs to a team' });
    }

    // Ищем команду по коду
    const team = await new Promise((resolve, reject) => {
      db.get('SELECT id, name, coach_id FROM teams WHERE team_code = ?', [teamCode], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (!team) {
      return res.status(404).json({ message: 'Team not found with this code' });
    }

    // Обновляем пользователя, добавляя team_id
    await new Promise((resolve, reject) => {
      db.run(
        'UPDATE users SET team_id = ? WHERE id = ?',
        [team.id, userId],
        function(err) {
          if (err) reject(err);
          else resolve();
        }
      );
    });

    // Если пользователь - игрок, создаем для него статистику
    const userRole = await new Promise((resolve, reject) => {
      db.get('SELECT role FROM users WHERE id = ?', [userId], (err, row) => {
        if (err) reject(err);
        else resolve(row?.role);
      });
    });

    if (userRole === 'player') {
      await new Promise((resolve, reject) => {
        db.run(
          'INSERT OR IGNORE INTO player_stats (user_id, matches, goals, assists, yellow_cards, red_cards) VALUES (?, 0, 0, 0, 0, 0)',
          [userId],
          function(err) {
            if (err) reject(err);
            else resolve();
          }
        );
      });
    }

    // Возвращаем обновленные данные пользователя и команды
    const updatedUser = await new Promise((resolve, reject) => {
      db.get(
        'SELECT id, username, email, role, team_id FROM users WHERE id = ?',
        [userId],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });

    res.status(200).json({
      message: 'Successfully joined the team',
      user: updatedUser,
      team: {
        id: team.id,
        name: team.name,
        coach_id: team.coach_id
      }
    });

  } catch (err) {
    console.error('Error joining team:', err);
    res.status(500).json({ message: 'Internal server error', error: err.message });
  }
});

router.delete('/players/:id/team', authenticateToken, async (req, res) => {
  const playerId = req.params.id;
  const coachId = req.user.id;

  try {
    // Проверяем, что запрос от тренера команды
    const team = await new Promise((resolve, reject) => {
      db.get('SELECT id FROM teams WHERE coach_id = ?', [coachId], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (!team) {
      return res.status(403).json({ error: 'Only team coach can remove players' });
    }

    // Проверяем, что игрок в команде тренера
    const player = await new Promise((resolve, reject) => {
      db.get('SELECT id FROM users WHERE id = ? AND team_id = ?', [playerId, team.id], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (!player) {
      return res.status(404).json({ error: 'Player not found in your team' });
    }

    // Удаляем игрока из команды
    await new Promise((resolve, reject) => {
      db.run('UPDATE users SET team_id = NULL WHERE id = ?', [playerId], (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    res.status(200).json({ message: 'Player removed from team' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});
  return router;
};

const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const JWT_SECRET = 'your_jwt_secret';

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token not provided' });
  }

  const token = authHeader.split(' ')[1];


  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // { id, name, surname, role }
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
        const { name, surname, email, password, role, teamCode, createTeam, teamName } = req.body;
      
        if (!name || !surname || !email || !password) {
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
                'INSERT INTO users (name, surname, role, email, password, team_id) VALUES (?, ?, ?, ?, ?, ?)',
                [name, surname, userRole, email, hashedPassword, team_id],
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
                'INSERT INTO users (name, surname, role, email, password) VALUES (?, ?, ?, ?, ?)',
                [name, surname, userRole, email, hashedPassword],
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
      
                      // Create team chat room automatically
                      db.run(
                        'INSERT INTO chat_rooms (team_id, name) VALUES (?, ?)',
                        [teamId, `${teamName} Chat`],
                        (chatErr) => {
                          if (chatErr) {
                            console.error('Error creating team chat room:', chatErr.message);
                          } else {
                            console.log(`Team chat room created for team: ${teamName}`);
                          }
                        }
                      );

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
    const { email, password } = req.body;
    console.log('Login request:', email);
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Enter email and password' });
    }
  
    db.get('SELECT * FROM users WHERE email = ?', [email], async (err, user) => {
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
          { id: user.id, name: user.name, surname: user.surname, role: user.role },
          JWT_SECRET,
          { expiresIn: '7d' }
        );
  
        res.status(200).json({ 
          message: 'Login successful', 
          user: { id: user.id, name: user.name, surname: user.surname, role: user.role },
          token
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
            // decoded = { id: ..., name: ..., surname: ..., role: ... }

            // Fetch team_id and fresh name/surname from database for up-to-date info
            db.get('SELECT name, surname, team_id FROM users WHERE id = ?', [decoded.id], (err, row) => {
              if (err) {
                console.error(err.message);
                return res.status(500).json({ error: 'Error fetching user data' });
              }
              res.status(200).json({ 
                user: { 
                  id: decoded.id,
                  name: row?.name || decoded.name,
                  surname: row?.surname || decoded.surname,
                  role: decoded.role,
                  team_id: row?.team_id || null 
                } 
              });
            });
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
  
            // Create team chat room automatically
            db.run(
              'INSERT INTO chat_rooms (team_id, name) VALUES (?, ?)',
              [newTeamId, `${name} Chat`],
              (chatErr) => {
                if (chatErr) {
                  console.error('Error creating team chat room:', chatErr.message);
                } else {
                  console.log(`Team chat room created for team: ${name}`);
                }
              }
            );

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

    db.all('SELECT id, name, surname, (name || \' \' || surname) as username, email FROM users WHERE team_id = ?', [team_id], (err, rows) => {
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

    // Создаем чат-комнату для команды, если ее еще нет
    const existingRoom = await new Promise((resolve, reject) => {
      db.get('SELECT id FROM chat_rooms WHERE team_id = ?', [team.id], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (!existingRoom) {
      await new Promise((resolve, reject) => {
        db.run(
          'INSERT INTO chat_rooms (team_id, name) VALUES (?, ?)',
          [team.id, `${team.name} Chat`],
          function(err) {
            if (err) reject(err);
            else resolve();
          }
        );
      });
    }

    // Если пользователь - игрок, создаем для него статистику
    const userRole = await new Promise((resolve, reject) => {
      db.get('SELECT role FROM users WHERE id = ?', [userId], (err, row) => {
        if (err) reject(err);
        else resolve(row?.role);
      });
    });

    if (userRole && userRole.toLowerCase() === 'player') {
      await new Promise((resolve, reject) => {
        db.run(
          `INSERT INTO player_stats (user_id, matches, goals, assists, yellow_cards, red_cards, attendance) 
           VALUES (?, 0, 0, 0, 0, 0, 0)
           ON CONFLICT(user_id) DO UPDATE SET
             matches = 0, goals = 0, assists = 0, yellow_cards = 0, red_cards = 0, attendance = 0`,
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
        'SELECT id, name, surname, email, role, team_id FROM users WHERE id = ?',
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

// Get user statistics for homepage dashboard
router.get('/user/stats', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;
    
    let teamCount = 0;
    let upcomingEvents = 0;
    let playerCount = 0;

    if (userRole.toLowerCase() === 'coach') {
      // Get teams coached by this user
      db.get(
        'SELECT COUNT(*) as count FROM teams WHERE coach_id = ?',
        [userId],
        (err, result) => {
          if (err) {
            console.error('Error fetching team count:', err);
            return res.status(500).json({ error: 'Error fetching statistics' });
          }
          
          teamCount = result ? result.count : 0;
          
          // Get upcoming events for coach's teams
          db.get(
            `SELECT COUNT(*) as count FROM schedules 
             WHERE team_id IN (SELECT id FROM teams WHERE coach_id = ?) 
             AND date(event_date) >= date('now')`,
            [userId],
            (err, eventResult) => {
              if (err) {
                console.error('Error fetching events count:', err);
                return res.status(500).json({ error: 'Error fetching statistics' });
              }
              
              upcomingEvents = eventResult ? eventResult.count : 0;
              
              // Get player count in coach's teams
              db.get(
                `SELECT COUNT(*) as count FROM users 
                 WHERE team_id IN (SELECT id FROM teams WHERE coach_id = ?) 
                 AND role = 'Player'`,
                [userId],
                (err, playerResult) => {
                  if (err) {
                    console.error('Error fetching player count:', err);
                    return res.status(500).json({ error: 'Error fetching statistics' });
                  }
                  
                  playerCount = playerResult ? playerResult.count : 0;
                  
                  res.json({
                    teamCount,
                    upcomingEvents,
                    playerCount
                  });
                }
              );
            }
          );
        }
      );
    } else {
      // For players, show different stats
      db.get(
        'SELECT team_id FROM users WHERE id = ?',
        [userId],
        (err, userResult) => {
          if (err) {
            console.error('Error fetching user team:', err);
            return res.status(500).json({ error: 'Error fetching statistics' });
          }
          
          const userTeamId = userResult ? userResult.team_id : null;
          
          if (userTeamId) {
            // Get upcoming events for player's team
            db.get(
              `SELECT COUNT(*) as count FROM schedules 
               WHERE team_id = ? AND date(event_date) >= date('now')`,
              [userTeamId],
              (err, eventResult) => {
                if (err) {
                  console.error('Error fetching events:', err);
                  return res.status(500).json({ error: 'Error fetching statistics' });
                }
                
                upcomingEvents = eventResult ? eventResult.count : 0;
                
                // Get team member count
                db.get(
                  'SELECT COUNT(*) as count FROM users WHERE team_id = ?',
                  [userTeamId],
                  (err, teamResult) => {
                    if (err) {
                      console.error('Error fetching team size:', err);
                      return res.status(500).json({ error: 'Error fetching statistics' });
                    }
                    
                    playerCount = teamResult ? teamResult.count : 0;
                    teamCount = 1; // Player is in one team
                    
                    res.json({
                      teamCount,
                      upcomingEvents,
                      playerCount
                    });
                  }
                );
              }
            );
          } else {
            res.json({
              teamCount: 0,
              upcomingEvents: 0,
              playerCount: 0
            });
          }
        }
      );
    }
  } catch (error) {
    console.error('Error in user stats endpoint:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get upcoming events for user
router.get('/user/upcoming-events', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;
    
    let query;
    let params;
    
    if (userRole.toLowerCase() === 'coach') {
      query = `
        SELECT s.*, t.name as team_name 
        FROM schedules s
        JOIN teams t ON s.team_id = t.id
        WHERE t.coach_id = ? 
        AND date(s.event_date) >= date('now')
        ORDER BY s.event_date ASC, s.event_time ASC
        LIMIT 5`;
      params = [userId];
    } else {
      query = `
        SELECT s.*, t.name as team_name 
        FROM schedules s
        JOIN teams t ON s.team_id = t.id 
        JOIN users u ON u.team_id = t.id
        WHERE u.id = ? 
        AND date(s.event_date) >= date('now')
        ORDER BY s.event_date ASC, s.event_time ASC
        LIMIT 5`;
      params = [userId];
    }
    
    db.all(query, params, (err, events) => {
      if (err) {
        console.error('Error fetching upcoming events:', err);
        return res.status(500).json({ error: 'Error fetching events' });
      }
      
      const formattedEvents = events.map(event => ({
        id: event.id,
        title: event.event_name,
        date: event.event_date,
        time: event.event_time,
        location: event.location,
        team: event.team_name,
        type: event.event_type
      }));
      
      res.json(formattedEvents);
    });
  } catch (error) {
    console.error('Error in upcoming events endpoint:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get recent activity for user
router.get('/user/recent-activity', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;
    
    let activities = [];
    
    if (userRole.toLowerCase() === 'coach') {
      // Get recent activities from coach's teams
      db.all(`
        SELECT 
          'event' as type,
          'created event' as action,
          event_name as description,
          event_date as timestamp,
          'System' as user_name
        FROM schedules s
        JOIN teams t ON s.team_id = t.id
        WHERE t.coach_id = ?
        ORDER BY s.id DESC
        LIMIT 5
      `, [userId], (err, eventActivities) => {
        if (err) {
          console.error('Error fetching activities:', err);
          return res.status(500).json({ error: 'Error fetching activities' });
        }
        
        // Get new team members
        db.all(`
          SELECT 
            'team' as type,
            'joined team' as action,
            t.name as description,
            u.id as timestamp,
            (u.name || ' ' || u.surname) as user_name
          FROM users u
          JOIN teams t ON u.team_id = t.id
          WHERE t.coach_id = ? AND u.role = 'Player'
          ORDER BY u.id DESC
          LIMIT 3
        `, [userId], (err, teamActivities) => {
          if (err) {
            console.error('Error fetching team activities:', err);
            return res.status(500).json({ error: 'Error fetching activities' });
          }
          
          activities = [...eventActivities, ...teamActivities]
            .sort((a, b) => b.timestamp - a.timestamp)
            .slice(0, 5)
            .map((activity, index) => ({
              id: index + 1,
              type: activity.type,
              user: activity.user_name,
              action: `${activity.action}: ${activity.description}`,
              time: formatTimeAgo(activity.timestamp)
            }));
          
          res.json(activities);
        });
      });
    } else {
      // For players, show team-related activities
      db.all(`
        SELECT 
          'event' as type,
          'upcoming event' as action,
          s.event_name as description,
          s.event_date as timestamp,
          'Team' as user_name
        FROM schedules s
        JOIN users u ON u.team_id = s.team_id
        WHERE u.id = ?
        AND date(s.event_date) >= date('now')
        ORDER BY s.event_date ASC
        LIMIT 5
      `, [userId], (err, playerActivities) => {
        if (err) {
          console.error('Error fetching player activities:', err);
          return res.status(500).json({ error: 'Error fetching activities' });
        }
        
        activities = playerActivities.map((activity, index) => ({
          id: index + 1,
          type: activity.type,
          user: activity.user_name,
          action: `${activity.action}: ${activity.description}`,
          time: formatTimeAgo(activity.timestamp)
        }));
        
        res.json(activities);
      });
    }
  } catch (error) {
    console.error('Error in recent activity endpoint:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Helper function to format time ago
function formatTimeAgo(timestamp) {
  const now = new Date();
  const time = new Date(timestamp);
  const diffInHours = (now - time) / (1000 * 60 * 60);
  
  if (diffInHours < 1) return 'Just now';
  if (diffInHours < 24) return `${Math.floor(diffInHours)} hours ago`;
  return `${Math.floor(diffInHours / 24)} days ago`;
}

// Upload team logo (Coach only)
router.post('/teams/:teamId/logo', authenticateToken, (req, res) => {
  const { teamId } = req.params;
  const { logo } = req.body; // Base64 encoded image
  const userId = req.user.id;

  // Check if user is coach of this team
  db.get('SELECT * FROM teams WHERE id = ? AND coach_id = ?', [teamId, userId], (err, team) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    if (!team) {
      return res.status(403).json({ error: 'Only the team coach can upload a logo' });
    }

    // Save logo (base64 string stored directly in DB for simplicity)
    db.run('UPDATE teams SET logo = ? WHERE id = ?', [logo, teamId], function(updateErr) {
      if (updateErr) {
        return res.status(500).json({ error: 'Failed to save logo' });
      }

      res.json({ message: 'Logo uploaded successfully', logo });
    });
  });
});

// Delete team logo (Coach only)
router.delete('/teams/:teamId/logo', authenticateToken, (req, res) => {
  const { teamId } = req.params;
  const userId = req.user.id;

  db.get('SELECT * FROM teams WHERE id = ? AND coach_id = ?', [teamId, userId], (err, team) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    if (!team) {
      return res.status(403).json({ error: 'Only the team coach can delete the logo' });
    }

    db.run('UPDATE teams SET logo = NULL WHERE id = ?', [teamId], function(updateErr) {
      if (updateErr) {
        return res.status(500).json({ error: 'Failed to delete logo' });
      }

      res.json({ message: 'Logo deleted successfully' });
    });
  });
});

// Get team statistics summary
router.get('/teams/:teamId/stats', (req, res) => {
  const { teamId } = req.params;

  // First get the count of past games from schedules
  db.get(
    `SELECT COUNT(*) as gameCount 
     FROM schedules 
     WHERE team_id = ? 
       AND LOWER(event_type) = 'game' 
       AND date(event_date) < date('now')`,
    [teamId],
    (err, gameResult) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }

      const totalMatches = gameResult ? gameResult.gameCount : 0;

      // Get player stats
      db.all(
        `SELECT 
          ps.user_id,
          u.name, u.surname,
          (u.name || ' ' || u.surname) as username,
          ps.matches,
          ps.goals,
          ps.assists,
          ps.yellow_cards,
          ps.red_cards
         FROM player_stats ps
         INNER JOIN users u ON ps.user_id = u.id
         WHERE u.team_id = ? AND u.role != 'Coach'`,
        [teamId],
        (err, players) => {
          if (err) {
            return res.status(500).json({ error: 'Database error' });
          }

          // Get average attendance from attendance table (practices only)
          db.get(`
            SELECT 
              COUNT(CASE WHEN a.status = 'present' THEN 1 END) * 100.0 / 
              NULLIF(COUNT(*), 0) as avgAttendance
            FROM attendance a
            INNER JOIN schedules s ON a.event_id = s.id
            WHERE s.team_id = ? AND LOWER(s.event_type) = 'practice'
          `, [teamId], (err, attendanceResult) => {
            if (err) {
              console.error('Error getting attendance:', err);
            }

            // Calculate team totals
            const stats = {
              totalPlayers: players.length,
              totalMatches: totalMatches,
              totalGoals: players.reduce((sum, p) => sum + (p.goals || 0), 0),
              totalAssists: players.reduce((sum, p) => sum + (p.assists || 0), 0),
              totalYellowCards: players.reduce((sum, p) => sum + (p.yellow_cards || 0), 0),
              totalRedCards: players.reduce((sum, p) => sum + (p.red_cards || 0), 0),
              avgAttendance: attendanceResult?.avgAttendance 
                ? Math.round(attendanceResult.avgAttendance) 
                : 0,
              topScorers: players
                .filter(p => p.goals > 0)
                .sort((a, b) => b.goals - a.goals)
                .slice(0, 5),
              topAssists: players
                .filter(p => p.assists > 0)
                .sort((a, b) => b.assists - a.assists)
                .slice(0, 5),
              goalsDistribution: players
                .filter(p => p.goals > 0)
                .map(p => ({ name: p.name, surname: p.surname, goals: p.goals }))
            };

            res.json(stats);
          });
        }
      );
    }
  );
});

  return router;
};

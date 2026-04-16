const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const JWT_SECRET = 'your_jwt_secret';
const emailUser = process.env.EMAIL_USER || 'vladimiravgustin123@gmail.com';
const emailPass = (process.env.EMAIL_PASS || '').replace(/\s+/g, '');
const MAX_IMAGE_DATA_LENGTH = 3_200_000;

const mailTransporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: emailUser,
    pass: emailPass
  }
});

const normalizeImageData = (value) => (typeof value === 'string' ? value.trim() : '');
const isSupportedImageDataUrl = (value) => /^data:image\/(png|jpe?g|webp|gif);base64,/i.test(value);
const isValidImagePayload = (value) => Boolean(value) && isSupportedImageDataUrl(value) && value.length <= MAX_IMAGE_DATA_LENGTH;

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
    const normalizeRole = (role) => (typeof role === 'string' ? role.trim().toLowerCase() : '');
    const dbGet = (sql, params = []) => new Promise((resolve, reject) => {
      db.get(sql, params, (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
    const dbAll = (sql, params = []) => new Promise((resolve, reject) => {
      db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
    const dbRun = (sql, params = []) => new Promise((resolve, reject) => {
      db.run(sql, params, function runCallback(err) {
        if (err) reject(err);
        else resolve(this);
      });
    });
    const getUserProfile = (userId) => dbGet(
      'SELECT id, name, surname, email, role, team_id, avatar FROM users WHERE id = ?',
      [userId]
    );
    const getTeamById = (teamId) => dbGet('SELECT * FROM teams WHERE id = ?', [teamId]);
    const getManagedTeamMembership = async (userId, teamId) => {
      const user = await getUserProfile(userId);

      if (!user || normalizeRole(user.role) !== 'coach') {
        return null;
      }

      return Number(user.team_id) === Number(teamId) ? user : null;
    };
    const getOwnedTeam = async (userId, teamId) => {
      const team = await getTeamById(teamId);
      return team && Number(team.coach_id) === Number(userId) ? team : null;
    };
    const ensureTeamChatRoom = async (teamId, teamName) => {
      const existingRoom = await dbGet('SELECT id FROM chat_rooms WHERE team_id = ?', [teamId]);

      if (!existingRoom) {
        await dbRun(
          'INSERT INTO chat_rooms (team_id, name) VALUES (?, ?)',
          [teamId, `${teamName} Chat`]
        );
      }
    };
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
              if (userRole.toLowerCase() === 'coach') {
                return res.status(400).json({
                  error: 'Coaches must register first and then send a join request from the app.'
                });
              }

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

  router.post('/forgot-password', (req, res) => {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    db.get('SELECT id, email FROM users WHERE email = ?', [email], (err, user) => {
      if (err) {
        console.error('Forgot password lookup error:', err.message);
        return res.status(500).json({ error: 'Server error' });
      }

      // Return the same message even when user does not exist to avoid email enumeration.
      if (!user) {
        return res.status(200).json({ message: 'If the account exists, a reset link has been sent to email.' });
      }

      const rawToken = crypto.randomBytes(32).toString('hex');
      const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
      const expiresAt = Math.floor(Date.now() / 1000) + (60 * 60); // 1 hour
      const frontendBaseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      const resetLink = `${frontendBaseUrl}/reset-password?token=${rawToken}`;

      db.serialize(() => {
        db.run('DELETE FROM password_resets WHERE user_id = ? OR expires_at <= strftime(\'%s\', \'now\')', [user.id]);
        db.run(
          'INSERT INTO password_resets (user_id, token_hash, expires_at) VALUES (?, ?, ?)',
          [user.id, tokenHash, expiresAt],
          async (insertErr) => {
            if (insertErr) {
              console.error('Forgot password token insert error:', insertErr.message);
              return res.status(500).json({ error: 'Server error' });
            }

            try {
              await mailTransporter.sendMail({
                from: `"Sports Team Management" <${emailUser}>`,
                to: user.email,
                subject: 'Password reset request',
                html: `
                  <p>You requested a password reset.</p>
                  <p>Click the link below to set a new password:</p>
                  <p><a href="${resetLink}">${resetLink}</a></p>
                  <p>This link is valid for 1 hour.</p>
                  <p>If you did not request this, ignore this email.</p>
                `
              });

              return res.status(200).json({ message: 'If the account exists, a reset link has been sent to email.' });
            } catch (mailErr) {
              console.error('Forgot password mail error:', mailErr.message);

              if (process.env.NODE_ENV !== 'production') {
                return res.status(200).json({
                  message: 'Password reset request was created, but email delivery is unavailable on this server right now.',
                  resetLink
                });
              }

              return res.status(500).json({ error: 'Failed to send reset email' });
            }
          }
        );
      });
    });
  });

  router.post('/reset-password', async (req, res) => {
    const { token, password } = req.body;

    if (!token || !password) {
      return res.status(400).json({ error: 'Token and new password are required' });
    }

    if (String(password).length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long' });
    }

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    db.get(
      `SELECT pr.id, pr.user_id
       FROM password_resets pr
       WHERE pr.token_hash = ?
         AND pr.used_at IS NULL
         AND pr.expires_at > strftime('%s', 'now')`,
      [tokenHash],
      async (findErr, resetRow) => {
        if (findErr) {
          console.error('Reset password lookup error:', findErr.message);
          return res.status(500).json({ error: 'Server error' });
        }

        if (!resetRow) {
          return res.status(400).json({ error: 'Reset token is invalid or expired' });
        }

        try {
          const hashedPassword = await bcrypt.hash(password, 10);

          db.serialize(() => {
            db.run('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, resetRow.user_id], (updateErr) => {
              if (updateErr) {
                console.error('Reset password update user error:', updateErr.message);
                return res.status(500).json({ error: 'Server error' });
              }

              db.run(
                'UPDATE password_resets SET used_at = strftime(\'%s\', \'now\') WHERE id = ?',
                [resetRow.id],
                (markErr) => {
                  if (markErr) {
                    console.error('Reset password mark token error:', markErr.message);
                    return res.status(500).json({ error: 'Server error' });
                  }

                  db.run('DELETE FROM password_resets WHERE user_id = ? AND id != ?', [resetRow.user_id, resetRow.id]);
                  return res.status(200).json({ message: 'Password reset successfully' });
                }
              );
            });
          });
        } catch (hashErr) {
          console.error('Reset password hash error:', hashErr.message);
          return res.status(500).json({ error: 'Server error' });
        }
      }
    );
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

            // Fetch fresh profile fields from database for up-to-date info
            db.get('SELECT name, surname, email, avatar, team_id, createdAt AS created_at FROM users WHERE id = ?', [decoded.id], (err, row) => {
              if (err) {
                console.error(err.message);
                return res.status(500).json({ error: 'Error fetching user data' });
              }
              res.status(200).json({ 
                user: { 
                  id: decoded.id,
                  name: row?.name || decoded.name,
                  surname: row?.surname || decoded.surname,
                  email: row?.email || null,
                  avatar: row?.avatar || null,
                  role: decoded.role,
                  team_id: row?.team_id || null,
                  created_at: row?.created_at || null
                } 
              });
            });
        } catch (error) {
            console.error(error.message);
            res.status(401).json({ error: 'Invalid token' });
        }
    });


    router.post('/avatar', authenticateToken, (req, res) => {
      const userId = req.user.id;
      const avatar = normalizeImageData(req.body?.avatar);

      if (!isValidImagePayload(avatar)) {
        return res.status(400).json({ error: 'Invalid avatar image' });
      }

      db.run('UPDATE users SET avatar = ? WHERE id = ?', [avatar, userId], function (err) {
        if (err) {
          console.error('Error saving user avatar:', err.message);
          return res.status(500).json({ error: 'Failed to save avatar' });
        }

        return res.status(200).json({ message: 'Avatar uploaded successfully', avatar });
      });
    });

    router.delete('/avatar', authenticateToken, (req, res) => {
      const userId = req.user.id;

      db.run('UPDATE users SET avatar = NULL WHERE id = ?', [userId], function (err) {
        if (err) {
          console.error('Error deleting user avatar:', err.message);
          return res.status(500).json({ error: 'Failed to delete avatar' });
        }

        return res.status(200).json({ message: 'Avatar deleted successfully' });
      });
    });

    router.post('/players/:id/avatar', authenticateToken, (req, res) => {
      const playerId = req.params.id;
      const coachId = req.user.id;
      const avatar = normalizeImageData(req.body?.avatar);

      if (!isValidImagePayload(avatar)) {
        return res.status(400).json({ error: 'Invalid avatar image' });
      }

      db.get('SELECT team_id, role FROM users WHERE id = ?', [coachId], (coachErr, coach) => {
        if (coachErr) {
          console.error('Error fetching coach for avatar upload:', coachErr.message);
          return res.status(500).json({ error: 'Database error' });
        }

        if (!coach || String(coach.role || '').toLowerCase() !== 'coach' || !coach.team_id) {
          return res.status(403).json({ error: 'Only a coach from this team can update player avatars' });
        }

        db.get('SELECT id, team_id, role FROM users WHERE id = ?', [playerId], (playerErr, player) => {
          if (playerErr) {
            console.error('Error fetching player for avatar upload:', playerErr.message);
            return res.status(500).json({ error: 'Database error' });
          }

          if (!player || player.team_id !== coach.team_id || String(player.role || '').toLowerCase() !== 'player') {
            return res.status(404).json({ error: 'Player not found in your team' });
          }

          db.run('UPDATE users SET avatar = ? WHERE id = ?', [avatar, playerId], function (updateErr) {
            if (updateErr) {
              console.error('Error saving player avatar:', updateErr.message);
              return res.status(500).json({ error: 'Failed to save avatar' });
            }

            return res.status(200).json({ message: 'Player avatar uploaded successfully', avatar });
          });
        });
      });
    });

    router.delete('/players/:id/avatar', authenticateToken, (req, res) => {
      const playerId = req.params.id;
      const coachId = req.user.id;

      db.get('SELECT team_id, role FROM users WHERE id = ?', [coachId], (coachErr, coach) => {
        if (coachErr) {
          console.error('Error fetching coach for avatar delete:', coachErr.message);
          return res.status(500).json({ error: 'Database error' });
        }

        if (!coach || String(coach.role || '').toLowerCase() !== 'coach' || !coach.team_id) {
          return res.status(403).json({ error: 'Only a coach from this team can update player avatars' });
        }

        db.get('SELECT id, team_id, role FROM users WHERE id = ?', [playerId], (playerErr, player) => {
          if (playerErr) {
            console.error('Error fetching player for avatar delete:', playerErr.message);
            return res.status(500).json({ error: 'Database error' });
          }

          if (!player || player.team_id !== coach.team_id || String(player.role || '').toLowerCase() !== 'player') {
            return res.status(404).json({ error: 'Player not found in your team' });
          }

          db.run('UPDATE users SET avatar = NULL WHERE id = ?', [playerId], function (updateErr) {
            if (updateErr) {
              console.error('Error deleting player avatar:', updateErr.message);
              return res.status(500).json({ error: 'Failed to delete avatar' });
            }

            return res.status(200).json({ message: 'Player avatar deleted successfully' });
          });
        });
      });
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

    db.all('SELECT id, name, surname, (name || \' \' || surname) as username, email, role, avatar FROM users WHERE team_id = ?', [team_id], (err, rows) => {
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
  
      db.all('SELECT id, name, surname, email, role, team_id, avatar FROM users WHERE team_id = ?', [teamId], (err2, players) => {
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

  (async () => {
    try {
      const coach = await getUserProfile(req.user.id);

      if (!coach || normalizeRole(coach.role) !== 'coach' || !coach.team_id) {
        return res.status(403).json({ error: 'Only team coaches can update player statistics' });
      }

      const player = await dbGet('SELECT team_id, role FROM users WHERE id = ?', [playerId]);

      if (!player || Number(player.team_id) !== Number(coach.team_id) || normalizeRole(player.role) !== 'player') {
        return res.status(403).json({ error: 'Not authorized to update this player' });
      }

      await dbRun(
        `INSERT INTO player_stats
         (user_id, matches, goals, assists, yellow_cards, red_cards)
         VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT(user_id) DO UPDATE SET
           matches = excluded.matches,
           goals = excluded.goals,
           assists = excluded.assists,
           yellow_cards = excluded.yellow_cards,
           red_cards = excluded.red_cards`,
        [playerId, matches, goals, assists, yellow_cards, red_cards]
      );

      return res.status(200).json({ message: 'Stats updated successfully' });
    } catch (err) {
      console.error('Error updating player stats:', err.message);
      return res.status(500).json({ error: 'Error updating stats' });
    }
  })();
  return;

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
  (async () => {
    try {
      const normalizedTeamCode = typeof teamCode === 'string' ? teamCode.trim().toUpperCase() : '';

      if (!normalizedTeamCode) {
        return res.status(400).json({ message: 'Team code is required' });
      }

      const user = await getUserProfile(userId);

      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      if (user.team_id) {
        return res.status(400).json({ message: 'User already belongs to a team' });
      }

      const team = await dbGet('SELECT id, name, coach_id FROM teams WHERE team_code = ?', [normalizedTeamCode]);

      if (!team) {
        return res.status(404).json({ message: 'Team not found with this code' });
      }

      if (normalizeRole(user.role) === 'coach') {
        const ownedTeam = await dbGet('SELECT id FROM teams WHERE coach_id = ?', [userId]);

        if (ownedTeam) {
          return res.status(409).json({ message: 'Main coaches cannot join another team as assistant coaches.' });
        }

        const pendingRequest = await dbGet(
          `SELECT cjr.id, cjr.team_id, t.name AS team_name
           FROM coach_join_requests cjr
           JOIN teams t ON t.id = cjr.team_id
           WHERE cjr.requester_user_id = ? AND cjr.status = 'pending'
           ORDER BY cjr.id DESC
           LIMIT 1`,
          [userId]
        );

        if (pendingRequest) {
          if (Number(pendingRequest.team_id) === Number(team.id)) {
            return res.status(409).json({ message: 'Your assistant coach request for this team is already pending.' });
          }

          return res.status(409).json({
            message: `You already have a pending assistant coach request for ${pendingRequest.team_name}.`
          });
        }

        await dbRun(
          `INSERT INTO coach_join_requests (team_id, requester_user_id, status)
           VALUES (?, ?, 'pending')`,
          [team.id, userId]
        );

        return res.status(202).json({
          message: 'Assistant coach request sent to the main coach.',
          requestCreated: true
        });
      }

      await dbRun('UPDATE users SET team_id = ? WHERE id = ?', [team.id, userId]);
      await ensureTeamChatRoom(team.id, team.name);

      if (normalizeRole(user.role) === 'player') {
        await dbRun(
          `INSERT INTO player_stats (user_id, matches, goals, assists, yellow_cards, red_cards, attendance)
           VALUES (?, 0, 0, 0, 0, 0, 0)
           ON CONFLICT(user_id) DO UPDATE SET
             matches = 0,
             goals = 0,
             assists = 0,
             yellow_cards = 0,
             red_cards = 0,
             attendance = 0`,
          [userId]
        );
      }

      const updatedUser = await getUserProfile(userId);

      return res.status(200).json({
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
      return res.status(500).json({ message: 'Internal server error', error: err.message });
    }
  })();
  return;

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
        'SELECT id, name, surname, email, avatar, role, team_id FROM users WHERE id = ?',
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

router.get('/teams/:teamId/coach-requests', authenticateToken, async (req, res) => {
  const { teamId } = req.params;

  try {
    const ownedTeam = await getOwnedTeam(req.user.id, teamId);

    if (!ownedTeam) {
      return res.status(403).json({ error: 'Only the main coach can review assistant coach requests' });
    }

    const requests = await dbAll(
      `SELECT
         cjr.id,
         cjr.team_id,
         cjr.requester_user_id,
         cjr.status,
         cjr.created_at,
         u.name,
         u.surname,
         u.email,
         u.avatar
       FROM coach_join_requests cjr
       JOIN users u ON u.id = cjr.requester_user_id
       WHERE cjr.team_id = ? AND cjr.status = 'pending'
       ORDER BY datetime(cjr.created_at) ASC, cjr.id ASC`,
      [teamId]
    );

    res.status(200).json({ requests });
  } catch (error) {
    console.error('Error loading coach join requests:', error);
    res.status(500).json({ error: 'Failed to load coach join requests' });
  }
});

router.post('/teams/:teamId/coach-requests/:requestId/approve', authenticateToken, async (req, res) => {
  const { teamId, requestId } = req.params;

  try {
    const ownedTeam = await getOwnedTeam(req.user.id, teamId);

    if (!ownedTeam) {
      return res.status(403).json({ error: 'Only the main coach can approve assistant coach requests' });
    }

    const request = await dbGet(
      `SELECT id, team_id, requester_user_id, status
       FROM coach_join_requests
       WHERE id = ? AND team_id = ?`,
      [requestId, teamId]
    );

    if (!request || request.status !== 'pending') {
      return res.status(404).json({ error: 'Pending coach request not found' });
    }

    const requester = await getUserProfile(request.requester_user_id);

    if (!requester || normalizeRole(requester.role) !== 'coach') {
      return res.status(400).json({ error: 'Only coach accounts can be approved as assistants' });
    }

    if (requester.team_id) {
      return res.status(409).json({ error: 'This coach already belongs to a team' });
    }

    const requesterOwnedTeam = await dbGet('SELECT id FROM teams WHERE coach_id = ?', [request.requester_user_id]);

    if (requesterOwnedTeam) {
      return res.status(409).json({ error: 'A main coach cannot also join another team as assistant' });
    }

    await dbRun('UPDATE users SET team_id = ? WHERE id = ?', [teamId, request.requester_user_id]);
    await ensureTeamChatRoom(teamId, ownedTeam.name);
    await dbRun(
      `UPDATE coach_join_requests
       SET status = 'approved',
           updated_at = CURRENT_TIMESTAMP,
           reviewed_by = ?,
           reviewed_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [req.user.id, requestId]
    );
    await dbRun(
      `UPDATE coach_join_requests
       SET status = 'rejected',
           updated_at = CURRENT_TIMESTAMP,
           reviewed_by = ?,
           reviewed_at = CURRENT_TIMESTAMP
       WHERE requester_user_id = ? AND status = 'pending' AND id != ?`,
      [req.user.id, request.requester_user_id, requestId]
    );

    res.status(200).json({ message: 'Assistant coach approved successfully' });
  } catch (error) {
    console.error('Error approving coach request:', error);
    res.status(500).json({ error: 'Failed to approve coach request' });
  }
});

router.post('/teams/:teamId/coach-requests/:requestId/reject', authenticateToken, async (req, res) => {
  const { teamId, requestId } = req.params;

  try {
    const ownedTeam = await getOwnedTeam(req.user.id, teamId);

    if (!ownedTeam) {
      return res.status(403).json({ error: 'Only the main coach can reject assistant coach requests' });
    }

    const request = await dbGet(
      `SELECT id, status
       FROM coach_join_requests
       WHERE id = ? AND team_id = ?`,
      [requestId, teamId]
    );

    if (!request || request.status !== 'pending') {
      return res.status(404).json({ error: 'Pending coach request not found' });
    }

    await dbRun(
      `UPDATE coach_join_requests
       SET status = 'rejected',
           updated_at = CURRENT_TIMESTAMP,
           reviewed_by = ?,
           reviewed_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [req.user.id, requestId]
    );

    res.status(200).json({ message: 'Assistant coach request rejected' });
  } catch (error) {
    console.error('Error rejecting coach request:', error);
    res.status(500).json({ error: 'Failed to reject coach request' });
  }
});

router.delete('/players/:id/team', authenticateToken, async (req, res) => {
  const playerId = req.params.id;
  const coachId = req.user.id;

  (async () => {
    try {
      const ownerTeam = await dbGet('SELECT id, name FROM teams WHERE coach_id = ?', [coachId]);

      if (!ownerTeam) {
        return res.status(403).json({ error: 'Only the main coach can remove players' });
      }

      const player = await dbGet('SELECT id, role FROM users WHERE id = ? AND team_id = ?', [playerId, ownerTeam.id]);

      if (!player || normalizeRole(player.role) !== 'player') {
        return res.status(404).json({ error: 'Player not found in your team' });
      }

      await dbRun('UPDATE users SET team_id = NULL WHERE id = ?', [playerId]);
      return res.status(200).json({ message: 'Player removed from team' });
    } catch (err) {
      console.error('Error removing player from team:', err);
      return res.status(500).json({ error: 'Server error' });
    }
  })();
  return;

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

    const normalizedRole = normalizeRole(userRole);
    const user = await getUserProfile(userId);
    const userTeamId = Number(user?.team_id) || null;

    if (normalizedRole === 'coach') {
      if (!userTeamId) {
        return res.json({ teamCount: 0, upcomingEvents: 0, playerCount: 0 });
      }

      const [eventResult, playerResult] = await Promise.all([
        dbGet(
          `SELECT COUNT(*) as count FROM schedules
           WHERE team_id = ? AND date(event_date) >= date('now')`,
          [userTeamId]
        ),
        dbGet(
          `SELECT COUNT(*) as count FROM users
           WHERE team_id = ? AND role = 'Player'`,
          [userTeamId]
        )
      ]);

      return res.json({
        teamCount: 1,
        upcomingEvents: eventResult ? eventResult.count : 0,
        playerCount: playerResult ? playerResult.count : 0
      });
    }

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

    if (normalizeRole(userRole) === 'coach') {
      const user = await getUserProfile(userId);
      const teamId = Number(user?.team_id) || null;

      if (!teamId) {
        return res.json([]);
      }

      const events = await dbAll(
        `SELECT s.*, t.name as team_name
         FROM schedules s
         JOIN teams t ON s.team_id = t.id
         WHERE s.team_id = ?
         AND date(s.event_date) >= date('now')
         ORDER BY s.event_date ASC, s.event_time ASC
         LIMIT 5`,
        [teamId]
      );

      return res.json(events.map((event) => ({
        id: event.id,
        title: event.event_name,
        date: event.event_date,
        time: event.event_time,
        location: event.location,
        team: event.team_name,
        type: event.event_type
      })));
    }
    
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

    if (normalizeRole(userRole) === 'coach') {
      const user = await getUserProfile(userId);
      const teamId = Number(user?.team_id) || null;

      if (!teamId) {
        return res.json([]);
      }

      const [eventActivities, teamActivities] = await Promise.all([
        dbAll(
          `SELECT
             'event' as type,
             'created event' as action,
             event_name as description,
             event_date as timestamp,
             'System' as user_name
           FROM schedules
           WHERE team_id = ?
           ORDER BY id DESC
           LIMIT 5`,
          [teamId]
        ),
        dbAll(
          `SELECT
             'team' as type,
             'joined team' as action,
             t.name as description,
             u.createdAt as timestamp,
             (u.name || ' ' || u.surname) as user_name
           FROM users u
           JOIN teams t ON u.team_id = t.id
           WHERE u.team_id = ? AND u.role = 'Player'
           ORDER BY u.id DESC
           LIMIT 3`,
          [teamId]
        )
      ]);

      activities = [...eventActivities, ...teamActivities]
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, 5)
        .map((activity, index) => ({
          id: index + 1,
          type: activity.type,
          user: activity.user_name,
          action: `${activity.action}: ${activity.description}`,
          time: formatTimeAgo(activity.timestamp)
        }));

      return res.json(activities);
    }
    
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

  (async () => {
    try {
      const coach = await getManagedTeamMembership(userId, teamId);

      if (!coach) {
        return res.status(403).json({ error: 'Only coaches from this team can upload a logo' });
      }

      await dbRun('UPDATE teams SET logo = ? WHERE id = ?', [logo, teamId]);
      return res.json({ message: 'Logo uploaded successfully', logo });
    } catch (error) {
      console.error('Error uploading team logo:', error);
      return res.status(500).json({ error: 'Failed to save logo' });
    }
  })();
  return;

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

  (async () => {
    try {
      const coach = await getManagedTeamMembership(userId, teamId);

      if (!coach) {
        return res.status(403).json({ error: 'Only coaches from this team can delete the logo' });
      }

      await dbRun('UPDATE teams SET logo = NULL WHERE id = ?', [teamId]);
      return res.json({ message: 'Logo deleted successfully' });
    } catch (error) {
      console.error('Error deleting team logo:', error);
      return res.status(500).json({ error: 'Failed to delete logo' });
    }
  })();
  return;

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

const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');

module.exports = (db) => {
  // Get or create chat room for a team
  router.get('/team/:teamId/room', authenticateToken, (req, res) => {
    const { teamId } = req.params;
    const userId = req.user.id;

    // Check if user is member of the team
    db.get(
      `SELECT * FROM users WHERE id = ? AND team_id = ?`,
      [userId, teamId],
      (err, userTeam) => {
        if (err) {
          return res.status(500).json({ error: 'Database error' });
        }

        if (!userTeam) {
          return res.status(403).json({ error: 'Not a member of this team' });
        }

        // Get or create chat room for the team
        db.get(
          `SELECT * FROM chat_rooms WHERE team_id = ?`,
          [teamId],
          (err, room) => {
            if (err) {
              return res.status(500).json({ error: 'Database error' });
            }

            if (room) {
              return res.json(room);
            }

            // Create new chat room
            db.get(
              `SELECT name FROM teams WHERE id = ?`,
              [teamId],
              (err, team) => {
                if (err) {
                  return res.status(500).json({ error: 'Database error' });
                }

                const roomName = team ? `${team.name} Chat` : `Team ${teamId} Chat`;

                db.run(
                  `INSERT INTO chat_rooms (team_id, name) VALUES (?, ?)`,
                  [teamId, roomName],
                  function(err) {
                    if (err) {
                      return res.status(500).json({ error: 'Failed to create chat room' });
                    }

                    res.json({
                      id: this.lastID,
                      team_id: teamId,
                      name: roomName,
                      created_at: new Date().toISOString()
                    });
                  }
                );
              }
            );
          }
        );
      }
    );
  });

  // Get chat messages for a room
  router.get('/room/:roomId/messages', authenticateToken, (req, res) => {
    const { roomId } = req.params;
    const { limit = 50, before } = req.query;
    const userId = req.user.id;

    // Verify user has access to this chat room
    db.get(
      `SELECT cr.* FROM chat_rooms cr
       INNER JOIN teams t ON cr.team_id = t.id
       INNER JOIN users u ON u.team_id = t.id
       WHERE cr.id = ? AND u.id = ?`,
      [roomId, userId],
      (err, room) => {
        if (err) {
          return res.status(500).json({ error: 'Database error' });
        }

        if (!room) {
          return res.status(403).json({ error: 'Access denied' });
        }

        let query = `SELECT * FROM messages WHERE room_id = ?`;
        const params = [roomId];

        if (before) {
          query += ` AND created_at < ?`;
          params.push(before);
        }

        query += ` ORDER BY created_at DESC LIMIT ?`;
        params.push(parseInt(limit));

        db.all(query, params, (err, messages) => {
          if (err) {
            return res.status(500).json({ error: 'Database error' });
          }

          res.json(messages.reverse());
        });
      }
    );
  });

  // Get all chat rooms for user's teams
  router.get('/rooms', authenticateToken, (req, res) => {
    const userId = req.user.id;

    db.all(
      `SELECT cr.*, t.name as team_name, 
       (SELECT COUNT(*) FROM messages WHERE room_id = cr.id) as message_count,
       (SELECT message FROM messages WHERE room_id = cr.id ORDER BY created_at DESC LIMIT 1) as last_message,
       (SELECT created_at FROM messages WHERE room_id = cr.id ORDER BY created_at DESC LIMIT 1) as last_message_time
       FROM chat_rooms cr
       INNER JOIN teams t ON cr.team_id = t.id
       INNER JOIN users u ON u.team_id = t.id
       WHERE u.id = ?
       ORDER BY last_message_time DESC`,
      [userId],
      (err, rooms) => {
        if (err) {
          return res.status(500).json({ error: 'Database error' });
        }

        res.json(rooms);
      }
    );
  });

  // Delete a message (only the sender can delete)
  router.delete('/message/:messageId', authenticateToken, (req, res) => {
    const { messageId } = req.params;
    const userId = req.user.id;

    db.get(
      `SELECT * FROM messages WHERE id = ? AND user_id = ?`,
      [messageId, userId],
      (err, message) => {
        if (err) {
          return res.status(500).json({ error: 'Database error' });
        }

        if (!message) {
          return res.status(403).json({ error: 'Cannot delete this message' });
        }

        db.run(
          `DELETE FROM messages WHERE id = ?`,
          [messageId],
          (err) => {
            if (err) {
              return res.status(500).json({ error: 'Failed to delete message' });
            }

            res.json({ message: 'Message deleted successfully' });
          }
        );
      }
    );
  });

  // ========== Direct Messages Routes ==========

  // Get all users for starting a DM
  router.get('/users', authenticateToken, (req, res) => {
    const userId = req.user.id;

    db.all(
      `SELECT id, username, email, role FROM users WHERE id != ? ORDER BY username`,
      [userId],
      (err, users) => {
        if (err) {
          return res.status(500).json({ error: 'Database error' });
        }

        res.json(users);
      }
    );
  });

  // Get team members for DM (users in the same team)
  router.get('/team-members', authenticateToken, (req, res) => {
    const userId = req.user.id;

    db.all(
      `SELECT u.id, u.username, u.email, u.role, t.name as team_name
       FROM users u
       LEFT JOIN teams t ON u.team_id = t.id
       WHERE u.team_id IN (SELECT team_id FROM users WHERE id = ?) 
       AND u.id != ?
       ORDER BY u.username`,
      [userId, userId],
      (err, members) => {
        if (err) {
          return res.status(500).json({ error: 'Database error' });
        }

        res.json(members);
      }
    );
  });

  // Get direct messages with a specific user
  router.get('/dm/:userId', authenticateToken, (req, res) => {
    const currentUserId = req.user.id;
    const otherUserId = req.params.userId;
    const { limit = 50 } = req.query;

    db.all(
      `SELECT dm.*, 
       sender.username as sender_username,
       receiver.username as receiver_username
       FROM direct_messages dm
       INNER JOIN users sender ON dm.sender_id = sender.id
       INNER JOIN users receiver ON dm.receiver_id = receiver.id
       WHERE (dm.sender_id = ? AND dm.receiver_id = ?)
       OR (dm.sender_id = ? AND dm.receiver_id = ?)
       ORDER BY dm.created_at ASC
       LIMIT ?`,
      [currentUserId, otherUserId, otherUserId, currentUserId, parseInt(limit)],
      (err, messages) => {
        if (err) {
          return res.status(500).json({ error: 'Database error' });
        }

        res.json(messages);
      }
    );
  });

  // Get all DM conversations (list of users you've chatted with)
  router.get('/dm-conversations', authenticateToken, (req, res) => {
    const userId = req.user.id;

    // First, get all unique users we've chatted with
    db.all(
      `SELECT DISTINCT
       CASE 
         WHEN dm.sender_id = ? THEN dm.receiver_id
         ELSE dm.sender_id
       END as user_id
       FROM direct_messages dm
       WHERE dm.sender_id = ? OR dm.receiver_id = ?`,
      [userId, userId, userId],
      (err, userIds) => {
        if (err) {
          console.error('Error fetching DM user IDs:', err);
          return res.status(500).json({ error: 'Database error' });
        }

        if (userIds.length === 0) {
          return res.json([]);
        }

        // Now get details for each conversation
        const conversations = [];
        let completed = 0;

        userIds.forEach(({ user_id }) => {
          db.get(
            `SELECT 
             u.id as user_id,
             u.username,
             u.email,
             (SELECT message FROM direct_messages 
              WHERE (sender_id = ? AND receiver_id = ?) 
              OR (sender_id = ? AND receiver_id = ?)
              ORDER BY created_at DESC LIMIT 1) as last_message,
             (SELECT created_at FROM direct_messages 
              WHERE (sender_id = ? AND receiver_id = ?) 
              OR (sender_id = ? AND receiver_id = ?)
              ORDER BY created_at DESC LIMIT 1) as last_message_time,
             (SELECT COUNT(*) FROM direct_messages 
              WHERE receiver_id = ? AND sender_id = ? AND is_read = 0) as unread_count
             FROM users u
             WHERE u.id = ?`,
            [userId, user_id, user_id, userId, userId, user_id, user_id, userId, userId, user_id, user_id],
            (err, conv) => {
              completed++;
              
              if (!err && conv) {
                conversations.push(conv);
              }

              if (completed === userIds.length) {
                // Sort by last_message_time descending
                conversations.sort((a, b) => {
                  if (!a.last_message_time) return 1;
                  if (!b.last_message_time) return -1;
                  return new Date(b.last_message_time) - new Date(a.last_message_time);
                });
                res.json(conversations);
              }
            }
          );
        });
      }
    );
  });

  // Mark messages as read
  router.post('/dm/mark-read/:userId', authenticateToken, (req, res) => {
    const currentUserId = req.user.id;
    const otherUserId = req.params.userId;

    db.run(
      `UPDATE direct_messages 
       SET is_read = 1 
       WHERE sender_id = ? AND receiver_id = ? AND is_read = 0`,
      [otherUserId, currentUserId],
      (err) => {
        if (err) {
          return res.status(500).json({ error: 'Database error' });
        }

        res.json({ message: 'Messages marked as read' });
      }
    );
  });

  return router;
};

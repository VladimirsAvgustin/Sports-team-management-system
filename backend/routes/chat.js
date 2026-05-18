const express = require('express');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');

const MAX_CHAT_UPLOAD_BYTES = 6 * 1024 * 1024;
const CHAT_UPLOAD_ROOT = process.env.UPLOADS_DIR
  ? path.resolve(process.env.UPLOADS_DIR)
  : path.join(__dirname, '..', 'uploads');
const CHAT_UPLOAD_DIR = path.join(CHAT_UPLOAD_ROOT, 'chat');
const CHAT_ATTACHMENT_API_PREFIX = '/api/chat/attachments/';
const CHAT_ATTACHMENT_LEGACY_PREFIX = '/uploads/chat/';
const MIME_EXTENSIONS = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/gif': '.gif',
  'image/webp': '.webp',
  'application/pdf': '.pdf',
  'text/plain': '.txt',
  'text/csv': '.csv',
  'application/msword': '.doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
  'application/vnd.ms-excel': '.xls',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
  'application/vnd.ms-powerpoint': '.ppt',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': '.pptx',
  'application/zip': '.zip'
};

const sanitizeFileName = (fileName) => {
  const baseName = path.basename(String(fileName || 'attachment'));
  const cleaned = baseName.replace(/[^\w.\- ]+/g, '').replace(/\s+/g, '_').slice(0, 80);
  return cleaned || 'attachment';
};

const getSafeStoredName = (fileName) => {
  const value = String(fileName || '').trim();

  if (!value || value.includes('/') || value.includes('\\')) {
    return null;
  }

  if (!/^\d+-[a-f0-9]{16}\.[a-z0-9]+$/i.test(value)) {
    return null;
  }

  return value;
};

const parseDataUrl = (dataUrl) => {
  const match = String(dataUrl || '').match(/^data:([^;,]+);base64,(.+)$/s);
  if (!match) return null;
  return {
    mimeType: match[1].toLowerCase(),
    base64: match[2]
  };
};

module.exports = (db) => {
  const dbGet = (sql, params = []) => new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });

  const findAccessibleAttachment = async (storedName, userId) => {
    const attachmentUrls = [
      `${CHAT_ATTACHMENT_API_PREFIX}${storedName}`,
      `${CHAT_ATTACHMENT_LEGACY_PREFIX}${storedName}`
    ];

    const roomAttachment = await dbGet(
      `SELECT m.attachment_name, m.attachment_type, m.attachment_size
       FROM messages m
       INNER JOIN chat_rooms cr ON cr.id = m.room_id
       INNER JOIN users u ON u.team_id = cr.team_id
       WHERE m.attachment_url IN (?, ?) AND u.id = ?
       LIMIT 1`,
      [...attachmentUrls, userId]
    );

    if (roomAttachment) {
      return roomAttachment;
    }

    return dbGet(
      `SELECT attachment_name, attachment_type, attachment_size
       FROM direct_messages
       WHERE attachment_url IN (?, ?) AND (sender_id = ? OR receiver_id = ?)
       LIMIT 1`,
      [...attachmentUrls, userId, userId]
    );
  };

  // Upload a chat attachment first, then send its returned metadata via socket.
  router.post('/upload', authenticateToken, (req, res) => {
    const parsedData = parseDataUrl(req.body?.data);
    const requestedMimeType = String(req.body?.mimeType || '').toLowerCase();
    const mimeType = parsedData?.mimeType || requestedMimeType;

    if (!parsedData || !MIME_EXTENSIONS[mimeType]) {
    return res.status(400).json({ error: 'Neatbalstīts faila tips' });
    }

    let fileBuffer;
    try {
      fileBuffer = Buffer.from(parsedData.base64, 'base64');
    } catch {
    return res.status(400).json({ error: 'Nederīgi faila dati' });
    }

    if (!fileBuffer.length || fileBuffer.length > MAX_CHAT_UPLOAD_BYTES) {
    return res.status(400).json({ error: 'Failam jābūt mazākam par 6 MB' });
    }

    fs.mkdirSync(CHAT_UPLOAD_DIR, { recursive: true });

    const originalName = sanitizeFileName(req.body?.fileName);
    const extension = MIME_EXTENSIONS[mimeType];
    const storedName = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${extension}`;
    const storedPath = path.join(CHAT_UPLOAD_DIR, storedName);

    fs.writeFile(storedPath, fileBuffer, (err) => {
      if (err) {
        console.error('Chat upload write error:', err.message);
        return res.status(500).json({ error: 'Neizdevās augšupielādēt failu' });
      }

      return res.status(201).json({
        attachmentUrl: `${CHAT_ATTACHMENT_API_PREFIX}${storedName}`,
        attachmentName: originalName,
        attachmentType: mimeType,
        attachmentSize: fileBuffer.length
      });
    });
  });

  router.get('/attachments/:fileName', authenticateToken, async (req, res) => {
    const storedName = getSafeStoredName(req.params.fileName);

    if (!storedName) {
      return res.status(400).json({ error: 'Nederīgs faila nosaukums' });
    }

    try {
      const attachment = await findAccessibleAttachment(storedName, req.user.id);

      if (!attachment) {
        return res.status(404).json({ error: 'Fails nav atrasts' });
      }

      const uploadRoot = path.resolve(CHAT_UPLOAD_DIR);
      const storedPath = path.resolve(uploadRoot, storedName);

      if (!storedPath.startsWith(`${uploadRoot}${path.sep}`)) {
        return res.status(400).json({ error: 'Nederīgs faila ceļš' });
      }

      try {
        await fs.promises.access(storedPath, fs.constants.R_OK);
      } catch {
        return res.status(404).json({ error: 'Fails nav atrasts' });
      }

      const downloadName = sanitizeFileName(attachment.attachment_name || storedName).replace(/"/g, '');
      res.setHeader('Content-Type', attachment.attachment_type || 'application/octet-stream');
      res.setHeader('Content-Disposition', `inline; filename="${downloadName}"`);
      res.setHeader('X-Content-Type-Options', 'nosniff');
      return res.sendFile(storedPath);
    } catch (error) {
      console.error('Attachment download error:', error);
      return res.status(500).json({ error: 'Neizdevās ielādēt failu' });
    }
  });

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
      return res.status(500).json({ error: 'Datubāzes kļūda' });
        }

        if (!userTeam) {
      return res.status(403).json({ error: 'Jūs neesat šīs komandas dalībnieks' });
        }

        // Get or create chat room for the team
        db.get(
          `SELECT * FROM chat_rooms WHERE team_id = ?`,
          [teamId],
          (err, room) => {
            if (err) {
      return res.status(500).json({ error: 'Datubāzes kļūda' });
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
    return res.status(500).json({ error: 'Datubāzes kļūda' });
                }

                const roomName = team ? `${team.name} čats` : `Komandas ${teamId} čats`;

                db.run(
                  `INSERT INTO chat_rooms (team_id, name) VALUES (?, ?)`,
                  [teamId, roomName],
                  function(err) {
                    if (err) {
            return res.status(500).json({ error: 'Neizdevās izveidot čata istabu' });
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
      return res.status(500).json({ error: 'Datubāzes kļūda' });
        }

        if (!room) {
      return res.status(403).json({ error: 'Piekļuve liegta' });
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
      return res.status(500).json({ error: 'Datubāzes kļūda' });
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
       (SELECT COALESCE(NULLIF(message, ''), attachment_name, 'Pielikums') FROM messages WHERE room_id = cr.id ORDER BY created_at DESC LIMIT 1) as last_message,
       (SELECT created_at FROM messages WHERE room_id = cr.id ORDER BY created_at DESC LIMIT 1) as last_message_time
       FROM chat_rooms cr
       INNER JOIN teams t ON cr.team_id = t.id
       INNER JOIN users u ON u.team_id = t.id
       WHERE u.id = ?
       ORDER BY last_message_time DESC`,
      [userId],
      (err, rooms) => {
        if (err) {
      return res.status(500).json({ error: 'Datubāzes kļūda' });
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
      return res.status(500).json({ error: 'Datubāzes kļūda' });
        }

        if (!message) {
      return res.status(403).json({ error: 'Šo ziņojumu nevar dzēst' });
        }

        db.run(
          `DELETE FROM messages WHERE id = ?`,
          [messageId],
          (err) => {
            if (err) {
          return res.status(500).json({ error: 'Neizdevās dzēst ziņojumu' });
            }

        res.json({ message: 'Ziņojums veiksmīgi dzēsts' });
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
      `SELECT id, name, surname, (name || ' ' || surname) as username, email, role FROM users WHERE id != ? ORDER BY surname, name`,
      [userId],
      (err, users) => {
        if (err) {
      return res.status(500).json({ error: 'Datubāzes kļūda' });
        }

        res.json(users);
      }
    );
  });

  // Get team members for DM (users in the same team)
  router.get('/team-members', authenticateToken, (req, res) => {
    const userId = req.user.id;

    db.all(
      `SELECT u.id, u.name, u.surname, (u.name || ' ' || u.surname) as username, u.email, u.role, t.name as team_name
       FROM users u
       LEFT JOIN teams t ON u.team_id = t.id
       WHERE u.team_id IN (SELECT team_id FROM users WHERE id = ?) 
       AND u.id != ?
       ORDER BY u.surname, u.name`,
      [userId, userId],
      (err, members) => {
        if (err) {
      return res.status(500).json({ error: 'Datubāzes kļūda' });
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
       sender.name as sender_name, sender.surname as sender_surname,
       receiver.name as receiver_name, receiver.surname as receiver_surname
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
      return res.status(500).json({ error: 'Datubāzes kļūda' });
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
      return res.status(500).json({ error: 'Datubāzes kļūda' });
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
             u.name, u.surname,
             (u.name || ' ' || u.surname) as username,
             u.email,
             (SELECT COALESCE(NULLIF(message, ''), attachment_name, 'Pielikums') FROM direct_messages 
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
      return res.status(500).json({ error: 'Datubāzes kļūda' });
        }

    res.json({ message: 'Ziņojumi atzīmēti kā izlasīti' });
      }
    );
  });

  return router;
};

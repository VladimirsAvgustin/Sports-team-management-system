const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const sqlite3 = require('sqlite3').verbose();
const { Server } = require('socket.io');
const http = require('http');
const jwt = require('jsonwebtoken');
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const PORT = 3000;
const HOST = '0.0.0.0'; // Listen on all interfaces
const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';

// Create uploads directory if it doesn't exist
const uploadsRoot = process.env.UPLOADS_DIR
  ? path.resolve(process.env.UPLOADS_DIR)
  : path.join(__dirname, 'uploads');
const uploadsDir = path.join(uploadsRoot, 'logos');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
const chatUploadsDir = path.join(uploadsRoot, 'chat');
if (!fs.existsSync(chatUploadsDir)) {
  fs.mkdirSync(chatUploadsDir, { recursive: true });
}

// Dynamic CORS origin configuration for development
// Allows localhost, 127.0.0.1, and any local network IPs (192.168.x.x, etc)
const corsOriginCheck = (origin, callback) => {
  const configuredOrigins = (process.env.FRONTEND_URL || '')
    .split(',')
    .map((value) => value.trim().replace(/\/+$/, ''))
    .filter(Boolean);

  // Allow development origins (both HTTP and HTTPS)
  const allowedOrigins = [
    'http://localhost:5173',
    'http://localhost:5174',
    'https://localhost:5173',
    'https://localhost:5174',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:5174',
    'https://127.0.0.1:5173',
    'https://127.0.0.1:5174'
  ];
  
  // Allow any local network IPs (192.168.x.x, 10.x.x.x, 172.x.x.x) for both HTTP and HTTPS
  const isLocalNetworkIP = /^https?:\/\/(192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[01])|127\.)/;
  const normalizedOrigin = typeof origin === 'string' ? origin.replace(/\/+$/, '') : origin;
  const allowAnyProductionOrigin = process.env.NODE_ENV === 'production' && configuredOrigins.length === 0;
  
  if (
    !origin ||
    allowAnyProductionOrigin ||
    allowedOrigins.includes(normalizedOrigin) ||
    configuredOrigins.includes(normalizedOrigin) ||
    isLocalNetworkIP.test(normalizedOrigin)
  ) {
    callback(null, true);
  } else {
    console.log('CORS blocked:', origin);
    callback(new Error('CORS piekļuve nav atļauta'));
  }
};

// Initialize Socket.io with dynamic CORS
const io = new Server(server, {
  cors: {
    origin: corsOriginCheck,
    methods: ['GET', 'POST'],
    credentials: true
  }
});

app.use((req, res, next) => {
  next();
});

// Middleware - Express CORS with dynamic origin check
app.use(cors({  
  origin: corsOriginCheck,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  credentials: true
}));
app.options('*', cors({ origin: corsOriginCheck }));


app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ limit: '10mb', extended: true }));

// Connecting to the database
const dbPath = process.env.DATABASE_PATH
  ? path.resolve(process.env.DATABASE_PATH)
  : path.resolve(__dirname, 'database.sqlite');
fs.mkdirSync(path.dirname(dbPath), { recursive: true });
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Database connection error:', err.message);
  } else {
    console.log('Successful database connection');
    // Initialize tables
    db.run('PRAGMA foreign_keys = ON');
    db.serialize(() => {
      db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        surname TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'user',
        avatar TEXT,
        team_id INTEGER,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
      )`);
      db.run(`ALTER TABLE users ADD COLUMN avatar TEXT`, (avatarErr) => {
        if (avatarErr && !avatarErr.message.includes('duplicate column name')) {
          console.error('Error adding avatar column to users table:', avatarErr.message);
        }
      });
      db.run(`CREATE TABLE IF NOT EXISTS teams (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        team_code TEXT,
        coach_id INTEGER,
        logo TEXT,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
      )`);
      db.run(`CREATE TABLE IF NOT EXISTS player_stats (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL UNIQUE,
        matches INTEGER DEFAULT 0,
        goals INTEGER DEFAULT 0,
        assists INTEGER DEFAULT 0,
        yellow_cards INTEGER DEFAULT 0,
        red_cards INTEGER DEFAULT 0,
        attendance INTEGER DEFAULT 0,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )`);
      db.run(`CREATE TABLE IF NOT EXISTS schedules (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        team_id INTEGER NOT NULL,
        event_name TEXT NOT NULL,
        event_date TEXT NOT NULL,
        location TEXT,
        description TEXT,
        event_time TEXT,
        event_type TEXT,
        createdAt TEXT,
        FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE
      )`);
      db.run(`ALTER TABLE schedules ADD COLUMN createdAt TEXT`, (createdAtErr) => {
        if (createdAtErr && !createdAtErr.message.includes('duplicate column name')) {
          console.error('Error adding createdAt column to schedules table:', createdAtErr.message);
        }
      });
      db.run(`ALTER TABLE schedules ADD COLUMN description TEXT`, (descriptionErr) => {
        if (descriptionErr && !descriptionErr.message.includes('duplicate column name')) {
          console.error('Error adding description column to schedules table:', descriptionErr.message);
        }
      });
      db.run(`CREATE TABLE IF NOT EXISTS attendance (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        event_id INTEGER NOT NULL,
        status TEXT CHECK(status IN ('present', 'absent', 'late', 'excused')) DEFAULT 'absent',
        checked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        notes TEXT,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (event_id) REFERENCES schedules(id) ON DELETE CASCADE,
        UNIQUE(user_id, event_id)
      )`);
      db.run(`CREATE TABLE IF NOT EXISTS chat_rooms (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        team_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE
      )`);
      db.run(`CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        room_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        username TEXT NOT NULL,
        message TEXT NOT NULL,
        attachment_url TEXT,
        attachment_name TEXT,
        attachment_type TEXT,
        attachment_size INTEGER,
        reply_to_message_id INTEGER,
        reply_to_username TEXT,
        reply_to_message TEXT,
        reply_to_attachment_name TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (room_id) REFERENCES chat_rooms(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (reply_to_message_id) REFERENCES messages(id) ON DELETE SET NULL
      )`);
      [
        'attachment_url TEXT',
        'attachment_name TEXT',
        'attachment_type TEXT',
        'attachment_size INTEGER',
        'reply_to_message_id INTEGER',
        'reply_to_username TEXT',
        'reply_to_message TEXT',
        'reply_to_attachment_name TEXT'
      ].forEach((columnDefinition) => {
        db.run(`ALTER TABLE messages ADD COLUMN ${columnDefinition}`, (columnErr) => {
          if (columnErr && !columnErr.message.includes('duplicate column name')) {
            console.error(`Error adding ${columnDefinition} to messages table:`, columnErr.message);
          }
        });
      });
      db.run(`CREATE TABLE IF NOT EXISTS direct_messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sender_id INTEGER NOT NULL,
        receiver_id INTEGER NOT NULL,
        message TEXT NOT NULL,
        attachment_url TEXT,
        attachment_name TEXT,
        attachment_type TEXT,
        attachment_size INTEGER,
        is_read INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE
      )`);
      ['attachment_url TEXT', 'attachment_name TEXT', 'attachment_type TEXT', 'attachment_size INTEGER'].forEach((columnDefinition) => {
        db.run(`ALTER TABLE direct_messages ADD COLUMN ${columnDefinition}`, (columnErr) => {
          if (columnErr && !columnErr.message.includes('duplicate column name')) {
            console.error(`Error adding ${columnDefinition} to direct_messages table:`, columnErr.message);
          }
        });
      });
      db.run(`CREATE TABLE IF NOT EXISTS password_resets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        token_hash TEXT NOT NULL UNIQUE,
        expires_at INTEGER NOT NULL,
        used_at INTEGER,
        created_at INTEGER DEFAULT (strftime('%s', 'now')),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )`);
      db.run(`CREATE TABLE IF NOT EXISTS coach_join_requests (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        team_id INTEGER NOT NULL,
        requester_user_id INTEGER NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'rejected')),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        reviewed_by INTEGER,
        reviewed_at DATETIME,
        FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
        FOREIGN KEY (requester_user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL
      )`);
      db.run('CREATE INDEX IF NOT EXISTS idx_coach_join_requests_team_status ON coach_join_requests(team_id, status)');
      db.run('CREATE INDEX IF NOT EXISTS idx_coach_join_requests_requester_status ON coach_join_requests(requester_user_id, status)');
      console.log('All tables initialized');
    });
  }
});

// Set up the routes
const authRoutes = require('./routes/auth')(db);
app.use('/api/auth', authRoutes);

const scheduleRoutes = require('./routes/schedules')(db);
app.use('/api', scheduleRoutes);

const adminRoutes = require('./routes/admin')
app.use('/api/admin', adminRoutes)

const chatRoutes = require('./routes/chat')(db);
app.use('/api/chat', chatRoutes);

// Saziņas forma - nosūtīt e-pastu
const nodemailer = require('nodemailer');
const emailUser = process.env.EMAIL_USER || 'vladimiravgustin123@gmail.com';
const emailPass = (process.env.EMAIL_PASS || '').replace(/\s+/g, '');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: emailUser,
    pass: emailPass
  }
});

app.post('/api/contact', async (req, res) => {
  const { name, email, subject, message } = req.body;

  if (!name || !email || !subject || !message) {
    return res.status(400).json({ error: 'Visi lauki ir obligāti' });
  }

  const subjectLabels = {
    general: 'Vispārīgs jautājums',
    bug: 'Kļūdas ziņojums',
    feature: 'Funkcijas ierosinājums',
    account: 'Konta problēma',
    other: 'Cits'
  };

  const mailOptions = {
    from: `"TeamFlow kontakti" <${emailUser}>`,
    to: 'vladimiravgustin123@gmail.com',
    replyTo: email,
    subject: `${subjectLabels[subject] || subject} - no ${name}`,
    html: `
      <p><strong>Vārds:</strong> ${name}</p>
      <p><strong>E-pasts:</strong> ${email}</p>
      <p><strong>Tēma:</strong> ${subjectLabels[subject] || subject}</p>
      <hr/>
      <p><strong>Ziņojums:</strong></p>
      <p>${message.replace(/\n/g, '<br>')}</p>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    res.status(200).json({ message: 'E-pasts veiksmīgi nosūtīts' });
  } catch (err) {
    console.error('Error sending email:', err);
    res.status(500).json({ error: 'Neizdevās nosūtīt e-pastu. Lūdzu, mēģiniet vēlāk.' });
  }
});

// Handling non-existing routes
app.use((req, res, next) => {
  res.status(404).json({ error: 'Maršruts nav atrasts' });
});

// Central error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Iekšēja servera kļūda' });
});

// Socket.io authentication middleware
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  
  if (!token) {
    return next(new Error('Autentifikācijas kļūda'));
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    socket.userId = decoded.id;
    socket.userFullName = (decoded.name || '') + ' ' + (decoded.surname || '');
    socket.userFullName = socket.userFullName.trim();
    next();
  } catch (err) {
    next(new Error('Autentifikācijas kļūda'));
  }
});

const CHAT_ATTACHMENT_API_PREFIX = '/api/chat/attachments/';
const CHAT_ATTACHMENT_LEGACY_PREFIX = '/uploads/chat/';

const normalizeChatText = (value) => (typeof value === 'string' ? value.trim() : '');
const normalizePositiveInteger = (value) => {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : null;
};

const normalizeRole = (role) => (typeof role === 'string' ? role.trim().toLowerCase() : '');

const dbGet = (sql, params = []) => new Promise((resolve, reject) => {
  db.get(sql, params, (err, row) => {
    if (err) reject(err);
    else resolve(row);
  });
});

const dbRun = (sql, params = []) => new Promise((resolve, reject) => {
  db.run(sql, params, function(err) {
    if (err) reject(err);
    else resolve(this);
  });
});

const getRoomMembership = (roomId, userId) => dbGet(
  `SELECT cr.id, cr.team_id, u.role
   FROM chat_rooms cr
   INNER JOIN users u ON u.team_id = cr.team_id
   WHERE cr.id = ? AND u.id = ?`,
  [roomId, userId]
);

const getReplySnapshot = async (replyToMessageId, roomId) => {
  if (!replyToMessageId) {
    return null;
  }

  const replyMessage = await dbGet(
    `SELECT id, username, message, attachment_name
     FROM messages
     WHERE id = ? AND room_id = ?`,
    [replyToMessageId, roomId]
  );

  if (!replyMessage) {
    return null;
  }

  return {
    reply_to_message_id: replyMessage.id,
    reply_to_username: replyMessage.username,
    reply_to_message: normalizeChatText(replyMessage.message).slice(0, 240),
    reply_to_attachment_name: normalizeChatText(replyMessage.attachment_name).slice(0, 120)
  };
};

const normalizeChatAttachmentUrl = (value) => {
  const attachmentUrl = normalizeChatText(value);
  let fileName = '';

  if (attachmentUrl.startsWith(CHAT_ATTACHMENT_API_PREFIX)) {
    fileName = attachmentUrl.slice(CHAT_ATTACHMENT_API_PREFIX.length);
  } else if (attachmentUrl.startsWith(CHAT_ATTACHMENT_LEGACY_PREFIX)) {
    fileName = attachmentUrl.slice(CHAT_ATTACHMENT_LEGACY_PREFIX.length);
  }

  if (!fileName || fileName.includes('/') || fileName.includes('\\')) {
    return null;
  }

  fileName = path.basename(fileName);

  if (!/^\d+-[a-f0-9]{16}\.[a-z0-9]+$/i.test(fileName)) {
    return null;
  }

  return `${CHAT_ATTACHMENT_API_PREFIX}${fileName}`;
};

const normalizeAttachment = (attachment) => {
  if (!attachment || typeof attachment !== 'object') {
    return null;
  }

  const attachmentUrl = normalizeChatAttachmentUrl(attachment.attachmentUrl || attachment.attachment_url);
  const attachmentName = normalizeChatText(attachment.attachmentName || attachment.attachment_name || 'Pielikums');
  const attachmentType = normalizeChatText(attachment.attachmentType || attachment.attachment_type);
  const attachmentSize = Number(attachment.attachmentSize || attachment.attachment_size || 0);

  if (!attachmentUrl) {
    return null;
  }

  return {
    attachment_url: attachmentUrl,
    attachment_name: attachmentName || 'Pielikums',
    attachment_type: attachmentType,
    attachment_size: Number.isFinite(attachmentSize) ? attachmentSize : 0
  };
};

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log(`User connected: ${socket.userFullName} (ID: ${socket.userId})`);

  // Join user's personal room for DMs immediately on connection
  socket.join(`user_${socket.userId}`);
  console.log(`${socket.userFullName} joined personal room user_${socket.userId}`);

  // Join a chat room
  socket.on('join_room', async (roomIdValue) => {
    const roomId = normalizePositiveInteger(roomIdValue);

    if (!roomId) {
      socket.emit('message_error', { error: 'Nederīga čata istaba' });
      return;
    }

    try {
      const roomMembership = await getRoomMembership(roomId, socket.userId);

      if (!roomMembership) {
        socket.emit('message_error', { error: 'Piekļuve liegta' });
        return;
      }
    } catch (err) {
      console.error('Error joining room:', err);
      socket.emit('message_error', { error: 'Neizdevās pievienoties čatam' });
      return;
    }

    socket.join(`room_${roomId}`);
    console.log(`${socket.userFullName} joined room ${roomId}`);
    
    // Notify others in the room
    socket.to(`room_${roomId}`).emit('user_joined', {
      username: socket.userFullName,
      message: `${socket.userFullName} pievienojās čatam`
    });
  });

  // Leave a chat room
  socket.on('leave_room', (roomIdValue) => {
    const roomId = normalizePositiveInteger(roomIdValue);
    if (!roomId) return;

    socket.leave(`room_${roomId}`);
    console.log(`${socket.userFullName} left room ${roomId}`);
    
    socket.to(`room_${roomId}`).emit('user_left', {
      username: socket.userFullName,
      message: `${socket.userFullName} pameta čatu`
    });
  });

  // Handle new message
  socket.on('send_message', async (data) => {
    const roomId = normalizePositiveInteger(data?.roomId);
    const message = normalizeChatText(data?.message);
    const attachment = normalizeAttachment(data?.attachment);
    const replyToMessageId = normalizePositiveInteger(
      data?.replyTo?.id || data?.replyToMessageId || data?.reply_to_message_id
    );

    if (!roomId) {
      socket.emit('message_error', { error: 'NederД«ga ДЌata istaba' });
      return;
    }

    if (!message && !attachment) {
      socket.emit('message_error', { error: 'Ziņojums ir tukšs' });
      return;
    }
    try {
      const roomMembership = await getRoomMembership(roomId, socket.userId);

      if (!roomMembership) {
        socket.emit('message_error', { error: 'PiekДјuve liegta' });
        return;
      }

      const replySnapshot = await getReplySnapshot(replyToMessageId, roomId);

      if (replyToMessageId && !replySnapshot) {
        socket.emit('message_error', { error: 'Atbildes ziЕ†ojums nav atrasts' });
        return;
      }

      const result = await dbRun(
        `INSERT INTO messages (
          room_id,
          user_id,
          username,
          message,
          attachment_url,
          attachment_name,
          attachment_type,
          attachment_size,
          reply_to_message_id,
          reply_to_username,
          reply_to_message,
          reply_to_attachment_name
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          roomId,
          socket.userId,
          socket.userFullName,
          message,
          attachment?.attachment_url || null,
          attachment?.attachment_name || null,
          attachment?.attachment_type || null,
          attachment?.attachment_size || null,
          replySnapshot?.reply_to_message_id || null,
          replySnapshot?.reply_to_username || null,
          replySnapshot?.reply_to_message || null,
          replySnapshot?.reply_to_attachment_name || null
        ]
      );

      const messageData = {
        id: result.lastID,
        roomId,
        userId: socket.userId,
        user_id: socket.userId,
        username: socket.userFullName,
        message,
        attachment_url: attachment?.attachment_url || null,
        attachment_name: attachment?.attachment_name || null,
        attachment_type: attachment?.attachment_type || null,
        attachment_size: attachment?.attachment_size || null,
        reply_to_message_id: replySnapshot?.reply_to_message_id || null,
        reply_to_username: replySnapshot?.reply_to_username || null,
        reply_to_message: replySnapshot?.reply_to_message || null,
        reply_to_attachment_name: replySnapshot?.reply_to_attachment_name || null,
        createdAt: new Date().toISOString()
      };

      // Broadcast to all users in the room (including sender)
      io.to(`room_${roomId}`).emit('new_message', messageData);
    } catch (err) {
      console.error('Error saving message:', err);
      socket.emit('message_error', { error: 'NeizdevДЃs nosЕ«tД«t ziЕ†ojumu' });
    }
  });

  socket.on('delete_message', async (data) => {
    const messageId = normalizePositiveInteger(data?.messageId || data?.id || data);

    if (!messageId) {
      socket.emit('message_error', { error: 'NederД«gs ziЕ†ojums' });
      return;
    }

    try {
      const message = await dbGet(
        `SELECT m.id, m.room_id, m.user_id, u.role AS requester_role
         FROM messages m
         INNER JOIN chat_rooms cr ON cr.id = m.room_id
         INNER JOIN users u ON u.team_id = cr.team_id
         WHERE m.id = ? AND u.id = ?`,
        [messageId, socket.userId]
      );

      if (!message) {
        socket.emit('message_error', { error: 'ZiЕ†ojums nav atrasts' });
        return;
      }

      const canDelete = Number(message.user_id) === Number(socket.userId)
        || normalizeRole(message.requester_role) === 'coach';

      if (!canDelete) {
        socket.emit('message_error', { error: 'Е o ziЕ†ojumu nevar dzД“st' });
        return;
      }

      await dbRun('DELETE FROM messages WHERE id = ?', [messageId]);

      io.to(`room_${message.room_id}`).emit('message_deleted', {
        messageId,
        roomId: message.room_id
      });
    } catch (err) {
      console.error('Error deleting message:', err);
      socket.emit('message_error', { error: 'NeizdevДЃs dzД“st ziЕ†ojumu' });
    }
  });

  // Handle typing indicator
  socket.on('typing', (data) => {
    const roomId = normalizePositiveInteger(data?.roomId);
    if (!roomId || !socket.rooms.has(`room_${roomId}`)) return;

    socket.to(`room_${roomId}`).emit('user_typing', {
      username: socket.userFullName
    });
  });

  socket.on('stop_typing', (data) => {
    const roomId = normalizePositiveInteger(data?.roomId);
    if (!roomId || !socket.rooms.has(`room_${roomId}`)) return;

    socket.to(`room_${roomId}`).emit('user_stop_typing', {
      username: socket.userFullName
    });
  });

  // Direct Message Handlers
  socket.on('send_dm', (data) => {
    const { receiverId } = data;
    const message = normalizeChatText(data?.message);
    const attachment = normalizeAttachment(data?.attachment);

    if (!message && !attachment) {
      socket.emit('dm_error', { error: 'Ziņojums ir tukšs' });
      return;
    }
    
    // Save DM to database
    db.run(
      `INSERT INTO direct_messages (
        sender_id,
        receiver_id,
        message,
        attachment_url,
        attachment_name,
        attachment_type,
        attachment_size
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        socket.userId,
        receiverId,
        message,
        attachment?.attachment_url || null,
        attachment?.attachment_name || null,
        attachment?.attachment_type || null,
        attachment?.attachment_size || null
      ],
      function(err) {
        if (err) {
          console.error('Error saving DM:', err);
          socket.emit('dm_error', { error: 'Neizdevās nosūtīt ziņojumu' });
          return;
        }

        const dmData = {
          id: this.lastID,
          sender_id: socket.userId,
          receiver_id: receiverId,
          message,
          attachment_url: attachment?.attachment_url || null,
          attachment_name: attachment?.attachment_name || null,
          attachment_type: attachment?.attachment_type || null,
          attachment_size: attachment?.attachment_size || null,
          is_read: 0,
          created_at: new Date().toISOString()
        };

        // Send to receiver if they're online
        io.to(`user_${receiverId}`).emit('new_dm', dmData);
        
        // Confirm to sender
        socket.emit('dm_sent', dmData);
      }
    );
  });

  // Mark DM as read
  socket.on('mark_dm_read', (dmId) => {
    db.run(
      `UPDATE direct_messages SET is_read = 1 WHERE id = ? AND receiver_id = ?`,
      [dmId, socket.userId],
      (err) => {
        if (err) {
          console.error('Error marking DM as read:', err);
        }
      }
    );
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.userFullName}`);
  });
});

// Start the server
server.listen(PORT, HOST, () => {
  console.log(`Server started at http://0.0.0.0:${PORT}`);
  console.log(`Local access: http://localhost:${PORT}`);
  console.log(`Network access: http://192.168.31.212:${PORT}`);
});

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const { Server } = require('socket.io');
const http = require('http');
const jwt = require('jsonwebtoken');
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const PORT = 3000;
const HOST = '0.0.0.0'; // Listen on all interfaces

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads', 'logos');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Dynamic CORS origin configuration for development
// Allows localhost, 127.0.0.1, and any local network IPs (192.168.x.x, etc)
const corsOriginCheck = (origin, callback) => {
  // Allow development origins
  const allowedOrigins = [
    'http://localhost:5173',
    'http://localhost:5174',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:5174'
  ];
  
  // Allow any local network IPs (192.168.x.x, 10.x.x.x, 172.x.x.x)
  const isLocalNetworkIP = /^https?:\/\/(192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[01])|127\.)/;
  
  if (!origin || allowedOrigins.includes(origin) || isLocalNetworkIP.test(origin)) {
    callback(null, true);
  } else {
    console.log('CORS blocked:', origin);
    callback(new Error('Not allowed by CORS'));
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

// Serve static files for uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Connecting to the database
const dbPath = path.resolve(__dirname, 'database.sqlite');
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
        team_id INTEGER,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
      )`);
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
        event_time TEXT,
        event_type TEXT,
        FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE
      )`);
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
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (room_id) REFERENCES chat_rooms(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )`);
      db.run(`CREATE TABLE IF NOT EXISTS direct_messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sender_id INTEGER NOT NULL,
        receiver_id INTEGER NOT NULL,
        message TEXT NOT NULL,
        is_read INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE
      )`);
      db.run(`CREATE TABLE IF NOT EXISTS password_resets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        token_hash TEXT NOT NULL UNIQUE,
        expires_at INTEGER NOT NULL,
        used_at INTEGER,
        created_at INTEGER DEFAULT (strftime('%s', 'now')),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )`);
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

// Contact form - send email
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER || 'vladimiravgustin123@gmail.com',
    pass: process.env.EMAIL_PASS || ''
  }
});

app.post('/api/contact', async (req, res) => {
  const { name, email, subject, message } = req.body;

  if (!name || !email || !subject || !message) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  const subjectLabels = {
    general: 'General Question',
    bug: 'Bug Report',
    feature: 'Feature Request',
    account: 'Account Issue',
    other: 'Other'
  };

  const mailOptions = {
    from: `"Sports Team Contact" <${process.env.EMAIL_USER || 'vladimiravgustin123@gmail.com'}>`,
    to: 'vladimiravgustin123@gmail.com',
    replyTo: email,
    subject: `${subjectLabels[subject] || subject} - from ${name}`,
    html: `
      <p><strong>Name:</strong> ${name}</p>
      <p><strong>Email:</strong> ${email}</p>
      <p><strong>Subject:</strong> ${subjectLabels[subject] || subject}</p>
      <hr/>
      <p><strong>Message:</strong></p>
      <p>${message.replace(/\n/g, '<br>')}</p>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    res.status(200).json({ message: 'Email sent successfully' });
  } catch (err) {
    console.error('Error sending email:', err);
    res.status(500).json({ error: 'Failed to send email. Please try again later.' });
  }
});

// Handling non-existing routes
app.use((req, res, next) => {
  res.status(404).json({ error: 'Route not found' });
});

// Central error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

// Socket.io authentication middleware
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  
  if (!token) {
    return next(new Error('Authentication error'));
  }

  try {
    const decoded = jwt.verify(token, 'your_jwt_secret');
    socket.userId = decoded.id;
    socket.userFullName = (decoded.name || '') + ' ' + (decoded.surname || '');
    socket.userFullName = socket.userFullName.trim();
    next();
  } catch (err) {
    next(new Error('Authentication error'));
  }
});

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log(`User connected: ${socket.userFullName} (ID: ${socket.userId})`);

  // Join user's personal room for DMs immediately on connection
  socket.join(`user_${socket.userId}`);
  console.log(`${socket.userFullName} joined personal room user_${socket.userId}`);

  // Join a chat room
  socket.on('join_room', (roomId) => {
    socket.join(`room_${roomId}`);
    console.log(`${socket.userFullName} joined room ${roomId}`);
    
    // Notify others in the room
    socket.to(`room_${roomId}`).emit('user_joined', {
      username: socket.userFullName,
      message: `${socket.userFullName} joined the chat`
    });
  });

  // Leave a chat room
  socket.on('leave_room', (roomId) => {
    socket.leave(`room_${roomId}`);
    console.log(`${socket.userFullName} left room ${roomId}`);
    
    socket.to(`room_${roomId}`).emit('user_left', {
      username: socket.userFullName,
      message: `${socket.userFullName} left the chat`
    });
  });

  // Handle new message
  socket.on('send_message', (data) => {
    const { roomId, message } = data;
    
    // Save message to database
    db.run(
      `INSERT INTO messages (room_id, user_id, username, message) VALUES (?, ?, ?, ?)`,
      [roomId, socket.userId, socket.userFullName, message],
      function(err) {
        if (err) {
          console.error('Error saving message:', err);
          socket.emit('message_error', { error: 'Failed to send message' });
          return;
        }

        const messageData = {
          id: this.lastID,
          roomId,
          userId: socket.userId,
          username: socket.userFullName,
          message,
          createdAt: new Date().toISOString()
        };

        // Broadcast to all users in the room (including sender)
        io.to(`room_${roomId}`).emit('new_message', messageData);
      }
    );
  });

  // Handle typing indicator
  socket.on('typing', (data) => {
    const { roomId } = data;
    socket.to(`room_${roomId}`).emit('user_typing', {
      username: socket.userFullName
    });
  });

  socket.on('stop_typing', (data) => {
    const { roomId } = data;
    socket.to(`room_${roomId}`).emit('user_stop_typing', {
      username: socket.userFullName
    });
  });

  // Direct Message Handlers
  socket.on('send_dm', (data) => {
    const { receiverId, message } = data;
    
    // Save DM to database
    db.run(
      `INSERT INTO direct_messages (sender_id, receiver_id, message) VALUES (?, ?, ?)`,
      [socket.userId, receiverId, message],
      function(err) {
        if (err) {
          console.error('Error saving DM:', err);
          socket.emit('dm_error', { error: 'Failed to send message' });
          return;
        }

        const dmData = {
          id: this.lastID,
          sender_id: socket.userId,
          receiver_id: receiverId,
          message,
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

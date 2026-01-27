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

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads', 'logos');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Initialize Socket.io
const io = new Server(server, {
  cors: {
    origin: ['http://localhost:5173', 'http://localhost:5174'],
    methods: ['GET', 'POST'],
    credentials: true
  }
});
app.use((req, res, next) => {
  next();
});

// Middleware
app.use(cors({  
  origin: ['http://localhost:5173', 'http://localhost:5174'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  credentials: true
}));
app.options('*', cors());


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
    socket.username = decoded.username;
    next();
  } catch (err) {
    next(new Error('Authentication error'));
  }
});

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log(`User connected: ${socket.username} (ID: ${socket.userId})`);

  // Join user's personal room for DMs immediately on connection
  socket.join(`user_${socket.userId}`);
  console.log(`${socket.username} joined personal room user_${socket.userId}`);

  // Join a chat room
  socket.on('join_room', (roomId) => {
    socket.join(`room_${roomId}`);
    console.log(`${socket.username} joined room ${roomId}`);
    
    // Notify others in the room
    socket.to(`room_${roomId}`).emit('user_joined', {
      username: socket.username,
      message: `${socket.username} joined the chat`
    });
  });

  // Leave a chat room
  socket.on('leave_room', (roomId) => {
    socket.leave(`room_${roomId}`);
    console.log(`${socket.username} left room ${roomId}`);
    
    socket.to(`room_${roomId}`).emit('user_left', {
      username: socket.username,
      message: `${socket.username} left the chat`
    });
  });

  // Handle new message
  socket.on('send_message', (data) => {
    const { roomId, message } = data;
    
    // Save message to database
    db.run(
      `INSERT INTO messages (room_id, user_id, username, message) VALUES (?, ?, ?, ?)`,
      [roomId, socket.userId, socket.username, message],
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
          username: socket.username,
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
      username: socket.username
    });
  });

  socket.on('stop_typing', (data) => {
    const { roomId } = data;
    socket.to(`room_${roomId}`).emit('user_stop_typing', {
      username: socket.username
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
          senderId: socket.userId,
          senderUsername: socket.username,
          receiverId,
          message,
          isRead: 0,
          createdAt: new Date().toISOString()
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
    console.log(`User disconnected: ${socket.username}`);
  });
});

// Start the server
server.listen(PORT, () => {
  console.log(`Server started at http://localhost:${PORT}`);
});

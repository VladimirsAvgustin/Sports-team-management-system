const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
const PORT = 3000;
app.use((req, res, next) => {
  next();
});

// Middleware
app.use(cors({  
  origin: 'http://localhost:5173',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  credentials: true
}));
app.options('*', cors());


app.use(bodyParser.json());

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

// Handling non-existing routes
app.use((req, res, next) => {
  res.status(404).json({ error: 'Route not found' });
});

// Central error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server started at http://localhost:${PORT}`);
});

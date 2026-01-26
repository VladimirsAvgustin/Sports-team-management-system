const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
  // Create direct_messages table for private user-to-user messages
  db.run(`
    CREATE TABLE IF NOT EXISTS direct_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sender_id INTEGER NOT NULL,
      receiver_id INTEGER NOT NULL,
      message TEXT NOT NULL,
      is_read INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `, (err) => {
    if (err) {
      console.error('Error creating direct_messages table:', err.message);
    } else {
      console.log('direct_messages table created successfully');
    }
  });

  // Create index for faster queries
  db.run(`
    CREATE INDEX IF NOT EXISTS idx_dm_sender ON direct_messages(sender_id)
  `, (err) => {
    if (err) {
      console.error('Error creating sender index:', err.message);
    } else {
      console.log('Sender index created successfully');
    }
  });

  db.run(`
    CREATE INDEX IF NOT EXISTS idx_dm_receiver ON direct_messages(receiver_id)
  `, (err) => {
    if (err) {
      console.error('Error creating receiver index:', err.message);
    } else {
      console.log('Receiver index created successfully');
    }
  });

  console.log('Direct messages database tables initialized');
});

db.close((err) => {
  if (err) {
    console.error('Error closing database:', err.message);
  } else {
    console.log('Database connection closed');
  }
});

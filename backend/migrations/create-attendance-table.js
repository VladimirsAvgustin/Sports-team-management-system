const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, '..', 'database.sqlite');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
  // Create attendance table
  db.run(`
    CREATE TABLE IF NOT EXISTS attendance (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      event_id INTEGER NOT NULL,
      status TEXT CHECK(status IN ('present', 'absent', 'late', 'excused')) DEFAULT 'absent',
      checked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      notes TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (event_id) REFERENCES schedules(id) ON DELETE CASCADE,
      UNIQUE(user_id, event_id)
    )
  `, (err) => {
    if (err) {
      if (err.message.includes('already exists')) {
        console.log('Table "attendance" already exists');
      } else {
        console.error('Error creating attendance table:', err.message);
      }
    } else {
      console.log('Created "attendance" table successfully');
    }
  });

  // Create index for faster queries
  db.run(`CREATE INDEX IF NOT EXISTS idx_attendance_user ON attendance(user_id)`, (err) => {
    if (err) {
      console.error('Error creating user index:', err.message);
    } else {
      console.log('Created index on user_id');
    }
  });

  db.run(`CREATE INDEX IF NOT EXISTS idx_attendance_event ON attendance(event_id)`, (err) => {
    if (err) {
      console.error('Error creating event index:', err.message);
    } else {
      console.log('Created index on event_id');
    }
  });
});

db.close((err) => {
  if (err) {
    console.error('Error closing database:', err.message);
  } else {
    console.log('Migration completed. Database connection closed.');
  }
});

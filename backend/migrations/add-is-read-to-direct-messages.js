const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, '../database.sqlite');
const db = new sqlite3.Database(dbPath);

// Check if direct_messages table exists
db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='direct_messages'", (err, table) => {
  if (err) {
    console.error('Error checking if table exists:', err);
    db.close();
    return;
  }

  if (!table) {
    console.log('direct_messages table does not exist, skipping migration');
    db.close();
    return;
  }

  // Check if is_read column exists
  db.all("PRAGMA table_info(direct_messages)", (err, columns) => {
    if (err) {
      console.error('Error checking table structure:', err);
      db.close();
      return;
    }

    const hasIsReadColumn = columns.some(col => col.name === 'is_read');

    if (!hasIsReadColumn) {
      db.run(`ALTER TABLE direct_messages ADD COLUMN is_read INTEGER DEFAULT 0`, (err) => {
        if (err) {
          console.error('Error adding is_read column:', err.message);
        } else {
          console.log('is_read column added to direct_messages table successfully');
        }
        
        // Create index for faster queries if not exists
        db.run(`CREATE INDEX IF NOT EXISTS idx_dm_unread ON direct_messages(receiver_id, is_read)`, (err) => {
          if (err) {
            console.error('Error creating index:', err.message);
          } else {
            console.log('Index created or already exists');
          }
          db.close();
        });
      });
    } else {
      console.log('is_read column already exists in direct_messages table');
      
      // Create index for faster queries if not exists
      db.run(`CREATE INDEX IF NOT EXISTS idx_dm_unread ON direct_messages(receiver_id, is_read)`, (err) => {
        if (err) {
          console.error('Error creating index:', err.message);
        } else {
          console.log('Index created or already exists');
        }
        db.close();
      });
    }
  });
});

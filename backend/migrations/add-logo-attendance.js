const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, '..', 'database.sqlite');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
  // Add logo column to teams table
  db.run(`ALTER TABLE teams ADD COLUMN logo TEXT`, (err) => {
    if (err) {
      if (err.message.includes('duplicate column')) {
        console.log('Column "logo" already exists in teams table');
      } else {
        console.error('Error adding logo column:', err.message);
      }
    } else {
      console.log('Added "logo" column to teams table');
    }
  });

  // Add attendance column to player_stats table
  db.run(`ALTER TABLE player_stats ADD COLUMN attendance INTEGER DEFAULT 0`, (err) => {
    if (err) {
      if (err.message.includes('duplicate column')) {
        console.log('Column "attendance" already exists in player_stats table');
      } else {
        console.error('Error adding attendance column:', err.message);
      }
    } else {
      console.log('Added "attendance" column to player_stats table');
    }
  });

  console.log('Migration completed!');
});

db.close();

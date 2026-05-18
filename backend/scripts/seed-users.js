const bcrypt = require('bcrypt');
const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const dbPath = process.env.DATABASE_PATH
  ? path.resolve(process.env.DATABASE_PATH)
  : path.resolve(__dirname, '..', 'database.sqlite');

const normalize = (value) => (typeof value === 'string' ? value.trim() : '');

const seedAdmin = {
  name: normalize(process.env.SEED_ADMIN_NAME) || 'Admin',
  surname: normalize(process.env.SEED_ADMIN_SURNAME) || 'User',
  email: normalize(process.env.SEED_ADMIN_EMAIL).toLowerCase(),
  password: normalize(process.env.SEED_ADMIN_PASSWORD),
  role: 'admin'
};

const seedUsers = [];

if (seedAdmin.email && seedAdmin.password) {
  seedUsers.push(seedAdmin);
}

if (!seedUsers.length) {
  console.log('[seed] No seed users configured');
  process.exit(0);
}

fs.mkdirSync(path.dirname(dbPath), { recursive: true });

const db = new sqlite3.Database(dbPath);

const run = (sql, params = []) => new Promise((resolve, reject) => {
  db.run(sql, params, function onRun(error) {
    if (error) reject(error);
    else resolve(this);
  });
});

const get = (sql, params = []) => new Promise((resolve, reject) => {
  db.get(sql, params, (error, row) => {
    if (error) reject(error);
    else resolve(row);
  });
});

async function ensureTables() {
  await run('PRAGMA foreign_keys = ON');
  await run(`CREATE TABLE IF NOT EXISTS users (
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
}

async function seedUser(user) {
  const existingUser = await get('SELECT id FROM users WHERE LOWER(email) = LOWER(?)', [user.email]);

  if (existingUser) {
    console.log(`[seed] User already exists: ${user.email}`);
    return;
  }

  const passwordHash = await bcrypt.hash(user.password, 10);

  const result = await run(
    'INSERT INTO users (name, surname, email, password, role) VALUES (?, ?, ?, ?, ?)',
    [user.name, user.surname, user.email, passwordHash, user.role]
  );

  console.log(`[seed] Created ${user.role} user: ${user.email} (id ${result.lastID})`);
}

(async () => {
  try {
    console.log(`[seed] Using SQLite database at: ${dbPath}`);
    await ensureTables();

    for (const user of seedUsers) {
      await seedUser(user);
    }
  } catch (error) {
    console.error('[seed] Failed:', error.stack || error.message || error);
    process.exitCode = 1;
  } finally {
    db.close();
  }
})();

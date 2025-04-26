const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const bodyParser = require('body-parser');

const app = express();
const PORT = 3000;
const authRoutes = require('auth');
 // если auth.js в папке routes
app.use('/api', authRoutes);
// База данных
const db = new sqlite3.Database('./database.sqlite');

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Создание таблицы пользователей
db.run(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    email TEXT UNIQUE,
    password TEXT,
    role TEXT
  )
`);

app.post('/register', async (req, res) => {
  console.log('POST /register', req.body);

  const { username, email, password, role } = req.body;

  if (!username || !email || !password || !role) {
    return res.status(400).json({ error: 'Все поля обязательны' });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    const stmt = db.prepare(`
      INSERT INTO users (username, email, password, role)
      VALUES (?, ?, ?, ?)
    `);

    stmt.run(username, email, hashedPassword, role, function(err) {
      if (err) {
        if (err.message.includes('UNIQUE')) {
          return res.status(400).json({ error: 'Пользователь с таким логином или email уже существует' });
        }
        return res.status(500).json({ error: 'Ошибка сервера' });
      }

      res.json({ success: true, message: 'Регистрация прошла успешно' });
    });

    stmt.finalize();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка при обработке запроса' });
  }
});

app.listen(PORT, () => {
  console.log(`Сервер запущен на http://localhost:${PORT}`);
});
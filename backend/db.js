const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Путь до файла базы данных
const dbPath = path.resolve(__dirname, 'database.sqlite');

// Подключение к базе данных
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Ошибка подключения к SQLite:', err.message);
  } else {
    console.log('Успешное подключение к SQLite базе данных');
  }
});

module.exports = db;
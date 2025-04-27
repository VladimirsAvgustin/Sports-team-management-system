const express = require('express');
const bcrypt = require('bcrypt');

module.exports = (db) => {
    const router = express.Router();

    router.post('/register', async (req, res) => {
        const { username, email, password, role } = req.body;

        if (!username || !email || !password) {
            return res.status(400).json({ error: 'Пожалуйста, заполните все поля.' });
        }

        const userRole = role || 'user';

        db.get('SELECT * FROM users WHERE email = ?', [email], async (err, row) => {
            if (err) {
                console.error(err.message);
                return res.status(500).json({ error: 'Ошибка сервера' });
            }

            if (row) {
                return res.status(400).json({ error: 'Пользователь с таким email уже существует' });
            } else {
                try {
                    const hashedPassword = await bcrypt.hash(password, 10);

                    db.run(
                        'INSERT INTO users (username, role, email, password) VALUES (?, ?, ?, ?)',
                        [username, userRole, email, hashedPassword],
                        function (err) {
                            if (err) {
                                console.error(err.message);
                                return res.status(500).json({ error: 'Ошибка при регистрации' });
                            }
                            res.status(201).json({ message: 'Пользователь успешно зарегистрирован', userId: this.lastID });
                        }
                    );
                } catch (hashError) {
                    console.error(hashError.message);
                    res.status(500).json({ error: 'Ошибка хеширования пароля' });
                }
            }
        });
    });
    router.post('/login', (req, res) => {
        const { username, password } = req.body;
      
        if (!username || !password) {
          return res.status(400).json({ error: 'Введите логин и пароль' });
        }
      
        db.get('SELECT * FROM users WHERE username = ?', [username], async (err, user) => {
          if (err) {
            console.error(err.message);
            return res.status(500).json({ error: 'Ошибка сервера' });
          }
      
          if (!user) {
            return res.status(400).json({ error: 'Пользователь не найден' });
          }
      
          try {
            const isPasswordValid = await bcrypt.compare(password, user.password);
            if (!isPasswordValid) {
              return res.status(400).json({ error: 'Неверный пароль' });
            }
      
            res.status(200).json({ message: 'Успешный вход', user: { id: user.id, username: user.username, role: user.role } });
          } catch (compareError) {
            console.error(compareError.message);
            res.status(500).json({ error: 'Ошибка проверки пароля' });
          }
        });
      });
      
    return router;
};

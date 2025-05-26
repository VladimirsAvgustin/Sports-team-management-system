const express = require('express');
const router = express.Router();
const db = require('../db'); // SQLite DB instance
const jwt = require('jsonwebtoken');
const JWT_SECRET = 'JWT_SECRET';

// --- Inline middleware ---

// Authenticate JWT token
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }
  const token = authHeader.split(' ')[1];
  try {
    const user = jwt.verify(token, JWT_SECRET);
    req.user = user;
    next();
  } catch (err) {
    return res.status(403).json({ error: 'Invalid token' });
  }
}

// Require specific user role (case-insensitive)
function requireRole(role) {
  return (req, res, next) => {
    if (!req.user || (req.user.role || '').toLowerCase() !== role.toLowerCase()) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    next();
  };
}

// --- Admin routes ---

// Get all users (admin only)
router.get('/users', authenticateToken, requireRole('admin'), (req, res) => {
  db.all('SELECT * FROM users', [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: 'Error retrieving users' });
    }
    res.json({ users: rows });
  });
});

// Delete a user (admin only)
router.delete('/users/:id', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    await db.run('DELETE FROM users WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Error deleting user' });
  }
});

// Update a user (admin only)
router.put('/users/:id', authenticateToken, requireRole('admin'), async (req, res) => {
  const { username, email, role, team_id } = req.body;
  try {
    await db.run(
      'UPDATE users SET username = ?, email = ?, role = ?, team_id = ? WHERE id = ?',
      [username, email, role, team_id, req.params.id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Error updating user' });
  }
});

module.exports = router;
// backend/routes/users.js — Updated to support Admin role

const express = require('express');
const router = express.Router();
const pool = require('../db');

// GET all or by role
router.get('/', async (req, res) => {
  try {
    const { role } = req.query;
    let query = 'SELECT id, name, email, role FROM users';
    let values = [];
    if (role) {
      query += ' WHERE role = $1';
      values.push(role);
    }
    const result = await pool.query(query, values);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// CREATE user (admin adds instructor/student)
router.post('/', async (req, res) => {
  try {
    const { name, email, role = 'student' } = req.body;
    if (!name || !email) return res.status(400).json({ error: 'Name and email required' });

    // Optional: Add admin-only restriction here if needed
    if (!['student', 'instructor', 'admin'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    const result = await pool.query(
      `INSERT INTO users (name, email, role, passwordhash)
       VALUES ($1, $2, $3, 'demo')
       RETURNING id, name, email, role`,
      [name, email, role]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// UPDATE user (admin can edit instructors)
router.put('/:id', async (req, res) => {
  try {
    const { name, email, role } = req.body;
    const result = await pool.query(
      'UPDATE users SET name=$1, email=$2, role=$3 WHERE id=$4 RETURNING id, name, email, role',
      [name, email, role, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE user
router.delete('/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM users WHERE id = $1', [req.params.id]);
    res.json({ message: 'User deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// LOGIN
router.post('/login', async (req, res) => {
  try {
    const { email } = req.body;
    const result = await pool.query(
      'SELECT id, name, email, role FROM users WHERE email = $1',
      [email]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
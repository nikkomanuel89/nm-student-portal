const express = require('express');
const router = express.Router();
const pool = require('../db');

// GET announcements (filter by courseId)
router.get('/', async (req, res) => {
  const { courseid } = req.query;
  let query = 'SELECT * FROM announcements';
  let values = [];
  if (courseid) {
    query += ' WHERE courseid = $1';
    values = [courseid];
  }
  const result = await pool.query(query, values);
  res.json(result.rows);
});

// CREATE
router.post('/', async (req, res) => {
  const { courseid, title, message } = req.body;
  const result = await pool.query(
    'INSERT INTO announcements (courseid, title, message) VALUES ($1, $2, $3) RETURNING *',
    [courseid, title, message]
  );
  res.json(result.rows[0]);
});

// UPDATE
router.put('/:id', async (req, res) => {
  const { title, message } = req.body;
  const result = await pool.query(
    'UPDATE announcements SET title=$1, message=$2 WHERE id=$3 RETURNING *',
    [title, message, req.params.id]
  );
  res.json(result.rows[0]);
});

// DELETE
router.delete('/:id', async (req, res) => {
  await pool.query('DELETE FROM announcements WHERE id = $1', [req.params.id]);
  res.json({ message: 'Deleted' });
});

module.exports = router;
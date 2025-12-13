const express = require('express');
const router = express.Router();
const pool = require('../db');

// GET all assignments (filter by courseid)
router.get('/', async (req, res) => {
  const { courseid } = req.query;
  let query = 'SELECT * FROM assignments';
  let values = [];
  if (courseid) {
    query += ' WHERE courseid = $1';
    values = [courseid];
  }
  const result = await pool.query(query, values);
  res.json(result.rows);
});

// GET submissions for an assignment (for professor)
router.get('/:id/submissions', async (req, res) => {
  const result = await pool.query('SELECT * FROM submissions WHERE assignmentid = $1', [req.params.id]);
  res.json(result.rows);
});

// CREATE assignment
router.post('/', async (req, res) => {
  const { title, duedate, courseid, description } = req.body;
  const result = await pool.query(
    'INSERT INTO assignments (title, duedate, courseid, description) VALUES ($1, $2, $3, $4) RETURNING *',
    [title, duedate, courseid, description]
  );
  res.json(result.rows[0]);
});

// UPDATE
router.put('/:id', async (req, res) => {
  const { title, duedate, description } = req.body;
  const result = await pool.query(
    'UPDATE assignments SET title=$1, duedate=$2, description=$3 WHERE id=$4 RETURNING *',
    [title, duedate, description, req.params.id]
  );
  res.json(result.rows[0]);
});

// DELETE
router.delete('/:id', async (req, res) => {
  await pool.query('DELETE FROM assignments WHERE id = $1', [req.params.id]);
  res.json({ message: 'Deleted' });
});

module.exports = router;
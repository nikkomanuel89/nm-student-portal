const express = require('express');
const router = express.Router();
const pool = require('../db');

// GET submissions (filter by studentid or assignmentid)
router.get('/', async (req, res) => {
  const { studentid, assignmentid } = req.query;
  let query = 'SELECT * FROM submissions';
  let values = [];
  if (studentid) {
    query += ' WHERE studentid = $1';
    values = [studentid];
  } else if (assignmentid) {
    query += ' WHERE assignmentid = $1';
    values = [assignmentid];
  }
  const result = await pool.query(query, values);
  res.json(result.rows);
});

// CREATE submission (student submit)
router.post('/', async (req, res) => {
  const { assignmentid, studentid, fileurl } = req.body;
  const result = await pool.query(
    'INSERT INTO submissions (assignmentid, studentid, fileurl) VALUES ($1, $2, $3) RETURNING *',
    [assignmentid, studentid, fileurl || 'https://demo-file.pdf']
  );
  res.json(result.rows[0]);
});

// UPDATE submission (general, but for file update)
router.put('/:id', async (req, res) => {
  const { fileurl } = req.body;
  const result = await pool.query(
    'UPDATE submissions SET fileurl=$1 WHERE id=$2 RETURNING *',
    [fileurl, req.params.id]
  );
  res.json(result.rows[0]);
});

// DELETE submission
router.delete('/:id', async (req, res) => {
  await pool.query('DELETE FROM submissions WHERE id = $1', [req.params.id]);
  res.json({ message: 'Deleted' });
});

// Grade submission (professor)
router.put('/:id/grade', async (req, res) => {
  const { grade, feedback } = req.body;
  const result = await pool.query(
    'UPDATE submissions SET grade=$1, feedback=$2 WHERE id=$3 RETURNING *',
    [grade, feedback, req.params.id]
  );
  res.json(result.rows[0]);
});

module.exports = router;
// backend/routes/courses.js — FIXED FOR MIXED TYPES, PREVENTS INFINITE ENROLL, HANDLES NULL/EMPTY STUDENTS

const express = require('express');
const router = express.Router();
const pool = require('../db');

// GET all courses
router.get('/', async (req, res) => {
  try {
    const { instructorid } = req.query;
    let query = 'SELECT * FROM courses';
    let values = [];

    if (instructorid) {
      query += ' WHERE instructorid = $1';
      values = [instructorid];
    }

    query += ' ORDER BY id';

    const result = await pool.query(query, values);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// CREATE course
router.post('/', async (req, res) => {
  try {
    const { title, description, syllabus, instructorid } = req.body;
    const result = await pool.query(
      `INSERT INTO courses (title, description, syllabus, instructorid, students)
       VALUES ($1, $2, $3, $4, '[]'::jsonb)
       RETURNING *`,
      [title, description || null, syllabus || null, instructorid]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// UPDATE course
router.put('/:id', async (req, res) => {
  try {
    const { title, description, syllabus } = req.body;
    const result = await pool.query(
      'UPDATE courses SET title = $1, description = $2, syllabus = $3 WHERE id = $4 RETURNING *',
      [title, description || null, syllabus || null, req.params.id]
    );
    if (result.rowCount === 0) return res.status(404).json({ error: 'Course not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE course
router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM courses WHERE id = $1', [req.params.id]);
    if (result.rowCount === 0) return res.status(404).json({ error: 'Course not found' });
    res.json({ message: 'Course deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ENROLL — Robust: Handle mixed string/number, append as integer, handle NULL students
router.post('/:id/enroll', async (req, res) => {
  try {
    const { studentid } = req.body;
    const courseId = req.params.id;

    const result = await pool.query(
      `UPDATE courses
       SET students = COALESCE(students, '[]'::jsonb) || jsonb_build_array($1::integer)
       WHERE id = $2
         AND NOT EXISTS (
           SELECT 1 FROM jsonb_array_elements(COALESCE(students, '[]'::jsonb)) elem
           WHERE replace(elem::text, '"', '') = $1::text
         )
       RETURNING *`,
      [studentid, courseId]
    );

    if (result.rowCount === 0) {
      return res.status(400).json({ error: 'Already enrolled or course not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Enroll error:', err);
    res.status(500).json({ error: err.message });
  }
});

// DROP — Robust: Handle mixed string/number, normalize to integer, handle empty as []
router.post('/:id/drop', async (req, res) => {
  try {
    const { studentid } = req.body;
    const courseId = req.params.id;

    const result = await pool.query(
      `UPDATE courses
       SET students = COALESCE((
         SELECT jsonb_agg(replace(elem::text, '"', '')::integer)
         FROM jsonb_array_elements(COALESCE(students, '[]'::jsonb)) elem
         WHERE replace(elem::text, '"', '') != $1::text
       ), '[]'::jsonb)
       WHERE id = $2
       RETURNING *`,
      [studentid, courseId]
    );

    if (result.rowCount === 0) {
      return res.json({ message: 'Course not found or no change' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Drop error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
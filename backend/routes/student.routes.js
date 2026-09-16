const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { authenticate, requireRole } = require('../middleware/auth.middleware');

router.get('/profile', authenticate, requireRole('student'), async (req, res) => {
  try {
    const result = await db.query(
      'SELECT id, name, reg_number, level, department, created_at FROM students WHERE id = $1',
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Student not found' });
    }

    return res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error('Get student profile error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Search/List registered students for score entry autocomplete
router.get('/search', authenticate, requireRole('lecturer'), async (req, res) => {
  const { query, department, level } = req.query;

  try {
    let sql = 'SELECT id, name, reg_number, level, department FROM students WHERE 1=1';
    const params = [];
    let pIdx = 1;

    if (query) {
      sql += ` AND (UPPER(reg_number) LIKE $${pIdx} OR UPPER(name) LIKE $${pIdx})`;
      params.push(`%${query.toUpperCase().trim()}%`);
      pIdx++;
    }

    if (level) {
      sql += ` AND UPPER(level) = $${pIdx}`;
      params.push(level.toUpperCase().trim());
      pIdx++;
    }

    sql += ' ORDER BY reg_number ASC LIMIT 200';


    const result = await db.query(sql, params);

    // If department filter passed (might be comma-separated multi-dept for course)
    let rows = result.rows;
    if (department) {
      const allowedDepts = department.split(',').map(d => d.trim().toUpperCase()).filter(Boolean);
      if (allowedDepts.length > 0) {
        rows = rows.filter(s => allowedDepts.includes(s.department.trim().toUpperCase()));
      }
    }

    return res.status(200).json(rows);
  } catch (error) {
    console.error('Student search error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;


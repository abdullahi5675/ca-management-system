const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { authenticate, requireRole } = require('../middleware/auth.middleware');

router.get('/profile', authenticate, requireRole('lecturer'), async (req, res) => {
  try {
    const result = await db.query(
      'SELECT id, name, email, created_at FROM lecturers WHERE id = $1',
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Lecturer not found' });
    }

    return res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error('Get lecturer profile error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;

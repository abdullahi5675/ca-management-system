const express = require('express');
const router = express.Router();
const scoreController = require('../controllers/score.controller');
const { authenticate, requireRole } = require('../middleware/auth.middleware');
const { upload } = require('../middleware/upload.middleware');

// Student route
router.get('/my', authenticate, requireRole('student'), scoreController.getMyScores);

// Lecturer routes
router.get('/course/:courseId', authenticate, requireRole('lecturer'), scoreController.getCourseScores);
router.post('/:courseId', authenticate, requireRole('lecturer'), scoreController.saveScores);
router.post('/upload/:courseId', authenticate, requireRole('lecturer'), upload.single('file'), scoreController.uploadScores);
router.post('/publish/:courseId', authenticate, requireRole('lecturer'), scoreController.publishScores);
router.post('/unpublish/:courseId', authenticate, requireRole('lecturer'), scoreController.unpublishScores);

module.exports = router;

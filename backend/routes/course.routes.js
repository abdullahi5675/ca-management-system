const express = require('express');
const router = express.Router();
const courseController = require('../controllers/course.controller');
const { authenticate, requireRole } = require('../middleware/auth.middleware');

router.use(authenticate);

// Publicly authenticated endpoint for both students and lecturers
router.get('/sessions', courseController.getUniqueSessions);

router.use(requireRole('lecturer'));

router.post('/', courseController.createCourse);
router.get('/my', courseController.getMyCourses);
router.get('/:id', courseController.getCourseById);
router.delete('/:id', courseController.deleteCourse);

module.exports = router;

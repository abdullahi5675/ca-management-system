const express = require('express');
const router = express.Router();
const complaintController = require('../controllers/complaint.controller');
const { authenticate, requireRole } = require('../middleware/auth.middleware');

// Student endpoints
router.post('/', authenticate, requireRole('student'), complaintController.submitComplaint);
router.get('/my', authenticate, requireRole('student'), complaintController.getMyComplaints);

// Lecturer endpoints
router.get('/lecturer', authenticate, requireRole('lecturer'), complaintController.getCourseComplaints);
router.post('/:id/respond', authenticate, requireRole('lecturer'), complaintController.respondToComplaint);

module.exports = router;

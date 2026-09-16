const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');

// Student Auth
router.post('/student/register', authController.registerStudent);
router.post('/student/login', authController.loginStudent);
router.post('/student/reset-password', authController.resetPasswordStudent);

// Lecturer Auth
router.post('/lecturer/register', authController.registerLecturer);
router.post('/lecturer/login', authController.loginLecturer);
router.post('/lecturer/reset-password', authController.resetPasswordLecturer);

module.exports = router;


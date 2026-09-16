const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

// Route files
const authRoutes = require('./routes/auth.routes');
const courseRoutes = require('./routes/course.routes');
const scoreRoutes = require('./routes/score.routes');
const complaintRoutes = require('./routes/complaint.routes');
const studentRoutes = require('./routes/student.routes');
const lecturerRoutes = require('./routes/lecturer.routes');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve frontend static files
app.use(express.static(path.join(__dirname, '../frontend')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/scores', scoreRoutes);
app.use('/api/complaints', complaintRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/lecturers', lecturerRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date() });
});

// Root route (routes to student login by default)
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/student/login.html'));
});

// 404 Route handler for API endpoints
app.use('/api/*', (req, res) => {
  res.status(404).json({ error: 'API endpoint not found' });
});

// Fallback HTML routing for clean frontend navigation
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/student/login.html'));
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled Server Error:', err);
  const statusCode = err.status || 500;
  res.status(statusCode).json({
    error: err.message || 'Internal server error occurred',
  });
});

app.listen(PORT, () => {
  console.log(`============================================================`);
  console.log(`  CA & COMPLAINT MANAGEMENT SYSTEM SERVER RUNNING`);
  console.log(`  Local URL: http://localhost:${PORT}`);
  console.log(`  Database Host: ${process.env.DB_HOST || 'localhost'}`);
  console.log(`============================================================`);
});

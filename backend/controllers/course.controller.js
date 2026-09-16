const db = require('../config/db');

// Create Course
const createCourse = async (req, res) => {
  const { 
    course_code, 
    course_name, 
    session, 
    semester, 
    department, 
    level,
    max_assignment,
    max_quiz,
    max_attendance,
    max_test,
    max_others
  } = req.body;
  
  const lecturer_id = req.user.id;

  if (!course_code || !course_name || !session || !semester || !department || !level) {
    return res.status(400).json({ error: 'All core fields are required' });
  }

  // Parse maximum marks weights
  const mA = parseFloat(max_assignment) || 0;
  const mQ = parseFloat(max_quiz) || 0;
  const mAt = parseFloat(max_attendance) || 0;
  const mT = parseFloat(max_test) || 0;
  const mO = parseFloat(max_others) || 0;

  // Validate weights sum is exactly 40.0
  const sum = mA + mQ + mAt + mT + mO;
  if (Math.abs(sum - 40.0) > 0.01) {
    return res.status(400).json({ error: `Assessment components weights must sum to exactly 40.0. Current sum is: ${sum}` });
  }

  try {
    const result = await db.query(
      `INSERT INTO courses (
         course_code, course_name, session, semester, department, level, lecturer_id,
         max_assignment, max_quiz, max_attendance, max_test, max_others
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING *`,
      [
        course_code.toUpperCase().trim(), 
        course_name.trim(), 
        session.trim(), 
        Number(semester), 
        department.trim(), 
        level, 
        lecturer_id,
        mA, mQ, mAt, mT, mO
      ]
    );

    return res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create course error:', error);
    if (error.code === '23505') {
      return res.status(409).json({ error: 'You have already registered this course code for this session, semester, department, and level.' });
    }
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// Get My Courses (for Lecturer)
const getMyCourses = async (req, res) => {
  const lecturer_id = req.user.id;
  const { session, semester } = req.query;

  let queryText = `
    SELECT c.*,
      COALESCE(s.draft_count, 0) as draft_count,
      COALESCE(s.published_count, 0) as published_count,
      COALESCE(comp.pending_count, 0) as pending_complaints_count
    FROM courses c
    LEFT JOIN (
      SELECT course_id,
        COUNT(CASE WHEN is_published = FALSE THEN 1 END) as draft_count,
        COUNT(CASE WHEN is_published = TRUE THEN 1 END) as published_count
      FROM scores
      GROUP BY course_id
    ) s ON c.id = s.course_id
    LEFT JOIN (
      SELECT course_id, COUNT(*) as pending_count
      FROM complaints
      WHERE status != 'Resolved'
      GROUP BY course_id
    ) comp ON c.id = comp.course_id
    WHERE c.lecturer_id = $1
  `;
  const params = [lecturer_id];

  let paramIndex = 2;
  if (session) {
    queryText += ` AND c.session = $${paramIndex}`;
    params.push(session);
    paramIndex++;
  }
  if (semester) {
    queryText += ` AND c.semester = $${paramIndex}`;
    params.push(Number(semester));
    paramIndex++;
  }

  queryText += ` ORDER BY c.course_code ASC`;

  try {
    const result = await db.query(queryText, params);
    return res.status(200).json(result.rows);
  } catch (error) {
    console.error('Get my courses error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// Get Course By ID
const getCourseById = async (req, res) => {
  const { id } = req.params;
  const lecturer_id = req.user.id;

  try {
    const result = await db.query('SELECT * FROM courses WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Course not found' });
    }

    const course = result.rows[0];
    if (course.lecturer_id !== lecturer_id) {
      return res.status(403).json({ error: 'Access forbidden. You do not own this course.' });
    }

    return res.status(200).json(course);
  } catch (error) {
    console.error('Get course by id error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// Delete Course
const deleteCourse = async (req, res) => {
  const { id } = req.params;
  const lecturer_id = req.user.id;

  try {
    const result = await db.query('SELECT * FROM courses WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Course not found' });
    }

    const course = result.rows[0];
    if (course.lecturer_id !== lecturer_id) {
      return res.status(403).json({ error: 'Access forbidden. You cannot delete this course.' });
    }

    await db.query('DELETE FROM courses WHERE id = $1', [id]);
    return res.status(200).json({ message: 'Course deleted successfully' });
  } catch (error) {
    console.error('Delete course error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// Get Unique Registered Sessions (Public / Auth)
const getUniqueSessions = async (req, res) => {
  try {
    const result = await db.query('SELECT DISTINCT session FROM courses ORDER BY session DESC');
    const sessions = result.rows.map(r => r.session);
    return res.status(200).json(sessions);
  } catch (error) {
    console.error('Get unique sessions error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  createCourse,
  getMyCourses,
  getCourseById,
  deleteCourse,
  getUniqueSessions
};

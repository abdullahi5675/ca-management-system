const db = require('../config/db');
const fs = require('fs');
const csv = require('csv-parser');

// Helper to clean strings for matching
const cleanStr = (str) => (str ? str.toString().trim().toLowerCase() : '');

// Common logic to process score rows and UPSERT them
const processScoreRows = async (rows, courseId, lecturerId) => {
  // Fetch course details
  const courseRes = await db.query('SELECT * FROM courses WHERE id = $1', [courseId]);
  if (courseRes.rows.length === 0) {
    throw new Error('Course not found');
  }
  const course = courseRes.rows[0];

  if (course.lecturer_id !== lecturerId) {
    throw new Error('Unauthorized');
  }

  const results = [];
  let savedCount = 0;

  for (const row of rows) {
    const regNumber = row.reg_number ? row.reg_number.trim().toUpperCase() : '';
    if (!regNumber) continue;

    // 1. Extract scores (default to 0 if invalid/empty)
    const assignment = parseFloat(row.assignment) || 0;
    const quiz = parseFloat(row.quiz) || 0;
    const attendance = parseFloat(row.attendance) || 0;
    const test = parseFloat(row.test) || 0;
    const others = parseFloat(row.others) || 0;

    // 2. Validate weights sum is within bounds
    if (assignment > parseFloat(course.max_assignment)) {
      results.push({
        reg_number: regNumber,
        status: 'error',
        message: `Assignment score ${assignment} exceeds maximum weight of ${course.max_assignment}`
      });
      continue;
    }
    if (quiz > parseFloat(course.max_quiz)) {
      results.push({
        reg_number: regNumber,
        status: 'error',
        message: `Quiz score ${quiz} exceeds maximum weight of ${course.max_quiz}`
      });
      continue;
    }
    if (attendance > parseFloat(course.max_attendance)) {
      results.push({
        reg_number: regNumber,
        status: 'error',
        message: `Attendance score ${attendance} exceeds maximum weight of ${course.max_attendance}`
      });
      continue;
    }
    if (test > parseFloat(course.max_test)) {
      results.push({
        reg_number: regNumber,
        status: 'error',
        message: `Test score ${test} exceeds maximum weight of ${course.max_test}`
      });
      continue;
    }
    if (others > parseFloat(course.max_others)) {
      results.push({
        reg_number: regNumber,
        status: 'error',
        message: `Others score ${others} exceeds maximum weight of ${course.max_others}`
      });
      continue;
    }

    // 3. Find student if registered
    const studentRes = await db.query('SELECT * FROM students WHERE UPPER(reg_number) = UPPER($1)', [regNumber]);
    let studentId = null;
    let status = 'saved';
    let message = 'Score saved successfully as draft';
    let studentName = 'Unregistered Student';

    if (studentRes.rows.length > 0) {
      const student = studentRes.rows[0];
      studentName = student.name;
      studentId = student.id;

      // Validate department and level
      const studentDept = cleanStr(student.department);
      const courseDept = cleanStr(course.department);
      const studentLvl = cleanStr(student.level);
      const courseLvl = cleanStr(course.level);

      // Support multi-department courses (comma-separated in course.department)
      const courseDepts = courseDept.split(',').map(d => d.trim().toLowerCase());
      if (!courseDepts.includes(studentDept) || studentLvl !== courseLvl) {
        status = 'dept_level_mismatch';
        message = `Notice: Student is ${student.department} ${student.level}, Course is ${course.department} ${course.level}`;
      }
    } else {
      status = 'not_registered';
      message = 'Student is not registered yet (Saved as draft)';
    }

    // 4. UPSERT score using unique constraint (reg_number, course_id)
    await db.query(
      `INSERT INTO scores (student_id, course_id, reg_number, assignment, quiz, attendance, test, others, entered_by, is_published)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, FALSE)
       ON CONFLICT (reg_number, course_id)
       DO UPDATE SET
         student_id = EXCLUDED.student_id,
         assignment = EXCLUDED.assignment,
         quiz = EXCLUDED.quiz,
         attendance = EXCLUDED.attendance,
         test = EXCLUDED.test,
         others = EXCLUDED.others,
         entered_by = EXCLUDED.entered_by,
         is_published = FALSE
       `,
      [studentId, course.id, regNumber, assignment, quiz, attendance, test, others, lecturerId]
    );

    savedCount++;
    results.push({
      reg_number: regNumber,
      student_name: studentName,
      status: status,
      message: message,
      scores: { assignment, quiz, attendance, test, others, total: assignment + quiz + attendance + test + others }
    });
  }

  return { savedCount, results };
};

// Save Scores manually entered
const saveScores = async (req, res) => {
  const { courseId } = req.params;
  const { scores } = req.body;
  const lecturerId = req.user.id;

  if (!scores || !Array.isArray(scores)) {
    return res.status(400).json({ error: 'Scores array is required' });
  }

  try {
    const outcome = await processScoreRows(scores, courseId, lecturerId);
    return res.status(200).json({
      message: 'Scores processed successfully',
      savedCount: outcome.savedCount,
      results: outcome.results
    });
  } catch (error) {
    console.error('Save scores error:', error);
    if (error.message === 'Course not found') {
      return res.status(404).json({ error: error.message });
    }
    if (error.message === 'Unauthorized') {
      return res.status(403).json({ error: 'Access forbidden. You do not own this course.' });
    }
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// Upload Scores CSV file
const uploadScores = async (req, res) => {
  const { courseId } = req.params;
  const lecturerId = req.user.id;

  if (!req.file) {
    return res.status(400).json({ error: 'CSV file is required' });
  }

  const filePath = req.file.path;
  const rows = [];

  fs.createReadStream(filePath)
    .pipe(csv())
    .on('data', (data) => {
      const row = {
        reg_number: data.reg_number || data['Reg Number'] || data['reg number'] || data['matric_no'] || data['Matric No'] || '',
        assignment: data.assignment || data['Assignment'] || 0,
        quiz: data.quiz || data['Quiz'] || 0,
        attendance: data.attendance || data['Attendance'] || 0,
        test: data.test || data['Test'] || 0,
        others: data.others || data.other || data['Others'] || data['Other'] || 0
      };
      rows.push(row);
    })
    .on('end', async () => {
      try {
        const outcome = await processScoreRows(rows, courseId, lecturerId);
        fs.unlinkSync(filePath);
        return res.status(200).json({
          message: 'CSV file processed successfully',
          savedCount: outcome.savedCount,
          results: outcome.results
        });
      } catch (error) {
        console.error('CSV upload process error:', error);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
        if (error.message === 'Course not found') {
          return res.status(404).json({ error: error.message });
        }
        if (error.message === 'Unauthorized') {
          return res.status(403).json({ error: 'Access forbidden' });
        }
        return res.status(500).json({ error: 'Error processing CSV file content' });
      }
    })
    .on('error', (err) => {
      console.error('CSV read stream error:', err);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      return res.status(500).json({ error: 'Failed to read CSV file' });
    });
};

// Get Course Scores (Lecturer View)
const getCourseScores = async (req, res) => {
  const { courseId } = req.params;
  const lecturerId = req.user.id;

  try {
    const courseRes = await db.query('SELECT lecturer_id FROM courses WHERE id = $1', [courseId]);
    if (courseRes.rows.length === 0) {
      return res.status(404).json({ error: 'Course not found' });
    }
    if (courseRes.rows[0].lecturer_id !== lecturerId) {
      return res.status(403).json({ error: 'Access forbidden' });
    }

    const queryText = `
      SELECT s.id as score_id, s.assignment, s.quiz, s.attendance, s.test, s.others, s.total, s.is_published,
             COALESCE(stud.name, 'Unregistered Student') as student_name,
             s.reg_number
      FROM scores s
      LEFT JOIN students stud ON s.student_id = stud.id
      WHERE s.course_id = $1
      ORDER BY s.reg_number ASC
    `;
    const result = await db.query(queryText, [courseId]);
    return res.status(200).json(result.rows);
  } catch (error) {
    console.error('Get course scores error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// Publish Scores (Set is_published = TRUE)
const publishScores = async (req, res) => {
  const { courseId } = req.params;
  const lecturerId = req.user.id;

  try {
    const courseRes = await db.query('SELECT lecturer_id FROM courses WHERE id = $1', [courseId]);
    if (courseRes.rows.length === 0) {
      return res.status(404).json({ error: 'Course not found' });
    }
    if (courseRes.rows[0].lecturer_id !== lecturerId) {
      return res.status(403).json({ error: 'Access forbidden' });
    }

    const result = await db.query(
      'UPDATE scores SET is_published = TRUE WHERE course_id = $1 RETURNING id',
      [courseId]
    );

    return res.status(200).json({
      message: 'Scores published successfully',
      count: result.rows.length
    });
  } catch (error) {
    console.error('Publish scores error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// Unpublish Scores (Set is_published = FALSE)
const unpublishScores = async (req, res) => {
  const { courseId } = req.params;
  const lecturerId = req.user.id;

  try {
    const courseRes = await db.query('SELECT lecturer_id FROM courses WHERE id = $1', [courseId]);
    if (courseRes.rows.length === 0) {
      return res.status(404).json({ error: 'Course not found' });
    }
    if (courseRes.rows[0].lecturer_id !== lecturerId) {
      return res.status(403).json({ error: 'Access forbidden' });
    }

    const result = await db.query(
      'UPDATE scores SET is_published = FALSE WHERE course_id = $1 RETURNING id',
      [courseId]
    );

    return res.status(200).json({
      message: 'Scores unpublished (restored to draft) successfully',
      count: result.rows.length
    });
  } catch (error) {
    console.error('Unpublish scores error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// Get My Scores (Student View)
const getMyScores = async (req, res) => {
  const studentId = req.user.id;
  const { session, semester } = req.query;

  try {
    // Fetch student's reg_number so we can also match scores saved before registration
    const studentRes = await db.query('SELECT reg_number FROM students WHERE id = $1', [studentId]);
    if (studentRes.rows.length === 0) {
      return res.status(404).json({ error: 'Student not found' });
    }
    const regNumber = studentRes.rows[0].reg_number;

    // Link any orphaned scores to this student id
    await db.query(
      'UPDATE scores SET student_id = $1 WHERE student_id IS NULL AND UPPER(TRIM(reg_number)) = UPPER(TRIM($2))',
      [studentId, regNumber]
    );

    let queryText = `
      SELECT s.assignment, s.quiz, s.attendance, s.test, s.others, s.total,
             c.id as course_id, c.course_code, c.course_name, c.session, c.semester,
             l.name as lecturer_name
      FROM scores s
      JOIN courses c ON s.course_id = c.id
      JOIN lecturers l ON c.lecturer_id = l.id
      WHERE (s.student_id = $1 OR UPPER(TRIM(s.reg_number)) = UPPER(TRIM($2)))
        AND s.is_published = TRUE
    `;
    const params = [studentId, regNumber];
    let paramIndex = 3;

    if (session) {
      queryText += ` AND c.session = $${paramIndex}`;
      params.push(session.trim());
      paramIndex++;
    }

    if (semester) {
      queryText += ` AND c.semester = $${paramIndex}`;
      params.push(Number(semester));
      paramIndex++;
    }

    queryText += ` ORDER BY c.course_code ASC`;

    const result = await db.query(queryText, params);
    return res.status(200).json(result.rows);
  } catch (error) {
    console.error('Get student scores error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  saveScores,
  uploadScores,
  getCourseScores,
  publishScores,
  unpublishScores,
  getMyScores
};

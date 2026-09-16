const db = require('../config/db');

// Submit Complaint (Student Only)
const submitComplaint = async (req, res) => {
  const { course_id, complaint_type, description } = req.body;
  const student_id = req.user.id;

  if (!course_id || !complaint_type || !description) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  const validTypes = ['Score Dispute', 'Assessment Conduct', 'Other'];
  if (!validTypes.includes(complaint_type)) {
    return res.status(400).json({ error: 'Invalid complaint type' });
  }

  try {
    const result = await db.query(
      `INSERT INTO complaints (student_id, course_id, complaint_type, description, status)
       VALUES ($1, $2, $3, $4, 'Pending')
       RETURNING *`,
      [student_id, course_id, complaint_type, description.trim()]
    );
    return res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Submit complaint error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// Get My Complaints (Student View)
const getMyComplaints = async (req, res) => {
  const student_id = req.user.id;

  try {
    // Get complaints
    const complaintsRes = await db.query(
      `SELECT c.id, c.complaint_type, c.description, c.status, c.created_at,
              crs.course_code, crs.course_name
       FROM complaints c
       JOIN courses crs ON c.course_id = crs.id
       WHERE c.student_id = $1
       ORDER BY c.created_at DESC`,
      [student_id]
    );

    const complaints = complaintsRes.rows;

    // For each complaint, fetch responses
    for (const comp of complaints) {
      const respRes = await db.query(
        `SELECT r.id, r.response_text, r.created_at, l.name as lecturer_name
         FROM complaint_responses r
         JOIN lecturers l ON r.lecturer_id = l.id
         WHERE r.complaint_id = $1
         ORDER BY r.created_at ASC`,
        [comp.id]
      );
      comp.responses = respRes.rows;
    }

    return res.status(200).json(complaints);
  } catch (error) {
    console.error('Get student complaints error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// Get Course Complaints (Lecturer View)
const getCourseComplaints = async (req, res) => {
  const lecturer_id = req.user.id;

  try {
    const complaintsRes = await db.query(
      `SELECT c.id, c.complaint_type, c.description, c.status, c.created_at,
              crs.course_code, crs.course_name, crs.id as course_id,
              stud.name as student_name, stud.reg_number, stud.level, stud.department
       FROM complaints c
       JOIN courses crs ON c.course_id = crs.id
       JOIN students stud ON c.student_id = stud.id
       WHERE crs.lecturer_id = $1
       ORDER BY c.created_at DESC`,
      [lecturer_id]
    );

    const complaints = complaintsRes.rows;

    for (const comp of complaints) {
      // Get score info associated with the student and course
      const scoreRes = await db.query(
        `SELECT assignment, quiz, attendance, test, others, total
         FROM scores
         WHERE student_id = (SELECT id FROM students WHERE reg_number = $1)
           AND course_id = $2`,
        [comp.reg_number, comp.course_id]
      );
      comp.student_scores = scoreRes.rows.length > 0 ? scoreRes.rows[0] : null;

      // Get responses
      const respRes = await db.query(
        `SELECT r.id, r.response_text, r.created_at, l.name as lecturer_name
         FROM complaint_responses r
         JOIN lecturers l ON r.lecturer_id = l.id
         WHERE r.complaint_id = $1
         ORDER BY r.created_at ASC`,
        [comp.id]
      );
      comp.responses = respRes.rows;
    }

    return res.status(200).json(complaints);
  } catch (error) {
    console.error('Get lecturer complaints error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// Respond to Complaint (Lecturer Only)
const respondToComplaint = async (req, res) => {
  const { id } = req.params;
  const { response_text, status } = req.body;
  const lecturer_id = req.user.id;

  if (!response_text || !status) {
    return res.status(400).json({ error: 'Response text and status are required' });
  }

  const validStatuses = ['Pending', 'Under Review', 'Resolved'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: 'Invalid status update' });
  }

  try {
    // Verify lecturer owns the course of the complaint
    const checkRes = await db.query(
      `SELECT c.id FROM complaints c
       JOIN courses crs ON c.course_id = crs.id
       WHERE c.id = $1 AND crs.lecturer_id = $2`,
      [id, lecturer_id]
    );

    if (checkRes.rows.length === 0) {
      return res.status(403).json({ error: 'Access forbidden. You do not manage this complaint.' });
    }

    // Insert response
    await db.query(
      `INSERT INTO complaint_responses (complaint_id, lecturer_id, response_text)
       VALUES ($1, $2, $3)`,
      [id, lecturer_id, response_text.trim()]
    );

    // Update status
    await db.query(
      `UPDATE complaints SET status = $1 WHERE id = $2`,
      [status, id]
    );

    return res.status(200).json({ message: 'Complaint response sent and status updated successfully' });
  } catch (error) {
    console.error('Respond to complaint error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  submitComplaint,
  getMyComplaints,
  getCourseComplaints,
  respondToComplaint
};

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');

// Register Student
const registerStudent = async (req, res) => {
  const { name, reg_number, level, department, password, confirmPassword } = req.body;

  if (!name || !reg_number || !level || !department || !password || !confirmPassword) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  if (password !== confirmPassword) {
    return res.status(400).json({ error: 'Passwords do not match' });
  }

  const validLevels = ['100L', '200L', '300L', '400L', '500L'];
  if (!validLevels.includes(level)) {
    return res.status(400).json({ error: 'Invalid level selected' });
  }

  try {
    // Check if duplicate student exists
    const checkUser = await db.query('SELECT id FROM students WHERE reg_number = $1', [reg_number]);
    if (checkUser.rows.length > 0) {
      return res.status(409).json({ error: 'Student with this registration number already exists' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const insertRes = await db.query(
      'INSERT INTO students (name, reg_number, level, department, password) VALUES ($1, $2, $3, $4, $5) RETURNING id',
      [name, reg_number, level, department, passwordHash]
    );
    const newStudentId = insertRes.rows[0].id;

    // Link any orphaned scores that were previously added using this reg_number
    await db.query(
      `UPDATE scores SET student_id = $1 
       WHERE UPPER(TRIM(reg_number)) = UPPER(TRIM($2)) 
          OR REPLACE(UPPER(reg_number), ' ', '') = REPLACE(UPPER($2), ' ', '')`,
      [newStudentId, reg_number]
    );

    return res.status(201).json({ message: 'Student registration successful' });
  } catch (error) {
    console.error('Student registration error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// Login Student
const loginStudent = async (req, res) => {
  const { reg_number, password } = req.body;

  if (!reg_number || !password) {
    return res.status(400).json({ error: 'Registration number and password are required' });
  }

  try {
    const cleanReg = reg_number.trim().toUpperCase();
    const result = await db.query('SELECT * FROM students WHERE UPPER(reg_number) = $1', [cleanReg]);
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid registration number or password' });
    }

    const student = result.rows[0];
    const isMatch = await bcrypt.compare(password, student.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid registration number or password' });
    }

    const token = jwt.sign(
      { id: student.id, reg_number: student.reg_number, name: student.name, role: 'student' },
      process.env.JWT_SECRET || 'your_super_secret_jwt_key_change_this_in_production',
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    return res.status(200).json({
      token,
      user: {
        id: student.id,
        name: student.name,
        reg_number: student.reg_number,
        level: student.level,
        department: student.department,
        role: 'student'
      }
    });
  } catch (error) {
    console.error('Student login error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// Register Lecturer
const registerLecturer = async (req, res) => {
  const { name, email, password, confirmPassword, inviteCode } = req.body;

  if (!name || !email || !password || !confirmPassword || !inviteCode) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  if (password !== confirmPassword) {
    return res.status(400).json({ error: 'Passwords do not match' });
  }

  const systemInviteCode = process.env.LECTURER_INVITE_CODE || 'MUST2024SEC';
  if (inviteCode !== systemInviteCode) {
    return res.status(403).json({ error: 'Invalid lecturer invitation code' });
  }

  try {
    const checkUser = await db.query('SELECT id FROM lecturers WHERE email = $1', [email]);
    if (checkUser.rows.length > 0) {
      return res.status(409).json({ error: 'Lecturer with this email already exists' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    await db.query(
      'INSERT INTO lecturers (name, email, password) VALUES ($1, $2, $3)',
      [name, email, passwordHash]
    );

    return res.status(201).json({ message: 'Lecturer registration successful' });
  } catch (error) {
    console.error('Lecturer registration error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// Login Lecturer
const loginLecturer = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    const cleanEmail = email.trim().toLowerCase();
    const result = await db.query('SELECT * FROM lecturers WHERE LOWER(email) = $1', [cleanEmail]);
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const lecturer = result.rows[0];
    const isMatch = await bcrypt.compare(password, lecturer.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = jwt.sign(
      { id: lecturer.id, email: lecturer.email, name: lecturer.name, role: 'lecturer' },
      process.env.JWT_SECRET || 'your_super_secret_jwt_key_change_this_in_production',
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    return res.status(200).json({
      token,
      user: {
        id: lecturer.id,
        name: lecturer.name,
        email: lecturer.email,
        role: 'lecturer'
      }
    });
  } catch (error) {
    console.error('Lecturer login error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// Reset Password Student
const resetPasswordStudent = async (req, res) => {
  const { reg_number, newPassword, confirmPassword } = req.body;

  if (!reg_number || !newPassword || !confirmPassword) {
    return res.status(400).json({ error: 'Matric number and new password fields are required' });
  }

  if (newPassword !== confirmPassword) {
    return res.status(400).json({ error: 'Passwords do not match' });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters long' });
  }

  try {
    const cleanReg = reg_number.trim().toUpperCase();
    const result = await db.query('SELECT id FROM students WHERE UPPER(reg_number) = $1', [cleanReg]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'No student found with this registration number' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(newPassword, salt);

    await db.query('UPDATE students SET password = $1 WHERE UPPER(reg_number) = $2', [passwordHash, cleanReg]);

    return res.status(200).json({ message: 'Password reset successfully. You can now login.' });
  } catch (error) {
    console.error('Student password reset error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// Reset Password Lecturer
const resetPasswordLecturer = async (req, res) => {
  const { email, newPassword, confirmPassword } = req.body;

  if (!email || !newPassword || !confirmPassword) {
    return res.status(400).json({ error: 'Email and new password fields are required' });
  }

  if (newPassword !== confirmPassword) {
    return res.status(400).json({ error: 'Passwords do not match' });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters long' });
  }

  try {
    const cleanEmail = email.trim().toLowerCase();
    const result = await db.query('SELECT id FROM lecturers WHERE LOWER(email) = $1', [cleanEmail]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'No lecturer found with this email address' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(newPassword, salt);

    await db.query('UPDATE lecturers SET password = $1 WHERE LOWER(email) = $2', [passwordHash, cleanEmail]);

    return res.status(200).json({ message: 'Password reset successfully. You can now login.' });
  } catch (error) {
    console.error('Lecturer password reset error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  registerStudent,
  loginStudent,
  registerLecturer,
  loginLecturer,
  resetPasswordStudent,
  resetPasswordLecturer
};


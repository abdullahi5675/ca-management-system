const db = require('../backend/config/db');

async function diagnose() {
  try {
    console.log('--- STUDENTS ---');
    const students = await db.query('SELECT id, name, reg_number, department, level FROM students');
    console.table(students.rows);

    console.log('\n--- COURSES ---');
    const courses = await db.query('SELECT id, course_code, course_name, session, semester, department, level, lecturer_id FROM courses');
    console.table(courses.rows);

    console.log('\n--- SCORES ---');
    const scores = await db.query('SELECT id, student_id, course_id, reg_number, total, is_published FROM scores');
    console.table(scores.rows);

    console.log('\n--- TESTING getMyScores LOGIC FOR EACH STUDENT ---');
    for (const student of students.rows) {
      const res = await db.query(
        `SELECT s.id as score_id, s.reg_number as score_reg, s.student_id, s.is_published,
                c.course_code, c.session, c.semester,
                (s.student_id = $1) as id_match,
                (UPPER(TRIM(s.reg_number)) = UPPER(TRIM($2))) as reg_match
         FROM scores s
         JOIN courses c ON s.course_id = c.id
         WHERE (s.student_id = $1 OR UPPER(TRIM(s.reg_number)) = UPPER(TRIM($2)))`,
        [student.id, student.reg_number]
      );
      console.log(`Student ${student.name} (${student.reg_number}, ID: ${student.id}) has ${res.rows.length} score records:`);
      console.table(res.rows);
    }

    process.exit(0);
  } catch (err) {
    console.error('Diagnosis error:', err);
    process.exit(1);
  }
}

diagnose();

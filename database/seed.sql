-- ============================================================
-- SEED DATA — For development and testing
-- All passwords below are bcrypt hashes of: password123
-- ============================================================

-- Sample Lecturers
INSERT INTO lecturers (name, email, password) VALUES
('Dr. Abubakar Musa',    'musa@university.edu.ng',    '$2a$10$SPMRrtGDQBesh4ATzIxhC.nAPuTKm5C9BaFKnhOsF.PmaYt.f6gsG'),
('Prof. Fatima Suleiman', 'fatima@university.edu.ng',  '$2a$10$SPMRrtGDQBesh4ATzIxhC.nAPuTKm5C9BaFKnhOsF.PmaYt.f6gsG'),
('Dr. Emeka Okafor',      'okafor@university.edu.ng',  '$2a$10$SPMRrtGDQBesh4ATzIxhC.nAPuTKm5C9BaFKnhOsF.PmaYt.f6gsG');

-- Sample Students
INSERT INTO students (name, reg_number, level, department, password) VALUES
('Amina Ibrahim',      'CSC/2022/001', '200L', 'Computer Science',       '$2a$10$SPMRrtGDQBesh4ATzIxhC.nAPuTKm5C9BaFKnhOsF.PmaYt.f6gsG'),
('Usman Garba',        'CSC/2022/002', '200L', 'Computer Science',       '$2a$10$SPMRrtGDQBesh4ATzIxhC.nAPuTKm5C9BaFKnhOsF.PmaYt.f6gsG'),
('Blessing Nwosu',     'CSC/2022/003', '200L', 'Computer Science',       '$2a$10$SPMRrtGDQBesh4ATzIxhC.nAPuTKm5C9BaFKnhOsF.PmaYt.f6gsG'),
('Halima Yusuf',       'EEE/2023/001', '100L', 'Electrical Engineering', '$2a$10$SPMRrtGDQBesh4ATzIxhC.nAPuTKm5C9BaFKnhOsF.PmaYt.f6gsG'),
('Chukwuemeka Eze',    'EEE/2023/002', '100L', 'Electrical Engineering', '$2a$10$SPMRrtGDQBesh4ATzIxhC.nAPuTKm5C9BaFKnhOsF.PmaYt.f6gsG');

-- Sample Courses
INSERT INTO courses (course_code, course_name, session, semester, department, level, lecturer_id, max_assignment, max_quiz, max_attendance, max_test, max_others) VALUES
('CSC 201', 'Data Structures & Algorithms',  '2023/2024', 1, 'Computer Science',       '200L', 1, 10.0, 10.0, 10.0, 10.0, 0.0),
('CSC 203', 'Object-Oriented Programming',   '2023/2024', 1, 'Computer Science',       '200L', 1, 15.0, 5.0,  5.0,  15.0, 0.0),
('EEE 101', 'Introduction to Electrical Eng','2023/2024', 1, 'Electrical Engineering', '100L', 2, 10.0, 10.0, 10.0, 10.0, 0.0);

-- Sample Scores (unpublished draft)
INSERT INTO scores (student_id, course_id, reg_number, assignment, quiz, attendance, test, others, is_published, entered_by) VALUES
(1, 1, 'CSC/2022/001', 7.5, 6.0, 8.0, 9.5, 0.0, FALSE, 1),
(2, 1, 'CSC/2022/002', 6.0, 5.5, 7.5, 8.0, 0.0, FALSE, 1),
(3, 1, 'CSC/2022/003', 8.0, 7.5, 8.5, 9.0, 0.0, FALSE, 1);

-- Sample published scores
INSERT INTO scores (student_id, course_id, reg_number, assignment, quiz, attendance, test, others, is_published, entered_by) VALUES
(1, 2, 'CSC/2022/001', 12.0, 4.0, 4.0, 13.0, 0.0, TRUE, 1),
(2, 2, 'CSC/2022/002', 11.5, 3.5, 3.0, 12.0, 0.0, TRUE, 1),
(3, 2, 'CSC/2022/003', 13.0, 4.5, 4.5, 14.0, 0.0, TRUE, 1);

-- Sample Complaints
INSERT INTO complaints (student_id, course_id, complaint_type, description, status) VALUES
(1, 2, 'Score Dispute',     'My assignment score for CSC 203 seems incorrect. I submitted all sections.', 'Under Review'),
(2, 1, 'Assessment Conduct','The test environment was noisy and affected my performance.',                 'Pending');

-- Sample Response
INSERT INTO complaint_responses (complaint_id, lecturer_id, response_text) VALUES
(1, 1, 'I have reviewed your submission. The score has been checked and will be updated shortly.');

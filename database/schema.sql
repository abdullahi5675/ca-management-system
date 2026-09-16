-- ============================================================
-- CA & COMPLAINT MANAGEMENT SYSTEM — DATABASE SCHEMA
-- PostgreSQL (pgAdmin4)
-- ============================================================

-- Drop tables if rebuilding (safe order respecting foreign keys)
DROP TABLE IF EXISTS complaint_responses CASCADE;
DROP TABLE IF EXISTS complaints CASCADE;
DROP TABLE IF EXISTS scores CASCADE;
DROP TABLE IF EXISTS courses CASCADE;
DROP TABLE IF EXISTS lecturers CASCADE;
DROP TABLE IF EXISTS students CASCADE;

-- ============================================================
-- STUDENTS TABLE
-- ============================================================
CREATE TABLE students (
    id          SERIAL PRIMARY KEY,
    name        VARCHAR(150) NOT NULL,
    reg_number  VARCHAR(50)  UNIQUE NOT NULL,
    level       VARCHAR(10)  NOT NULL CHECK (level IN ('100L','200L','300L','400L','500L')),
    department  VARCHAR(150) NOT NULL,
    password    TEXT         NOT NULL,
    created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- LECTURERS TABLE
-- ============================================================
CREATE TABLE lecturers (
    id          SERIAL PRIMARY KEY,
    name        VARCHAR(150) NOT NULL,
    email       VARCHAR(150) UNIQUE NOT NULL,
    password    TEXT         NOT NULL,
    created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- COURSES TABLE
-- (Each course belongs to a session, semester, dept, level, and lecturer)
-- ============================================================
CREATE TABLE courses (
    id          SERIAL PRIMARY KEY,
    course_code VARCHAR(20)  NOT NULL,
    course_name VARCHAR(200) NOT NULL,
    session     VARCHAR(20)  NOT NULL,   -- e.g. '2023/2024'
    semester    SMALLINT     NOT NULL CHECK (semester IN (1, 2)),
    department  VARCHAR(150) NOT NULL,
    level       VARCHAR(10)  NOT NULL CHECK (level IN ('100L','200L','300L','400L','500L')),
    lecturer_id INTEGER      NOT NULL REFERENCES lecturers(id) ON DELETE CASCADE,
    max_assignment NUMERIC(5,2) NOT NULL DEFAULT 10.0,
    max_quiz       NUMERIC(5,2) NOT NULL DEFAULT 10.0,
    max_attendance NUMERIC(5,2) NOT NULL DEFAULT 10.0,
    max_test       NUMERIC(5,2) NOT NULL DEFAULT 10.0,
    max_others     NUMERIC(5,2) NOT NULL DEFAULT 0.0,
    created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(course_code, session, semester, department, level, lecturer_id),
    CONSTRAINT check_max_weights_sum CHECK (max_assignment + max_quiz + max_attendance + max_test + max_others = 40.0)
);

-- ============================================================
-- SCORES TABLE
-- (One record per student per course; scores saved as draft until published)
-- ============================================================
CREATE TABLE scores (
    id           SERIAL PRIMARY KEY,
    student_id   INTEGER       REFERENCES students(id) ON DELETE CASCADE, -- Nullable
    course_id    INTEGER       NOT NULL REFERENCES courses(id)  ON DELETE CASCADE,
    reg_number   VARCHAR(50)   NOT NULL,
    assignment   NUMERIC(5,2)  NOT NULL DEFAULT 0 CHECK (assignment   >= 0),
    quiz         NUMERIC(5,2)  NOT NULL DEFAULT 0 CHECK (quiz         >= 0),
    attendance   NUMERIC(5,2)  NOT NULL DEFAULT 0 CHECK (attendance   >= 0),
    test         NUMERIC(5,2)  NOT NULL DEFAULT 0 CHECK (test         >= 0),
    others       NUMERIC(5,2)  NOT NULL DEFAULT 0 CHECK (others       >= 0),
    total        NUMERIC(6,2)  GENERATED ALWAYS AS
                     (assignment + quiz + attendance + test + others) STORED,
    is_published BOOLEAN       NOT NULL DEFAULT FALSE,
    entered_by   INTEGER       REFERENCES lecturers(id),
    created_at   TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at   TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(reg_number, course_id)
);

-- ============================================================
-- COMPLAINTS TABLE
-- ============================================================
CREATE TABLE complaints (
    id             SERIAL PRIMARY KEY,
    student_id     INTEGER      NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    course_id      INTEGER      REFERENCES courses(id) ON DELETE SET NULL,
    complaint_type VARCHAR(50)  NOT NULL,
    description    TEXT         NOT NULL,
    status         VARCHAR(20)  NOT NULL DEFAULT 'Pending'
                       CHECK (status IN ('Pending','Under Review','Resolved')),
    created_at     TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- COMPLAINT RESPONSES TABLE
-- ============================================================
CREATE TABLE complaint_responses (
    id            SERIAL PRIMARY KEY,
    complaint_id  INTEGER  NOT NULL REFERENCES complaints(id) ON DELETE CASCADE,
    lecturer_id   INTEGER  NOT NULL REFERENCES lecturers(id),
    response_text TEXT     NOT NULL,
    created_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- TRIGGER: Auto-update updated_at on scores row change
-- ============================================================
CREATE OR REPLACE FUNCTION fn_update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_scores_updated_at
BEFORE UPDATE ON scores
FOR EACH ROW EXECUTE FUNCTION fn_update_timestamp();

-- ============================================================
-- INDEXES (for performance)
-- ============================================================
CREATE INDEX idx_scores_student   ON scores(student_id);
CREATE INDEX idx_scores_course    ON scores(course_id);
CREATE INDEX idx_courses_lecturer ON courses(lecturer_id);
CREATE INDEX idx_complaints_student ON complaints(student_id);
CREATE INDEX idx_complaint_responses_complaint ON complaint_responses(complaint_id);

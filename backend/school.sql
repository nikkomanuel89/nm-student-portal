-- Drop if exists
DROP TABLE IF EXISTS submissions;
DROP TABLE IF EXISTS assignments;
DROP TABLE IF EXISTS announcements;
DROP TABLE IF EXISTS courses;
DROP TABLE IF EXISTS users;

-- Users (students/instructors)
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  role VARCHAR(20) NOT NULL,  -- 'student' or 'instructor' or 'admin'
  passwordHash VARCHAR(255) NOT NULL,  -- Simple hash for demo (use bcrypt in code)
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Courses
CREATE TABLE courses (
  id SERIAL PRIMARY KEY,
  title VARCHAR(100) NOT NULL,
  description TEXT,
  syllabus TEXT,  -- New: Syllabus content or URL
  instructorId INTEGER REFERENCES users(id) ON DELETE SET NULL,
  students JSONB DEFAULT '[]',  -- Array of student IDs
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Assignments
CREATE TABLE assignments (
  id SERIAL PRIMARY KEY,
  title VARCHAR(100) NOT NULL,
  dueDate DATE,
  courseId INTEGER REFERENCES courses(id) ON DELETE CASCADE,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Submissions
CREATE TABLE submissions (
  id SERIAL PRIMARY KEY,
  assignmentId INTEGER REFERENCES assignments(id) ON DELETE CASCADE,
  studentId INTEGER REFERENCES users(id) ON DELETE CASCADE,
  fileURL VARCHAR(255),  -- Fake URL for demo
  grade INTEGER,
  feedback TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Announcements
CREATE TABLE announcements (
  id SERIAL PRIMARY KEY,
  courseId INTEGER REFERENCES courses(id) ON DELETE CASCADE,
  title VARCHAR(100) NOT NULL,
  message TEXT,
  datePosted DATE DEFAULT CURRENT_DATE
);

-- Sample Data
INSERT INTO users (name, email, role, passwordHash) VALUES
('Admin', 'admin@sportal.com', 'admin', 'hashed_password');

-- Add student to course
UPDATE courses SET students = '[1]' WHERE id = 1;
-- Exam Portal Database Schema
-- MySQL 8.0+ compatible

CREATE DATABASE IF NOT EXISTS exam_portal;
USE exam_portal;

-- Users table
CREATE TABLE users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    role ENUM('student', 'admin') NOT NULL DEFAULT 'student',
    profile_image VARCHAR(255) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    INDEX idx_username (username),
    INDEX idx_email (email),
    INDEX idx_role (role)
);

-- Exams table
CREATE TABLE exams (
    id INT PRIMARY KEY AUTO_INCREMENT,
    title VARCHAR(200) NOT NULL,
    description TEXT NULL,
    duration_minutes INT NOT NULL,
    total_marks INT NOT NULL,
    passing_marks INT NOT NULL,
    start_time DATETIME NOT NULL,
    end_time DATETIME NOT NULL,
    status ENUM('draft', 'scheduled', 'active', 'completed') DEFAULT 'draft',
    created_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_status (status),
    INDEX idx_start_time (start_time),
    INDEX idx_end_time (end_time),
    INDEX idx_created_by (created_by)
);

-- Questions table
CREATE TABLE questions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    exam_id INT NOT NULL,
    question_text TEXT NOT NULL,
    question_type ENUM('multiple_choice', 'true_false', 'short_answer') NOT NULL,
    marks INT NOT NULL DEFAULT 1,
    `order` INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (exam_id) REFERENCES exams(id) ON DELETE CASCADE,
    INDEX idx_exam_id (exam_id),
    INDEX idx_order (exam_id, `order`)
);

-- Question_Options table
CREATE TABLE question_options (
    id INT PRIMARY KEY AUTO_INCREMENT,
    question_id INT NOT NULL,
    option_text TEXT NOT NULL,
    is_correct BOOLEAN DEFAULT FALSE,
    `order` INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE,
    INDEX idx_question_id (question_id),
    INDEX idx_order (question_id, `order`)
);

-- Exam_Attempts table
CREATE TABLE exam_attempts (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    exam_id INT NOT NULL,
    start_time DATETIME NOT NULL,
    end_time DATETIME NULL,
    status ENUM('in_progress', 'completed', 'abandoned') DEFAULT 'in_progress',
    total_score INT NULL,
    percentage DECIMAL(5,2) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (exam_id) REFERENCES exams(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_exam_id (exam_id),
    INDEX idx_status (status),
    UNIQUE KEY unique_user_exam (user_id, exam_id, status)
);

-- Exam_Answers table
CREATE TABLE exam_answers (
    id INT PRIMARY KEY AUTO_INCREMENT,
    attempt_id INT NOT NULL,
    question_id INT NOT NULL,
    selected_option_id INT NULL,
    answer_text TEXT NULL,
    is_correct BOOLEAN NULL,
    marks_obtained INT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (attempt_id) REFERENCES exam_attempts(id) ON DELETE CASCADE,
    FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE,
    FOREIGN KEY (selected_option_id) REFERENCES question_options(id) ON DELETE SET NULL,
    INDEX idx_attempt_id (attempt_id),
    INDEX idx_question_id (question_id)
);

-- Insert default admin user (password: admin123)
INSERT INTO users (username, email, password_hash, full_name, role) VALUES
('admin', 'admin@examportal.com', '$2y$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj6hsxq9g.FW', 'System Administrator', 'admin');

-- Insert sample exam data for testing
INSERT INTO exams (title, description, duration_minutes, total_marks, passing_marks, start_time, end_time, status, created_by) VALUES
('Sample Programming Quiz', 'A basic programming knowledge test', 30, 100, 60, '2024-01-01 10:00:00', '2024-12-31 23:59:59', 'active', 1),
('Mathematics Fundamentals', 'Basic mathematics assessment', 45, 100, 70, '2024-01-01 10:00:00', '2024-12-31 23:59:59', 'active', 1);

-- Insert sample questions for programming quiz
INSERT INTO questions (exam_id, question_text, question_type, marks, `order`) VALUES
(1, 'What does HTML stand for?', 'multiple_choice', 10, 1),
(1, 'JavaScript is a compiled language.', 'true_false', 10, 2),
(1, 'Which CSS property is used to change text color?', 'short_answer', 10, 3);

-- Insert options for multiple choice question
INSERT INTO question_options (question_id, option_text, is_correct, `order`) VALUES
(1, 'Hyper Text Markup Language', TRUE, 1),
(1, 'High Tech Modern Language', FALSE, 2),
(1, 'Home Tool Markup Language', FALSE, 3),
(1, 'Hyperlinks and Text Markup Language', FALSE, 4);

-- Insert options for true/false question
INSERT INTO question_options (question_id, option_text, is_correct, `order`) VALUES
(2, 'True', FALSE, 1),
(2, 'False', TRUE, 2);

-- Insert sample student users for testing (password: student123)
INSERT INTO users (username, email, password_hash, full_name, role) VALUES
('student1', 'student1@example.com', '$2y$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj6hsxq9g.FW', 'John Student', 'student'),
('student2', 'student2@example.com', '$2y$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj6hsxq9g.FW', 'Jane Learner', 'student');
-- =============================================
-- Room Booking System — Database Schema v2.1
-- Updated: Register/Login + new form fields
-- =============================================

CREATE DATABASE IF NOT EXISTS room_booking CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE room_booking;

-- Users table (supports register/login for all users)
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    fullname VARCHAR(150) NOT NULL,
    username VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    role ENUM('admin','user') NOT NULL DEFAULT 'user',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Rooms table
CREATE TABLE IF NOT EXISTS rooms (
    id INT AUTO_INCREMENT PRIMARY KEY,
    room_name VARCHAR(100) NOT NULL,
    capacity INT NOT NULL DEFAULT 0,
    floor VARCHAR(50) DEFAULT NULL,
    equipment TEXT DEFAULT NULL,
    open_time TIME NOT NULL DEFAULT '08:00:00',
    close_time TIME NOT NULL DEFAULT '20:00:00',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    status ENUM('available','booked','maintenance') NOT NULL DEFAULT 'available',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Bookings table (updated: purpose_type replaces meeting_title+purpose)
CREATE TABLE IF NOT EXISTS bookings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    room_id INT NOT NULL,
    user_id INT NOT NULL,
    username VARCHAR(100) NOT NULL,
    purpose_type TEXT NOT NULL,
    purpose_detail TEXT DEFAULT NULL,
    requested_equipment TEXT DEFAULT NULL,
    booking_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    status ENUM('pending','confirmed','cancelled') NOT NULL DEFAULT 'confirmed',
    cancelled_by VARCHAR(100) DEFAULT NULL,
    cancel_reason TEXT DEFAULT NULL,
    recurrence_id INT DEFAULT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_booking_date (booking_date),
    INDEX idx_room_date (room_id, booking_date),
    INDEX idx_status (status),
    INDEX idx_user (user_id)
) ENGINE=InnoDB;

-- Logs table
CREATE TABLE IF NOT EXISTS logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    action VARCHAR(100) NOT NULL,
    username VARCHAR(100) DEFAULT NULL,
    detail TEXT DEFAULT NULL,
    ip_address VARCHAR(50) DEFAULT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_action (action),
    INDEX idx_created (created_at)
) ENGINE=InnoDB;

-- =============================================
-- Seed: Default admin (password: admin123)
-- Hash generated with: php -r "echo password_hash('admin123', PASSWORD_BCRYPT);"
-- Run setup.php after importing to regenerate the hash if needed.
-- =============================================
INSERT INTO users (fullname, username, password, role) VALUES
('ผู้ดูแลระบบ', 'admin', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin');

-- =============================================
-- Seed: 12 rooms from spec
-- =============================================
INSERT INTO rooms (room_name, capacity, floor, equipment) VALUES
('ห้องเรียน 1', 13, NULL, NULL),
('ห้องเรียน 2', 13, NULL, NULL),
('ห้องเรียน 3', 13, NULL, NULL),
('ห้องเรียน 4', 20, NULL, NULL),
('ห้องเรียน 5', 12, NULL, NULL),
('ห้องเรียน 6', 12, NULL, NULL),
('ห้องประชุมใหญ่', 90, NULL, NULL),
('ห้องเรียนมูลนิธิ', 15, NULL, NULL),
('ห้องเรียน Sim 1', 12, NULL, NULL),
('ห้องเรียน Sim 2', 12, NULL, NULL),
('ห้องเรียน Sim 3', 12, NULL, NULL),
('ห้องประชุมสำนักงาน', 30, NULL, NULL);

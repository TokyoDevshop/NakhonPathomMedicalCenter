<?php
// =============================================
// Room Booking System — Configuration
// =============================================

// Database
define('DB_HOST', 'localhost');
define('DB_NAME', 'room_booking');
define('DB_USER', 'root');
define('DB_PASS', '');
define('DB_CHARSET', 'utf8mb4');

// App
define('APP_NAME', 'ระบบจองห้องประชุม');
define('APP_VERSION', '2.0');

// Session
define('SESSION_TIMEOUT', 1800); // 30 minutes in seconds

// Business hours
define('DEFAULT_OPEN_TIME', '08:00');
define('DEFAULT_CLOSE_TIME', '20:00');
define('MAX_BOOKING_HOURS', 8);

// Timezone
date_default_timezone_set('Asia/Bangkok');

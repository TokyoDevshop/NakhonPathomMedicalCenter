<?php
// Sanitize output to prevent XSS
function sanitize($str) {
    return htmlspecialchars($str, ENT_QUOTES, 'UTF-8');
}

// JSON response helper
function jsonResponse($data, $code = 200) {
    http_response_code($code);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

// Get client IP
function getClientIP() {
    if (!empty($_SERVER['HTTP_X_FORWARDED_FOR'])) {
        return $_SERVER['HTTP_X_FORWARDED_FOR'];
    }
    return $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
}

// Add log entry
function addLog($action, $username, $detail, $pdo = null) {
    if (!$pdo) $pdo = getDB();
    $stmt = $pdo->prepare('INSERT INTO logs (action, username, detail, ip_address) VALUES (?, ?, ?, ?)');
    $stmt->execute([$action, $username, json_encode($detail, JSON_UNESCAPED_UNICODE), getClientIP()]);
}

// Validate time is within business hours for a room
function isWithinBusinessHours($startTime, $endTime, $roomOpenTime = '08:00:00', $roomCloseTime = '20:00:00') {
    return $startTime >= $roomOpenTime && $endTime <= $roomCloseTime;
}

// Check booking duration (max 8 hours)
function isValidDuration($startTime, $endTime) {
    $start = strtotime($startTime);
    $end = strtotime($endTime);
    if ($end <= $start) return false;
    $hours = ($end - $start) / 3600;
    return $hours <= MAX_BOOKING_HOURS;
}

// Check for overlapping bookings
function hasConflict($pdo, $roomId, $date, $startTime, $endTime, $excludeBookingId = null) {
    $sql = "SELECT b.*, r.room_name FROM bookings b 
            JOIN rooms r ON b.room_id = r.id
            WHERE b.room_id = ? AND b.booking_date = ? AND b.status != 'cancelled'
            AND b.start_time < ? AND b.end_time > ?";
    $params = [$roomId, $date, $endTime, $startTime];
    
    if ($excludeBookingId) {
        $sql .= " AND b.id != ?";
        $params[] = $excludeBookingId;
    }
    
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    return $stmt->fetchAll();
}

// Find available rooms for a given time slot
function findAvailableRooms($pdo, $date, $startTime, $endTime, $excludeRoomId = null) {
    $sql = "SELECT r.* FROM rooms r WHERE r.is_active = 1 AND r.id NOT IN (
                SELECT b.room_id FROM bookings b 
                WHERE b.booking_date = ? AND b.status != 'cancelled'
                AND b.start_time < ? AND b.end_time > ?
            )";
    $params = [$date, $endTime, $startTime];
    
    if ($excludeRoomId) {
        $sql .= " AND r.id != ?";
        $params[] = $excludeRoomId;
    }
    
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    return $stmt->fetchAll();
}

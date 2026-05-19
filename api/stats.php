<?php
require_once __DIR__ . '/../includes/db.php';
require_once __DIR__ . '/../includes/helpers.php';
require_once __DIR__ . '/../includes/auth_middleware.php';

initSession();
header('Content-Type: application/json; charset=utf-8');

$action = $_GET['action'] ?? '';
$pdo = getDB();

switch ($action) {
    case 'dashboard':
        $today = date('Y-m-d');
        $weekStart = date('Y-m-d', strtotime('monday this week'));
        $weekEnd = date('Y-m-d', strtotime('sunday this week'));
        
        // Total rooms
        $totalRooms = $pdo->query("SELECT COUNT(*) FROM rooms WHERE is_active = 1")->fetchColumn();
        
        // Today's bookings
        $todayBookings = $pdo->prepare("SELECT COUNT(*) FROM bookings WHERE booking_date = ? AND status != 'cancelled'");
        $todayBookings->execute([$today]);
        $todayCount = $todayBookings->fetchColumn();
        
        // Available rooms right now
        $now = date('H:i:s');
        $busyRooms = $pdo->prepare(
            "SELECT COUNT(DISTINCT room_id) FROM bookings WHERE booking_date = ? AND status != 'cancelled' AND start_time <= ? AND end_time > ?"
        );
        $busyRooms->execute([$today, $now, $now]);
        $busyCount = $busyRooms->fetchColumn();
        $availableNow = $totalRooms - $busyCount;
        
        // Top 3 rooms (this month)
        $monthStart = date('Y-m-01');
        $monthEnd = date('Y-m-t');
        $topRooms = $pdo->prepare(
            "SELECT r.room_name, COUNT(*) as count FROM bookings b 
             JOIN rooms r ON b.room_id = r.id 
             WHERE b.booking_date BETWEEN ? AND ? AND b.status != 'cancelled'
             GROUP BY b.room_id ORDER BY count DESC LIMIT 3"
        );
        $topRooms->execute([$monthStart, $monthEnd]);
        $top3 = $topRooms->fetchAll();
        
        // Weekly bookings
        $weeklyBookings = $pdo->prepare(
            "SELECT COUNT(*) FROM bookings WHERE booking_date BETWEEN ? AND ? AND status != 'cancelled'"
        );
        $weeklyBookings->execute([$weekStart, $weekEnd]);
        $weeklyCount = $weeklyBookings->fetchColumn();
        
        jsonResponse([
            'total_rooms' => (int)$totalRooms,
            'today_bookings' => (int)$todayCount,
            'available_now' => (int)$availableNow,
            'top_rooms' => $top3,
            'weekly_bookings' => (int)$weeklyCount
        ]);
        break;
    
    case 'charts':
        requireAdmin();
        $period = $_GET['period'] ?? 'month';
        
        // Total bookings
        $total = $pdo->query("SELECT COUNT(*) FROM bookings WHERE status != 'cancelled'")->fetchColumn();
        
        // Usage per room (bar chart)
        $perRoom = $pdo->query(
            "SELECT r.room_name, COUNT(b.id) as count FROM rooms r 
             LEFT JOIN bookings b ON r.id = b.room_id AND b.status != 'cancelled'
             WHERE r.is_active = 1 GROUP BY r.id ORDER BY count DESC"
        )->fetchAll();
        
        // Room proportion (pie chart)
        $proportion = $pdo->query(
            "SELECT r.room_name, COUNT(b.id) as count FROM bookings b 
             JOIN rooms r ON b.room_id = r.id WHERE b.status != 'cancelled'
             GROUP BY b.room_id ORDER BY count DESC"
        )->fetchAll();
        
        // Daily trend (line chart) - last 30 days
        $trendData = $pdo->query(
            "SELECT booking_date, COUNT(*) as count FROM bookings 
             WHERE booking_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY) AND status != 'cancelled'
             GROUP BY booking_date ORDER BY booking_date"
        )->fetchAll();
        
        // Most popular time slots
        $timeSlots = $pdo->query(
            "SELECT HOUR(start_time) as hour, COUNT(*) as count FROM bookings 
             WHERE status != 'cancelled' GROUP BY HOUR(start_time) ORDER BY count DESC LIMIT 5"
        )->fetchAll();
        
        // Monthly trend (last 12 months)
        $monthlyTrend = $pdo->query(
            "SELECT DATE_FORMAT(booking_date, '%Y-%m') as month, COUNT(*) as count 
             FROM bookings WHERE status != 'cancelled' 
             AND booking_date >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH)
             GROUP BY DATE_FORMAT(booking_date, '%Y-%m') ORDER BY month"
        )->fetchAll();
        
        jsonResponse([
            'total_bookings' => (int)$total,
            'per_room' => $perRoom,
            'proportion' => $proportion,
            'daily_trend' => $trendData,
            'monthly_trend' => $monthlyTrend,
            'popular_times' => $timeSlots
        ]);
        break;
    
    default:
        jsonResponse(['error' => 'Invalid action'], 400);
}

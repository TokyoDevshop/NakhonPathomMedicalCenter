<?php
require_once __DIR__ . '/../includes/db.php';
require_once __DIR__ . '/../includes/helpers.php';
require_once __DIR__ . '/../includes/auth_middleware.php';

initSession();
header('Content-Type: application/json; charset=utf-8');

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';
$pdo = getDB();

switch ($action) {
    case 'list':
        // Get all active rooms with current real-time status
        $stmt = $pdo->query("SELECT * FROM rooms ORDER BY id");
        $rooms = $stmt->fetchAll();
        $now = date('H:i:s');
        $today = date('Y-m-d');
        
        foreach ($rooms as &$room) {
            if (!$room['is_active']) {
                $room['current_status'] = 'inactive';
                continue;
            }
            // Check current bookings
            $bStmt = $pdo->prepare(
                "SELECT * FROM bookings WHERE room_id = ? AND booking_date = ? AND status != 'cancelled' ORDER BY start_time"
            );
            $bStmt->execute([$room['id'], $today]);
            $todayBookings = $bStmt->fetchAll();
            $room['today_bookings'] = $todayBookings;
            
            $room['current_status'] = 'available';
            foreach ($todayBookings as $b) {
                if ($now >= $b['start_time'] && $now < $b['end_time']) {
                    $room['current_status'] = 'booked';
                    $room['current_booking'] = $b;
                    break;
                }
                // Within 15 minutes of start
                $startTs = strtotime($today . ' ' . $b['start_time']);
                $nowTs = strtotime($today . ' ' . $now);
                $diff = $startTs - $nowTs;
                if ($diff > 0 && $diff <= 900) {
                    $room['current_status'] = 'upcoming';
                    $room['upcoming_booking'] = $b;
                }
            }
        }
        unset($room);
        jsonResponse(['rooms' => $rooms]);
        break;
    
    case 'detail':
        $id = intval($_GET['id'] ?? 0);
        if (!$id) jsonResponse(['error' => 'Missing room id'], 400);
        
        $stmt = $pdo->prepare("SELECT * FROM rooms WHERE id = ?");
        $stmt->execute([$id]);
        $room = $stmt->fetch();
        if (!$room) jsonResponse(['error' => 'Room not found'], 404);
        
        // Get bookings for this room (upcoming)
        $bStmt = $pdo->prepare(
            "SELECT * FROM bookings WHERE room_id = ? AND booking_date >= ? AND status != 'cancelled' ORDER BY booking_date, start_time"
        );
        $bStmt->execute([$id, date('Y-m-d')]);
        $room['bookings'] = $bStmt->fetchAll();
        
        jsonResponse(['room' => $room]);
        break;
    
    case 'create':
        requireAdmin();
        if ($method !== 'POST') jsonResponse(['error' => 'Method not allowed'], 405);
        $input = json_decode(file_get_contents('php://input'), true);
        
        $stmt = $pdo->prepare("INSERT INTO rooms (room_name, capacity, floor, equipment, open_time, close_time) VALUES (?, ?, ?, ?, ?, ?)");
        $stmt->execute([
            $input['room_name'], $input['capacity'] ?? 0,
            $input['floor'] ?? null, $input['equipment'] ?? null,
            $input['open_time'] ?? '08:00', $input['close_time'] ?? '20:00'
        ]);
        addLog('room_create', $_SESSION['username'], $input, $pdo);
        jsonResponse(['success' => true, 'id' => $pdo->lastInsertId()]);
        break;
    
    case 'update':
        requireAdmin();
        if ($method !== 'POST') jsonResponse(['error' => 'Method not allowed'], 405);
        $input = json_decode(file_get_contents('php://input'), true);
        $id = intval($input['id'] ?? 0);
        if (!$id) jsonResponse(['error' => 'Missing room id'], 400);
        
        $stmt = $pdo->prepare("UPDATE rooms SET room_name=?, capacity=?, floor=?, equipment=?, open_time=?, close_time=? WHERE id=?");
        $stmt->execute([
            $input['room_name'], $input['capacity'],
            $input['floor'] ?? null, $input['equipment'] ?? null,
            $input['open_time'] ?? '08:00', $input['close_time'] ?? '20:00',
            $id
        ]);
        addLog('room_update', $_SESSION['username'], $input, $pdo);
        jsonResponse(['success' => true]);
        break;
    
    case 'toggle':
        requireAdmin();
        if ($method !== 'POST') jsonResponse(['error' => 'Method not allowed'], 405);
        $input = json_decode(file_get_contents('php://input'), true);
        $id = intval($input['id'] ?? 0);
        if (!$id) jsonResponse(['error' => 'Missing room id'], 400);
        
        $stmt = $pdo->prepare("UPDATE rooms SET is_active = NOT is_active WHERE id = ?");
        $stmt->execute([$id]);
        addLog('room_toggle', $_SESSION['username'], ['room_id' => $id], $pdo);
        jsonResponse(['success' => true]);
        break;
    
    default:
        jsonResponse(['error' => 'Invalid action'], 400);
}

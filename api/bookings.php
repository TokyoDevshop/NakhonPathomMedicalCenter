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
        $where = ["1=1"];
        $params = [];
        
        if (!empty($_GET['room_id'])) {
            $where[] = "b.room_id = ?";
            $params[] = intval($_GET['room_id']);
        }
        if (!empty($_GET['date'])) {
            $where[] = "b.booking_date = ?";
            $params[] = $_GET['date'];
        }
        if (!empty($_GET['date_from']) && !empty($_GET['date_to'])) {
            $where[] = "b.booking_date BETWEEN ? AND ?";
            $params[] = $_GET['date_from'];
            $params[] = $_GET['date_to'];
        }
        if (!empty($_GET['username'])) {
            $where[] = "b.username LIKE ?";
            $params[] = '%' . $_GET['username'] . '%';
        }
        if (!empty($_GET['status'])) {
            $where[] = "b.status = ?";
            $params[] = $_GET['status'];
        }
        if (!empty($_GET['search'])) {
            $where[] = "(b.username LIKE ? OR b.purpose_type LIKE ? OR b.purpose_detail LIKE ?)";
            $s = '%' . $_GET['search'] . '%';
            $params[] = $s; $params[] = $s; $params[] = $s;
        }
        if (!empty($_GET['tab'])) {
            $today = date('Y-m-d');
            switch ($_GET['tab']) {
                case 'current':
                    $where[] = "b.booking_date >= ? AND b.status != 'cancelled'";
                    $params[] = $today;
                    break;
                case 'past':
                    $where[] = "b.booking_date < ? AND b.status != 'cancelled'";
                    $params[] = $today;
                    break;
                case 'cancelled':
                    $where[] = "b.status = 'cancelled'";
                    break;
            }
        }
        // Non-admin users only see their own bookings
        if (!isAdmin() && isLoggedIn()) {
            $where[] = "b.user_id = ?";
            $params[] = $_SESSION['user_id'];
        }
        
        $whereStr = implode(' AND ', $where);
        $sql = "SELECT b.*, r.room_name, r.capacity FROM bookings b 
                JOIN rooms r ON b.room_id = r.id 
                WHERE $whereStr 
                ORDER BY b.booking_date DESC, b.start_time ASC";
        
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $bookings = $stmt->fetchAll();
        jsonResponse(['bookings' => $bookings]);
        break;
    
    case 'create':
        if (!isLoggedIn()) jsonResponse(['error' => 'กรุณาเข้าสู่ระบบก่อนจองห้อง'], 401);
        if ($method !== 'POST') jsonResponse(['error' => 'Method not allowed'], 405);
        $input = json_decode(file_get_contents('php://input'), true);
        
        $roomId = intval($input['room_id'] ?? 0);
        $purposeType = $input['purpose_type'] ?? '';
        $purposeDetail = $input['purpose_detail'] ?? '';
        $requestedEquipment = $input['requested_equipment'] ?? '';
        $date = $input['booking_date'] ?? '';
        $startTime = $input['start_time'] ?? '';
        $endTime = $input['end_time'] ?? '';
        
        $username = $_SESSION['fullname'] ?? $_SESSION['username'];
        $userId = $_SESSION['user_id'];
        
        // Validation
        if (!$roomId || !$purposeType || !$date || !$startTime || !$endTime) {
            jsonResponse(['error' => 'กรุณากรอกข้อมูลให้ครบทุกช่อง'], 400);
        }
        
        // Check room exists and active
        $roomStmt = $pdo->prepare("SELECT * FROM rooms WHERE id = ? AND is_active = 1");
        $roomStmt->execute([$roomId]);
        $room = $roomStmt->fetch();
        if (!$room) jsonResponse(['error' => 'ไม่พบห้องประชุมที่เลือก'], 404);
        
        if ($date < date('Y-m-d')) {
            jsonResponse(['error' => 'ไม่สามารถจองวันที่ผ่านมาแล้วได้'], 400);
        }
        
        $st = $startTime . ':00';
        $et = $endTime . ':00';
        
        if (!isWithinBusinessHours($st, $et, $room['open_time'], $room['close_time'])) {
            jsonResponse(['error' => 'เวลาที่เลือกอยู่นอกช่วงเวลาทำการ (' . substr($room['open_time'],0,5) . ' – ' . substr($room['close_time'],0,5) . ' น.)'], 400);
        }
        if (!isValidDuration($st, $et)) {
            jsonResponse(['error' => 'ระยะเวลาจองต้องไม่เกิน 8 ชั่วโมง และเวลาสิ้นสุดต้องมากกว่าเวลาเริ่มต้น'], 400);
        }
        
        $conflicts = hasConflict($pdo, $roomId, $date, $st, $et);
        if (!empty($conflicts)) {
            $available = findAvailableRooms($pdo, $date, $st, $et, $roomId);
            jsonResponse([
                'error' => 'ห้องนี้ถูกจองแล้วในช่วงเวลาที่เลือก',
                'conflicts' => $conflicts,
                'available_rooms' => $available
            ], 409);
        }
        
        $stmt = $pdo->prepare(
            "INSERT INTO bookings (room_id, user_id, username, purpose_type, purpose_detail, requested_equipment, booking_date, start_time, end_time, status) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'confirmed')"
        );
        $stmt->execute([$roomId, $userId, $username, $purposeType, $purposeDetail, $requestedEquipment, $date, $st, $et]);
        $bookingId = $pdo->lastInsertId();
        
        addLog('booking_create', $username, [
            'booking_id' => $bookingId, 'room' => $room['room_name'],
            'date' => $date, 'time' => $startTime . '-' . $endTime,
            'purpose' => $purposeType
        ], $pdo);
        
        jsonResponse([
            'success' => true, 'booking_id' => $bookingId,
            'message' => 'จองห้องประชุมสำเร็จ',
            'room_name' => $room['room_name'],
            'date' => $date, 'start_time' => $startTime, 'end_time' => $endTime,
            'username' => $username
        ]);
        break;
    
    case 'cancel':
        requireAdmin();
        if ($method !== 'POST') jsonResponse(['error' => 'Method not allowed'], 405);
        $input = json_decode(file_get_contents('php://input'), true);
        
        $id = intval($input['id'] ?? 0);
        $reason = trim($input['cancel_reason'] ?? '');
        
        if (!$id) jsonResponse(['error' => 'Missing booking id'], 400);
        if (!$reason) jsonResponse(['error' => 'กรุณากรอกเหตุผลการยกเลิก'], 400);
        
        $stmt = $pdo->prepare("SELECT b.*, r.room_name FROM bookings b JOIN rooms r ON b.room_id = r.id WHERE b.id = ?");
        $stmt->execute([$id]);
        $booking = $stmt->fetch();
        if (!$booking) jsonResponse(['error' => 'ไม่พบรายการจอง'], 404);
        
        $pdo->prepare("UPDATE bookings SET status='cancelled', cancelled_by=?, cancel_reason=? WHERE id=?")
            ->execute([$_SESSION['username'], $reason, $id]);
        
        addLog('booking_cancel', $_SESSION['username'], [
            'booking_id' => $id, 'room' => $booking['room_name'],
            'original_user' => $booking['username'], 'reason' => $reason
        ], $pdo);
        
        jsonResponse(['success' => true, 'message' => 'ยกเลิกการจองสำเร็จ']);
        break;
    
    case 'update':
        requireAdmin();
        if ($method !== 'POST') jsonResponse(['error' => 'Method not allowed'], 405);
        $input = json_decode(file_get_contents('php://input'), true);
        
        $id = intval($input['id'] ?? 0);
        if (!$id) jsonResponse(['error' => 'Missing booking id'], 400);
        
        $oldStmt = $pdo->prepare("SELECT * FROM bookings WHERE id = ?");
        $oldStmt->execute([$id]);
        $old = $oldStmt->fetch();
        if (!$old) jsonResponse(['error' => 'ไม่พบรายการจอง'], 404);
        
        $roomId = intval($input['room_id'] ?? $old['room_id']);
        $date = $input['booking_date'] ?? $old['booking_date'];
        $st = ($input['start_time'] ?? substr($old['start_time'],0,5)) . ':00';
        $et = ($input['end_time'] ?? substr($old['end_time'],0,5)) . ':00';
        
        $roomStmt = $pdo->prepare("SELECT * FROM rooms WHERE id = ?");
        $roomStmt->execute([$roomId]);
        $room = $roomStmt->fetch();
        
        if (!isWithinBusinessHours($st, $et, $room['open_time'], $room['close_time'])) {
            jsonResponse(['error' => 'เวลาที่เลือกอยู่นอกช่วงเวลาทำการ'], 400);
        }
        if (!isValidDuration($st, $et)) {
            jsonResponse(['error' => 'ระยะเวลาจองไม่ถูกต้อง'], 400);
        }
        
        $conflicts = hasConflict($pdo, $roomId, $date, $st, $et, $id);
        if (!empty($conflicts)) {
            jsonResponse(['error' => 'เวลาซ้อนกับการจองอื่น', 'conflicts' => $conflicts], 409);
        }
        
        $stmt = $pdo->prepare(
            "UPDATE bookings SET room_id=?, purpose_type=?, purpose_detail=?, requested_equipment=?, booking_date=?, start_time=?, end_time=? WHERE id=?"
        );
        $stmt->execute([
            $roomId,
            $input['purpose_type'] ?? $old['purpose_type'],
            $input['purpose_detail'] ?? $old['purpose_detail'],
            $input['requested_equipment'] ?? $old['requested_equipment'],
            $date, $st, $et, $id
        ]);
        
        addLog('booking_update', $_SESSION['username'], [
            'booking_id' => $id, 'changes' => $input
        ], $pdo);
        
        jsonResponse(['success' => true, 'message' => 'แก้ไขข้อมูลสำเร็จ']);
        break;
    
    case 'conflicts':
        $roomId = intval($_GET['room_id'] ?? 0);
        $date = $_GET['date'] ?? '';
        $startTime = ($_GET['start_time'] ?? '') . ':00';
        $endTime = ($_GET['end_time'] ?? '') . ':00';
        
        if (!$roomId || !$date || !$startTime || !$endTime) {
            jsonResponse(['error' => 'Missing parameters'], 400);
        }
        
        $conflicts = hasConflict($pdo, $roomId, $date, $startTime, $endTime);
        $available = [];
        if (!empty($conflicts)) {
            $available = findAvailableRooms($pdo, $date, $startTime, $endTime, $roomId);
        }
        jsonResponse(['has_conflict' => !empty($conflicts), 'conflicts' => $conflicts, 'available_rooms' => $available]);
        break;
    
    case 'calendar':
        $month = intval($_GET['month'] ?? date('m'));
        $year = intval($_GET['year'] ?? date('Y'));
        $roomId = intval($_GET['room_id'] ?? 0);
        
        $startDate = sprintf('%04d-%02d-01', $year, $month);
        $endDate = date('Y-m-t', strtotime($startDate));
        
        $sql = "SELECT booking_date, COUNT(*) as count FROM bookings 
                WHERE booking_date BETWEEN ? AND ? AND status != 'cancelled'";
        $params = [$startDate, $endDate];
        
        if ($roomId) {
            $sql .= " AND room_id = ?";
            $params[] = $roomId;
        }
        $sql .= " GROUP BY booking_date";
        
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $dates = $stmt->fetchAll();
        
        $dateMap = [];
        foreach ($dates as $d) {
            $dateMap[$d['booking_date']] = $d['count'];
        }
        
        jsonResponse(['dates' => $dateMap, 'month' => $month, 'year' => $year]);
        break;
    
    case 'day':
        $date = $_GET['date'] ?? date('Y-m-d');
        $roomId = intval($_GET['room_id'] ?? 0);
        
        $sql = "SELECT b.*, r.room_name, r.capacity FROM bookings b 
                JOIN rooms r ON b.room_id = r.id 
                WHERE b.booking_date = ? AND b.status != 'cancelled'";
        $params = [$date];
        
        if ($roomId) {
            $sql .= " AND b.room_id = ?";
            $params[] = $roomId;
        }
        $sql .= " ORDER BY b.start_time";
        
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $bookings = $stmt->fetchAll();
        
        $roomsStmt = $pdo->query("SELECT * FROM rooms WHERE is_active = 1 ORDER BY id");
        $rooms = $roomsStmt->fetchAll();
        
        jsonResponse(['bookings' => $bookings, 'rooms' => $rooms, 'date' => $date]);
        break;
    
    default:
        jsonResponse(['error' => 'Invalid action'], 400);
}

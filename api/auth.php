<?php
require_once __DIR__ . '/../includes/db.php';
require_once __DIR__ . '/../includes/helpers.php';
require_once __DIR__ . '/../includes/auth_middleware.php';

initSession();
header('Content-Type: application/json; charset=utf-8');

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';

switch ($action) {
    case 'register':
        if ($method !== 'POST') jsonResponse(['error' => 'Method not allowed'], 405);
        $input = json_decode(file_get_contents('php://input'), true);
        
        $fullname = trim($input['fullname'] ?? '');
        $username = trim($input['username'] ?? '');
        $password = $input['password'] ?? '';
        $confirmPassword = $input['confirm_password'] ?? '';
        
        if (!$fullname || !$username || !$password) {
            jsonResponse(['error' => 'กรุณากรอกข้อมูลให้ครบทุกช่อง'], 400);
        }
        if (mb_strlen($username) < 3) {
            jsonResponse(['error' => 'ชื่อผู้ใช้ต้องมีอย่างน้อย 3 ตัวอักษร'], 400);
        }
        if (strlen($password) < 6) {
            jsonResponse(['error' => 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร'], 400);
        }
        if ($password !== $confirmPassword) {
            jsonResponse(['error' => 'รหัสผ่านไม่ตรงกัน'], 400);
        }
        
        $pdo = getDB();
        
        // Check duplicate username
        $check = $pdo->prepare('SELECT id FROM users WHERE username = ?');
        $check->execute([$username]);
        if ($check->fetch()) {
            jsonResponse(['error' => 'ชื่อผู้ใช้นี้ถูกใช้งานแล้ว'], 409);
        }
        
        $hash = password_hash($password, PASSWORD_BCRYPT);
        $stmt = $pdo->prepare('INSERT INTO users (fullname, username, password, role) VALUES (?, ?, ?, ?)');
        $stmt->execute([$fullname, $username, $hash, 'user']);
        $userId = $pdo->lastInsertId();
        
        // Auto-login after register
        $_SESSION['user_id'] = $userId;
        $_SESSION['username'] = $username;
        $_SESSION['fullname'] = $fullname;
        $_SESSION['role'] = 'user';
        $_SESSION['last_activity'] = time();
        
        addLog('register', $username, ['fullname' => $fullname], $pdo);
        jsonResponse([
            'success' => true,
            'user' => ['id' => $userId, 'username' => $username, 'fullname' => $fullname, 'role' => 'user']
        ]);
        break;
    
    case 'login':
        if ($method !== 'POST') jsonResponse(['error' => 'Method not allowed'], 405);
        $input = json_decode(file_get_contents('php://input'), true);
        $username = trim($input['username'] ?? '');
        $password = $input['password'] ?? '';
        
        if (!$username || !$password) {
            jsonResponse(['error' => 'กรุณากรอกชื่อผู้ใช้และรหัสผ่าน'], 400);
        }
        
        $pdo = getDB();
        $stmt = $pdo->prepare('SELECT * FROM users WHERE username = ?');
        $stmt->execute([$username]);
        $user = $stmt->fetch();
        
        if (!$user || !password_verify($password, $user['password'])) {
            addLog('login_failed', $username, ['reason' => 'Invalid credentials'], $pdo);
            jsonResponse(['error' => 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง'], 401);
        }
        
        $_SESSION['user_id'] = $user['id'];
        $_SESSION['username'] = $user['username'];
        $_SESSION['fullname'] = $user['fullname'];
        $_SESSION['role'] = $user['role'];
        $_SESSION['last_activity'] = time();
        
        addLog('login', $username, ['role' => $user['role']], $pdo);
        jsonResponse([
            'success' => true,
            'user' => [
                'id' => $user['id'], 'username' => $user['username'],
                'fullname' => $user['fullname'], 'role' => $user['role']
            ]
        ]);
        break;
    
    case 'logout':
        $username = $_SESSION['username'] ?? 'unknown';
        addLog('logout', $username, []);
        session_unset();
        session_destroy();
        jsonResponse(['success' => true]);
        break;
    
    case 'check':
        if (isLoggedIn()) {
            jsonResponse([
                'loggedIn' => true,
                'user' => [
                    'id' => $_SESSION['user_id'],
                    'username' => $_SESSION['username'],
                    'fullname' => $_SESSION['fullname'] ?? '',
                    'role' => $_SESSION['role']
                ]
            ]);
        } else {
            jsonResponse(['loggedIn' => false]);
        }
        break;
    
    default:
        jsonResponse(['error' => 'Invalid action'], 400);
}

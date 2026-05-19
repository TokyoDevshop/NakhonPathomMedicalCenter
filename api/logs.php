<?php
require_once __DIR__ . '/../includes/db.php';
require_once __DIR__ . '/../includes/helpers.php';
require_once __DIR__ . '/../includes/auth_middleware.php';

initSession();
requireAdmin();
header('Content-Type: application/json; charset=utf-8');

$pdo = getDB();

$where = ["1=1"];
$params = [];

if (!empty($_GET['action_type'])) {
    $where[] = "action = ?";
    $params[] = $_GET['action_type'];
}
if (!empty($_GET['date_from'])) {
    $where[] = "created_at >= ?";
    $params[] = $_GET['date_from'] . ' 00:00:00';
}
if (!empty($_GET['date_to'])) {
    $where[] = "created_at <= ?";
    $params[] = $_GET['date_to'] . ' 23:59:59';
}

$whereStr = implode(' AND ', $where);
$sql = "SELECT * FROM logs WHERE $whereStr ORDER BY created_at DESC LIMIT 200";

$stmt = $pdo->prepare($sql);
$stmt->execute($params);
$logs = $stmt->fetchAll();

jsonResponse(['logs' => $logs]);

<?php
require_once __DIR__ . '/../includes/db.php';
require_once __DIR__ . '/../includes/helpers.php';
require_once __DIR__ . '/../includes/auth_middleware.php';

initSession();
requireAdmin();

$pdo = getDB();
$format = $_GET['format'] ?? 'csv';

$where = ["1=1"];
$params = [];

if (!empty($_GET['room_id'])) { $where[] = "b.room_id = ?"; $params[] = intval($_GET['room_id']); }
if (!empty($_GET['date_from'])) { $where[] = "b.booking_date >= ?"; $params[] = $_GET['date_from']; }
if (!empty($_GET['date_to'])) { $where[] = "b.booking_date <= ?"; $params[] = $_GET['date_to']; }
if (!empty($_GET['status'])) { $where[] = "b.status = ?"; $params[] = $_GET['status']; }

$whereStr = implode(' AND ', $where);
$sql = "SELECT b.id, r.room_name, b.username, b.purpose_type, b.purpose_detail, b.requested_equipment,
        b.booking_date, b.start_time, b.end_time, b.status, 
        b.cancelled_by, b.cancel_reason, b.created_at
        FROM bookings b JOIN rooms r ON b.room_id = r.id 
        WHERE $whereStr ORDER BY b.booking_date DESC, b.start_time";

$stmt = $pdo->prepare($sql);
$stmt->execute($params);
$data = $stmt->fetchAll();

if ($format === 'csv') {
    header('Content-Type: text/csv; charset=utf-8');
    header('Content-Disposition: attachment; filename="bookings_report_' . date('Y-m-d') . '.csv"');
    echo "\xEF\xBB\xBF";
    $output = fopen('php://output', 'w');
    fputcsv($output, ['ลำดับ', 'ห้องประชุม', 'ผู้จอง', 'วัตถุประสงค์', 'รายละเอียด', 'อุปกรณ์ที่ขอ', 'วันที่', 'เวลาเริ่ม', 'เวลาสิ้นสุด', 'สถานะ', 'ยกเลิกโดย', 'เหตุผล', 'วันที่บันทึก']);
    foreach ($data as $row) {
        $statusMap = ['confirmed' => 'ยืนยันแล้ว', 'pending' => 'รอดำเนินการ', 'cancelled' => 'ยกเลิกแล้ว'];
        $row['status'] = $statusMap[$row['status']] ?? $row['status'];
        fputcsv($output, array_values($row));
    }
    fclose($output);
    exit;
}

if ($format === 'pdf') {
    header('Content-Type: text/html; charset=utf-8');
    $statusMap = ['confirmed' => 'ยืนยันแล้ว', 'pending' => 'รอดำเนินการ', 'cancelled' => 'ยกเลิกแล้ว'];
    ?>
    <!DOCTYPE html>
    <html lang="th">
    <head>
        <meta charset="UTF-8">
        <title>รายงานการจองห้องประชุม</title>
        <style>
            @media print { body { margin: 0; } }
            body { font-family: 'Sarabun', 'Segoe UI', sans-serif; padding: 20px; color: #1B4332; }
            h1 { text-align: center; color: #00B4D8; }
            .info { text-align: center; margin-bottom: 20px; color: #666; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 12px; }
            th { background: #00B4D8; color: white; padding: 8px 6px; text-align: left; }
            td { padding: 6px; border-bottom: 1px solid #e0e0e0; }
            tr:nth-child(even) { background: #f8fffe; }
            .status-confirmed { color: #52B788; font-weight: bold; }
            .status-cancelled { color: #e63946; font-weight: bold; }
            .print-btn { text-align: center; margin: 20px 0; }
            .print-btn button { background: #00B4D8; color: white; border: none; padding: 12px 30px; border-radius: 8px; font-size: 16px; cursor: pointer; }
            @media print { .print-btn { display: none; } }
        </style>
    </head>
    <body>
        <h1>📋 รายงานการจองห้องประชุม</h1>
        <div class="info">วันที่พิมพ์: <?= date('d/m/Y H:i') ?> น. | จำนวน <?= count($data) ?> รายการ</div>
        <div class="print-btn"><button onclick="window.print()">🖨️ พิมพ์รายงาน</button></div>
        <table>
            <thead>
                <tr><th>#</th><th>ห้อง</th><th>ผู้จอง</th><th>วัตถุประสงค์</th><th>อุปกรณ์</th><th>วันที่</th><th>เวลา</th><th>สถานะ</th></tr>
            </thead>
            <tbody>
            <?php foreach ($data as $i => $row): ?>
                <tr>
                    <td><?= $i + 1 ?></td>
                    <td><?= sanitize($row['room_name']) ?></td>
                    <td><?= sanitize($row['username']) ?></td>
                    <td><?= sanitize($row['purpose_type']) ?></td>
                    <td><?= sanitize($row['requested_equipment'] ?? '-') ?></td>
                    <td><?= $row['booking_date'] ?></td>
                    <td><?= substr($row['start_time'],0,5) ?> – <?= substr($row['end_time'],0,5) ?></td>
                    <td class="status-<?= $row['status'] ?>"><?= $statusMap[$row['status']] ?? $row['status'] ?></td>
                </tr>
            <?php endforeach; ?>
            </tbody>
        </table>
    </body>
    </html>
    <?php exit;
}

jsonResponse(['error' => 'Invalid format'], 400);

<?php
/**
 * Setup Script — Run once after importing database.sql
 * Regenerates the admin password hash and verifies the database connection.
 * 
 * Usage: php setup.php
 * Or open in browser: http://localhost:8080/setup.php
 */

require_once 'config.php';
require_once 'includes/db.php';

$isCli = php_sapi_name() === 'cli';
$nl = $isCli ? "\n" : "<br>";

echo $isCli ? "" : "<html><head><meta charset='utf-8'><title>Setup</title><style>body{font-family:sans-serif;padding:40px;background:#F0FAF4;color:#1B4332;}h1{color:#00B4D8;}.ok{color:#52B788;}.err{color:#e63946;}</style></head><body>";

echo "🔧 Room Booking System — Setup$nl$nl";

// Test DB connection
try {
    $pdo = getDB();
    echo "<span class='ok'>✅ Database connection successful</span>$nl";
} catch (Exception $e) {
    echo "<span class='err'>❌ Database connection failed: " . $e->getMessage() . "</span>$nl";
    echo "Please check config.php and make sure MySQL is running.$nl";
    exit(1);
}

// Check tables
$tables = ['users', 'rooms', 'bookings', 'logs'];
foreach ($tables as $table) {
    try {
        $count = $pdo->query("SELECT COUNT(*) FROM $table")->fetchColumn();
        echo "<span class='ok'>✅ Table '$table' exists ($count rows)</span>$nl";
    } catch (Exception $e) {
        echo "<span class='err'>❌ Table '$table' not found. Please import database.sql first.</span>$nl";
    }
}

// Regenerate admin password
$password = 'admin123';
$hash = password_hash($password, PASSWORD_BCRYPT);

$stmt = $pdo->prepare("UPDATE users SET password = ? WHERE username = 'admin'");
$stmt->execute([$hash]);

if ($stmt->rowCount() > 0) {
    echo "$nl<span class='ok'>✅ Admin password hash updated successfully</span>$nl";
    echo "   Username: admin$nl";
    echo "   Password: admin123$nl";
} else {
    echo "$nl<span class='err'>⚠️ Admin user not found. Inserting...</span>$nl";
    $pdo->prepare("INSERT INTO users (fullname, username, password, role) VALUES ('ผู้ดูแลระบบ', 'admin', ?, 'admin')")->execute([$hash]);
    echo "<span class='ok'>✅ Admin user created</span>$nl";
}

// Check rooms
$roomCount = $pdo->query("SELECT COUNT(*) FROM rooms")->fetchColumn();
echo "$nl<span class='ok'>✅ $roomCount rooms configured</span>$nl";

echo "$nl🎉 Setup complete! You can now access the system.$nl";
echo "   URL: http://localhost:8080/$nl";
echo "$nl📝 Register/Login system is active for all users.$nl";
echo "   Admin: admin / admin123$nl";
echo "   Users can register via the Register button.$nl";

echo $isCli ? "" : "</body></html>";

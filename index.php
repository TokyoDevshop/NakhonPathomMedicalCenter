<?php require_once 'config.php'; ?>
<!DOCTYPE html>
<html lang="th">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?= APP_NAME ?></title>
    <meta name="description" content="ระบบจองห้องเรียนและประชุมออนไลน์ สำหรับองค์กร โรงเรียน หรือหน่วยงาน">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Thai:wght@300;400;500;600;700;800&family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
    <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/dayjs@1.11.10/dayjs.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/dayjs@1.11.10/locale/th.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/dayjs@1.11.10/plugin/buddhistEra.js"></script>
    <link rel="stylesheet" href="css/app.css">
</head>
<body>
    <!-- Header -->
    <header class="app-header">
        <div class="header-inner">
            <div class="app-logo" onclick="navigate('dashboard')">
                <div class="logo-icon">🏢</div>
                <span><?= APP_NAME ?></span>
            </div>
            <button class="nav-toggle" onclick="toggleNav()" aria-label="Menu">☰</button>
            <nav>
                <ul class="nav-menu" id="navMenu">
                    <li><a href="#" data-page="dashboard" class="active" onclick="navigate('dashboard')">📊 หน้าหลัก</a></li>
                    <li><a href="#" data-page="rooms" onclick="navigate('rooms')">🏢 ห้องประชุม</a></li>
                    <li><a href="#" data-page="booking" class="nav-auth-only" onclick="navigate('booking')">📅 จองห้อง</a></li>
                    <li><a href="#" data-page="bookingList" class="nav-auth-only" onclick="navigate('bookingList')">📋 รายการจอง</a></li>
                    <li><a href="#" data-page="stats" class="nav-admin-only" onclick="navigate('stats')">📈 สถิติ</a></li>
                    <li><a href="#" data-page="admin" class="nav-admin-only" onclick="navigate('admin')">⚙️ Admin</a></li>
                </ul>
            </nav>
            <div class="header-actions">
                <div id="authArea"></div>
            </div>
        </div>
    </header>

    <!-- Main Content -->
    <main class="app-main" id="appMain">
        <div class="loading-overlay" id="mainLoading">
            <div class="spinner"></div>
            <span>กำลังโหลด...</span>
        </div>
    </main>

    <!-- Toast Container -->
    <div class="toast-container" id="toastContainer"></div>

    <!-- Modal Overlay -->
    <div class="modal-overlay" id="modalOverlay" onclick="closeModal(event)">
        <div class="modal" id="modalContent" onclick="event.stopPropagation()"></div>
    </div>

    <!-- Scripts -->
    <script src="js/notifications.js"></script>
    <script src="js/app.js"></script>
    <script src="js/dashboard.js"></script>
    <script src="js/rooms.js"></script>
    <script src="js/calendar.js"></script>
    <script src="js/booking.js"></script>
    <script src="js/bookingList.js"></script>
    <script src="js/stats.js"></script>
    <script src="js/admin.js"></script>
</body>
</html>

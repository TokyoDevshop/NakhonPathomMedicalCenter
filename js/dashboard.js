// =============================================
// Dashboard Page
// =============================================

async function renderDashboard(container) {
    const data = await api('api/stats.php?action=dashboard');

    const topRoomsHtml = data.top_rooms && data.top_rooms.length > 0
        ? data.top_rooms.map((r, i) => `
            <li>
                <div style="display:flex;align-items:center;">
                    <span class="rank">${i + 1}</span>
                    <span>${r.room_name}</span>
                </div>
                <span style="font-weight:600;color:var(--turquoise);">${r.count} ครั้ง</span>
            </li>
        `).join('')
        : '<li style="text-align:center;color:var(--text-muted);padding:20px;">ยังไม่มีข้อมูล</li>';

    container.innerHTML = `
        <div class="fade-in">
            <div class="page-header">
                <h2>📊 Dashboard</h2>
                <span style="color:var(--text-muted);font-size:0.9rem;">
                    ${dayjs().format('วันdddd ที่ D MMMM')} ${parseInt(dayjs().format('YYYY')) + 543}
                </span>
            </div>
            
            <div class="stats-grid">
                <div class="stat-card slide-up">
                    <div class="stat-icon">🏢</div>
                    <div class="stat-value">${data.total_rooms}</div>
                    <div class="stat-label">ห้องทั้งหมด</div>
                </div>
                <div class="stat-card slide-up" style="animation-delay:0.1s">
                    <div class="stat-icon">🟢</div>
                    <div class="stat-value">${data.available_now}</div>
                    <div class="stat-label">ห้องว่างตอนนี้</div>
                </div>
                <div class="stat-card slide-up" style="animation-delay:0.2s">
                    <div class="stat-icon">📅</div>
                    <div class="stat-value">${data.today_bookings}</div>
                    <div class="stat-label">จองวันนี้</div>
                </div>
                <div class="stat-card slide-up" style="animation-delay:0.3s">
                    <div class="stat-icon">📆</div>
                    <div class="stat-value">${data.weekly_bookings}</div>
                    <div class="stat-label">จองสัปดาห์นี้</div>
                </div>
            </div>

            <div class="layout-two-col">
                <div class="card">
                    <div class="card-header">🏆 ห้องยอดนิยม (เดือนนี้)</div>
                    <div class="card-body">
                        <ul class="top-rooms">${topRoomsHtml}</ul>
                    </div>
                </div>
                <div class="card">
                    <div class="card-header">⚡ ทางลัด</div>
                    <div class="card-body" style="display:flex;flex-direction:column;gap:10px;">
                        ${currentUser ? `
                            <button class="btn btn-primary btn-lg" onclick="navigate('booking')" style="width:100%;">
                                📅 จองห้องประชุม
                            </button>
                            <button class="btn btn-success btn-lg" onclick="navigate('rooms')" style="width:100%;">
                                🏢 ดูสถานะห้อง
                            </button>
                            <button class="btn btn-outline btn-lg" onclick="navigate('bookingList')" style="width:100%;">
                                📋 ดูรายการจอง
                            </button>
                        ` : `
                            <button class="btn btn-primary btn-lg" onclick="showLoginModal()" style="width:100%;">
                                🔐 เข้าสู่ระบบ
                            </button>
                            <button class="btn btn-success btn-lg" onclick="showRegisterModal()" style="width:100%;">
                                📝 สมัครสมาชิก
                            </button>
                            <button class="btn btn-outline btn-lg" onclick="navigate('rooms')" style="width:100%;">
                                🏢 ดูสถานะห้อง
                            </button>
                        `}
                    </div>
                </div>
            </div>
        </div>
    `;
}

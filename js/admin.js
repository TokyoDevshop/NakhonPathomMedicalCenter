// =============================================
// Admin Panel — Updated for new fields
// =============================================

async function renderAdmin(container) {
    if (!currentUser || currentUser.role !== 'admin') {
        container.innerHTML = `<div class="empty-state fade-in">
            <div class="empty-icon">🔒</div>
            <p>เฉพาะ Admin เท่านั้นที่สามารถเข้าถึงหน้านี้</p>
            <button class="btn btn-primary" onclick="showLoginModal()">🔐 เข้าสู่ระบบ</button>
        </div>`;
        return;
    }

    container.innerHTML = `
        <div class="fade-in">
            <div class="page-header">
                <h2>⚙️ จัดการระบบ</h2>
                <span style="color:var(--text-muted);font-size:0.85rem;">👤 ${currentUser.fullname || currentUser.username} (Admin)</span>
            </div>
            <div class="tabs">
                <button class="tab-btn active" data-tab="admin-rooms" onclick="switchAdminTab('admin-rooms')">🏢 จัดการห้อง</button>
                <button class="tab-btn" data-tab="admin-bookings" onclick="switchAdminTab('admin-bookings')">📋 จัดการการจอง</button>
                <button class="tab-btn" data-tab="admin-logs" onclick="switchAdminTab('admin-logs')">📜 Log ระบบ</button>
            </div>
            <div id="adminContent"></div>
        </div>
    `;
    loadAdminRooms();
}

let adminTab = 'admin-rooms';

function switchAdminTab(tab) {
    adminTab = tab;
    document.querySelectorAll('.tabs .tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tab);
    });
    switch (tab) {
        case 'admin-rooms': loadAdminRooms(); break;
        case 'admin-bookings': loadAdminBookings(); break;
        case 'admin-logs': loadAdminLogs(); break;
    }
}

// ---- Room Management ----
async function loadAdminRooms() {
    const content = document.getElementById('adminContent');
    content.innerHTML = '<div class="loading-overlay"><div class="spinner"></div></div>';
    const data = await api('api/rooms.php?action=list');
    const rooms = data.rooms || [];

    content.innerHTML = `
        <div class="card fade-in">
            <div class="card-body" style="padding-bottom:12px;">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
                    <h4 style="margin:0;">🏢 ห้องประชุมทั้งหมด (${rooms.length} ห้อง)</h4>
                    <button class="btn btn-success btn-sm" onclick="showAddRoomModal()">➕ เพิ่มห้องใหม่</button>
                </div>
                <div style="overflow-x:auto;">
                    <table class="data-table">
                        <thead>
                            <tr><th>ID</th><th>ชื่อห้อง</th><th>ความจุ</th><th>ชั้น/ที่ตั้ง</th><th>เวลาทำการ</th><th>สถานะ</th><th>จัดการ</th></tr>
                        </thead>
                        <tbody>
                            ${rooms.map(r => `
                                <tr>
                                    <td>${r.id}</td>
                                    <td><strong>${r.room_name}</strong></td>
                                    <td>${r.capacity} คน</td>
                                    <td>${r.floor || '—'}</td>
                                    <td>${r.open_time.substring(0, 5)} – ${r.close_time.substring(0, 5)}</td>
                                    <td><span class="status-badge ${r.is_active ? 'status-available' : 'status-inactive'}">${r.is_active ? '🟢 เปิด' : '⚪ ปิด'}</span></td>
                                    <td style="white-space:nowrap;">
                                        <button class="btn btn-sm btn-outline" onclick="showEditRoomModal(${r.id},'${encodeURIComponent(r.room_name)}',${r.capacity},'${encodeURIComponent(r.floor || '')}','${r.open_time.substring(0, 5)}','${r.close_time.substring(0, 5)}','${encodeURIComponent(r.equipment || '')}')">✏️</button>
                                        <button class="btn btn-sm ${r.is_active ? 'btn-danger' : 'btn-success'}" onclick="toggleRoom(${r.id})">${r.is_active ? '🔒' : '🔓'}</button>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;
}

function showAddRoomModal() {
    showModal(`
        <div class="modal-header">
            <h3>➕ เพิ่มห้องใหม่</h3>
            <button class="modal-close" onclick="closeModalDirect()">✕</button>
        </div>
        <div class="modal-body">
            <div class="form-group"><label class="form-label">ชื่อห้อง <span class="required">*</span></label><input type="text" class="form-control" id="newRoomName" placeholder="เช่น ห้องเรียน 7"></div>
            <div class="form-group"><label class="form-label">ความจุ (คน) <span class="required">*</span></label><input type="number" class="form-control" id="newRoomCapacity" placeholder="12" min="1"></div>
            <div class="form-group"><label class="form-label">ชั้น/ที่ตั้ง</label><input type="text" class="form-control" id="newRoomFloor" placeholder="เช่น ชั้น 2 อาคาร A"></div>
            <div class="form-group"><label class="form-label">อุปกรณ์ (คั่นด้วย ,)</label><input type="text" class="form-control" id="newRoomEquipment" placeholder="โปรเจคเตอร์, Whiteboard, ไมค์"></div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
                <div class="form-group"><label class="form-label">เวลาเปิด</label><input type="time" class="form-control" id="newRoomOpen" value="08:00"></div>
                <div class="form-group"><label class="form-label">เวลาปิด</label><input type="time" class="form-control" id="newRoomClose" value="20:00"></div>
            </div>
        </div>
        <div class="modal-footer">
            <button class="btn btn-outline" onclick="closeModalDirect()">ยกเลิก</button>
            <button class="btn btn-success" onclick="doAddRoom()">💾 เพิ่มห้อง</button>
        </div>
    `);
}

async function doAddRoom() {
    const name = document.getElementById('newRoomName').value.trim();
    const capacity = document.getElementById('newRoomCapacity').value;
    if (!name || !capacity) { showToast('error', 'ข้อมูลไม่ครบ', 'กรุณากรอกชื่อห้องและความจุ'); return; }
    const eqStr = document.getElementById('newRoomEquipment').value.trim();
    const equipment = eqStr ? JSON.stringify(eqStr.split(',').map(s => s.trim()).filter(Boolean)) : null;
    const data = await api('api/rooms.php?action=create', {
        method: 'POST', body: {
            room_name: name, capacity: parseInt(capacity),
            floor: document.getElementById('newRoomFloor').value.trim() || null,
            equipment, open_time: document.getElementById('newRoomOpen').value || '08:00',
            close_time: document.getElementById('newRoomClose').value || '20:00',
        }
    });
    closeModalDirect();
    if (data.success) { showToast('success', '✅ เพิ่มห้องสำเร็จ', `เพิ่ม ${name} เรียบร้อย`); loadAdminRooms(); }
    else showToast('error', 'เกิดข้อผิดพลาด', data.error);
}

function showEditRoomModal(id, name, capacity, floor, openTime, closeTime, equipment) {
    name = decodeURIComponent(name); floor = decodeURIComponent(floor); equipment = decodeURIComponent(equipment);
    let eqStr = '';
    try { const parsed = JSON.parse(equipment); if (Array.isArray(parsed)) eqStr = parsed.join(', '); } catch (e) { eqStr = equipment; }
    showModal(`
        <div class="modal-header"><h3>✏️ แก้ไขห้อง: ${name}</h3><button class="modal-close" onclick="closeModalDirect()">✕</button></div>
        <div class="modal-body">
            <div class="form-group"><label class="form-label">ชื่อห้อง</label><input type="text" class="form-control" id="editRoomName" value="${name}"></div>
            <div class="form-group"><label class="form-label">ความจุ (คน)</label><input type="number" class="form-control" id="editRoomCapacity" value="${capacity}" min="1"></div>
            <div class="form-group"><label class="form-label">ชั้น/ที่ตั้ง</label><input type="text" class="form-control" id="editRoomFloor" value="${floor}"></div>
            <div class="form-group"><label class="form-label">อุปกรณ์ (คั่นด้วย ,)</label><input type="text" class="form-control" id="editRoomEquipment" value="${eqStr}"></div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
                <div class="form-group"><label class="form-label">เวลาเปิด</label><input type="time" class="form-control" id="editRoomOpen" value="${openTime}"></div>
                <div class="form-group"><label class="form-label">เวลาปิด</label><input type="time" class="form-control" id="editRoomClose" value="${closeTime}"></div>
            </div>
        </div>
        <div class="modal-footer">
            <button class="btn btn-outline" onclick="closeModalDirect()">ยกเลิก</button>
            <button class="btn btn-primary" onclick="doEditRoom(${id})">💾 บันทึก</button>
        </div>
    `);
}

async function doEditRoom(id) {
    const eqStr = document.getElementById('editRoomEquipment').value.trim();
    const equipment = eqStr ? JSON.stringify(eqStr.split(',').map(s => s.trim()).filter(Boolean)) : null;
    const data = await api('api/rooms.php?action=update', {
        method: 'POST', body: {
            id, room_name: document.getElementById('editRoomName').value.trim(),
            capacity: parseInt(document.getElementById('editRoomCapacity').value),
            floor: document.getElementById('editRoomFloor').value.trim() || null,
            equipment, open_time: document.getElementById('editRoomOpen').value,
            close_time: document.getElementById('editRoomClose').value,
        }
    });
    closeModalDirect();
    if (data.success) { showToast('success', '✅ แก้ไขสำเร็จ', 'อัปเดตข้อมูลห้องเรียบร้อย'); loadAdminRooms(); }
    else showToast('error', 'เกิดข้อผิดพลาด', data.error);
}

async function toggleRoom(id) {
    const data = await api('api/rooms.php?action=toggle', { method: 'POST', body: { id } });
    if (data.success) { showToast('success', '✅ เปลี่ยนสถานะสำเร็จ', ''); loadAdminRooms(); }
}

// ---- Booking Management (Admin) ----
async function loadAdminBookings() {
    // Navigate to booking list — admin sees all bookings there
    navigate('bookingList');
}

// ---- System Logs ----
async function loadAdminLogs() {
    const content = document.getElementById('adminContent');
    content.innerHTML = `
        <div class="card fade-in">
            <div class="card-body" style="padding-bottom:12px;">
                <div style="display:flex;flex-wrap:wrap;gap:10px;margin-bottom:16px;align-items:center;">
                    <h4 style="margin:0;flex:1;">📜 Log ระบบ</h4>
                    <select class="form-control" id="logAction" onchange="refreshLogs()" style="width:auto;">
                        <option value="">ทุกประเภท</option>
                        <option value="register">สมัครสมาชิก</option>
                        <option value="login">Login</option>
                        <option value="logout">Logout</option>
                        <option value="booking_create">จองห้อง</option>
                        <option value="booking_cancel">ยกเลิกจอง</option>
                        <option value="booking_update">แก้ไขจอง</option>
                        <option value="room_create">เพิ่มห้อง</option>
                        <option value="room_update">แก้ไขห้อง</option>
                        <option value="room_toggle">เปิด/ปิดห้อง</option>
                    </select>
                    <input type="date" class="form-control" id="logDateFrom" onchange="refreshLogs()" style="width:auto;">
                    <input type="date" class="form-control" id="logDateTo" onchange="refreshLogs()" style="width:auto;">
                </div>
                <div style="overflow-x:auto;">
                    <table class="data-table">
                        <thead><tr><th>เวลา</th><th>ประเภท</th><th>ผู้ดำเนินการ</th><th>รายละเอียด</th><th>IP</th></tr></thead>
                        <tbody id="logTableBody"><tr><td colspan="5" style="text-align:center;padding:30px;"><div class="spinner"></div></td></tr></tbody>
                    </table>
                </div>
            </div>
        </div>
    `;
    refreshLogs();
}

async function refreshLogs() {
    const tbody = document.getElementById('logTableBody');
    if (!tbody) return;
    let url = 'api/logs.php?';
    const action = document.getElementById('logAction')?.value;
    const dateFrom = document.getElementById('logDateFrom')?.value;
    const dateTo = document.getElementById('logDateTo')?.value;
    if (action) url += `&action_type=${action}`;
    if (dateFrom) url += `&date_from=${dateFrom}`;
    if (dateTo) url += `&date_to=${dateTo}`;

    const data = await api(url);
    const logs = data.logs || [];

    const actionLabels = {
        'register': '📝 สมัคร', 'login': '🔓 Login', 'logout': '🔒 Logout', 'login_failed': '❌ Login Failed',
        'booking_create': '📅 จองห้อง', 'booking_cancel': '🗑️ ยกเลิก', 'booking_update': '✏️ แก้ไข',
        'room_create': '➕ เพิ่มห้อง', 'room_update': '✏️ แก้ไขห้อง', 'room_toggle': '🔄 เปิด/ปิดห้อง'
    };

    if (logs.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="color:var(--text-muted);text-align:center;padding:30px;">ไม่พบข้อมูล Log</td></tr>';
        return;
    }

    tbody.innerHTML = logs.map(log => {
        let detail = '';
        try { const d = JSON.parse(log.detail); detail = Object.entries(d).map(([k, v]) => `${k}: ${typeof v === 'object' ? JSON.stringify(v) : v}`).join(', '); }
        catch (e) { detail = log.detail || ''; }
        return `<tr>
            <td style="white-space:nowrap;font-size:0.82rem;">${log.created_at}</td>
            <td>${actionLabels[log.action] || log.action}</td>
            <td>${log.username || '—'}</td>
            <td class="log-detail" title="${detail}">${detail}</td>
            <td style="font-size:0.82rem;">${log.ip_address || '—'}</td>
        </tr>`;
    }).join('');
}

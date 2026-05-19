// =============================================
// Booking List Page — Updated for new fields
// =============================================

let currentTab = 'current';

async function renderBookingList(container) {
    if (!currentUser) {
        container.innerHTML = `<div class="empty-state fade-in">
            <div class="empty-icon">🔐</div>
            <p>กรุณาเข้าสู่ระบบเพื่อดูรายการจอง</p>
            <div style="display:flex;gap:10px;justify-content:center;">
                <button class="btn btn-primary" onclick="showLoginModal()">เข้าสู่ระบบ</button>
                <button class="btn btn-success" onclick="showRegisterModal()">สมัครสมาชิก</button>
            </div>
        </div>`;
        return;
    }

    container.innerHTML = `
        <div class="fade-in">
            <div class="page-header">
                <h2>📋 รายการจองห้องประชุม</h2>
                <button class="btn btn-primary" onclick="navigate('booking')">📅 จองใหม่</button>
            </div>

            <div class="tabs">
                <button class="tab-btn active" data-tab="current" onclick="switchBookingTab('current')">📅 รายการปัจจุบัน</button>
                <button class="tab-btn" data-tab="past" onclick="switchBookingTab('past')">📁 รายการย้อนหลัง</button>
                <button class="tab-btn" data-tab="cancelled" onclick="switchBookingTab('cancelled')">❌ รายการยกเลิก</button>
            </div>

            <div class="filter-bar">
                <div class="search-input">
                    <span class="search-icon">🔍</span>
                    <input type="text" class="form-control" id="blSearch" placeholder="ค้นหาชื่อผู้จอง / วัตถุประสงค์..." oninput="loadBookings()">
                </div>
                <select class="form-control" id="blRoom" onchange="loadBookings()">
                    <option value="">ทุกห้อง</option>
                </select>
                <input type="date" class="form-control" id="blDateFrom" onchange="loadBookings()" style="max-width:160px;">
                <input type="date" class="form-control" id="blDateTo" onchange="loadBookings()" style="max-width:160px;">
            </div>

            <div class="card">
                <div class="card-body" style="padding:0;overflow-x:auto;">
                    <table class="data-table" id="bookingTable">
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>ห้อง</th>
                                <th>ผู้จอง</th>
                                <th>วัตถุประสงค์</th>
                                <th>วันที่</th>
                                <th>เวลา</th>
                                <th>สถานะ</th>
                                <th>จัดการ</th>
                            </tr>
                        </thead>
                        <tbody id="bookingTableBody">
                            <tr><td colspan="8" style="text-align:center;padding:30px;"><div class="spinner"></div></td></tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;

    const roomsData = await api('api/rooms.php?action=list');
    const roomSelect = document.getElementById('blRoom');
    (roomsData.rooms || []).forEach(r => {
        const opt = document.createElement('option');
        opt.value = r.id;
        opt.textContent = r.room_name;
        roomSelect.appendChild(opt);
    });

    loadBookings();
}

function switchBookingTab(tab) {
    currentTab = tab;
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tab);
    });
    loadBookings();
}

async function loadBookings() {
    const tbody = document.getElementById('bookingTableBody');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:30px;"><div class="spinner"></div></td></tr>';

    let url = `api/bookings.php?action=list&tab=${currentTab}`;
    const search = document.getElementById('blSearch')?.value;
    const room = document.getElementById('blRoom')?.value;
    const dateFrom = document.getElementById('blDateFrom')?.value;
    const dateTo = document.getElementById('blDateTo')?.value;
    if (search) url += `&search=${encodeURIComponent(search)}`;
    if (room) url += `&room_id=${room}`;
    if (dateFrom) url += `&date_from=${dateFrom}`;
    if (dateTo) url += `&date_to=${dateTo}`;

    const data = await api(url);
    const bookings = data.bookings || [];

    const statusLabels = { 'confirmed': 'ยืนยันแล้ว', 'pending': 'รอดำเนินการ', 'cancelled': 'ยกเลิกแล้ว' };
    const statusClasses = { 'confirmed': 'status-available', 'pending': 'status-upcoming', 'cancelled': 'status-booked' };

    if (bookings.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8"><div class="empty-state"><div class="empty-icon">📭</div><p>ไม่พบรายการจอง</p></div></td></tr>`;
        return;
    }

    const isAdminUser = currentUser && currentUser.role === 'admin';

    tbody.innerHTML = bookings.map((b, i) => {
        let actions = '';
        if (b.status !== 'cancelled') {
            if (isAdminUser) {
                actions = `
                    <button class="btn btn-sm btn-outline" onclick="viewBookingDetail(${b.id})" title="ดูรายละเอียด">👁️</button>
                    <button class="btn btn-sm btn-danger" onclick="cancelBooking(${b.id}, '${encodeURIComponent(b.room_name)}', '${encodeURIComponent(b.username)}', '${b.start_time.substring(0, 5)}–${b.end_time.substring(0, 5)}')" title="ยกเลิก">🗑️</button>
                `;
            } else {
                actions = `
                    <button class="btn btn-sm btn-outline" onclick="viewBookingDetail(${b.id})" title="ดูรายละเอียด">👁️</button>
                    <button class="btn btn-sm btn-outline" onclick="requestCancel(${b.id})" title="แจ้งยกเลิก">📩</button>
                `;
            }
        } else {
            if (b.cancel_reason) {
                actions = `<span style="font-size:0.78rem;color:var(--text-muted);" title="${b.cancel_reason}">📝 ${b.cancelled_by || ''}</span>`;
            }
        }

        // Truncate long purposes
        const purposeShort = (b.purpose_type || '').length > 40
            ? b.purpose_type.substring(0, 40) + '...'
            : (b.purpose_type || '-');

        return `<tr class="fade-in">
            <td>${i + 1}</td>
            <td><strong>${b.room_name}</strong></td>
            <td>${b.username}</td>
            <td title="${b.purpose_type || ''}">${purposeShort}</td>
            <td>${b.booking_date}</td>
            <td>${b.start_time.substring(0, 5)} – ${b.end_time.substring(0, 5)}</td>
            <td><span class="status-badge ${statusClasses[b.status]}">${statusLabels[b.status]}</span></td>
            <td style="white-space:nowrap;">${actions}</td>
        </tr>`;
    }).join('');
}

// View full booking detail
async function viewBookingDetail(id) {
    const listData = await api('api/bookings.php?action=list');
    const booking = (listData.bookings || []).find(b => b.id == id);
    if (!booking) return;

    showModal(`
        <div class="modal-header">
            <h3>📋 รายละเอียดการจอง #${id}</h3>
            <button class="modal-close" onclick="closeModalDirect()">✕</button>
        </div>
        <div class="modal-body">
            <dl class="booking-detail">
                <dt>ห้อง</dt><dd>🏢 ${booking.room_name}</dd>
                <dt>ผู้จอง</dt><dd>👤 ${booking.username}</dd>
                <dt>วันที่</dt><dd>📅 ${booking.booking_date}</dd>
                <dt>เวลา</dt><dd>⏰ ${booking.start_time.substring(0, 5)} – ${booking.end_time.substring(0, 5)} น.</dd>
                <dt>วัตถุประสงค์</dt><dd>📋 ${booking.purpose_type || '-'}</dd>
                ${booking.purpose_detail ? `<dt>รายละเอียด</dt><dd>${booking.purpose_detail}</dd>` : ''}
                ${booking.requested_equipment ? `<dt>อุปกรณ์ที่ขอ</dt><dd>🔧 ${booking.requested_equipment}</dd>` : ''}
                <dt>สถานะ</dt><dd>${booking.status === 'confirmed' ? '✅ ยืนยันแล้ว' : booking.status === 'cancelled' ? '❌ ยกเลิกแล้ว' : '⏳ รอดำเนินการ'}</dd>
                <dt>วันที่สร้าง</dt><dd>${booking.created_at}</dd>
            </dl>
            ${booking.status === 'cancelled' ? `
                <div style="margin-top:12px;background:var(--danger-light);padding:12px;border-radius:var(--radius-sm);font-size:0.88rem;">
                    <strong>ยกเลิกโดย:</strong> ${booking.cancelled_by || '-'}<br>
                    <strong>เหตุผล:</strong> ${booking.cancel_reason || '-'}
                </div>
            ` : ''}
        </div>
        <div class="modal-footer">
            <button class="btn btn-outline" onclick="closeModalDirect()">ปิด</button>
        </div>
    `);
}

function cancelBooking(id, roomName, username, time) {
    roomName = decodeURIComponent(roomName);
    username = decodeURIComponent(username);
    showModal(`
        <div class="modal-header">
            <h3>⚠️ ยืนยันการยกเลิกการจอง?</h3>
            <button class="modal-close" onclick="closeModalDirect()">✕</button>
        </div>
        <div class="modal-body">
            <dl class="booking-detail">
                <dt>ห้อง</dt><dd>🏢 ${roomName}</dd>
                <dt>ผู้จอง</dt><dd>👤 ${username}</dd>
                <dt>เวลา</dt><dd>⏰ ${time} น.</dd>
            </dl>
            <div class="form-group" style="margin-top:16px;">
                <label class="form-label">เหตุผลการยกเลิก <span class="required">*</span></label>
                <textarea class="form-control" id="cancelReason" placeholder="กรุณากรอกเหตุผลการยกเลิก" required></textarea>
            </div>
        </div>
        <div class="modal-footer">
            <button class="btn btn-outline" onclick="closeModalDirect()">ยกเลิก</button>
            <button class="btn btn-danger" onclick="doCancel(${id})">ยืนยันการยกเลิก</button>
        </div>
    `);
}

async function doCancel(id) {
    const reason = document.getElementById('cancelReason').value.trim();
    if (!reason) {
        showToast('error', 'กรุณากรอกเหตุผล', 'ต้องกรอกเหตุผลการยกเลิก');
        return;
    }
    const data = await api('api/bookings.php?action=cancel', {
        method: 'POST', body: { id, cancel_reason: reason }
    });
    closeModalDirect();
    if (data.success) {
        showToast('success', '✅ ยกเลิกสำเร็จ', data.message);
        loadBookings();
    } else {
        showToast('error', 'เกิดข้อผิดพลาด', data.error);
    }
}

function requestCancel(id) {
    showToast('info', '📩 แจ้งยกเลิก', 'กรุณาติดต่อ Admin เพื่อยกเลิกการจอง');
}

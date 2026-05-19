// =============================================
// Rooms Page — Room listing with real-time status
// =============================================

async function renderRooms(container) {
    const data = await api('api/rooms.php?action=list');
    const rooms = data.rooms || [];

    const statusLabels = {
        available: 'ว่าง',
        booked: 'จองแล้ว',
        upcoming: 'ใกล้ถึงเวลา',
        inactive: 'ปิดชั่วคราว'
    };

    const roomCards = rooms.map(room => {
        const status = room.current_status || 'available';
        const eqList = room.equipment ? JSON.parse(room.equipment) : [];
        const equipHtml = Array.isArray(eqList) && eqList.length
            ? `<div class="equipment-tags">${eqList.map(e => `<span class="equipment-tag">${e}</span>`).join('')}</div>`
            : '';

        let bookingInfo = '';
        if (status === 'booked' && room.current_booking) {
            const b = room.current_booking;
            bookingInfo = `<div style="margin-top:8px;font-size:0.82rem;color:var(--text-secondary);">
                📌 ${b.meeting_title}<br>
                ⏰ ${b.start_time.substring(0, 5)} – ${b.end_time.substring(0, 5)} น.<br>
                👤 ${b.username}
            </div>`;
        } else if (status === 'upcoming' && room.upcoming_booking) {
            const b = room.upcoming_booking;
            bookingInfo = `<div style="margin-top:8px;font-size:0.82rem;color:var(--warning);">
                ⏳ เริ่ม ${b.start_time.substring(0, 5)} น. — ${b.meeting_title}
            </div>`;
        }

        const todayCount = room.today_bookings ? room.today_bookings.length : 0;

        return `
            <div class="room-card fade-in" onclick="showRoomDetail(${room.id})">
                <div class="room-card-header">
                    <div>
                        <div class="room-name">${room.room_name}</div>
                        <div class="room-capacity">👥 ${room.capacity} คน${room.floor ? ' · 📍 ' + room.floor : ''}</div>
                    </div>
                    <span class="status-badge status-${status}">
                        <span class="status-dot"></span>
                        ${statusLabels[status]}
                    </span>
                </div>
                <div class="room-card-body">
                    ${bookingInfo}
                    ${equipHtml}
                    <div style="margin-top:10px;font-size:0.8rem;color:var(--text-muted);">
                        🕐 ${room.open_time.substring(0, 5)} – ${room.close_time.substring(0, 5)} น. · 📅 จองวันนี้: ${todayCount} รายการ
                    </div>
                </div>
            </div>
        `;
    }).join('');

    container.innerHTML = `
        <div class="fade-in">
            <div class="page-header">
                <h2>🏢 ห้องประชุมทั้งหมด</h2>
                <button class="btn btn-primary" onclick="navigate('booking')">📅 จองห้อง</button>
            </div>
            <div class="rooms-grid">${roomCards}</div>
        </div>
    `;
}

async function showRoomDetail(roomId) {
    const data = await api(`api/rooms.php?action=detail&id=${roomId}`);
    const room = data.room;
    if (!room) return;

    const bookingsHtml = room.bookings && room.bookings.length > 0
        ? room.bookings.map(b => `
            <div class="time-slot booked">
                <span class="time-range">📅 ${b.booking_date} · ${b.start_time.substring(0, 5)}–${b.end_time.substring(0, 5)}</span>
                <span class="slot-info">${b.meeting_title} — ${b.username}</span>
            </div>
        `).join('')
        : '<p style="color:var(--text-muted);text-align:center;padding:20px;">ไม่มีการจองที่กำลังจะมาถึง</p>';

    showModal(`
        <div class="modal-header">
            <h3>🏢 ${room.room_name}</h3>
            <button class="modal-close" onclick="closeModalDirect()">✕</button>
        </div>
        <div class="modal-body">
            <dl class="booking-detail">
                <dt>ความจุ</dt><dd>👥 ${room.capacity} คน</dd>
                <dt>ที่ตั้ง</dt><dd>📍 ${room.floor || 'ไม่ระบุ'}</dd>
                <dt>เวลาทำการ</dt><dd>🕐 ${room.open_time.substring(0, 5)} – ${room.close_time.substring(0, 5)} น.</dd>
                <dt>สถานะ</dt><dd>${room.is_active ? '🟢 เปิดใช้งาน' : '⚪ ปิดชั่วคราว'}</dd>
            </dl>
            <div class="section-title" style="margin-top:20px;">📅 การจองที่กำลังมาถึง</div>
            ${bookingsHtml}
        </div>
        <div class="modal-footer">
            <button class="btn btn-outline" onclick="closeModalDirect()">ปิด</button>
            <button class="btn btn-primary" onclick="closeModalDirect();navigate('booking',{roomId:${room.id}})">📅 จองห้องนี้</button>
        </div>
    `);
}

// =============================================
// Calendar System
// =============================================

let calendarMonth, calendarYear, calendarRoomId, calendarBookings;

function initCalendar(containerId, onDateSelect, roomId = 0) {
    const now = dayjs();
    calendarMonth = now.month(); // 0-indexed
    calendarYear = now.year();
    calendarRoomId = roomId;

    renderCalendar(containerId, onDateSelect);
}

async function renderCalendar(containerId, onDateSelect) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const month = calendarMonth + 1;
    const year = calendarYear;

    // Fetch booking counts
    let url = `api/bookings.php?action=calendar&month=${month}&year=${year}`;
    if (calendarRoomId) url += `&room_id=${calendarRoomId}`;
    const data = await api(url);
    calendarBookings = data.dates || {};

    const firstDay = new Date(year, calendarMonth, 1).getDay();
    const daysInMonth = new Date(year, calendarMonth + 1, 0).getDate();
    const today = dayjs();
    const todayStr = today.format('YYYY-MM-DD');

    const thMonths = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
        'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
    const thDays = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];
    const buddhistYear = year + 543;

    let daysHtml = thDays.map(d => `<div class="calendar-day-header">${d}</div>`).join('');

    // Empty cells before first day
    for (let i = 0; i < firstDay; i++) {
        daysHtml += '<div class="calendar-day empty"></div>';
    }

    for (let d = 1; d <= daysInMonth; d++) {
        const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const isToday = dateStr === todayStr;
        const isPast = dayjs(dateStr).isBefore(today, 'day');
        const bookingCount = calendarBookings[dateStr] || 0;

        let classes = 'calendar-day';
        if (isToday) classes += ' today';
        if (isPast) classes += ' past';

        const bookingDot = bookingCount > 0
            ? `<div class="day-bookings">${bookingCount} รายการ</div>`
            : '';

        const click = isPast ? '' : `onclick="selectCalendarDate('${dateStr}', '${containerId}')"`;

        daysHtml += `
            <div class="${classes}" data-date="${dateStr}" ${click}>
                <div class="day-number">${d}</div>
                ${bookingDot}
            </div>
        `;
    }

    container.innerHTML = `
        <div class="calendar-container">
            <div class="calendar-header">
                <button class="calendar-nav-btn" onclick="changeMonth(-1, '${containerId}')">◀</button>
                <h3>${thMonths[calendarMonth]} ${buddhistYear}</h3>
                <button class="calendar-nav-btn" onclick="changeMonth(1, '${containerId}')">▶</button>
            </div>
            <div class="calendar-grid">${daysHtml}</div>
        </div>
    `;

    // Store callback
    container._onDateSelect = onDateSelect;
}

function changeMonth(dir, containerId) {
    calendarMonth += dir;
    if (calendarMonth > 11) { calendarMonth = 0; calendarYear++; }
    if (calendarMonth < 0) { calendarMonth = 11; calendarYear--; }
    const container = document.getElementById(containerId);
    renderCalendar(containerId, container._onDateSelect);
}

function selectCalendarDate(dateStr, containerId) {
    // Highlight selected
    const container = document.getElementById(containerId);
    container.querySelectorAll('.calendar-day').forEach(el => el.classList.remove('selected'));
    const target = container.querySelector(`[data-date="${dateStr}"]`);
    if (target) target.classList.add('selected');

    // Callback
    if (container._onDateSelect) {
        container._onDateSelect(dateStr);
    }
}

// Day detail panel
async function showDayBookings(date, targetId) {
    const target = document.getElementById(targetId);
    if (!target) return;

    const data = await api(`api/bookings.php?action=day&date=${date}`);
    const bookings = data.bookings || [];
    const rooms = data.rooms || [];

    const thDate = dayjs(date).format('D MMMM') + ' ' + (parseInt(dayjs(date).format('YYYY')) + 543);

    let html = `<div class="card fade-in">
        <div class="card-header">📅 รายการจอง — ${thDate}</div>
        <div class="card-body">`;

    if (bookings.length === 0) {
        html += '<p style="color:var(--text-muted);text-align:center;padding:20px;">ไม่มีการจองในวันนี้</p>';
    } else {
        html += bookings.map(b => `
            <div class="time-slot booked">
                <span class="time-range">${b.start_time.substring(0, 5)} – ${b.end_time.substring(0, 5)}</span>
                <span class="slot-info">🏢 ${b.room_name} · ${b.meeting_title} — ${b.username}</span>
            </div>
        `).join('');
    }

    // Show rooms with free time
    const bookedRoomIds = [...new Set(bookings.map(b => b.room_id))];
    const freeRooms = rooms.filter(r => !bookedRoomIds.includes(r.id) || true);

    html += `<div class="section-title" style="margin-top:20px;">🟢 ห้องว่างทั้งวัน</div>`;
    const totallyFree = rooms.filter(r => !bookings.some(b => parseInt(b.room_id) === r.id));
    if (totallyFree.length > 0) {
        html += totallyFree.map(r => `
            <div class="time-slot free" style="cursor:pointer;" onclick="closeModalDirect();navigate('booking',{roomId:${r.id},date:'${date}'})">
                <span class="time-range">🏢 ${r.room_name}</span>
                <span class="slot-info">👥 ${r.capacity} คน — คลิกเพื่อจอง</span>
            </div>
        `).join('');
    } else {
        html += '<p style="color:var(--text-muted);font-size:0.85rem;">ทุกห้องมีการจองในวันนี้</p>';
    }

    html += '</div></div>';
    target.innerHTML = html;
}

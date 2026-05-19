// =============================================
// Booking Form Page — with checkbox purpose + equipment
// =============================================

// Subject data for each year level
const YEAR_SUBJECTS = {
    5: ['CHMD 5102', 'CHMD 5401', 'CHMD 5402', 'CHMD 5403', 'CHMD 5404', 'CHMD 5405', 'CHMD 5406'],
    6: ['CHMD 6101', 'CHMD 6401', 'CHMD 6402', 'CHMD 6403', 'CHMD 6404', 'CHMD 6405', 'CHMD 6406', 'CHMD 6407', 'CHMD 6408', 'CHMD 6409', 'CHMD 6410', 'CHMD 6411'],
    7: ['CHMD 7401', 'CHMD 7402', 'CHMD 7403', 'CHMD 7404', 'CHMD 7405'],
};

const EQUIPMENT = ['ไมค์', 'ไมค์เคลื่อนที่', 'พอยเตอร์', 'สาย HDMI', 'สายแปลง Type-C'];

async function renderBookingForm(container) {
    if (!currentUser) {
        container.innerHTML = `<div class="empty-state fade-in">
            <div class="empty-icon">🔐</div>
            <p>กรุณาเข้าสู่ระบบก่อนจองห้องประชุม</p>
            <div style="display:flex;gap:10px;justify-content:center;">
                <button class="btn btn-primary" onclick="showLoginModal()">เข้าสู่ระบบ</button>
                <button class="btn btn-success" onclick="showRegisterModal()">สมัครสมาชิก</button>
            </div>
        </div>`;
        return;
    }

    const roomsData = await api('api/rooms.php?action=list');
    const rooms = (roomsData.rooms || []).filter(r => r.is_active);
    const params = window.navParams || {};
    const preselectedRoom = params.roomId || '';
    const preselectedDate = params.date || dayjs().format('YYYY-MM-DD');

    const roomOptions = rooms.map(r =>
        `<option value="${r.id}" ${r.id == preselectedRoom ? 'selected' : ''}>${r.room_name} (${r.capacity} คน)</option>`
    ).join('');

    function timeOptions(selected) {
        let opts = '<option value="">เลือกเวลา</option>';
        for (let h = 8; h <= 20; h++) {
            for (let m = 0; m < 60; m += 30) {
                if (h === 20 && m > 0) break;
                const val = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
                opts += `<option value="${val}" ${val === selected ? 'selected' : ''}>${val} น.</option>`;
            }
        }
        return opts;
    }

    // Build subject checkboxes for each year
    function buildSubjects(year) {
        const subjects = YEAR_SUBJECTS[year] || [];
        return subjects.map(s =>
            `<label class="checkbox-label"><input type="checkbox" class="checkbox-custom subject-check" data-year="${year}" value="${s}"> ${s}</label>`
        ).join('');
    }

    // Build equipment checkboxes
    const equipmentHtml = EQUIPMENT.map(eq =>
        `<label class="checkbox-label"><input type="checkbox" class="checkbox-custom eq-check" value="${eq}"> ${eq}</label>`
    ).join('');

    container.innerHTML = `
        <div class="fade-in">
            <div class="page-header">
                <h2>📅 จองห้องประชุม</h2>
                <span style="color:var(--text-muted);font-size:0.85rem;">👤 ${currentUser.fullname || currentUser.username}</span>
            </div>

            <div class="layout-two-col">
                <div>
                    <div class="card" style="margin-bottom:24px;">
                        <div class="card-header">📝 ข้อมูลการจอง</div>
                        <div class="card-body">
                            <form id="bookingForm" onsubmit="return submitBooking(event)">
                                <!-- Room Selection -->
                                <div class="form-group">
                                    <label class="form-label">ห้องประชุม <span class="required">*</span></label>
                                    <select class="form-control" id="bkRoom" required onchange="checkConflictLive()">
                                        <option value="">เลือกห้องประชุม</option>
                                        ${roomOptions}
                                    </select>
                                </div>

                                <!-- Date -->
                                <div class="form-group">
                                    <label class="form-label">วันที่จอง <span class="required">*</span></label>
                                    <input type="date" class="form-control" id="bkDate" value="${preselectedDate}"
                                           min="${dayjs().format('YYYY-MM-DD')}" required onchange="checkConflictLive()">
                                </div>

                                <!-- Time -->
                                <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
                                    <div class="form-group">
                                        <label class="form-label">เวลาเริ่มต้น <span class="required">*</span></label>
                                        <select class="form-control" id="bkStartTime" required onchange="checkConflictLive()">
                                            ${timeOptions('')}
                                        </select>
                                    </div>
                                    <div class="form-group">
                                        <label class="form-label">เวลาสิ้นสุด <span class="required">*</span></label>
                                        <select class="form-control" id="bkEndTime" required onchange="checkConflictLive()">
                                            ${timeOptions('')}
                                        </select>
                                    </div>
                                </div>

                                <div id="conflictWarning" style="display:none;"></div>
                                <div id="durationWarning" style="display:none;"></div>

                                <hr style="border:none;border-top:1px solid var(--border);margin:20px 0;">

                                <!-- Purpose Section -->
                                <div class="form-group">
                                    <label class="form-label">วัตถุประสงค์ <span class="required">*</span></label>
                                    <div class="checkbox-group">
                                        <label class="checkbox-label">
                                            <input type="checkbox" class="checkbox-custom" id="purTeach" onchange="togglePurpose()"> การเรียนการสอน
                                        </label>
                                        <div id="yearLevels" class="nested-group" style="display:none;">
                                            <label class="checkbox-label">
                                                <input type="checkbox" class="checkbox-custom year-check" data-year="5" onchange="toggleYear(5)"> ชั้นปีที่ 5
                                            </label>
                                            <div id="subjects5" class="nested-group subject-container" style="display:none;">
                                                ${buildSubjects(5)}
                                            </div>
                                            <label class="checkbox-label">
                                                <input type="checkbox" class="checkbox-custom year-check" data-year="6" onchange="toggleYear(6)"> ชั้นปีที่ 6
                                            </label>
                                            <div id="subjects6" class="nested-group subject-container" style="display:none;">
                                                ${buildSubjects(6)}
                                            </div>
                                            <label class="checkbox-label">
                                                <input type="checkbox" class="checkbox-custom year-check" data-year="7" onchange="toggleYear(7)"> ชั้นปีที่ 7
                                            </label>
                                            <div id="subjects7" class="nested-group subject-container" style="display:none;">
                                                ${buildSubjects(7)}
                                            </div>
                                        </div>
                                        <label class="checkbox-label">
                                            <input type="checkbox" class="checkbox-custom" id="purMeet"> ประชุม
                                        </label>
                                        <label class="checkbox-label">
                                            <input type="checkbox" class="checkbox-custom" id="purEvent"> จัดกิจกรรม
                                        </label>
                                        <label class="checkbox-label">
                                            <input type="checkbox" class="checkbox-custom" id="purOther" onchange="toggleOtherPurpose()"> อื่นๆ
                                        </label>
                                        <input type="text" id="purOtherText" class="form-control" placeholder="ระบุวัตถุประสงค์" style="display:none;margin-top:6px;">
                                    </div>
                                </div>

                                <hr style="border:none;border-top:1px solid var(--border);margin:20px 0;">

                                <!-- Equipment Section -->
                                <div class="form-group">
                                    <label class="form-label">ขออุปกรณ์เพิ่มเติม</label>
                                    <div class="checkbox-group equipment-grid">
                                        ${equipmentHtml}
                                    </div>
                                    <input type="text" id="eqOther" class="form-control" placeholder="อุปกรณ์อื่นๆ..." style="margin-top:8px;">
                                </div>

                                <button type="submit" class="btn btn-success btn-lg" style="width:100%;margin-top:12px;" id="submitBtn">
                                    ✅ ยืนยันการจอง
                                </button>
                            </form>
                        </div>
                    </div>
                </div>

                <div>
                    <div id="bookingCalendar" style="margin-bottom:20px;"></div>
                    <div id="dayDetail"></div>
                </div>
            </div>
        </div>
    `;

    initCalendar('bookingCalendar', (dateStr) => {
        document.getElementById('bkDate').value = dateStr;
        showDayBookings(dateStr, 'dayDetail');
        checkConflictLive();
    }, preselectedRoom || 0);

    if (preselectedDate) {
        showDayBookings(preselectedDate, 'dayDetail');
    }
}

// Toggle teaching sub-options
function togglePurpose() {
    const checked = document.getElementById('purTeach').checked;
    document.getElementById('yearLevels').style.display = checked ? 'block' : 'none';
    if (!checked) {
        document.querySelectorAll('.year-check').forEach(cb => { cb.checked = false; });
        [5, 6, 7].forEach(y => {
            document.getElementById('subjects' + y).style.display = 'none';
            document.querySelectorAll(`#subjects${y} .subject-check`).forEach(cb => { cb.checked = false; });
        });
    }
}

function toggleYear(year) {
    const checked = document.querySelector(`.year-check[data-year="${year}"]`).checked;
    const container = document.getElementById('subjects' + year);
    container.style.display = checked ? 'flex' : 'none';
    if (!checked) {
        container.querySelectorAll('.subject-check').forEach(cb => { cb.checked = false; });
    }
}

function toggleOtherPurpose() {
    const checked = document.getElementById('purOther').checked;
    document.getElementById('purOtherText').style.display = checked ? 'block' : 'none';
    if (checked) document.getElementById('purOtherText').focus();
}

// Collect purpose data into structured string
function collectPurpose() {
    const parts = [];
    let detail = '';

    if (document.getElementById('purTeach')?.checked) {
        let teachStr = 'การเรียนการสอน';
        const yearDetails = [];
        [5, 6, 7].forEach(y => {
            const yearCb = document.querySelector(`.year-check[data-year="${y}"]`);
            if (yearCb?.checked) {
                const subjects = [];
                document.querySelectorAll(`#subjects${y} .subject-check:checked`).forEach(cb => {
                    subjects.push(cb.value);
                });
                if (subjects.length > 0) {
                    yearDetails.push(`ชั้นปีที่ ${y}: ${subjects.join(', ')}`);
                } else {
                    yearDetails.push(`ชั้นปีที่ ${y}`);
                }
            }
        });
        if (yearDetails.length > 0) {
            detail = yearDetails.join(' | ');
            teachStr += ` (${detail})`;
        }
        parts.push(teachStr);
    }
    if (document.getElementById('purMeet')?.checked) parts.push('ประชุม');
    if (document.getElementById('purEvent')?.checked) parts.push('จัดกิจกรรม');
    if (document.getElementById('purOther')?.checked) {
        const otherText = document.getElementById('purOtherText').value.trim();
        parts.push(otherText ? `อื่นๆ: ${otherText}` : 'อื่นๆ');
    }

    return { purposeType: parts.join(', '), purposeDetail: detail };
}

// Collect equipment
function collectEquipment() {
    const items = [];
    document.querySelectorAll('.eq-check:checked').forEach(cb => items.push(cb.value));
    const other = document.getElementById('eqOther')?.value.trim();
    if (other) items.push(other);
    return items.join(', ');
}

// Conflict check (same as before)
async function checkConflictLive() {
    const roomId = document.getElementById('bkRoom')?.value;
    const date = document.getElementById('bkDate')?.value;
    const startTime = document.getElementById('bkStartTime')?.value;
    const endTime = document.getElementById('bkEndTime')?.value;
    const conflictDiv = document.getElementById('conflictWarning');
    const durationDiv = document.getElementById('durationWarning');

    if (startTime && endTime) {
        const start = new Date(`2000-01-01T${startTime}`);
        const end = new Date(`2000-01-01T${endTime}`);
        const hours = (end - start) / 3600000;
        if (end <= start) {
            durationDiv.innerHTML = `<div style="background:var(--danger-light);border:1px solid var(--danger);border-radius:var(--radius-sm);padding:12px;margin-top:12px;font-size:0.88rem;">❌ เวลาสิ้นสุดต้องมากกว่าเวลาเริ่มต้น</div>`;
            durationDiv.style.display = 'block';
            return;
        }
        if (hours > 8) {
            durationDiv.innerHTML = `<div style="background:var(--warning-light);border:1px solid var(--warning);border-radius:var(--radius-sm);padding:12px;margin-top:12px;font-size:0.88rem;">⚠️ จองได้ไม่เกิน 8 ชั่วโมง (ขณะนี้ ${hours} ชม.)</div>`;
            durationDiv.style.display = 'block';
            return;
        }
        durationDiv.style.display = 'none';
    }

    if (!roomId || !date || !startTime || !endTime) {
        if (conflictDiv) conflictDiv.style.display = 'none';
        return;
    }

    const data = await api(`api/bookings.php?action=conflicts&room_id=${roomId}&date=${date}&start_time=${startTime}&end_time=${endTime}`);

    if (data.has_conflict) {
        const conflicts = data.conflicts || [];
        const available = data.available_rooms || [];
        let html = `<div style="background:var(--danger-light);border:1px solid var(--danger);border-radius:var(--radius-sm);padding:16px;margin-top:12px;">
            <div style="font-weight:600;color:var(--danger);margin-bottom:8px;">❌ ห้องนี้ถูกจองแล้ว</div>`;
        conflicts.forEach(c => {
            html += `<div style="font-size:0.85rem;margin-bottom:4px;">👤 โดย: ${c.username}<br>⏰ เวลา: ${c.start_time.substring(0, 5)} – ${c.end_time.substring(0, 5)} น.</div>`;
        });
        if (available.length > 0) {
            html += `<div style="margin-top:12px;padding-top:12px;border-top:1px solid #f0c0c0;">
                <div style="font-weight:600;color:var(--mint-dark);margin-bottom:6px;">💡 ห้องว่างในช่วงเวลาเดียวกัน:</div>`;
            available.forEach(r => {
                html += `<div class="time-slot free" style="cursor:pointer;margin-bottom:4px;" onclick="document.getElementById('bkRoom').value='${r.id}';checkConflictLive();">• ${r.room_name} (${r.capacity} คน)</div>`;
            });
            html += `</div>`;
        }
        html += `</div>`;
        conflictDiv.innerHTML = html;
        conflictDiv.style.display = 'block';
    } else {
        conflictDiv.innerHTML = `<div style="background:var(--success-light);border:1px solid var(--success);border-radius:var(--radius-sm);padding:12px;margin-top:12px;font-size:0.88rem;">✅ ห้องว่าง — สามารถจองได้</div>`;
        conflictDiv.style.display = 'block';
    }
}

async function submitBooking(e) {
    e.preventDefault();

    const { purposeType, purposeDetail } = collectPurpose();
    const requestedEquipment = collectEquipment();

    if (!purposeType) {
        showToast('error', 'ข้อมูลไม่ครบ', 'กรุณาเลือกวัตถุประสงค์อย่างน้อย 1 รายการ');
        return false;
    }

    const body = {
        room_id: document.getElementById('bkRoom').value,
        booking_date: document.getElementById('bkDate').value,
        start_time: document.getElementById('bkStartTime').value,
        end_time: document.getElementById('bkEndTime').value,
        purpose_type: purposeType,
        purpose_detail: purposeDetail,
        requested_equipment: requestedEquipment,
    };

    if (!body.room_id || !body.booking_date || !body.start_time || !body.end_time) {
        showToast('error', 'ข้อมูลไม่ครบ', 'กรุณากรอกข้อมูลให้ครบทุกช่อง');
        return false;
    }

    const btn = document.getElementById('submitBtn');
    btn.disabled = true;
    btn.innerHTML = '<div class="spinner" style="width:18px;height:18px;"></div> กำลังบันทึก...';

    const data = await api('api/bookings.php?action=create', { method: 'POST', body });

    btn.disabled = false;
    btn.innerHTML = '✅ ยืนยันการจอง';

    if (data.success) {
        showToast('success', '✅ จองสำเร็จ',
            `ห้อง: ${data.room_name} | ${data.date} | ${data.start_time}–${data.end_time} น.`);

        showModal(`
            <div class="modal-header">
                <h3>✅ จองสำเร็จ</h3>
                <button class="modal-close" onclick="closeModalDirect()">✕</button>
            </div>
            <div class="modal-body">
                <div style="text-align:center;margin-bottom:20px;">
                    <div style="font-size:3rem;margin-bottom:10px;">🎉</div>
                    <div style="font-size:1.1rem;font-weight:600;">จองห้องประชุมสำเร็จ!</div>
                </div>
                <dl class="booking-detail">
                    <dt>ห้อง</dt><dd>🏢 ${data.room_name}</dd>
                    <dt>วันที่</dt><dd>📅 ${data.date}</dd>
                    <dt>เวลา</dt><dd>⏰ ${data.start_time} – ${data.end_time} น.</dd>
                    <dt>ผู้จอง</dt><dd>👤 ${data.username}</dd>
                    <dt>วัตถุประสงค์</dt><dd>📋 ${purposeType}</dd>
                    ${requestedEquipment ? `<dt>อุปกรณ์</dt><dd>🔧 ${requestedEquipment}</dd>` : ''}
                </dl>
            </div>
            <div class="modal-footer">
                <button class="btn btn-outline" onclick="closeModalDirect();navigate('bookingList')">📋 ดูรายการ</button>
                <button class="btn btn-primary" onclick="closeModalDirect();navigate('booking')">📅 จองเพิ่ม</button>
            </div>
        `);
    } else if (data.error) {
        if (data.available_rooms && data.available_rooms.length > 0) {
            let suggestHtml = data.available_rooms.map(r =>
                `<div class="time-slot free" style="cursor:pointer;" onclick="document.getElementById('bkRoom').value='${r.id}';closeModalDirect();checkConflictLive();">• ${r.room_name} (${r.capacity} คน)</div>`
            ).join('');
            showModal(`
                <div class="modal-header">
                    <h3>❌ เวลาซ้อน</h3>
                    <button class="modal-close" onclick="closeModalDirect()">✕</button>
                </div>
                <div class="modal-body">
                    <p style="margin-bottom:12px;">${data.error}</p>
                    ${data.conflicts ? data.conflicts.map(c => `<div style="background:var(--danger-light);padding:10px;border-radius:var(--radius-sm);margin-bottom:8px;font-size:0.88rem;">👤 ${c.username} — ${c.start_time.substring(0, 5)}–${c.end_time.substring(0, 5)} น.</div>`).join('') : ''}
                    <div class="section-title" style="margin-top:16px;">💡 ห้องว่าง</div>
                    ${suggestHtml}
                </div>
                <div class="modal-footer"><button class="btn btn-outline" onclick="closeModalDirect()">ปิด</button></div>
            `);
        } else {
            showToast('error', 'ไม่สามารถจองได้', data.error);
        }
    }
    return false;
}

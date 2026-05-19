// =============================================
// Main App — Router, Auth (Register/Login), Navigation
// =============================================

let currentUser = null;
let currentPage = 'dashboard';

// API helper
async function api(url, options = {}) {
    const defaults = { headers: { 'Content-Type': 'application/json' } };
    if (options.body && typeof options.body === 'object') {
        options.body = JSON.stringify(options.body);
    }
    const res = await fetch(url, { ...defaults, ...options });
    if (url.includes('export.php')) return res;
    return res.json();
}

// Navigation
function navigate(page, params = {}) {
    currentPage = page;
    window.navParams = params;
    document.querySelectorAll('.nav-menu a').forEach(a => {
        a.classList.toggle('active', a.dataset.page === page);
    });
    document.getElementById('navMenu').classList.remove('open');
    renderPage(page);
}

function toggleNav() {
    document.getElementById('navMenu').classList.toggle('open');
}

async function renderPage(page) {
    const main = document.getElementById('appMain');
    main.innerHTML = '<div class="loading-overlay"><div class="spinner"></div><span>กำลังโหลด...</span></div>';
    try {
        switch (page) {
            case 'dashboard': await renderDashboard(main); break;
            case 'rooms': await renderRooms(main); break;
            case 'booking': await renderBookingForm(main); break;
            case 'bookingList': await renderBookingList(main); break;
            case 'stats': await renderStats(main); break;
            case 'admin': await renderAdmin(main); break;
            default: await renderDashboard(main);
        }
    } catch (err) {
        console.error('Page render error:', err);
        main.innerHTML = `<div class="empty-state"><div class="empty-icon">😵</div><p>เกิดข้อผิดพลาด: ${err.message}</p><button class="btn btn-primary" onclick="navigate('${page}')">ลองใหม่</button></div>`;
    }
}

// ---- Auth ----
async function checkAuth() {
    try {
        const data = await api('api/auth.php?action=check');
        currentUser = data.loggedIn ? data.user : null;
    } catch (e) { currentUser = null; }
    updateAuthUI();
}

function updateAuthUI() {
    const area = document.getElementById('authArea');
    const adminLinks = document.querySelectorAll('.nav-admin-only');
    const authLinks = document.querySelectorAll('.nav-auth-only');

    if (currentUser) {
        area.innerHTML = `
            <span style="color:rgba(255,255,255,0.9);font-size:0.85rem;margin-right:8px;">
                👤 ${currentUser.fullname || currentUser.username}
                ${currentUser.role === 'admin' ? '<span style="background:rgba(255,255,255,0.25);padding:2px 8px;border-radius:10px;font-size:0.72rem;margin-left:4px;">ADMIN</span>' : ''}
            </span>
            <button class="btn-admin-login" onclick="logout()">ออกจากระบบ</button>
        `;
        adminLinks.forEach(el => el.style.display = currentUser.role === 'admin' ? '' : 'none');
        authLinks.forEach(el => el.style.display = '');
    } else {
        area.innerHTML = `
            <button class="btn-admin-login" onclick="showLoginModal()" style="margin-right:6px;">เข้าสู่ระบบ</button>
            <button class="btn-admin-login" style="background:rgba(255,255,255,0.35);" onclick="showRegisterModal()">สมัครสมาชิก</button>
        `;
        adminLinks.forEach(el => el.style.display = 'none');
        authLinks.forEach(el => el.style.display = 'none');
    }
}

// ---- Login Modal ----
function showLoginModal() {
    showModal(`
        <div class="modal-header">
            <h3>🔐 เข้าสู่ระบบ</h3>
            <button class="modal-close" onclick="closeModalDirect()">✕</button>
        </div>
        <div class="modal-body">
            <div class="form-group">
                <label class="form-label">ชื่อผู้ใช้</label>
                <input type="text" class="form-control" id="loginUsername" placeholder="Username" autocomplete="username">
            </div>
            <div class="form-group">
                <label class="form-label">รหัสผ่าน</label>
                <input type="password" class="form-control" id="loginPassword" placeholder="Password" autocomplete="current-password"
                       onkeydown="if(event.key==='Enter')doLogin()">
            </div>
            <div id="loginError" style="color:var(--danger);font-size:0.85rem;margin-top:8px;display:none;"></div>
        </div>
        <div class="modal-footer" style="flex-direction:column;gap:10px;align-items:stretch;">
            <button class="btn btn-primary btn-lg" onclick="doLogin()" style="width:100%;">เข้าสู่ระบบ</button>
            <div style="text-align:center;font-size:0.85rem;color:var(--text-muted);">
                ยังไม่มีบัญชี? <a href="#" onclick="closeModalDirect();showRegisterModal();" style="color:var(--turquoise);font-weight:600;text-decoration:none;">สมัครสมาชิก</a>
            </div>
        </div>
    `);
    setTimeout(() => document.getElementById('loginUsername')?.focus(), 200);
}

async function doLogin() {
    const username = document.getElementById('loginUsername').value.trim();
    const password = document.getElementById('loginPassword').value;
    const errEl = document.getElementById('loginError');

    if (!username || !password) {
        errEl.textContent = 'กรุณากรอกข้อมูลให้ครบ';
        errEl.style.display = 'block';
        return;
    }

    const data = await api('api/auth.php?action=login', {
        method: 'POST', body: { username, password }
    });

    if (data.success) {
        currentUser = data.user;
        updateAuthUI();
        closeModalDirect();
        showToast('success', 'เข้าสู่ระบบสำเร็จ', `ยินดีต้อนรับ ${currentUser.fullname || currentUser.username}`);
        navigate(currentPage);
    } else {
        errEl.textContent = data.error || 'เข้าสู่ระบบไม่สำเร็จ';
        errEl.style.display = 'block';
    }
}

// ---- Register Modal ----
function showRegisterModal() {
    showModal(`
        <div class="modal-header">
            <h3>📝 สมัครสมาชิก</h3>
            <button class="modal-close" onclick="closeModalDirect()">✕</button>
        </div>
        <div class="modal-body">
            <div class="form-group">
                <label class="form-label">ชื่อ-นามสกุล <span class="required">*</span></label>
                <input type="text" class="form-control" id="regFullname" placeholder="เช่น สมชาย ใจดี">
            </div>
            <div class="form-group">
                <label class="form-label">ชื่อผู้ใช้ (Username) <span class="required">*</span></label>
                <input type="text" class="form-control" id="regUsername" placeholder="อย่างน้อย 3 ตัวอักษร" autocomplete="username">
            </div>
            <div class="form-group">
                <label class="form-label">รหัสผ่าน <span class="required">*</span></label>
                <input type="password" class="form-control" id="regPassword" placeholder="อย่างน้อย 6 ตัวอักษร" autocomplete="new-password">
            </div>
            <div class="form-group">
                <label class="form-label">ยืนยันรหัสผ่าน <span class="required">*</span></label>
                <input type="password" class="form-control" id="regConfirmPassword" placeholder="กรอกรหัสผ่านอีกครั้ง" autocomplete="new-password"
                       onkeydown="if(event.key==='Enter')doRegister()">
            </div>
            <div id="regError" style="color:var(--danger);font-size:0.85rem;margin-top:8px;display:none;"></div>
        </div>
        <div class="modal-footer" style="flex-direction:column;gap:10px;align-items:stretch;">
            <button class="btn btn-success btn-lg" onclick="doRegister()" style="width:100%;">สมัครสมาชิก</button>
            <div style="text-align:center;font-size:0.85rem;color:var(--text-muted);">
                มีบัญชีอยู่แล้ว? <a href="#" onclick="closeModalDirect();showLoginModal();" style="color:var(--turquoise);font-weight:600;text-decoration:none;">เข้าสู่ระบบ</a>
            </div>
        </div>
    `);
    setTimeout(() => document.getElementById('regFullname')?.focus(), 200);
}

async function doRegister() {
    const fullname = document.getElementById('regFullname').value.trim();
    const username = document.getElementById('regUsername').value.trim();
    const password = document.getElementById('regPassword').value;
    const confirmPassword = document.getElementById('regConfirmPassword').value;
    const errEl = document.getElementById('regError');

    if (!fullname || !username || !password || !confirmPassword) {
        errEl.textContent = 'กรุณากรอกข้อมูลให้ครบทุกช่อง';
        errEl.style.display = 'block';
        return;
    }
    if (password !== confirmPassword) {
        errEl.textContent = 'รหัสผ่านไม่ตรงกัน';
        errEl.style.display = 'block';
        return;
    }

    const data = await api('api/auth.php?action=register', {
        method: 'POST',
        body: { fullname, username, password, confirm_password: confirmPassword }
    });

    if (data.success) {
        currentUser = data.user;
        updateAuthUI();
        closeModalDirect();
        showToast('success', '🎉 สมัครสมาชิกสำเร็จ', `ยินดีต้อนรับ ${currentUser.fullname}`);
        navigate(currentPage);
    } else {
        errEl.textContent = data.error || 'สมัครสมาชิกไม่สำเร็จ';
        errEl.style.display = 'block';
    }
}

async function logout() {
    await api('api/auth.php?action=logout');
    currentUser = null;
    updateAuthUI();
    showToast('info', 'ออกจากระบบ', 'ออกจากระบบเรียบร้อยแล้ว');
    navigate('dashboard');
}

// Init
dayjs.locale('th');
if (dayjs.extend) dayjs.extend(dayjs_plugin_buddhistEra);

document.addEventListener('DOMContentLoaded', async () => {
    await checkAuth();
    navigate('dashboard');
});

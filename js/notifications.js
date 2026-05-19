// =============================================
// Notification / Toast System
// =============================================

function showToast(type, title, message, duration = 4000) {
    const container = document.getElementById('toastContainer');
    const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <span class="toast-icon">${icons[type] || 'ℹ️'}</span>
        <div class="toast-content">
            <div class="toast-title">${title}</div>
            <div class="toast-message">${message}</div>
        </div>
        <button class="toast-close" onclick="this.closest('.toast').remove()">✕</button>
    `;
    container.appendChild(toast);
    
    requestAnimationFrame(() => toast.classList.add('show'));
    
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 400);
    }, duration);
}

function showModal(html) {
    document.getElementById('modalContent').innerHTML = html;
    document.getElementById('modalOverlay').classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeModal(e) {
    if (e && e.target !== document.getElementById('modalOverlay')) return;
    document.getElementById('modalOverlay').classList.remove('active');
    document.body.style.overflow = '';
}

function closeModalDirect() {
    document.getElementById('modalOverlay').classList.remove('active');
    document.body.style.overflow = '';
}

function confirmDialog(title, message, onConfirm, extraHtml = '') {
    showModal(`
        <div class="modal-header">
            <h3>⚠️ ${title}</h3>
            <button class="modal-close" onclick="closeModalDirect()">✕</button>
        </div>
        <div class="modal-body">
            <p>${message}</p>
            ${extraHtml}
        </div>
        <div class="modal-footer">
            <button class="btn btn-outline" onclick="closeModalDirect()">ยกเลิก</button>
            <button class="btn btn-danger" id="confirmBtn">ยืนยัน</button>
        </div>
    `);
    document.getElementById('confirmBtn').onclick = () => { onConfirm(); closeModalDirect(); };
}

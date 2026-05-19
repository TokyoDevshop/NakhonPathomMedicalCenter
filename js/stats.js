// =============================================
// Statistics Page — Charts (Admin only)
// =============================================

let chartInstances = {};

async function renderStats(container) {
    if (!currentUser || currentUser.role !== 'admin') {
        container.innerHTML = `<div class="empty-state fade-in">
            <div class="empty-icon">🔒</div>
            <p>เฉพาะ Admin เท่านั้นที่สามารถดูสถิติได้</p>
            <button class="btn btn-primary" onclick="showLoginModal()">🔐 เข้าสู่ระบบ</button>
        </div>`;
        return;
    }

    const data = await api('api/stats.php?action=charts');

    container.innerHTML = `
        <div class="fade-in">
            <div class="page-header">
                <h2>📈 สถิติการใช้งาน</h2>
                <div style="display:flex;gap:8px;">
                    <button class="btn btn-outline btn-sm" onclick="exportData('csv')">📥 Export Excel</button>
                    <button class="btn btn-outline btn-sm" onclick="exportData('pdf')">📄 Export PDF</button>
                </div>
            </div>
            
            <div class="stats-grid" style="grid-template-columns:repeat(auto-fit,minmax(200px,1fr));">
                <div class="stat-card">
                    <div class="stat-icon">📊</div>
                    <div class="stat-value">${data.total_bookings}</div>
                    <div class="stat-label">จองทั้งหมด</div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon">🏢</div>
                    <div class="stat-value">${data.per_room.length > 0 ? data.per_room[0].room_name : '-'}</div>
                    <div class="stat-label">ห้องยอดนิยม</div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon">⏰</div>
                    <div class="stat-value">${data.popular_times.length > 0 ? data.popular_times[0].hour + ':00' : '-'}</div>
                    <div class="stat-label">เวลายอดนิยม</div>
                </div>
            </div>
            
            <div class="charts-grid">
                <div class="chart-card">
                    <h4>📊 การใช้งานแต่ละห้อง</h4>
                    <canvas id="barChart"></canvas>
                </div>
                <div class="chart-card">
                    <h4>🥧 สัดส่วนการใช้งาน</h4>
                    <canvas id="pieChart"></canvas>
                </div>
                <div class="chart-card" style="grid-column: span 2;">
                    <h4>📈 แนวโน้มการจอง (30 วันล่าสุด)</h4>
                    <canvas id="lineChart"></canvas>
                </div>
            </div>
        </div>
    `;

    // Destroy old chart instances
    Object.values(chartInstances).forEach(c => c.destroy());
    chartInstances = {};

    // Color palette
    const colors = ['#00B4D8', '#52B788', '#f4a261', '#e63946', '#48CAE4', '#74C69D', '#FFD700', '#C0C0C0', '#8ecae6', '#219ebc', '#023047', '#ffb703'];

    // Bar Chart
    if (data.per_room.length > 0) {
        chartInstances.bar = new Chart(document.getElementById('barChart'), {
            type: 'bar',
            data: {
                labels: data.per_room.map(r => r.room_name),
                datasets: [{
                    label: 'จำนวนการจอง',
                    data: data.per_room.map(r => r.count),
                    backgroundColor: colors.slice(0, data.per_room.length),
                    borderRadius: 8,
                    borderSkipped: false,
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { display: false },
                },
                scales: {
                    y: { beginAtZero: true, ticks: { stepSize: 1 } },
                    x: { ticks: { maxRotation: 45, minRotation: 45 } }
                }
            }
        });
    }

    // Pie Chart
    if (data.proportion.length > 0) {
        chartInstances.pie = new Chart(document.getElementById('pieChart'), {
            type: 'doughnut',
            data: {
                labels: data.proportion.map(r => r.room_name),
                datasets: [{
                    data: data.proportion.map(r => r.count),
                    backgroundColor: colors.slice(0, data.proportion.length),
                    borderWidth: 2,
                    borderColor: '#fff',
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { position: 'bottom', labels: { padding: 16, usePointStyle: true } }
                }
            }
        });
    }

    // Line Chart
    if (data.daily_trend.length > 0) {
        chartInstances.line = new Chart(document.getElementById('lineChart'), {
            type: 'line',
            data: {
                labels: data.daily_trend.map(d => d.booking_date),
                datasets: [{
                    label: 'จำนวนการจอง',
                    data: data.daily_trend.map(d => d.count),
                    borderColor: '#00B4D8',
                    backgroundColor: 'rgba(0,180,216,0.1)',
                    fill: true,
                    tension: 0.4,
                    pointRadius: 4,
                    pointBackgroundColor: '#00B4D8',
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    y: { beginAtZero: true, ticks: { stepSize: 1 } },
                    x: { ticks: { maxTicksLimit: 10 } }
                }
            }
        });
    }
}

function exportData(format) {
    const params = new URLSearchParams();
    params.set('format', format);

    const dateFrom = document.getElementById('blDateFrom')?.value;
    const dateTo = document.getElementById('blDateTo')?.value;
    if (dateFrom) params.set('date_from', dateFrom);
    if (dateTo) params.set('date_to', dateTo);

    window.open(`api/export.php?${params.toString()}`, '_blank');
}

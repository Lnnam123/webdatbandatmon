document.addEventListener('DOMContentLoaded', async () => {
  const token = localStorage.getItem('adminToken');
  if (!token) {
    window.location.href = '/login.html';
    return;
  }

  // Xác thực token với máy chủ
  try {
    const res = await fetch('/api/auth/check', {
      headers: { 'Authorization': 'Bearer ' + token }
    });
    if (!res.ok) {
      throw new Error('Token expired or invalid');
    }
  } catch (err) {
    // Nếu lỗi hoặc server báo 401 (do khởi động lại đổi SECRET_KEY)
    logout();
    return;
  }

  setupTabs();
  loadMenuData();
  loadTablesData();
  loadOverviewData();
});

function formatPrice(num) {
  return new Intl.NumberFormat('vi-VN').format(num);
}

function setupTabs() {
  const navItems = document.querySelectorAll('.kv-nav-item');
  const tabPanes = document.querySelectorAll('.tab-pane');

  navItems.forEach(item => {
    item.addEventListener('click', () => {
      // Remove active class
      navItems.forEach(nav => nav.classList.remove('active'));
      tabPanes.forEach(pane => pane.classList.remove('active'));

      // Add active class to clicked tab
      item.classList.add('active');
      const targetId = item.getAttribute('data-target');
      document.getElementById(targetId).classList.add('active');
    });
  });
}

let menuData = [];

async function loadMenuData() {
  const tbody = document.getElementById('menu-table-body');
  try {
    const res = await fetch('/api/admin/menu');
    menuData = await res.json();
    renderMenuTable(menuData);
  } catch (err) {
    console.error(err);
    tbody.innerHTML = `<tr><td colspan="9" style="text-align:center;color:red;">Lỗi tải dữ liệu</td></tr>`;
  }
}

function renderMenuTable(data) {
  const tbody = document.getElementById('menu-table-body');
  tbody.innerHTML = '';

  if (data.length === 0) {
    tbody.innerHTML = `<tr><td colspan="9" style="text-align:center;">Không có dữ liệu</td></tr>`;
    return;
  }

  data.forEach((item, index) => {
    // Generate a mock code based on ID
    const code = 'SP' + String(item.id).padStart(6, '0');
    // Map category
    let categoryName = 'Khác';
    if (item.category === 'appetizer' || item.category === 'main') categoryName = 'Đồ ăn';
    if (item.category === 'drink') categoryName = 'Đồ uống';
    if (item.category === 'dessert') categoryName = 'Tráng miệng';

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><input type="checkbox"></td>
      <td style="color:#fadb14;">☆</td>
      <td>
        <img src="${item.image_url ? (item.image_url.startsWith('http') ? item.image_url : '/assets/' + item.image_url) : 'https://via.placeholder.com/32'}" class="item-img-small" />
      </td>
      <td>${code}</td>
      <td style="font-weight:500;">${item.name}</td>
      <td>${categoryName}</td>
      <td>${categoryName}</td>
      <td>3%</td>
      <td style="text-align:right; font-weight:600;">${formatPrice(item.price)}</td>
    `;
    tbody.appendChild(tr);
  });
}

// Search functionality
document.getElementById('menu-search-input').addEventListener('input', (e) => {
  const val = e.target.value.toLowerCase();
  const filtered = menuData.filter(item => item.name.toLowerCase().includes(val));
  renderMenuTable(filtered);
});

async function loadTablesData() {
  const tbody = document.getElementById('tables-table-body');
  try {
    const res = await fetch('/api/cashier/tables');
    const data = await res.json();

    tbody.innerHTML = '';
    data.forEach(table => {
      const tr = document.createElement('tr');

      let statusText = 'Trống';
      if (table.status === 'serving') statusText = '<span style="color:#0052cc;">Đang phục vụ</span>';
      if (table.status === 'pending_payment') statusText = '<span style="color:#ff4d4f;">Chờ thanh toán</span>';

      tr.innerHTML = `
        <td>Bàn ${table.id}</td>
        <td>${table.table_number}</td>
        <td>${statusText}</td>
        <td>${table.activeOrder ? formatPrice(table.activeOrder.total_amount) : '-'}</td>
      `;
      tbody.appendChild(tr);
    });
  } catch (err) {
    console.error(err);
    tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;color:red;">Lỗi tải dữ liệu</td></tr>`;
  }
}

async function loadOverviewData() {
  try {
    const res = await fetch('/api/admin/overview');
    const data = await res.json();

    document.getElementById('overview-revenue').textContent = formatPrice(data.revenueToday);
    document.getElementById('overview-orders').textContent = data.ordersToday;
    document.getElementById('overview-occupancy').textContent = data.occupancyRate + '%';
    document.getElementById('overview-occupancy-desc').textContent = `${data.activeTables}/${data.totalTables} bàn đang sử dụng`;
  } catch (err) {
    console.error('Failed to load overview data', err);
  }
}

function logout() {
  localStorage.removeItem('adminToken');
  window.location.href = '/login.html';
}

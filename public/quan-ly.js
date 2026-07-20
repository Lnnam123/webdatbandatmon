document.addEventListener('DOMContentLoaded', async () => {
  const token = sessionStorage.getItem('adminToken');
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
  await loadCategories();
  loadMenuData();
  loadTablesData();
  loadOverviewData();
  loadEmployeesData();
  loadRestaurantSettings();

  // Tìm kiếm và lọc thực đơn
  const searchInput = document.getElementById('menu-search-input');
  const filterSelect = document.getElementById('filter-category');
  if (searchInput) {
    searchInput.addEventListener('input', filterMenuData);
  }
  if (filterSelect) {
    filterSelect.addEventListener('change', filterMenuData);
  }

  // Setup Drag & Drop Upload
  const dropZone = document.getElementById('upload-drop-zone');
  const fileInput = document.getElementById('new-anh-minh-hoa');
  const btnBrowse = document.getElementById('btn-browse-file');

  if (dropZone && fileInput && btnBrowse) {
    btnBrowse.addEventListener('click', (e) => {
      e.stopPropagation();
      fileInput.click();
    });
    dropZone.addEventListener('click', () => {
      fileInput.click();
    });
    dropZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropZone.classList.add('dragover');
    });
    dropZone.addEventListener('dragleave', (e) => {
      e.preventDefault();
      dropZone.classList.remove('dragover');
    });
    dropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropZone.classList.remove('dragover');
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        fileInput.files = e.dataTransfer.files;
        const event = new Event('change', { bubbles: true });
        fileInput.dispatchEvent(event);
      }
    });
  }
});

// Custom Confirm Modal Logic
let confirmActionCallback = null;

function showConfirmModal(message) {
  return new Promise((resolve) => {
    document.getElementById('confirm-modal-message').textContent = message;
    document.getElementById('confirm-modal').style.display = 'flex';
    confirmActionCallback = resolve;
  });
}

function closeConfirmModal() {
  document.getElementById('confirm-modal').style.display = 'none';
  if (confirmActionCallback) {
    confirmActionCallback(false);
    confirmActionCallback = null;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const btn = document.getElementById('confirm-modal-btn');
  if (btn) {
    btn.addEventListener('click', () => {
      document.getElementById('confirm-modal').style.display = 'none';
      if (confirmActionCallback) {
        confirmActionCallback(true);
        confirmActionCallback = null;
      }
    });
  }
});

function formatPrice(num) {
  return new Intl.NumberFormat('vi-VN').format(num) + ' đ';
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
let categoriesData = [];

async function loadCategories() {
  try {
    const res = await fetch('/api/categories');
    categoriesData = await res.json();
    const select = document.getElementById('new-loai-mon');
    if (select) {
      select.innerHTML = '';
      categoriesData.forEach(cat => {
        const opt = document.createElement('option');
        opt.value = cat.ma_danh_muc;
        opt.textContent = cat.ten_danh_muc;
        select.appendChild(opt);
      });
    }

    const filterSelect = document.getElementById('filter-category');
    if (filterSelect) {
      filterSelect.innerHTML = '<option value="all">Tất cả nhóm món</option>';
      categoriesData.forEach(cat => {
        const opt = document.createElement('option');
        opt.value = cat.ma_danh_muc;
        opt.textContent = cat.ten_danh_muc;
        filterSelect.appendChild(opt);
      });
    }
  } catch (err) {
    console.error('Lỗi tải danh mục', err);
  }
}

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
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;">Không có dữ liệu</td></tr>`;
    return;
  }

  data.forEach((item, index) => {
    // Generate a mock code based on ID
    const code = 'SP' + String(item.id).padStart(6, '0');
    // Map category
    let categoryName = 'Khác';
    const cat = categoriesData.find(c => c.ma_danh_muc === item.category);
    if (cat) categoryName = cat.ten_danh_muc;

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><input type="checkbox" class="row-checkbox" value="${item.id}" onchange="toggleDeleteButton()"></td>
      <td>
        <img src="${item.image_url ? (item.image_url.startsWith('http') || item.image_url.startsWith('/uploads') ? item.image_url : '/assets/' + item.image_url) : 'https://via.placeholder.com/32'}" class="item-img-small" />
      </td>
      <td>${code}</td>
      <td style="font-weight:500;">${item.name}</td>
      <td>${categoryName}</td>
      <td>3%</td>
      <td style="text-align:right; font-weight:600;">${formatPrice(item.price)}</td>
      <td style="text-align:center;">
        <svg onclick="editMenu(${item.id})" style="cursor:pointer; color:var(--text-secondary); margin-right:8px;" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
        <svg onclick="deleteMenu(${item.id})" style="cursor:pointer; color:var(--danger);" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function filterMenuData() {
  const term = (document.getElementById('menu-search-input')?.value || '').toLowerCase().trim();
  const catFilter = document.getElementById('filter-category')?.value || 'all';

  const filtered = menuData.filter(item => {
    const code = 'SP' + String(item.id).padStart(6, '0');
    const matchName = item.name.toLowerCase().includes(term);
    const matchCode = code.toLowerCase().includes(term);
    const matchCat = catFilter === 'all' || item.category === catFilter;
    return (matchName || matchCode) && matchCat;
  });
  renderMenuTable(filtered);
}

function toggleDeleteButton() {
  const anyChecked = document.querySelectorAll('.row-checkbox:checked').length > 0;
  document.getElementById('btn-delete-selected').style.display = anyChecked ? 'inline-block' : 'none';
}

document.addEventListener('DOMContentLoaded', () => {
  const selectAll = document.getElementById('selectAll-checkbox');
  if (selectAll) {
    selectAll.addEventListener('change', (e) => {
      const checkboxes = document.querySelectorAll('.row-checkbox');
      checkboxes.forEach(cb => cb.checked = e.target.checked);
      toggleDeleteButton();
    });
  }
});

function openAddMenuModal() {
  document.getElementById('edit-menu-id').value = '';
  document.getElementById('menu-modal-title').textContent = 'Thêm món mới';
  document.getElementById('new-ten-mon').value = '';
  document.getElementById('new-gia-tien').value = '';
  document.getElementById('new-anh-minh-hoa').value = '';

  document.getElementById('preview-anh-minh-hoa').src = '';
  document.getElementById('preview-anh-minh-hoa').style.display = 'none';
  document.getElementById('upload-icon-svg').style.display = 'block';
  document.getElementById('upload-title-text').style.display = 'block';

  document.getElementById('preview-anh-minh-hoa').dataset.oldImage = '';
  if (categoriesData.length > 0) document.getElementById('new-loai-mon').value = categoriesData[0].ma_danh_muc;
  document.getElementById('add-menu-modal').style.display = 'flex';
}

function editMenu(id) {
  const item = menuData.find(i => i.id === id);
  if (!item) return;
  document.getElementById('edit-menu-id').value = item.id;
  document.getElementById('menu-modal-title').textContent = 'Sửa món: ' + item.name;
  document.getElementById('new-ten-mon').value = item.name;
  document.getElementById('new-loai-mon').value = item.category;
  document.getElementById('new-gia-tien').value = item.price;
  document.getElementById('new-anh-minh-hoa').value = '';

  const imgUrl = item.image_url ? (item.image_url.startsWith('http') || item.image_url.startsWith('/uploads') ? item.image_url : '/assets/' + item.image_url) : '';

  if (imgUrl) {
    document.getElementById('preview-anh-minh-hoa').src = imgUrl;
    document.getElementById('preview-anh-minh-hoa').style.display = 'block';
    document.getElementById('upload-icon-svg').style.display = 'none';
    document.getElementById('upload-title-text').style.display = 'none';
  } else {
    document.getElementById('preview-anh-minh-hoa').src = '';
    document.getElementById('preview-anh-minh-hoa').style.display = 'none';
    document.getElementById('upload-icon-svg').style.display = 'block';
    document.getElementById('upload-title-text').style.display = 'block';
  }

  document.getElementById('preview-anh-minh-hoa').dataset.oldImage = item.image_url || '';

  document.getElementById('add-menu-modal').style.display = 'flex';
}

function previewImage(event) {
  const file = event.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = function (e) {
      document.getElementById('preview-anh-minh-hoa').src = e.target.result;
      document.getElementById('preview-anh-minh-hoa').style.display = 'block';
      document.getElementById('upload-icon-svg').style.display = 'none';
      document.getElementById('upload-title-text').style.display = 'none';
    }
    reader.readAsDataURL(file);
  }
}

function showToast(msg) {
  const toast = document.getElementById('toast-notification');
  if (toast) {
    document.getElementById('toast-message').textContent = msg;
    toast.style.display = 'block';
    setTimeout(() => toast.style.display = 'none', 3000);
  } else {
    alert(msg);
  }
}

async function submitAddMenu() {
  const id = document.getElementById('edit-menu-id').value;
  const ten_mon = document.getElementById('new-ten-mon').value.trim();
  const loai_mon = document.getElementById('new-loai-mon').value;
  const gia_tien = document.getElementById('new-gia-tien').value;
  const fileInput = document.getElementById('new-anh-minh-hoa');
  const oldImage = document.getElementById('preview-anh-minh-hoa').dataset.oldImage;

  if (!ten_mon || !gia_tien) {
    alert('Vui lòng nhập đầy đủ Tên và Giá!');
    return;
  }

  const token = sessionStorage.getItem('adminToken');
  let anh_minh_hoa = oldImage || null;

  try {
    // 1. Upload ảnh nếu có chọn file
    if (fileInput.files.length > 0) {
      const formData = new FormData();
      formData.append('image', fileInput.files[0]);

      const uploadRes = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + token },
        body: formData
      });

      const uploadData = await uploadRes.json();
      if (uploadRes.ok) {
        anh_minh_hoa = uploadData.url;
      } else {
        alert('Lỗi khi tải ảnh lên: ' + uploadData.error);
        return;
      }
    }

    // 2. Gửi dữ liệu món ăn
    const url = id ? '/api/menu/' + id : '/api/menu';
    const method = id ? 'PUT' : 'POST';

    const res = await fetch(url, {
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + token
      },
      body: JSON.stringify({
        ten_mon,
        loai_mon,
        gia_tien: parseFloat(gia_tien),
        anh_minh_hoa
      })
    });

    const data = await res.json();
    if (res.ok) {
      document.getElementById('add-menu-modal').style.display = 'none';
      showToast(id ? 'Đã sửa món thành công!' : 'Đã thêm món mới thành công!');
      loadMenuData();
    } else {
      alert(data.error || 'Lỗi thao tác');
    }
  } catch (err) {
    console.error(err);
    alert('Lỗi kết nối máy chủ');
  }
}

function openAddCategoryModal() {
  document.getElementById('new-cat-ma').value = '';
  document.getElementById('new-cat-ten').value = '';
  document.getElementById('add-category-modal').style.display = 'flex';
}

async function submitAddCategory() {
  const ma_danh_muc = document.getElementById('new-cat-ma').value.trim();
  const ten_danh_muc = document.getElementById('new-cat-ten').value.trim();

  if (!ma_danh_muc || !ten_danh_muc) {
    alert('Vui lòng nhập đủ thông tin!');
    return;
  }

  const token = sessionStorage.getItem('adminToken');
  try {
    const res = await fetch('/api/categories', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + token
      },
      body: JSON.stringify({ ma_danh_muc, ten_danh_muc })
    });

    const data = await res.json();
    if (res.ok) {
      document.getElementById('add-category-modal').style.display = 'none';
      showToast('Thêm nhóm món thành công!');
      await loadCategories();
      loadMenuData();
    } else {
      alert(data.error || 'Lỗi thêm nhóm');
    }
  } catch (err) {
    console.error(err);
    alert('Lỗi kết nối máy chủ');
  }
}

function openDeleteCategoryModal() {
  const select = document.getElementById('delete-loai-mon');
  select.innerHTML = '';
  categoriesData.forEach(cat => {
    const opt = document.createElement('option');
    opt.value = cat.ma_danh_muc;
    opt.textContent = cat.ten_danh_muc;
    select.appendChild(opt);
  });
  document.getElementById('delete-category-modal').style.display = 'flex';
}

async function submitDeleteCategory() {
  const ma_danh_muc = document.getElementById('delete-loai-mon').value;
  if (!ma_danh_muc) return;

  const confirmed = await showConfirmModal('Bạn có chắc chắn muốn xoá nhóm món này? Các món ăn trong nhóm này sẽ bị mất phân loại.');
  if (!confirmed) return;

  const token = sessionStorage.getItem('adminToken');
  try {
    const res = await fetch('/api/categories/' + ma_danh_muc, {
      method: 'DELETE',
      headers: { 'Authorization': 'Bearer ' + token }
    });

    if (res.ok) {
      document.getElementById('delete-category-modal').style.display = 'none';
      showToast('Xoá nhóm món thành công!');
      await loadCategories();
      loadMenuData();
    } else {
      const data = await res.json();
      alert(data.error || 'Lỗi xoá nhóm');
    }
  } catch (err) {
    console.error(err);
    alert('Lỗi kết nối máy chủ');
  }
}

async function deleteMenu(id) {
  const confirmed = await showConfirmModal('Bạn có chắc chắn muốn xoá món ăn này? Hành động này không thể hoàn tác.');
  if (!confirmed) return;

  const token = sessionStorage.getItem('adminToken');
  try {
    const res = await fetch('/api/menu', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + token
      },
      body: JSON.stringify({ ids: [id] })
    });
    if (res.ok) {
      showToast('Đã xoá món ăn');
      loadMenuData();
    } else {
      alert('Lỗi khi xoá món');
    }
  } catch (err) {
    console.error(err);
    alert('Lỗi máy chủ');
  }
}

async function deleteSelectedMenu() {
  const checkboxes = document.querySelectorAll('.row-checkbox:checked');
  if (checkboxes.length === 0) return;

  const confirmed = await showConfirmModal(`Bạn có chắc chắn muốn xoá ${checkboxes.length} món ăn đã chọn?`);
  if (!confirmed) return;

  const ids = Array.from(checkboxes).map(cb => parseInt(cb.value));
  const token = sessionStorage.getItem('adminToken');
  try {
    const res = await fetch('/api/menu', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + token
      },
      body: JSON.stringify({ ids })
    });
    if (res.ok) {
      showToast(`Đã xoá ${ids.length} món ăn`);
      const selectAll = document.getElementById('selectAll-checkbox');
      if (selectAll) selectAll.checked = false;
      document.getElementById('btn-delete-selected').style.display = 'none';
      loadMenuData();
    } else {
      alert('Lỗi khi xoá món');
    }
  } catch (err) {
    console.error(err);
    alert('Lỗi máy chủ');
  }
}

// Search functionality
document.getElementById('menu-search-input').addEventListener('input', (e) => {
  const val = e.target.value.toLowerCase();
  const filtered = menuData.filter(item => item.name.toLowerCase().includes(val));
  renderMenuTable(filtered);
});

let currentTablesData = [];

async function loadTablesData() {
  const tbody = document.getElementById('tables-table-body');
  try {
    const res = await fetch('/api/cashier/tables');
    const data = await res.json();
    currentTablesData = data;

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
        <td style="text-align:center;">
          <svg onclick="openTableModal(${table.id})" style="cursor:pointer; color:var(--text-secondary); margin-right:8px;" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
          <svg onclick="deleteTable(${table.id})" style="cursor:pointer; color:var(--danger);" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
        </td>
      `;
      tbody.appendChild(tr);
    });
  } catch (err) {
    console.error(err);
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;color:red;">Lỗi tải dữ liệu</td></tr>`;
  }
}

// --- TABLE MANAGEMENT ---
function openTableModal(id = null) {
  document.getElementById('edit-table-id').value = id || '';
  const title = document.getElementById('table-modal-title');
  const nameInput = document.getElementById('table-name');
  const qrInput = document.getElementById('table-qr');
  
  if (id) {
    const table = currentTablesData.find(t => t.id === id);
    if (!table) return;
    title.textContent = 'Sửa bàn';
    nameInput.value = table.table_number;
    qrInput.value = table.qr_token;
  } else {
    title.textContent = 'Thêm bàn mới';
    nameInput.value = '';
    qrInput.value = '';
  }
  
  document.getElementById('table-modal').style.display = 'flex';
}

async function submitTable() {
  const id = document.getElementById('edit-table-id').value;
  const table_number = document.getElementById('table-name').value.trim();
  const qr_token = document.getElementById('table-qr').value.trim();
  
  if (!table_number || !qr_token) return alert('Vui lòng nhập tên bàn và mã QR');
  
  const token = sessionStorage.getItem('adminToken');
  const method = id ? 'PUT' : 'POST';
  const url = id ? '/api/admin/tables/' + id : '/api/admin/tables';
  
  try {
    const res = await fetch(url, {
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + token
      },
      body: JSON.stringify({ table_number, qr_token })
    });
    
    if (res.ok) {
      document.getElementById('table-modal').style.display = 'none';
      showToast(id ? 'Cập nhật bàn thành công!' : 'Thêm bàn thành công!');
      loadTablesData();
    } else {
      let errorMsg = 'Lỗi lưu bàn';
      const contentType = res.headers.get("content-type");
      if (contentType && contentType.indexOf("application/json") !== -1) {
        const data = await res.json();
        errorMsg = data.error || errorMsg;
      } else {
        errorMsg = `Lỗi ${res.status}: API chưa được cập nhật. Bạn đã khởi động lại Server chưa?`;
      }
      alert(errorMsg);
    }
  } catch (err) {
    console.error(err);
    alert('Lỗi kết nối máy chủ');
  }
}

async function deleteTable(id) {
  const table = currentTablesData.find(t => t.id === id);
  if (!table) return;
  if (table.status !== 'available') {
    alert('Không thể xoá bàn đang được sử dụng hoặc chờ thanh toán!');
    return;
  }

  const confirmed = await showConfirmModal('Bạn có chắc chắn muốn xoá bàn này?');
  if (!confirmed) return;
  
  const token = sessionStorage.getItem('adminToken');
  try {
    const res = await fetch('/api/admin/tables/' + id, {
      method: 'DELETE',
      headers: { 'Authorization': 'Bearer ' + token }
    });
    
    if (res.ok) {
      showToast('Đã xoá bàn');
      loadTablesData();
    } else {
      let errorMsg = 'Không thể xoá bàn này';
      const contentType = res.headers.get("content-type");
      if (contentType && contentType.indexOf("application/json") !== -1) {
        const data = await res.json();
        errorMsg = data.error || errorMsg;
      } else {
        errorMsg = `Lỗi ${res.status}: API chưa được cập nhật. Bạn đã khởi động lại Server chưa?`;
      }
      alert(errorMsg);
    }
  } catch (err) {
    console.error(err);
    alert('Lỗi kết nối máy chủ');
  }
}

let revenueChartInstance = null;
let customersChartInstance = null;

async function loadOverviewData() {
  try {
    const res = await fetch('/api/admin/overview');
    const data = await res.json();

    document.getElementById('overview-revenue').textContent = formatPrice(data.revenueToday);
    document.getElementById('overview-orders').textContent = data.ordersToday;
    document.getElementById('overview-occupancy').textContent = data.occupancyRate + '%';
    document.getElementById('overview-occupancy-desc').textContent = `${data.activeTables}/${data.totalTables} bàn đang sử dụng`;
    
    // Cập nhật text phụ nếu có doanh thu
    if (data.revenueToday > 0) {
      document.querySelector('#overview-revenue').nextElementSibling.textContent = 'Hoạt động kinh doanh tốt';
    }
    if (data.ordersToday > 0) {
      document.querySelector('#overview-orders').nextElementSibling.textContent = 'Đang có khách';
    }

    // Vẽ biểu đồ Chart.js (Dữ liệu mô phỏng 7 ngày qua)
    renderCharts();
  } catch (err) {
    console.error('Failed to load overview data', err);
  }
}

function renderCharts() {
  // Dữ liệu mô phỏng
  const labels = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
  const revenueData = [1500000, 2300000, 1800000, 2900000, 3500000, 4200000, 3800000];
  const customersData = [15, 22, 18, 30, 45, 52, 40];

  // 1. Biểu đồ Doanh thu (Cột)
  const ctxRev = document.getElementById('revenueChart');
  if (ctxRev) {
    if (revenueChartInstance) revenueChartInstance.destroy();
    revenueChartInstance = new Chart(ctxRev, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{
          label: 'Doanh thu (VNĐ)',
          data: revenueData,
          backgroundColor: '#E85A23',
          borderRadius: 4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false }
        },
        scales: {
          y: { beginAtZero: true, grid: { borderDash: [4, 4] } },
          x: { grid: { display: false } }
        }
      }
    });
  }

  // 2. Biểu đồ Lượng khách hàng (Đường)
  const ctxCus = document.getElementById('customersChart');
  if (ctxCus) {
    if (customersChartInstance) customersChartInstance.destroy();
    customersChartInstance = new Chart(ctxCus, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [{
          label: 'Lượng khách',
          data: customersData,
          borderColor: '#4caf50',
          backgroundColor: 'rgba(76, 175, 80, 0.1)',
          borderWidth: 3,
          tension: 0.4, // làm cong đường kẻ
          fill: true
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false }
        },
        scales: {
          y: { beginAtZero: true, grid: { borderDash: [4, 4] } },
          x: { grid: { display: false } }
        }
      }
    });
  }
}

function logout() {
  sessionStorage.removeItem('adminToken');
  window.location.href = '/login.html';
}

// --- EMPLOYEE MANAGEMENT ---
let employeesData = [];

async function loadEmployeesData() {
  const token = sessionStorage.getItem('adminToken');
  try {
    const res = await fetch('/api/admin/employees', {
      headers: { 'Authorization': 'Bearer ' + token }
    });
    if (res.ok) {
      employeesData = await res.json();
      renderEmployeeTable();
    }
  } catch (err) {
    console.error('Lỗi tải danh sách nhân viên', err);
  }
}

function renderEmployeeTable() {
  const tbody = document.getElementById('employees-table-body');
  if (!tbody) return;
  tbody.innerHTML = '';
  
  if (employeesData.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;">Không có dữ liệu</td></tr>`;
    return;
  }
  
  employeesData.forEach(emp => {
    let roleText = 'Quản lý';
    if (emp.role === 'cashier') roleText = 'Thu ngân';
    if (emp.role === 'chef') roleText = 'Đầu bếp';
    
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>NV${String(emp.id).padStart(4, '0')}</td>
      <td>${emp.fullname || 'Chưa cập nhật'}</td>
      <td style="font-weight:600;">${emp.username}</td>
      <td>${roleText}</td>
      <td style="text-align:center;">
        <svg onclick="openEmployeeModal(${emp.id})" style="cursor:pointer; color:var(--text-secondary); margin-right:8px;" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
        <svg onclick="deleteEmployee(${emp.id})" style="cursor:pointer; color:var(--danger);" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function openEmployeeModal(id = null) {
  document.getElementById('edit-employee-id').value = id || '';
  const title = document.getElementById('employee-modal-title');
  const fullnameInput = document.getElementById('employee-fullname');
  const userInput = document.getElementById('employee-username');
  const passInput = document.getElementById('employee-password');
  const roleSelect = document.getElementById('employee-role');
  const pwHint = document.getElementById('employee-pw-hint');
  
  if (id) {
    const emp = employeesData.find(e => e.id === id);
    if (!emp) return;
    title.textContent = 'Sửa nhân viên';
    fullnameInput.value = emp.fullname || '';
    userInput.value = emp.username;
    userInput.disabled = true; // Không cho đổi username
    passInput.value = '';
    roleSelect.value = emp.role;
    pwHint.textContent = '(Bỏ trống nếu không muốn đổi)';
  } else {
    title.textContent = 'Thêm nhân viên mới';
    fullnameInput.value = '';
    userInput.value = '';
    userInput.disabled = false;
    passInput.value = '';
    roleSelect.value = 'cashier';
    pwHint.textContent = '';
  }
  
  document.getElementById('employee-modal').style.display = 'flex';
}

async function submitEmployee() {
  const id = document.getElementById('edit-employee-id').value;
  const fullname = document.getElementById('employee-fullname').value.trim();
  const username = document.getElementById('employee-username').value.trim();
  const password = document.getElementById('employee-password').value;
  const role = document.getElementById('employee-role').value;
  
  if (!username) return alert('Vui lòng nhập tên đăng nhập');
  if (!id && !password) return alert('Vui lòng nhập mật khẩu cho nhân viên mới');
  
  const token = sessionStorage.getItem('adminToken');
  const method = id ? 'PUT' : 'POST';
  const url = id ? '/api/admin/employees/' + id : '/api/admin/employees';
  
  try {
    const res = await fetch(url, {
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + token
      },
      body: JSON.stringify({ username, password, role, fullname })
    });
    
    if (res.ok) {
      document.getElementById('employee-modal').style.display = 'none';
      showToast(id ? 'Cập nhật nhân viên thành công!' : 'Thêm nhân viên thành công!');
      loadEmployeesData();
    } else {
      const data = await res.json();
      alert(data.error || 'Lỗi lưu nhân viên');
    }
  } catch (err) {
    console.error(err);
    alert('Lỗi kết nối máy chủ');
  }
}

async function deleteEmployee(id) {
  const confirmed = await showConfirmModal('Bạn có chắc chắn muốn xoá nhân viên này?');
  if (!confirmed) return;
  
  const token = sessionStorage.getItem('adminToken');
  try {
    const res = await fetch('/api/admin/employees/' + id, {
      method: 'DELETE',
      headers: { 'Authorization': 'Bearer ' + token }
    });
    
    if (res.ok) {
      showToast('Đã xoá nhân viên');
      loadEmployeesData();
    } else {
      const data = await res.json();
      alert(data.error || 'Không thể xoá nhân viên này');
    }
  } catch (err) {
    console.error(err);
    alert('Lỗi kết nối máy chủ');
  }
}

// --- RESTAURANT SETTINGS ---
async function loadRestaurantSettings() {
  try {
    const res = await fetch('/api/restaurant/info');
    if (res.ok) {
      const data = await res.json();
      document.getElementById('setting-res-name').value = data.ten_nha_hang || '';
      document.getElementById('setting-res-address').value = data.dia_chi || '';
      document.getElementById('setting-res-phone').value = data.so_dien_thoai || '';
    }
  } catch (err) { console.error('Lỗi tải cài đặt nhà hàng', err); }
}

async function submitRestaurantSettings() {
  const ten_nha_hang = document.getElementById('setting-res-name').value.trim();
  const dia_chi = document.getElementById('setting-res-address').value.trim();
  const so_dien_thoai = document.getElementById('setting-res-phone').value.trim();
  
  if (!ten_nha_hang || !dia_chi || !so_dien_thoai) return alert('Vui lòng nhập đủ thông tin');
  
  const token = sessionStorage.getItem('adminToken');
  try {
    const res = await fetch('/api/admin/restaurant/info', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + token
      },
      body: JSON.stringify({ ten_nha_hang, dia_chi, so_dien_thoai })
    });
    
    if (res.ok) {
      showToast('Đã cập nhật thông tin nhà hàng!');
    } else {
      const data = await res.json();
      alert(data.error || 'Lỗi cập nhật');
    }
  } catch (err) {
    console.error(err);
    alert('Lỗi kết nối máy chủ');
  }
}

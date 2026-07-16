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
  await loadCategories();
  loadMenuData();
  loadTablesData();
  loadOverviewData();

  // Tìm kiếm thực đơn
  const searchInput = document.getElementById('menu-search-input');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      const term = e.target.value.toLowerCase().trim();
      const filtered = menuData.filter(item => {
        const code = 'SP' + String(item.id).padStart(6, '0');
        const matchName = item.name.toLowerCase().includes(term);
        const matchCode = code.toLowerCase().includes(term);
        return matchName || matchCode;
      });
      renderMenuTable(filtered);
    });
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
    if(cat) categoryName = cat.ten_danh_muc;

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

function toggleDeleteButton() {
  const anyChecked = document.querySelectorAll('.row-checkbox:checked').length > 0;
  document.getElementById('btn-delete-selected').style.display = anyChecked ? 'inline-block' : 'none';
}

document.addEventListener('DOMContentLoaded', () => {
  const selectAll = document.getElementById('selectAll-checkbox');
  if(selectAll) {
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
    reader.onload = function(e) {
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
  if(toast) {
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

  const token = localStorage.getItem('adminToken');
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

  const token = localStorage.getItem('adminToken');
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

  const token = localStorage.getItem('adminToken');
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
  
  const token = localStorage.getItem('adminToken');
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
  const token = localStorage.getItem('adminToken');
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

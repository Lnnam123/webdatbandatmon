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
    if (!res.ok) throw new Error('Token expired or invalid');
    const data = await res.json();
    const usernameEl = document.getElementById('manager-username');
    const fullnameEl = document.getElementById('dropdown-fullname');
    if (usernameEl) usernameEl.textContent = data.username || 'admin';
    if (fullnameEl) fullnameEl.textContent = data.fullname || 'Quản lý';
    
    // Cập nhật chữ cái đầu cho Avatar
    const avatarLetter = (data.username || 'a').charAt(0).toUpperCase();
    const avatarEl = document.querySelector('#user-menu-btn div');
    if (avatarEl) avatarEl.textContent = avatarLetter;
  } catch (err) {
    // Nếu lỗi hoặc server báo 401 (do khởi động lại đổi SECRET_KEY)
    logout();
    return;
  }

  setupTabs();
  await loadAreasData();
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
      <td>
        <div style="display:flex; align-items:center; gap:8px;">
          <button class="kv-btn-default" style="padding:2px 8px; font-weight:bold;" onclick="adjustStockLocally(${item.id}, -1)">-</button>
          <span>${item.so_luong !== undefined ? item.so_luong : 0}</span>
          <button class="kv-btn-default" style="padding:2px 8px; font-weight:bold;" onclick="adjustStockLocally(${item.id}, 1)">+</button>
        </div>
      </td>
      <td>${item.da_ban !== undefined ? item.da_ban : 0}</td>
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

function selectAllRows(checkbox) {
  const rowCheckboxes = document.querySelectorAll('.row-checkbox');
  rowCheckboxes.forEach(cb => {
    cb.checked = checkbox.checked;
  });
  toggleDeleteButton();
}

async function adjustStockLocally(id, diff) {
  const token = sessionStorage.getItem('adminToken');
  try {
    const res = await fetch('/api/menu/update-stock', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ id, diff })
    });
    if (res.ok) {
      const data = await res.json();
      if (data.success) {
        const item = menuData.find(i => i.id === id);
        if (item) {
          item.so_luong = data.so_luong;
          filterMenuData();
        }
      } else {
        alert(data.error || 'Lỗi cập nhật số lượng');
      }
    }
  } catch (err) {
    console.error('Lỗi khi cập nhật số lượng', err);
  }
}

function addSizeRow(tenSize = '', giaTien = '') {
  const container = document.getElementById('sizes-container');
  const row = document.createElement('div');
  row.style.display = 'flex';
  row.style.gap = '8px';
  row.className = 'size-row';
  row.innerHTML = `
    <input type="text" class="kv-input size-name" placeholder="Tuỳ chọn (Vd: Lớn, Nhỏ...)" style="flex:1;" value="${tenSize}">
    <input type="number" class="kv-input size-price" placeholder="Giá tiền" style="flex:1;" value="${giaTien}">
    <button type="button" class="kv-btn-outline" style="padding: 4px; color: var(--danger); border-color: var(--danger); display: flex; align-items: center; justify-content: center; width: 34px; height: 34px; border-radius: 50%;" onclick="this.parentElement.remove()" title="Xoá">
      <span class="material-icons" style="font-size: 18px;">delete_outline</span>
    </button>
  `;
  container.appendChild(row);
}

function openAddMenuModal() {
  document.getElementById('edit-menu-id').value = '';
  document.getElementById('menu-modal-title').textContent = 'Thêm món mới';
  document.getElementById('new-ten-mon').value = '';
  document.getElementById('new-gia-tien').value = '';
  document.getElementById('new-so-luong').value = '0';
  document.getElementById('new-da-ban').value = '0';
  document.getElementById('new-anh-minh-hoa').value = '';
  document.getElementById('new-mo-ta').value = '';
  document.getElementById('sizes-container').innerHTML = '';

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
  document.getElementById('new-so-luong').value = item.so_luong !== undefined ? item.so_luong : 0;
  document.getElementById('new-da-ban').value = item.da_ban !== undefined ? item.da_ban : 0;
  document.getElementById('new-anh-minh-hoa').value = '';
  document.getElementById('new-mo-ta').value = item.description || '';
  
  const sizesContainer = document.getElementById('sizes-container');
  sizesContainer.innerHTML = '';
  if (item.sizes && item.sizes.length > 0) {
    item.sizes.forEach(size => {
      addSizeRow(size.ten_size, size.gia_tien);
    });
  }

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
  const so_luong = document.getElementById('new-so-luong').value;
  const da_ban = document.getElementById('new-da-ban').value;
  const mo_ta = document.getElementById('new-mo-ta').value.trim();
  const fileInput = document.getElementById('new-anh-minh-hoa');
  const oldImage = document.getElementById('preview-anh-minh-hoa').dataset.oldImage;
  
  // Extract sizes
  const sizes = [];
  document.querySelectorAll('#sizes-container .size-row').forEach(row => {
    const tenSize = row.querySelector('.size-name').value.trim();
    const giaTienSize = parseFloat(row.querySelector('.size-price').value);
    if (tenSize && !isNaN(giaTienSize)) {
      sizes.push({ ten_size: tenSize, gia_tien: giaTienSize });
    }
  });

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
        so_luong: parseInt(so_luong) || 0,
        da_ban: parseInt(da_ban) || 0,
        anh_minh_hoa,
        mo_ta,
        sizes
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

function openManageCategoryModal() {
  renderManageCategoryList();
  document.getElementById('manage-category-modal').style.display = 'flex';
}

let draggedCategoryIndex = null;

function renderManageCategoryList() {
  const container = document.getElementById('manage-category-list');
  container.innerHTML = '';
  categoriesData.forEach((cat, index) => {
    const div = document.createElement('div');
    div.style.display = 'flex';
    div.style.justifyContent = 'space-between';
    div.style.alignItems = 'center';
    div.style.padding = '8px';
    div.style.borderBottom = '1px solid var(--border-color)';
    div.style.backgroundColor = 'var(--bg-card)';
    div.setAttribute('draggable', 'true');
    div.dataset.index = index;

    div.addEventListener('dragstart', (e) => {
      draggedCategoryIndex = index;
      e.dataTransfer.effectAllowed = 'move';
      div.style.opacity = '0.5';
    });
    
    div.addEventListener('dragend', () => {
      div.style.opacity = '1';
      document.querySelectorAll('#manage-category-list > div').forEach(el => {
        el.style.borderTop = '';
        el.style.borderBottom = '1px solid var(--border-color)';
      });
    });

    div.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      const bounding = div.getBoundingClientRect();
      const offset = bounding.y + (bounding.height / 2);
      if (e.clientY - offset > 0) {
        div.style.borderBottom = '2px solid var(--primary)';
        div.style.borderTop = '';
      } else {
        div.style.borderTop = '2px solid var(--primary)';
        div.style.borderBottom = '';
      }
    });
    
    div.addEventListener('dragleave', (e) => {
      div.style.borderTop = '';
      div.style.borderBottom = '1px solid var(--border-color)';
    });

    div.addEventListener('drop', async (e) => {
      e.preventDefault();
      const bounding = div.getBoundingClientRect();
      const offset = bounding.y + (bounding.height / 2);
      let targetIndex = index;
      if (e.clientY - offset > 0) {
        targetIndex = index + 1;
      }
      
      if (draggedCategoryIndex === targetIndex || draggedCategoryIndex === targetIndex - 1) {
        renderManageCategoryList();
        return;
      }
      
      const item = categoriesData.splice(draggedCategoryIndex, 1)[0];
      if (targetIndex > draggedCategoryIndex) {
        targetIndex--;
      }
      categoriesData.splice(targetIndex, 0, item);
      
      renderManageCategoryList();
      await saveCategoryOrder();
    });

    div.innerHTML = `
      <div style="display: flex; align-items: center; gap: 12px;">
        <span style="cursor: grab; color: #888; font-size: 16px; user-select: none;">☰</span>
        <div style="font-weight: 500;">${cat.ten_danh_muc}</div>
      </div>
      <div style="display: flex; gap: 8px;">
        <button class="kv-btn-default" style="padding:4px 8px; color:var(--danger); border-color:var(--danger); display:flex; align-items:center; justify-content:center;" onclick="deleteCategoryItem('${cat.ma_danh_muc}')">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
        </button>
      </div>
    `;
    container.appendChild(div);
  });
}

async function saveCategoryOrder() {
  const ids = categoriesData.map(c => c.id);
  const token = sessionStorage.getItem('adminToken');
  try {
    await fetch('/api/categories/reorder', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + token
      },
      body: JSON.stringify({ ids })
    });
    await loadCategories();
    loadMenuData();
  } catch(err) { console.error(err); }
}

async function deleteCategoryItem(ma_danh_muc) {
  const confirmed = await showConfirmModal('Bạn có chắc chắn muốn xoá nhóm món này? Các món ăn trong nhóm này sẽ bị mất phân loại.');
  if (!confirmed) return;

  const token = sessionStorage.getItem('adminToken');
  try {
    const res = await fetch('/api/categories/' + ma_danh_muc, {
      method: 'DELETE',
      headers: { 'Authorization': 'Bearer ' + token }
    });

    if (res.ok) {
      showToast('Xoá nhóm món thành công!');
      await loadCategories();
      renderManageCategoryList();
      loadMenuData();
    } else {
      alert('Lỗi khi xoá nhóm');
    }
  } catch (err) {
    console.error(err);
  }
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
let areasData = [];
let serverBaseUrl = '';
let currentQrToken = '';
let currentQrTableName = '';

async function loadAreasData() {
  try {
    const res = await fetch('/api/admin/areas');
    areasData = await res.json();
    renderAreaOptions();
    renderAreaTable();
  } catch (err) {
    console.error('Error loading areas', err);
  }
}

function renderAreaOptions() {
  const filterSelect = document.getElementById('filter-area');
  const tableSelect = document.getElementById('table-area');
  
  if (filterSelect) {
    const val = filterSelect.value;
    filterSelect.innerHTML = '<option value="all">Tất cả khu vực</option>';
    areasData.forEach(a => {
      filterSelect.innerHTML += `<option value="${a.id}">${a.ten_khu_vuc}</option>`;
    });
    filterSelect.value = val || 'all';
  }
  
  if (tableSelect) {
    const val = tableSelect.value;
    tableSelect.innerHTML = '<option value="">-- Không thuộc khu vực nào --</option>';
    areasData.forEach(a => {
      tableSelect.innerHTML += `<option value="${a.id}">${a.ten_khu_vuc}</option>`;
    });
    tableSelect.value = val || '';
  }
}

async function loadTablesData() {
  try {
    const res = await fetch('/api/cashier/tables');
    const data = await res.json();
    currentTablesData = data;
    renderTables();
  } catch (err) {
    console.error(err);
    document.getElementById('tables-table-body').innerHTML = `<tr><td colspan="5" style="text-align:center;color:red;">Lỗi tải dữ liệu</td></tr>`;
  }
}

function renderTables() {
  const tbody = document.getElementById('tables-table-body');
  const filterId = document.getElementById('filter-area') ? document.getElementById('filter-area').value : 'all';
  
  let filtered = currentTablesData;
  if (filterId !== 'all') {
    filtered = currentTablesData.filter(t => t.id_khu_vuc == filterId);
  }

  tbody.innerHTML = '';
  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:20px;">Không có bàn nào trong khu vực này</td></tr>`;
  }

  filtered.forEach(table => {
    const tr = document.createElement('tr');

    let statusText = 'Trống';
    if (table.status === 'serving') statusText = '<span style="color:#0052cc; font-weight:600;">Đang phục vụ</span>';
    if (table.status === 'pending_payment') statusText = '<span style="color:#ff4d4f; font-weight:600;">Chờ thanh toán</span>';

    // Xử lý hiển thị "Đơn hiện tại"
    let currentOrderHtml = '-';
    if (table.active_order) {
      currentOrderHtml = `
        <div style="display:flex; align-items:center; gap:8px;">
          <span style="font-weight:600;">${formatPrice(table.active_order.total_amount)}</span>
        </div>
      `;
    }

    tr.innerHTML = `
      <td style="font-weight:700;">${table.table_number}</td>
      <td>${table.area_name || '<span style="color:#aaa;">- Không phân khu -</span>'}</td>
      <td>${statusText}</td>
      <td>${currentOrderHtml}</td>
      <td style="text-align:center;">
        <svg onclick="openTableModal(${table.id})" style="cursor:pointer; color:var(--text-secondary); margin-right:8px;" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
        <svg onclick="deleteTable(${table.id})" style="cursor:pointer; color:var(--danger);" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
      </td>
    `;
    tbody.appendChild(tr);
  });

  renderQRSection(filtered);
}

// --- AREA MANAGEMENT ---
function openAreaModal() {
  document.getElementById('area-modal').style.display = 'flex';
  renderAreaTable();
}

function renderAreaTable() {
  const tbody = document.getElementById('areas-table-body');
  if (!tbody) return;
  tbody.innerHTML = '';
  if (areasData.length === 0) {
    tbody.innerHTML = `<tr><td colspan="2" style="text-align:center; padding:10px;">Chưa có khu vực nào</td></tr>`;
    return;
  }
  areasData.forEach(area => {
    tbody.innerHTML += `
      <tr>
        <td>${area.ten_khu_vuc}</td>
        <td style="text-align:right;">
          <svg onclick="deleteArea(${area.id})" style="cursor:pointer; color:var(--danger);" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
        </td>
      </tr>
    `;
  });
}

async function submitAddArea() {
  const nameInput = document.getElementById('new-area-name');
  const name = nameInput.value.trim();
  if (!name) return;

  const token = sessionStorage.getItem('adminToken');
  try {
    const res = await fetch('/api/admin/areas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
      body: JSON.stringify({ name })
    });
    if (res.ok) {
      nameInput.value = '';
      showToast('Thêm khu vực thành công');
      await loadAreasData();
      await loadTablesData();
    } else {
      alert('Lỗi thêm khu vực');
    }
  } catch (err) {
    console.error(err);
  }
}

async function deleteArea(id) {
  const confirmed = await showConfirmModal('Bạn có chắc chắn muốn xoá khu vực này? (Các bàn sẽ mất liên kết khu vực)');
  if (!confirmed) return;

  const token = sessionStorage.getItem('adminToken');
  try {
    const res = await fetch('/api/admin/areas/' + id, {
      method: 'DELETE',
      headers: { 'Authorization': 'Bearer ' + token }
    });
    if (res.ok) {
      showToast('Xoá khu vực thành công');
      await loadAreasData();
      await loadTablesData();
    } else {
      alert('Lỗi xoá khu vực');
    }
  } catch (err) {
    console.error(err);
  }
}

// --- QR CODE SECTION ---
async function renderQRSection(tables) {
  // Inject QR container into tab-tables if not yet present
  let tabTables = document.getElementById('tab-tables');
  if (!tabTables) return;

  // Create or reset QR section
  let qrSection = document.getElementById('qr-section-wrapper');
  if (!qrSection) {
    qrSection = document.createElement('div');
    qrSection.id = 'qr-section-wrapper';
    qrSection.className = 'kv-content';
    qrSection.style.cssText = 'margin-top:24px; padding:24px;';
    tabTables.appendChild(qrSection);
  }

  // Fetch server IP
  try {
    const ipRes = await fetch('/api/server/ip');
    const ipData = await ipRes.json();
    serverBaseUrl = `http://${ipData.ip}:${ipData.port}`;
    const ipDisplay = document.getElementById('server-ip-display');
    if (ipDisplay) ipDisplay.textContent = `${ipData.ip}:${ipData.port}`;
  } catch (e) {
    serverBaseUrl = window.location.origin;
  }

  qrSection.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:24px; flex-wrap:wrap; gap:16px;">
      <div>
        <div style="font-size:20px; font-weight:800; margin-bottom:6px; display:flex; align-items:center; gap:8px;">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color:var(--primary);"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
          Mã QR Đặt Món
        </div>
        <div style="font-size:14px; color:var(--text-secondary);">Khách hàng quét mã QR để vào thực đơn và đặt món trực tiếp từ điện thoại</div>
      </div>
      <div style="display:flex; align-items:center; gap:12px; flex-wrap:wrap;">
        <div style="background:var(--bg-main); border:1px solid var(--border-color); border-radius:50px; padding:8px 16px; font-size:13px; display:flex; align-items:center; gap:6px;">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color:var(--text-secondary)"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>
          <span id="server-ip-display" style="font-weight:700; color:var(--primary);">${serverBaseUrl.replace('http://', '')}</span>
        </div>
        <button class="kv-btn-primary" onclick="printAllQR()" style="display:flex; align-items:center; gap:8px;">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
          In tất cả
        </button>
      </div>
    </div>
    <div id="qr-grid" style="display:grid; grid-template-columns:repeat(auto-fill, minmax(220px, 1fr)); gap:24px;"></div>
  `;

  const grid = document.getElementById('qr-grid');
  for (const table of tables) {
    const url = `${serverBaseUrl}/dat-mon.html?qr_token=${table.qr_token}`;
    const card = document.createElement('div');
    card.style.cssText = 'background:var(--bg-card); border:1px solid var(--border-color); border-radius:16px; padding:24px 16px; text-align:center; box-shadow:var(--shadow-sm); transition:all 0.3s ease; display:flex; flex-direction:column; align-items:center;';
    card.onmouseover = () => { card.style.transform = 'translateY(-6px)'; card.style.boxShadow = 'var(--shadow-lg)'; card.style.borderColor = 'var(--primary)'; };
    card.onmouseout = () => { card.style.transform = 'none'; card.style.boxShadow = 'var(--shadow-sm)'; card.style.borderColor = 'var(--border-color)'; };
    
    const qrContainer = document.createElement('div');
    qrContainer.id = `qr-canvas-${table.id}`;
    qrContainer.style.cssText = 'display:flex; justify-content:center; align-items:center; background:#fff; padding:12px; border-radius:12px; border:1px solid #f1f5f9; margin-bottom:16px; box-shadow:0 2px 4px rgba(0,0,0,0.02);';
    
    const nameEl = document.createElement('div');
    nameEl.style.cssText = 'font-weight:800; font-size:16px; margin-bottom:6px; color:var(--text-primary);';
    nameEl.textContent = table.table_number;
    
    const urlEl = document.createElement('div');
    urlEl.style.cssText = 'font-size:11px; color:var(--text-secondary); word-break:break-all; margin-bottom:16px; background:var(--bg-main); padding:6px 10px; border-radius:8px; width:100%; border:1px dashed var(--border-color);';
    urlEl.textContent = url;
    
    const viewBtn = document.createElement('button');
    viewBtn.className = 'kv-btn-outline';
    viewBtn.style.cssText = 'width:100%; font-size:13px; padding:8px; display:flex; align-items:center; justify-content:center; gap:6px; border-radius:8px;';
    viewBtn.innerHTML = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line><line x1="11" y1="8" x2="11" y2="14"></line><line x1="8" y1="11" x2="14" y2="11"></line></svg> Phóng to';
    viewBtn.onclick = () => openQrModal(table.qr_token, table.table_number, url);
    
    card.appendChild(qrContainer);
    card.appendChild(nameEl);
    card.appendChild(urlEl);
    card.appendChild(viewBtn);
    grid.appendChild(card);
    
    // Generate QR
    if (typeof QRCode !== 'undefined') {
      new QRCode(qrContainer, {
        text: url,
        width: 160,
        height: 160,
        colorDark : "#111111",
        colorLight : "#ffffff",
        correctLevel : QRCode.CorrectLevel.L
      });
    }
  }
}

function openQrModal(qrToken, tableName, url) {
  currentQrToken = qrToken;
  currentQrTableName = tableName;
  const modal = document.getElementById('qr-preview-modal');
  document.getElementById('qr-modal-title').textContent = tableName;
  document.getElementById('qr-modal-url').textContent = url;
  
  const container = document.getElementById('qr-modal-canvas');
  container.innerHTML = '';
  
  if (typeof QRCode !== 'undefined') {
    new QRCode(container, {
      text: url,
      width: 260,
      height: 260,
      colorDark : "#111111",
      colorLight : "#ffffff",
      correctLevel : QRCode.CorrectLevel.L
    });
  }
  
  modal.style.display = 'flex';
}

function closeQrModal() {
  document.getElementById('qr-preview-modal').style.display = 'none';
}

function downloadQR() {
  const container = document.getElementById('qr-modal-canvas');
  if (!container) return;
  const img = container.querySelector('img');
  const canvas = container.querySelector('canvas');
  let dataUrl = '';
  
  if (img && img.src && img.src.startsWith('data:')) {
    dataUrl = img.src;
  } else if (canvas) {
    dataUrl = canvas.toDataURL('image/png');
  }
  
  if (!dataUrl) return;
  const link = document.createElement('a');
  link.download = `QR_${currentQrTableName.replace(/\s+/g, '_')}.png`;
  link.href = dataUrl;
  link.click();
}

function printAllQR() {
  const grid = document.getElementById('qr-grid');
  if (!grid) return;
  const win = window.open('', '_blank');
  win.document.write(`
    <html><head><title>In mã QR</title><style>
      body { font-family: Arial, sans-serif; margin: 0; }
      .grid { display: flex; flex-wrap: wrap; gap: 0; }
      .card { width: 200px; border: 1px solid #ddd; border-radius: 8px; padding: 16px; margin: 8px; text-align: center; page-break-inside: avoid; }
      .name { font-weight: 700; font-size: 14px; margin-top: 10px; }
      .url { font-size: 9px; color: #aaa; word-break: break-all; margin-top: 4px; }
      @media print { @page { size: A4; margin: 10mm; } }
    </style></head><body><div class="grid">
  `);
  
  const cards = grid.children;
  Array.from(cards).forEach((card, idx) => {
    const table = currentTablesData[idx];
    if (!table) return;
    const url = `${serverBaseUrl}/dat-mon.html?qr_token=${table.qr_token}`;
    
    const img = card.querySelector('img');
    const canvas = card.querySelector('canvas');
    let dataUrl = '';
    if (img && img.src && img.src.startsWith('data:')) dataUrl = img.src;
    else if (canvas) dataUrl = canvas.toDataURL();
    
    if (dataUrl) {
      win.document.write(`
        <div class="card">
          <img src="${dataUrl}" width="160" height="160">
          <div class="name">${table.table_number}</div>
          <div class="url">${url}</div>
        </div>
      `);
    }
  });
  
  win.document.write('</div></body></html>');
  win.document.close();
  win.onload = () => { win.print(); };
}


// --- TABLE MANAGEMENT ---
function openTableModal(id = null) {
  document.getElementById('edit-table-id').value = id || '';
  const title = document.getElementById('table-modal-title');
  const nameInput = document.getElementById('table-name');
  const qrInput = document.getElementById('table-qr');
  const areaSelect = document.getElementById('table-area');
  
  if (id) {
    const table = currentTablesData.find(t => t.id === id);
    if (!table) return;
    title.textContent = 'Sửa bàn';
    nameInput.value = table.table_number;
    qrInput.value = table.qr_token;
    areaSelect.value = table.id_khu_vuc || '';
  } else {
    title.textContent = 'Thêm bàn mới';
    nameInput.value = '';
    qrInput.value = '';
    areaSelect.value = '';
  }
  
  document.getElementById('table-modal').style.display = 'flex';
}

async function submitTable() {
  const id = document.getElementById('edit-table-id').value;
  const table_number = document.getElementById('table-name').value.trim();
  const qr_token = document.getElementById('table-qr').value.trim();
  const area_id = document.getElementById('table-area').value;
  
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
      body: JSON.stringify({ table_number, qr_token, area_id: area_id ? parseInt(area_id) : null })
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
async function updateRestaurantInfo() {
  // Bỏ hàm cũ không dùng
}

// --- USER DROPDOWN & PASSWORD ---
const userMenuBtn = document.getElementById('user-menu-btn');
if (userMenuBtn) {
  userMenuBtn.addEventListener('click', (e) => {
    const dropdown = document.getElementById('user-dropdown');
    if (dropdown) {
      dropdown.style.display = dropdown.style.display === 'none' ? 'block' : 'none';
      e.stopPropagation();
    }
  });
}

document.addEventListener('click', () => {
  const dropdown = document.getElementById('user-dropdown');
  if (dropdown) dropdown.style.display = 'none';
});

function openChangePasswordModal() {
  document.getElementById('password-modal').style.display = 'flex';
  document.getElementById('old-password').value = '';
  document.getElementById('new-password').value = '';
}
function closeChangePasswordModal() {
  document.getElementById('password-modal').style.display = 'none';
}
async function submitChangePassword() {
  const oldPassword = document.getElementById('old-password').value;
  const newPassword = document.getElementById('new-password').value;
  if (!oldPassword || !newPassword) return showToast('Vui lòng nhập đầy đủ mật khẩu');
  
  const token = sessionStorage.getItem('adminToken');
  try {
    const res = await fetch('/api/auth/change-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
      body: JSON.stringify({ oldPassword, newPassword })
    });
    const data = await res.json();
    if (res.ok && data.success) {
      showToast('Đổi mật khẩu thành công!');
      closeChangePasswordModal();
    } else {
      showToast(data.error || 'Lỗi đổi mật khẩu', false);
    }
  } catch (err) {
    showToast('Lỗi kết nối máy chủ', false);
  }
}

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

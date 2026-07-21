let tables = [];
let selectedTable = null;
let socket = null;
let currentUsername = 'Admin';
let currentFullname = 'Admin';
let currentResInfo = null;
let selectedFilterArea = 'Tất cả';
let selectedFilterStatus = 'all';

// DOM Elements
const tablesGrid = document.getElementById('tables-grid');
const orderItemsList = document.getElementById('order-items-list');
const currentTableName = document.getElementById('current-table-name');
const totalQtyEl = document.getElementById('total-qty');
const totalPriceEl = document.getElementById('total-price');
const btnCheckout = document.getElementById('btn-checkout');
const btnPrintTemp = document.getElementById('btn-print-temp');
const toastNotification = document.getElementById('toast-notification');
const toastMessage = document.getElementById('toast-message');

const btnShowUnconfirmed = document.getElementById('btn-show-unconfirmed');
const unconfirmedCountBadge = document.getElementById('unconfirmed-count');
const confirmOrdersModal = document.getElementById('confirm-orders-modal');
const closeConfirmModal = document.getElementById('close-confirm-modal');
const unconfirmedList = document.getElementById('unconfirmed-list');
const unconfCountModal = document.getElementById('unconf-count-modal');

// Format
function formatPrice(number) {
  return new Intl.NumberFormat('vi-VN').format(number || 0) + 'đ';
}

function showToast(message, isSuccess = true) {
  toastMessage.textContent = message;
  toastNotification.className = 'toast show';
  if (isSuccess) toastNotification.classList.add('toast-success');
  else toastNotification.classList.add('toast-error');
  setTimeout(() => { toastNotification.className = 'toast'; }, 3000);
}

async function loadTables() {
  try {
    const res = await fetch('/api/cashier/tables');
    if (!res.ok) throw new Error('Lỗi fetch tables');
    tables = await res.json();
    renderTables();
    checkUnconfirmedOrders();
    
    if (selectedTable) {
      const updatedTable = tables.find(t => t.id === selectedTable.id);
      if (updatedTable) {
        selectedTable = updatedTable;
      } else {
        selectedTable = null;
      }
    }
    renderRightPane();
  } catch (err) {
    console.error(err);
    showToast('Không thể tải sơ đồ bàn ăn!', false);
  }
}

// Event listeners for filters
document.querySelectorAll('.area-tab').forEach(tab => {
  tab.addEventListener('click', (e) => {
    document.querySelectorAll('.area-tab').forEach(t => t.classList.remove('active'));
    e.target.classList.add('active');
    selectedFilterArea = e.target.textContent.trim();
    renderTables();
  });
});

document.querySelectorAll('input[name="table_status"]').forEach(radio => {
  radio.addEventListener('change', (e) => {
    selectedFilterStatus = e.target.value;
    renderTables();
  });
});
function renderTables() {
  tablesGrid.innerHTML = '';
  
  let allCount = 0;
  let servingCount = 0;
  let emptyCount = 0;

  // Compute counts for the selected area
  let areaTables = tables.filter(t => {
    let tArea = t.area_name || 'Không rõ';
    return selectedFilterArea === 'Tất cả' || 
           tArea === selectedFilterArea || 
           (selectedFilterArea === 'VIP' && tArea.toLowerCase().includes('vip'));
  });

  areaTables.forEach(t => {
    allCount++;
    let isActiveOrder = t.status === 'serving' || t.status === 'pending_payment';
    if (isActiveOrder) servingCount++;
    else emptyCount++;
  });

  // Filter by status for rendering
  let filteredTables = areaTables.filter(t => {
    let isActiveOrder = t.status === 'serving' || t.status === 'pending_payment';
    if (selectedFilterStatus === 'serving' && !isActiveOrder) return false;
    if (selectedFilterStatus === 'available' && isActiveOrder) return false;
    return true;
  });

  filteredTables.forEach(t => {
    let isActiveOrder = t.status === 'serving' || t.status === 'pending_payment';

    const card = document.createElement('div');
    card.className = `table-box ${isActiveOrder ? 'serving' : ''} ${selectedTable && selectedTable.id === t.id ? 'active' : ''}`;
    
    let totalAmt = '';
    let guestIcon = '';
    if (isActiveOrder && t.active_order) {
      const confirmedTotal = t.active_order.items
        .filter(i => i.status === 'done')
        .reduce((sum, i) => sum + (i.price * i.quantity), 0);
      if (confirmedTotal > 0) {
        totalAmt = formatPrice(confirmedTotal);
        guestIcon = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg> 2`;
      }
    }

    card.innerHTML = `
      <div class="table-details">
        <span>${totalAmt}</span>
        <span>${guestIcon}</span>
      </div>
      <div class="table-name">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 4px; vertical-align: middle;"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect></svg>
        ${t.table_number}
      </div>
    `;

    card.addEventListener('click', () => {
      selectedTable = t;
      document.querySelectorAll('.table-box').forEach(b => b.classList.remove('active'));
      card.classList.add('active');
      renderRightPane();
    });

    tablesGrid.appendChild(card);
  });

  document.getElementById('count-all').textContent = allCount;
  document.getElementById('count-using').textContent = servingCount;
  document.getElementById('count-empty').textContent = emptyCount;
}

function renderRightPane() {
  if (!selectedTable) {
    currentTableName.innerHTML = `Chưa chọn bàn`;
    orderItemsList.innerHTML = `<div class="empty-state">Vui lòng chọn một bàn để xem hóa đơn</div>`;
    totalQtyEl.textContent = '0';
    totalPriceEl.textContent = '0';
    return;
  }

  currentTableName.innerHTML = `${selectedTable.table_number} / Tất cả`;

  const noteHtml = (selectedTable.active_order && selectedTable.active_order.note) ? `<div style="font-size: 13px; color: #b45309; background: #fef3c7; padding: 8px 12px; border-radius: 4px; margin: 12px 12px 0 12px;">📝 Ghi chú: <b>${selectedTable.active_order.note}</b></div>` : '';

  if (!selectedTable.active_order || selectedTable.active_order.items.length === 0) {
    orderItemsList.innerHTML = `${noteHtml}<div class="empty-state" style="text-align:center; margin-top:20px; color:#888;">Bàn chưa có order</div>`;
    totalQtyEl.textContent = '0';
    totalPriceEl.textContent = '0';
    return;
  }

  orderItemsList.innerHTML = noteHtml;
  let totalQty = 0;
  let totalPrice = 0;
  let index = 1;

  // Lọc chỉ hiện các món đã nấu xong (done) ở màn thanh toán thu ngân
  const confirmedItems = selectedTable.active_order.items.filter(i => i.status === 'done');

  if (confirmedItems.length === 0) {
    orderItemsList.innerHTML = `<div class="empty-state" style="text-align:center; margin-top:20px; color:#888;">Đơn hàng đang chờ duyệt</div>`;
  }

  confirmedItems.forEach(item => {
    const row = document.createElement('div');
    row.className = 'pos-order-item';
    const itemTotal = item.price * item.quantity;
    totalQty += item.quantity;
    totalPrice += itemTotal;

    row.innerHTML = `
      <div class="pos-item-idx">${index++}</div>
      <div>
        <div class="pos-item-name">${item.name}</div>
      </div>
      <div class="pos-item-qty">
        <button class="pos-qty-btn" onclick="openCancelQtyModal(${item.order_item_id}, '${item.name}', ${item.quantity}, 1, false)">-</button>
        <span class="pos-qty-val">${item.quantity}</span>
        <button class="pos-qty-btn" onclick="updateItemQty(${item.order_item_id}, ${item.quantity + 1})">+</button>
      </div>
      <div class="pos-item-total" style="display:flex; align-items:center; justify-content: flex-end; gap:8px;">
        ${formatPrice(itemTotal)}
      </div>
    `;
    orderItemsList.appendChild(row);
  });

  totalQtyEl.textContent = totalQty;
  totalPriceEl.textContent = formatPrice(totalPrice);
}

window.updateItemQty = async (orderItemId, newQty) => {
  if (newQty < 1) return; // Nếu < 1 thì mở modal hủy rồi nên k vào đây
  
  try {
    const res = await fetch('/api/cashier/update-item-qty', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ order_item_id: orderItemId, quantity: newQty })
    });
    if (res.ok) {
      // Sẽ nhận được websocket table_status_changed nên không cần reload tay,
      // hoặc tải lại luôn để UI mượt
      loadTables();
    } else {
      showToast('Lỗi khi cập nhật số lượng', false);
    }
  } catch (err) {
    showToast('Lỗi kết nối', false);
  }
};

// ================= TÍNH NĂNG CHỜ DUYỆT (UNCONFIRMED) =================
function checkUnconfirmedOrders() {
  const unconfirmedByTable = {};
  
  tables.forEach(t => {
    if (t.active_order && t.active_order.items) {
      const unconfItems = t.active_order.items.filter(i => i.status === 'unconfirmed');
      if (unconfItems.length > 0) {
        unconfirmedByTable[t.id] = { table: t, items: unconfItems };
      }
    }
  });

  const tableCount = Object.keys(unconfirmedByTable).length;
  if (tableCount > 0) {
    btnShowUnconfirmed.style.display = 'flex';
    unconfirmedCountBadge.textContent = `${tableCount} lượt gọi món qua QR`;
  } else {
    btnShowUnconfirmed.style.display = 'none';
  }

  renderConfirmModal(unconfirmedByTable);
}

btnShowUnconfirmed.addEventListener('click', () => {
  confirmOrdersModal.style.display = 'flex';
});
closeConfirmModal.addEventListener('click', () => {
  confirmOrdersModal.style.display = 'none';
});

function renderConfirmModal(unconfirmedByTable) {
  unconfirmedList.innerHTML = '';
  const keys = Object.keys(unconfirmedByTable);
  unconfCountModal.textContent = keys.length;

  if (keys.length === 0) {
    unconfirmedList.innerHTML = '<div style="text-align:center; padding: 20px;">Không có yêu cầu gọi món mới.</div>';
    return;
  }

  keys.forEach(tableId => {
    const data = unconfirmedByTable[tableId];
    const orderTime = new Date(data.table.active_order.created_at);
    const timeDiff = Math.floor((new Date() - orderTime) / 60000); // phút

    const block = document.createElement('div');
    block.className = 'unconf-block';
    
    let itemsHtml = data.items.map(i => `
      <div class="unconf-item" style="display: flex; justify-content: space-between; align-items: center;">
        <span>${i.quantity} x ${i.name}</span>
        <div style="display:flex; align-items:center; gap:8px;">
          <span>${formatPrice(i.price * i.quantity)}</span>
          <button onclick="openCancelQtyModal(${i.order_item_id}, '${i.name}', ${i.quantity}, ${i.quantity}, true)" style="background:none; border:none; cursor:pointer; color:#000; display:flex; align-items:center; justify-content:center; padding: 4px;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>
      </div>
    `).join('');

    block.innerHTML = `
      <div class="unconf-header">
        <div>${data.table.table_number} - Tất cả <span class="unconf-time"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg> ${timeDiff} phút trước</span></div>
        <span style="color:#10b981; font-size:12px; font-weight:normal;">Đang phục vụ</span>
      </div>
      ${data.table.active_order.note ? `<div style="font-size: 13px; color: #b45309; background: #fef3c7; padding: 6px 10px; margin: 12px 12px 0 12px; border-radius: 4px;">📝 Ghi chú: <b>${data.table.active_order.note}</b></div>` : ''}
      <div class="unconf-items">
        ${itemsHtml}
      </div>
      <div class="unconf-actions">
        <button class="unconf-btn-cancel" onclick="openRejectOrderModal(${tableId}, '${data.table.table_number}')">Hủy</button>
        <button class="unconf-btn-confirm" onclick="confirmOrder(${tableId})"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg> Xác nhận và Báo bếp</button>
      </div>
    `;
    unconfirmedList.appendChild(block);
  });
}

window.confirmOrder = async (tableId) => {
  try {
    const res = await fetch('/api/cashier/confirm-orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ table_id: tableId })
    });
    if (res.ok) {
      showToast('Đã xác nhận và báo bếp thành công!');
      document.getElementById('confirm-orders-modal').style.display = 'none';
      // Tự cập nhật qua socket nên k cần reload
    }
  } catch (err) {
    showToast('Lỗi khi duyệt món', false);
  }
}

// ================= MODAL XÁC NHẬN GIẢM / HỦY MÓN =================
let cancelItemState = { id: null, max: 1, qty: 1 };
const cancelQtyModal = document.getElementById('cancel-qty-modal');

window.openCancelQtyModal = (orderItemId, itemName, currentQty, qtyToCancel, isFullCancel) => {
  cancelItemState = { id: orderItemId, max: currentQty, qty: qtyToCancel };
  
  if (isFullCancel) {
    document.getElementById('cancel-qty-title').textContent = 'Xác nhận hủy món';
    document.getElementById('cancel-qty-desc').textContent = `Bạn có chắc chắn muốn hủy món "${itemName}" không?`;
    document.getElementById('cancel-qty-selector').style.display = 'none';
  } else {
    document.getElementById('cancel-qty-title').textContent = 'Xác nhận giảm món';
    document.getElementById('cancel-qty-desc').textContent = `Bạn có chắc chắn muốn giảm số lượng món "${itemName}" không?`;
    document.getElementById('cancel-qty-selector').style.display = 'flex';
  }
  
  document.getElementById('cancel-qty-max').textContent = currentQty;
  document.getElementById('cancel-qty-val').textContent = qtyToCancel;
  cancelQtyModal.style.display = 'flex';
};

window.closeCancelQtyModal = () => {
  cancelQtyModal.style.display = 'none';
};

document.getElementById('cancel-qty-minus').addEventListener('click', () => {
  if (cancelItemState.qty > 1) {
    cancelItemState.qty--;
    document.getElementById('cancel-qty-val').textContent = cancelItemState.qty;
  }
});
document.getElementById('cancel-qty-plus').addEventListener('click', () => {
  if (cancelItemState.qty < cancelItemState.max) {
    cancelItemState.qty++;
    document.getElementById('cancel-qty-val').textContent = cancelItemState.qty;
  }
});

document.getElementById('cancel-qty-confirm').addEventListener('click', async () => {
  const reason = document.getElementById('cancel-qty-reason').value;
  try {
    let res;
    if (cancelItemState.qty === cancelItemState.max) {
      // Hủy toàn bộ món
      res = await fetch('/api/cashier/cancel-order-item', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_item_id: cancelItemState.id, reason })
      });
    } else {
      // Giảm số lượng
      const newQty = cancelItemState.max - cancelItemState.qty;
      res = await fetch('/api/cashier/update-item-qty', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_item_id: cancelItemState.id, quantity: newQty })
      });
    }
    
    if (res.ok) {
      showToast('Đã cập nhật đơn hàng thành công!');
      closeCancelQtyModal();
      loadTables();
    } else {
      showToast('Lỗi khi hủy món', false);
    }
  } catch (err) {
    showToast('Lỗi kết nối', false);
  }
});

// ================= MODAL TỪ CHỐI YÊU CẦU GỌI MÓN =================
let rejectTableId = null;
const rejectOrderModal = document.getElementById('reject-order-modal');

window.openRejectOrderModal = (tableId, tableName) => {
  rejectTableId = tableId;
  document.getElementById('reject-order-desc').textContent = `Hủy yêu cầu gọi món từ ${tableName}. Vui lòng nhập lý do phía dưới:`;
  rejectOrderModal.style.display = 'flex';
};

window.closeRejectOrderModal = () => {
  rejectOrderModal.style.display = 'none';
};

document.getElementById('reject-order-confirm').addEventListener('click', async () => {
  const select = document.getElementById('reject-reason-select');
  const reason = select ? select.value : 'Lý do khác';
  
  if (!rejectTableId) return;
  
  // Gọi API hủy từng món unconfirmed của table này
  // Để tối ưu thì backend nên có 1 API reject toàn bộ unconfirmed theo table,
  // nhưng tạm thời gọi liên tiếp hoặc backend sẽ xử lý. 
  // Vì trong code hiện tại không có API hủy toàn bộ, ta sẽ lọc các orderItem unconfirmed rồi hủy từng cái.
  const tableData = tables.find(t => t.id === rejectTableId);
  if (tableData && tableData.active_order) {
    const unconfItems = tableData.active_order.items.filter(i => i.status === 'unconfirmed');
    try {
      for (const item of unconfItems) {
        await fetch('/api/cashier/cancel-order-item', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ order_item_id: item.order_item_id, reason })
        });
      }
      showToast('Đã từ chối các món gọi thành công!');
      closeRejectOrderModal();
      confirmOrdersModal.style.display = 'none'; // Đóng modal danh sách chờ nếu rỗng
      loadTables();
    } catch(err) {
      showToast('Lỗi kết nối khi hủy', false);
    }
  }
});

// ================= WEBSOCKET =================
function initWebSocket() {
  const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  socket = new WebSocket(`${wsProtocol}//${window.location.host}`);

  socket.onopen = () => {
    socket.send(JSON.stringify({ type: 'register', role: 'cashier' }));
  };

  socket.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (data.type === 'item_cooked_cashier_notify') {
      showToast(data.message);
    } else if (data.type === 'new_order' || data.type === 'table_status_changed') {
      loadTables();
    }
  };

  socket.onclose = () => {
    setTimeout(initWebSocket, 5000);
  };
}

// ================= CHECKOUT MODAL =================
window.closeCheckoutModal = () => {
  document.getElementById('checkout-modal').style.display = 'none';
};

btnCheckout.addEventListener('click', () => {
  if (!selectedTable || !selectedTable.active_order) return;
  
  const confirmedItems = selectedTable.active_order.items.filter(i => i.status !== 'unconfirmed' && i.status !== 'canceled');
  let totalPrice = 0;
  confirmedItems.forEach(item => {
    totalPrice += item.price * item.quantity;
  });

  document.getElementById('checkout-desc').innerHTML = `Xác nhận thanh toán cho <b>${selectedTable.table_number}</b> với tổng tiền <br><b style="color:#e11d48; font-size:20px; display:inline-block; margin-top:8px;">${formatPrice(totalPrice)}</b>?`;
  document.getElementById('checkout-modal').style.display = 'flex';
});

document.getElementById('checkout-confirm-btn').addEventListener('click', async () => {
  if (!selectedTable) return;
  try {
    const btn = document.getElementById('checkout-confirm-btn');
    btn.disabled = true;
    btn.textContent = 'Đang xử lý...';
    
    const res = await fetch('/api/payment/confirm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ table_id: selectedTable.id })
    });
    
    if (res.ok) {
      showToast(`Đã thanh toán ${selectedTable.table_number}`);
      selectedTable = null;
      loadTables();
      closeCheckoutModal();
    }
  } catch(err) {
    showToast('Thanh toán lỗi', false);
  } finally {
    const btn = document.getElementById('checkout-confirm-btn');
    btn.disabled = false;
    btn.textContent = 'Đồng ý';
  }
});

btnPrintTemp.addEventListener('click', () => {
  if (!selectedTable || !selectedTable.active_order) {
    showToast('Bàn chưa có order để in!', false);
    return;
  }

  // Populate data
  if (currentResInfo) {
    document.getElementById('inv-res-name').textContent = currentResInfo.ten_nha_hang;
    document.getElementById('inv-res-address').textContent = currentResInfo.dia_chi;
    document.getElementById('inv-res-phone').textContent = 'SĐT: ' + currentResInfo.so_dien_thoai;
  }
  
  document.getElementById('inv-table-name').textContent = selectedTable.table_number;
  document.getElementById('inv-cashier').textContent = currentFullname;
  
  const now = new Date();
  const timeString = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')} ${now.getDate()}/${now.getMonth()+1}/${now.getFullYear()}`;
  document.getElementById('inv-time').textContent = timeString;

  const invItemsBody = document.getElementById('inv-items');
  invItemsBody.innerHTML = '';
  
  const confirmedItems = selectedTable.active_order.items.filter(i => i.status === 'done');
  
  if (confirmedItems.length === 0) {
    showToast('Không có món nào đã xác nhận để in!', false);
    return;
  }

  let totalPrice = 0;
  confirmedItems.forEach(item => {
    const itemTotal = item.price * item.quantity;
    totalPrice += itemTotal;
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${item.name}</td>
      <td style="text-align: center;">${item.quantity}</td>
      <td style="text-align: right; padding-right: 10px;">${formatPrice(item.price)}</td>
      <td style="text-align: right;">${formatPrice(itemTotal)}</td>
    `;
    invItemsBody.appendChild(tr);
  });

  document.getElementById('inv-total').textContent = formatPrice(totalPrice);

  // Generate PDF
  const element = document.getElementById('invoice-template');
  const safeTableName = selectedTable.table_number.replace(/\s+/g, '_');
  const fileDate = `${now.getHours()}h${now.getMinutes()}_${now.getDate()}-${now.getMonth()+1}-${now.getFullYear()}`;
  
  const opt = {
    margin:       0,
    filename:     `HoaDon_${safeTableName}_${fileDate}.pdf`,
    image:        { type: 'jpeg', quality: 0.98 },
    html2canvas:  { scale: 2 },
    jsPDF:        { unit: 'mm', format: [80, 297], orientation: 'portrait' }
  };

  showToast('Đang tạo hóa đơn PDF...');
  
  // Use html2pdf to open in new window
  html2pdf().set(opt).from(element).output('dataurlnewwindow');
});

// INIT
async function fetchUserInfo() {
  const token = sessionStorage.getItem('adminToken');
  if (token) {
    try {
      const res = await fetch('/api/auth/check', {
        headers: { 'Authorization': 'Bearer ' + token }
      });
      const data = await res.json();
      if (res.ok && data.success && data.username) {
        currentUsername = data.username;
        if (data.fullname) {
          currentFullname = data.fullname;
          document.getElementById('dropdown-fullname').textContent = data.fullname;
          document.getElementById('cashier-username').textContent = data.fullname;
          if (document.getElementById('cashier-footer-name')) {
            document.getElementById('cashier-footer-name').textContent = data.fullname;
          }
        } else {
          document.getElementById('cashier-username').textContent = data.username;
          if (document.getElementById('cashier-footer-name')) {
            document.getElementById('cashier-footer-name').textContent = data.username;
          }
        }
      }
    } catch (err) { console.log(err); }
  }
}

// User Menu Dropdown
const userMenuBtn = document.getElementById('user-menu-btn');
const userDropdown = document.getElementById('user-dropdown');
if (userMenuBtn && userDropdown) {
  userMenuBtn.addEventListener('click', (e) => {
    if (e.target.closest('#user-dropdown')) return;
    userDropdown.classList.toggle('show');
  });
  document.addEventListener('click', (e) => {
    if (!userMenuBtn.contains(e.target)) {
      userDropdown.classList.remove('show');
    }
  });
}

// Auth actions
window.logout = () => {
  sessionStorage.removeItem('adminToken');
  window.location.href = '/login.html';
};
window.openChangePasswordModal = () => {
  document.getElementById('change-password-modal').style.display = 'flex';
  document.getElementById('old-password').value = '';
  document.getElementById('new-password').value = '';
  if (userDropdown) userDropdown.classList.remove('show');
};
window.closeChangePasswordModal = () => {
  document.getElementById('change-password-modal').style.display = 'none';
};
window.submitChangePassword = async () => {
  const oldPassword = document.getElementById('old-password').value;
  const newPassword = document.getElementById('new-password').value;
  if (!oldPassword || !newPassword) return showToast('Vui lòng nhập đủ mật khẩu', false);
  
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
  } catch(err) {
    showToast('Lỗi máy chủ', false);
  }
};

// Event listeners for filters
document.querySelectorAll('.area-tab').forEach(tab => {
  tab.addEventListener('click', (e) => {
    document.querySelectorAll('.area-tab').forEach(t => t.classList.remove('active'));
    e.target.classList.add('active');
    selectedFilterArea = e.target.textContent.trim();
    renderTables();
  });
});

document.querySelectorAll('input[name="table_status"]').forEach(radio => {
  radio.addEventListener('change', (e) => {
    selectedFilterStatus = e.target.value;
    renderTables();
  });
});

fetchUserInfo();
loadTables();
initWebSocket();

async function fetchRestaurantInfo() {
  try {
    const res = await fetch('/api/restaurant/info');
    if (res.ok) {
      currentResInfo = await res.json();
    }
  } catch (err) { console.error('Lỗi tải thông tin nhà hàng', err); }
}
fetchRestaurantInfo();


// ==========================================
// THỰC ĐƠN LOGIC (COPIED FROM QUAN-LY.JS)
// ==========================================

// Custom Confirm Modal Logic
let confirmActionCallback = null;

function showConfirmModal(message) {
  return new Promise((resolve) => {
    document.getElementById('confirm-modal-message').textContent = message;
    document.getElementById('confirm-modal').style.display = 'flex';
    confirmActionCallback = resolve;
  });
}

function hideConfirmModal() {
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



// Initialization for Menu (drag/drop, search)
document.addEventListener('DOMContentLoaded', () => {
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


// View Switching Logic
document.addEventListener('DOMContentLoaded', () => {
  const tabTables = document.querySelector('.pos-tab[data-target="view-tables"]');
  const tabMenu = document.querySelector('.pos-tab[data-target="view-menu"]');
  const viewTables = document.getElementById('view-tables');
  const viewMenu = document.getElementById('view-menu');
  const posRightPanel = document.getElementById('pos-right-panel');
  
  if (tabTables && tabMenu) {
    tabTables.addEventListener('click', () => {
      tabTables.classList.add('active');
      tabMenu.classList.remove('active');
      viewTables.style.display = 'flex';
      viewMenu.style.display = 'none';
      posRightPanel.style.display = 'flex'; // show right panel
      
      // Remove explicit width to let flexbox work naturally
      const posLeft = document.getElementById('pos-left-panel');
      if(posLeft) posLeft.style.width = '';
    });
    
    tabMenu.addEventListener('click', () => {
      tabMenu.classList.add('active');
      tabTables.classList.remove('active');
      viewTables.style.display = 'none';
      viewMenu.style.display = 'block';
      posRightPanel.style.display = 'none'; // hide right panel
      
      // Let flexbox expand it to full width
      const posLeft = document.getElementById('pos-left-panel');
      if(posLeft) posLeft.style.width = '';
      
      loadCategories();
      loadMenuData();
    });
  }
});


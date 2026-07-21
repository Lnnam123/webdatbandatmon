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
        <div class="pos-item-name">${item.ten_size ? item.name + ' (' + item.ten_size + ')' : item.name}</div>
        <div class="pos-item-price">${formatPrice(item.price)}</div>
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
let currentConfirmTab = 'unconfirmed';
let allCategorizedOrders = { unconfirmed: {}, confirmed: {}, canceled: {} };

function checkUnconfirmedOrders() {
  allCategorizedOrders = { unconfirmed: {}, confirmed: {}, canceled: {} };
  
  tables.forEach(t => {
    if (t.active_order && t.active_order.items) {
      const unconfItems = t.active_order.items.filter(i => i.status === 'unconfirmed');
      const confItems = t.active_order.items.filter(i => ['cooking', 'done'].includes(i.status));
      const cancItems = t.active_order.items.filter(i => i.status === 'canceled');
      
      if (unconfItems.length > 0) allCategorizedOrders.unconfirmed[t.id] = { table: t, items: unconfItems };
      if (confItems.length > 0) allCategorizedOrders.confirmed[t.id] = { table: t, items: confItems };
      if (cancItems.length > 0) allCategorizedOrders.canceled[t.id] = { table: t, items: cancItems };
    }
  });

  const unconfCount = Object.keys(allCategorizedOrders.unconfirmed).length;
  const confCount = Object.keys(allCategorizedOrders.confirmed).length;
  const cancCount = Object.keys(allCategorizedOrders.canceled).length;

  if (unconfCount > 0) {
    unconfirmedCountBadge.style.display = 'inline-block';
    unconfirmedCountBadge.textContent = unconfCount;
  } else {
    unconfirmedCountBadge.style.display = 'none';
  }

  const tabs = document.querySelectorAll('.pos-modal-tabs .modal-tab');
  if (tabs.length >= 3) {
    tabs[0].innerHTML = `Chưa xác nhận (<span id="unconf-count-modal">${unconfCount}</span>)`;
    tabs[1].textContent = `Đã xác nhận (${confCount})`;
    tabs[2].textContent = `Hủy gọi món (${cancCount})`;
  }

  renderConfirmModal(allCategorizedOrders);
}

document.addEventListener('DOMContentLoaded', () => {
  const tabs = document.querySelectorAll('.pos-modal-tabs .modal-tab');
  if (tabs.length >= 3) {
    tabs[0].addEventListener('click', () => switchConfirmTab('unconfirmed', 0));
    tabs[1].addEventListener('click', () => switchConfirmTab('confirmed', 1));
    tabs[2].addEventListener('click', () => switchConfirmTab('canceled', 2));
  }
});

function switchConfirmTab(tabName, index) {
  currentConfirmTab = tabName;
  const tabs = document.querySelectorAll('.pos-modal-tabs .modal-tab');
  tabs.forEach(t => t.classList.remove('active'));
  if (tabs[index]) tabs[index].classList.add('active');
  renderConfirmModal(allCategorizedOrders);
}

closeConfirmModal.addEventListener('click', () => {
  confirmOrdersModal.style.display = 'none';
});

function renderConfirmModal(categorized) {
  unconfirmedList.innerHTML = '';
  const dataMap = categorized[currentConfirmTab] || {};
  const keys = Object.keys(dataMap);

  if (keys.length === 0) {
    unconfirmedList.innerHTML = '<div style="text-align:center; padding: 20px; color:#666;">Không có yêu cầu gọi món nào.</div>';
    return;
  }

  keys.forEach(tableId => {
    const data = dataMap[tableId];
    const orderTime = new Date(data.table.active_order.created_at);
    const timeDiff = Math.floor((new Date() - orderTime) / 60000); // phút

    const block = document.createElement('div');
    block.className = 'unconf-block';
    
    let itemsHtml = data.items.map(i => {
      let actionBtns = '';
      if (currentConfirmTab === 'unconfirmed' || currentConfirmTab === 'confirmed') {
        actionBtns = `
          <button onclick="openCancelQtyModal(${i.order_item_id}, '${i.name}', ${i.quantity}, ${i.quantity}, true)" style="background:none; border:none; cursor:pointer; color:#000; display:flex; align-items:center; justify-content:center; padding: 4px;" title="Giảm/Hủy món">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        `;
      }
      
      let badge = '';
      if (currentConfirmTab === 'confirmed') {
         badge = i.status === 'cooking' ? '<span style="color:#f59e0b; font-size:12px; margin-left:8px; font-weight:600;">Đang chế biến</span>' : '<span style="color:#10b981; font-size:12px; margin-left:8px; font-weight:600;">Đã phục vụ</span>';
      } else if (currentConfirmTab === 'canceled') {
         badge = '<span style="color:#ef4444; font-size:12px; margin-left:8px; font-weight:600;">Đã hủy</span>';
      }

      return `
        <div class="unconf-item" style="display: flex; justify-content: space-between; align-items: center;">
          <span>${i.quantity} x ${i.ten_size ? i.name + ' (' + i.ten_size + ')' : i.name} ${badge}</span>
          <div style="display:flex; align-items:center; gap:8px;">
            <span>${formatPrice(i.price * i.quantity)}</span>
            ${actionBtns}
          </div>
        </div>
      `;
    }).join('');

    let actionsHtml = '';
    if (currentConfirmTab === 'unconfirmed') {
      actionsHtml = `
        <div class="unconf-actions">
          <button class="unconf-btn-cancel" onclick="openRejectOrderModal(${tableId}, '${data.table.table_number}')">Hủy toàn bộ</button>
          <button class="unconf-btn-confirm" onclick="confirmOrder(${tableId})">Xác nhận</button>
        </div>
      `;
    }

    block.innerHTML = `
      <div class="unconf-header">
        <div>${data.table.table_number} - Tất cả <span class="unconf-time"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg> ${timeDiff} phút trước</span></div>
        ${currentConfirmTab === 'confirmed' ? '<span style="color:#10b981; font-size:12px;">Đã xác nhận</span>' : ''}
      </div>
      ${data.table.active_order.note ? `<div style="font-size: 13px; color: #b45309; background: #fef3c7; padding: 6px 10px; margin: 12px 12px 0 12px; border-radius: 4px;">📝 Ghi chú: <b>${data.table.active_order.note}</b></div>` : ''}
      <div class="unconf-items">
        ${itemsHtml}
      </div>
      ${actionsHtml}
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
      await loadTables();
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
      await loadTables();
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
      await loadTables();
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
      <td>${item.ten_size ? item.name + ' (' + item.ten_size + ')' : item.name}</td>
      <td style="text-align: center;">${item.quantity}</td>
      <td style="text-align: right;">${formatPrice(item.price)}</td>
      <td style="text-align: right;">${formatPrice(itemTotal)}</td>
    `;
    invItemsBody.appendChild(tr);
  });

  document.getElementById('inv-total').textContent = formatPrice(totalPrice);

  // Generate PDF
  const element = document.getElementById('invoice-template');
  
  // Hiển thị tạm để lấy chiều cao nội dung
  element.parentElement.style.display = 'block';
  const pxHeight = element.offsetHeight;
  element.parentElement.style.display = 'none';
  
  // Chuyển đổi px sang mm (1px ~ 0.264583 mm) và cộng thêm 5mm lề
  const heightInMm = (pxHeight * 0.264583) + 5;

  const fileDate = `${now.getDate()}-${now.getMonth()+1}-${now.getFullYear()}`;
  const fileTime = `${now.getHours()}h${now.getMinutes()}`;
  const fileName = `${selectedTable.table_number} - ${fileTime} - ${fileDate}.pdf`;
  
  const opt = {
    margin:       0,
    filename:     fileName,
    image:        { type: 'jpeg', quality: 0.98 },
    html2canvas:  { scale: 2 },
    jsPDF:        { unit: 'mm', format: [80, heightInMm], orientation: 'portrait' }
  };

  showToast('Đang tạo hóa đơn PDF...');
  
  // Mở tab trống ngay lập tức để tránh trình duyệt chặn popup
  const previewWindow = window.open('', '_blank');
  if (previewWindow) {
    previewWindow.document.write('<p style="font-family: sans-serif; padding: 20px;">Đang tạo hoá đơn, vui lòng chờ...</p>');
  }
  
  // Tạo blob và xử lý
  html2pdf().set(opt).from(element).output('blob').then((pdfBlob) => {
    const blobUrl = URL.createObjectURL(pdfBlob);
    
    if (previewWindow) {
      const viewerHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>${fileName}</title>
          <style>
            body { margin: 0; padding: 0; background: #525659; display: flex; flex-direction: column; height: 100vh; font-family: sans-serif; overflow: hidden; }
            .header { background: #323639; color: white; padding: 12px 20px; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 2px 4px rgba(0,0,0,0.2); z-index: 10; }
            .filename { font-size: 15px; font-weight: 500; letter-spacing: 0.5px; }
            .actions { display: flex; gap: 12px; }
            .btn { padding: 6px 16px; border-radius: 4px; font-size: 13px; font-weight: 600; cursor: pointer; border: none; transition: background 0.2s; }
            .btn-print { background: transparent; color: #8ab4f8; border: 1px solid #8ab4f8; }
            .btn-print:hover { background: rgba(138, 180, 248, 0.1); }
            .btn-download { background: #8ab4f8; color: #202124; }
            .btn-download:hover { background: #aecbfa; }
            iframe { flex: 1; border: none; width: 100%; background: #525659; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="filename">${fileName}</div>
            <div class="actions">
              <button class="btn btn-print" onclick="printPdf()">In hoá đơn</button>
              <button class="btn btn-download" onclick="downloadPdf()">Tải xuống</button>
            </div>
          </div>
          <iframe id="pdf-frame" src="${blobUrl}#toolbar=0&view=FitH"></iframe>
          <script>
            function downloadPdf() {
              const a = document.createElement('a');
              a.href = '${blobUrl}';
              a.download = '${fileName}';
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
            }
            function printPdf() {
              const iframe = document.getElementById('pdf-frame');
              iframe.contentWindow.focus();
              iframe.contentWindow.print();
            }
          </script>
        </body>
        </html>
      `;
      previewWindow.document.open();
      previewWindow.document.write(viewerHtml);
      previewWindow.document.close();
    }
  });
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
      <td>
        <div style="display:flex; align-items:center; gap:8px;">
          <button class="kv-btn-default" style="padding:2px 8px; font-weight:bold;" onclick="adjustStockLocally(${item.id}, -1)">-</button>
          <span>${item.so_luong !== undefined ? item.so_luong : 0}</span>
          <button class="kv-btn-default" style="padding:2px 8px; font-weight:bold;" onclick="adjustStockLocally(${item.id}, 1)">+</button>
        </div>
      </td>
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
  const token = sessionStorage.getItem('cashierToken');
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

async function submitAddMenu() {
  const id = document.getElementById('edit-menu-id').value;
  const ten_mon = document.getElementById('new-ten-mon').value.trim();
  const loai_mon = document.getElementById('new-loai-mon').value;
  const gia_tien = document.getElementById('new-gia-tien').value;
  const so_luong = document.getElementById('new-so-luong').value;
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
  const token = sessionStorage.getItem('cashierToken');
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

  const token = sessionStorage.getItem('cashierToken');
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


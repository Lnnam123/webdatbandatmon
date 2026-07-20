let tables = [];
let selectedTable = null;
let socket = null;

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
        renderRightPane();
      } else {
        selectedTable = null;
        renderRightPane();
      }
    }
  } catch (err) {
    console.error(err);
    showToast('Không thể tải sơ đồ bàn ăn!', false);
  }
}

function renderTables() {
  tablesGrid.innerHTML = '';
  
  let allCount = tables.length;
  let servingCount = 0;
  let emptyCount = 0;

  tables.forEach(t => {
    let isActiveOrder = t.status === 'serving' || t.status === 'pending_payment';
    if (isActiveOrder) servingCount++;
    else emptyCount++;

    const card = document.createElement('div');
    card.className = `table-box ${isActiveOrder ? 'serving' : ''} ${selectedTable && selectedTable.id === t.id ? 'active' : ''}`;
    
    let totalAmt = '';
    let guestIcon = '';
    if (isActiveOrder && t.active_order) {
      const confirmedTotal = t.active_order.items
        .filter(i => i.status !== 'unconfirmed' && i.status !== 'canceled')
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
    currentTableName.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect></svg> Chưa chọn bàn`;
    orderItemsList.innerHTML = `<div class="empty-state">Vui lòng chọn một bàn để xem hóa đơn</div>`;
    totalQtyEl.textContent = '0';
    totalPriceEl.textContent = '0';
    return;
  }

  currentTableName.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect></svg> ${selectedTable.table_number} / Tất cả`;

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

  // Lọc chỉ hiện các món đã confirmed (cooking, done) ở màn thanh toán thu ngân
  const confirmedItems = selectedTable.active_order.items.filter(i => i.status !== 'unconfirmed' && i.status !== 'canceled');

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
        <div>Bàn ${data.table.table_number} - Tất cả <span class="unconf-time"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg> ${timeDiff} phút trước</span></div>
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
  document.getElementById('reject-order-desc').textContent = `Hủy yêu cầu gọi món từ Bàn ${tableName}. Vui lòng nhập lý do phía dưới:`;
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
    if (data.type === 'new_order' || data.type === 'table_status_changed') {
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
      showToast(`Đã thanh toán bàn ${selectedTable.table_number}`);
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
  document.getElementById('inv-table-name').textContent = selectedTable.table_number;
  
  const now = new Date();
  const timeString = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')} ${now.getDate()}/${now.getMonth()+1}/${now.getFullYear()}`;
  document.getElementById('inv-time').textContent = timeString;

  const invItemsBody = document.getElementById('inv-items');
  invItemsBody.innerHTML = '';
  
  const confirmedItems = selectedTable.active_order.items.filter(i => i.status !== 'unconfirmed' && i.status !== 'canceled');
  
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
  const opt = {
    margin:       0,
    filename:     `HoaDon_${selectedTable.table_number}_${Date.now()}.pdf`,
    image:        { type: 'jpeg', quality: 0.98 },
    html2canvas:  { scale: 2 },
    jsPDF:        { unit: 'mm', format: [80, 297], orientation: 'portrait' }
  };

  showToast('Đang tạo hóa đơn PDF...');
  
  // Use html2pdf to open in new window
  html2pdf().set(opt).from(element).output('dataurlnewwindow');
});

// INIT
loadTables();
initWebSocket();

// STATE MANAGEMENT
let state = {
  table: null, // { id, table_number, status, session_token }
  menu: [],
  activeOrder: null,
  cart: [],
  selectedCategory: 'all',
  socket: null
};

// DOM ELEMENTS
const welcomeScreen = document.getElementById('welcome-screen');
const simulatedTables = document.getElementById('simulated-tables');
const orderingScreen = document.getElementById('ordering-screen');
const headerStatusArea = document.getElementById('header-status-area');
const tableNumberBadge = document.getElementById('table-number-badge');
const menuItemsGrid = document.getElementById('menu-items-grid');
const categoriesList = document.getElementById('categories-list');
const cartBottomBar = document.getElementById('cart-bottom-bar');
const cartItemCount = document.getElementById('cart-item-count');
const cartTotalPrice = document.getElementById('cart-total-price');
const openCartCheckoutBtn = document.getElementById('open-cart-checkout-btn');
const callCheckoutBtn = document.getElementById('call-checkout-btn');

// Cart Modal Elements
const cartModal = document.getElementById('cart-modal');
const closeCartBtn = document.getElementById('close-cart-btn');
const modalCartItems = document.getElementById('modal-cart-items');
const modalCartTotalPrice = document.getElementById('modal-cart-total-price');
const clearCartBtn = document.getElementById('clear-cart-btn');
const confirmOrderBtn = document.getElementById('confirm-order-btn');

// Payment Overlay
const paymentOverlay = document.getElementById('payment-overlay');
const paymentOverlayTotal = document.getElementById('payment-overlay-total');

// Toast Notification
const toastNotification = document.getElementById('toast-notification');
const toastMessage = document.getElementById('toast-message');

// FORMAT PRICE (VND)
function formatPrice(number) {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(number);
}

// SHOW TOAST
function showToast(message, type = 'info') {
  toastMessage.textContent = message;
  toastNotification.className = 'toast show';
  if (type === 'success') {
    toastNotification.classList.add('toast-success');
  }
  setTimeout(() => {
    toastNotification.classList.remove('show', 'toast-success');
  }, 4000);
}

// INITIATION AND ROUTING
document.addEventListener('DOMContentLoaded', () => {
  const urlParams = new URLSearchParams(window.location.search);
  const qrToken = urlParams.get('qr_token');

  if (qrToken) {
    initApp(qrToken);
  } else {
    showWelcomeScreen();
  }

  // Bind Events
  setupEventListeners();
});

// SHOW WELCOME SCREEN WITH SIMULATION OPTIONS
function showWelcomeScreen() {
  welcomeScreen.style.display = 'block';
  orderingScreen.style.display = 'none';
  headerStatusArea.style.display = 'none';
  cartBottomBar.style.display = 'none';

  // Seeded simulation tables
  const tables = [
    { name: 'Bàn 1 (Trống / Sẵn sàng)', token: 'ban01_token_xyz' },
    { name: 'Bàn 2 (Thử nghiệm)', token: 'ban02_token_abc' },
    { name: 'Bàn 3 (Thử nghiệm)', token: 'ban03_token_def' },
    { name: 'Bàn 4 (Thử nghiệm)', token: 'ban04_token_ghi' },
    { name: 'Bàn 5 (Thử nghiệm)', token: 'ban05_token_jkl' }
  ];

  simulatedTables.innerHTML = '';
  tables.forEach((t, index) => {
    const btn = document.createElement('a');
    btn.href = `?qr_token=${t.token}`;
    btn.className = 'glass-card table-card';
    btn.style.textDecoration = 'none';
    btn.style.padding = '16px';
    btn.style.display = 'flex';
    btn.style.flexDirection = 'column';
    btn.style.alignItems = 'center';
    btn.style.justifyContent = 'center';
    
    const shortName = t.name.replace(`Bàn ${index + 1} `, '').replace(/[()]/g, '').trim();
    
    btn.innerHTML = `
      <div style="margin-bottom: 8px; color: var(--primary);">
        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"></path><path d="M7 2v20"></path><path d="M21 15V2v0a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"></path></svg>
      </div>
      <div style="font-size: 16px; font-weight: 800; color: var(--text-primary); margin-bottom: 4px;">Bàn ${index + 1}</div>
      <div style="font-size: 12px; color: var(--text-secondary); text-align: center;">${shortName}</div>
    `;
    
    simulatedTables.appendChild(btn);
  });
}

// INITIATE CUSTOMER WORKSPACE
async function initApp(qrToken) {
  const currentSessionToken = localStorage.getItem('restaurant_session_token') || '';
  
  try {
    const res = await fetch(`/api/tables/verify?qr_token=${qrToken}&current_token=${currentSessionToken}`);
    if (!res.ok) {
      const errorData = await res.json();
      showToast(errorData.error || 'Lỗi kiểm tra bàn ăn', 'error');
      setTimeout(showWelcomeScreen, 3000);
      return;
    }

    const data = await res.json();
    state.table = data.table;
    state.menu = data.menu;
    state.activeOrder = data.activeOrder;

    // Lưu session token vào localStorage
    localStorage.setItem('restaurant_session_token', state.table.session_token);

    // Hiển thị giao diện đặt món
    welcomeScreen.style.display = 'none';
    orderingScreen.style.display = 'block';
    headerStatusArea.style.display = 'flex';
    cartBottomBar.style.display = 'flex';

    // Cập nhật Header Table Badge
    tableNumberBadge.innerHTML = `<span class="status-dot"></span> Bàn: ${state.table.table_number}`;
    updateTableStatusUi(state.table.status);

    // Khởi tạo WebSocket kết nối thực tế
    initWebSocket();

    // Render Menu & Trạng thái order cũ nếu có
    renderMenu();
    renderActiveOrder();
    updateCartUi();

    // Nếu bàn ăn đang bị khoá chờ thanh toán
    if (state.table.status === 'pending_payment') {
      showPaymentOverlay();
    }

  } catch (err) {
    console.error('Initialization error:', err);
    showToast('Không thể kết nối đến máy chủ!', 'error');
  }
}

// UPDATE STATUS CLASS
function updateTableStatusUi(status) {
  tableNumberBadge.className = `status-badge ${status}`;
}

// INIT WEBSOCKET
function initWebSocket() {
  const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const wsUrl = `${wsProtocol}//${window.location.host}`;
  
  state.socket = new WebSocket(wsUrl);

  state.socket.onopen = () => {
    console.log('Connected to WebSocket Server');
    // Đăng ký vai trò với Server
    state.socket.send(JSON.stringify({
      type: 'register',
      role: 'customer',
      tableId: state.table.id,
      sessionToken: state.table.session_token
    }));
  };

  state.socket.onmessage = (event) => {
    const data = JSON.parse(event.data);
    console.log('WebSocket Message Received:', data);

    if (data.type === 'order_updated') {
      state.activeOrder = data.activeOrder;
      renderActiveOrder();
      
      if (data.item_completed_id) {
        showToast('Món ăn đã được chế biến xong! Chúc ngon miệng.', 'success');
        // Kích hoạt rung điện thoại nếu được hỗ trợ
        if (navigator.vibrate) navigator.vibrate(200);
      }
    } else if (data.type === 'table_pending_payment') {
      state.table.status = 'pending_payment';
      updateTableStatusUi('pending_payment');
      showPaymentOverlay();
    } else if (data.type === 'payment_completed') {
      showToast('Thanh toán hoàn tất! Xin cảm ơn quý khách.', 'success');
      localStorage.removeItem('restaurant_session_token');
      paymentOverlay.classList.remove('open');
      setTimeout(() => {
        window.location.href = window.location.pathname; // Quay lại màn hình quét QR ban đầu
      }, 3000);
    }
  };

  state.socket.onclose = () => {
    console.log('Disconnected from WebSocket. Retrying in 5s...');
    setTimeout(initWebSocket, 5000);
  };
}

// RENDER MENU ITEMS
function renderMenu() {
  menuItemsGrid.innerHTML = '';
  
  const filtered = state.selectedCategory === 'all'
    ? state.menu
    : state.menu.filter(item => item.category === state.selectedCategory);

  if (filtered.length === 0) {
    menuItemsGrid.innerHTML = `<p style="grid-column: 1/-1; text-align: center; color: var(--text-secondary);">Danh mục này hiện chưa có món.</p>`;
    return;
  }

  filtered.forEach(item => {
    const card = document.createElement('div');
    card.className = 'glass-card menu-card';
    
    // Tạo ảnh đại diện hoặc lấy ảnh mặc định
    const imgUrl = item.image_url 
      ? (item.image_url.startsWith('http') ? item.image_url : `/assets/${item.image_url}`) 
      : 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&auto=format&fit=crop&q=60';
    
    const cartItem = state.cart.find(c => c.id === item.id);
    let actionHtml = '';
    if (cartItem) {
      actionHtml = `
        <div class="cart-item-qty" style="background: rgba(0,0,0,0.05); border-radius: 0px; padding: 2px 6px;">
          <button class="qty-btn dec-qty-btn-menu" data-id="${item.id}" style="width: 24px; height: 24px; font-size: 14px; border: none; background: transparent; color: var(--text-primary);">-</button>
          <span style="font-size: 14px; font-weight: 700; width: 24px; text-align: center; display: inline-block; color: var(--text-primary);">${cartItem.quantity}</span>
          <button class="qty-btn inc-qty-btn-menu" data-id="${item.id}" style="width: 24px; height: 24px; font-size: 14px; border: none; background: transparent; color: var(--primary);">+</button>
        </div>
      `;
    } else {
      actionHtml = `<button class="btn btn-primary btn-sm add-to-cart-btn" data-id="${item.id}">+ Thêm</button>`;
    }

    card.innerHTML = `
      <img src="${imgUrl}" alt="${item.name}" class="menu-card-image" onerror="this.src='https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&auto=format&fit=crop&q=60'">
      <h3 class="menu-card-title">${item.name}</h3>
      <p class="menu-card-desc">${item.description || 'Món ăn đậm đà hương vị, chất lượng chuẩn nhà hàng.'}</p>
      <div class="menu-card-footer">
        <span class="menu-card-price">${formatPrice(item.price)}</span>
        ${actionHtml}
      </div>
    `;
    menuItemsGrid.appendChild(card);
  });

  // Gán sự kiện cho các nút thêm món
  document.querySelectorAll('.add-to-cart-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = parseInt(e.target.getAttribute('data-id'));
      addToCart(id);
    });
  });
  
  // Gán sự kiện cho nút cộng/trừ trong menu
  document.querySelectorAll('.dec-qty-btn-menu').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = parseInt(e.currentTarget.getAttribute('data-id'));
      removeFromCart(id);
    });
  });
  
  document.querySelectorAll('.inc-qty-btn-menu').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = parseInt(e.currentTarget.getAttribute('data-id'));
      addToCart(id, false); // false để không hiện toast khi cộng thêm
    });
  });
}

// CART MANAGEMENT
function addToCart(id, showToastMsg = true) {
  if (state.table && state.table.status === 'pending_payment') {
    showToast('Bàn đã bị khoá để chờ thanh toán, không thể đặt thêm món.', 'error');
    return;
  }

  const menuItem = state.menu.find(m => m.id === id);
  if (!menuItem) return;

  const cartItem = state.cart.find(c => c.id === id);
  if (cartItem) {
    cartItem.quantity += 1;
  } else {
    state.cart.push({
      id: menuItem.id,
      name: menuItem.name,
      price: menuItem.price,
      quantity: 1
    });
  }

  if (showToastMsg) {
    showToast(`Đã thêm ${menuItem.name} vào giỏ hàng`, 'success');
  }
  updateCartUi();
  renderMenu();
}

function removeFromCart(id) {
  const cartItem = state.cart.find(c => c.id === id);
  if (!cartItem) return;

  cartItem.quantity -= 1;
  if (cartItem.quantity <= 0) {
    state.cart = state.cart.filter(c => c.id !== id);
  }
  updateCartUi();
  renderCartModal();
  renderMenu();
}

function clearCart() {
  state.cart = [];
  updateCartUi();
  renderCartModal();
  renderMenu();
}

function updateCartUi() {
  const count = state.cart.reduce((sum, item) => sum + item.quantity, 0);
  const total = state.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  cartItemCount.textContent = count;
  cartTotalPrice.textContent = formatPrice(total);

  if (count > 0) {
    openCartCheckoutBtn.removeAttribute('disabled');
  } else {
    openCartCheckoutBtn.setAttribute('disabled', 'true');
  }

  // Cho phép yêu cầu thanh toán nếu đang có order hoạt động
  if (state.activeOrder && state.activeOrder.items && state.activeOrder.items.length > 0) {
    callCheckoutBtn.removeAttribute('disabled');
  } else {
    callCheckoutBtn.setAttribute('disabled', 'true');
  }
}

// RENDER CART INSIDE MODAL
function renderCartModal() {
  modalCartItems.innerHTML = '';
  
  if (state.cart.length === 0) {
    modalCartItems.innerHTML = `<p style="text-align: center; color: var(--text-secondary); padding: 24px 0;">Giỏ hàng đang trống.</p>`;
    modalCartTotalPrice.textContent = formatPrice(0);
    return;
  }

  const total = state.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  modalCartTotalPrice.textContent = formatPrice(total);

  state.cart.forEach(item => {
    const div = document.createElement('div');
    div.className = 'cart-item';
    div.innerHTML = `
      <div class="cart-item-info">
        <h4>${item.name}</h4>
        <span>${formatPrice(item.price)}</span>
      </div>
      <div class="cart-item-qty">
        <button class="qty-btn dec-qty-btn" data-id="${item.id}">-</button>
        <span>${item.quantity}</span>
        <button class="qty-btn inc-qty-btn" data-id="${item.id}">+</button>
      </div>
    `;
    modalCartItems.appendChild(div);
  });

  // Gán click sự kiện cộng trừ
  document.querySelectorAll('.dec-qty-btn').forEach(btn => {
    btn.addEventListener('click', (e) => removeFromCart(parseInt(btn.getAttribute('data-id'))));
  });
  document.querySelectorAll('.inc-qty-btn').forEach(btn => {
    btn.addEventListener('click', (e) => addToCart(parseInt(btn.getAttribute('data-id'))));
  });
}

// RENDER ACTIVE ORDERS AND STATUS ON TIMELINE
function renderActiveOrder() {
  const activeOrderTracking = document.getElementById('active-order-tracking');
  const trackingItemsContainer = document.getElementById('tracking-items-container');
  const orderStatusBadge = document.getElementById('order-status-badge');

  if (!state.activeOrder || !state.activeOrder.items || state.activeOrder.items.length === 0) {
    activeOrderTracking.style.display = 'none';
    return;
  }

  activeOrderTracking.style.display = 'block';
  trackingItemsContainer.innerHTML = '';

  // Phân loại tổng đơn
  const totalItemsCount = state.activeOrder.items.reduce((sum, i) => sum + i.quantity, 0);
  const doneItemsCount = state.activeOrder.items.filter(i => i.status === 'done').reduce((sum, i) => sum + i.quantity, 0);

  orderStatusBadge.textContent = `${doneItemsCount}/${totalItemsCount} Đã xong`;
  if (doneItemsCount === totalItemsCount) {
    orderStatusBadge.className = 'status-badge success';
    orderStatusBadge.innerHTML = `<span class="status-dot"></span> Đã phục vụ đủ`;
  } else {
    orderStatusBadge.className = 'status-badge serving';
    orderStatusBadge.innerHTML = `<span class="status-dot ping"></span> Đang nấu (${doneItemsCount}/${totalItemsCount})`;
  }

  state.activeOrder.items.forEach(item => {
    const div = document.createElement('div');
    div.className = `tracking-item ${item.status === 'done' ? 'done' : ''}`;
    
    const statusText = item.status === 'cooking' ? 'Đang chế biến' : 'Hoàn thành';
    
    div.innerHTML = `
      <div>
        <span class="tracking-item-name">${item.name}</span>
        <span class="tracking-item-qty">x${item.quantity}</span>
      </div>
      <span class="tracking-item-status ${item.status}">${statusText}</span>
    `;
    trackingItemsContainer.appendChild(div);
  });

  // Enable/disable nút checkout tương ứng
  updateCartUi();
}

// OVERLAY CHỜ THANH TOÁN
function showPaymentOverlay() {
  if (state.activeOrder) {
    paymentOverlayTotal.textContent = `Tổng thanh toán: ${formatPrice(state.activeOrder.total_amount)}`;
  }
  paymentOverlay.classList.add('open');
}

// BIND ALL EVENTS
function setupEventListeners() {
  // Category tabs click
  categoriesList.addEventListener('click', (e) => {
    if (e.target.classList.contains('category-tab')) {
      document.querySelectorAll('.category-tab').forEach(tab => tab.classList.remove('active'));
      e.target.classList.add('active');
      state.selectedCategory = e.target.getAttribute('data-category');
      renderMenu();
    }
  });

  // Giỏ hàng buttons
  openCartCheckoutBtn.addEventListener('click', () => {
    renderCartModal();
    cartModal.classList.add('open');
  });

  closeCartBtn.addEventListener('click', () => {
    cartModal.classList.remove('open');
  });

  clearCartBtn.addEventListener('click', () => {
    if (confirm('Bạn muốn xoá toàn bộ giỏ hàng?')) {
      clearCart();
    }
  });

  // Confirm đặt món (Gửi lên Server)
  confirmOrderBtn.addEventListener('click', async () => {
    if (state.cart.length === 0) return;
    
    confirmOrderBtn.setAttribute('disabled', 'true');
    confirmOrderBtn.textContent = 'Đang đặt...';

    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          table_id: state.table.id,
          session_token: state.table.session_token,
          cart: state.cart
        })
      });

      if (!res.ok) throw new Error('Lỗi đặt món từ server');

      const data = await res.json();
      state.activeOrder = data.activeOrder;
      
      // Xoá giỏ hàng sau khi đặt thành công
      state.cart = [];
      updateCartUi();
      cartModal.classList.remove('open');
      renderActiveOrder();
      
      showToast('Đã gửi món vào bếp chế biến thành công!', 'success');
    } catch (err) {
      console.error(err);
      showToast('Đặt món thất bại. Vui lòng thử lại!', 'error');
    } finally {
      confirmOrderBtn.removeAttribute('disabled');
      confirmOrderBtn.textContent = 'Xác nhận đặt món';
    }
  });

  // Yêu cầu thanh toán
  callCheckoutBtn.addEventListener('click', async () => {
    if (!state.activeOrder) return;
    if (!confirm('Bạn có chắc chắn muốn yêu cầu thanh toán cho hoá đơn này?')) return;

    callCheckoutBtn.setAttribute('disabled', 'true');

    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          table_id: state.table.id,
          session_token: state.table.session_token
        })
      });

      if (!res.ok) throw new Error('Lỗi gửi yêu cầu thanh toán');

      const data = await res.json();
      state.table.status = 'pending_payment';
      updateTableStatusUi('pending_payment');
      showPaymentOverlay();
      showToast('Yêu cầu thanh toán thành công!', 'success');
    } catch (err) {
      console.error(err);
      showToast('Gửi yêu cầu thất bại. Vui lòng gọi phục vụ!', 'error');
      callCheckoutBtn.removeAttribute('disabled');
    }
  });
}

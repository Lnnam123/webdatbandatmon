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
  setupNewModalsEvents();
});

// SHOW WELCOME SCREEN WITH SIMULATION OPTIONS
function showWelcomeScreen() {
  welcomeScreen.style.display = 'block';
  orderingScreen.style.display = 'none';
  if (headerStatusArea) headerStatusArea.style.display = 'none';
  cartBottomBar.style.display = 'none';

  // Seeded simulation tables
  const tables = [
    { name: 'Bàn 1 (Trống / Sẵn sàng)', token: 'datmonban1' },
    { name: 'Bàn 2 (Thử nghiệm)', token: 'datmonban2' },
    { name: 'Bàn 3 (Thử nghiệm)', token: 'datmonban3' },
    { name: 'Bàn 4 (Thử nghiệm)', token: 'datmonban4' },
    { name: 'Bàn 5 (Thử nghiệm)', token: 'datmonban5' }
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

    try {
      const catRes = await fetch('/api/categories');
      if (catRes.ok) {
        state.categories = await catRes.json();
        if (categoriesList) {
          categoriesList.innerHTML = `<button class="kiot-category-tab active" data-category="all">Tất cả</button>`;
          state.categories.forEach(cat => {
            const btn = document.createElement('button');
            btn.className = 'kiot-category-tab';
            btn.setAttribute('data-category', cat.ma_danh_muc);
            btn.textContent = cat.ten_danh_muc;
            categoriesList.appendChild(btn);
          });
          const toggleBtn = document.createElement('button');
          toggleBtn.className = 'kiot-category-tab';
          toggleBtn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>';
          categoriesList.appendChild(toggleBtn);
        }
      }
    } catch (e) {
      console.error('Không tải được danh mục', e);
    }

    // Lưu session token vào localStorage
    localStorage.setItem('restaurant_session_token', state.table.session_token);

    // Hiển thị giao diện đặt món
    welcomeScreen.style.display = 'none';
    orderingScreen.style.display = 'block';
    if (headerStatusArea) headerStatusArea.style.display = 'flex';
    cartBottomBar.style.display = 'flex';

    // Cập nhật Header Table Badge
    const kiotTableName = document.getElementById('kiot-table-name');
    if (kiotTableName) {
      kiotTableName.textContent = `${state.table.table_number}`;
    }
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
  if (tableNumberBadge) tableNumberBadge.className = `status-badge ${status}`;
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

  const totalMenuItemsLabel = document.getElementById('total-menu-items');
  if (totalMenuItemsLabel) {
    totalMenuItemsLabel.textContent = `Tất cả ${filtered.length} món`;
  }

  if (filtered.length === 0) {
    menuItemsGrid.innerHTML = `<p style="text-align: center; color: var(--text-secondary); width: 100%;">Danh mục này hiện chưa có món.</p>`;
    return;
  }

  filtered.forEach(item => {
    const card = document.createElement('div');
    card.className = 'kiot-menu-item';
    
    // Tạo ảnh đại diện hoặc lấy ảnh mặc định
    const imgUrl = item.image_url 
      ? (item.image_url.startsWith('http') || item.image_url.startsWith('/uploads') ? item.image_url : `/assets/${item.image_url}`) 
      : 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&auto=format&fit=crop&q=60';
    
    const cartItem = state.cart.find(c => c.id === item.id);
    let actionHtml = '';
    if (cartItem) {
      actionHtml = `
        <div class="kiot-qty-wrapper" style="border-radius: 20px; border: 1px solid #E85A23;">
          <button class="kiot-qty-btn dec-qty-btn-menu" data-id="${item.id}" style="color:#E85A23;">-</button>
          <div class="kiot-qty-value" style="color:#E85A23;">${cartItem.quantity}</div>
          <button class="kiot-qty-btn inc-qty-btn-menu" data-id="${item.id}" style="color:#E85A23;">+</button>
        </div>
      `;
    } else {
      actionHtml = `<button class="kiot-add-btn add-to-cart-btn" data-id="${item.id}"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg></button>`;
    }

    card.innerHTML = `
      <img src="${imgUrl}" alt="${item.name}" class="kiot-item-img" onerror="this.src='https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&auto=format&fit=crop&q=60'">
      <div class="kiot-item-info">
        <div>
          <div class="kiot-item-name">${item.name}</div>
        </div>
        <div class="kiot-item-actions" style="flex-direction: row; justify-content: space-between; align-items: center; margin-top: 12px;">
          <div class="kiot-item-price" style="flex: 1;">${formatPrice(item.price)}</div>
          ${actionHtml}
        </div>
      </div>
    `;
    menuItemsGrid.appendChild(card);
  });

  // Gán sự kiện cho các nút thêm món
  document.querySelectorAll('.add-to-cart-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = parseInt(e.currentTarget.getAttribute('data-id'));
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
  
  const count = state.cart.reduce((sum, item) => sum + item.quantity, 0);
  const total = state.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  
  document.getElementById('cart-total-items-count').textContent = count;
  document.getElementById('cart-footer-count').textContent = count;
  modalCartTotalPrice.textContent = formatPrice(total);

  if (state.cart.length === 0) {
    modalCartItems.innerHTML = `<p style="text-align: center; color: var(--text-secondary); padding: 24px 0;">Giỏ hàng đang trống.</p>`;
    return;
  }

  state.cart.forEach(item => {
    // Get image from state.menu
    const menuItem = state.menu.find(m => m.id === item.id);
    const imgUrl = menuItem && menuItem.image_url 
      ? (menuItem.image_url.startsWith('http') || menuItem.image_url.startsWith('/uploads') ? menuItem.image_url : `/assets/${menuItem.image_url}`) 
      : 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&auto=format&fit=crop&q=60';

    const div = document.createElement('div');
    div.className = 'kiot-cart-item';
    div.innerHTML = `
      <img src="${imgUrl}" class="kiot-cart-item-img" onerror="this.src='https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&auto=format&fit=crop&q=60'">
      <div class="kiot-cart-item-info">
        <div class="kiot-cart-item-name">${item.name}</div>
        <div class="kiot-cart-item-price">${formatPrice(item.price)}</div>
      </div>
      <div class="kiot-cart-item-actions">
        <button class="kiot-more-btn">...</button>
        <div class="kiot-modal-qty">
          <button class="kiot-modal-qty-btn dec-qty-btn" data-id="${item.id}">-</button>
          <span class="kiot-modal-qty-value">${item.quantity}</span>
          <button class="kiot-modal-qty-btn inc-qty-btn" data-id="${item.id}">+</button>
        </div>
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
  // Refresh the ordered items modal if it's currently open
  const orderedModal = document.getElementById('ordered-items-modal');
  if (orderedModal && orderedModal.style.display === 'flex') {
    openOrderedItems();
  }
  
  // Update button states if needed
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
    const target = e.target.closest('.kiot-category-tab');
    if (target && target.hasAttribute('data-category')) {
      document.querySelectorAll('.kiot-category-tab').forEach(tab => tab.classList.remove('active'));
      target.classList.add('active');
      state.selectedCategory = target.getAttribute('data-category');
      
      const groupTitle = document.getElementById('kiot-group-title');
      if (groupTitle) {
        groupTitle.textContent = target.textContent.toUpperCase();
      }

      renderMenu();
    }
  });

  // Thêm sự kiện đếm ký tự cho ghi chú
  const noteInput = document.getElementById('cart-note-input');
  const noteLength = document.getElementById('cart-note-length');
  if (noteInput && noteLength) {
    noteInput.addEventListener('input', () => {
      noteLength.textContent = noteInput.value.length;
    });
  }

  // Giỏ hàng buttons
  openCartCheckoutBtn.addEventListener('click', () => {
    renderCartModal();
    cartModal.style.display = 'flex';
  });

  closeCartBtn.addEventListener('click', () => {
    cartModal.style.display = 'none';
  });

  const addMoreBtn = document.getElementById('add-more-btn');
  if (addMoreBtn) {
    addMoreBtn.addEventListener('click', () => {
      cartModal.style.display = 'none';
    });
  }

  const clearCartBtnEl = document.getElementById('clear-cart-btn');
  if (clearCartBtnEl) {
    clearCartBtnEl.addEventListener('click', () => {
      if (confirm('Bạn muốn xoá toàn bộ giỏ hàng?')) {
        clearCart();
      }
    });
  }

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
      if (noteInput) noteInput.value = '';
      if (noteLength) noteLength.textContent = '0';
      updateCartUi();
      cartModal.style.display = 'none';
      renderActiveOrder();
      
      // Hiển thị success modal thay vì toast
      const successModal = document.getElementById('success-modal');
      const successBtn = document.getElementById('success-home-btn');
      
      if (successModal && successBtn) {
        successModal.style.display = 'flex';
        
        let timeLeft = 3;
        successBtn.textContent = `Về trang chủ (${timeLeft}s)`;
        
        const timer = setInterval(() => {
          timeLeft--;
          successBtn.textContent = `Về trang chủ (${timeLeft}s)`;
          
          if (timeLeft <= 0) {
            clearInterval(timer);
            successModal.style.display = 'none';
          }
        }, 1000);
        
        // Cho phép bấm đóng ngay lập tức
        successBtn.onclick = () => {
          clearInterval(timer);
          successModal.style.display = 'none';
        };
      } else {
        showToast('Đã gửi món vào bếp chế biến thành công!', 'success');
      }
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

// SETUP NEW MODALS (Search, Call Staff, Ordered Items)
function setupNewModalsEvents() {
  // Search
  const searchBtn = document.querySelector('.kiot-search-btn');
  const searchModal = document.getElementById('search-modal');
  const closeSearchBtn = document.getElementById('close-search-btn');
  const searchInput = document.getElementById('search-input');
  const searchResults = document.getElementById('search-results-list');

  if (searchBtn && searchModal) {
    searchBtn.addEventListener('click', () => {
      searchModal.style.display = 'flex';
      searchInput.value = '';
      searchResults.innerHTML = '<p style="text-align: center; color: var(--text-secondary); margin-top: 24px;">Nhập từ khoá để tìm món</p>';
      setTimeout(() => searchInput.focus(), 100);
    });
    closeSearchBtn.addEventListener('click', () => {
      searchModal.style.display = 'none';
    });

    searchInput.addEventListener('input', (e) => {
      const query = e.target.value.toLowerCase().trim();
      if (!query) {
        searchResults.innerHTML = '<p style="text-align: center; color: var(--text-secondary); margin-top: 24px;">Nhập từ khoá để tìm món</p>';
        return;
      }
      const results = state.menu.filter(m => m.name.toLowerCase().includes(query));
      if (results.length === 0) {
        searchResults.innerHTML = '<p style="text-align: center; color: var(--text-secondary); margin-top: 24px;">Không tìm thấy món ăn nào.</p>';
        return;
      }

      searchResults.innerHTML = '';
      results.forEach(item => {
        const div = document.createElement('div');
        div.className = 'kiot-menu-item';
        div.style.marginBottom = '12px';
        const imgUrl = item.image_url ? (item.image_url.startsWith('http') || item.image_url.startsWith('/uploads') ? item.image_url : `/assets/${item.image_url}`) : '';
        div.innerHTML = `
          <img src="${imgUrl}" class="kiot-item-img" onerror="this.src='https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&auto=format&fit=crop&q=60'">
          <div class="kiot-item-info">
            <div class="kiot-item-name">${item.name}</div>
            <div class="kiot-item-actions" style="flex-direction: row; justify-content: space-between; align-items: center; margin-top: 12px;">
              <div class="kiot-item-price" style="flex: 1;">${formatPrice(item.price)}</div>
              <button class="kiot-add-btn" onclick="addToCart(${item.id}); document.getElementById('search-modal').style.display='none';"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg></button>
            </div>
          </div>
        `;
        searchResults.appendChild(div);
      });
    });
  }

  // Call Staff
  const callBtns = document.querySelectorAll('.kiot-action-btn');
  const callStaffModal = document.getElementById('call-staff-modal');
  const closeCallBtn = document.getElementById('close-call-staff-btn');
  const submitCallBtn = document.getElementById('submit-call-staff-btn');
  const callNote = document.getElementById('call-staff-note');
  const callNoteLen = document.getElementById('call-staff-note-length');
  
  if (callBtns.length > 0 && callStaffModal) {
    callBtns[0].addEventListener('click', (e) => {
      // Vì "Món đã gọi" cũng nằm trong .kiot-action-btn nên cần lọc
      if (e.target.closest('span') && e.target.closest('span').textContent.includes('Gọi nhân viên')) {
        callStaffModal.style.display = 'block';
        if (callNote) callNote.value = '';
        if (callNoteLen) callNoteLen.textContent = '0';
      } else if (e.target.closest('span') && e.target.closest('span').textContent.includes('Món đã gọi')) {
        openOrderedItems();
      }
    });
    if (closeCallBtn) {
      closeCallBtn.addEventListener('click', () => callStaffModal.style.display = 'none');
    }
    if (callNote) {
      callNote.addEventListener('input', () => {
        if (callNoteLen) callNoteLen.textContent = callNote.value.length;
      });
    }
    if (submitCallBtn) {
      submitCallBtn.addEventListener('click', () => {
        callStaffModal.style.display = 'none';
        showToast('Đã gửi yêu cầu đến nhân viên thành công!', 'success');
      });
    }
  }

  // Ordered Items
  const orderedModal = document.getElementById('ordered-items-modal');
  const closeOrderedBtn = document.getElementById('close-ordered-btn');
  if (closeOrderedBtn) {
    closeOrderedBtn.addEventListener('click', () => {
      orderedModal.style.display = 'none';
    });
  }
}

function openOrderedItems() {
  const modal = document.getElementById('ordered-items-modal');
  const body = document.getElementById('ordered-items-body');
  const countEl = document.getElementById('ordered-total-count');
  const totalEl = document.getElementById('ordered-total-price');

  if (!modal || !body) return;

  if (!state.activeOrder || !state.activeOrder.items || state.activeOrder.items.length === 0) {
    body.innerHTML = '<p style="text-align: center; color: var(--text-secondary); margin-top: 24px;">Bạn chưa gọi món nào.</p>';
    if (countEl) countEl.textContent = '0';
    if (totalEl) totalEl.textContent = '0đ';
    modal.style.display = 'flex';
    return;
  }

  // Calculate totals
  const totalItems = state.activeOrder.items.reduce((s, i) => s + i.quantity, 0);
  const totalPrice = state.activeOrder.total_amount;
  if (countEl) countEl.textContent = totalItems;
  if (totalEl) totalEl.textContent = formatPrice(totalPrice);

  // Group items by time
  const groups = {};
  state.activeOrder.items.forEach(item => {
    let timestamp = item.created_at || state.activeOrder.created_at;
    if (!timestamp.endsWith('Z')) timestamp += 'Z';
    const dateObj = new Date(timestamp);
    const timeKey = dateObj.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

    if (!groups[timeKey]) {
      groups[timeKey] = {
        time: timeKey,
        items: [],
        totalItems: 0,
        totalPrice: 0,
        timestamp: dateObj.getTime()
      };
    }
    groups[timeKey].items.push(item);
    groups[timeKey].totalItems += item.quantity;
    groups[timeKey].totalPrice += (item.price * item.quantity);
  });

  let allGroupsHtml = '';
  Object.values(groups).sort((a,b) => b.timestamp - a.timestamp).forEach(g => {
    let itemsHtml = '';
    g.items.forEach((item, index) => {
      let badgeClass = 'kiot-badge-pending';
      let badgeText = 'Chờ xác nhận';
      if (item.status === 'cooking') {
        badgeClass = 'kiot-badge-cooking';
        badgeText = 'Đang chế biến';
      } else if (item.status === 'done') {
        badgeClass = 'kiot-badge-done';
        badgeText = 'Đã phục vụ';
      }
      
      const isLast = index === g.items.length - 1;
      const borderStyle = isLast ? '' : 'border-bottom: 1px solid #f0f0f0;';

      itemsHtml += `
        <div class="kiot-order-item-row" style="display: flex; align-items: center; padding: 12px 0; ${borderStyle}">
          <div style="font-size: 14px; font-weight: 500; width: 28px; color: var(--text-secondary);">${item.quantity}x</div>
          <div class="kiot-order-item-name" style="flex: 1; font-size: 15px; font-weight: 500; color: #333;">
            ${item.name}
          </div>
          <div class="kiot-order-badge ${badgeClass}" style="font-size: 12px; padding: 4px 8px; border-radius: 4px; font-weight: 600;">${badgeText}</div>
        </div>
      `;
    });

    allGroupsHtml += `
      <div class="kiot-order-group" style="background: #fff; border-radius: 12px; padding: 16px; margin-bottom: 16px; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
        <div class="kiot-order-group-header" style="display: flex; justify-content: space-between; font-weight: 700; font-size: 16px; margin-bottom: 12px; border-bottom: 1px solid #f0f0f0; padding-bottom: 12px; color: #000;">
          <span>${g.time} | ${g.totalItems} món</span>
          <span>${formatPrice(g.totalPrice)}</span>
        </div>
        <div class="kiot-order-group-items">
          ${itemsHtml}
        </div>
      </div>
    `;
  });

  body.innerHTML = allGroupsHtml;

  modal.style.display = 'flex';
}

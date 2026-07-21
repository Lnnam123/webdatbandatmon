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

// SHOW WELCOME SCREEN ONLY
function showWelcomeScreen() {
  welcomeScreen.style.display = 'block';
  orderingScreen.style.display = 'none';
  if (headerStatusArea) headerStatusArea.style.display = 'none';
  cartBottomBar.style.display = 'none';
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
          categoriesList.innerHTML = '';
          state.categories.forEach((cat, index) => {
            const btn = document.createElement('button');
            btn.className = 'kiot-category-tab' + (index === 0 ? ' active' : '');
            btn.setAttribute('data-category', cat.ma_danh_muc);
            btn.textContent = cat.ten_danh_muc;
            categoriesList.appendChild(btn);
          });
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
      
      if (data.item_cancelled_message) {
        showToast(data.item_cancelled_message, 'error');
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
  
  if (state.menu.length === 0) {
    menuItemsGrid.innerHTML = `<p style="text-align: center; color: var(--text-secondary); width: 100%;">Thực đơn hiện đang trống.</p>`;
    return;
  }

  const totalMenuItemsLabel = document.getElementById('total-menu-items');
  if (totalMenuItemsLabel) {
    totalMenuItemsLabel.textContent = `Tất cả ${state.menu.length} món`;
  }

  state.categories.forEach(cat => {
    const itemsInCat = state.menu.filter(item => item.category === cat.ma_danh_muc);
    if (itemsInCat.length === 0) return;

    const section = document.createElement('div');
    section.className = 'menu-group-section';
    section.id = `category-section-${cat.ma_danh_muc}`;
    
    const title = document.createElement('div');
    title.className = 'menu-group-title';
    title.textContent = cat.ten_danh_muc;
    section.appendChild(title);

    const list = document.createElement('div');
    list.style.display = 'flex';
    list.style.flexDirection = 'column';
    list.style.gap = '16px';

    itemsInCat.forEach(item => {
      const card = document.createElement('div');
      card.className = 'kiot-menu-item';
      
      const imgUrl = item.image_url 
        ? (item.image_url.startsWith('http') || item.image_url.startsWith('/uploads') ? item.image_url : `/assets/${item.image_url}`) 
        : 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&auto=format&fit=crop&q=60';
      
      const totalQty = state.cart.filter(c => c.id === item.id).reduce((sum, c) => sum + c.quantity, 0);
      let actionHtml = '';
      if (totalQty > 0) {
        // Show inline +/- button on the card for all items
        actionHtml = `
          <div class="kiot-qty-wrapper" style="border-radius: 20px; border: 1px solid #E85A23;">
            <button class="kiot-qty-btn dec-qty-btn-menu" data-id="${item.id}" style="color:#E85A23;">-</button>
            <div class="kiot-qty-value" style="color:#E85A23;">${totalQty}</div>
            <button class="kiot-qty-btn inc-qty-btn-menu" data-id="${item.id}" style="color:#E85A23;">+</button>
          </div>
        `;
      } else {
        const badgeHtml = totalQty > 0 ? `<div style="position:absolute; top:-8px; right:-8px; background:var(--danger); color:white; border-radius:50%; width:20px; height:20px; display:flex; align-items:center; justify-content:center; font-size:11px; font-weight:bold;">${totalQty}</div>` : '';
        actionHtml = `<div style="position:relative;"><button class="kiot-add-btn add-to-cart-btn" data-id="${item.id}"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg></button>${badgeHtml}</div>`;
      }
      
      const descHtml = item.description ? `<div style="font-size: 12px; color: var(--text-secondary); margin-top: 4px; line-height: 1.4;">${item.description}</div>` : '';

      card.innerHTML = `
        <img src="${imgUrl}" alt="${item.name}" class="kiot-item-img" onerror="this.src='https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&auto=format&fit=crop&q=60'">
        <div class="kiot-item-info">
          <div>
            <div class="kiot-item-name">${item.name}</div>
            ${descHtml}
          </div>
          <div class="kiot-item-actions" id="menu-action-${item.id}" style="flex-direction: row; justify-content: space-between; align-items: center; margin-top: 12px;">
            <div class="kiot-item-price" style="flex: 1;">${formatPrice(item.price)}</div>
            ${actionHtml}
          </div>
        </div>
      `;
      list.appendChild(card);
    });

    section.appendChild(list);
    menuItemsGrid.appendChild(section);
  });

  // Gán sự kiện cho các nút thêm món
  document.querySelectorAll('.add-to-cart-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = parseInt(e.currentTarget.getAttribute('data-id'));
      addToCart(id);
    });
  });
  document.querySelectorAll('.inc-qty-btn-menu').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = parseInt(e.currentTarget.getAttribute('data-id'));
      addToCart(id, false);
    });
  });
  document.querySelectorAll('.dec-qty-btn-menu').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = parseInt(e.currentTarget.getAttribute('data-id'));
      removeFromCart(id);
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
function updateItemCardUI(id) {
  const actionContainer = document.getElementById(`menu-action-${id}`);
  if (!actionContainer) return;
  
  const menuItem = state.menu.find(m => m.id === id);
  const totalQty = state.cart.filter(c => c.id === id).reduce((sum, c) => sum + c.quantity, 0);
  
  let actionHtml = '';
  if (totalQty > 0) {    actionHtml = `
      <div class="kiot-qty-wrapper" style="border-radius: 20px; border: 1px solid #E85A23;">
        <button class="kiot-qty-btn dec-qty-btn-menu" data-id="${id}" style="color:#E85A23;">-</button>
        <div class="kiot-qty-value" style="color:#E85A23;">${totalQty}</div>
        <button class="kiot-qty-btn inc-qty-btn-menu" data-id="${id}" style="color:#E85A23;">+</button>
      </div>
    `;
  } else {
    const badgeHtml = totalQty > 0 ? `<div style="position:absolute; top:-8px; right:-8px; background:var(--danger); color:white; border-radius:50%; width:20px; height:20px; display:flex; align-items:center; justify-content:center; font-size:11px; font-weight:bold;">${totalQty}</div>` : '';
    actionHtml = `<div style="position:relative;"><button class="kiot-add-btn add-to-cart-btn" data-id="${id}"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg></button>${badgeHtml}</div>`;
  }
  
  actionContainer.innerHTML = `
    <div class="kiot-item-price" style="flex: 1;">${formatPrice(menuItem.price)}</div>
    ${actionHtml}
  `;
  
  // Re-bind events for this specific card
  const addBtn = actionContainer.querySelector('.add-to-cart-btn');
  if (addBtn) addBtn.addEventListener('click', () => addToCart(id));
  
  const incBtn = actionContainer.querySelector('.inc-qty-btn-menu');
  if (incBtn) incBtn.addEventListener('click', () => addToCart(id, false));
  
  const decBtn = actionContainer.querySelector('.dec-qty-btn-menu');
  if (decBtn) decBtn.addEventListener('click', () => removeFromCart(id));
}

function addToCart(id, showToastMsg = true, sizeName = null, overridePrice = null) {
  if (state.table && state.table.status === 'pending_payment') {
    showToast('Bàn đã bị khoá để chờ thanh toán, không thể đặt thêm món.', 'error');
    return;
  }

  const menuItem = state.menu.find(m => m.id === id);
  if (!menuItem) return;

  // Handle Size Modal
  if (menuItem.sizes && menuItem.sizes.length > 0 && !sizeName) {
    showSizeSelectionModal(menuItem);
    return;
  }

  const cartItemId = sizeName ? `${id}_${sizeName}` : `${id}`;
  const cartItem = state.cart.find(c => c.cartItemId === cartItemId);
  
  // Calculate total quantity of this base item across all sizes for stock validation
  const currentTotalQty = state.cart.filter(c => c.id === id).reduce((sum, c) => sum + c.quantity, 0);
  
  if (menuItem.so_luong !== null && menuItem.so_luong !== undefined) {
    if (currentTotalQty + 1 > menuItem.so_luong) {
      showToast(`Món này chỉ còn ${menuItem.so_luong} phần!`, 'error');
      return;
    }
  }

  if (cartItem) {
    cartItem.quantity += 1;
  } else {
    state.cart.push({
      cartItemId: cartItemId,
      id: menuItem.id,
      name: sizeName ? `${menuItem.name} (${sizeName})` : menuItem.name,
      price: overridePrice !== null ? overridePrice : menuItem.price,
      quantity: 1,
      size_name: sizeName || null
    });
  }

  if (showToastMsg) {
    showToast(`Đã thêm ${sizeName ? menuItem.name + ' (' + sizeName + ')' : menuItem.name} vào giỏ hàng`, 'success');
  }
  updateCartUi();
  renderCartModal();
  updateItemCardUI(id);
}

function showSizeSelectionModal(menuItem) {
  const container = document.getElementById('size-options-container');
  container.innerHTML = '';
  
  menuItem.sizes.forEach((size, index) => {
    const isSelected = index === 0 ? 'checked' : '';
    container.innerHTML += `
      <label style="display:flex; justify-content:space-between; align-items:center; padding:12px; border:1px solid var(--border-color); border-radius:8px; cursor:pointer;">
        <div style="display:flex; align-items:center; gap:10px;">
          <input type="radio" name="selected_size" value="${size.ten_size}" data-price="${size.gia_tien}" style="width:18px; height:18px; accent-color:var(--primary);" ${isSelected}>
          <span style="font-size:15px; font-weight:600;">${size.ten_size}</span>
        </div>
        <div style="font-weight:700; color:var(--primary);">${formatPrice(size.gia_tien)}</div>
      </label>
    `;
  });
  
  const confirmBtn = document.getElementById('confirm-size-btn');
  confirmBtn.onclick = () => {
    const selected = document.querySelector('input[name="selected_size"]:checked');
    if (selected) {
      document.getElementById('size-selection-modal').style.display = 'none';
      addToCart(menuItem.id, true, selected.value, parseFloat(selected.getAttribute('data-price')));
    }
  };
  
  document.getElementById('size-selection-modal').style.display = 'flex';
}

function removeFromCart(cartItemId) {
  // If cartItemId is an integer, it means it was called from menu card which only passes `id`
  if (typeof cartItemId === 'number') {
    const itemInMenu = state.menu.find(m => m.id === cartItemId);
    if (itemInMenu && itemInMenu.sizes && itemInMenu.sizes.length > 0) {
      // Find the last added cart item with this base id
      const cartItems = state.cart.filter(c => c.id === cartItemId);
      if (cartItems.length > 0) {
        cartItemId = cartItems[cartItems.length - 1].cartItemId;
      } else {
        return;
      }
    } else {
      cartItemId = `${cartItemId}`;
    }
  }

  const cartItem = state.cart.find(c => c.cartItemId === cartItemId);
  if (!cartItem) return;

  const baseId = cartItem.id;

  cartItem.quantity -= 1;
  if (cartItem.quantity <= 0) {
    state.cart = state.cart.filter(c => c.cartItemId !== cartItemId);
  }
  updateCartUi();
  renderCartModal();
  updateItemCardUI(baseId);
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
      
    const displayName = item.name;

    const div = document.createElement('div');
    div.className = 'kiot-cart-item';
    div.innerHTML = `
      <img src="${imgUrl}" class="kiot-cart-item-img" onerror="this.src='https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&auto=format&fit=crop&q=60'">
      <div class="kiot-cart-item-info">
        <div class="kiot-cart-item-name">${displayName}</div>
        <div class="kiot-cart-item-price">${formatPrice(item.price)}</div>
      </div>
      <div class="kiot-cart-item-actions">
        <button class="kiot-more-btn">...</button>
        <div class="kiot-modal-qty">
          <button class="kiot-modal-qty-btn dec-qty-btn" data-cart-id="${item.cartItemId}">-</button>
          <span class="kiot-modal-qty-value">${item.quantity}</span>
          <button class="kiot-modal-qty-btn inc-qty-btn" data-id="${item.id}" data-size-name="${item.size_name || ''}" data-price="${item.price}">+</button>
        </div>
      </div>
    `;
    modalCartItems.appendChild(div);
  });

  // Gán click sự kiện cộng trừ
  document.querySelectorAll('.dec-qty-btn').forEach(btn => {
    btn.addEventListener('click', (e) => removeFromCart(btn.getAttribute('data-cart-id')));
  });
  document.querySelectorAll('.inc-qty-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = parseInt(btn.getAttribute('data-id'));
      const sizeName = btn.getAttribute('data-size-name') || null;
      const price = parseFloat(btn.getAttribute('data-price'));
      addToCart(id, false, sizeName, price);
    });
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
  if (state.activeOrder && state.activeOrder.items) {
    const totalPrice = state.activeOrder.items.reduce((s, i) => s + (i.status !== 'canceled' ? i.price * i.quantity : 0), 0);
    paymentOverlayTotal.textContent = `Tổng thanh toán: ${formatPrice(totalPrice)}`;
  }
  paymentOverlay.classList.add('open');
}

// BIND ALL EVENTS
function setupEventListeners() {
  // Category tabs click
  categoriesList.addEventListener('click', (e) => {
    const target = e.target.closest('.kiot-category-tab');
    if (target && target.hasAttribute('data-category')) {
      const catId = target.getAttribute('data-category');
      const section = document.getElementById(`category-section-${catId}`);
      if (section) {
        // Offset for the sticky header
        const y = section.getBoundingClientRect().top + window.scrollY - 60;
        window.scrollTo({ top: y, behavior: 'smooth' });
      }
    }
  });

  // ScrollSpy for categories
  window.addEventListener('scroll', () => {
    const sections = document.querySelectorAll('.menu-group-section');
    let currentId = '';
    
    sections.forEach(section => {
      const sectionTop = section.offsetTop;
      if (window.scrollY >= sectionTop - 70) {
        currentId = section.getAttribute('id').replace('category-section-', '');
      }
    });

    if (currentId) {
      const tabs = document.querySelectorAll('.kiot-category-tab');
      let activeTab = null;
      tabs.forEach(tab => {
        tab.classList.remove('active');
        if (tab.getAttribute('data-category') === currentId) {
          tab.classList.add('active');
          activeTab = tab;
        }
      });
      
      if (activeTab) {
        // Cuộn ngang thanh danh mục
        categoriesList.scrollTo({
          left: activeTab.offsetLeft - categoriesList.clientWidth / 2 + activeTab.clientWidth / 2,
          behavior: 'smooth'
        });
      }
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
          cart: state.cart,
          note: document.getElementById('cart-note-input') ? document.getElementById('cart-note-input').value : ''
        })
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Lỗi đặt món từ server');
      }

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
      showToast(err.message || 'Đặt món thất bại. Vui lòng thử lại!', 'error');
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
  const totalItems = state.activeOrder.items.reduce((s, i) => s + (i.status !== 'canceled' ? i.quantity : 0), 0);
  const totalPrice = state.activeOrder.items.reduce((s, i) => s + (i.status !== 'canceled' ? i.price * i.quantity : 0), 0);
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
    if (item.status !== 'canceled') {
      groups[timeKey].totalItems += item.quantity;
      groups[timeKey].totalPrice += (item.price * item.quantity);
    }
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
      } else if (item.status === 'canceled') {
        badgeClass = 'kiot-badge-canceled';
        badgeText = 'Đã hủy';
      }
      
      const isLast = index === g.items.length - 1;
      const borderStyle = isLast ? '' : 'border-bottom: 1px solid #f0f0f0;';

      itemsHtml += `
        <div class="kiot-order-item-row" style="display: flex; align-items: center; padding: 12px 0; ${borderStyle}">
          <div style="font-size: 14px; font-weight: 500; width: 28px; color: var(--text-secondary);">${item.quantity}x</div>
          <div class="kiot-order-item-name" style="flex: 1; font-size: 15px; font-weight: 500; color: #333;">
            ${item.ten_size ? item.name + ' (' + item.ten_size + ')' : item.name}
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

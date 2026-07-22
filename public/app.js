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
        // Thêm danh mục Ảo "Bán chạy nhất" vào đầu danh sách
        state.categories.unshift({ ma_danh_muc: 'best-seller', ten_danh_muc: '🔥 Bán chạy nhất' });

        if (categoriesList) {
          categoriesList.innerHTML = '';
          
          const allBtn = document.createElement('button');
          allBtn.className = 'kiot-category-tab active';
          allBtn.setAttribute('data-category', 'all');
          allBtn.textContent = 'Tất cả';
          categoriesList.appendChild(allBtn);

          state.categories.forEach((cat) => {
            const btn = document.createElement('button');
            btn.className = 'kiot-category-tab';
            btn.setAttribute('data-category', cat.ma_danh_muc);
            btn.textContent = cat.ma_danh_muc === 'best-seller' ? '🔥 Bán chạy' : cat.ten_danh_muc;
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
    let itemsInCat = [];
    if (cat.ma_danh_muc === 'best-seller') {
      itemsInCat = state.menu.filter(i => i.da_ban > 0).sort((a, b) => b.da_ban - a.da_ban).slice(0, 5);
    } else {
      itemsInCat = state.menu.filter(item => item.category === cat.ma_danh_muc);
    }
    
    // Luôn render section, nếu trống thì sẽ có thông báo
    // (Bởi vì nếu không render, khi bấm tab sẽ bị màn hình trắng)

    const section = document.createElement('div');
    section.className = 'menu-group-section';
    section.id = `category-section-${cat.ma_danh_muc}`;
    
    const title = document.createElement('div');
    title.className = 'menu-group-title';
    title.textContent = cat.ten_danh_muc;
    section.appendChild(title);

    const list = document.createElement('div');
    list.className = 'kiot-menu-section-list';

    if (itemsInCat.length === 0) {
      list.innerHTML = `<p style="text-align: center; color: var(--text-secondary); width: 100%; padding: 20px 0;">Chưa có món nào trong danh mục này.</p>`;
    } else {
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
    }

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
      document.body.style.overflow = '';
      addToCart(menuItem.id, true, selected.value, parseFloat(selected.getAttribute('data-price')));
    }
  };
  
  document.getElementById('size-selection-modal').style.display = 'flex';
  document.body.style.overflow = 'hidden';
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
      
      // Update active tab manually here to avoid delay
      document.querySelectorAll('.kiot-category-tab').forEach(tab => {
        tab.classList.remove('active');
      });
      target.classList.add('active');

      // Scroll categories list to center the active tab horizontally
      categoriesList.scrollTo({
        left: target.offsetLeft - categoriesList.clientWidth / 2 + target.clientWidth / 2,
        behavior: 'smooth'
      });
      
      // Scroll to section
      if (catId === 'all') {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        const section = document.getElementById(`category-section-${catId}`);
        if (section) {
          // Offset for any potential sticky headers
          const y = section.getBoundingClientRect().top + window.scrollY - 80;
          window.scrollTo({ top: y, behavior: 'smooth' });
        }
      }
    }
  });

  // ScrollSpy for categories
  window.addEventListener('scroll', () => {
    const sections = document.querySelectorAll('.menu-group-section');
    let currentActiveId = 'all';
    
    // Header offset + a little extra to trigger earlier
    const scrollPosition = window.scrollY + 100;

    sections.forEach(section => {
      const sectionTop = section.offsetTop;
      const sectionHeight = section.offsetHeight;
      if (scrollPosition >= sectionTop && scrollPosition < sectionTop + sectionHeight) {
        currentActiveId = section.id.replace('category-section-', '');
      }
    });

    // Handle 'all' tab if scroll is at the very top (before any section)
    if (window.scrollY < 50) {
      currentActiveId = 'all';
    }

    // Only update DOM if changed
    const activeTab = document.querySelector('.kiot-category-tab.active');
    const activeCatId = activeTab ? activeTab.getAttribute('data-category') : null;
    
    if (currentActiveId !== activeCatId) {
      document.querySelectorAll('.kiot-category-tab').forEach(tab => {
        tab.classList.remove('active');
        if (tab.getAttribute('data-category') === currentActiveId) {
          tab.classList.add('active');
          // Scroll the tab container to make sure active tab is visible
          categoriesList.scrollTo({
            left: tab.offsetLeft - categoriesList.clientWidth / 2 + tab.clientWidth / 2,
            behavior: 'smooth'
          });
        }
      });
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

  // View toggle buttons
  const btnListView = document.getElementById('btn-list-view');
  const btnGridView = document.getElementById('btn-grid-view');
  if (btnListView && btnGridView) {
    btnListView.addEventListener('click', () => {
      menuItemsGrid.classList.remove('grid-view');
      btnGridView.classList.remove('active');
      btnListView.classList.add('active');
    });
    btnGridView.addEventListener('click', () => {
      menuItemsGrid.classList.add('grid-view');
      btnListView.classList.remove('active');
      btnGridView.classList.add('active');
    });
  }

  // Giỏ hàng buttons
  openCartCheckoutBtn.addEventListener('click', () => {
    renderCartModal();
    cartModal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
  });

  closeCartBtn.addEventListener('click', () => {
    cartModal.style.display = 'none';
    document.body.style.overflow = '';
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
      document.body.style.overflow = '';
      renderMenu(); // Reset số lượng trên menu
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
      document.body.style.overflow = 'hidden';
      searchInput.value = '';
      searchResults.innerHTML = '<p style="text-align: center; color: var(--text-secondary); margin-top: 24px;">Nhập từ khoá để tìm món</p>';
      setTimeout(() => searchInput.focus(), 100);
    });
    closeSearchBtn.addEventListener('click', () => {
      searchModal.style.display = 'none';
      document.body.style.overflow = '';
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
              <button class="kiot-add-btn" onclick="addToCart(${item.id}); document.getElementById('search-modal').style.display='none'; document.body.style.overflow='';"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg></button>
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
        document.body.style.overflow = 'hidden';
        if (callNote) callNote.value = '';
        if (callNoteLen) callNoteLen.textContent = '0';
      } else if (e.target.closest('span') && e.target.closest('span').textContent.includes('Món đã gọi')) {
        openOrderedItems();
      }
    });
    if (closeCallBtn) {
      closeCallBtn.addEventListener('click', () => { callStaffModal.style.display = 'none'; document.body.style.overflow = ''; });
    }
    if (callNote) {
      callNote.addEventListener('input', () => {
        if (callNoteLen) callNoteLen.textContent = callNote.value.length;
      });
    }
    if (submitCallBtn) {
      submitCallBtn.addEventListener('click', () => {
        const reasonRadio = document.querySelector('input[name="call_reason"]:checked');
        let noteStr = callNote ? callNote.value.trim() : '';
        
        if (reasonRadio && reasonRadio.value === 'Thanh toán') {
          // If they selected checkout, we can trigger the checkout API instead so it shows the green UI!
          // But wait, the API `/api/checkout` requires session_token and activeOrder.
          if (state.activeOrder) {
            fetch('/api/checkout', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                table_id: state.table.id,
                session_token: state.table.session_token
              })
            }).then(() => {
              callStaffModal.style.display = 'none';
              document.body.style.overflow = '';
              showToast('Đã gửi yêu cầu thanh toán!', 'success');
              state.table.status = 'pending_payment';
              updateTableStatusUi('pending_payment');
            }).catch(err => {
              console.error(err);
              showToast('Lỗi gửi yêu cầu', 'error');
            });
            return;
          } else {
             noteStr = 'Yêu cầu thanh toán' + (noteStr ? ' - ' + noteStr : '');
          }
        } else {
           if (!noteStr) noteStr = 'Gọi nhân viên';
        }

        fetch('/api/call-staff', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            table_id: state.table.id,
            note: noteStr
          })
        }).then(() => {
          callStaffModal.style.display = 'none';
          document.body.style.overflow = '';
          showToast('Đã gửi yêu cầu đến nhân viên thành công!', 'success');
        }).catch(err => {
          console.error(err);
          showToast('Có lỗi xảy ra, vui lòng thử lại', 'error');
        });
      });
    }
  }

  // Ordered Items
  const orderedModal = document.getElementById('ordered-items-modal');
  const closeOrderedBtn = document.getElementById('close-ordered-btn');
  if (closeOrderedBtn) {
    closeOrderedBtn.addEventListener('click', () => {
      orderedModal.style.display = 'none';
      document.body.style.overflow = '';
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
  const sortedGroups = Object.values(groups).sort((a,b) => a.timestamp - b.timestamp);
  sortedGroups.forEach((g, rIdx) => {
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
      const itemTotal = formatPrice(item.price * item.quantity);

      itemsHtml += `
        <div class="kiot-order-item-row" style="display: flex; align-items: center; padding: 12px 0; ${borderStyle}">
          <div style="font-size: 14px; font-weight: 500; width: 28px; color: var(--text-secondary);">${item.quantity}x</div>
          <div class="kiot-order-item-name" style="flex: 1; font-size: 15px; font-weight: 500; color: #333;">
            <div style="margin-bottom: 4px;">${item.ten_size ? item.name + ' (' + item.ten_size + ')' : item.name}</div>
            <div style="font-size: 13px; color: var(--text-secondary);">${formatPrice(item.price)}</div>
          </div>
          <div style="text-align: right;">
            <div style="font-weight: 600; font-size: 14px; margin-bottom: 4px; color: #000;">${itemTotal}</div>
            <div class="kiot-order-badge ${badgeClass}" style="font-size: 11px; padding: 2px 6px; border-radius: 4px; font-weight: 600; display: inline-block;">${badgeText}</div>
          </div>
        </div>
      `;
    });

    let noteHtml = '';
    const groupNote = g.items[0].item_note;
    if (groupNote) {
       noteHtml = `<div style="font-size: 13px; color: #b45309; background: #fef3c7; padding: 6px 10px; margin-bottom: 12px; border-radius: 4px; display:flex; align-items:center;">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 4px;"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
          Ghi chú: <b style="margin-left:4px;">${groupNote}</b>
       </div>`;
    }

    allGroupsHtml += `
      <div class="kiot-order-group" style="background: #fff; border-radius: 12px; padding: 16px; margin-bottom: 16px; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
        <div class="kiot-order-group-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; border-bottom: 1px solid #f0f0f0; padding-bottom: 12px; color: #000;">
          <div>
            <div style="font-weight: 700; font-size: 16px;">Lượt ${rIdx + 1}</div>
            <div style="font-size: 12px; color: var(--text-secondary); margin-top: 2px;">${g.time} | ${g.totalItems} món</div>
          </div>
          <div style="font-weight: 700; font-size: 16px;">${formatPrice(g.totalPrice)}</div>
        </div>
        ${noteHtml}
        <div class="kiot-order-group-items">
          ${itemsHtml}
        </div>
      </div>
    `;
  });

  body.innerHTML = allGroupsHtml;

  modal.style.display = 'flex';
  document.body.style.overflow = 'hidden';
}

import sqlite3 from 'sqlite3';
import { promisify } from 'util';

// Mở kết nối đến database file
const db = new sqlite3.Database('./restaurant.db', (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
  } else {
    console.log('Connected to SQLite database.');
  }
});

// Chuyển các hàm SQLite callback thành Promises để dùng async/await
const dbRun = promisify(db.run.bind(db));
const dbGet = promisify(db.get.bind(db));
const dbAll = promisify(db.all.bind(db));

// Khởi tạo các bảng
export async function initDb() {
  await dbRun(`
    CREATE TABLE IF NOT EXISTS tables (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      table_number TEXT UNIQUE NOT NULL,
      qr_token TEXT UNIQUE NOT NULL,
      status TEXT NOT NULL DEFAULT 'available', -- available, serving, pending_payment
      current_session_token TEXT
    )
  `);

  await dbRun(`
    CREATE TABLE IF NOT EXISTS menu_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      price REAL NOT NULL,
      category TEXT NOT NULL, -- appetizer, main, dessert, drink
      image_url TEXT,
      description TEXT,
      is_available INTEGER NOT NULL DEFAULT 1 -- 1: còn, 0: hết
    )
  `);

  await dbRun(`
    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      table_id INTEGER NOT NULL,
      session_token TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending', -- pending, cooking, done, paid
      total_amount REAL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (table_id) REFERENCES tables(id)
    )
  `);

  await dbRun(`
    CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL,
      menu_item_id INTEGER NOT NULL,
      quantity INTEGER NOT NULL,
      price REAL NOT NULL, -- giá tại thời điểm đặt
      status TEXT NOT NULL DEFAULT 'cooking', -- cooking, done
      FOREIGN KEY (order_id) REFERENCES orders(id),
      FOREIGN KEY (menu_item_id) REFERENCES menu_items(id)
    )
  `);

  console.log('Database tables verified/created successfully.');
}

// Lấy thông tin bàn bằng qr_token
export async function getTableByQrToken(qrToken) {
  return await dbGet('SELECT * FROM tables WHERE qr_token = ?', [qrToken]);
}

// Cập nhật phiên làm việc của bàn
export async function updateTableSession(tableId, sessionToken) {
  return await dbRun(
    'UPDATE tables SET current_session_token = ? WHERE id = ?',
    [sessionToken, tableId]
  );
}

// Tạo đơn hàng mới hoặc thêm vào đơn hiện tại
export async function createOrder(tableId, sessionToken, cart) {
  let totalAmount = 0;
  for (const item of cart) {
    const menuItem = await dbGet('SELECT price FROM menu_items WHERE id = ?', [item.id]);
    if (menuItem) {
      totalAmount += menuItem.price * item.quantity;
    }
  }

  // Kiểm tra xem đã có order active chưa
  let order = await dbGet(
    'SELECT id FROM orders WHERE table_id = ? AND session_token = ? AND status != "paid" ORDER BY id DESC LIMIT 1',
    [tableId, sessionToken]
  );

  let orderId;
  if (order) {
    orderId = order.id;
    // Cập nhật tổng tiền
    await dbRun(
      'UPDATE orders SET total_amount = total_amount + ? WHERE id = ?',
      [totalAmount, orderId]
    );
  } else {
    // 1. Chèn đơn hàng mới
    orderId = await new Promise((resolve, reject) => {
      db.run(
        'INSERT INTO orders (table_id, session_token, status, total_amount) VALUES (?, ?, ?, ?)',
        [tableId, sessionToken, 'pending', totalAmount],
        function (err) {
          if (err) reject(err);
          else resolve(this.lastID);
        }
      );
    });
  }

  // 2. Chèn các món ăn trong giỏ hàng
  for (const item of cart) {
    const menuItem = await dbGet('SELECT price FROM menu_items WHERE id = ?', [item.id]);
    if (menuItem) {
      await dbRun(
        'INSERT INTO order_items (order_id, menu_item_id, quantity, price, status) VALUES (?, ?, ?, ?, ?)',
        [orderId, item.id, item.quantity, menuItem.price, 'cooking']
      );
    }
  }

  // 3. Cập nhật trạng thái bàn ăn thành 'serving'
  await dbRun(
    'UPDATE tables SET status = "serving", current_session_token = ? WHERE id = ?',
    [sessionToken, tableId]
  );

  return orderId;
}

// Lấy thông tin đơn hàng hiện tại của bàn
export async function getActiveOrderForTable(tableId, sessionToken) {
  const order = await dbGet(
    'SELECT * FROM orders WHERE table_id = ? AND session_token = ? AND status != "paid" ORDER BY id DESC LIMIT 1',
    [tableId, sessionToken]
  );
  if (!order) return null;

  const items = await dbAll(
    `SELECT oi.id as order_item_id, oi.quantity, oi.price, oi.status, mi.id as menu_item_id, mi.name, mi.image_url, mi.category 
     FROM order_items oi
     JOIN menu_items mi ON oi.menu_item_id = mi.id
     WHERE oi.order_id = ?`,
    [order.id]
  );

  order.items = items;
  return order;
}

// Cập nhật trạng thái chi tiết món ăn trong đơn (dành cho đầu bếp)
export async function updateOrderItemStatus(orderItemId, status) {
  await dbRun('UPDATE order_items SET status = ? WHERE id = ?', [status, orderItemId]);

  // Kiểm tra xem tất cả các món trong order đã 'done' chưa. Nếu rồi thì cập nhật trạng thái order
  const item = await dbGet('SELECT order_id FROM order_items WHERE id = ?', [orderItemId]);
  if (item) {
    const activeItems = await dbAll('SELECT status FROM order_items WHERE order_id = ?', [item.order_id]);
    const allDone = activeItems.every(i => i.status === 'done');
    if (allDone) {
      await dbRun('UPDATE orders SET status = "done" WHERE id = ?', [item.order_id]);
    }
  }
}

// Yêu cầu thanh toán
export async function checkoutTable(tableId) {
  // Cập nhật trạng thái bàn thành 'pending_payment'
  await dbRun('UPDATE tables SET status = "pending_payment" WHERE id = ?', [tableId]);

  // Lấy chi tiết đơn hàng hiện tại
  const table = await dbGet('SELECT current_session_token FROM tables WHERE id = ?', [tableId]);
  if (table && table.current_session_token) {
    const order = await getActiveOrderForTable(tableId, table.current_session_token);
    return order;
  }
  return null;
}

// Xác nhận thanh toán từ thu ngân
export async function confirmPayment(tableId) {
  const table = await dbGet('SELECT current_session_token FROM tables WHERE id = ?', [tableId]);
  if (table) {
    // 1. Cập nhật các order của phiên hiện tại sang 'paid'
    if (table.current_session_token) {
      await dbRun(
        'UPDATE orders SET status = "paid" WHERE table_id = ? AND session_token = ?',
        [tableId, table.current_session_token]
      );
    }

    // 2. Trả bàn về trạng thái 'available' (trống) và xóa session token
    await dbRun(
      'UPDATE tables SET status = "available", current_session_token = NULL WHERE id = ?',
      [tableId]
    );
    return true;
  }
  return false;
}

// Lấy danh sách thực đơn
export async function getMenuItems() {
  return await dbAll('SELECT * FROM menu_items WHERE is_available = 1');
}

// Lấy danh sách món ăn cần chế biến (dành cho Đầu bếp)
export async function getChefActiveItems() {
  return await dbAll(`
    SELECT oi.id as order_item_id, oi.quantity, oi.status, mi.name, t.table_number, t.id as table_id, o.session_token, o.id as order_id, o.created_at
    FROM order_items oi
    JOIN menu_items mi ON oi.menu_item_id = mi.id
    JOIN orders o ON oi.order_id = o.id
    JOIN tables t ON o.table_id = t.id
    WHERE oi.status = 'cooking' AND o.status != 'paid'
    ORDER BY o.created_at ASC
  `);
}

// Lấy tất cả thông tin bàn (dành cho Thu ngân)
export async function getCashierTables() {
  const tables = await dbAll('SELECT * FROM tables ORDER BY table_number ASC');
  for (const table of tables) {
    if (table.status !== 'available' && table.current_session_token) {
      table.active_order = await getActiveOrderForTable(table.id, table.current_session_token);
    } else {
      table.active_order = null;
    }
  }
  return tables;
}

export { db };

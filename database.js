import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';

let pool;

export async function initDb() {
  try {
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: ''
    });
    
    await connection.query(`CREATE DATABASE IF NOT EXISTS restaurant_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    await connection.end();

    pool = mysql.createPool({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'restaurant_db',
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    });

    await pool.query(`
      CREATE TABLE IF NOT EXISTS tai_khoan (
        id INT AUTO_INCREMENT PRIMARY KEY,
        ten_dang_nhap VARCHAR(255) UNIQUE NOT NULL,
        mat_khau VARCHAR(255) NOT NULL,
        vai_tro VARCHAR(50) DEFAULT 'admin'
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS ban_an (
        id INT AUTO_INCREMENT PRIMARY KEY,
        ten_ban VARCHAR(255) UNIQUE NOT NULL,
        ma_duong_dan VARCHAR(255) UNIQUE NOT NULL,
        trang_thai VARCHAR(50) NOT NULL DEFAULT 'available',
        ma_phien_hien_tai VARCHAR(255)
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS danh_muc (
        id INT AUTO_INCREMENT PRIMARY KEY,
        ma_danh_muc VARCHAR(50) UNIQUE NOT NULL,
        ten_danh_muc VARCHAR(255) NOT NULL
      )
    `);

    const [catRows] = await pool.query('SELECT COUNT(*) as count FROM danh_muc');
    if (catRows[0].count === 0) {
      const defaultCats = [
        ['appetizer', 'Đồ ăn'],
        ['main', 'Món chính'],
        ['drink', 'Đồ uống'],
        ['dessert', 'Tráng miệng']
      ];
      for (const cat of defaultCats) {
        await pool.query('INSERT INTO danh_muc (ma_danh_muc, ten_danh_muc) VALUES (?, ?)', cat);
      }
    }

    await pool.query(`
      CREATE TABLE IF NOT EXISTS thuc_don (
        id INT AUTO_INCREMENT PRIMARY KEY,
        ten_mon VARCHAR(255) NOT NULL,
        gia_tien DOUBLE NOT NULL,
        loai_mon VARCHAR(50) NOT NULL,
        anh_minh_hoa TEXT,
        mo_ta TEXT,
        con_hang TINYINT NOT NULL DEFAULT 1
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS don_hang (
        id INT AUTO_INCREMENT PRIMARY KEY,
        id_ban INT NOT NULL,
        ma_phien VARCHAR(255) NOT NULL,
        trang_thai VARCHAR(50) NOT NULL DEFAULT 'pending',
        tong_tien DOUBLE DEFAULT 0,
        ghi_chu TEXT,
        ngay_tao DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (id_ban) REFERENCES ban_an(id)
      )
    `);

    // Tự động thêm cột ghi_chu nếu chưa có (dành cho db đã tạo trước đó)
    try {
      await pool.query(`ALTER TABLE don_hang ADD COLUMN ghi_chu TEXT`);
    } catch (e) {
      // Bỏ qua lỗi nếu cột đã tồn tại
    }

    await pool.query(`
      CREATE TABLE IF NOT EXISTS chi_tiet_don_hang (
        id INT AUTO_INCREMENT PRIMARY KEY,
        id_don_hang INT NOT NULL,
        id_mon_an INT NOT NULL,
        so_luong INT NOT NULL,
        gia_ban DOUBLE NOT NULL,
        trang_thai VARCHAR(50) NOT NULL DEFAULT 'cooking',
        ngay_tao DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (id_don_hang) REFERENCES don_hang(id) ON DELETE CASCADE,
        FOREIGN KEY (id_mon_an) REFERENCES thuc_don(id) ON DELETE CASCADE
      )
    `);

    console.log('MySQL Database tables verified/created successfully.');
  } catch (err) {
    console.error('MySQL Init Error:', err);
  }
}

// --- HELPER FUNCTIONS ---
async function dbGet(sql, params = []) {
  if (!pool) throw new Error('Database not initialized');
  const [rows] = await pool.query(sql, params);
  return rows.length > 0 ? rows[0] : null;
}

async function dbAll(sql, params = []) {
  if (!pool) throw new Error('Database not initialized');
  const [rows] = await pool.query(sql, params);
  return rows;
}

async function dbRun(sql, params = []) {
  if (!pool) throw new Error('Database not initialized');
  const [result] = await pool.query(sql, params);
  return result;
}

export function getPool() {
  return pool;
}

// --- AUTH FUNCTIONS ---
export async function getUserByUsername(username) {
  return await dbGet('SELECT id, ten_dang_nhap as username, mat_khau as password, vai_tro as role FROM tai_khoan WHERE ten_dang_nhap = ?', [username]);
}
export async function createUser(username, password) {
  return await dbRun('INSERT INTO tai_khoan (ten_dang_nhap, mat_khau) VALUES (?, ?)', [username, password]);
}
export async function createUserWithRole(username, password, role) {
  return await dbRun('INSERT INTO tai_khoan (ten_dang_nhap, mat_khau, vai_tro) VALUES (?, ?, ?)', [username, password, role]);
}
export async function getAllUsers() {
  return await dbAll('SELECT id, ten_dang_nhap as username, vai_tro as role FROM tai_khoan ORDER BY id ASC');
}
export async function deleteUser(id) {
  return await dbRun('DELETE FROM tai_khoan WHERE id = ?', [id]);
}
export async function updateUser(id, password, role) {
  if (password) {
    return await dbRun('UPDATE tai_khoan SET mat_khau = ?, vai_tro = ? WHERE id = ?', [password, role, id]);
  } else {
    return await dbRun('UPDATE tai_khoan SET vai_tro = ? WHERE id = ?', [role, id]);
  }
}

// --- APP FUNCTIONS ---
export async function getTableById(id) {
  return await dbGet('SELECT id, ten_ban as table_number, ma_duong_dan as qr_token, trang_thai as status, ma_phien_hien_tai as current_session_token FROM ban_an WHERE id = ?', [id]);
}

export async function addTable(tableNumber, qrToken) {
  return await dbRun('INSERT INTO ban_an (ten_ban, ma_duong_dan, trang_thai) VALUES (?, ?, ?)', [tableNumber, qrToken, 'available']);
}

export async function updateTable(id, tableNumber, qrToken) {
  return await dbRun('UPDATE ban_an SET ten_ban = ?, ma_duong_dan = ? WHERE id = ?', [tableNumber, qrToken, id]);
}

export async function deleteTable(id) {
  return await dbRun('DELETE FROM ban_an WHERE id = ?', [id]);
}

export async function getTableByQrToken(qrToken) {
  return await dbGet('SELECT id, ten_ban as table_number, ma_duong_dan as qr_token, trang_thai as status, ma_phien_hien_tai as current_session_token FROM ban_an WHERE ma_duong_dan = ?', [qrToken]);
}

export async function updateTableSession(tableId, sessionToken) {
  return await dbRun('UPDATE ban_an SET ma_phien_hien_tai = ? WHERE id = ?', [sessionToken, tableId]);
}

export async function createOrder(tableId, sessionToken, cart, note = '') {
  const table = await dbGet('SELECT trang_thai FROM ban_an WHERE id = ?', [tableId]);
  if (!table) throw new Error('Bàn không tồn tại');

  const menuItems = await dbAll('SELECT id, gia_tien FROM thuc_don');
  const priceMap = {};
  menuItems.forEach(item => priceMap[item.id] = item.gia_tien);

  let totalAmount = 0;
  cart.forEach(item => {
    const p = priceMap[item.id] || 0;
    totalAmount += p * item.quantity;
  });

  let order = await dbGet(
    'SELECT id, tong_tien FROM don_hang WHERE id_ban = ? AND ma_phien = ? AND trang_thai != "paid"',
    [tableId, sessionToken]
  );

  let orderId;
  if (!order) {
    const res = await dbRun(
      'INSERT INTO don_hang (id_ban, ma_phien, trang_thai, tong_tien, ghi_chu) VALUES (?, ?, ?, ?, ?)',
      [tableId, sessionToken, 'pending', totalAmount, note]
    );
    orderId = res.insertId;
  } else {
    orderId = order.id;
    if (note) {
      await dbRun(
        'UPDATE don_hang SET tong_tien = tong_tien + ?, ghi_chu = CONCAT(IFNULL(ghi_chu, ""), " | ", ?) WHERE id = ?',
        [totalAmount, note, orderId]
      );
    } else {
      await dbRun(
        'UPDATE don_hang SET tong_tien = tong_tien + ? WHERE id = ?',
        [totalAmount, orderId]
      );
    }
  }

  for (const item of cart) {
    const menuItem = await dbGet('SELECT gia_tien FROM thuc_don WHERE id = ?', [item.id]);
    if (menuItem) {
      await dbRun(
        'INSERT INTO chi_tiet_don_hang (id_don_hang, id_mon_an, so_luong, gia_ban, trang_thai) VALUES (?, ?, ?, ?, ?)',
        [orderId, item.id, item.quantity, menuItem.gia_tien, 'unconfirmed']
      );
    }
  }

  await dbRun('UPDATE ban_an SET trang_thai = "serving", ma_phien_hien_tai = ? WHERE id = ?', [sessionToken, tableId]);
  return orderId;
}

export async function getActiveOrderForTable(tableId, sessionToken) {
  const order = await dbGet(
    'SELECT id, id_ban as table_id, ma_phien as session_token, trang_thai as status, tong_tien as total_amount, ngay_tao as created_at, ghi_chu as note FROM don_hang WHERE id_ban = ? AND ma_phien = ? AND trang_thai != "paid" ORDER BY id DESC LIMIT 1',
    [tableId, sessionToken]
  );
  if (!order) return null;

  const items = await dbAll(
    `SELECT oi.id as order_item_id, oi.so_luong as quantity, oi.gia_ban as price, oi.trang_thai as status, oi.ngay_tao as created_at, mi.id as menu_item_id, mi.ten_mon as name, mi.anh_minh_hoa as image_url, mi.loai_mon as category 
     FROM chi_tiet_don_hang oi
     JOIN thuc_don mi ON oi.id_mon_an = mi.id
     WHERE oi.id_don_hang = ? AND oi.trang_thai != 'canceled'`,
    [order.id]
  );

  order.items = items;
  return order;
}

export async function updateOrderItemStatus(orderItemId, status) {
  await dbRun('UPDATE chi_tiet_don_hang SET trang_thai = ? WHERE id = ?', [status, orderItemId]);
  const item = await dbGet('SELECT id_don_hang FROM chi_tiet_don_hang WHERE id = ?', [orderItemId]);
  if (item) {
    const activeItems = await dbAll('SELECT trang_thai FROM chi_tiet_don_hang WHERE id_don_hang = ?', [item.id_don_hang]);
    const allDone = activeItems.every(i => i.trang_thai === 'done' || i.trang_thai === 'canceled');
    if (activeItems.length > 0 && allDone) {
      await dbRun('UPDATE don_hang SET trang_thai = "done" WHERE id = ?', [item.id_don_hang]);
    }
  }
}

export async function confirmOrderItems(tableId) {
  // Tìm đơn hàng đang phục vụ của bàn này
  const table = await dbGet('SELECT ma_phien_hien_tai FROM ban_an WHERE id = ?', [tableId]);
  if (!table || !table.ma_phien_hien_tai) return false;
  const order = await dbGet('SELECT id FROM don_hang WHERE id_ban = ? AND ma_phien = ? AND trang_thai != "paid"', [tableId, table.ma_phien_hien_tai]);
  if (!order) return false;

  await dbRun('UPDATE chi_tiet_don_hang SET trang_thai = "cooking" WHERE id_don_hang = ? AND trang_thai = "unconfirmed"', [order.id]);
  return true;
}

export async function getOrderItemInfo(orderItemId) {
  return await dbGet('SELECT don_hang.id_ban as table_id, don_hang.ma_phien FROM chi_tiet_don_hang JOIN don_hang ON chi_tiet_don_hang.id_don_hang = don_hang.id WHERE chi_tiet_don_hang.id = ?', [orderItemId]);
}

export async function cancelOrderItem(orderItemId, cancelReason) {
  // Lấy thông tin món trước khi hủy
  const item = await dbGet('SELECT id_don_hang, so_luong, gia_ban FROM chi_tiet_don_hang WHERE id = ?', [orderItemId]);
  if (item) {
    const amountToDeduct = item.so_luong * item.gia_ban;
    await dbRun('UPDATE don_hang SET tong_tien = tong_tien - ? WHERE id = ?', [amountToDeduct, item.id_don_hang]);
  }
  // Đổi trạng thái
  await dbRun('UPDATE chi_tiet_don_hang SET trang_thai = "canceled" WHERE id = ?', [orderItemId]);
}

export async function updateOrderItemQuantity(orderItemId, quantity) {
  await dbRun('UPDATE chi_tiet_don_hang SET so_luong = ? WHERE id = ?', [quantity, orderItemId]);
  const item = await dbGet('SELECT id_don_hang FROM chi_tiet_don_hang WHERE id = ?', [orderItemId]);
  if (item) {
    const activeItems = await dbAll('SELECT so_luong, gia_ban FROM chi_tiet_don_hang WHERE id_don_hang = ? AND trang_thai != "canceled"', [item.id_don_hang]);
    const newTotal = activeItems.reduce((sum, i) => sum + (i.so_luong * i.gia_ban), 0);
    await dbRun('UPDATE don_hang SET tong_tien = ? WHERE id = ?', [newTotal, item.id_don_hang]);
  }
}

export async function checkoutTable(tableId) {
  await dbRun('UPDATE ban_an SET trang_thai = "pending_payment" WHERE id = ?', [tableId]);
  const table = await dbGet('SELECT ma_phien_hien_tai FROM ban_an WHERE id = ?', [tableId]);
  if (table && table.ma_phien_hien_tai) {
    const order = await getActiveOrderForTable(tableId, table.ma_phien_hien_tai);
    return order;
  }
  return null;
}

export async function confirmPayment(tableId) {
  const table = await dbGet('SELECT ma_phien_hien_tai FROM ban_an WHERE id = ?', [tableId]);
  if (table) {
    if (table.ma_phien_hien_tai) {
      await dbRun(
        'UPDATE don_hang SET trang_thai = "paid" WHERE id_ban = ? AND ma_phien = ?',
        [tableId, table.ma_phien_hien_tai]
      );
    }
    await dbRun('UPDATE ban_an SET trang_thai = "available", ma_phien_hien_tai = NULL WHERE id = ?', [tableId]);
    return true;
  }
  return false;
}

export async function getMenuItems() {
  return await dbAll('SELECT id, ten_mon as name, gia_tien as price, loai_mon as category, anh_minh_hoa as image_url, mo_ta as description, con_hang as is_available FROM thuc_don WHERE con_hang = 1');
}

export async function addMenuItem(data) {
  const result = await dbRun(
    'INSERT INTO thuc_don (ten_mon, gia_tien, loai_mon, anh_minh_hoa, mo_ta, con_hang) VALUES (?, ?, ?, ?, ?, ?)',
    [
      data.ten_mon,
      data.gia_tien,
      data.loai_mon,
      data.anh_minh_hoa || '',
      data.mo_ta || '',
      1
    ]
  );
  return result.insertId;
}

export async function updateMenuItem(id, data) {
  let fields = [];
  let params = [];
  
  if (data.ten_mon !== undefined) { fields.push('ten_mon = ?'); params.push(data.ten_mon); }
  if (data.gia_tien !== undefined) { fields.push('gia_tien = ?'); params.push(data.gia_tien); }
  if (data.loai_mon !== undefined) { fields.push('loai_mon = ?'); params.push(data.loai_mon); }
  if (data.anh_minh_hoa !== undefined) { fields.push('anh_minh_hoa = ?'); params.push(data.anh_minh_hoa); }
  if (data.mo_ta !== undefined) { fields.push('mo_ta = ?'); params.push(data.mo_ta); }
  
  if (fields.length === 0) return;
  params.push(id);
  
  await dbRun(`UPDATE thuc_don SET ${fields.join(', ')} WHERE id = ?`, params);
}

export async function getCategories() {
  return await dbAll('SELECT * FROM danh_muc');
}

export async function addCategory(ma_danh_muc, ten_danh_muc) {
  const result = await dbRun(
    'INSERT INTO danh_muc (ma_danh_muc, ten_danh_muc) VALUES (?, ?)',
    [ma_danh_muc, ten_danh_muc]
  );
  return result.insertId;
}

export async function deleteCategory(ma_danh_muc) {
  await dbRun('DELETE FROM danh_muc WHERE ma_danh_muc = ?', [ma_danh_muc]);
}

export async function deleteMenuItems(ids) {
  if (!ids || ids.length === 0) return;
  const placeholders = ids.map(() => '?').join(',');
  await dbRun(`DELETE FROM thuc_don WHERE id IN (${placeholders})`, ids);
}

export async function getChefActiveItems() {
  return await dbAll(`
    SELECT oi.id as order_item_id, oi.so_luong as quantity, oi.trang_thai as status, mi.ten_mon as name, t.ten_ban as table_number, t.id as table_id, o.ma_phien as session_token, o.id as order_id, o.ngay_tao as created_at
    FROM chi_tiet_don_hang oi
    JOIN thuc_don mi ON oi.id_mon_an = mi.id
    JOIN don_hang o ON oi.id_don_hang = o.id
    JOIN ban_an t ON o.id_ban = t.id
    WHERE oi.trang_thai = 'cooking' AND o.trang_thai != 'paid'
    ORDER BY o.ngay_tao ASC
  `);
}

export async function getCashierTables() {
  const tables = await dbAll('SELECT id, ten_ban as table_number, ma_duong_dan as qr_token, trang_thai as status, ma_phien_hien_tai as current_session_token FROM ban_an ORDER BY ten_ban ASC');
  for (const table of tables) {
    if (table.status !== 'available' && table.current_session_token) {
      table.active_order = await getActiveOrderForTable(table.id, table.current_session_token);
    } else {
      table.active_order = null;
    }
  }
  return tables;
}

export async function getOverviewStats() {
  const todayRevenue = await dbGet("SELECT SUM(tong_tien) as total FROM don_hang WHERE trang_thai = 'paid' AND DATE(ngay_tao) = CURDATE()");
  const todayOrders = await dbGet("SELECT COUNT(id) as count FROM don_hang WHERE trang_thai = 'paid' AND DATE(ngay_tao) = CURDATE()");
  const activeTables = await dbGet("SELECT COUNT(id) as count FROM ban_an WHERE trang_thai IN ('serving', 'pending_payment')");
  const totalTables = await dbGet("SELECT COUNT(id) as count FROM ban_an");

  let occupancyRate = 0;
  if (totalTables && totalTables.count > 0) {
    occupancyRate = ((activeTables.count / totalTables.count) * 100).toFixed(2);
  }

  return {
    revenueToday: todayRevenue && todayRevenue.total ? todayRevenue.total : 0,
    ordersToday: todayOrders ? todayOrders.count : 0,
    activeTables: activeTables ? activeTables.count : 0,
    totalTables: totalTables ? totalTables.count : 0,
    occupancyRate: occupancyRate
  };
}

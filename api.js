import express from 'express';
import * as db from './database.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import multer from 'multer';
import path from 'path';
import os from 'os';

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'public/uploads/');
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage: storage });

// Tạo khóa bí mật ngẫu nhiên mỗi khi server khởi động
// Điều này giúp mọi token cũ đều bị vô hiệu hóa khi ngừng chạy máy chủ
const SECRET_KEY = crypto.randomBytes(32).toString('hex');

export default function createApiRouter(broadcast) {
  const router = express.Router();

  // Lấy địa chỉ IPv4 của máy chủ
  router.get('/server/ip', (req, res) => {
    const interfaces = os.networkInterfaces();
    let ipv4 = '127.0.0.1';
    for (const name of Object.keys(interfaces)) {
      for (const iface of interfaces[name]) {
        if (iface.family === 'IPv4' && !iface.internal) {
          ipv4 = iface.address;
          break;
        }
      }
      if (ipv4 !== '127.0.0.1') break;
    }
    const port = process.env.PORT || 3000;
    res.json({ ip: ipv4, port });
  });

  // 1. Quét mã QR và Mở bàn
  router.get('/tables/verify', async (req, res) => {
    const { qr_token, current_token } = req.query;

    if (!qr_token) {
      return res.status(400).json({ error: 'Mã QR không hợp lệ' });
    }

    try {
      const table = await db.getTableByQrToken(qr_token);
      if (!table) {
        return res.status(404).json({ error: 'Bàn ăn không tồn tại hoặc mã QR không hợp lệ' });
      }

      let sessionToken = current_token;

      // Nếu bàn trống hoặc khách hàng quét mới không khớp session hiện tại
      if (table.status === 'available') {
        // Tạo session token mới nếu bàn đang trống
        sessionToken = 'sess_' + Math.random().toString(36).substring(2) + '_' + Date.now();
        await db.updateTableSession(table.id, sessionToken);
        table.current_session_token = sessionToken;
      } else {
        // Nếu bàn bận (đang phục vụ hoặc chờ thanh toán)
        // Cho phép thiết bị khác quét cùng chung session nếu họ muốn (đồng bộ nhóm)
        if (!sessionToken || sessionToken !== table.current_session_token) {
          sessionToken = table.current_session_token;
        }
      }

      const menu = await db.getMenuItems();
      const activeOrder = sessionToken ? await db.getActiveOrderForTable(table.id, sessionToken) : null;

      res.json({
        table: {
          id: table.id,
          table_number: table.table_number,
          status: table.status,
          session_token: sessionToken
        },
        menu,
        activeOrder
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Lỗi máy chủ' });
    }
  });

  // 2. Đặt món (Tạo đơn hàng)
  router.post('/orders', async (req, res) => {
    const { table_id, session_token, cart, note } = req.body;

    if (!table_id || !session_token || !cart || !cart.length) {
      return res.status(400).json({ error: 'Dữ liệu đơn hàng thiếu hoặc không hợp lệ' });
    }

    try {
      // Validate stock
      for (const item of cart) {
        const menuItem = await db.dbGet('SELECT ten_mon, so_luong FROM thuc_don WHERE id = ?', [item.id]);
        if (menuItem && menuItem.so_luong !== null && menuItem.so_luong !== undefined) {
          if (item.quantity > menuItem.so_luong) {
            return res.status(400).json({ 
              error: `Món "${menuItem.ten_mon}" chỉ còn ${menuItem.so_luong} phần. Vui lòng giảm số lượng.` 
            });
          }
        }
      }

      const orderId = await db.createOrder(table_id, session_token, cart, note || '');
      const activeOrder = await db.getActiveOrderForTable(table_id, session_token);

      // Thông báo cho Đầu bếp về món mới (BỎ QUA - Thu ngân sẽ duyệt trước)
      // broadcast((info) => info.role === 'chef', { type: 'new_order', table_id, orderId });

      // Thông báo cho Thu ngân cập nhật trạng thái bàn
      broadcast(
        (info) => info.role === 'cashier',
        { type: 'table_status_changed', table_id }
      );

      // Gửi thông báo cập nhật cho các khách hàng cùng bàn
      broadcast(
        (info) => info.role === 'customer' && info.tableId == table_id && info.sessionToken === session_token,
        { type: 'order_updated', activeOrder }
      );

      res.json({ success: true, orderId, activeOrder });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Lỗi máy chủ khi đặt món' });
    }
  });

  // 3. Yêu cầu tính tiền
  router.post('/checkout', async (req, res) => {
    const { table_id, session_token } = req.body;

    if (!table_id) {
      return res.status(400).json({ error: 'Thiếu Table ID' });
    }

    try {
      const activeOrder = await db.checkoutTable(table_id);

      // Thông báo cho Thu ngân có yêu cầu thanh toán
      broadcast(
        (info) => info.role === 'cashier',
        { type: 'checkout_request', table_id, order: activeOrder }
      );

      // Thông báo cho các khách hàng cùng bàn hiển thị màn hình chờ thanh toán
      broadcast(
        (info) => info.role === 'customer' && info.tableId == table_id,
        { type: 'table_pending_payment' }
      );

      res.json({ success: true, order: activeOrder });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Lỗi máy chủ khi yêu cầu thanh toán' });
    }
  });

  // 4. Thu ngân xác nhận thanh toán (Giải phóng bàn)
  router.post('/payment/confirm', async (req, res) => {
    const { table_id } = req.body;

    if (!table_id) {
      return res.status(400).json({ error: 'Thiếu Table ID' });
    }

    try {
      const success = await db.confirmPayment(table_id);
      if (!success) {
        return res.status(404).json({ error: 'Không tìm thấy bàn cần thanh toán' });
      }

      // Thông báo cho khách hàng cùng bàn reset session & đóng giao diện
      broadcast(
        (info) => info.role === 'customer' && info.tableId == table_id,
        { type: 'payment_completed' }
      );

      // Thông báo cho các thu ngân khác cập nhật trạng thái bàn
      broadcast(
        (info) => info.role === 'cashier',
        { type: 'table_status_changed', table_id }
      );

      res.json({ success: true });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Lỗi máy chủ khi xác nhận thanh toán' });
    }
  });

  // 5. Đầu bếp cập nhật trạng thái chi tiết món ăn (Done)
  router.post('/chef/items/complete', async (req, res) => {
    const { order_item_id, table_id, session_token } = req.body;

    if (!order_item_id) {
      return res.status(400).json({ error: 'Thiếu Order Item ID' });
    }

    try {
      await db.updateOrderItemStatus(order_item_id, 'done');

      // Lấy lại đơn hàng mới để đẩy cho Khách hàng
      const activeOrder = await db.getActiveOrderForTable(table_id, session_token);

      // Thông báo cho Đầu bếp cập nhật lại list
      broadcast(
        (info) => info.role === 'chef',
        { type: 'chef_item_completed', order_item_id }
      );

      // Thông báo cho Khách hàng món ăn đã xong
      broadcast(
        (info) => info.role === 'customer' && info.tableId == table_id && info.sessionToken === session_token,
        { type: 'order_updated', activeOrder, item_completed_id: order_item_id }
      );

      // Thông báo cho Thu ngân
      const item = activeOrder.items.find(i => i.order_item_id === order_item_id);
      const tableInfo = await db.getTableById(table_id);
      if (item && tableInfo) {
        broadcast(
          (info) => info.role === 'cashier',
          { type: 'item_cooked_cashier_notify', message: `Bếp đã nấu xong món "${item.name}" tại Bàn ${tableInfo.table_number}!` }
        );
      }
      broadcast(
        (info) => info.role === 'cashier',
        { type: 'table_status_changed', table_id }
      );

      res.json({ success: true });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Lỗi máy chủ khi hoàn thành món' });
    }
  });

  // Đầu bếp hủy chế biến món ăn
  router.post('/chef/items/cancel', async (req, res) => {
    const { order_item_id, table_id, session_token, reason } = req.body;

    if (!order_item_id) {
      return res.status(400).json({ error: 'Thiếu Order Item ID' });
    }

    try {
      await db.cancelOrderItem(order_item_id, reason);

      // Lấy lại đơn hàng mới
      const activeOrder = await db.getActiveOrderForTable(table_id, session_token);

      // Thông báo cho Bếp cập nhật list (dùng chung type reload list)
      broadcast(
        (info) => info.role === 'chef',
        { type: 'chef_item_completed', order_item_id } 
      );

      // Thông báo cho Khách hàng
      broadcast(
        (info) => info.role === 'customer' && info.tableId == table_id && info.sessionToken === session_token,
        { type: 'order_updated', activeOrder }
      );

      // Thông báo cho Thu ngân
      const item = activeOrder.items.find(i => i.order_item_id === order_item_id);
      const tableInfo = await db.getTableById(table_id);
      if (item && tableInfo) {
        broadcast(
          (info) => info.role === 'cashier',
          { type: 'item_cooked_cashier_notify', message: `⚠️ Bếp HỦY món "${item.name}" Bàn ${tableInfo.table_number}! Lý do: ${reason || 'Không rõ'}` }
        );
      }
      broadcast(
        (info) => info.role === 'cashier',
        { type: 'table_status_changed', table_id }
      );

      res.json({ success: true });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Lỗi máy chủ khi hủy món' });
    }
  });

  // 6. Lấy dữ liệu cho Đầu bếp (Món đang cần chế biến)
  router.get('/chef/items', async (req, res) => {
    try {
      const items = await db.getChefActiveItems();
      res.json(items);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Lỗi máy chủ' });
    }
  });



  // 4a. Upload ảnh
  router.post('/upload', upload.single('image'), (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Chưa xác thực' });
    }
    try {
      const token = authHeader.split(' ')[1];
      jwt.verify(token, SECRET_KEY);
      
      if (!req.file) {
        return res.status(400).json({ error: 'Không tìm thấy file ảnh' });
      }
      
      res.json({ success: true, url: '/uploads/' + req.file.filename });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Lỗi máy chủ khi tải ảnh lên' });
    }
  });

  // 4b. Thêm món mới
  router.post('/menu', async (req, res) => {
    // Chỉ admin mới được thêm món
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Chưa xác thực' });
    }
    try {
      const token = authHeader.split(' ')[1];
      jwt.verify(token, SECRET_KEY);
      
      const { ten_mon, gia_tien, loai_mon, anh_minh_hoa, mo_ta, so_luong } = req.body;
      if (!ten_mon || !gia_tien || !loai_mon) {
        return res.status(400).json({ error: 'Thiếu thông tin bắt buộc (Tên, Giá, Loại)' });
      }

      const id = await db.addMenuItem({
        ten_mon, gia_tien, loai_mon, anh_minh_hoa, mo_ta, so_luong
      });
      res.json({ success: true, id });
    } catch (err) {
      console.error(err);
      if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
        res.status(401).json({ error: 'Token không hợp lệ' });
      } else {
        res.status(500).json({ error: 'Lỗi máy chủ' });
      }
    }
  });

  // 4c. Sửa món
  router.put('/menu/:id', async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Chưa xác thực' });
    }
    try {
      const token = authHeader.split(' ')[1];
      jwt.verify(token, SECRET_KEY);
      
      const { ten_mon, gia_tien, loai_mon, anh_minh_hoa, mo_ta, so_luong } = req.body;
      await db.updateMenuItem(req.params.id, { ten_mon, gia_tien, loai_mon, anh_minh_hoa, mo_ta, so_luong });
      res.json({ success: true });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Lỗi máy chủ' });
    }
  });

  // 4d. Lấy danh mục
  router.get('/categories', async (req, res) => {
    try {
      const cats = await db.getCategories();
      res.json(cats);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Lỗi máy chủ' });
    }
  });

  // 4e. Thêm danh mục mới
  router.post('/categories', async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Chưa xác thực' });
    }
    try {
      const token = authHeader.split(' ')[1];
      jwt.verify(token, SECRET_KEY);
      
      const { ma_danh_muc, ten_danh_muc } = req.body;
      if (!ma_danh_muc || !ten_danh_muc) {
        return res.status(400).json({ error: 'Thiếu thông tin danh mục' });
      }

      const id = await db.addCategory(ma_danh_muc, ten_danh_muc);
      res.json({ success: true, id });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Lỗi máy chủ (Có thể mã danh mục đã tồn tại)' });
    }
  });

  // 4f. Sắp xếp danh mục
  router.post('/categories/reorder', async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Chưa xác thực' });
    }
    try {
      const token = authHeader.split(' ')[1];
      jwt.verify(token, SECRET_KEY);
      
      const { ids } = req.body;
      if (!ids || !Array.isArray(ids)) {
        return res.status(400).json({ error: 'Thiếu mảng ids' });
      }

      await db.updateCategoriesOrder(ids);
      res.json({ success: true });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Lỗi máy chủ khi sắp xếp' });
    }
  });

  // 4f. Xoá món ăn (nhiều món hoặc 1 món)
  router.delete('/menu', async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Chưa xác thực' });
    }
    try {
      const token = authHeader.split(' ')[1];
      jwt.verify(token, SECRET_KEY);
      
      const { ids } = req.body;
      if (!ids || !Array.isArray(ids)) {
        return res.status(400).json({ error: 'Thiếu danh sách ID món ăn cần xoá' });
      }

      await db.deleteMenuItems(ids);
      res.json({ success: true });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Lỗi máy chủ' });
    }
  });

  // 4g. Xoá danh mục
  router.delete('/categories/:ma', async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Chưa xác thực' });
    }
    try {
      const token = authHeader.split(' ')[1];
      jwt.verify(token, SECRET_KEY);
      
      await db.deleteCategory(req.params.ma);
      res.json({ success: true });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Lỗi máy chủ' });
    }
  });

  // 7. Lấy dữ liệu cho Thu ngân (Trạng thái toàn bộ bàn ăn)
  router.get('/cashier/tables', async (req, res) => {
    try {
      const tables = await db.getCashierTables();
      res.json(tables);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Lỗi máy chủ' });
    }
  });

  // 7a. Thu ngân xác nhận món (Chuyển từ unconfirmed -> cooking)
  router.post('/cashier/confirm-orders', async (req, res) => {
    try {
      const { table_id } = req.body;
      if (!table_id) return res.status(400).json({ error: 'Thiếu table_id' });

      const success = await db.confirmOrderItems(table_id);
      if (success) {
        // Báo cho bếp biết có món mới cần làm
        broadcast((info) => info.role === 'chef', { type: 'new_order', table_id });
        // Cập nhật khách hàng
        const table = await db.getTableById(table_id);
        if (table) {
          const activeOrder = await db.getActiveOrderForTable(table_id, table.current_session_token);
          broadcast(
            (info) => info.role === 'customer' && info.tableId == table_id && info.sessionToken === table.current_session_token, 
            { type: 'order_updated', activeOrder }
          );
        }
        
        res.json({ success: true });
      } else {
        res.status(400).json({ error: 'Không tìm thấy đơn hàng chờ xác nhận' });
      }
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Lỗi máy chủ' });
    }
  });

  // 7b. Thu ngân hủy món
  router.post('/cashier/cancel-order-item', async (req, res) => {
    try {
      const { order_item_id, reason } = req.body;
      if (!order_item_id) return res.status(400).json({ error: 'Thiếu order_item_id' });

      await db.cancelOrderItem(order_item_id, reason);

      // Broadcast cho Thu ngân
      broadcast((info) => info.role === 'cashier', { type: 'table_status_changed' });
      
      // Lấy thông tin table để update customer
      const itemRow = await db.getOrderItemInfo(order_item_id);
      if (itemRow) {
        const activeOrder = await db.getActiveOrderForTable(itemRow.table_id, itemRow.ma_phien);
        broadcast(
          (info) => info.role === 'customer' && info.tableId === itemRow.table_id && info.sessionToken === itemRow.ma_phien, 
          { type: 'order_updated', activeOrder, item_cancelled_message: `Món ăn của bạn vừa bị hủy (Lý do: ${reason})` }
        );
      }

      res.json({ success: true });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Lỗi máy chủ khi hủy món' });
    }
  });

  // 7c. Thu ngân cập nhật số lượng món
  router.post('/cashier/update-item-qty', async (req, res) => {
    try {
      const { order_item_id, quantity } = req.body;
      if (!order_item_id || quantity === undefined) return res.status(400).json({ error: 'Thiếu dữ liệu' });

      if (quantity < 1) {
        await db.cancelOrderItem(order_item_id, 'Cập nhật số lượng về 0');
      } else {
        await db.updateOrderItemQuantity(order_item_id, quantity);
      }
      
      broadcast((info) => info.role === 'cashier', { type: 'table_status_changed' });
      
      // Lấy thông tin table để update customer
      const itemRow = await db.getOrderItemInfo(order_item_id);
      if (itemRow) {
        const activeOrder = await db.getActiveOrderForTable(itemRow.table_id, itemRow.ma_phien);
        broadcast(
          (info) => info.role === 'customer' && info.tableId === itemRow.table_id && info.sessionToken === itemRow.ma_phien, 
          { type: 'order_updated', activeOrder, item_cancelled_message: 'Thu ngân vừa cập nhật món ăn của bạn.' }
        );
      }

      res.json({ success: true });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Lỗi máy chủ khi cập nhật số lượng' });
    }
  });
  // 8. Lấy dữ liệu danh sách món ăn (Cho giao diện Quản lý)
  router.get('/admin/menu', async (req, res) => {
    try {
      // getMenuItems trả về toàn bộ menu_items
      const menu = await db.getMenuItems();
      res.json(menu);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Lỗi máy chủ khi lấy menu' });
    }
  });
  // 9. Lấy dữ liệu thống kê tổng quan
  router.get('/admin/overview', async (req, res) => {
    try {
      const stats = await db.getOverviewStats();
      res.json(stats);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Lỗi máy chủ khi lấy dữ liệu tổng quan' });
    }
  });

  // --- AUTHENTICATION ---
  // Đăng ký (Register)
  router.post('/auth/register', async (req, res) => {
    try {
      const { username, password, fullname } = req.body;
      if (!username || !password) return res.status(400).json({ error: 'Thiếu username hoặc password' });
      
      const existingUser = await db.getUserByUsername(username);
      if (existingUser) return res.status(400).json({ error: 'Tài khoản đã tồn tại' });
      
      const hashedPassword = await bcrypt.hash(password, 10);
      await db.createUser(username, hashedPassword, fullname || 'Chưa cập nhật');
      res.json({ success: true, message: 'Đăng ký thành công' });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Lỗi máy chủ' });
    }
  });

  // Đăng nhập (Login)
  router.post('/auth/login', async (req, res) => {
    try {
      const { username, password } = req.body;
      if (!username || !password) return res.status(400).json({ error: 'Thiếu username hoặc password' });
      
      const user = await db.getUserByUsername(username);
      if (!user) return res.status(401).json({ error: 'Sai tài khoản hoặc mật khẩu' });
      
      const isValid = await bcrypt.compare(password, user.password);
      if (!isValid) return res.status(401).json({ error: 'Sai tài khoản hoặc mật khẩu' });
      
      const token = jwt.sign({ id: user.id, username: user.username, role: user.role, fullname: user.fullname }, SECRET_KEY, { expiresIn: '12h' });
      res.json({ success: true, token, role: user.role, fullname: user.fullname });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Lỗi máy chủ' });
    }
  });

  // Kiểm tra token (Dùng khi vào trang quản lý)
  router.get('/auth/check', (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Chưa xác thực' });
    }
    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, SECRET_KEY);
      res.json({ success: true, role: decoded.role, username: decoded.username, fullname: decoded.fullname });
    } catch (err) {
      res.status(401).json({ error: 'Token không hợp lệ hoặc đã hết hạn (Server khởi động lại)' });
    }
  });

  // Đổi mật khẩu
  router.post('/auth/change-password', async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Chưa xác thực' });
    }
    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, SECRET_KEY);
      const { oldPassword, newPassword } = req.body;
      if (!oldPassword || !newPassword) return res.status(400).json({ error: 'Vui lòng nhập đầy đủ mật khẩu cũ và mới' });

      const user = await db.getUserByUsername(decoded.username);
      if (!user) return res.status(401).json({ error: 'Tài khoản không tồn tại' });
      
      const isValid = await bcrypt.compare(oldPassword, user.password);
      if (!isValid) return res.status(400).json({ error: 'Mật khẩu cũ không chính xác' });
      
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      // Sử dụng hàm updateUser(id, password, role)
      await db.updateUser(decoded.id, hashedPassword, decoded.role);
      
      res.json({ success: true, message: 'Đổi mật khẩu thành công' });
    } catch (err) {
      res.status(401).json({ error: 'Lỗi xác thực hoặc máy chủ' });
    }
  });

  // --- EMPLOYEE MANAGEMENT ---
  // Middleware xác thực Admin
  const verifyAdmin = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' });
    try {
      const decoded = jwt.verify(authHeader.split(' ')[1], SECRET_KEY);
      if (decoded.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
      req.user = decoded;
      next();
    } catch (err) {
      return res.status(401).json({ error: 'Token invalid' });
    }
  };

  // --- AREA MANAGEMENT ---
  router.get('/admin/areas', async (req, res) => {
    try {
      const areas = await db.getAreas();
      res.json(areas);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Lỗi server' });
    }
  });

  router.post('/admin/areas', verifyAdmin, async (req, res) => {
    try {
      const { name } = req.body;
      if (!name) return res.status(400).json({ error: 'Thiếu tên khu vực' });
      const id = await db.addArea(name);
      res.json({ success: true, id });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Lỗi server' });
    }
  });

  router.put('/admin/areas/:id', verifyAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const { name } = req.body;
      if (!name) return res.status(400).json({ error: 'Thiếu tên khu vực' });
      await db.updateArea(id, name);
      res.json({ success: true });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Lỗi server' });
    }
  });

  router.delete('/admin/areas/:id', verifyAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      await db.deleteArea(id);
      res.json({ success: true });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Lỗi server' });
    }
  });

  // --- TABLE MANAGEMENT ---
  router.post('/admin/tables', verifyAdmin, async (req, res) => {
    try {
      const { table_number, qr_token, area_id } = req.body;
      if (!table_number || !qr_token) return res.status(400).json({ error: 'Thiếu thông tin bàn' });
      await db.addTable(table_number, qr_token, area_id || null);
      
      broadcast((info) => info.role === 'cashier', { type: 'table_status_changed' });
      
      res.json({ success: true });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Lỗi server, có thể mã bàn hoặc QR đã tồn tại' });
    }
  });

  router.put('/admin/tables/:id', verifyAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const { table_number, qr_token, area_id } = req.body;
      if (!table_number || !qr_token) return res.status(400).json({ error: 'Thiếu thông tin bàn' });
      await db.updateTable(id, table_number, qr_token, area_id || null);
      
      broadcast((info) => info.role === 'cashier', { type: 'table_status_changed' });
      
      res.json({ success: true });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Lỗi server' });
    }
  });

  router.delete('/admin/tables/:id', verifyAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const table = await db.getTableById(id);
      if (!table) return res.status(404).json({ error: 'Bàn không tồn tại' });
      if (table.status !== 'available') return res.status(400).json({ error: 'Bàn đang được sử dụng hoặc chờ thanh toán, không thể xoá' });
      
      await db.deleteTable(id);
      
      broadcast((info) => info.role === 'cashier', { type: 'table_status_changed' });
      
      res.json({ success: true });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Lỗi server' });
    }
  });

  router.get('/admin/employees', verifyAdmin, async (req, res) => {
    try {
      const users = await db.getAllUsers();
      res.json(users);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Lỗi server' });
    }
  });

  router.post('/admin/employees', verifyAdmin, async (req, res) => {
    try {
      const { username, password, role, fullname } = req.body;
      if (!username || !password || !role) return res.status(400).json({ error: 'Thiếu thông tin' });
      const existing = await db.getUserByUsername(username);
      if (existing) return res.status(400).json({ error: 'Tên đăng nhập đã tồn tại' });
      const hashed = await bcrypt.hash(password, 10);
      await db.createUserWithRole(username, hashed, role, fullname || 'Chưa cập nhật');
      res.json({ success: true });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Lỗi server' });
    }
  });

  router.put('/admin/employees/:id', verifyAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const { password, role, fullname } = req.body;
      let hashed = null;
      if (password && password.trim() !== '') {
        hashed = await bcrypt.hash(password, 10);
      }
      await db.updateUser(id, hashed, role, fullname || 'Chưa cập nhật');
      res.json({ success: true });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Lỗi server' });
    }
  });

  router.delete('/admin/employees/:id', verifyAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      // Tránh tự xoá chính mình (chỉ kiểm tra tương đối, admin vẫn có thể có id khác nếu có nhiều admin)
      if (parseInt(id) === req.user.id) return res.status(400).json({ error: 'Không thể xoá chính mình' });
      await db.deleteUser(id);
      res.json({ success: true });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Lỗi server' });
    }
  });

  // --- RESTAURANT INFO ---
  router.get('/restaurant/info', async (req, res) => {
    try {
      const info = await db.getRestaurantInfo();
      res.json(info);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Lỗi server' });
    }
  });

  router.put('/admin/restaurant/info', verifyAdmin, async (req, res) => {
    try {
      const { ten_nha_hang, dia_chi, so_dien_thoai } = req.body;
      if (!ten_nha_hang || !dia_chi || !so_dien_thoai) {
        return res.status(400).json({ error: 'Vui lòng điền đủ thông tin' });
      }
      await db.updateRestaurantInfo(ten_nha_hang, dia_chi, so_dien_thoai);
      res.json({ success: true });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Lỗi máy chủ' });
    }
  });

  // Cập nhật số lượng tồn kho nhanh (dành cho quản lý/thu ngân)
  router.post('/menu/update-stock', async (req, res) => {
    const { id, diff } = req.body;
    if (!id || typeof diff !== 'number') {
      return res.status(400).json({ error: 'Dữ liệu không hợp lệ' });
    }
    
    // Auth Check
    const token = req.headers['authorization'];
    if (!token) return res.status(401).json({ error: 'Không có quyền truy cập' });
    
    try {
      await db.adjustMenuStock(id, diff);
      const updatedItem = await db.dbGet('SELECT so_luong FROM thuc_don WHERE id = ?', [id]);
      
      // Notify cashiers to refresh menu if needed (optional)
      broadcast((info) => info.role === 'cashier', { type: 'menu_updated' });
      
      res.json({ success: true, so_luong: updatedItem ? updatedItem.so_luong : 0 });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Lỗi khi cập nhật số lượng' });
    }
  });

  return router;
}

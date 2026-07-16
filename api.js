import express from 'express';
import * as db from './database.js';

export default function createApiRouter(broadcast) {
  const router = express.Router();

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
    const { table_id, session_token, cart } = req.body;

    if (!table_id || !session_token || !cart || !cart.length) {
      return res.status(400).json({ error: 'Dữ liệu đơn hàng thiếu hoặc không hợp lệ' });
    }

    try {
      const orderId = await db.createOrder(table_id, session_token, cart);
      const activeOrder = await db.getActiveOrderForTable(table_id, session_token);

      // Thông báo cho Đầu bếp về món mới
      broadcast(
        (info) => info.role === 'chef',
        { type: 'new_order', table_id, orderId }
      );

      // Thông báo cho Thu ngân cập nhật trạng thái bàn
      broadcast(
        (info) => info.role === 'cashier',
        { type: 'table_status_changed', table_id }
      );

      // Gửi thông báo cập nhật cho các khách hàng cùng bàn
      broadcast(
        (info) => info.role === 'customer' && info.tableId === table_id && info.sessionToken === session_token,
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
        (info) => info.role === 'customer' && info.tableId === table_id,
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
        (info) => info.role === 'customer' && info.tableId === table_id,
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
        (info) => info.role === 'customer' && info.tableId === table_id && info.sessionToken === session_token,
        { type: 'order_updated', activeOrder, item_completed_id: order_item_id }
      );

      // Thông báo cho Thu ngân
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

  return router;
}

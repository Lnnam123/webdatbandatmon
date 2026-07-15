import assert from 'assert';
import { fork } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper function to sleep
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function runTests() {
  console.log('--- STARTING INTEGRATION TESTS ---');

  // 1. Khởi chạy Server trong tiến trình con
  const serverProcess = fork(path.join(__dirname, 'server.js'), [], {
    env: { ...process.env, PORT: '3333' },
    silent: true
  });

  // Hứng logs từ server
  serverProcess.stdout.on('data', (data) => {
    console.log(`[Server]: ${data.toString().trim()}`);
  });

  serverProcess.stderr.on('data', (data) => {
    console.error(`[Server Error]: ${data.toString().trim()}`);
  });

  // Đợi 2 giây cho server khởi chạy thành công
  await sleep(2000);

  const baseUrl = 'http://localhost:3333';

  try {
    // --- BƯỚC 1: QUÉT MÃ QR & MỞ BÀN ---
    console.log('\n[TEST 1]: Quét mã QR & Mở bàn (ban01_token_xyz)...');
    const verifyRes = await fetch(`${baseUrl}/api/tables/verify?qr_token=ban01_token_xyz`);
    assert.strictEqual(verifyRes.status, 200, 'Verify QR code should return 200');
    
    const verifyData = await verifyRes.json();
    assert.ok(verifyData.table, 'Response should contain table info');
    assert.strictEqual(verifyData.table.table_number, 'Bàn 01', 'Table number should be Bàn 01');
    assert.ok(verifyData.table.session_token, 'Session token should be generated');
    assert.ok(verifyData.menu.length > 0, 'Menu list should not be empty');
    
    const tableId = verifyData.table.id;
    const sessionToken = verifyData.table.session_token;
    console.log(`=> Thành công. Nhận Session Token: ${sessionToken}`);

    // --- BƯỚC 2: ĐẶT MÓN & CHẾ BIẾN ---
    assert.ok(verifyData.menu && verifyData.menu.length >= 2, 'Menu must contain at least 2 items');
    const item1 = verifyData.menu[0];
    const item2 = verifyData.menu[1];
    
    console.log(`\n[TEST 2]: Đặt món (${item1.name} & ${item2.name})...`);
    const cart = [
      { id: item1.id, quantity: 2 },
      { id: item2.id, quantity: 1 }
    ];

    const orderRes = await fetch(`${baseUrl}/api/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        table_id: tableId,
        session_token: sessionToken,
        cart: cart
      })
    });
    assert.strictEqual(orderRes.status, 200, 'Order submission should return 200');
    
    const orderData = await orderRes.json();
    assert.ok(orderData.success, 'Order response should be successful');
    assert.ok(orderData.orderId, 'Order ID should be returned');
    assert.ok(orderData.activeOrder.items.length === 2, 'Active order should contain 2 items');
    
    // Kiểm tra trạng thái bàn đổi thành 'serving'
    const tableCheckRes = await fetch(`${baseUrl}/api/cashier/tables`);
    const tables = await tableCheckRes.json();
    const table01 = tables.find(t => t.id === tableId);
    assert.strictEqual(table01.status, 'serving', 'Table status should now be serving');
    console.log(`=> Thành công. Tạo đơn hàng ID: ${orderData.orderId}. Trạng thái bàn: ${table01.status}`);

    // --- BƯỚC 3: ĐẦU BẾP HOÀN THÀNH MÓN ---
    console.log('\n[TEST 3]: Đầu bếp hoàn thành món ăn...');
    const chefRes = await fetch(`${baseUrl}/api/chef/items`);
    const chefItems = await chefRes.json();
    assert.ok(chefItems.length > 0, 'Chef should have items to prepare');
    
    const firstItem = chefItems[0];
    console.log(`=> Đầu bếp hoàn thành món: ${firstItem.name} cho ${firstItem.table_number}`);
    
    const completeRes = await fetch(`${baseUrl}/api/chef/items/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        order_item_id: firstItem.order_item_id,
        table_id: tableId,
        session_token: sessionToken
      })
    });
    assert.strictEqual(completeRes.status, 200, 'Completing item should return 200');
    console.log('=> Thành công. Đã đánh dấu hoàn thành 1 món.');

    // --- BƯỚC 4: YÊU CẦU THANH TOÁN ---
    console.log('\n[TEST 4]: Khách hàng yêu cầu thanh toán...');
    const checkoutRes = await fetch(`${baseUrl}/api/checkout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        table_id: tableId,
        session_token: sessionToken
      })
    });
    assert.strictEqual(checkoutRes.status, 200, 'Checkout request should return 200');
    
    const checkoutData = await checkoutRes.json();
    assert.ok(checkoutData.success, 'Checkout should be successful');
    
    // Kiểm tra trạng thái bàn đổi thành 'pending_payment'
    const tableCheckRes2 = await fetch(`${baseUrl}/api/cashier/tables`);
    const tables2 = await tableCheckRes2.json();
    const table01Checkout = tables2.find(t => t.id === tableId);
    assert.strictEqual(table01Checkout.status, 'pending_payment', 'Table status should be pending_payment');
    console.log(`=> Thành công. Trạng thái bàn: ${table01Checkout.status}`);

    // --- BƯỚC 5: XÁC NHẬN THANH TOÁN & GIẢI PHÓNG BÀN ---
    console.log('\n[TEST 5]: Thu ngân xác nhận thanh toán...');
    const payRes = await fetch(`${baseUrl}/api/payment/confirm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ table_id: tableId })
    });
    assert.strictEqual(payRes.status, 200, 'Payment confirm should return 200');

    // Kiểm tra trạng thái bàn đổi lại thành 'available'
    const tableCheckRes3 = await fetch(`${baseUrl}/api/cashier/tables`);
    const tables3 = await tableCheckRes3.json();
    const table01Available = tables3.find(t => t.id === tableId);
    assert.strictEqual(table01Available.status, 'available', 'Table status should be reset to available');
    assert.strictEqual(table01Available.current_session_token, null, 'Table session token should be cleared');
    console.log(`=> Thành công. Bàn quay về trạng thái: ${table01Available.status}`);

    console.log('\n🌟 TẤT CẢ CÁC BÀI KIỂM THỬ ĐÃ VƯỢT QUA THÀNH CÔNG!');
  } catch (err) {
    console.error('\n❌ PHÁT HIỆN LỖI TRONG BÀI KIỂM THỬ:');
    console.error(err);
    process.exitCode = 1;
  } finally {
    // Tắt server con
    console.log('\nShutting down test server...');
    serverProcess.kill();
  }
}

runTests();

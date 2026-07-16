import express from 'express';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import * as db from './database.js';
import createApiRouter from './api.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'thuc-don.html'));
});
app.use(express.static(path.join(__dirname, 'public')));

const server = createServer(app);
const wss = new WebSocketServer({ server });

// Tập hợp các kết nối WebSocket đang hoạt động
const clients = new Map(); // ws -> { role, tableId, sessionToken }

// Gửi tin nhắn đến một tập hợp khách hàng
function broadcast(filterFn, data) {
  const messageStr = JSON.stringify(data);
  for (const [ws, info] of clients.entries()) {
    if (ws.readyState === ws.OPEN && filterFn(info)) {
      ws.send(messageStr);
    }
  }
}

// Xử lý kết nối WebSocket
wss.on('connection', (ws) => {
  console.log('New WebSocket connection established.');

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      
      if (data.type === 'register') {
        const { role, tableId, sessionToken } = data;
        clients.set(ws, { role, tableId: parseInt(tableId), sessionToken });
        console.log(`Registered WebSocket client as: ${role} (Table: ${tableId})`);
        
        // Gửi xác nhận đăng ký thành công
        ws.send(JSON.stringify({ type: 'registered', status: 'ok' }));
      }
    } catch (err) {
      console.error('Error handling WS message:', err.message);
    }
  });

  ws.on('close', () => {
    clients.delete(ws);
    console.log('WebSocket connection closed.');
  });
});

// --- REST API ENDPOINTS ---

app.use('/api', createApiRouter(broadcast));

// Khởi chạy server
const PORT = process.env.PORT || 3000;
server.listen(PORT, async () => {
  // Đảm bảo database đã khởi tạo
  await db.initDb();
  console.log(`Server is running on http://localhost:${PORT}`);
});

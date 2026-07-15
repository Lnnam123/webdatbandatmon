import { initDb, db } from './database.js';

async function seed() {
  console.log('Starting database seeding...');
  await initDb();

  // Xóa sạch dữ liệu cũ để tránh trùng lặp khi chạy lại
  db.serialize(() => {
    db.run('DELETE FROM order_items');
    db.run('DELETE FROM orders');
    db.run('DELETE FROM tables');
    db.run('DELETE FROM menu_items');

    console.log('Cleaned existing database tables.');

    // 1. Chèn bàn ăn mẫu kèm QR token
    const tables = [
      { number: 'Bàn 01', qr: 'ban01_token_xyz' },
      { number: 'Bàn 02', qr: 'ban02_token_abc' },
      { number: 'Bàn 03', qr: 'ban03_token_def' },
      { number: 'Bàn 04', qr: 'ban04_token_ghi' },
      { number: 'Bàn 05', qr: 'ban05_token_jkl' }
    ];

    const stmtTable = db.prepare('INSERT INTO tables (table_number, qr_token, status) VALUES (?, ?, ?)');
    for (const t of tables) {
      stmtTable.run(t.number, t.qr, 'available');
    }
    stmtTable.finalize();
    console.log('Seeded tables.');

    // 2. Chèn món ăn mẫu
    const menuItems = [
      // Appetizers (Khai vị)
      {
        name: 'Súp Hải Sản Tóc Tiên',
        price: 45000,
        category: 'appetizer',
        image_url: 'https://images.unsplash.com/photo-1547592180-85f173990554?w=500&auto=format&fit=crop&q=60',
        description: 'Súp sệt nóng hổi với hải sản băm, nấm và tóc tiên thơm ngon bổ dưỡng.',
        is_available: 1
      },
      {
        name: 'Gỏi Cuốn Tôm Thịt (3 cái)',
        price: 35000,
        category: 'appetizer',
        image_url: 'https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?w=500&auto=format&fit=crop&q=60',
        description: 'Bánh tráng cuốn tôm tươi, ba chỉ heo, bún tươi, rau sống kèm tương đen đậu phộng.',
        is_available: 1
      },
      {
        name: 'Khoai Tây Chiên Phô Mai',
        price: 30000,
        category: 'appetizer',
        image_url: 'https://images.unsplash.com/photo-1576107232684-1279f390859f?w=500&auto=format&fit=crop&q=60',
        description: 'Khoai tây cọng chiên giòn lắc bột phô mai mặn ngọt béo ngậy.',
        is_available: 1
      },
      // Mains (Món chính)
      {
        name: 'Phở Bò Tái Lăn Đặc Biệt',
        price: 60000,
        category: 'main',
        image_url: 'https://images.unsplash.com/photo-1582878826629-29b7ad1cdc43?w=500&auto=format&fit=crop&q=60',
        description: 'Phở bò Hà Nội truyền thống với thịt bò xào lăn tỏi gừng thơm nức mũi.',
        is_available: 1
      },
      {
        name: 'Cơm Tấm Sườn Nướng Đặc Biệt',
        price: 65000,
        category: 'main',
        image_url: 'https://images.unsplash.com/photo-1512058564366-18510be2db19?w=500&auto=format&fit=crop&q=60',
        description: 'Cơm tấm dẻo thơm ăn kèm sườn bì chả, mỡ hành nước mắm chua ngọt đặc trưng.',
        is_available: 1
      },
      {
        name: 'Bò Lúc Lắc Khoai Tây Chiên',
        price: 120000,
        category: 'main',
        image_url: 'https://images.unsplash.com/photo-1600891964599-f61ba0e24092?w=500&auto=format&fit=crop&q=60',
        description: 'Thịt bò phi lê cắt khối vuông xào lửa lớn sốt tiêu đen kèm khoai tây chiên.',
        is_available: 1
      },
      {
        name: 'Lẩu Thái Hải Sản Đậm Đà (2-3 người)',
        price: 250000,
        category: 'main',
        image_url: 'https://images.unsplash.com/photo-1552611052-33e04de081de?w=500&auto=format&fit=crop&q=60',
        description: 'Lẩu thái chua cay với mực, tôm, cá viên, bò Mỹ cuộn nấm kim châm và rau củ.',
        is_available: 1
      },
      // Desserts (Tráng miệng)
      {
        name: 'Chè Thái Sầu Riêng Đặc Biệt',
        price: 35000,
        category: 'dessert',
        image_url: 'https://images.unsplash.com/photo-1497534446932-c925b458314e?w=500&auto=format&fit=crop&q=60',
        description: 'Chè thái nhiều thạch, trái cây tươi kèm múi sầu riêng tươi ngon béo ngậy.',
        is_available: 1
      },
      {
        name: 'Bánh Flan Cốt Dừa Béo Ngậy',
        price: 20000,
        category: 'dessert',
        image_url: 'https://images.unsplash.com/photo-1528975604071-b4dc52a2d18c?w=500&auto=format&fit=crop&q=60',
        description: 'Bánh flan mềm mịn ăn kèm đá bào, cà phê đắng nhẹ và nước cốt dừa.',
        is_available: 1
      },
      // Drinks (Đồ uống)
      {
        name: 'Cà Phê Sữa Đá Sài Gòn',
        price: 25000,
        category: 'drink',
        image_url: 'https://images.unsplash.com/photo-1517701604599-bb29b565090c?w=500&auto=format&fit=crop&q=60',
        description: 'Cà phê pha phin truyền thống thơm nồng kết hợp sữa đặc và đá viên.',
        is_available: 1
      },
      {
        name: 'Trà Đào Cam Sả Giải Nhiệt',
        price: 35000,
        category: 'drink',
        image_url: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=500&auto=format&fit=crop&q=60',
        description: 'Hương trà thơm thanh khiết kết hợp vị đào ngọt ngào, cam chua nhẹ và sả thơm mát.',
        is_available: 1
      },
      {
        name: 'Nước Ép Dưa Hấu Nguyên Chất',
        price: 30000,
        category: 'drink',
        image_url: 'https://images.unsplash.com/photo-1589733901241-5e56478f444f?w=500&auto=format&fit=crop&q=60',
        description: 'Dưa hấu chín mọng ép lấy nước ngọt thanh tự nhiên, mát rượi.',
        is_available: 1
      }
    ];

    const stmtMenu = db.prepare(
      'INSERT INTO menu_items (name, price, category, image_url, description, is_available) VALUES (?, ?, ?, ?, ?, ?)'
    );
    for (const item of menuItems) {
      stmtMenu.run(item.name, item.price, item.category, item.image_url, item.description, item.is_available);
    }
    stmtMenu.finalize();
    console.log('Seeded menu items.');

    console.log('Database seeding finished successfully!');
    db.close();
  });
}

seed().catch((err) => {
  console.error('Seeding failed:', err);
});

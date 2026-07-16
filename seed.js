import { initDb, getPool } from './database.js';
import bcrypt from 'bcryptjs';

async function seed() {
  console.log('Starting database seeding...');
  await initDb();
  
  const pool = getPool();
  if (!pool) {
    throw new Error('Database pool not initialized.');
  }

  // Xóa sạch dữ liệu cũ để tránh trùng lặp khi chạy lại
  console.log('Cleaning existing database tables...');
  await pool.query('SET FOREIGN_KEY_CHECKS = 0');
  await pool.query('TRUNCATE TABLE chi_tiet_don_hang');
  await pool.query('TRUNCATE TABLE don_hang');
  await pool.query('TRUNCATE TABLE ban_an');
  await pool.query('TRUNCATE TABLE thuc_don');
  await pool.query('TRUNCATE TABLE tai_khoan');
  await pool.query('SET FOREIGN_KEY_CHECKS = 1');
  console.log('Cleaned existing database tables.');

  // 0. Tạo tài khoản admin mặc định
  const hashedPassword = await bcrypt.hash('admin', 10);
  await pool.query('INSERT INTO tai_khoan (ten_dang_nhap, mat_khau, vai_tro) VALUES (?, ?, ?)', ['admin', hashedPassword, 'admin']);
  console.log('Seeded default admin user (admin/admin).');

  // 1. Chèn bàn ăn mẫu kèm QR token
  const tables = [
    { number: 'Bàn 01', qr: 'datmonban1' },
    { number: 'Bàn 02', qr: 'datmonban2' },
    { number: 'Bàn 03', qr: 'datmonban3' },
    { number: 'Bàn 04', qr: 'datmonban4' },
    { number: 'Bàn 05', qr: 'datmonban5' }
  ];

  for (const t of tables) {
    await pool.query('INSERT INTO ban_an (ten_ban, ma_duong_dan, trang_thai) VALUES (?, ?, ?)', [t.number, t.qr, 'available']);
  }
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

  for (const item of menuItems) {
    await pool.query(
      'INSERT INTO thuc_don (ten_mon, gia_tien, loai_mon, anh_minh_hoa, mo_ta, con_hang) VALUES (?, ?, ?, ?, ?, ?)',
      [item.name, item.price, item.category, item.image_url, item.description, item.is_available]
    );
  }
  console.log('Seeded menu items.');

  console.log('Database seeding finished successfully!');
  pool.end();
}

seed().catch((err) => {
  console.error('Seeding failed:', err);
  process.exit(1);
});

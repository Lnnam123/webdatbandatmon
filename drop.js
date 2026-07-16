import mysql from 'mysql2/promise';

async function drop() {
  const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'restaurant_db'
  });
  await pool.query('SET FOREIGN_KEY_CHECKS = 0');
  await pool.query('DROP TABLE IF EXISTS chi_tiet_don_hang');
  await pool.query('DROP TABLE IF EXISTS don_hang');
  await pool.query('DROP TABLE IF EXISTS thuc_don');
  await pool.query('DROP TABLE IF EXISTS ban_an');
  await pool.query('DROP TABLE IF EXISTS tai_khoan');
  await pool.query('SET FOREIGN_KEY_CHECKS = 1');
  console.log('Tables dropped.');
  process.exit(0);
}
drop();

import { exec } from 'child_process';
import cron from 'node-cron';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function runBackupOnce(prefix = '') {
    return new Promise((resolve) => {
        const date = new Date().toISOString().replace(/T/, '_').replace(/\..+/, '').replace(/:/g, '-');
        const backupDir = path.join(__dirname, 'backups');
        const fileNamePrefix = prefix ? `${prefix}_` : '';
        const backupFile = path.join(backupDir, `${fileNamePrefix}restaurant_db_${date}.sql`);

        if (!fs.existsSync(backupDir)) {
            fs.mkdirSync(backupDir);
        }

        let command = `mysqldump -u root restaurant_db > "${backupFile}"`;
        
        exec(command, (error, stdout, stderr) => {
            if (error) {
                console.log(`[Backup Cảnh Báo]: Lỗi với lệnh mysqldump mặc định: ${error.message}, thử dùng đường dẫn Laragon...`);
                const fallbackCommand = `"C:\\laragon\\bin\\mysql\\mysql-8.4.3-winx64\\bin\\mysqldump.exe" -u root restaurant_db > "${backupFile}"`;
                exec(fallbackCommand, (err2) => {
                    if (err2) {
                        console.error(`[Backup Lỗi]: Không thể sao lưu database. Lỗi: ${err2.message}`);
                    } else {
                        console.log(`[Backup Thành Công]: Đã lưu Database (Laragon path) vào: ${backupFile}`);
                    }
                    resolve();
                });
                return;
            }
            console.log(`[Backup Thành Công]: Đã lưu Database vào: ${backupFile}`);
            resolve();
        });
    });
}

export function startBackupCron() {
    cron.schedule('0 0 * * *', () => {
        runBackupOnce('daily');
    });
    console.log('🔄 Đã thiết lập tính năng tự động sao lưu Database vào 00:00 mỗi ngày.');
}

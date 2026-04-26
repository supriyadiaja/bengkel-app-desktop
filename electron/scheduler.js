/**
 * Scheduler — Dua Putra Jaya Motor
 * Menjalankan backup otomatis tiap awal bulan
 */

const { uploadBackup, isAuthenticated } = require('./backup');

let schedulerInterval = null;
let lastBackupMonth = null;

/**
 * Cek apakah sekarang sudah awal bulan (tanggal 1)
 * dan belum pernah backup bulan ini
 */
function shouldBackup() {
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${now.getMonth()}`;
  const isFirstDay = now.getDate() === 1;
  const alreadyBackedUp = lastBackupMonth === currentMonth;

  return isFirstDay && !alreadyBackedUp;
}

/**
 * Jalankan scheduler — cek setiap jam
 */
function startScheduler(mainWindow) {
  if (schedulerInterval) return; // Sudah jalan

  console.log('✅ Backup scheduler started');

  schedulerInterval = setInterval(async () => {
    if (!shouldBackup()) return;
    if (!isAuthenticated()) return;

    try {
      console.log('🔄 Menjalankan backup otomatis...');
      const result = await uploadBackup();

      // Update last backup month
      const now = new Date();
      lastBackupMonth = `${now.getFullYear()}-${now.getMonth()}`;

      // Simpan log ke settings (via IPC ke main)
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('backup:success', result);
      }

      console.log('✅ Backup otomatis berhasil:', result.fileName);
    } catch (err) {
      console.error('❌ Backup otomatis gagal:', err.message);
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('backup:error', { message: err.message });
      }
    }
  }, 60 * 60 * 1000); // Cek setiap 1 jam
}

/**
 * Hentikan scheduler
 */
function stopScheduler() {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
    schedulerInterval = null;
    console.log('⏹ Backup scheduler stopped');
  }
}

/**
 * Status scheduler
 */
function isSchedulerRunning() {
  return schedulerInterval !== null;
}

module.exports = {
  startScheduler,
  stopScheduler,
  isSchedulerRunning,
};
/**
 * Dua Putra Jaya Motor — Electron Main Process
 * Handles: Window, Database (SQLite), Thermal Printer, Serial Port
 */

require('dotenv').config({ path: '.env.local' });

const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const isDev = !app.isPackaged;

let autoUpdater;
try {
  autoUpdater = require('electron-updater').autoUpdater;
} catch (e) {
  console.log('electron-updater not available:', e.message);
}

let backup, scheduler;
try {
  backup = require('./backup');
  scheduler = require('./scheduler');
} catch (e) {
  console.log('backup/scheduler modules not available:', e.message);
  backup = {
    isAuthenticated: () => false,
    getAuthUrl: () => '',
    saveToken: async () => { },
    uploadBackup: async () => ({ success: false, message: 'Not configured' }),
    disconnectGoogle: () => ({ success: true }),
  };
  scheduler = {
    startScheduler: () => { },
    stopScheduler: () => { },
    isSchedulerRunning: () => false,
  };
}

const { isAuthenticated, getAuthUrl, saveToken, uploadBackup, disconnectGoogle } = backup;
const { startScheduler, stopScheduler, isSchedulerRunning } = scheduler;

// ─── Database Setup ───────────────────────────────────────────────────────────
let db;

function initDatabase() {
  const Database = require('better-sqlite3');
  const userDataPath = app.getPath('userData');
  const dbPath = path.join(userDataPath, 'bengkel.db');

  console.log('Database path:', dbPath);
  db = new Database(dbPath);

  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  const schemaPath = isDev
    ? path.join(__dirname, 'schema.sql')
    : path.join(process.resourcesPath, 'electron', 'schema.sql');

  const schema = fs.readFileSync(schemaPath, 'utf8');
  db.exec(schema);

  const adminExists = db.prepare("SELECT id FROM users WHERE role = 'admin' LIMIT 1").get();
  if (!adminExists) {
    db.prepare('INSERT INTO users (nama, role, pin) VALUES (?, ?, ?)').run('Administrator', 'admin', '1234');
    db.prepare('INSERT INTO users (nama, role, pin) VALUES (?, ?, ?)').run('Kasir', 'kasir', '0000');
  }

  console.log('✅ Database initialized');
}

// ─── Window Management ────────────────────────────────────────────────────────
let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 420,
    height: 580,
    resizable: false,
    frame: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    icon: path.join(__dirname, '../public/icon.ico'),
    show: false,
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:3000');
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    mainWindow.loadURL(`file://${path.join(process.resourcesPath, 'build/index.html')}`);
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    try {
      if (isAuthenticated()) startScheduler(mainWindow);
    } catch (e) { }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
    try { stopScheduler(); } catch (e) { }
  });
}

// ─── App Ready ────────────────────────────────────────────────────────────────
app.whenReady().then(() => {
  initDatabase();
  createWindow();

  if (!isDev && autoUpdater) {
    try {
      autoUpdater.checkForUpdatesAndNotify();
      autoUpdater.on('update-downloaded', () => {
        dialog.showMessageBox({
          type: 'info',
          title: 'Update Tersedia',
          message: 'Versi baru sudah didownload. Restart untuk menginstall?',
          buttons: ['Restart Sekarang', 'Nanti'],
        }).then(result => {
          if (result.response === 0) autoUpdater.quitAndInstall();
        });
      });
    } catch (e) {
      console.log('AutoUpdater error:', e.message);
    }
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// ─── IPC: Auth ────────────────────────────────────────────────────────────────
ipcMain.handle('auth:login', (_, { pin }) => {
  try {
    const user = db.prepare('SELECT * FROM users WHERE pin = ? AND aktif = 1').get(pin);
    if (!user) return { success: false, message: 'PIN salah atau akun tidak aktif' };
    const { pin: _pin, ...safeUser } = user;
    return { success: true, user: safeUser };
  } catch (e) {
    return { success: false, message: e.message };
  }
});

ipcMain.handle('auth:getUsers', () => {
  return db.prepare('SELECT id, nama, role, aktif FROM users').all();
});

ipcMain.handle('auth:addUser', (_, { nama, role, pin }) => {
  try {
    const result = db.prepare('INSERT INTO users (nama, role, pin) VALUES (?, ?, ?)').run(nama, role, pin);
    return { success: true, id: result.lastInsertRowid };
  } catch (e) {
    return { success: false, message: e.message };
  }
});

// Setelah login sukses, resize window dari login ke main
ipcMain.on('auth:openMain', () => {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  mainWindow.setResizable(true);
  mainWindow.setMinimumSize(1024, 680);
  mainWindow.setSize(1280, 800);
  mainWindow.center();
  mainWindow.maximize();
});

// ─── IPC: Pelanggan ───────────────────────────────────────────────────────────
ipcMain.handle('pelanggan:getAll', () => {
  return db.prepare(`
    SELECT p.*, COUNT(i.id) as total_servis, MAX(i.tanggal) as terakhir_servis
    FROM pelanggan p
    LEFT JOIN invoice i ON i.pelanggan_id = p.id
    GROUP BY p.id
    ORDER BY p.nama ASC
  `).all();
});

ipcMain.handle('pelanggan:search', (_, query) => {
  return db.prepare(`
    SELECT * FROM pelanggan
    WHERE nama LIKE ? OR no_plat LIKE ? OR no_telp LIKE ?
    ORDER BY nama ASC
  `).all(`%${query}%`, `%${query}%`, `%${query}%`);
});

ipcMain.handle('pelanggan:add', (_, data) => {
  try {
    const result = db.prepare(`
      INSERT INTO pelanggan (nama, no_telp, jenis_motor, no_plat, tahun_motor, warna, catatan)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(data.nama, data.no_telp, data.jenis_motor, data.no_plat, data.tahun_motor, data.warna, data.catatan);
    return { success: true, id: result.lastInsertRowid };
  } catch (e) {
    return { success: false, message: e.message };
  }
});

ipcMain.handle('pelanggan:update', (_, { id, ...data }) => {
  try {
    db.prepare(`
      UPDATE pelanggan SET nama=?, no_telp=?, jenis_motor=?, no_plat=?, tahun_motor=?, warna=?, catatan=?, updated_at=datetime('now','localtime')
      WHERE id=?
    `).run(data.nama, data.no_telp, data.jenis_motor, data.no_plat, data.tahun_motor, data.warna, data.catatan, id);
    return { success: true };
  } catch (e) {
    return { success: false, message: e.message };
  }
});

ipcMain.handle('pelanggan:getRiwayat', (_, pelangganId) => {
  return db.prepare(`
    SELECT i.*, GROUP_CONCAT(ii.nama_item, ' | ') as items
    FROM invoice i
    LEFT JOIN invoice_item ii ON ii.invoice_id = i.id
    WHERE i.pelanggan_id = ?
    GROUP BY i.id
    ORDER BY i.tanggal DESC
  `).all(pelangganId);
});

// ─── IPC: Invoice ─────────────────────────────────────────────────────────────
function generateInvoiceNo() {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const prefix = `INV-${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}`;

  const last = db.prepare(`
    SELECT no_invoice FROM invoice
    WHERE no_invoice LIKE ?
    ORDER BY id DESC LIMIT 1
  `).get(`${prefix}%`);

  let seq = 1;
  if (last) {
    const lastSeq = parseInt(last.no_invoice.split('-').pop());
    seq = lastSeq + 1;
  }
  return `${prefix}-${String(seq).padStart(3, '0')}`;
}

ipcMain.handle('invoice:getAll', (_, { limit = 100, offset = 0, status } = {}) => {
  let q = `
    SELECT i.*, p.nama as nama_pelanggan, p.jenis_motor, p.no_plat
    FROM invoice i
    JOIN pelanggan p ON p.id = i.pelanggan_id
  `;
  const params = [];
  if (status) { q += ' WHERE i.status = ?'; params.push(status); }
  q += ' ORDER BY i.created_at DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);
  return db.prepare(q).all(...params);
});

ipcMain.handle('invoice:getById', (_, id) => {
  const inv = db.prepare(`
    SELECT i.*, p.nama as nama_pelanggan, p.no_telp, p.jenis_motor, p.no_plat
    FROM invoice i JOIN pelanggan p ON p.id = i.pelanggan_id
    WHERE i.id = ?
  `).get(id);
  if (!inv) return null;
  inv.items = db.prepare('SELECT * FROM invoice_item WHERE invoice_id = ?').all(id);
  return inv;
});

ipcMain.handle('invoice:create', (_, { pelangganId, odometer, keluhan, mekanik, items, diskon, metode_bayar, status }) => {
  const createInvoice = db.transaction(() => {
    const noInvoice = generateInvoiceNo();
    const subtotal = items.reduce((s, i) => s + (i.qty * i.harga), 0);
    const total = subtotal - (diskon || 0);

    const inv = db.prepare(`
      INSERT INTO invoice (no_invoice, pelanggan_id, odometer_masuk, keluhan, mekanik, subtotal, diskon, total, metode_bayar, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(noInvoice, pelangganId, odometer, keluhan, mekanik, subtotal, diskon || 0, total, metode_bayar || 'Tunai', status || 'Lunas');

    const invoiceId = inv.lastInsertRowid;

    for (const item of items) {
      db.prepare(`
        INSERT INTO invoice_item (invoice_id, nama_item, qty, satuan, harga, subtotal)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(invoiceId, item.nama_item, item.qty, item.satuan, item.harga, item.qty * item.harga);

      if (item.satuan !== 'Jasa' && item.sparepart_id) {
        db.prepare('UPDATE sparepart SET stok = stok - ? WHERE id = ?').run(item.qty, item.sparepart_id);
        db.prepare(`
          INSERT INTO stok_mutasi (sparepart_id, tipe, qty, keterangan, ref_id)
          VALUES (?, 'keluar', ?, ?, ?)
        `).run(item.sparepart_id, item.qty, `Terpakai invoice ${noInvoice}`, invoiceId);
      }
    }

    const today = new Date().toISOString().split('T')[0];
    const existing = db.prepare('SELECT id FROM laporan_harian WHERE tanggal = ?').get(today);
    if (existing) {
      db.prepare(`
        UPDATE laporan_harian SET total_pendapatan = total_pendapatan + ?, total_transaksi = total_transaksi + 1,
        updated_at = datetime('now','localtime') WHERE tanggal = ?
      `).run(total, today);
    } else {
      db.prepare(`
        INSERT INTO laporan_harian (tanggal, total_pendapatan, total_transaksi) VALUES (?, ?, 1)
      `).run(today, total);
    }

    return { success: true, id: invoiceId, no_invoice: noInvoice };
  });

  try {
    return createInvoice();
  } catch (e) {
    return { success: false, message: e.message };
  }
});

ipcMain.handle('invoice:updateStatus', (_, { id, status }) => {
  try {
    db.prepare('UPDATE invoice SET status = ? WHERE id = ?').run(status, id);
    return { success: true };
  } catch (e) {
    return { success: false, message: e.message };
  }
});

// ─── IPC: Sparepart ───────────────────────────────────────────────────────────
ipcMain.handle('sparepart:getAll', () => {
  return db.prepare('SELECT * FROM sparepart ORDER BY nama ASC').all();
});

ipcMain.handle('sparepart:getStokMenipis', () => {
  return db.prepare('SELECT * FROM sparepart WHERE stok <= stok_minimum ORDER BY stok ASC').all();
});

ipcMain.handle('sparepart:add', (_, data) => {
  try {
    const result = db.prepare(`
      INSERT INTO sparepart (kode, nama, kategori, stok, stok_minimum, harga_beli, harga_jual, satuan)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(data.kode, data.nama, data.kategori, data.stok, data.stok_minimum, data.harga_beli, data.harga_jual, data.satuan);
    return { success: true, id: result.lastInsertRowid };
  } catch (e) {
    return { success: false, message: e.message };
  }
});

ipcMain.handle('sparepart:update', (_, { id, ...data }) => {
  try {
    db.prepare(`
      UPDATE sparepart SET nama=?, kategori=?, stok_minimum=?, harga_beli=?, harga_jual=?, satuan=?, updated_at=datetime('now','localtime')
      WHERE id=?
    `).run(data.nama, data.kategori, data.stok_minimum, data.harga_beli, data.harga_jual, data.satuan, id);
    return { success: true };
  } catch (e) {
    return { success: false, message: e.message };
  }
});

ipcMain.handle('sparepart:stokMasuk', (_, { id, qty, keterangan }) => {
  try {
    db.prepare('UPDATE sparepart SET stok = stok + ? WHERE id = ?').run(qty, id);
    db.prepare(`
      INSERT INTO stok_mutasi (sparepart_id, tipe, qty, keterangan) VALUES (?, 'masuk', ?, ?)
    `).run(id, qty, keterangan || 'Stok masuk');
    return { success: true };
  } catch (e) {
    return { success: false, message: e.message };
  }
});

ipcMain.handle('sparepart:getMutasi', (_, sparepartId) => {
  return db.prepare(`
    SELECT * FROM stok_mutasi WHERE sparepart_id = ? ORDER BY created_at DESC LIMIT 100
  `).all(sparepartId);
});

ipcMain.handle('stok:getAllMutasi', () => {
  return db.prepare(`
    SELECT
      sm.*,
      sp.kode     AS kode_sparepart,
      sp.nama     AS nama_sparepart,
      sp.kategori AS kategori
    FROM stok_mutasi sm
    LEFT JOIN sparepart sp ON sp.id = sm.sparepart_id
    ORDER BY sm.created_at DESC
    LIMIT 500
  `).all();
});

// ─── IPC: Laporan ─────────────────────────────────────────────────────────────
ipcMain.handle('laporan:harian', (_, { dari, sampai }) => {
  return db.prepare(`
    SELECT * FROM laporan_harian
    WHERE tanggal BETWEEN ? AND ?
    ORDER BY tanggal DESC
  `).all(dari, sampai);
});

ipcMain.handle('laporan:bulanan', (_, { tahun, bulan }) => {
  const dari = `${tahun}-${String(bulan).padStart(2, '0')}-01`;
  const sampai = `${tahun}-${String(bulan).padStart(2, '0')}-31`;

  const summary = db.prepare(`
    SELECT
      SUM(total)  as total_pendapatan,
      COUNT(*)    as total_transaksi,
      AVG(total)  as rata_rata
    FROM invoice
    WHERE tanggal BETWEEN ? AND ? AND status = 'Lunas'
  `).get(dari, sampai);

  const perKategori = db.prepare(`
    SELECT
      CASE WHEN ii.satuan = 'Jasa' THEN 'Jasa Servis' ELSE 'Sparepart' END as kategori,
      SUM(ii.subtotal) as total
    FROM invoice_item ii
    JOIN invoice i ON i.id = ii.invoice_id
    WHERE i.tanggal BETWEEN ? AND ? AND i.status = 'Lunas'
    GROUP BY kategori
  `).all(dari, sampai);

  return { summary, perKategori };
});

// ─── IPC: Pengaturan ──────────────────────────────────────────────────────────
ipcMain.handle('settings:get', () => {
  return db.prepare('SELECT * FROM pengaturan').all()
    .reduce((acc, row) => { acc[row.key] = row.value; return acc; }, {});
});

ipcMain.handle('settings:set', (_, { key, value }) => {
  try {
    db.prepare('INSERT OR REPLACE INTO pengaturan (key, value) VALUES (?, ?)').run(key, value);
    return { success: true };
  } catch (e) {
    return { success: false, message: e.message };
  }
});

// ─── IPC: Thermal Printer ─────────────────────────────────────────────────────
ipcMain.handle('printer:getPorts', async () => {
  try {
    const { SerialPort } = require('serialport');
    const ports = await SerialPort.list();
    return ports.map(p => ({ path: p.path, manufacturer: p.manufacturer }));
  } catch (e) {
    return [];
  }
});

ipcMain.handle('printer:test', async (_, { type, interface: iface, host, port: printerPort, serialPath }) => {
  try {
    const { ThermalPrinter, PrinterTypes, CharacterSet } = require('node-thermal-printer');

    const printerConfig = {
      type: PrinterTypes.EPSON,
      characterSet: CharacterSet.PC852_LATIN2,
      removeSpecialCharacters: false,
    };

    if (type === 'network') {
      printerConfig.interface = `tcp://${host}:${printerPort || 9100}`;
    } else if (type === 'serial') {
      printerConfig.interface = serialPath;
    } else {
      printerConfig.interface = `printer:${iface}`;
    }

    const printer = new ThermalPrinter(printerConfig);
    const isConnected = await printer.isPrinterConnected();
    if (!isConnected) return { success: false, message: 'Printer tidak terhubung' };

    printer.alignCenter();
    printer.println('=== TEST PRINT ===');
    printer.println('Dua Putra Jaya Motor');
    printer.println('Printer terhubung!');
    printer.cut();
    await printer.execute();

    return { success: true };
  } catch (e) {
    return { success: false, message: e.message };
  }
});

ipcMain.handle('printer:printInvoice', async (_, invoiceId) => {
  try {
    const { ThermalPrinter, PrinterTypes, CharacterSet } = require('node-thermal-printer');

    const settings = db.prepare('SELECT * FROM pengaturan').all()
      .reduce((acc, row) => { acc[row.key] = row.value; return acc; }, {});

    const inv = db.prepare(`
      SELECT i.*, p.nama as nama_pelanggan, p.no_telp, p.jenis_motor, p.no_plat
      FROM invoice i JOIN pelanggan p ON p.id = i.pelanggan_id
      WHERE i.id = ?
    `).get(invoiceId);

    if (!inv) return { success: false, message: 'Invoice tidak ditemukan' };
    inv.items = db.prepare('SELECT * FROM invoice_item WHERE invoice_id = ?').all(invoiceId);

    const printer = new ThermalPrinter({
      type: PrinterTypes.EPSON,
      interface: settings.printer_interface || 'printer:POS-80',
      characterSet: CharacterSet.PC852_LATIN2,
      removeSpecialCharacters: false,
      width: settings.printer_lebar === '58' ? 32 : 48,
    });

    const isConnected = await printer.isPrinterConnected();
    if (!isConnected) return { success: false, message: 'Printer tidak terhubung. Cek pengaturan printer.' };

    const width = settings.printer_lebar === '58' ? 32 : 48;
    const shopName = settings.nama_bengkel || 'Dua Putra Jaya Motor';
    const shopAddr = settings.alamat || '';
    const shopPhone = settings.telepon || '';
    const shopWa = settings.whatsapp || '';
    const garansi = settings.garansi || '3 hari / 500 km';
    const footer = settings.footer_struk || 'Terima kasih atas kunjungan Anda!';
    const LINE = '-'.repeat(width);
    const DASH = '- '.repeat(width / 2);

    printer.alignCenter();
    printer.bold(true);
    printer.setTextSize(1, 1);
    printer.println(shopName);
    printer.setTextNormal();
    printer.bold(false);
    if (shopAddr) printer.println(shopAddr);
    if (shopPhone) printer.println(`Telp: ${shopPhone}`);
    if (shopWa) printer.println(`WA: ${shopWa}`);
    printer.println(LINE);

    printer.alignLeft();
    printer.println(`No  : ${inv.no_invoice}`);
    printer.println(`Tgl : ${new Date(inv.tanggal || inv.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' })} ${new Date(inv.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}`);
    printer.println(`Plg : ${inv.nama_pelanggan}`);
    if (inv.no_telp) printer.println(`WA  : ${inv.no_telp}`);
    printer.println(`Mtr : ${inv.jenis_motor} / ${inv.no_plat}`);
    if (inv.odometer_masuk) printer.println(`KM  : ${inv.odometer_masuk}`);
    if (inv.mekanik) printer.println(`Mek : ${inv.mekanik}`);
    if (inv.keluhan) printer.println(`Kel : ${inv.keluhan}`);
    printer.println(DASH);

    for (const item of inv.items) {
      const nama = item.nama_item.length > width - 4 ? item.nama_item.substring(0, width - 4) : item.nama_item;
      printer.println(nama);
      const qtyHarga = `  ${item.qty} x ${formatRupiah(item.harga)}`;
      const sub = formatRupiah(item.subtotal);
      const spaces = Math.max(1, width - qtyHarga.length - sub.length);
      printer.println(qtyHarga + ' '.repeat(spaces) + sub);
    }

    printer.println(DASH);
    printer.printLeftRight('Subtotal', formatRupiah(inv.subtotal), width);
    if (inv.diskon > 0) printer.printLeftRight('Diskon', `-${formatRupiah(inv.diskon)}`, width);
    printer.println(LINE);
    printer.bold(true);
    printer.printLeftRight('TOTAL', formatRupiah(inv.total), width);
    printer.bold(false);
    printer.println(LINE);
    printer.printLeftRight(`Bayar (${inv.metode_bayar || 'Tunai'})`, formatRupiah(inv.total), width);
    printer.printLeftRight('Kembali', 'Rp 0', width);
    printer.println(LINE);

    printer.alignCenter();
    printer.println('');
    printer.println(footer);
    printer.println(`Garansi: ${garansi}`);
    printer.println('');
    printer.cut();

    await printer.execute();
    return { success: true };

  } catch (e) {
    console.error('Print error:', e);
    return { success: false, message: e.message };
  }
});

// ─── Utility ──────────────────────────────────────────────────────────────────
function formatRupiah(n) {
  return 'Rp ' + Number(n || 0).toLocaleString('id-ID');
}

// ─── IPC: AI (Groq) ──────────────────────────────────────────────────────────
async function callGroq(systemPrompt, userPrompt, maxTokens = 1024) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error('GROQ_API_KEY tidak ditemukan di .env.local');

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'llama-3.1-8b-instant',
      max_tokens: maxTokens,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Groq API error: ${err}`);
  }

  const result = await response.json();
  return result.choices?.[0]?.message?.content || '';
}

ipcMain.handle('ai:generateInsights', async (_, summary) => {
  try {
    const text = await callGroq(
      `Kamu adalah konsultan bisnis bengkel motor berpengalaman di Indonesia.
Berikan analisis praktis, spesifik, dan actionable dalam Bahasa Indonesia.
Selalu gunakan angka nyata dari data. Response hanya JSON murni tanpa backticks.`,
      `Analisis data bengkel ini dan berikan 5 insight bisnis:

${JSON.stringify(summary, null, 2)}

Balas HANYA JSON array (tanpa teks lain):
[{"tipe":"peluang"|"peringatan"|"rekomendasi"|"tren","judul":"...","isi":"...","aksi":"...","dampak":"tinggi"|"sedang"|"rendah"}]`
    );
    const parsed = JSON.parse(text.replace(/```json|```/g, '').trim());
    return { success: true, data: Array.isArray(parsed) ? parsed : [] };
  } catch (e) {
    return { success: false, message: e.message };
  }
});

ipcMain.handle('ai:generatePrediksi', async (_, stokData) => {
  try {
    const text = await callGroq(
      'Kamu adalah sistem prediksi stok bengkel motor. Balas HANYA JSON murni tanpa backticks.',
      `Buat prediksi restock untuk sparepart ini:
${JSON.stringify(stokData)}

Hitung hari_habis = stok / (terjual_30hari/30), qty_restock = terjual_30hari * 1.5

Balas HANYA JSON array:
[{"kode":"...","nama":"...","hari_habis":0,"prioritas":"segera"|"minggu_ini"|"bulan_ini"|"aman","qty_restock":0,"estimasi_biaya":0,"alasan":"..."}]
Urutkan dari prioritas tertinggi.`
    );
    const parsed = JSON.parse(text.replace(/```json|```/g, '').trim());
    return { success: true, data: Array.isArray(parsed) ? parsed : [] };
  } catch (e) {
    return { success: false, message: e.message };
  }
});

ipcMain.handle('ai:chat', async (_, { messages, context }) => {
  try {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) return { success: false, message: 'GROQ_API_KEY tidak ditemukan' };

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        max_tokens: 1024,
        messages: [
          {
            role: 'system',
            content: `Kamu adalah konsultan bisnis bengkel motor berpengalaman.
Gunakan Bahasa Indonesia yang ramah namun profesional.
Berikan jawaban konkret, praktis, dan berbasis data.
Data bengkel: ${JSON.stringify(context)}`,
          },
          ...messages,
        ],
      }),
    });

    const result = await response.json();
    const reply = result.choices?.[0]?.message?.content || 'Maaf, tidak bisa memproses.';
    return { success: true, data: reply };
  } catch (e) {
    return { success: false, message: e.message };
  }
});

// ─── IPC: Google Drive Backup ─────────────────────────────────────────────────
ipcMain.handle('backup:status', () => {
  try {
    return {
      connected: isAuthenticated(),
      schedulerRunning: isSchedulerRunning(),
    };
  } catch (e) {
    return { connected: false, schedulerRunning: false };
  }
});

ipcMain.handle('backup:getAuthUrl', () => {
  try { return getAuthUrl(); } catch (e) { return ''; }
});

ipcMain.handle('backup:saveToken', async (_, code) => {
  try {
    await saveToken(code);
    if (mainWindow && !mainWindow.isDestroyed()) {
      startScheduler(mainWindow);
    }
    return { success: true };
  } catch (e) {
    return { success: false, message: e.message };
  }
});

ipcMain.handle('backup:runNow', async () => {
  try {
    return await uploadBackup();
  } catch (e) {
    return { success: false, message: e.message };
  }
});

ipcMain.handle('backup:toggleScheduler', (_, enable) => {
  try {
    if (enable && mainWindow && !mainWindow.isDestroyed()) {
      startScheduler(mainWindow);
    } else {
      stopScheduler();
    }
    return { success: true, running: isSchedulerRunning() };
  } catch (e) {
    return { success: false, message: e.message };
  }
});

ipcMain.handle('backup:disconnect', () => {
  try {
    stopScheduler();
    return disconnectGoogle();
  } catch (e) {
    return { success: false, message: e.message };
  }
});

// ─── IPC: Window Controls (frameless) ────────────────────────────────────────
ipcMain.on('window:minimize', () => {
  if (mainWindow && !mainWindow.isDestroyed()) mainWindow.minimize();
});

ipcMain.on('window:maximize', () => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.isMaximized() ? mainWindow.unmaximize() : mainWindow.maximize();
  }
});

ipcMain.on('window:close', () => {
  if (mainWindow && !mainWindow.isDestroyed()) mainWindow.close();
});
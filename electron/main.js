/**
 * Dua Putra Jaya Motor — Electron Main Process
 * Handles: Window, Database (SQLite), Thermal Printer, Serial Port
 */

require('dotenv').config({ path: '.env.local' });

const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const isDev = process.env.NODE_ENV !== 'production';
const { autoUpdater } = require('electron-updater');

const { isAuthenticated, getAuthUrl, saveToken, uploadBackup, disconnectGoogle } = require('./backup');
const { startScheduler, stopScheduler, isSchedulerRunning } = require('./scheduler');

// ─── Database Setup ───────────────────────────────────────────────────────────
let db;
function initDatabase() {
  const Database = require('better-sqlite3');
  const userDataPath = app.getPath('userData');
  const dbPath = path.join(userDataPath, 'bengkel.db');

  console.log('Database path:', dbPath);
  db = new Database(dbPath);

  // Enable WAL mode for better performance
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  // Create tables from schema
  const schemaPath = isDev
    ? path.join(__dirname, 'schema.sql')
    : path.join(process.resourcesPath, 'electron', 'schema.sql');

  const schema = fs.readFileSync(schemaPath, 'utf8');
  db.exec(schema);

  // Seed default admin if not exists
  const adminExists = db.prepare("SELECT id FROM users WHERE role = 'admin' LIMIT 1").get();
  if (!adminExists) {
    db.prepare(`
      INSERT INTO users (nama, role, pin) VALUES (?, ?, ?)
    `).run('Administrator', 'admin', '1234'); // Default PIN: 1234
    db.prepare(`
      INSERT INTO users (nama, role, pin) VALUES (?, ?, ?)
    `).run('Kasir', 'kasir', '0000');
  }

  console.log('✅ Database initialized');
}

// ─── Window Management ────────────────────────────────────────────────────────
let mainWindow;
let loginWindow;

function createLoginWindow() {
  loginWindow = new BrowserWindow({
    width: 420,
    height: 560,
    resizable: false,
    frame: false,
    transparent: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    icon: path.join(__dirname, '../public/icon.ico'),
  });

  const startURL = isDev
    ? 'http://localhost:3000/#/login'
    : `file://${path.join(__dirname, '../build/index.html')}#/login`;

  loginWindow.loadURL(startURL);
}

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 680,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    icon: path.join(__dirname, '../public/icon.ico'),
    show: false,
  });

  const startURL = isDev
    ? 'http://localhost:3000'
    : `file://${path.join(__dirname, '../build/index.html')}`;

  mainWindow.loadURL(startURL);
  mainWindow.once('ready-to-show', () => mainWindow.show());

  if (isDev) mainWindow.webContents.openDevTools({ mode: 'detach' });
}

app.whenReady().then(() => {
  initDatabase();
  createLoginWindow(); // Start with login
  // createMainWindow(); // Uncomment to skip login during dev

  // Mulai scheduler backup otomatis (kalau sudah login Google)
  if (isAuthenticated()) {
    startScheduler(mainWindow);
  }

  // Cek update otomatis
  autoUpdater.checkForUpdatesAndNotify();

  // Notifikasi saat update siap
  autoUpdater.on('update-downloaded', () => {
    dialog.showMessageBox({
      type: 'info',
      title: 'Update Tersedia',
      message: 'Versi baru sudah didownload. Restart untuk menginstall?',
      buttons: ['Restart Sekarang', 'Nanti']
    }).then(result => {
      if (result.response === 0) autoUpdater.quitAndInstall();
    });
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createLoginWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// ─── IPC: Auth ────────────────────────────────────────────────────────────────
ipcMain.handle('auth:login', (_, { pin }) => {
  const user = db.prepare('SELECT * FROM users WHERE pin = ? AND aktif = 1').get(pin);
  if (!user) return { success: false, message: 'PIN salah atau akun tidak aktif' };

  // Don't return PIN to renderer
  const { pin: _pin, ...safeUser } = user;
  return { success: true, user: safeUser };
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

ipcMain.on('auth:openMain', () => {
  if (loginWindow) loginWindow.close();
  createMainWindow();
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
      UPDATE pelanggan SET nama=?, no_telp=?, jenis_motor=?, no_plat=?, tahun_motor=?, warna=?, catatan=?
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

ipcMain.handle('invoice:getAll', (_, { limit = 50, offset = 0, status } = {}) => {
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

      // Kurangi stok jika bukan jasa
      if (item.satuan !== 'Jasa' && item.sparepart_id) {
        db.prepare('UPDATE sparepart SET stok = stok - ? WHERE id = ?').run(item.qty, item.sparepart_id);
        // Catat mutasi stok
        db.prepare(`
          INSERT INTO stok_mutasi (sparepart_id, tipe, qty, keterangan, ref_id)
          VALUES (?, 'keluar', ?, ?, ?)
        `).run(item.sparepart_id, item.qty, `Terpakai invoice ${noInvoice}`, invoiceId);
      }
    }

    // Catat ke laporan harian
    const today = new Date().toISOString().split('T')[0];
    const existing = db.prepare('SELECT id FROM laporan_harian WHERE tanggal = ?').get(today);
    if (existing) {
      db.prepare(`
        UPDATE laporan_harian SET total_pendapatan = total_pendapatan + ?, total_transaksi = total_transaksi + 1
        WHERE tanggal = ?
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
  db.prepare('UPDATE invoice SET status = ? WHERE id = ?').run(status, id);
  return { success: true };
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
    SELECT * FROM stok_mutasi WHERE sparepart_id = ? ORDER BY created_at DESC LIMIT 50
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

// ─── IPC: Groq AI ─────────────────────────────────────────────────────────────
async function callGroq(systemPrompt, userPrompt, maxTokens = 1024) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return { success: false, message: 'GROQ_API_KEY tidak ditemukan di .env.local' };

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
      `Analisis data bengkel ini dan berikan 5 insight bisnis paling valuable:

${JSON.stringify(summary, null, 2)}

Balas HANYA dengan JSON array ini (tanpa teks lain):
[
  {
    "tipe": "peluang" | "peringatan" | "rekomendasi" | "tren",
    "judul": "Judul singkat",
    "isi": "Penjelasan 2-3 kalimat dengan angka spesifik",
    "aksi": "Satu tindakan konkret yang bisa dilakukan hari ini",
    "dampak": "tinggi" | "sedang" | "rendah"
  }
]`
    );
    const cleaned = text.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(cleaned);
    return { success: true, data: Array.isArray(parsed) ? parsed : [] };
  } catch (e) {
    console.error('ai:generateInsights error:', e);
    return { success: false, message: e.message };
  }
});

ipcMain.handle('ai:generatePrediksi', async (_, stokData) => {
  try {
    const text = await callGroq(
      'Kamu adalah sistem prediksi stok bengkel motor. Balas HANYA JSON murni tanpa backticks.',
      `Analisis dan buat prediksi restock untuk sparepart ini:
${JSON.stringify(stokData)}

Hitung: hari_habis = stok / (terjual_30hari/30)
Rekomendasikan qty_restock = terjual_30hari * 1.5

Balas HANYA JSON array:
[
  {
    "kode": "SP001",
    "nama": "nama item",
    "hari_habis": 15,
    "prioritas": "segera" | "minggu_ini" | "bulan_ini" | "aman",
    "qty_restock": 24,
    "estimasi_biaya": 1320000,
    "alasan": "penjelasan singkat"
  }
]
Urutkan dari prioritas paling tinggi.`
    );
    const cleaned = text.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(cleaned);
    return { success: true, data: Array.isArray(parsed) ? parsed : [] };
  } catch (e) {
    console.error('ai:generatePrediksi error:', e);
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
Data bengkel saat ini: ${JSON.stringify(context)}`,
          },
          ...messages,
        ],
      }),
    });

    const result = await response.json();
    const reply = result.choices?.[0]?.message?.content || 'Maaf, tidak bisa memproses.';
    return { success: true, data: reply };
  } catch (e) {
    console.error('ai:chat error:', e);
    return { success: false, message: e.message };
  }
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
      SUM(total) as total_pendapatan,
      COUNT(*) as total_transaksi,
      AVG(total) as rata_rata
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
  db.prepare('INSERT OR REPLACE INTO pengaturan (key, value) VALUES (?, ?)').run(key, value);
  return { success: true };
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
      type: printerPort === 'EPSON' ? PrinterTypes.EPSON : PrinterTypes.STAR,
      characterSet: CharacterSet.PC852_LATIN2,
      removeSpecialCharacters: false,
    };

    if (type === 'network') {
      printerConfig.interface = `tcp://${host}:${printerPort || 9100}`;
    } else if (type === 'serial') {
      printerConfig.interface = serialPath;
    } else {
      // USB/LPT - use Windows printer name
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

    // Get printer settings from DB
    const settings = db.prepare('SELECT * FROM pengaturan').all()
      .reduce((acc, row) => { acc[row.key] = row.value; return acc; }, {});

    // Get invoice data
    const inv = db.prepare(`
      SELECT i.*, p.nama as nama_pelanggan, p.no_telp, p.jenis_motor, p.no_plat
      FROM invoice i JOIN pelanggan p ON p.id = i.pelanggan_id
      WHERE i.id = ?
    `).get(invoiceId);

    if (!inv) return { success: false, message: 'Invoice tidak ditemukan' };
    inv.items = db.prepare('SELECT * FROM invoice_item WHERE invoice_id = ?').all(invoiceId);

    // Configure printer
    const printer = new ThermalPrinter({
      type: PrinterTypes.EPSON,
      interface: settings.printer_interface || 'printer:POS-80',
      characterSet: CharacterSet.PC852_LATIN2,
      removeSpecialCharacters: false,
      width: 48, // 80mm paper = 48 chars
    });

    const isConnected = await printer.isPrinterConnected();
    if (!isConnected) return { success: false, message: 'Printer tidak terhubung. Cek pengaturan printer.' };

    // ─── Build Receipt ────────────────────────────────────────────────────
    const shopName = settings.nama_bengkel || 'Dua Putra Jaya Motor';
    const shopAddr = settings.alamat || 'Jl. Raya Bandung No. 123';
    const shopPhone = settings.telepon || '022-1234567';
    const LINE = '------------------------------------------------';
    const DASH = '- - - - - - - - - - - - - - - - - - - - - - - -';

    printer.alignCenter();
    printer.setTextSize(1, 1);
    printer.bold(true);
    printer.println(shopName);
    printer.bold(false);
    printer.setTextNormal();
    printer.println(shopAddr);
    printer.println(`Telp: ${shopPhone}`);
    printer.println(LINE);

    printer.alignLeft();
    printer.println(`No : ${inv.no_invoice}`);
    printer.println(`Tgl: ${new Date(inv.tanggal || inv.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}`);
    printer.println(`Plg: ${inv.nama_pelanggan}`);
    printer.println(`WA : ${inv.no_telp}`);
    printer.println(`Mtr: ${inv.jenis_motor} / ${inv.no_plat}`);
    if (inv.odometer_masuk) printer.println(`KM : ${inv.odometer_masuk}`);
    if (inv.mekanik) printer.println(`Mek: ${inv.mekanik}`);
    printer.println(DASH);

    // Items
    for (const item of inv.items) {
      const nameLine = item.nama_item.length > 28
        ? item.nama_item.substring(0, 28)
        : item.nama_item;
      printer.println(nameLine);

      const qtyHarga = `  ${item.qty} x ${formatRupiah(item.harga)}`;
      const subtotal = formatRupiah(item.subtotal);
      const padding = 48 - qtyHarga.length - subtotal.length;
      printer.println(qtyHarga + ' '.repeat(Math.max(1, padding)) + subtotal);
    }

    printer.println(DASH);

    // Totals
    const subtotalStr = formatRupiah(inv.subtotal);
    const totalStr = formatRupiah(inv.total);
    printer.printLeftRight('Subtotal', subtotalStr, 48);
    if (inv.diskon > 0) printer.printLeftRight('Diskon', `-${formatRupiah(inv.diskon)}`, 48);
    printer.println(LINE);
    printer.bold(true);
    printer.printLeftRight('TOTAL', totalStr, 48);
    printer.bold(false);
    printer.println(LINE);
    printer.printLeftRight('Bayar (Tunai)', totalStr, 48);
    printer.printLeftRight('Kembali', 'Rp 0', 48);
    printer.println(LINE);

    printer.alignCenter();
    printer.println('');
    printer.println('Terima kasih atas kunjungan Anda!');
    printer.println(`Garansi servis ${settings.garansi || '3 hari / 500 km'}`);
    printer.println('');
    printer.cut();

    await printer.execute();
    return { success: true };

  } catch (e) {
    console.error('Print error:', e);
    return { success: false, message: e.message };
  }
});

// Utility: format rupiah
function formatRupiah(n) {
  return 'Rp ' + Number(n).toLocaleString('id-ID');
}


// ─── IPC: Google Drive Backup ─────────────────────────────────────────────────

// Cek status koneksi Google
ipcMain.handle('backup:status', () => {
  return {
    connected: isAuthenticated(),
    schedulerRunning: isSchedulerRunning(),
  };
});

// Get URL untuk login Google
ipcMain.handle('backup:getAuthUrl', () => {
  return getAuthUrl();
});

// Simpan token setelah user paste auth code
ipcMain.handle('backup:saveToken', async (_, code) => {
  try {
    await saveToken(code);
    // Mulai scheduler setelah berhasil login
    startScheduler(mainWindow);
    return { success: true };
  } catch (e) {
    return { success: false, message: e.message };
  }
});

// Backup manual
ipcMain.handle('backup:runNow', async () => {
  try {
    const result = await uploadBackup();
    return result;
  } catch (e) {
    return { success: false, message: e.message };
  }
});

// Toggle scheduler on/off
ipcMain.handle('backup:toggleScheduler', (_, enable) => {
  if (enable) {
    startScheduler(mainWindow);
  } else {
    stopScheduler();
  }
  return { success: true, running: isSchedulerRunning() };
});

// Disconnect Google Drive
ipcMain.handle('backup:disconnect', () => {
  stopScheduler();
  return disconnectGoogle();
});


// ─── IPC: Window Controls (frameless) ────────────────────────────────────────
ipcMain.on('window:minimize', () => {
  const win = BrowserWindow.getFocusedWindow();
  if (win) win.minimize();
});
ipcMain.on('window:maximize', () => {
  const win = BrowserWindow.getFocusedWindow();
  if (win) win.isMaximized() ? win.unmaximize() : win.maximize();
});
ipcMain.on('window:close', () => {
  const win = BrowserWindow.getFocusedWindow();
  if (win) win.close();
});

-- ============================================================
-- Dua Putra Jaya Motor — Database Schema
-- SQLite via better-sqlite3
-- ============================================================

-- Users & Auth
CREATE TABLE IF NOT EXISTS users (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  nama        TEXT    NOT NULL,
  role        TEXT    NOT NULL CHECK(role IN ('admin', 'kasir')),
  pin         TEXT    NOT NULL,
  aktif       INTEGER NOT NULL DEFAULT 1,
  created_at  TEXT    DEFAULT (datetime('now', 'localtime'))
);

-- Pelanggan
CREATE TABLE IF NOT EXISTS pelanggan (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  nama         TEXT    NOT NULL,
  no_telp      TEXT,
  jenis_motor  TEXT,
  no_plat      TEXT,
  tahun_motor  TEXT,
  warna        TEXT,
  catatan      TEXT,
  created_at   TEXT    DEFAULT (datetime('now', 'localtime')),
  updated_at   TEXT    DEFAULT (datetime('now', 'localtime'))
);
CREATE INDEX IF NOT EXISTS idx_pelanggan_nama  ON pelanggan(nama);
CREATE INDEX IF NOT EXISTS idx_pelanggan_plat  ON pelanggan(no_plat);

-- Invoice (Header)
CREATE TABLE IF NOT EXISTS invoice (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  no_invoice      TEXT    NOT NULL UNIQUE,
  pelanggan_id    INTEGER NOT NULL REFERENCES pelanggan(id),
  tanggal         TEXT    DEFAULT (date('now', 'localtime')),
  odometer_masuk  TEXT,
  keluhan         TEXT,
  mekanik         TEXT,
  subtotal        REAL    NOT NULL DEFAULT 0,
  diskon          REAL    NOT NULL DEFAULT 0,
  total           REAL    NOT NULL DEFAULT 0,
  metode_bayar    TEXT    NOT NULL DEFAULT 'Tunai' CHECK(metode_bayar IN ('Tunai','Transfer','QRIS','Kredit')),
  status          TEXT    NOT NULL DEFAULT 'Lunas' CHECK(status IN ('Lunas','Proses','Belum Bayar','Dibatalkan')),
  catatan         TEXT,
  created_at      TEXT    DEFAULT (datetime('now', 'localtime'))
);
CREATE INDEX IF NOT EXISTS idx_invoice_pelanggan ON invoice(pelanggan_id);
CREATE INDEX IF NOT EXISTS idx_invoice_tanggal   ON invoice(tanggal);
CREATE INDEX IF NOT EXISTS idx_invoice_status    ON invoice(status);

-- Invoice Items (Lines)
CREATE TABLE IF NOT EXISTS invoice_item (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  invoice_id  INTEGER NOT NULL REFERENCES invoice(id) ON DELETE CASCADE,
  sparepart_id INTEGER REFERENCES sparepart(id),   -- NULL if jasa/custom
  nama_item   TEXT    NOT NULL,
  qty         REAL    NOT NULL DEFAULT 1,
  satuan      TEXT    NOT NULL DEFAULT 'Pcs' CHECK(satuan IN ('Jasa','Pcs','Botol','Set','Lembar','Meter')),
  harga       REAL    NOT NULL DEFAULT 0,
  subtotal    REAL    NOT NULL DEFAULT 0
);

-- Sparepart / Inventaris
CREATE TABLE IF NOT EXISTS sparepart (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  kode           TEXT    NOT NULL UNIQUE,
  nama           TEXT    NOT NULL,
  kategori       TEXT    NOT NULL DEFAULT 'Lainnya',
  stok           REAL    NOT NULL DEFAULT 0,
  stok_minimum   REAL    NOT NULL DEFAULT 5,
  harga_beli     REAL    NOT NULL DEFAULT 0,
  harga_jual     REAL    NOT NULL DEFAULT 0,
  satuan         TEXT    NOT NULL DEFAULT 'Pcs',
  aktif          INTEGER NOT NULL DEFAULT 1,
  created_at     TEXT    DEFAULT (datetime('now', 'localtime')),
  updated_at     TEXT    DEFAULT (datetime('now', 'localtime'))
);
CREATE INDEX IF NOT EXISTS idx_sparepart_kode ON sparepart(kode);
CREATE INDEX IF NOT EXISTS idx_sparepart_nama ON sparepart(nama);

-- Mutasi Stok (Riwayat Masuk/Keluar)
CREATE TABLE IF NOT EXISTS stok_mutasi (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  sparepart_id INTEGER NOT NULL REFERENCES sparepart(id),
  tipe         TEXT    NOT NULL CHECK(tipe IN ('masuk', 'keluar', 'koreksi')),
  qty          REAL    NOT NULL,
  keterangan   TEXT,
  ref_id       INTEGER,  -- invoice_id jika keluar
  created_at   TEXT    DEFAULT (datetime('now', 'localtime'))
);

-- Laporan Harian (Aggregated, for speed)
CREATE TABLE IF NOT EXISTS laporan_harian (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  tanggal           TEXT    NOT NULL UNIQUE,
  total_pendapatan  REAL    NOT NULL DEFAULT 0,
  total_transaksi   INTEGER NOT NULL DEFAULT 0,
  created_at        TEXT    DEFAULT (datetime('now', 'localtime')),
  updated_at        TEXT    DEFAULT (datetime('now', 'localtime'))
);

-- Pengaturan Aplikasi (Key-Value)
CREATE TABLE IF NOT EXISTS pengaturan (
  key        TEXT PRIMARY KEY,
  value      TEXT,
  updated_at TEXT DEFAULT (datetime('now', 'localtime'))
);

-- Default Settings
INSERT OR IGNORE INTO pengaturan (key, value) VALUES
  ('nama_bengkel',     'Dua Putra Jaya Motor'),
  ('alamat',           'Jl. Raya Bandung No. 123, Cimahi'),
  ('telepon',          '022-1234567'),
  ('whatsapp',         '0812-xxxx-xxxx'),
  ('printer_type',     'usb'),
  ('printer_interface','POS-80'),
  ('printer_lebar',    '80'),
  ('garansi',          '3 hari / 500 km'),
  ('pajak_persen',     '0'),
  ('app_version',      '1.0.0');


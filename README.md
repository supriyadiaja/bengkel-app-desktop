# 🔧 Dua Putra Jaya Motor — Desktop App
### Aplikasi Manajemen Bengkel Motor (Electron + React + SQLite)

---

## 📦 Stack Teknologi

| Layer | Teknologi | Fungsi |
|-------|-----------|--------|
| **Desktop Shell** | Electron 29 | Akses hardware, window, file system |
| **UI** | React 18 + Lucide Icons | Antarmuka pengguna |
| **Database** | SQLite via better-sqlite3 | Data lokal, offline, cepat |
| **Thermal Printer** | node-thermal-printer | Cetak struk ESC/POS |
| **Serial Port** | serialport | Koneksi printer via COM |

---

## 🚀 Cara Setup (Windows)

### Prasyarat
Pastikan sudah terinstall:
- [Node.js 20 LTS](https://nodejs.org) ← **wajib versi LTS**
- [Git](https://git-scm.com)
- Visual Studio Build Tools (untuk native modules)

```
winget install Microsoft.VisualStudio.2022.BuildTools
```
Atau download dari: https://visualstudio.microsoft.com/visual-cpp-build-tools/
Centang: **"Desktop development with C++"**

---

### Langkah Install

```bash
# 1. Clone / buat folder project
mkdir bengkel-app
cd bengkel-app

# 2. Salin semua file yang sudah disediakan ke folder ini
#    (package.json, electron/, src/, public/)

# 3. Install dependencies
npm install

# 4. Rebuild native modules untuk Electron
npx electron-rebuild -f -w better-sqlite3
npx electron-rebuild -f -w serialport

# 5. Jalankan mode development
npm run dev
```

---

### Struktur Folder Project

```
bengkel-app/
├── electron/
│   ├── main.js          ← Electron main process (IPC, DB, Printer)
│   ├── preload.js       ← Bridge aman ke React
│   └── schema.sql       ← Struktur database SQLite
├── src/
│   ├── App.jsx          ← React app (UI dari file terpisah)
│   ├── index.js         ← React entry point
│   └── pages/           ← Halaman-halaman app
├── public/
│   ├── index.html
│   └── icon.ico
└── package.json
```

---

## 🖨️ Setup Thermal Printer

### Opsi 1: USB (Plug & Play) — Paling mudah ✅
1. Colok printer USB ke PC
2. Windows auto-install driver
3. Buka Control Panel → Devices and Printers → catat nama printer (contoh: `POS-80`)
4. Di app → Pengaturan → Printer → masukkan nama printer tersebut

### Opsi 2: Serial Port (COM)
1. Colok via USB-to-Serial adapter
2. Buka Device Manager → catat port (contoh: `COM3`)
3. Di app → Pengaturan → Printer → pilih Serial → pilih `COM3`

### Opsi 3: Network (LAN/WiFi Printer)
1. Pastikan printer di jaringan yang sama
2. Cek IP printer (biasanya ada di settings printer)
3. Di app → Pengaturan → Printer → pilih Network → masukkan IP

### Test Printer
Di app → Pengaturan → Printer → klik **"Test Print"**

---

## 🔐 Login Default

| Role | PIN | Akses |
|------|-----|-------|
| **Admin** | `1234` | Semua fitur + Laporan Keuangan + Pengaturan |
| **Kasir** | `0000` | Invoice, Stok, Data Pelanggan (tanpa laporan keuangan) |

> ⚠️ **Wajib ubah PIN** setelah pertama kali login!
> Pengaturan → Akun & Keamanan → Ganti PIN

---

## 🗃️ Database

- **Lokasi file:** `C:\Users\[nama user]\AppData\Roaming\bengkel-maju-jaya\bengkel.db`
- **Format:** SQLite (bisa dibuka dengan [DB Browser for SQLite](https://sqlitebrowser.org))
- **Backup:** Cukup copy file `bengkel.db` ke tempat lain
- **Restore:** Paste file `bengkel.db` ke lokasi yang sama

---

## 📦 Build Installer (.exe)

```bash
# Build production
npm run build

# Output: dist/Dua Putra Jaya Motor Setup 1.0.0.exe
```

Installer akan membuat shortcut di Desktop dan Start Menu.

---

## 🐞 Troubleshooting

### "better-sqlite3 was compiled against a different version of Node.js"
```bash
npx electron-rebuild -f -w better-sqlite3
```

### Printer tidak terdeteksi
- Pastikan driver printer sudah terinstall
- Cek nama printer di Control Panel → Devices and Printers
- Coba Test Print dari menu Pengaturan

### App tidak bisa dibuka setelah build
- Pastikan Visual C++ Redistributable terinstall
- Download: https://aka.ms/vs/17/release/vc_redist.x64.exe

### Database corrupt / ingin reset
- Tutup aplikasi
- Hapus file `bengkel.db` di AppData
- Buka aplikasi kembali (otomatis buat database baru)

---

## 📋 Fitur Lengkap

- ✅ **Login dengan PIN** — Admin & Kasir, role-based access
- ✅ **Dashboard** — Ringkasan pendapatan, servis hari ini, stok menipis
- ✅ **Invoice & Servis** — Buat invoice, tambah item jasa/sparepart, cetak struk
- ✅ **Cetak Struk Thermal** — 80mm, ESC/POS, support USB/Serial/Network
- ✅ **Data Pelanggan** — CRUD, riwayat servis per pelanggan
- ✅ **Stok Sparepart** — Inventaris, alert menipis, riwayat masuk/keluar
- ✅ **Laporan Keuangan** — Harian, bulanan, per kategori, export
- ✅ **Pengaturan Bengkel** — Nama, alamat, konfigurasi printer, garansi
- ✅ **Database Lokal SQLite** — Offline, tidak perlu internet, backup mudah

---

## 🔄 Update Aplikasi

Untuk update manual:
1. Build versi baru: `npm run build`
2. Jalankan installer baru — otomatis update, data tetap aman

---

*Dibuat untuk Dua Putra Jaya Motor, Bandung*
*Stack: Electron 29 + React 18 + SQLite (better-sqlite3) + node-thermal-printer*

1. Naikkan versi di package.json
2. Buka terminal
3. set GH_TOKEN=token_kamu && npm run build
4. Tunggu proses selesai
5. Cek GitHub Releases → file .exe sudah terupload ✅

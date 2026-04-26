/**
 * Backup Manager — Dua Putra Jaya Motor
 * Upload database SQLite ke Google Drive otomatis tiap awal bulan
 */

const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');
const { app } = require('electron');

// Path token OAuth yang disimpan lokal
const TOKEN_PATH = path.join(app.getPath('userData'), 'gdrive-token.json');

/**
 * Buat OAuth2 client dari env
 */
function createOAuthClient() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    'urn:ietf:wg:oauth:2.0:oob' // Desktop app redirect
  );
}

/**
 * Cek apakah sudah pernah login Google (token tersimpan)
 */
function isAuthenticated() {
  return fs.existsSync(TOKEN_PATH);
}

/**
 * Generate URL untuk login Google (ditampilkan ke user)
 */
function getAuthUrl() {
  const oAuth2Client = createOAuthClient();
  return oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: ['https://www.googleapis.com/auth/drive.file'],
  });
}

/**
 * Tukar auth code dengan token, simpan ke file
 */
async function saveToken(code) {
  const oAuth2Client = createOAuthClient();
  const { tokens } = await oAuth2Client.getToken(code);
  fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens));
  return tokens;
}

/**
 * Load token dari file dan set ke client
 */
function getAuthenticatedClient() {
  const oAuth2Client = createOAuthClient();
  const token = JSON.parse(fs.readFileSync(TOKEN_PATH, 'utf8'));
  oAuth2Client.setCredentials(token);
  return oAuth2Client;
}

/**
 * Cari atau buat folder "Backup Bengkel" di Google Drive
 */
async function getOrCreateFolder(drive) {
  const folderName = 'Backup Bengkel - Dua Putra Jaya Motor';

  // Cek apakah folder sudah ada
  const res = await drive.files.list({
    q: `mimeType='application/vnd.google-apps.folder' and name='${folderName}' and trashed=false`,
    fields: 'files(id, name)',
  });

  if (res.data.files.length > 0) {
    return res.data.files[0].id;
  }

  // Buat folder baru kalau belum ada
  const folder = await drive.files.create({
    requestBody: {
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
    },
    fields: 'id',
  });

  return folder.data.id;
}

/**
 * Upload file database ke Google Drive
 */
async function uploadBackup() {
  if (!isAuthenticated()) {
    throw new Error('Belum login Google Drive. Silakan hubungkan akun Google terlebih dahulu.');
  }

  const auth = getAuthenticatedClient();
  const drive = google.drive({ version: 'v3', auth });

  // Path database
  const dbPath = path.join(app.getPath('userData'), 'bengkel.db');
  if (!fs.existsSync(dbPath)) {
    throw new Error('File database tidak ditemukan.');
  }

  // Nama file backup dengan tanggal
  const now = new Date();
  const bulan = now.toLocaleString('id-ID', { month: 'long', year: 'numeric' }).replace(' ', '-');
  const fileName = `bengkel-backup-${bulan}.db`;

  // Dapatkan folder ID
  const folderId = await getOrCreateFolder(drive);

  // Cek apakah file backup bulan ini sudah ada (untuk overwrite)
  const existing = await drive.files.list({
    q: `name='${fileName}' and '${folderId}' in parents and trashed=false`,
    fields: 'files(id)',
  });

  if (existing.data.files.length > 0) {
    // Update file yang sudah ada
    await drive.files.update({
      fileId: existing.data.files[0].id,
      media: {
        mimeType: 'application/octet-stream',
        body: fs.createReadStream(dbPath),
      },
    });
  } else {
    // Upload file baru
    await drive.files.create({
      requestBody: {
        name: fileName,
        parents: [folderId],
      },
      media: {
        mimeType: 'application/octet-stream',
        body: fs.createReadStream(dbPath),
      },
      fields: 'id',
    });
  }

  return {
    success: true,
    fileName,
    timestamp: now.toISOString(),
    message: `Backup berhasil: ${fileName}`,
  };
}

/**
 * Disconnect Google Drive (hapus token)
 */
function disconnectGoogle() {
  if (fs.existsSync(TOKEN_PATH)) {
    fs.unlinkSync(TOKEN_PATH);
  }
  return { success: true };
}

module.exports = {
  isAuthenticated,
  getAuthUrl,
  saveToken,
  uploadBackup,
  disconnectGoogle,
};
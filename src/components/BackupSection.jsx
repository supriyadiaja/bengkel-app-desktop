// ─── TAMBAHKAN KOMPONEN INI KE SettingsPages.jsx ─────────────────────────────
// Import tambahan yang dibutuhkan (tambahkan ke import yang sudah ada):
import { useState, useEffect } from 'react';
import { Cloud, CloudOff, RefreshCw, CheckCircle, AlertTriangle } from 'lucide-react';

const api = window.api || { invoke: async () => ({}) };

export function BackupSection() {
  const [status, setStatus] = useState({ connected: false, schedulerRunning: false });
  const [loading, setLoading] = useState(false);
  const [authUrl, setAuthUrl] = useState('');
  const [authCode, setAuthCode] = useState('');
  const [showCodeInput, setShowCodeInput] = useState(false);
  const [lastBackup, setLastBackup] = useState(null);
  const [message, setMessage] = useState(null); // { type: 'success'|'error', text: '' }

  useEffect(() => {
    loadStatus();

    // Listen notifikasi backup otomatis dari main process
    if (window.api?.on) {
      window.api.on('backup:success', (result) => {
        setLastBackup(result.timestamp);
        setMessage({ type: 'success', text: `Backup otomatis berhasil: ${result.fileName}` });
      });
      window.api.on('backup:error', (err) => {
        setMessage({ type: 'error', text: `Backup otomatis gagal: ${err.message}` });
      });
    }
  }, []);

  async function loadStatus() {
    const res = await api.invoke('backup:status');
    setStatus(res);
  }

  async function handleConnect() {
    setLoading(true);
    const url = await api.invoke('backup:getAuthUrl');
    setAuthUrl(url);

    // Buka browser untuk login Google
    try {
    await api.invoke('backup:openExternal', url); // coba via IPC
  } catch {
    window.open(url, '_blank'); // fallback ke window.open
  }

    setShowCodeInput(true);
    setLoading(false);
  }

  async function handleSaveCode() {
    if (!authCode.trim()) return;
    setLoading(true);
    const res = await api.invoke('backup:saveToken', authCode.trim());
    if (res.success) {
      setMessage({ type: 'success', text: 'Google Drive berhasil terhubung!' });
      setShowCodeInput(false);
      setAuthCode('');
      loadStatus();
    } else {
      setMessage({ type: 'error', text: `Gagal: ${res.message}` });
    }
    setLoading(false);
  }

  async function handleBackupNow() {
    setLoading(true);
    setMessage(null);
    const res = await api.invoke('backup:runNow');
    if (res.success) {
      setLastBackup(res.timestamp);
      setMessage({ type: 'success', text: `✅ ${res.message}` });
    } else {
      setMessage({ type: 'error', text: `❌ Gagal: ${res.message}` });
    }
    setLoading(false);
  }

  async function handleToggleScheduler() {
    const res = await api.invoke('backup:toggleScheduler', !status.schedulerRunning);
    if (res.success) loadStatus();
  }

  async function handleDisconnect() {
    if (!window.confirm('Yakin ingin memutus koneksi Google Drive? Backup otomatis akan berhenti.')) return;
    await api.invoke('backup:disconnect');
    setMessage({ type: 'success', text: 'Google Drive berhasil diputus.' });
    loadStatus();
  }

  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '20px 24px', marginBottom: 20, marginTop: 20 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <div style={{ width: 40, height: 40, borderRadius: 10, background: status.connected ? 'var(--green-bg)' : 'var(--surface2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {status.connected
            ? <CheckCircle size={20} color="var(--green)" />
            : <CloudOff size={20} color="var(--text3)" />
          }
        </div>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700 }}>Backup Google Drive</div>
          <div style={{ fontSize: 12, color: 'var(--text3)' }}>
            {status.connected ? 'Terhubung · Backup otomatis tiap tanggal 1' : 'Belum terhubung ke Google Drive'}
          </div>
        </div>
        {status.connected && (
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 12, color: 'var(--text3)' }}>Jadwal otomatis</span>
            {/* Toggle Switch */}
            <div
              onClick={handleToggleScheduler}
              style={{
                width: 44, height: 24, borderRadius: 99, cursor: 'pointer', transition: 'background 0.2s',
                background: status.schedulerRunning ? 'var(--green)' : 'var(--border2)',
                position: 'relative',
              }}
            >
              <div style={{
                position: 'absolute', top: 3, width: 18, height: 18, borderRadius: '50%', background: 'white',
                transition: 'left 0.2s', left: status.schedulerRunning ? 23 : 3,
                boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
              }} />
            </div>
          </div>
        )}
      </div>

      {/* Notifikasi */}
      {message && (
        <div style={{
          padding: '10px 14px', borderRadius: 8, marginBottom: 16, fontSize: 13,
          background: message.type === 'success' ? 'var(--green-bg)' : 'var(--red-bg)',
          color: message.type === 'success' ? 'var(--green)' : 'var(--red)',
          border: `1px solid ${message.type === 'success' ? 'rgba(22,163,74,0.2)' : 'rgba(220,38,38,0.2)'}`,
        }}>
          {message.text}
        </div>
      )}

      {/* Belum terhubung */}
      {!status.connected && !showCodeInput && (
        <button
          onClick={handleConnect}
          disabled={loading}
          style={{
            display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px',
            background: 'linear-gradient(135deg,#4285f4,#34a853)', color: 'white',
            border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600,
          }}
        >
          <Cloud size={15} /> Hubungkan Google Drive
        </button>
      )}

      {/* Input auth code */}
      {showCodeInput && (
        <div style={{ marginTop: 8 }}>
          <div style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 10 }}>
            Browser akan terbuka. Login dengan akun Google kamu, lalu <strong>copy kode</strong> yang muncul dan paste di bawah:
          </div>
          {authUrl && (
            <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 10, wordBreak: 'break-all' }}>
              Kalau browser tidak terbuka, buka manual: <a href={authUrl} target="_blank" rel="noreferrer" style={{ color: 'var(--accent)' }}>klik di sini</a>
            </div>
          )}
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              value={authCode}
              onChange={e => setAuthCode(e.target.value)}
              placeholder="Paste kode dari Google di sini..."
              style={{ flex: 1, padding: '9px 12px', borderRadius: 8, border: '1.5px solid var(--border)', fontSize: 13, background: 'var(--surface2)', color: 'var(--text)' }}
            />
            <button onClick={handleSaveCode} disabled={loading || !authCode}
              style={{ padding: '9px 16px', background: 'var(--accent)', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
              {loading ? '...' : 'Simpan'}
            </button>
          </div>
        </div>
      )}

      {/* Sudah terhubung */}
      {status.connected && (
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            onClick={handleBackupNow}
            disabled={loading}
            style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px',
              background: 'var(--accent)', color: 'white', border: 'none',
              borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600,
            }}
          >
            <RefreshCw size={13} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
            {loading ? 'Mengupload...' : 'Backup Sekarang'}
          </button>

          {lastBackup && (
            <span style={{ fontSize: 12, color: 'var(--text3)' }}>
              Terakhir: {new Date(lastBackup).toLocaleString('id-ID')}
            </span>
          )}

          <button
            onClick={handleDisconnect}
            style={{
              marginLeft: 'auto', padding: '8px 14px', background: 'transparent',
              color: 'var(--red)', border: '1px solid rgba(220,38,38,0.3)',
              borderRadius: 8, cursor: 'pointer', fontSize: 12,
            }}
          >
            Putus Koneksi
          </button>
        </div>
      )}
    </div>
  );
}
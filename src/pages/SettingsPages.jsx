import { useState, useEffect } from 'react';
import { Printer, Store, Shield, CheckCircle, Plus, Usb, Wifi, TestTube2, Save, Eye, EyeOff, Info } from 'lucide-react';
import { Card, CardHeader, Button, Badge, FormGrid, FormField, Input, Select, Textarea, Modal, Table } from '../components/UI';
import { useApp } from '../context/AppContext';
import { BackupSection } from '../components/BackupSection';

const api = window.api || { invoke: mockInvoke };

// ─── Default Settings ─────────────────────────────────────────────────────────
const DEFAULT_SETTINGS = {
  nama_bengkel: 'BENGKEL MAJU JAYA',
  alamat: 'Jl. Raya Bandung No. 123, Cimahi',
  telepon: '022-1234567',
  whatsapp: '0812-xxxx-xxxx',
  printer_type: 'usb',
  printer_interface: 'POS-80',
  printer_lebar: '80',
  garansi: '3 hari / 500 km',
  pajak_persen: '0',
  footer_struk: 'Terima kasih atas kunjungan Anda!',
  app_version: '1.0.0',
};

// ─── PRINTER SETTINGS ────────────────────────────────────────────────────────
export function PrinterSettings() {
  const { showToast } = useApp();
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [ports, setPorts] = useState([]);
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.invoke('settings:get').then(s => { if (s && Object.keys(s).length) setSettings(prev => ({ ...prev, ...s })); });
    api.invoke('printer:getPorts').then(p => setPorts(p || []));
  }, []);

  const set = k => e => setSettings(s => ({ ...s, [k]: e.target.value }));

  async function handleTest() {
    setTesting(true);
    const res = await api.invoke('printer:test', { type: settings.printer_type, interface: settings.printer_interface });
    setTesting(false);
    if (res.success) showToast('Test print berhasil! 🖨️');
    else showToast(res.message || 'Printer tidak terhubung', 'error');
  }

  async function handleSave() {
    setSaving(true);
    const printerKeys = ['printer_type', 'printer_interface', 'printer_lebar', 'pajak_persen', 'garansi', 'footer_struk'];
    for (const k of printerKeys) {
      await api.invoke('settings:set', { key: k, value: settings[k] });
    }
    setSaving(false);
    showToast('Pengaturan struk disimpan!');
  }

  return (
    <div className="fade-in">
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>

        {/* ── Printer Config Card ── */}
        <Card>
          <CardHeader title="Konfigurasi Printer" icon={<Printer size={14} />} iconBg="var(--accent-light)" iconColor="var(--accent)" />

          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text2)', letterSpacing: '0.4px', textTransform: 'uppercase', marginBottom: 10 }}>Tipe Koneksi</div>
            <div style={{ display: 'flex', gap: 8 }}>
              {[
                { id: 'usb', label: 'USB / LPT', icon: <Usb size={14} /> },
                { id: 'serial', label: 'Serial / COM', icon: <Printer size={14} /> },
                { id: 'network', label: 'Network', icon: <Wifi size={14} /> },
              ].map(t => (
                <div key={t.id} onClick={() => setSettings(s => ({ ...s, printer_type: t.id }))} style={{
                  flex: 1, padding: '10px 8px', borderRadius: 8, cursor: 'pointer',
                  border: `1.5px solid ${settings.printer_type === t.id ? 'var(--accent)' : 'var(--border)'}`,
                  background: settings.printer_type === t.id ? 'var(--accent-light)' : 'var(--surface2)',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, transition: 'all 0.12s',
                }}>
                  <span style={{ color: settings.printer_type === t.id ? 'var(--accent)' : 'var(--text3)' }}>{t.icon}</span>
                  <span style={{ fontSize: 11, fontWeight: 600, color: settings.printer_type === t.id ? 'var(--accent)' : 'var(--text2)', textAlign: 'center' }}>{t.label}</span>
                </div>
              ))}
            </div>
          </div>

          <FormGrid cols={1}>
            {settings.printer_type === 'usb' && (
              <FormField label="Nama Printer (Windows)">
                <Input value={settings.printer_interface} onChange={set('printer_interface')} placeholder="POS-80, XP-80C, dll." />
                <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Info size={10} /> Lihat nama printer di Control Panel → Devices &amp; Printers
                </div>
              </FormField>
            )}
            {settings.printer_type === 'serial' && (
              <FormField label="Port Serial">
                <Select value={settings.printer_interface} onChange={set('printer_interface')}>
                  {ports.length > 0
                    ? ports.map(p => <option key={p.path} value={p.path}>{p.path}{p.manufacturer ? ` (${p.manufacturer})` : ''}</option>)
                    : <option value="COM3">COM3 (contoh)</option>}
                </Select>
              </FormField>
            )}
            {settings.printer_type === 'network' && (
              <FormField label="IP Address Printer">
                <Input value={settings.printer_interface} onChange={set('printer_interface')} placeholder="192.168.1.100" />
              </FormField>
            )}
            <FormField label="Lebar Kertas">
              <Select value={settings.printer_lebar} onChange={set('printer_lebar')}>
                <option value="58">58mm (32 karakter)</option>
                <option value="80">80mm (48 karakter)</option>
              </Select>
            </FormField>
          </FormGrid>

          <div style={{ marginTop: 14, display: 'flex', gap: 10 }}>
            <Button variant="ghost" icon={<TestTube2 size={13} />} loading={testing} onClick={handleTest}>Test Print</Button>
            <Button icon={<Save size={13} />} loading={saving} onClick={handleSave}>Simpan</Button>
          </div>
        </Card>

        {/* ── Live Preview Struk ── */}
        <Card>
          <CardHeader title="Preview Struk (Live)" icon={<Printer size={14} />} iconBg="var(--blue-bg)" iconColor="var(--blue)" />
          <div style={{
            background: 'white', borderRadius: 8, border: '1px solid var(--border)',
            boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
            fontFamily: "'JetBrains Mono',monospace", fontSize: 10.5, color: '#1a1a1a', overflow: 'hidden',
          }}>
            <div style={{ background: 'linear-gradient(135deg,#e85d04,#f48c06)', padding: '13px 16px', textAlign: 'center', color: 'white' }}>
              <div style={{ fontSize: 13, fontWeight: 700, fontFamily: "'Plus Jakarta Sans',sans-serif" }}>{settings.nama_bengkel || 'NAMA BENGKEL'}</div>
              <div style={{ fontSize: 9.5, opacity: 0.88, marginTop: 2 }}>{settings.alamat || 'Alamat Bengkel'}</div>
              <div style={{ fontSize: 9.5, opacity: 0.88 }}>
                {settings.telepon && `Telp: ${settings.telepon}`}
                {settings.telepon && settings.whatsapp && ' · '}
                {settings.whatsapp && `WA: ${settings.whatsapp}`}
              </div>
            </div>
            <div style={{ padding: '11px 14px' }}>
              {[['NO. INV', 'INV-20240422-001'], ['TANGGAL', '22/04/2026 10:32'], ['PELANGGAN', 'Budi Santoso'], ['MOTOR', 'Honda Beat / D 4521 BC']].map(([l, v]) => (
                <div key={l} style={{ display: 'flex', gap: 6, marginBottom: 2.5, fontSize: 9.5 }}>
                  <span style={{ color: '#999', width: 68, flexShrink: 0 }}>{l}</span>
                  <span style={{ fontWeight: 600 }}>{v}</span>
                </div>
              ))}
              <div style={{ borderTop: '1px dashed #ddd', margin: '8px 0' }} />
              {[['Ganti Oli Mesin', 35000], ['Oli Yamalube 1L', 65000], ['Tune Up', 55000]].map(([n, h]) => (
                <div key={n} style={{ marginBottom: 3.5 }}>
                  <div style={{ fontSize: 10 }}>{n}</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', paddingLeft: 4, color: '#888', fontSize: 9.5 }}>
                    <span>1 x {h.toLocaleString('id-ID')}</span>
                    <span style={{ fontWeight: 600, color: '#1a1a1a' }}>{h.toLocaleString('id-ID')}</span>
                  </div>
                </div>
              ))}
              <div style={{ borderTop: '1.5px solid #e85d04', marginTop: 8, paddingTop: 5 }}>
                {settings.pajak_persen > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9.5, color: '#666', marginBottom: 2 }}>
                    <span>Pajak ({settings.pajak_persen}%)</span><span>Rp {Math.round(155000 * settings.pajak_persen / 100).toLocaleString('id-ID')}</span>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, color: '#e85d04', fontSize: 12 }}>
                  <span>TOTAL</span><span>Rp 155.000</span>
                </div>
              </div>
              <div style={{ textAlign: 'center', marginTop: 10, borderTop: '1px dashed #ddd', paddingTop: 8, fontSize: 9, color: '#bbb', lineHeight: 1.6 }}>
                {settings.footer_struk || 'Terima kasih atas kunjungan Anda!'}<br />
                Garansi: {settings.garansi}
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* ── Pengaturan Struk Card (synced + editable) ── */}
      <Card>
        <CardHeader
          title="Pengaturan Struk"
          icon={<Store size={14} />}
          iconBg="var(--purple-bg)" iconColor="var(--purple)"
          subtitle="Pengaturan tambahan yang tampil di struk cetak"
        />

        {/* Info sinkron */}
        <div style={{ marginBottom: 16, padding: '10px 14px', background: 'var(--blue-bg)', borderRadius: 8, border: '1px solid rgba(37,99,235,0.15)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Info size={13} color="var(--blue)" />
          <span style={{ fontSize: 12, color: 'var(--blue)', fontWeight: 500 }}>
            Nama bengkel, alamat, telepon & WhatsApp diambil dari <strong>Profil Bengkel</strong>
          </span>
        </div>

        <FormGrid>
          <FormField label="Pajak (%)">
            <Input value={settings.pajak_persen} onChange={set('pajak_persen')} type="number" placeholder="0" />
          </FormField>
          <FormField label="Teks Garansi">
            <Input value={settings.garansi} onChange={set('garansi')} placeholder="3 hari / 500 km" />
          </FormField>
          <FormField label="Footer / Pesan Struk" span={2}>
            <Input value={settings.footer_struk} onChange={set('footer_struk')} placeholder="Terima kasih atas kunjungan Anda!" />
          </FormField>
        </FormGrid>

        <div style={{ marginTop: 14, display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <Button icon={<Save size={13} />} loading={saving} onClick={handleSave}>Simpan Pengaturan Struk</Button>
        </div>
      </Card>
    </div>
  );
}

// ─── PROFIL BENGKEL ──────────────────────────────────────────────────────────
export function BengkelSettings() {
  const { showToast } = useApp();
  const [form, setForm] = useState({ nama_bengkel: '', alamat: '', telepon: '', whatsapp: '', app_version: '1.0.0' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.invoke('settings:get').then(s => {
      if (s && Object.keys(s).length) setForm(prev => ({ ...prev, ...s }));
    });
    // Ambil versi dari Electron
    api.invoke('app:getVersion').then(v => {
      if (v) setForm(prev => ({ ...prev, app_version: v }));
    });
  }, []);

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  async function handleSave() {
    setSaving(true);
    for (const k of ['nama_bengkel', 'alamat', 'telepon', 'whatsapp']) {
      await api.invoke('settings:set', { key: k, value: form[k] });
    }
    setSaving(false);
    showToast('Profil bengkel disimpan dan disinkronkan ke struk!');
  }

  return (
    <div className="fade-in">
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <Card>
          <CardHeader title="Profil Bengkel" icon={<Store size={14} />} iconBg="var(--accent-light)" iconColor="var(--accent)" />

          <div style={{ marginBottom: 14, padding: '10px 14px', background: 'var(--blue-bg)', borderRadius: 8, border: '1px solid rgba(37,99,235,0.15)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Info size={13} color="var(--blue)" />
            <span style={{ fontSize: 12, color: 'var(--blue)', fontWeight: 500 }}>
              Data ini otomatis tersinkron ke Pengaturan Printer &amp; Struk
            </span>
          </div>

          <FormGrid cols={1}>
            <FormField label="Nama Bengkel" required><Input value={form.nama_bengkel} onChange={set('nama_bengkel')} /></FormField>
            <FormField label="Alamat Lengkap"><Input value={form.alamat} onChange={set('alamat')} /></FormField>
            <FormField label="Nomor Telepon"><Input value={form.telepon} onChange={set('telepon')} /></FormField>
            <FormField label="WhatsApp"><Input value={form.whatsapp} onChange={set('whatsapp')} /></FormField>
          </FormGrid>

          <div style={{ marginTop: 14, padding: '10px 14px', background: 'var(--surface2)', borderRadius: 8, border: '1px solid var(--border)' }}>
            <div style={{ fontSize: 12, color: 'var(--text3)' }}>Versi Aplikasi: <strong style={{ fontFamily: 'JetBrains Mono', color: 'var(--text)' }}>{form.app_version}</strong></div>
            <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>Database: <strong style={{ fontFamily: 'JetBrains Mono', color: 'var(--text)' }}>bengkel.db (SQLite lokal)</strong></div>
          </div>

          <div style={{ marginTop: 14, display: 'flex', justifyContent: 'flex-end' }}>
            <Button icon={<Save size={13} />} loading={saving} onClick={handleSave}>Simpan &amp; Sinkron</Button>
          </div>
        </Card>

        {/* Live preview card */}
        <Card>
          <CardHeader title="Preview Identitas Bengkel" icon={<Store size={14} />} iconBg="var(--green-bg)" iconColor="var(--green)" />
          <div style={{ background: 'var(--surface2)', borderRadius: 10, padding: 20, border: '1px solid var(--border)' }}>
            <div style={{ width: 52, height: 52, borderRadius: 14, background: 'linear-gradient(135deg,#e85d04,#f48c06)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14, boxShadow: '0 4px 12px rgba(232,93,4,0.25)' }}>
              <span style={{ fontSize: 24 }}>🔧</span>
            </div>
            <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: '-0.3px', marginBottom: 4 }}>{form.nama_bengkel || '—'}</div>
            <div style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 3 }}>📍 {form.alamat || '—'}</div>
            <div style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 3 }}>📞 {form.telepon || '—'}</div>
            <div style={{ fontSize: 13, color: 'var(--text2)' }}>💬 {form.whatsapp || '—'}</div>
          </div>
          <div style={{ marginTop: 12, padding: '10px 14px', background: 'var(--accent-light)', borderRadius: 8, border: '1px solid rgba(232,93,4,0.15)', fontSize: 12, color: 'var(--accent)' }}>
            Tampilan ini muncul di header struk thermal printer
          </div>
        </Card>
      </div>
      <BackupSection />
    </div>
  );
}

// ─── AKUN & KEAMANAN ─────────────────────────────────────────────────────────
export function AkunSettings() {
  const { showToast } = useApp();
  const [users, setUsers] = useState([]);
  const [showAdd, setAdd] = useState(false);
  const [form, setForm] = useState({ nama: '', role: 'kasir', pin: '' });
  const [showPin, setShow] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadUsers(); }, []);

  async function loadUsers() {
    const res = await api.invoke('auth:getUsers');
    setUsers(res || []);
  }

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  async function handleAdd() {
    if (!form.nama.trim()) return showToast('Nama wajib diisi', 'error');
    if (form.pin.length < 4) return showToast('PIN minimal 4 digit', 'error');
    setSaving(true);
    const res = await api.invoke('auth:addUser', form);
    setSaving(false);
    if (res.success) { showToast('Pengguna ditambahkan!'); setAdd(false); setForm({ nama: '', role: 'kasir', pin: '' }); loadUsers(); }
    else showToast(res.message || 'Gagal', 'error');
  }

  const roleColor = { admin: 'orange', kasir: 'blue' };

  const columns = [
    { key: 'id', title: 'ID', render: v => <span style={{ fontFamily: 'JetBrains Mono', fontSize: 11, color: 'var(--text3)' }}>#{v}</span> },
    { key: 'nama', title: 'Nama', render: v => <span style={{ fontWeight: 600 }}>{v}</span> },
    { key: 'role', title: 'Role', render: v => <Badge variant={roleColor[v] || 'gray'} style={{ textTransform: 'capitalize' }}>{v}</Badge> },
    { key: 'aktif', title: 'Status', render: v => <Badge variant={v ? 'green' : 'gray'}>{v ? 'Aktif' : 'Nonaktif'}</Badge> },
    { key: 'id', title: 'PIN', align: 'right', render: () => <span style={{ fontFamily: 'JetBrains Mono', fontSize: 12, color: 'var(--text3)' }}>••••</span> },
  ];

  return (
    <div className="fade-in">
      <Card>
        <CardHeader
          title="Manajemen Pengguna"
          icon={<Shield size={14} />} iconBg="var(--purple-bg)" iconColor="var(--purple)"
          subtitle="Kelola akun dan hak akses"
          actions={<Button icon={<Plus size={13} />} onClick={() => setAdd(true)}>Tambah Pengguna</Button>}
        />
        <div style={{ marginBottom: 14, padding: '12px 14px', background: 'var(--blue-bg)', borderRadius: 8, border: '1px solid rgba(37,99,235,0.15)' }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--blue)', marginBottom: 4 }}>Hak Akses</div>
          <div style={{ fontSize: 12, color: 'var(--text2)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
            <div>🟠 <strong>Admin</strong> — Akses penuh semua fitur termasuk laporan & akun</div>
            <div>🔵 <strong>Kasir</strong> — Invoice, pelanggan, stok saja</div>
          </div>
        </div>
        <Table columns={columns} data={users} emptyText="Belum ada pengguna" />
      </Card>

      <Modal open={showAdd} onClose={() => setAdd(false)} title="Tambah Pengguna Baru" subtitle="Buat akun pengguna baru" width={400}
        footer={<><Button variant="ghost" onClick={() => setAdd(false)}>Batal</Button><Button loading={saving} onClick={handleAdd} icon={<CheckCircle size={13} />}>Tambah</Button></>}
      >
        <FormGrid cols={1}>
          <FormField label="Nama Pengguna" required><Input value={form.nama} onChange={set('nama')} placeholder="Nama mekanik / kasir" /></FormField>
          <FormField label="Role">
            <Select value={form.role} onChange={set('role')}>
              <option value="kasir">Kasir</option>
              <option value="admin">Admin</option>
            </Select>
          </FormField>
          <FormField label="PIN (4-6 digit)" required>
            <div style={{ position: 'relative' }}>
              <Input value={form.pin} onChange={set('pin')} type={showPin ? 'text' : 'password'} placeholder="Masukkan PIN" style={{ paddingRight: 36 }} />
              <button onClick={() => setShow(s => !s)} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', display: 'flex', alignItems: 'center' }}>
                {showPin ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </FormField>
        </FormGrid>
      </Modal>
    </div>
  );
}

async function mockInvoke(ch) {
  if (ch === 'settings:get') return DEFAULT_SETTINGS;
  if (ch === 'printer:getPorts') return [{ path: 'COM3', manufacturer: 'USB Serial' }, { path: 'COM5', manufacturer: 'POS Printer' }];
  if (ch === 'printer:test') return { success: true };
  if (ch === 'auth:getUsers') return [{ id: 1, nama: 'Administrator', role: 'admin', aktif: 1 }, { id: 2, nama: 'Kasir', role: 'kasir', aktif: 1 }];
  if (ch === 'auth:addUser') return { success: true, id: 3 };
  if (ch === 'settings:set') return { success: true };
  return {};
}
import { useState, useEffect } from 'react';
import { Printer, Store, Shield, CheckCircle, Plus, Usb, Wifi, TestTube2, Save, Eye, EyeOff, Trash2 } from 'lucide-react';
import { Card, CardHeader, Button, Badge, FormGrid, FormField, Input, Select, Modal, Table } from '../components/UI';
import { useApp } from '../context/AppContext';

const api = window.api || { invoke: mockInvoke };

// ─── Printer Settings ─────────────────────────────────────────────────────────
export function PrinterSettings() {
  const { showToast } = useApp();
  const [settings, setSettings] = useState({ printer_type:'usb', printer_interface:'POS-80', printer_lebar:'80', garansi:'3 hari / 500 km', pajak_persen:'0' });
  const [ports, setPorts]       = useState([]);
  const [testing, setTesting]   = useState(false);
  const [saving, setSaving]     = useState(false);

  useEffect(() => {
    api.invoke('settings:get').then(s => { if (s && Object.keys(s).length) setSettings(prev => ({...prev, ...s})); });
    api.invoke('printer:getPorts').then(p => setPorts(p || []));
  }, []);

  const set = k => e => setSettings(s => ({...s, [k]: e.target.value}));

  async function handleTest() {
    setTesting(true);
    const res = await api.invoke('printer:test', { type: settings.printer_type, interface: settings.printer_interface });
    setTesting(false);
    if (res.success) showToast('Test print berhasil!');
    else showToast(res.message || 'Printer tidak terhubung', 'error');
  }

  async function handleSave() {
    setSaving(true);
    const keys = Object.keys(settings);
    for (const k of keys) {
      await api.invoke('settings:set', { key: k, value: settings[k] });
    }
    setSaving(false);
    showToast('Pengaturan disimpan!');
  }

  return (
    <div className="fade-in">
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
        {/* Printer Config */}
        <Card>
          <CardHeader title="Konfigurasi Printer" icon={<Printer size={14}/>} iconBg="var(--accent-light)" iconColor="var(--accent)" />

          <div style={{marginBottom:16}}>
            <div style={{fontSize:11,fontWeight:700,color:'var(--text2)',letterSpacing:'0.4px',textTransform:'uppercase',marginBottom:10}}>Tipe Koneksi</div>
            <div style={{display:'flex',gap:8}}>
              {[
                { id:'usb', label:'USB / LPT', icon:<Usb size={14}/> },
                { id:'serial', label:'Serial / COM', icon:<Printer size={14}/> },
                { id:'network', label:'Network', icon:<Wifi size={14}/> },
              ].map(t=>(
                <div key={t.id} onClick={()=>setSettings(s=>({...s,printer_type:t.id}))} style={{
                  flex:1, padding:'10px 12px', borderRadius:8, cursor:'pointer',
                  border:`1.5px solid ${settings.printer_type===t.id?'var(--accent)':'var(--border)'}`,
                  background: settings.printer_type===t.id?'var(--accent-light)':'var(--surface2)',
                  display:'flex',flexDirection:'column',alignItems:'center',gap:6,
                  transition:'all 0.12s',
                }}>
                  <span style={{color:settings.printer_type===t.id?'var(--accent)':'var(--text3)'}}>{t.icon}</span>
                  <span style={{fontSize:12,fontWeight:600,color:settings.printer_type===t.id?'var(--accent)':'var(--text2)'}}>{t.label}</span>
                </div>
              ))}
            </div>
          </div>

          <FormGrid cols={1}>
            {settings.printer_type === 'usb' && (
              <FormField label="Nama Printer (Windows)">
                <Input value={settings.printer_interface} onChange={set('printer_interface')} placeholder="Contoh: POS-80, XP-80C"/>
                <div style={{fontSize:11,color:'var(--text3)',marginTop:4}}>Sesuaikan dengan nama printer di Control Panel → Devices & Printers</div>
              </FormField>
            )}
            {settings.printer_type === 'serial' && (
              <FormField label="Port Serial">
                <Select value={settings.printer_interface} onChange={set('printer_interface')}>
                  {ports.length > 0
                    ? ports.map(p=><option key={p.path} value={p.path}>{p.path} {p.manufacturer?`(${p.manufacturer})`:''}</option>)
                    : <option value="COM3">COM3 (contoh)</option>}
                </Select>
              </FormField>
            )}
            {settings.printer_type === 'network' && (
              <FormField label="IP Address Printer">
                <Input value={settings.printer_interface} onChange={set('printer_interface')} placeholder="192.168.1.100"/>
              </FormField>
            )}
            <FormField label="Lebar Kertas">
              <Select value={settings.printer_lebar} onChange={set('printer_lebar')}>
                <option value="58">58mm (32 karakter)</option>
                <option value="80">80mm (48 karakter)</option>
              </Select>
            </FormField>
          </FormGrid>

          <div style={{marginTop:16,display:'flex',gap:10}}>
            <Button variant="ghost" icon={<TestTube2 size={13}/>} loading={testing} onClick={handleTest}>Test Print</Button>
            <Button icon={<Save size={13}/>} loading={saving} onClick={handleSave}>Simpan Pengaturan</Button>
          </div>
        </Card>

        {/* Struk Preview */}
        <Card>
          <CardHeader title="Preview Struk" icon={<Printer size={14}/>} iconBg="var(--blue-bg)" iconColor="var(--blue)" />
          <div style={{background:'white',borderRadius:8,border:'1px solid var(--border)',boxShadow:'0 4px 16px rgba(0,0,0,0.08)',fontFamily:"'JetBrains Mono',monospace",fontSize:11,color:'#1a1a1a',overflow:'hidden'}}>
            <div style={{background:'linear-gradient(135deg,#e85d04,#f48c06)',padding:'14px 16px',textAlign:'center',color:'white'}}>
              <div style={{fontSize:13,fontWeight:700,fontFamily:"'Plus Jakarta Sans',sans-serif"}}>Dua Putra Jaya Motor</div>
              <div style={{fontSize:9.5,opacity:0.85,marginTop:2}}>Jl. Raya Bandung No. 123, Cimahi</div>
              <div style={{fontSize:9.5,opacity:0.85}}>Telp: 022-1234567</div>
            </div>
            <div style={{padding:'12px 16px'}}>
              {[['NO. INV','INV-20240422-001'],['TANGGAL','22/04/2026 10:32'],['PELANGGAN','Budi Santoso'],['MOTOR','Honda Beat / D 4521 BC']].map(([l,v])=>(
                <div key={l} style={{display:'flex',gap:8,marginBottom:3,fontSize:10}}>
                  <span style={{color:'#999',width:70,flexShrink:0}}>{l}</span>
                  <span style={{fontWeight:600}}>{v}</span>
                </div>
              ))}
              <div style={{borderTop:'1px dashed #ddd',margin:'8px 0'}}/>
              {[['Ganti Oli Mesin','1','35.000'],['Oli Yamalube 1L','1','65.000'],['Tune Up','1','55.000']].map(([n,q,h])=>(
                <div key={n} style={{marginBottom:4,fontSize:10}}>
                  <div>{n}</div>
                  <div style={{display:'flex',justifyContent:'space-between',paddingLeft:4,color:'#555',fontSize:9.5}}>
                    <span>{q} x {h}</span>
                    <span style={{fontWeight:600,color:'#1a1a1a'}}>{parseInt(h.replace('.',''))*parseInt(q)|0}</span>
                  </div>
                </div>
              ))}
              <div style={{borderTop:'1.5px solid #e85d04',marginTop:8,paddingTop:6}}>
                <div style={{display:'flex',justifyContent:'space-between',fontWeight:700,color:'#e85d04',fontSize:12}}>
                  <span>TOTAL</span><span>Rp 155.000</span>
                </div>
              </div>
              <div style={{textAlign:'center',marginTop:10,borderTop:'1px dashed #ddd',paddingTop:8,fontSize:9,color:'#bbb'}}>
                Terima kasih atas kunjungan Anda!<br/>
                Garansi: {settings.garansi}
              </div>
            </div>
          </div>
        </Card>

        {/* Receipt settings */}
        <Card style={{gridColumn:'1/-1'}}>
          <CardHeader title="Pengaturan Struk" icon={<Store size={14}/>} iconBg="var(--purple-bg)" iconColor="var(--purple)"/>
          <FormGrid>
            <FormField label="Teks Garansi">
              <Input value={settings.garansi} onChange={set('garansi')} placeholder="3 hari / 500 km"/>
            </FormField>
            <FormField label="Pajak (%)">
              <Input value={settings.pajak_persen} onChange={set('pajak_persen')} type="number" placeholder="0"/>
            </FormField>
          </FormGrid>
          <div style={{marginTop:12,display:'flex',justifyContent:'flex-end'}}>
            <Button icon={<Save size={13}/>} loading={saving} onClick={handleSave}>Simpan</Button>
          </div>
        </Card>
      </div>
    </div>
  );
}

// ─── Profil Bengkel ───────────────────────────────────────────────────────────
export function BengkelSettings() {
  const { showToast } = useApp();
  const [form, setForm] = useState({ nama_bengkel:'Dua Putra Jaya Motor', alamat:'Jl. Raya Bandung No. 123, Cimahi', telepon:'022-1234567', whatsapp:'0812-xxxx-xxxx', app_version:'1.0.0' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.invoke('settings:get').then(s => { if (s && Object.keys(s).length) setForm(prev=>({...prev,...s})); });
  }, []);

  const set = k => e => setForm(f=>({...f,[k]:e.target.value}));

  async function handleSave() {
    setSaving(true);
    for (const k of ['nama_bengkel','alamat','telepon','whatsapp']) {
      await api.invoke('settings:set', { key:k, value:form[k] });
    }
    setSaving(false);
    showToast('Profil bengkel disimpan!');
  }

  return (
    <div className="fade-in">
      <Card style={{maxWidth:600}}>
        <CardHeader title="Profil Bengkel" icon={<Store size={14}/>} iconBg="var(--accent-light)" iconColor="var(--accent)"/>
        <FormGrid cols={1}>
          <FormField label="Nama Bengkel" required><Input value={form.nama_bengkel} onChange={set('nama_bengkel')}/></FormField>
          <FormField label="Alamat Lengkap"><Input value={form.alamat} onChange={set('alamat')}/></FormField>
          <FormField label="Nomor Telepon"><Input value={form.telepon} onChange={set('telepon')}/></FormField>
          <FormField label="WhatsApp"><Input value={form.whatsapp} onChange={set('whatsapp')}/></FormField>
        </FormGrid>
        <div style={{marginTop:16,padding:'10px 14px',background:'var(--surface2)',borderRadius:8,border:'1px solid var(--border)'}}>
          <div style={{fontSize:12,color:'var(--text3)'}}>Versi Aplikasi: <strong style={{fontFamily:'JetBrains Mono',color:'var(--text)'}}>{form.app_version}</strong></div>
          <div style={{fontSize:12,color:'var(--text3)',marginTop:2}}>Database: <strong style={{fontFamily:'JetBrains Mono',color:'var(--text)'}}>bengkel.db (SQLite)</strong></div>
        </div>
        <div style={{marginTop:14,display:'flex',justifyContent:'flex-end'}}>
          <Button icon={<Save size={13}/>} loading={saving} onClick={handleSave}>Simpan Perubahan</Button>
        </div>
      </Card>
    </div>
  );
}

// ─── Akun & Keamanan ──────────────────────────────────────────────────────────
export function AkunSettings() {
  const { showToast } = useApp();
  const [users, setUsers]   = useState([]);
  const [showAdd, setAdd]   = useState(false);
  const [form, setForm]     = useState({ nama:'', role:'kasir', pin:'' });
  const [showPin, setShow]  = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadUsers(); }, []);

  async function loadUsers() {
    const res = await api.invoke('auth:getUsers');
    setUsers(res || []);
  }

  const set = k => e => setForm(f=>({...f,[k]:e.target.value}));

  async function handleAdd() {
    if (!form.nama.trim()) return showToast('Nama wajib diisi', 'error');
    if (form.pin.length < 4) return showToast('PIN minimal 4 digit', 'error');
    setSaving(true);
    const res = await api.invoke('auth:addUser', form);
    setSaving(false);
    if (res.success) { showToast('Pengguna ditambahkan!'); setAdd(false); setForm({nama:'',role:'kasir',pin:''}); loadUsers(); }
    else showToast(res.message||'Gagal', 'error');
  }

  const roleColor = { admin:'orange', kasir:'blue' };

  const columns = [
    { key:'id',   title:'ID',   render:v=><span style={{fontFamily:'JetBrains Mono',fontSize:11,color:'var(--text3)'}}>#{v}</span> },
    { key:'nama', title:'Nama', render:v=><span style={{fontWeight:600}}>{v}</span> },
    { key:'role', title:'Role', render:v=><Badge variant={roleColor[v]||'gray'} style={{textTransform:'capitalize'}}>{v}</Badge> },
    { key:'aktif', title:'Status', render:v=><Badge variant={v?'green':'gray'}>{v?'Aktif':'Nonaktif'}</Badge> },
    { key:'id', title:'PIN', align:'right', render:()=><span style={{fontFamily:'JetBrains Mono',fontSize:12,color:'var(--text3)'}}>••••</span> },
  ];

  return (
    <div className="fade-in">
      <Card>
        <CardHeader
          title="Manajemen Pengguna"
          icon={<Shield size={14}/>}
          iconBg="var(--purple-bg)" iconColor="var(--purple)"
          subtitle="Kelola akun dan hak akses"
          actions={<Button icon={<Plus size={13}/>} onClick={()=>setAdd(true)}>Tambah Pengguna</Button>}
        />

        <div style={{marginBottom:16,padding:'12px 14px',background:'var(--blue-bg)',borderRadius:8,border:'1px solid rgba(37,99,235,0.15)'}}>
          <div style={{fontSize:13,fontWeight:600,color:'var(--blue)',marginBottom:4}}>Hak Akses</div>
          <div style={{fontSize:12,color:'var(--text2)',display:'grid',gridTemplateColumns:'1fr 1fr',gap:4}}>
            <div>🟠 <strong>Admin</strong> — Akses penuh semua fitur termasuk laporan keuangan</div>
            <div>🔵 <strong>Kasir</strong> — Buat invoice & lihat stok, tidak bisa lihat laporan keuangan</div>
          </div>
        </div>

        <Table columns={columns} data={users} emptyText="Belum ada pengguna" />
      </Card>

      <Modal open={showAdd} onClose={()=>setAdd(false)} title="Tambah Pengguna Baru" subtitle="Buat akun pengguna baru" width={400}
        footer={<><Button variant="ghost" onClick={()=>setAdd(false)}>Batal</Button><Button loading={saving} onClick={handleAdd} icon={<CheckCircle size={13}/>}>Tambah</Button></>}
      >
        <FormGrid cols={1}>
          <FormField label="Nama Pengguna" required><Input value={form.nama} onChange={set('nama')} placeholder="Nama mekanik / kasir"/></FormField>
          <FormField label="Role">
            <Select value={form.role} onChange={set('role')}>
              <option value="kasir">Kasir</option>
              <option value="admin">Admin</option>
            </Select>
          </FormField>
          <FormField label="PIN (4-6 digit)" required>
            <div style={{position:'relative'}}>
              <Input value={form.pin} onChange={set('pin')} type={showPin?'text':'password'} placeholder="Masukkan PIN" style={{paddingRight:36}}/>
              <button onClick={()=>setShow(s=>!s)} style={{position:'absolute',right:10,top:'50%',transform:'translateY(-50%)',background:'none',border:'none',cursor:'pointer',color:'var(--text3)',display:'flex',alignItems:'center'}}>
                {showPin ? <EyeOff size={14}/> : <Eye size={14}/>}
              </button>
            </div>
          </FormField>
        </FormGrid>
      </Modal>
    </div>
  );
}

async function mockInvoke(ch) {
  if (ch==='settings:get') return { nama_bengkel:'Dua Putra Jaya Motor', alamat:'Jl. Raya Bandung No. 123, Cimahi', telepon:'022-1234567', whatsapp:'0812-xxxx-xxxx', printer_type:'usb', printer_interface:'POS-80', printer_lebar:'80', garansi:'3 hari / 500 km', pajak_persen:'0', app_version:'1.0.0' };
  if (ch==='printer:getPorts') return [{path:'COM3',manufacturer:'USB Serial'},{path:'COM5',manufacturer:'POS Printer'}];
  if (ch==='printer:test') return { success:true };
  if (ch==='auth:getUsers') return [{id:1,nama:'Administrator',role:'admin',aktif:1},{id:2,nama:'Kasir',role:'kasir',aktif:1}];
  if (ch==='auth:addUser') return { success:true, id:3 };
  if (ch==='settings:set') return { success:true };
  return {};
}

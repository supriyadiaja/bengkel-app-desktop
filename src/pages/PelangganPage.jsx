import { useState, useEffect } from 'react';
import { Users, Plus, Edit2, FileText, Phone, Bike, Hash, Star } from 'lucide-react';
import { Card, CardHeader, Button, Badge, Table, Modal, FormGrid, FormField, Input, Textarea, SearchInput } from '../components/UI';
import { formatDate } from '../utils/format';
import { useApp } from '../context/AppContext';

const api = window.api || { invoke: mockInvoke };

export default function PelangganPage({ onNewInvoice }) {
  const { showToast } = useApp();
  const [data, setData]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState('');
  const [modalAdd, setModalAdd]   = useState(false);
  const [editData, setEditData]   = useState(null);
  const [riwayatData, setRiwayat] = useState(null);
  const [riwayatList, setRiwayatList] = useState([]);

  useEffect(() => { loadData(); }, []);

  useEffect(() => {
    const t = setTimeout(async () => {
      if (search.length >= 2) {
        const res = await api.invoke('pelanggan:search', search);
        setData(res || []);
      } else if (search === '') {
        loadData();
      }
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  async function loadData() {
    setLoading(true);
    const res = await api.invoke('pelanggan:getAll');
    setData(res || []);
    setLoading(false);
  }

  async function openRiwayat(p) {
    setRiwayat(p);
    const res = await api.invoke('pelanggan:getRiwayat', p.id);
    setRiwayatList(res || []);
  }

  const columns = [
    { key: 'id', title: 'ID', render: v => <span style={{ fontFamily:'JetBrains Mono', fontSize:11, color:'var(--text3)' }}>C{String(v).padStart(3,'0')}</span> },
    { key: 'nama', title: 'Nama Pelanggan', render: (v, row) => (
      <div style={{ fontWeight: 600 }}>{v}
        {row.catatan && <div style={{ fontSize:11, color:'var(--text3)', fontStyle:'italic', marginTop:1 }}>{row.catatan.slice(0,40)}{row.catatan.length>40?'...':''}</div>}
      </div>
    )},
    { key: 'no_telp', title: 'Telepon', render: v => v ? (
      <div style={{ display:'flex', alignItems:'center', gap:5, fontFamily:'JetBrains Mono', fontSize:11.5 }}>
        <Phone size={10} color="var(--text3)"/>{v}
      </div>
    ) : <span style={{ color:'var(--text3)' }}>-</span> },
    { key: 'jenis_motor', title: 'Kendaraan', render: (v, row) => (
      <div style={{ display:'flex', alignItems:'center', gap:5, fontSize:13 }}>
        <Bike size={12} color="var(--text3)"/>
        <span>{v || '-'}</span>
        {row.tahun_motor && <span style={{ fontSize:11, color:'var(--text3)' }}>({row.tahun_motor})</span>}
      </div>
    )},
    { key: 'no_plat', title: 'No. Plat', render: v => v ? <Badge variant="orange"><Hash size={9}/>{v}</Badge> : '-' },
    { key: 'total_servis', title: 'Servis', align:'center', render: v => (
      <Badge variant="blue"><Star size={9}/>{v || 0}x</Badge>
    )},
    { key: 'terakhir_servis', title: 'Terakhir Servis', render: v => (
      <span style={{ fontSize:12, color:'var(--text3)', fontFamily:'JetBrains Mono' }}>{formatDate(v) || '-'}</span>
    )},
    { key: 'id', title: 'Aksi', align:'right', render: (v, row) => (
      <div style={{ display:'flex', gap:5, justifyContent:'flex-end' }}>
        <Button variant="ghost" size="icon" icon={<FileText size={12}/>} onClick={() => openRiwayat(row)} title="Riwayat" />
        <Button variant="ghost" size="icon" icon={<Edit2 size={12}/>} onClick={() => setEditData(row)} title="Edit" />
        <Button size="sm" icon={<Plus size={12}/>} onClick={() => onNewInvoice && onNewInvoice(row)}>Invoice</Button>
      </div>
    )},
  ];

  return (
    <div className="fade-in">
      {/* Stats row */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:14, marginBottom:16 }}>
        {[
          { label:'Total Pelanggan', value:data.length, color:'var(--blue)', bg:'var(--blue-bg)' },
          { label:'Servis Bulan Ini', value: data.reduce((s,p)=>s+(p.total_servis||0),0), color:'var(--green)', bg:'var(--green-bg)' },
          { label:'Pelanggan Baru (30hr)', value: data.filter(p=>p.created_at && new Date(p.created_at)>new Date(Date.now()-30*86400000)).length, color:'var(--accent)', bg:'var(--accent-light)' },
        ].map((s,i)=>(
          <div key={i} style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:12, padding:'14px 18px', boxShadow:'var(--shadow-sm)', display:'flex', alignItems:'center', gap:14 }}>
            <div style={{ width:40, height:40, borderRadius:10, background:s.bg, color:s.color, display:'flex', alignItems:'center', justifyContent:'center' }}>
              <Users size={18}/>
            </div>
            <div>
              <div style={{ fontSize:22, fontWeight:800, letterSpacing:'-0.8px', color:s.color }}>{s.value}</div>
              <div style={{ fontSize:12, color:'var(--text3)', marginTop:1 }}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      <Card>
        <CardHeader
          title="Data Pelanggan"
          icon={<Users size={14}/>}
          iconBg="var(--blue-bg)" iconColor="var(--blue)"
          subtitle={`${data.length} pelanggan terdaftar`}
          actions={
            <div style={{ display:'flex', gap:10 }}>
              <SearchInput value={search} onChange={e=>setSearch(e.target.value)} placeholder="Cari nama, plat, telepon..." />
              <Button icon={<Plus size={14}/>} onClick={()=>setModalAdd(true)}>Pelanggan Baru</Button>
            </div>
          }
        />
        <Table columns={columns} data={data} loading={loading} emptyText="Tidak ada pelanggan terdaftar" />
      </Card>

      {/* Add/Edit Modal */}
      <PelangganModal
        open={modalAdd || !!editData}
        editData={editData}
        onClose={() => { setModalAdd(false); setEditData(null); }}
        onSaved={() => { setModalAdd(false); setEditData(null); loadData(); showToast(editData ? 'Data diperbarui!' : 'Pelanggan baru ditambahkan!'); }}
      />

      {/* Riwayat Modal */}
      <Modal open={!!riwayatData} onClose={() => setRiwayat(null)} title={`Riwayat Servis — ${riwayatData?.nama}`} subtitle={`${riwayatData?.jenis_motor} · ${riwayatData?.no_plat}`} width={680}>
        {riwayatList.length === 0 ? (
          <div style={{ textAlign:'center', padding:'24px 0', color:'var(--text3)', fontSize:13 }}>Belum ada riwayat servis</div>
        ) : riwayatList.map((r,i)=>(
          <div key={i} style={{ padding:'12px 14px', marginBottom:8, background:'var(--surface2)', borderRadius:8, border:'1px solid var(--border)' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:4 }}>
              <span style={{ fontFamily:'JetBrains Mono', fontSize:11, color:'var(--text3)' }}>{r.no_invoice}</span>
              <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                <span style={{ fontSize:12, color:'var(--text3)' }}>{formatDate(r.tanggal)}</span>
                <Badge variant={r.status==='Lunas'?'green':r.status==='Proses'?'yellow':'red'}>{r.status}</Badge>
              </div>
            </div>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <div>
                {r.keluhan && <div style={{ fontSize:12.5 }}>{r.keluhan}</div>}
                {r.items && <div style={{ fontSize:11, color:'var(--text3)', marginTop:2 }}>{r.items}</div>}
              </div>
              <div style={{ fontFamily:'JetBrains Mono', fontWeight:700, color:'var(--accent)', fontSize:13 }}>
                Rp {Number(r.total).toLocaleString('id-ID')}
              </div>
            </div>
          </div>
        ))}
      </Modal>
    </div>
  );
}

function PelangganModal({ open, editData, onClose, onSaved }) {
  const { showToast } = useApp();
  const [form, setForm] = useState({ nama:'', no_telp:'', jenis_motor:'', no_plat:'', tahun_motor:'', warna:'', catatan:'' });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      if (editData) setForm({ nama:editData.nama||'', no_telp:editData.no_telp||'', jenis_motor:editData.jenis_motor||'', no_plat:editData.no_plat||'', tahun_motor:editData.tahun_motor||'', warna:editData.warna||'', catatan:editData.catatan||'' });
      else setForm({ nama:'', no_telp:'', jenis_motor:'', no_plat:'', tahun_motor:'', warna:'', catatan:'' });
    }
  }, [open, editData]);

  const set = (k) => (e) => setForm(f => ({...f, [k]: e.target.value}));

  async function handleSave() {
    if (!form.nama.trim()) return showToast('Nama wajib diisi', 'error');
    setLoading(true);
    const res = editData
      ? await api.invoke('pelanggan:update', { id: editData.id, ...form })
      : await api.invoke('pelanggan:add', form);
    setLoading(false);
    if (res.success) onSaved();
    else showToast(res.message || 'Gagal simpan', 'error');
  }

  return (
    <Modal open={open} onClose={onClose} title={editData ? 'Edit Pelanggan' : 'Tambah Pelanggan Baru'} subtitle="Data pelanggan dan kendaraan"
      footer={<>
        <Button variant="ghost" onClick={onClose}>Batal</Button>
        <Button loading={loading} onClick={handleSave} icon={<CheckCircle size={13}/>}>Simpan</Button>
      </>}
    >
      <FormGrid>
        <FormField label="Nama Lengkap" required><Input value={form.nama} onChange={set('nama')} placeholder="Nama pelanggan" /></FormField>
        <FormField label="No. Telepon"><Input value={form.no_telp} onChange={set('no_telp')} placeholder="08xx-xxxx-xxxx" /></FormField>
        <FormField label="Jenis Motor"><Input value={form.jenis_motor} onChange={set('jenis_motor')} placeholder="Honda Beat 2021" /></FormField>
        <FormField label="No. Plat"><Input value={form.no_plat} onChange={set('no_plat')} placeholder="D XXXX XX" /></FormField>
        <FormField label="Tahun Motor"><Input value={form.tahun_motor} onChange={set('tahun_motor')} placeholder="2021" /></FormField>
        <FormField label="Warna Motor"><Input value={form.warna} onChange={set('warna')} placeholder="Hitam" /></FormField>
        <FormField label="Catatan Khusus" span={2}><Textarea value={form.catatan} onChange={set('catatan')} placeholder="Kondisi khusus kendaraan..." /></FormField>
      </FormGrid>
    </Modal>
  );
}

import { CheckCircle } from 'lucide-react';

async function mockInvoke(ch, arg) {
  if (ch === 'pelanggan:getAll') return MOCK;
  if (ch === 'pelanggan:search') return MOCK.filter(p=>p.nama.toLowerCase().includes((arg||'').toLowerCase()));
  if (ch === 'pelanggan:add') return { success:true, id:99 };
  if (ch === 'pelanggan:update') return { success:true };
  if (ch === 'pelanggan:getRiwayat') return MOCK_RIW;
  return {};
}
const MOCK = [
  { id:1, nama:'Budi Santoso', no_telp:'0812-3456-7890', jenis_motor:'Honda Beat 2021', no_plat:'D 4521 BC', tahun_motor:'2021', total_servis:8, terakhir_servis:'2026-04-20' },
  { id:2, nama:'Siti Rahayu', no_telp:'0857-9876-5432', jenis_motor:'Yamaha NMAX 2022', no_plat:'D 7832 KJ', tahun_motor:'2022', total_servis:3, terakhir_servis:'2026-04-18' },
  { id:3, nama:'Dedi Kurniawan', no_telp:'0821-1234-5678', jenis_motor:'Honda Vario 150', no_plat:'D 2341 XA', tahun_motor:'2020', total_servis:12, terakhir_servis:'2026-04-15' },
  { id:4, nama:'Rina Marlina', no_telp:'0838-5555-1234', jenis_motor:'Suzuki GSX-R150', no_plat:'D 9912 MZ', tahun_motor:'2023', total_servis:5, terakhir_servis:'2026-04-10' },
  { id:5, nama:'Ahmad Fauzi', no_telp:'0896-6789-0123', jenis_motor:'Honda PCX 160', no_plat:'D 1122 PQ', tahun_motor:'2022', total_servis:2, terakhir_servis:'2026-04-08' },
];
const MOCK_RIW = [
  { no_invoice:'INV-20240420-003', tanggal:'2026-04-20', keluhan:'Ganti oli rutin', items:'Oli Yamalube | Jasa Ganti Oli', total:100000, status:'Lunas' },
  { no_invoice:'INV-20240310-001', tanggal:'2026-03-10', keluhan:'Tune up', items:'Busi NGK | Tune Up | Filter Udara', total:120000, status:'Lunas' },
];

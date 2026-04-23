import { useState, useEffect } from 'react';
import { Package, Plus, Edit2, PackagePlus, AlertTriangle, XCircle, CheckCircle, TrendingUp, Droplets } from 'lucide-react';
import { Card, CardHeader, Button, Badge, StatCard, Table, Modal, FormGrid, FormField, Input, Select, SearchInput } from '../components/UI';
import { formatRupiah, KATEGORI_SP } from '../utils/format';
import { useApp } from '../context/AppContext';

const api = window.api || { invoke: mockInvoke };

export default function SparepartPage() {
  const { showToast } = useApp();
  const [data, setData]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState('');
  const [filterKat, setFilterKat] = useState('');
  const [modalAdd, setModalAdd]   = useState(false);
  const [editData, setEditData]   = useState(null);
  const [stokModal, setStokModal] = useState(null); // sparepart for stok masuk

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    const res = await api.invoke('sparepart:getAll');
    setData(res || []);
    setLoading(false);
  }

  const filtered = data.filter(s => {
    const q = search.toLowerCase();
    const matchQ  = !q || s.nama?.toLowerCase().includes(q) || s.kode?.toLowerCase().includes(q) || s.kategori?.toLowerCase().includes(q);
    const matchKat = !filterKat || s.kategori === filterKat;
    return matchQ && matchKat;
  });

  const habis   = data.filter(s => s.stok <= 0).length;
  const menipis = data.filter(s => s.stok > 0 && s.stok <= s.stok_minimum).length;
  const aman    = data.filter(s => s.stok > s.stok_minimum).length;
  const nilaiStok = data.reduce((sum, s) => sum + (s.stok * s.harga_jual), 0);

  const categories = [...new Set(data.map(s => s.kategori).filter(Boolean))];

  function stokStatus(s) {
    if (s.stok <= 0)              return { label:'Habis',   variant:'red',    icon:<XCircle size={9}/> };
    if (s.stok <= s.stok_minimum) return { label:'Menipis', variant:'yellow', icon:<AlertTriangle size={9}/> };
    return                               { label:'Aman',    variant:'green',  icon:<CheckCircle size={9}/> };
  }

  const columns = [
    { key:'kode', title:'Kode', render:v=><span style={{fontFamily:'JetBrains Mono',fontSize:11,color:'var(--text3)'}}>{v}</span> },
    { key:'nama', title:'Nama Sparepart', render:(v,row)=>(
      <div>
        <div style={{fontWeight:500}}>{v}</div>
        {row.stok <= row.stok_minimum && row.stok > 0 && (
          <div style={{fontSize:11,color:'var(--yellow)',marginTop:1,display:'flex',alignItems:'center',gap:3}}>
            <AlertTriangle size={9}/> Stok dibawah minimum ({row.stok_minimum} {row.satuan})
          </div>
        )}
        {row.stok <= 0 && (
          <div style={{fontSize:11,color:'var(--red)',marginTop:1,display:'flex',alignItems:'center',gap:3}}>
            <XCircle size={9}/> Stok habis! Segera restock
          </div>
        )}
      </div>
    )},
    { key:'kategori', title:'Kategori', render:v=><Badge variant="blue"><Droplets size={9}/>{v}</Badge> },
    { key:'stok', title:'Stok', render:(v,row)=>{
      const pct = Math.min(100, (v / Math.max(row.stok_minimum * 2.5, 1)) * 100);
      const col = v<=0?'var(--red)':v<=row.stok_minimum?'var(--yellow)':'var(--green)';
      return (
        <div style={{display:'flex',alignItems:'center',gap:8,minWidth:150}}>
          <div style={{height:6,background:'var(--border)',borderRadius:99,overflow:'hidden',flex:1}}>
            <div style={{height:'100%',width:`${pct}%`,background:col,borderRadius:99,transition:'width 0.4s'}}/>
          </div>
          <span style={{fontFamily:'JetBrains Mono',fontSize:11,fontWeight:600,color:col,width:52,textAlign:'right'}}>
            {v} {row.satuan}
          </span>
        </div>
      );
    }},
    { key:'harga_beli',  title:'Harga Beli',  render:v=><span style={{fontFamily:'JetBrains Mono',fontSize:12,color:'var(--text2)'}}>{formatRupiah(v)}</span> },
    { key:'harga_jual',  title:'Harga Jual',  render:v=><span style={{fontFamily:'JetBrains Mono',fontSize:12,fontWeight:700,color:'var(--accent)'}}>{formatRupiah(v)}</span> },
    { key:'stok', title:'Status', render:(v,row)=>{ const s=stokStatus(row); return <Badge variant={s.variant}>{s.icon}{s.label}</Badge>; } },
    { key:'id', title:'Aksi', align:'right', render:(v,row)=>(
      <div style={{display:'flex',gap:5,justifyContent:'flex-end'}}>
        <Button variant="success" size="sm" icon={<PackagePlus size={12}/>} onClick={()=>setStokModal(row)}>Masuk</Button>
        <Button variant="ghost" size="icon" icon={<Edit2 size={12}/>} onClick={()=>setEditData(row)}/>
      </div>
    )},
  ];

  return (
    <div className="fade-in">
      {/* Stats */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:14,marginBottom:16}}>
        <StatCard label="Total Item"     value={data.length}          icon={<Package size={18}/>}      color="var(--blue)"   bg="var(--blue-bg)" />
        <StatCard label="Stok Menipis"   value={`${menipis} item`}    icon={<AlertTriangle size={18}/>} color="var(--yellow)" bg="var(--yellow-bg)" />
        <StatCard label="Stok Habis"     value={`${habis} item`}      icon={<XCircle size={18}/>}      color="var(--red)"    bg="var(--red-bg)" />
        <StatCard label="Nilai Total Stok" value={formatRupiah(nilaiStok)} icon={<TrendingUp size={18}/>} color="var(--green)" bg="var(--green-bg)" />
      </div>

      {/* Warning banner */}
      {(habis + menipis) > 0 && (
        <div style={{marginBottom:14,padding:'12px 16px',background:'var(--yellow-bg)',border:'1px solid rgba(217,119,6,0.3)',borderRadius:10,display:'flex',alignItems:'center',gap:10}}>
          <AlertTriangle size={16} color="var(--yellow)"/>
          <span style={{fontSize:13,fontWeight:600,color:'var(--yellow)'}}>
            {habis > 0 && `${habis} item stok habis`}{habis > 0 && menipis > 0 && ' · '}{menipis > 0 && `${menipis} item stok menipis`}
          </span>
          <span style={{fontSize:12,color:'var(--text3)',marginLeft:'auto'}}>Segera lakukan restock</span>
        </div>
      )}

      <Card>
        <CardHeader
          title="Inventaris Sparepart"
          icon={<Package size={14}/>}
          iconBg="var(--accent-light)" iconColor="var(--accent)"
          subtitle={`${filtered.length} dari ${data.length} item`}
          actions={
            <div style={{display:'flex',gap:10,alignItems:'center'}}>
              <select value={filterKat} onChange={e=>setFilterKat(e.target.value)}
                style={{background:'var(--surface2)',border:'1.5px solid var(--border)',borderRadius:8,padding:'7px 10px',fontSize:13,color:'var(--text)',outline:'none',cursor:'pointer'}}>
                <option value="">Semua Kategori</option>
                {categories.map(k=><option key={k} value={k}>{k}</option>)}
              </select>
              <SearchInput value={search} onChange={e=>setSearch(e.target.value)} placeholder="Cari kode, nama..." />
              <Button icon={<Plus size={14}/>} onClick={()=>setModalAdd(true)}>Tambah Item</Button>
            </div>
          }
        />
        <Table columns={columns} data={filtered} loading={loading} emptyText="Tidak ada sparepart" />
      </Card>

      {/* Add/Edit Modal */}
      <SparepartModal
        open={modalAdd || !!editData}
        editData={editData}
        onClose={()=>{setModalAdd(false);setEditData(null);}}
        onSaved={()=>{setModalAdd(false);setEditData(null);loadData();showToast(editData?'Data diperbarui!':'Sparepart ditambahkan!');}}
      />

      {/* Stok Masuk Modal */}
      <StokMasukModal
        open={!!stokModal}
        sparepart={stokModal}
        onClose={()=>setStokModal(null)}
        onSaved={()=>{setStokModal(null);loadData();showToast('Stok berhasil ditambahkan!');}}
      />
    </div>
  );
}

// ─── Sparepart Add/Edit Modal ──────────────────────────────────────────────────
function SparepartModal({ open, editData, onClose, onSaved }) {
  const { showToast } = useApp();
  const [form, setForm] = useState({ kode:'', nama:'', kategori:'Oli', stok:0, stok_minimum:5, harga_beli:0, harga_jual:0, satuan:'Pcs' });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      if (editData) setForm({ kode:editData.kode||'', nama:editData.nama||'', kategori:editData.kategori||'Oli', stok:editData.stok||0, stok_minimum:editData.stok_minimum||5, harga_beli:editData.harga_beli||0, harga_jual:editData.harga_jual||0, satuan:editData.satuan||'Pcs' });
      else setForm({ kode:'', nama:'', kategori:'Oli', stok:0, stok_minimum:5, harga_beli:0, harga_jual:0, satuan:'Pcs' });
    }
  }, [open, editData]);

  const set = k => e => setForm(f=>({...f,[k]:e.target.value}));

  async function handleSave() {
    if (!form.kode.trim() || !form.nama.trim()) return showToast('Kode dan nama wajib diisi', 'error');
    setLoading(true);
    const res = editData
      ? await api.invoke('sparepart:update', { id:editData.id, ...form })
      : await api.invoke('sparepart:add', form);
    setLoading(false);
    if (res.success) onSaved();
    else showToast(res.message || 'Gagal simpan', 'error');
  }

  return (
    <Modal open={open} onClose={onClose} title={editData?'Edit Sparepart':'Tambah Sparepart Baru'} subtitle="Data inventaris sparepart"
      footer={<><Button variant="ghost" onClick={onClose}>Batal</Button><Button loading={loading} onClick={handleSave} icon={<CheckCircle size={13}/>}>Simpan</Button></>}
    >
      <FormGrid>
        <FormField label="Kode Part" required><Input value={form.kode} onChange={set('kode')} placeholder="SP008" disabled={!!editData}/></FormField>
        <FormField label="Kategori">
          <Select value={form.kategori} onChange={set('kategori')}>
            {KATEGORI_SP.map(k=><option key={k} value={k}>{k}</option>)}
          </Select>
        </FormField>
        <FormField label="Nama Sparepart" required span={2}><Input value={form.nama} onChange={set('nama')} placeholder="Nama lengkap sparepart"/></FormField>
        <FormField label="Stok Awal"><Input value={form.stok} onChange={set('stok')} type="number" disabled={!!editData}/></FormField>
        <FormField label="Stok Minimum Alert"><Input value={form.stok_minimum} onChange={set('stok_minimum')} type="number"/></FormField>
        <FormField label="Harga Beli"><Input value={form.harga_beli} onChange={set('harga_beli')} type="number" placeholder="0"/></FormField>
        <FormField label="Harga Jual"><Input value={form.harga_jual} onChange={set('harga_jual')} type="number" placeholder="0"/></FormField>
        <FormField label="Satuan">
          <Select value={form.satuan} onChange={set('satuan')}>
            {['Pcs','Botol','Set','Lembar','Meter'].map(s=><option key={s} value={s}>{s}</option>)}
          </Select>
        </FormField>
        {form.harga_beli > 0 && form.harga_jual > 0 && (
          <div style={{display:'flex',alignItems:'center',gap:8,padding:'8px 12px',background:'var(--green-bg)',borderRadius:8,border:'1px solid rgba(5,150,105,0.2)'}}>
            <CheckCircle size={14} color="var(--green)"/>
            <span style={{fontSize:12,color:'var(--green)',fontWeight:600}}>
              Margin: {Math.round(((form.harga_jual - form.harga_beli)/form.harga_beli)*100)}%
            </span>
          </div>
        )}
      </FormGrid>
    </Modal>
  );
}

// ─── Stok Masuk Modal ─────────────────────────────────────────────────────────
function StokMasukModal({ open, sparepart, onClose, onSaved }) {
  const { showToast } = useApp();
  const [qty, setQty]         = useState(1);
  const [keterangan, setKet]  = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => { if (open) { setQty(1); setKet(''); } }, [open]);

  async function handleSave() {
    if (qty <= 0) return showToast('Qty harus lebih dari 0', 'error');
    setLoading(true);
    const res = await api.invoke('sparepart:stokMasuk', { id: sparepart.id, qty: Number(qty), keterangan: keterangan || 'Stok masuk' });
    setLoading(false);
    if (res.success) onSaved();
    else showToast(res.message || 'Gagal', 'error');
  }

  return (
    <Modal open={open} onClose={onClose} title="Tambah Stok Masuk" subtitle={sparepart?.nama} width={400}
      footer={<><Button variant="ghost" onClick={onClose}>Batal</Button><Button loading={loading} onClick={handleSave} icon={<PackagePlus size={13}/>}>Tambah Stok</Button></>}
    >
      {sparepart && (
        <div style={{marginBottom:16,padding:'10px 14px',background:'var(--surface2)',borderRadius:8,border:'1px solid var(--border)'}}>
          <div style={{display:'flex',justifyContent:'space-between',fontSize:13}}>
            <span style={{color:'var(--text3)'}}>Stok saat ini</span>
            <span style={{fontFamily:'JetBrains Mono',fontWeight:700,color:sparepart.stok<=0?'var(--red)':'var(--text)'}}>{sparepart.stok} {sparepart.satuan}</span>
          </div>
        </div>
      )}
      <FormGrid cols={1}>
        <FormField label="Jumlah Masuk (qty)" required>
          <Input value={qty} onChange={e=>setQty(e.target.value)} type="number" placeholder="1"/>
        </FormField>
        <FormField label="Keterangan">
          <Input value={keterangan} onChange={e=>setKet(e.target.value)} placeholder="Contoh: Beli dari supplier ABC"/>
        </FormField>
      </FormGrid>
      {sparepart && qty > 0 && (
        <div style={{marginTop:12,padding:'10px 14px',background:'var(--green-bg)',borderRadius:8,border:'1px solid rgba(5,150,105,0.2)',display:'flex',justifyContent:'space-between',fontSize:13}}>
          <span style={{color:'var(--green)',fontWeight:500}}>Stok setelah masuk</span>
          <span style={{fontFamily:'JetBrains Mono',fontWeight:700,color:'var(--green)'}}>{Number(sparepart.stok)+Number(qty)} {sparepart?.satuan}</span>
        </div>
      )}
    </Modal>
  );
}

async function mockInvoke(ch) {
  if (ch === 'sparepart:getAll') return MOCK;
  if (ch === 'sparepart:add') return { success:true, id:99 };
  if (ch === 'sparepart:stokMasuk') return { success:true };
  return {};
}
const MOCK = [
  { id:1, kode:'SP001', nama:'Oli Yamalube 10W-40 1L', kategori:'Oli', stok:24, stok_minimum:10, harga_beli:55000, harga_jual:65000, satuan:'Botol' },
  { id:2, kode:'SP002', nama:'Filter Udara Honda Beat', kategori:'Filter', stok:3, stok_minimum:5, harga_beli:35000, harga_jual:45000, satuan:'Pcs' },
  { id:3, kode:'SP003', nama:'Busi NGK CPR8EA', kategori:'Busi', stok:18, stok_minimum:8, harga_beli:20000, harga_jual:28000, satuan:'Pcs' },
  { id:4, kode:'SP004', nama:'Kampas Rem Depan Universal', kategori:'Rem', stok:7, stok_minimum:6, harga_beli:40000, harga_jual:55000, satuan:'Set' },
  { id:5, kode:'SP005', nama:'Rantai RK 428H 120 Mata', kategori:'Rantai', stok:2, stok_minimum:4, harga_beli:100000, harga_jual:135000, satuan:'Pcs' },
  { id:6, kode:'SP006', nama:'Ban IRC NR 53 80/90-14', kategori:'Ban', stok:6, stok_minimum:4, harga_beli:140000, harga_jual:185000, satuan:'Pcs' },
  { id:7, kode:'SP007', nama:'Aki Yuasa YTZ5S', kategori:'Aki', stok:0, stok_minimum:2, harga_beli:220000, harga_jual:285000, satuan:'Pcs' },
];

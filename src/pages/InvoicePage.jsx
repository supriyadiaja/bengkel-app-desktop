import { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2, Printer, Download, Search, Wrench, Package, CheckCircle, Clock, XCircle, Bike } from 'lucide-react';
import { Card, CardHeader, Button, Badge, Table, Modal, FormGrid, FormField, Input, Select, Textarea, SearchInput } from '../components/UI';
import { formatRupiah, formatDate, STATUS_INVOICE, METODE_BAYAR, SATUAN_ITEM } from '../utils/format';
import { useApp } from '../context/AppContext';

const api = window.api || { invoke: mockInvoke, send: () => {} };

const STATUS_COLOR = { 'Lunas':'green','Proses':'yellow','Belum Bayar':'red','Dibatalkan':'gray' };
const STATUS_ICON  = { 'Lunas':<CheckCircle size={9}/>,'Proses':<Clock size={9}/>,'Belum Bayar':<XCircle size={9}/> };

export default function InvoicePage() {
  const { showToast } = useApp();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState('');
  const [filterStatus, setFilter] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [printLoading, setPrint] = useState(null);

  useEffect(() => { loadInvoices(); }, []);

  async function loadInvoices() {
    setLoading(true);
    const res = await api.invoke('invoice:getAll', { limit: 100 });
    setInvoices(res || []);
    setLoading(false);
  }

  const filtered = invoices.filter(inv => {
    const q = search.toLowerCase();
    const matchSearch = !q || inv.no_invoice?.toLowerCase().includes(q) || inv.nama_pelanggan?.toLowerCase().includes(q) || inv.no_plat?.toLowerCase().includes(q);
    const matchStatus = !filterStatus || inv.status === filterStatus;
    return matchSearch && matchStatus;
  });

  async function handlePrint(id) {
    setPrint(id);
    const res = await api.invoke('printer:printInvoice', id);
    setPrint(null);
    if (res.success) showToast('Struk berhasil dicetak!');
    else showToast(res.message || 'Gagal cetak', 'error');
  }

  async function handleStatusChange(id, status) {
    await api.invoke('invoice:updateStatus', { id, status });
    setInvoices(prev => prev.map(inv => inv.id === id ? { ...inv, status } : inv));
    showToast('Status diperbarui');
  }

  const columns = [
    { key: 'no_invoice', title: 'No. Invoice', render: v => <span style={{ fontFamily: 'JetBrains Mono', fontSize: 11 }}>{v}</span> },
    { key: 'tanggal', title: 'Tanggal', render: v => <span style={{ fontSize: 12, color: 'var(--text2)' }}>{formatDate(v)}</span> },
    { key: 'nama_pelanggan', title: 'Pelanggan', render: (v, row) => (
      <div>
        <div style={{ fontWeight: 600 }}>{v}</div>
        <div style={{ fontSize: 11, color: 'var(--text3)', display: 'flex', alignItems: 'center', gap: 3 }}><Bike size={10} />{row.jenis_motor} · {row.no_plat}</div>
      </div>
    )},
    { key: 'total', title: 'Total', render: v => <span style={{ fontFamily: 'JetBrains Mono', fontWeight: 700, color: 'var(--accent)' }}>{formatRupiah(v)}</span> },
    { key: 'metode_bayar', title: 'Pembayaran', render: v => <Badge variant="blue">{v || 'Tunai'}</Badge> },
    { key: 'status', title: 'Status', render: (v, row) => (
      <select value={v} onChange={e => handleStatusChange(row.id, e.target.value)}
        style={{ border: 'none', background: 'transparent', fontSize: 12, fontWeight: 600, cursor: 'pointer',
          color: v === 'Lunas' ? 'var(--green)' : v === 'Proses' ? 'var(--yellow)' : v === 'Belum Bayar' ? 'var(--red)' : 'var(--text3)',
        }}>
        {STATUS_INVOICE.map(s => <option key={s} value={s}>{s}</option>)}
      </select>
    )},
    { key: 'id', title: '', align: 'right', render: (v) => (
      <Button variant="ghost" size="sm" icon={<Printer size={12} />}
        loading={printLoading === v} onClick={() => handlePrint(v)}>
        Cetak
      </Button>
    )},
  ];

  return (
    <div className="fade-in">
      <Card>
        <CardHeader
          title="Daftar Invoice"
          icon={<CheckCircle size={14} />}
          iconBg="var(--accent-light)" iconColor="var(--accent)"
          subtitle={`${filtered.length} invoice ditemukan`}
          actions={
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <select value={filterStatus} onChange={e => setFilter(e.target.value)}
                style={{ background: 'var(--surface2)', border: '1.5px solid var(--border)', borderRadius: 8, padding: '7px 11px', fontSize: 13, color: 'var(--text)', outline: 'none', cursor: 'pointer' }}>
                <option value="">Semua Status</option>
                {STATUS_INVOICE.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <SearchInput value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari invoice..." />
              <Button icon={<Plus size={14} />} onClick={() => setShowForm(true)}>Invoice Baru</Button>
            </div>
          }
        />
        <Table columns={columns} data={filtered} loading={loading} emptyText="Tidak ada invoice" />
      </Card>

      <InvoiceForm open={showForm} onClose={() => setShowForm(false)} onSaved={() => { loadInvoices(); setShowForm(false); }} />
    </div>
  );
}

// ─── Invoice Form ─────────────────────────────────────────────────────────────
function InvoiceForm({ open, onClose, onSaved }) {
  const { showToast } = useApp();
  const [step, setStep]         = useState(1); // 1=pelanggan, 2=items
  const [pelangganSearch, setPSearch] = useState('');
  const [pelangganList, setPList]     = useState([]);
  const [selectedPelanggan, setSelP]  = useState(null);
  const [spareparts, setSpareparts]   = useState([]);

  const [form, setForm] = useState({
    odometer: '', keluhan: '', mekanik: '', diskon: 0, metode_bayar: 'Tunai', status: 'Lunas',
  });
  const [items, setItems]   = useState([]);
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState(false);

  useEffect(() => {
    if (open) {
      setStep(1); setSelP(null); setPSearch(''); setItems([]); setPreview(false);
      setForm({ odometer:'', keluhan:'', mekanik:'', diskon:0, metode_bayar:'Tunai', status:'Lunas' });
      api.invoke('sparepart:getAll').then(r => setSpareparts(r || []));
    }
  }, [open]);

  useEffect(() => {
    const t = setTimeout(async () => {
      if (pelangganSearch.length >= 2) {
        const res = await api.invoke('pelanggan:search', pelangganSearch);
        setPList(res || []);
      } else if (pelangganSearch === '') {
        const res = await api.invoke('pelanggan:getAll');
        setPList((res || []).slice(0, 8));
      }
    }, 300);
    return () => clearTimeout(t);
  }, [pelangganSearch]);

  useEffect(() => {
    if (open) api.invoke('pelanggan:getAll').then(r => setPList((r || []).slice(0, 8)));
  }, [open]);

  function addItem(type = 'jasa') {
    setItems(prev => [...prev, {
      _id: Date.now(),
      nama_item: type === 'jasa' ? 'Jasa Servis' : '',
      qty: 1, satuan: type === 'jasa' ? 'Jasa' : 'Pcs',
      harga: 0, sparepart_id: null,
    }]);
  }

  function updateItem(idx, field, val) {
    setItems(prev => prev.map((it, i) => {
      if (i !== idx) return it;
      const updated = { ...it, [field]: val };
      if (field === 'sparepart_id') {
        const sp = spareparts.find(s => s.id === Number(val));
        if (sp) { updated.nama_item = sp.nama; updated.harga = sp.harga_jual; updated.satuan = sp.satuan; }
      }
      return updated;
    }));
  }

  function removeItem(idx) { setItems(prev => prev.filter((_, i) => i !== idx)); }

  const subtotal = items.reduce((s, it) => s + (Number(it.qty) * Number(it.harga)), 0);
  const total    = subtotal - Number(form.diskon || 0);

  async function handleSave() {
    if (!selectedPelanggan) return showToast('Pilih pelanggan terlebih dahulu', 'error');
    if (items.length === 0)  return showToast('Tambahkan minimal 1 item', 'error');
    setLoading(true);
    const res = await api.invoke('invoice:create', {
      pelangganId: selectedPelanggan.id,
      odometer: form.odometer,
      keluhan: form.keluhan,
      mekanik: form.mekanik,
      items: items.map(it => ({ nama_item: it.nama_item, qty: Number(it.qty), satuan: it.satuan, harga: Number(it.harga), sparepart_id: it.sparepart_id || null })),
      diskon: Number(form.diskon || 0),
      metode_bayar: form.metode_bayar,
      status: form.status,
    });
    setLoading(false);
    if (res.success) {
      showToast(`Invoice ${res.no_invoice} berhasil dibuat!`);
      onSaved();
      if (form.status === 'Lunas') {
        setTimeout(() => api.invoke('printer:printInvoice', res.id), 300);
      }
    } else {
      showToast(res.message || 'Gagal simpan', 'error');
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Buat Invoice Baru" subtitle="Isi data pelanggan dan item servis" width={780}
      footer={<>
        {step === 2 && <Button variant="ghost" onClick={() => setStep(1)}>← Kembali</Button>}
        <Button variant="ghost" onClick={onClose}>Batal</Button>
        {step === 1 && <Button onClick={() => { if (selectedPelanggan) setStep(2); else showToast('Pilih pelanggan dulu', 'error'); }}>Lanjut ke Items →</Button>}
        {step === 2 && <Button icon={<Printer size={13} />} loading={loading} onClick={handleSave}>Simpan & Cetak</Button>}
      </>}
    >
      {/* Step 1: Pelanggan */}
      {step === 1 && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, padding: '10px 14px', background: 'var(--accent-light)', borderRadius: 8, border: '1px solid rgba(232,93,4,0.15)' }}>
            <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--accent)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>1</div>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--accent)' }}>Pilih Pelanggan</span>
            {selectedPelanggan && <span style={{ fontSize: 12, color: 'var(--text2)', marginLeft: 4 }}>— {selectedPelanggan.nama} ({selectedPelanggan.no_plat})</span>}
          </div>

          <SearchInput value={pelangganSearch} onChange={e => setPSearch(e.target.value)} placeholder="Cari nama, plat, atau telepon..." width={360} />
          <div style={{ marginTop: 10, maxHeight: 200, overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 8 }}>
            {pelangganList.map((p, i) => (
              <div key={p.id} onClick={() => setSelP(p)} style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '11px 14px',
                cursor: 'pointer', borderBottom: i < pelangganList.length - 1 ? '1px solid var(--border)' : 'none',
                background: selectedPelanggan?.id === p.id ? 'var(--accent-light)' : 'transparent',
                transition: 'background 0.1s',
              }}
                onMouseEnter={e => { if (selectedPelanggan?.id !== p.id) e.currentTarget.style.background = 'var(--surface2)'; }}
                onMouseLeave={e => { if (selectedPelanggan?.id !== p.id) e.currentTarget.style.background = 'transparent'; }}
              >
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--accent-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: 'var(--accent)', flexShrink: 0 }}>
                  {p.nama?.charAt(0)}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{p.nama}</div>
                  <div style={{ fontSize: 11, color: 'var(--text3)', display: 'flex', gap: 8 }}>
                    <span><Bike size={9} style={{ marginRight: 3 }} />{p.jenis_motor}</span>
                    <span>·</span>
                    <span>{p.no_plat}</span>
                    {p.no_telp && <><span>·</span><span>{p.no_telp}</span></>}
                  </div>
                </div>
                {selectedPelanggan?.id === p.id && <CheckCircle size={16} color="var(--accent)" />}
              </div>
            ))}
          </div>

          {selectedPelanggan && (
            <div style={{ marginTop: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 10 }}>Detail Kunjungan</div>
              <FormGrid>
                <FormField label="Odometer Masuk">
                  <Input value={form.odometer} onChange={e => setForm(f => ({...f, odometer: e.target.value}))} placeholder="Contoh: 14.250 km" />
                </FormField>
                <FormField label="Nama Mekanik">
                  <Input value={form.mekanik} onChange={e => setForm(f => ({...f, mekanik: e.target.value}))} placeholder="Nama mekanik yang menangani" />
                </FormField>
                <FormField label="Keluhan / Permintaan" span={2}>
                  <Input value={form.keluhan} onChange={e => setForm(f => ({...f, keluhan: e.target.value}))} placeholder="Ganti oli, tune up, dll" />
                </FormField>
              </FormGrid>
            </div>
          )}
        </div>
      )}

      {/* Step 2: Items */}
      {step === 2 && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, padding: '10px 14px', background: 'var(--accent-light)', borderRadius: 8, border: '1px solid rgba(232,93,4,0.15)' }}>
            <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--accent)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>2</div>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--accent)' }}>Item Servis & Sparepart</span>
          </div>

          {/* Item list */}
          <div style={{ marginBottom: 10 }}>
            {items.map((item, idx) => (
              <div key={item._id} style={{ display: 'grid', gridTemplateColumns: '2fr 60px 100px 100px 32px', gap: 8, marginBottom: 8, alignItems: 'center' }}>
                {item.satuan === 'Jasa' ? (
                  <Input value={item.nama_item} onChange={e => updateItem(idx, 'nama_item', e.target.value)} placeholder="Nama jasa..." />
                ) : (
                  <select value={item.sparepart_id || ''} onChange={e => updateItem(idx, 'sparepart_id', e.target.value)}
                    style={{ background: 'var(--surface2)', border: '1.5px solid var(--border)', borderRadius: 8, padding: '8px 11px', fontSize: 13, color: 'var(--text)', outline: 'none', width: '100%' }}>
                    <option value="">-- Pilih Sparepart --</option>
                    {spareparts.map(sp => <option key={sp.id} value={sp.id}>{sp.nama} (Stok: {sp.stok})</option>)}
                  </select>
                )}
                <Input value={item.qty} onChange={e => updateItem(idx, 'qty', e.target.value)} type="number" style={{ textAlign: 'center' }} />
                <select value={item.satuan} onChange={e => updateItem(idx, 'satuan', e.target.value)}
                  style={{ background: 'var(--surface2)', border: '1.5px solid var(--border)', borderRadius: 8, padding: '8px 8px', fontSize: 12, color: 'var(--text)', outline: 'none' }}>
                  {SATUAN_ITEM.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <Input value={item.harga} onChange={e => updateItem(idx, 'harga', e.target.value)} type="number" placeholder="0" />
                <button onClick={() => removeItem(idx)} style={{ width: 32, height: 32, borderRadius: 7, border: '1px solid rgba(220,38,38,0.2)', background: 'var(--red-bg)', color: 'var(--red)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
            {items.length === 0 && (
              <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text3)', fontSize: 13, background: 'var(--surface2)', borderRadius: 8, border: '1px dashed var(--border)' }}>
                Belum ada item. Tambahkan jasa atau sparepart di bawah.
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            <Button variant="ghost" size="sm" icon={<Wrench size={12} />} onClick={() => addItem('jasa')}>+ Jasa Servis</Button>
            <Button variant="ghost" size="sm" icon={<Package size={12} />} onClick={() => addItem('part')}>+ Sparepart</Button>
          </div>

          {/* Summary */}
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: 14, display: 'flex', justifyContent: 'space-between', gap: 20 }}>
            <FormGrid cols={2} style={{ flex: 1 }}>
              <FormField label="Metode Bayar">
                <Select value={form.metode_bayar} onChange={e => setForm(f => ({...f, metode_bayar: e.target.value}))}>
                  {METODE_BAYAR.map(m => <option key={m} value={m}>{m}</option>)}
                </Select>
              </FormField>
              <FormField label="Status">
                <Select value={form.status} onChange={e => setForm(f => ({...f, status: e.target.value}))}>
                  {STATUS_INVOICE.map(s => <option key={s} value={s}>{s}</option>)}
                </Select>
              </FormField>
              <FormField label="Diskon (Rp)">
                <Input value={form.diskon} onChange={e => setForm(f => ({...f, diskon: e.target.value}))} type="number" placeholder="0" />
              </FormField>
            </FormGrid>

            <div style={{ width: 220, background: 'var(--surface2)', borderRadius: 10, padding: '14px 16px', border: '1px solid var(--border)', alignSelf: 'flex-start' }}>
              {[['Subtotal', subtotal], ['Diskon', -Number(form.diskon || 0)]].map(([k, v]) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 7, fontSize: 13, color: 'var(--text2)' }}>
                  <span>{k}</span>
                  <span style={{ fontFamily: 'JetBrains Mono' }}>{formatRupiah(v)}</span>
                </div>
              ))}
              <div style={{ borderTop: '2px solid var(--accent)', paddingTop: 9, marginTop: 3, display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: 15 }}>
                <span>TOTAL</span>
                <span style={{ fontFamily: 'JetBrains Mono', color: 'var(--accent)' }}>{formatRupiah(total)}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}

async function mockInvoke(ch, args) {
  if (ch === 'invoice:getAll') return MOCK_INVOICES;
  if (ch === 'pelanggan:getAll') return MOCK_PELANGGAN;
  if (ch === 'pelanggan:search') return MOCK_PELANGGAN.filter(p => p.nama.toLowerCase().includes((args||'').toLowerCase()));
  if (ch === 'sparepart:getAll') return MOCK_SP;
  if (ch === 'invoice:create') return { success:true, id:99, no_invoice:'INV-20240422-099' };
  if (ch === 'invoice:updateStatus') return { success:true };
  if (ch === 'printer:printInvoice') return { success:true };
  return {};
}
const MOCK_INVOICES = [
  { id:1, no_invoice:'INV-20240422-001', tanggal:'2026-04-22', nama_pelanggan:'Budi Santoso', jenis_motor:'Honda Beat', no_plat:'D 4521 BC', total:200000, metode_bayar:'Tunai', status:'Lunas' },
  { id:2, no_invoice:'INV-20240422-002', tanggal:'2026-04-22', nama_pelanggan:'Siti Rahayu', jenis_motor:'Yamaha NMAX', no_plat:'D 7832 KJ', total:350000, metode_bayar:'Transfer', status:'Lunas' },
  { id:3, no_invoice:'INV-20240421-005', tanggal:'2026-04-21', nama_pelanggan:'Dedi Kurniawan', jenis_motor:'Honda Vario', no_plat:'D 2341 XA', total:185000, metode_bayar:'QRIS', status:'Proses' },
  { id:4, no_invoice:'INV-20240420-008', tanggal:'2026-04-20', nama_pelanggan:'Ahmad Fauzi', jenis_motor:'Honda PCX', no_plat:'D 1122 PQ', total:750000, metode_bayar:'Tunai', status:'Belum Bayar' },
];
const MOCK_PELANGGAN = [
  { id:1, nama:'Budi Santoso', no_telp:'0812-3456-7890', jenis_motor:'Honda Beat 2021', no_plat:'D 4521 BC' },
  { id:2, nama:'Siti Rahayu',  no_telp:'0857-9876-5432', jenis_motor:'Yamaha NMAX 2022', no_plat:'D 7832 KJ' },
  { id:3, nama:'Dedi Kurniawan',no_telp:'0821-1234-5678',jenis_motor:'Honda Vario 150',  no_plat:'D 2341 XA' },
  { id:4, nama:'Rina Marlina',  no_telp:'0838-5555-1234', jenis_motor:'Suzuki GSX-R150', no_plat:'D 9912 MZ' },
  { id:5, nama:'Ahmad Fauzi',   no_telp:'0896-6789-0123', jenis_motor:'Honda PCX 160',  no_plat:'D 1122 PQ' },
];
const MOCK_SP = [
  { id:1, nama:'Oli Yamalube 10W-40 1L', harga_jual:65000, stok:24, satuan:'Botol' },
  { id:2, nama:'Filter Udara Honda Beat', harga_jual:45000, stok:3, satuan:'Pcs' },
  { id:3, nama:'Busi NGK CPR8EA', harga_jual:28000, stok:18, satuan:'Pcs' },
];

import { useState, useEffect } from 'react';
import {
  Package, Plus, Edit2, PackagePlus, AlertTriangle, XCircle,
  CheckCircle, TrendingUp, Droplets, History, ArrowDownCircle,
  ArrowUpCircle, ReceiptText, Wrench, Tag
} from 'lucide-react';
import {
  Card, CardHeader, Button, Badge, StatCard, Table,
  Modal, FormGrid, FormField, Input, Select, SearchInput
} from '../components/UI';
import { formatRupiah, formatDateTime, KATEGORI_SP } from '../utils/format';
import { useApp } from '../context/AppContext';

const api = window.api || { invoke: mockInvoke };

export default function SparepartPage() {
  const { showToast } = useApp();
  const [data, setData]                     = useState([]);
  const [loading, setLoading]               = useState(true);
  const [search, setSearch]                 = useState('');
  const [filterKat, setFilterKat]           = useState('');
  const [modalAdd, setModalAdd]             = useState(false);
  const [editData, setEditData]             = useState(null);
  const [stokModal, setStokModal]           = useState(null);
  const [riwayatModal, setRiwayat]          = useState(null);
  const [riwayatData, setRiwayatData]       = useState([]);
  const [riwayatLoading, setRiwayatLoading] = useState(false);
  const [modalKategori, setModalKategori]   = useState(false);
  const [categories, setCategories] = useState([...KATEGORI_SP].sort((a, b) => a.localeCompare(b, 'id')));

  useEffect(() => {
    loadData();
    api.invoke('settings:get').then(s => {
      if (s?.kategori_sp) {
        try { setCategories(JSON.parse(s.kategori_sp).sort((a, b) => a.localeCompare(b, 'id'))); }
        catch { setCategories([...KATEGORI_SP]); }
      }
    });
  }, []);

  async function loadData() {
    setLoading(true);
    const res = await api.invoke('sparepart:getAll');
    setData(res || []);
    setLoading(false);
  }

  async function saveCategories(cats) {
  setCategories([...cats].sort((a, b) => a.localeCompare(b, 'id')));
    await api.invoke('settings:set', { key: 'kategori_sp', value: JSON.stringify(cats) });
    showToast('Kategori berhasil disimpan!');
  }

  async function openRiwayat(sp) {
    setRiwayat(sp);
    setRiwayatLoading(true);
    const res = await api.invoke('sparepart:getMutasi', sp.id);
    setRiwayatData(res || []);
    setRiwayatLoading(false);
  }

  const filtered = data.filter(s => {
    const q        = search.toLowerCase();
    const matchQ   = !q || s.nama?.toLowerCase().includes(q) || s.kode?.toLowerCase().includes(q) || s.kategori?.toLowerCase().includes(q);
    const matchKat = !filterKat || s.kategori === filterKat;
    return matchQ && matchKat;
  });

  const habis     = data.filter(s => s.stok <= 0).length;
  const menipis   = data.filter(s => s.stok > 0 && s.stok <= s.stok_minimum).length;
  const nilaiStok = data.reduce((sum, s) => sum + (s.stok * s.harga_jual), 0);

  function stokStatus(s) {
    if (s.stok <= 0)              return { label: 'Habis',   variant: 'red',    icon: <XCircle size={9} /> };
    if (s.stok <= s.stok_minimum) return { label: 'Menipis', variant: 'yellow', icon: <AlertTriangle size={9} /> };
    return                               { label: 'Aman',    variant: 'green',  icon: <CheckCircle size={9} /> };
  }

  const columns = [
    { key: 'kode', title: 'Kode', render: v => (
      <span style={{ fontFamily: 'JetBrains Mono', fontSize: 11, color: 'var(--text3)' }}>{v}</span>
    )},
    { key: 'nama', title: 'Nama Sparepart', render: (v, row) => (
      <div>
        <div style={{ fontWeight: 500 }}>{v}</div>
        {row.stok > 0 && row.stok <= row.stok_minimum && (
          <div style={{ fontSize: 11, color: 'var(--yellow)', marginTop: 1, display: 'flex', alignItems: 'center', gap: 3 }}>
            <AlertTriangle size={9} /> Stok dibawah minimum ({row.stok_minimum} {row.satuan})
          </div>
        )}
        {row.stok <= 0 && (
          <div style={{ fontSize: 11, color: 'var(--red)', marginTop: 1, display: 'flex', alignItems: 'center', gap: 3 }}>
            <XCircle size={9} /> Stok habis — segera restock!
          </div>
        )}
      </div>
    )},
    { key: 'kategori', title: 'Kategori', render: v => (
      <Badge variant="blue"><Droplets size={9} />{v}</Badge>
    )},
    { key: 'stok', title: 'Stok', render: (v, row) => {
      const pct = Math.min(100, (v / Math.max(row.stok_minimum * 2.5, 1)) * 100);
      const col = v <= 0 ? 'var(--red)' : v <= row.stok_minimum ? 'var(--yellow)' : 'var(--green)';
      return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 150 }}>
          <div style={{ height: 6, background: 'var(--border)', borderRadius: 99, overflow: 'hidden', flex: 1 }}>
            <div style={{ height: '100%', width: `${pct}%`, background: col, borderRadius: 99, transition: 'width 0.4s' }} />
          </div>
          <span style={{ fontFamily: 'JetBrains Mono', fontSize: 11, fontWeight: 600, color: col, width: 54, textAlign: 'right' }}>
            {v} {row.satuan}
          </span>
        </div>
      );
    }},
    { key: 'harga_beli', title: 'Harga Beli', render: v => (
      <span style={{ fontFamily: 'JetBrains Mono', fontSize: 12, color: 'var(--text2)' }}>{formatRupiah(v)}</span>
    )},
    { key: 'harga_jual', title: 'Harga Jual', render: v => (
      <span style={{ fontFamily: 'JetBrains Mono', fontSize: 12, fontWeight: 700, color: 'var(--accent)' }}>{formatRupiah(v)}</span>
    )},
    { key: 'stok', title: 'Status', render: (v, row) => {
      const s = stokStatus(row);
      return <Badge variant={s.variant}>{s.icon}{s.label}</Badge>;
    }},
    { key: 'id', title: 'Aksi', align: 'right', render: (v, row) => (
      <div style={{ display: 'flex', gap: 5, justifyContent: 'flex-end' }}>
        <Button variant="ghost" size="icon" icon={<History size={12} />} onClick={() => openRiwayat(row)} title="Riwayat Mutasi" />
        <Button variant="success" size="sm" icon={<PackagePlus size={12} />} onClick={() => setStokModal(row)}>Masuk</Button>
        <Button variant="ghost" size="icon" icon={<Edit2 size={12} />} onClick={() => setEditData(row)} />
      </div>
    )},
  ];

  const mutasiColumns = [
    { key: 'created_at', title: 'Waktu', render: v => (
      <span style={{ fontFamily: 'JetBrains Mono', fontSize: 11, color: 'var(--text3)' }}>{formatDateTime(v)}</span>
    )},
    { key: 'tipe', title: 'Tipe', render: v => (
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        {v === 'masuk'
          ? <><ArrowUpCircle size={14} color="var(--green)" /><span style={{ fontSize: 12, fontWeight: 600, color: 'var(--green)' }}>Masuk</span></>
          : v === 'keluar'
          ? <><ArrowDownCircle size={14} color="var(--red)" /><span style={{ fontSize: 12, fontWeight: 600, color: 'var(--red)' }}>Keluar</span></>
          : <><Wrench size={14} color="var(--blue)" /><span style={{ fontSize: 12, fontWeight: 600, color: 'var(--blue)' }}>Koreksi</span></>
        }
      </div>
    )},
    { key: 'qty', title: 'Qty', align: 'center', render: (v, row) => (
      <span style={{ fontFamily: 'JetBrains Mono', fontWeight: 700, color: row.tipe === 'masuk' ? 'var(--green)' : row.tipe === 'keluar' ? 'var(--red)' : 'var(--blue)' }}>
        {row.tipe === 'masuk' ? '+' : row.tipe === 'keluar' ? '-' : '±'}{v}
      </span>
    )},
    { key: 'keterangan', title: 'Keterangan', render: v => (
      <span style={{ fontSize: 12, color: 'var(--text2)' }}>{v || '-'}</span>
    )},
    { key: 'ref_id', title: 'Ref. Invoice', render: v => v
      ? <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11 }}><ReceiptText size={10} color="var(--accent)" /><span style={{ fontFamily: 'JetBrains Mono', color: 'var(--accent)' }}>#{v}</span></div>
      : <span style={{ color: 'var(--text3)', fontSize: 11 }}>—</span>
    },
  ];

  const totalMasuk  = riwayatData.filter(r => r.tipe === 'masuk').reduce((s, r) => s + r.qty, 0);
  const totalKeluar = riwayatData.filter(r => r.tipe === 'keluar').reduce((s, r) => s + r.qty, 0);

  return (
    <div className="fade-in">

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 16 }}>
        <StatCard label="Total Item"       value={data.length}             icon={<Package size={18} />}       color="var(--blue)"   bg="var(--blue-bg)" />
        <StatCard label="Stok Menipis"     value={`${menipis} item`}       icon={<AlertTriangle size={18} />} color="var(--yellow)" bg="var(--yellow-bg)" />
        <StatCard label="Stok Habis"       value={`${habis} item`}         icon={<XCircle size={18} />}       color="var(--red)"    bg="var(--red-bg)" />
        <StatCard label="Nilai Total Stok" value={formatRupiah(nilaiStok)} icon={<TrendingUp size={18} />}    color="var(--green)"  bg="var(--green-bg)" />
      </div>

      {(habis + menipis) > 0 && (
        <div style={{ marginBottom: 14, padding: '11px 16px', background: 'var(--yellow-bg)', border: '1px solid rgba(217,119,6,0.3)', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 10 }}>
          <AlertTriangle size={15} color="var(--yellow)" />
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--yellow)' }}>
            {habis > 0 && `${habis} item stok habis`}
            {habis > 0 && menipis > 0 && ' · '}
            {menipis > 0 && `${menipis} item menipis`}
          </span>
          <span style={{ fontSize: 12, color: 'var(--text3)', marginLeft: 'auto' }}>Segera lakukan restock</span>
        </div>
      )}

      <Card>
        <CardHeader
          title="Inventaris Sparepart"
          icon={<Package size={14} />}
          iconBg="var(--accent-light)" iconColor="var(--accent)"
          subtitle={`${filtered.length} dari ${data.length} item`}
          actions={
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <select
                value={filterKat}
                onChange={e => setFilterKat(e.target.value)}
                style={{ background: 'var(--surface2)', border: '1.5px solid var(--border)', borderRadius: 8, padding: '7px 10px', fontSize: 13, color: 'var(--text)', outline: 'none', cursor: 'pointer' }}
              >
                <option value="">Semua Kategori</option>
                {categories.map(k => <option key={k} value={k}>{k}</option>)}
              </select>
              <SearchInput value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari kode, nama..." />
              <Button variant="ghost" icon={<Tag size={13} />} onClick={() => setModalKategori(true)}>Kategori</Button>
              <Button icon={<Plus size={14} />} onClick={() => setModalAdd(true)}>Tambah Item</Button>
            </div>
          }
        />
        <Table columns={columns} data={filtered} loading={loading} emptyText="Tidak ada sparepart" />
      </Card>

      {/* Modal Riwayat */}
      <Modal
        open={!!riwayatModal}
        onClose={() => { setRiwayat(null); setRiwayatData([]); }}
        title="Riwayat Mutasi Stok"
        subtitle={riwayatModal ? `${riwayatModal.kode} — ${riwayatModal.nama}` : ''}
        width={680}
      >
        {riwayatData.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 16 }}>
            {[
              { label: 'Total Masuk',   value: `+${totalMasuk}`,        color: 'var(--green)', bg: 'var(--green-bg)', icon: <ArrowUpCircle size={16} /> },
              { label: 'Total Keluar',  value: `-${totalKeluar}`,        color: 'var(--red)',   bg: 'var(--red-bg)',   icon: <ArrowDownCircle size={16} /> },
              { label: 'Stok Sekarang', value: riwayatModal?.stok || 0, color: 'var(--blue)',  bg: 'var(--blue-bg)', icon: <Package size={16} /> },
            ].map((s, i) => (
              <div key={i} style={{ background: s.bg, borderRadius: 10, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ color: s.color }}>{s.icon}</div>
                <div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: s.color, fontFamily: 'JetBrains Mono' }}>
                    {s.value} <span style={{ fontSize: 11 }}>{riwayatModal?.satuan}</span>
                  </div>
                  <div style={{ fontSize: 11, color: s.color, opacity: 0.8 }}>{s.label}</div>
                </div>
              </div>
            ))}
          </div>
        )}
        {riwayatLoading ? (
          <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text3)', fontSize: 13 }}>Memuat riwayat...</div>
        ) : riwayatData.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text3)' }}>
            <History size={28} style={{ marginBottom: 8, opacity: 0.4 }} />
            <div style={{ fontSize: 13 }}>Belum ada riwayat mutasi untuk item ini</div>
          </div>
        ) : (
          <Table columns={mutasiColumns} data={riwayatData} emptyText="Belum ada riwayat" />
        )}
      </Modal>

      <SparepartModal
        open={modalAdd || !!editData}
        editData={editData}
        categories={categories}
        onClose={() => { setModalAdd(false); setEditData(null); }}
        onSaved={() => {
          setModalAdd(false); setEditData(null); loadData();
          showToast(editData ? 'Data diperbarui!' : 'Sparepart ditambahkan!');
        }}
      />

      <StokMasukModal
        open={!!stokModal}
        sparepart={stokModal}
        onClose={() => setStokModal(null)}
        onSaved={() => { setStokModal(null); loadData(); showToast('Stok berhasil ditambahkan!'); }}
      />

      <KategoriModal
        open={modalKategori}
        categories={categories}
        onClose={() => setModalKategori(false)}
        onSave={saveCategories}
      />
    </div>
  );
}

// ─── Sparepart Add/Edit Modal ─────────────────────────────────────────────────
function SparepartModal({ open, editData, categories, onClose, onSaved }) {
  const { showToast } = useApp();
  const [form, setForm]       = useState({ kode: '', nama: '', kategori: '', stok: 0, stok_minimum: 5, harga_beli: 0, harga_jual: 0, satuan: 'Pcs' });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      const defaultKat = categories?.[0] || 'Lainnya';
      if (editData) {
        setForm({
          kode: editData.kode || '', nama: editData.nama || '',
          kategori: editData.kategori || defaultKat,
          stok: editData.stok || 0, stok_minimum: editData.stok_minimum || 5,
          harga_beli: editData.harga_beli || 0, harga_jual: editData.harga_jual || 0,
          satuan: editData.satuan || 'Pcs',
        });
      } else {
        setForm({ kode: '', nama: '', kategori: defaultKat, stok: 0, stok_minimum: 5, harga_beli: 0, harga_jual: 0, satuan: 'Pcs' });
      }
    }
  }, [open, editData, categories]);

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  async function handleSave() {
    if (!form.kode.trim() || !form.nama.trim()) return showToast('Kode dan nama wajib diisi', 'error');
    setLoading(true);
    const res = editData
      ? await api.invoke('sparepart:update', { id: editData.id, ...form })
      : await api.invoke('sparepart:add', form);
    setLoading(false);
    if (res.success) onSaved();
    else showToast(res.message || 'Gagal simpan', 'error');
  }

  const margin = form.harga_beli > 0 && form.harga_jual > 0
    ? Math.round(((form.harga_jual - form.harga_beli) / form.harga_beli) * 100)
    : 0;

  return (
    <Modal
      open={open} onClose={onClose}
      title={editData ? 'Edit Sparepart' : 'Tambah Sparepart Baru'}
      subtitle="Data inventaris sparepart"
      footer={<>
        <Button variant="ghost" onClick={onClose}>Batal</Button>
        <Button loading={loading} onClick={handleSave} icon={<CheckCircle size={13} />}>Simpan</Button>
      </>}
    >
      <FormGrid>
        <FormField label="Kode Part" required>
          <Input value={form.kode} onChange={set('kode')} placeholder="SP008" disabled={!!editData} />
        </FormField>
        <FormField label="Kategori">
          <Select value={form.kategori} onChange={set('kategori')}>
            {(categories || KATEGORI_SP).map(k => <option key={k} value={k}>{k}</option>)}
          </Select>
        </FormField>
        <FormField label="Nama Sparepart" required span={2}>
          <Input value={form.nama} onChange={set('nama')} placeholder="Nama lengkap sparepart" />
        </FormField>
        <FormField label="Stok Awal">
          <Input value={form.stok} onChange={set('stok')} type="number" disabled={!!editData} />
        </FormField>
        <FormField label="Stok Minimum Alert">
          <Input value={form.stok_minimum} onChange={set('stok_minimum')} type="number" />
        </FormField>
        <FormField label="Harga Beli">
          <Input value={form.harga_beli} onChange={set('harga_beli')} type="number" placeholder="0" />
        </FormField>
        <FormField label="Harga Jual">
          <Input value={form.harga_jual} onChange={set('harga_jual')} type="number" placeholder="0" />
        </FormField>
        <FormField label="Satuan">
          <Select value={form.satuan} onChange={set('satuan')}>
            {['Pcs', 'Botol', 'Set', 'Lembar', 'Meter'].map(s => <option key={s} value={s}>{s}</option>)}
          </Select>
        </FormField>
        {margin > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: margin >= 20 ? 'var(--green-bg)' : 'var(--yellow-bg)', borderRadius: 8 }}>
            <CheckCircle size={14} color={margin >= 20 ? 'var(--green)' : 'var(--yellow)'} />
            <span style={{ fontSize: 12, color: margin >= 20 ? 'var(--green)' : 'var(--yellow)', fontWeight: 600 }}>
              Margin: {margin}% {margin < 20 ? '(rendah)' : ''}
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
    const res = await api.invoke('sparepart:stokMasuk', {
      id: sparepart.id, qty: Number(qty),
      keterangan: keterangan || 'Stok masuk manual',
    });
    setLoading(false);
    if (res.success) onSaved();
    else showToast(res.message || 'Gagal', 'error');
  }

  return (
    <Modal
      open={open} onClose={onClose}
      title="Tambah Stok Masuk" subtitle={sparepart?.nama}
      width={400}
      footer={<>
        <Button variant="ghost" onClick={onClose}>Batal</Button>
        <Button loading={loading} onClick={handleSave} icon={<PackagePlus size={13} />}>Tambah Stok</Button>
      </>}
    >
      {sparepart && (
        <div style={{ marginBottom: 16, padding: '10px 14px', background: 'var(--surface2)', borderRadius: 8, border: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 13, color: 'var(--text2)' }}>Stok saat ini</span>
          <span style={{ fontFamily: 'JetBrains Mono', fontWeight: 700, color: sparepart.stok <= 0 ? 'var(--red)' : 'var(--text)' }}>
            {sparepart.stok} {sparepart.satuan}
          </span>
        </div>
      )}
      <FormGrid cols={1}>
        <FormField label="Jumlah Masuk (qty)" required>
          <Input value={qty} onChange={e => setQty(e.target.value)} type="number" placeholder="1" />
        </FormField>
        <FormField label="Keterangan / Sumber">
          <Input value={keterangan} onChange={e => setKet(e.target.value)} placeholder="Beli dari supplier, dll." />
        </FormField>
      </FormGrid>
      {sparepart && qty > 0 && (
        <div style={{ marginTop: 12, padding: '10px 14px', background: 'var(--green-bg)', borderRadius: 8, border: '1px solid rgba(5,150,105,0.2)', display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
          <span style={{ color: 'var(--green)', fontWeight: 500 }}>Stok setelah masuk</span>
          <span style={{ fontFamily: 'JetBrains Mono', fontWeight: 700, color: 'var(--green)' }}>
            {Number(sparepart.stok) + Number(qty)} {sparepart.satuan}
          </span>
        </div>
      )}
    </Modal>
  );
}

// ─── Kelola Kategori Modal ────────────────────────────────────────────────────
// GANTI seluruh function KategoriModal yang lama dengan ini
function KategoriModal({ open, categories, onClose, onSave }) {
  const [list, setList]       = useState([]);
  const [newKat, setNewKat]   = useState('');
  const [error, setError]     = useState('');
  const [editIdx, setEditIdx] = useState(null); // index item yang sedang diedit
  const [editVal, setEditVal] = useState('');

  useEffect(() => {
    if (open) {
      setList([...categories].sort((a, b) => a.localeCompare(b, 'id')));
      setNewKat('');
      setError('');
      setEditIdx(null);
      setEditVal('');
    }
  }, [open, categories]);

  // ── Tambah ──────────────────────────────────────────────────────────────────
  function handleAdd() {
    const val = newKat.trim();
    if (!val) return setError('Nama kategori tidak boleh kosong');
    if (list.map(k => k.toLowerCase()).includes(val.toLowerCase()))
      return setError('Kategori sudah ada');
    setList(prev => [...prev, val].sort((a, b) => a.localeCompare(b, 'id')));
    setNewKat('');
    setError('');
  }

  // ── Edit ────────────────────────────────────────────────────────────────────
  function startEdit(idx) {
    setEditIdx(idx);
    setEditVal(list[idx]);
    setError('');
  }

  function cancelEdit() {
    setEditIdx(null);
    setEditVal('');
    setError('');
  }

  function confirmEdit() {
    const val = editVal.trim();
    if (!val) return setError('Nama tidak boleh kosong');
    if (list.some((k, i) => i !== editIdx && k.toLowerCase() === val.toLowerCase()))
      return setError('Nama kategori sudah ada');
    setList(prev =>
      prev.map((k, i) => i === editIdx ? val : k)
          .sort((a, b) => a.localeCompare(b, 'id'))
    );
    setEditIdx(null);
    setEditVal('');
    setError('');
  }

  // ── Hapus ───────────────────────────────────────────────────────────────────
  function handleDelete(kat) {
    setList(prev => prev.filter(k => k !== kat));
    if (editIdx !== null) { setEditIdx(null); setEditVal(''); }
  }

  // ── Simpan ──────────────────────────────────────────────────────────────────
  function handleSave() {
    if (list.length === 0) return setError('Minimal harus ada 1 kategori');
    onSave(list);
    onClose();
  }

  return (
    <Modal
      open={open} onClose={onClose}
      title="Kelola Kategori Sparepart"
      subtitle="Tersimpan otomatis urut A–Z"
      width={420}
      footer={<>
        <Button variant="ghost" onClick={onClose}>Batal</Button>
        <Button icon={<CheckCircle size={13} />} onClick={handleSave}>Simpan</Button>
      </>}
    >
      {/* Form tambah */}
      <div style={{ display: 'flex', gap: 8, marginBottom: error ? 6 : 14 }}>
        <input
          value={newKat}
          onChange={e => { setNewKat(e.target.value); setError(''); }}
          onKeyDown={e => e.key === 'Enter' && handleAdd()}
          placeholder="Nama kategori baru..."
          style={{
            flex: 1, background: 'var(--surface2)',
            border: `1.5px solid ${error && editIdx === null ? 'var(--red)' : 'var(--border)'}`,
            borderRadius: 8, padding: '8px 11px', fontSize: 13,
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            color: 'var(--text)', outline: 'none', transition: 'all 0.12s',
          }}
          onFocus={e => { e.target.style.borderColor = 'var(--accent)'; e.target.style.boxShadow = '0 0 0 3px rgba(232,93,4,0.08)'; }}
          onBlur={e => { e.target.style.borderColor = 'var(--border)'; e.target.style.boxShadow = 'none'; }}
        />
        <Button icon={<Plus size={13} />} onClick={handleAdd}>Tambah</Button>
      </div>

      {error && (
        <div style={{ fontSize: 12, color: 'var(--red)', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 4 }}>
          <XCircle size={11} /> {error}
        </div>
      )}

      {/* List kategori */}
      <div style={{ border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
        {list.length === 0 ? (
          <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text3)', fontSize: 13 }}>
            Belum ada kategori
          </div>
        ) : list.map((kat, i) => (
          <div
            key={kat + i}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '9px 12px',
              borderBottom: i < list.length - 1 ? '1px solid var(--border)' : 'none',
              background: editIdx === i ? 'var(--accent-light)' : 'var(--surface)',
              transition: 'background 0.1s',
            }}
            onMouseEnter={e => { if (editIdx !== i) e.currentTarget.style.background = 'var(--surface2)'; }}
            onMouseLeave={e => { if (editIdx !== i) e.currentTarget.style.background = 'var(--surface)'; }}
          >
            <Droplets size={13} color={editIdx === i ? 'var(--accent)' : 'var(--blue)'} style={{ flexShrink: 0 }} />

            {/* Nama atau input edit inline */}
            {editIdx === i ? (
              <input
                autoFocus
                value={editVal}
                onChange={e => { setEditVal(e.target.value); setError(''); }}
                onKeyDown={e => {
                  if (e.key === 'Enter') confirmEdit();
                  if (e.key === 'Escape') cancelEdit();
                }}
                style={{
                  flex: 1, background: 'white',
                  border: '1.5px solid var(--accent)',
                  borderRadius: 6, padding: '4px 8px', fontSize: 13,
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  color: 'var(--text)', outline: 'none',
                  boxShadow: '0 0 0 3px rgba(232,93,4,0.08)',
                }}
              />
            ) : (
              <span style={{ flex: 1, fontSize: 13, fontWeight: 500 }}>{kat}</span>
            )}

            {/* Tombol aksi */}
            <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
              {editIdx === i ? (
                <>
                  {/* Konfirmasi edit — pakai CheckCircle yg sudah diimport */}
                  <button
                    onClick={confirmEdit}
                    title="Simpan perubahan (Enter)"
                    style={{
                      background: 'var(--green-bg)', border: '1px solid rgba(5,150,105,0.25)',
                      cursor: 'pointer', padding: '4px 8px', borderRadius: 6,
                      display: 'flex', alignItems: 'center', color: 'var(--green)',
                    }}
                  >
                    <CheckCircle size={13} />
                  </button>
                  {/* Batal edit — pakai XCircle yg sudah diimport */}
                  <button
                    onClick={cancelEdit}
                    title="Batal (Escape)"
                    style={{
                      background: 'var(--surface2)', border: '1px solid var(--border)',
                      cursor: 'pointer', padding: '4px 8px', borderRadius: 6,
                      display: 'flex', alignItems: 'center', color: 'var(--text3)',
                    }}
                  >
                    <XCircle size={13} />
                  </button>
                </>
              ) : (
                <>
                  {/* Tombol edit — pakai Edit2 yg sudah diimport */}
                  <button
                    onClick={() => startEdit(i)}
                    title="Edit nama kategori"
                    style={{
                      background: 'none', border: 'none', cursor: 'pointer',
                      padding: '4px 7px', borderRadius: 6,
                      display: 'flex', alignItems: 'center', color: 'var(--text3)',
                      transition: 'all 0.12s',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'var(--blue-bg)'; e.currentTarget.style.color = 'var(--blue)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'var(--text3)'; }}
                  >
                    <Edit2 size={13} />
                  </button>
                  {/* Tombol hapus */}
                  <button
                    onClick={() => handleDelete(kat)}
                    title="Hapus kategori"
                    style={{
                      background: 'none', border: 'none', cursor: 'pointer',
                      padding: '4px 7px', borderRadius: 6,
                      display: 'flex', alignItems: 'center', color: 'var(--text3)',
                      transition: 'all 0.12s',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'var(--red-bg)'; e.currentTarget.style.color = 'var(--red)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'var(--text3)'; }}
                  >
                    <XCircle size={14} />
                  </button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 10, fontSize: 11, color: 'var(--text3)', display: 'flex', alignItems: 'center', gap: 4 }}>
        <AlertTriangle size={10} />
        Mengedit/menghapus kategori tidak mengubah sparepart yang sudah menggunakannya
      </div>
    </Modal>
  );
}

// ── Mock untuk development ────────────────────────────────────────────────────
async function mockInvoke(ch) {
  if (ch === 'settings:get')     return { kategori_sp: JSON.stringify(KATEGORI_SP) };
  if (ch === 'settings:set')     return { success: true };
  if (ch === 'sparepart:getAll') return MOCK_SP;
  if (ch === 'sparepart:add' || ch === 'sparepart:update') return { success: true, id: 99 };
  if (ch === 'sparepart:stokMasuk') return { success: true };
  if (ch === 'sparepart:getMutasi') return MOCK_MUTASI;
  return {};
}

const MOCK_SP = [
  { id: 1, kode: 'SP001', nama: 'Oli Yamalube 10W-40 1L',    kategori: 'Oli',    stok: 24, stok_minimum: 10, harga_beli: 55000,  harga_jual: 65000,  satuan: 'Botol' },
  { id: 2, kode: 'SP002', nama: 'Filter Udara Honda Beat',    kategori: 'Filter', stok: 3,  stok_minimum: 5,  harga_beli: 35000,  harga_jual: 45000,  satuan: 'Pcs' },
  { id: 3, kode: 'SP003', nama: 'Busi NGK CPR8EA',            kategori: 'Busi',   stok: 18, stok_minimum: 8,  harga_beli: 20000,  harga_jual: 28000,  satuan: 'Pcs' },
  { id: 4, kode: 'SP004', nama: 'Kampas Rem Depan Universal', kategori: 'Rem',    stok: 7,  stok_minimum: 6,  harga_beli: 40000,  harga_jual: 55000,  satuan: 'Set' },
  { id: 5, kode: 'SP005', nama: 'Rantai RK 428H 120 Mata',   kategori: 'Rantai', stok: 2,  stok_minimum: 4,  harga_beli: 100000, harga_jual: 135000, satuan: 'Pcs' },
  { id: 6, kode: 'SP006', nama: 'Ban IRC NR 53 80/90-14',    kategori: 'Ban',    stok: 6,  stok_minimum: 4,  harga_beli: 140000, harga_jual: 185000, satuan: 'Pcs' },
  { id: 7, kode: 'SP007', nama: 'Aki Yuasa YTZ5S',           kategori: 'Aki',    stok: 0,  stok_minimum: 2,  harga_beli: 220000, harga_jual: 285000, satuan: 'Pcs' },
];

const MOCK_MUTASI = [
  { id: 10, tipe: 'masuk',   qty: 24, keterangan: 'Stok awal',          ref_id: null, created_at: '2026-04-01 08:00:00' },
  { id: 11, tipe: 'keluar',  qty: 2,  keterangan: 'Terpakai INV-0001',  ref_id: 1,    created_at: '2026-04-05 10:30:00' },
  { id: 12, tipe: 'keluar',  qty: 1,  keterangan: 'Terpakai INV-0003',  ref_id: 3,    created_at: '2026-04-10 14:20:00' },
  { id: 13, tipe: 'masuk',   qty: 12, keterangan: 'Beli dari supplier', ref_id: null, created_at: '2026-04-15 09:00:00' },
  { id: 14, tipe: 'keluar',  qty: 3,  keterangan: 'Terpakai INV-0008',  ref_id: 8,    created_at: '2026-04-20 11:45:00' },
  { id: 15, tipe: 'koreksi', qty: -2, keterangan: 'Koreksi stok opname',ref_id: null, created_at: '2026-04-21 16:00:00' },
];
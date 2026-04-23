import { useState, useEffect } from 'react';
import {
  ArrowDownCircle, ArrowUpCircle, Wrench,
  Package, ReceiptText, Filter, RefreshCw,
} from 'lucide-react';
import {
  Card, CardHeader, Badge, StatCard, Table, SearchInput, Button
} from '../components/UI';
import { formatRupiah, formatDateTime, KATEGORI_SP } from '../utils/format';

const api = window.api || { invoke: mockInvoke };

export default function RiwayatGudangPage() {
  const [data, setData]           = useState([]);
  const [spareparts, setSpareparts] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState('');
  const [filterTipe, setFilterTipe] = useState('');   // masuk | keluar | koreksi
  const [filterSP, setFilterSP]   = useState('');     // sparepart_id

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    const [mutasi, sp] = await Promise.all([
      api.invoke('stok:getAllMutasi'),
      api.invoke('sparepart:getAll'),
    ]);
    setData(mutasi || []);
    setSpareparts(sp || []);
    setLoading(false);
  }

  // ── Filter ─────────────────────────────────────────────────────────────────
  const filtered = data.filter(r => {
    const q = search.toLowerCase();
    const matchQ  = !q
      || r.nama_sparepart?.toLowerCase().includes(q)
      || r.kode_sparepart?.toLowerCase().includes(q)
      || r.keterangan?.toLowerCase().includes(q);
    const matchT  = !filterTipe || r.tipe === filterTipe;
    const matchSP = !filterSP   || String(r.sparepart_id) === filterSP;
    return matchQ && matchT && matchSP;
  });

  // ── Summary ────────────────────────────────────────────────────────────────
  const totalMasuk   = data.filter(r => r.tipe === 'masuk').reduce((s, r) => s + r.qty, 0);
  const totalKeluar  = data.filter(r => r.tipe === 'keluar').reduce((s, r) => s + r.qty, 0);
  const totalKoreksi = data.filter(r => r.tipe === 'koreksi').length;

  // ── Columns ────────────────────────────────────────────────────────────────
  const columns = [
    {
      key: 'created_at', title: 'Waktu',
      render: v => (
        <span style={{ fontFamily: 'JetBrains Mono', fontSize: 11, color: 'var(--text3)' }}>
          {formatDateTime(v)}
        </span>
      ),
    },
    {
      key: 'kode_sparepart', title: 'Kode',
      render: v => (
        <span style={{ fontFamily: 'JetBrains Mono', fontSize: 11, color: 'var(--text3)' }}>
          {v || '—'}
        </span>
      ),
    },
    {
      key: 'nama_sparepart', title: 'Nama Sparepart',
      render: (v, row) => (
        <div>
          <div style={{ fontWeight: 600, fontSize: 13 }}>{v || '—'}</div>
          {row.kategori && (
            <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 1 }}>{row.kategori}</div>
          )}
        </div>
      ),
    },
    {
      key: 'tipe', title: 'Tipe',
      render: v => {
        if (v === 'masuk')   return <Badge variant="green"><ArrowUpCircle size={9} />Masuk</Badge>;
        if (v === 'keluar')  return <Badge variant="red"><ArrowDownCircle size={9} />Keluar</Badge>;
        return                      <Badge variant="blue"><Wrench size={9} />Koreksi</Badge>;
      },
    },
    {
      key: 'qty', title: 'Qty', align: 'center',
      render: (v, row) => {
        const color = row.tipe === 'masuk' ? 'var(--green)'
                    : row.tipe === 'keluar' ? 'var(--red)'
                    : 'var(--blue)';
        const sign  = row.tipe === 'masuk' ? '+' : row.tipe === 'keluar' ? '-' : '±';
        return (
          <span style={{ fontFamily: 'JetBrains Mono', fontWeight: 700, color }}>
            {sign}{Math.abs(v)}
          </span>
        );
      },
    },
    {
      key: 'stok_sesudah', title: 'Stok Akhir', align: 'center',
      render: v => v != null
        ? <span style={{ fontFamily: 'JetBrains Mono', fontSize: 12 }}>{v}</span>
        : <span style={{ color: 'var(--text3)' }}>—</span>,
    },
    {
      key: 'keterangan', title: 'Keterangan',
      render: v => <span style={{ fontSize: 12, color: 'var(--text2)' }}>{v || '—'}</span>,
    },
    {
      key: 'ref_id', title: 'Ref. Invoice',
      render: v => v
        ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11 }}>
            <ReceiptText size={10} color="var(--accent)" />
            <span style={{ fontFamily: 'JetBrains Mono', color: 'var(--accent)' }}>#{v}</span>
          </div>
        )
        : <span style={{ color: 'var(--text3)', fontSize: 11 }}>—</span>,
    },
  ];

  return (
    <div className="fade-in">
      {/* ── Stat Cards ──────────────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14, marginBottom: 16 }}>
        <StatCard
          label="Total Masuk"
          value={`+${totalMasuk}`}
          icon={<ArrowUpCircle size={18} />}
          color="var(--green)" bg="var(--green-bg)"
        />
        <StatCard
          label="Total Keluar"
          value={`-${totalKeluar}`}
          icon={<ArrowDownCircle size={18} />}
          color="var(--red)" bg="var(--red-bg)"
        />
        <StatCard
          label="Koreksi / Penyesuaian"
          value={`${totalKoreksi}x`}
          icon={<Wrench size={18} />}
          color="var(--blue)" bg="var(--blue-bg)"
        />
      </div>

      {/* ── Tabel ───────────────────────────────────────────────────────────── */}
      <Card>
        <CardHeader
          title="Riwayat Keluar Masuk Gudang"
          icon={<Package size={14} />}
          iconBg="var(--blue-bg)" iconColor="var(--blue)"
          subtitle={`${filtered.length} dari ${data.length} transaksi`}
          actions={
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>

              {/* Filter tipe */}
              <select
                value={filterTipe}
                onChange={e => setFilterTipe(e.target.value)}
                style={{
                  background: 'var(--surface2)', border: '1.5px solid var(--border)',
                  borderRadius: 8, padding: '7px 10px', fontSize: 13,
                  color: 'var(--text)', outline: 'none', cursor: 'pointer',
                }}
              >
                <option value="">Semua Tipe</option>
                <option value="masuk">↑ Masuk</option>
                <option value="keluar">↓ Keluar</option>
                <option value="koreksi">⟳ Koreksi</option>
              </select>

              {/* Filter sparepart */}
              <select
                value={filterSP}
                onChange={e => setFilterSP(e.target.value)}
                style={{
                  background: 'var(--surface2)', border: '1.5px solid var(--border)',
                  borderRadius: 8, padding: '7px 10px', fontSize: 13,
                  color: 'var(--text)', outline: 'none', cursor: 'pointer',
                  maxWidth: 200,
                }}
              >
                <option value="">Semua Sparepart</option>
                {spareparts.map(sp => (
                  <option key={sp.id} value={sp.id}>{sp.nama}</option>
                ))}
              </select>

              <SearchInput
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Cari nama, keterangan..."
              />

              <Button
                variant="ghost"
                icon={<RefreshCw size={13} />}
                onClick={loadData}
              >
                Refresh
              </Button>
            </div>
          }
        />
        <Table
          columns={columns}
          data={filtered}
          loading={loading}
          emptyText="Belum ada riwayat mutasi stok"
        />
      </Card>
    </div>
  );
}

// ── Mock data untuk dev (browser tanpa Electron) ───────────────────────────────
async function mockInvoke(ch) {
  if (ch === 'sparepart:getAll') return [
    { id: 1, nama: 'Oli Yamalube 10W-40 1L', kode: 'SP001' },
    { id: 2, nama: 'Filter Udara Honda Beat', kode: 'SP002' },
    { id: 3, nama: 'Busi NGK CPR8EA',         kode: 'SP003' },
  ];
  if (ch === 'stok:getAllMutasi') return [
    { id: 1,  sparepart_id: 1, kode_sparepart: 'SP001', nama_sparepart: 'Oli Yamalube 10W-40 1L', kategori: 'Oli',    tipe: 'masuk',   qty: 24, stok_sesudah: 24, keterangan: 'Stok awal',           ref_id: null, created_at: '2026-04-01 08:00' },
    { id: 2,  sparepart_id: 2, kode_sparepart: 'SP002', nama_sparepart: 'Filter Udara Honda Beat', kategori: 'Filter', tipe: 'masuk',   qty: 10, stok_sesudah: 10, keterangan: 'Stok awal',           ref_id: null, created_at: '2026-04-01 08:05' },
    { id: 3,  sparepart_id: 1, kode_sparepart: 'SP001', nama_sparepart: 'Oli Yamalube 10W-40 1L', kategori: 'Oli',    tipe: 'keluar',  qty: 2,  stok_sesudah: 22, keterangan: 'Terpakai INV-001',    ref_id: 1,    created_at: '2026-04-05 10:30' },
    { id: 4,  sparepart_id: 2, kode_sparepart: 'SP002', nama_sparepart: 'Filter Udara Honda Beat', kategori: 'Filter', tipe: 'keluar',  qty: 3,  stok_sesudah: 7,  keterangan: 'Terpakai INV-002',    ref_id: 2,    created_at: '2026-04-08 14:00' },
    { id: 5,  sparepart_id: 1, kode_sparepart: 'SP001', nama_sparepart: 'Oli Yamalube 10W-40 1L', kategori: 'Oli',    tipe: 'masuk',   qty: 12, stok_sesudah: 34, keterangan: 'Beli dari supplier',   ref_id: null, created_at: '2026-04-15 09:00' },
    { id: 6,  sparepart_id: 3, kode_sparepart: 'SP003', nama_sparepart: 'Busi NGK CPR8EA',         kategori: 'Busi',   tipe: 'keluar',  qty: 4,  stok_sesudah: 14, keterangan: 'Terpakai INV-005',    ref_id: 5,    created_at: '2026-04-18 11:20' },
    { id: 7,  sparepart_id: 2, kode_sparepart: 'SP002', nama_sparepart: 'Filter Udara Honda Beat', kategori: 'Filter', tipe: 'koreksi', qty: -2, stok_sesudah: 5,  keterangan: 'Koreksi stok opname', ref_id: null, created_at: '2026-04-20 16:00' },
    { id: 8,  sparepart_id: 1, kode_sparepart: 'SP001', nama_sparepart: 'Oli Yamalube 10W-40 1L', kategori: 'Oli',    tipe: 'keluar',  qty: 3,  stok_sesudah: 31, keterangan: 'Terpakai INV-008',    ref_id: 8,    created_at: '2026-04-22 13:45' },
  ];
  return {};
}
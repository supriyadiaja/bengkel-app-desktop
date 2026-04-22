import { useState, useEffect } from 'react';
import { TrendingUp, Wrench, Users, AlertTriangle, BarChart3, ReceiptText, Zap, ArrowUpRight, Bike, Printer, ChevronRight } from 'lucide-react';
import { StatCard, Card, CardHeader, Badge, Table, Button } from '../components/UI';
import { formatRupiah, formatDate, todayISO, monthRange } from '../utils/format';

const api = window.api || { invoke: mockInvoke, send: () => {} };

export default function Dashboard({ onNavigate }) {
  const [stats, setStats]     = useState({ pendapatan: 0, servis: 0, pelanggan: 0, stokMenipis: 0 });
  const [recentInv, setRecent] = useState([]);
  const [chartData, setChart]  = useState([]);
  const [loading, setLoading]  = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const today = todayISO();
      const y = new Date().getFullYear();
      const m = new Date().getMonth() + 1;
      const { dari, sampai } = monthRange(y, m);

      const [invoices, lapHarian, pelangganList, stokMenipis] = await Promise.all([
        api.invoke('invoice:getAll', { limit: 5 }),
        api.invoke('laporan:harian', { dari: today, sampai: today }),
        api.invoke('pelanggan:getAll'),
        api.invoke('sparepart:getStokMenipis'),
      ]);

      const hari = lapHarian[0] || {};
      setStats({
        pendapatan: hari.total_pendapatan || 0,
        servis: hari.total_transaksi || 0,
        pelanggan: pelangganList.length || 0,
        stokMenipis: stokMenipis.length || 0,
      });
      setRecent(invoices || []);

      // Chart: last 7 days
      const days = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        days.push(d.toISOString().split('T')[0]);
      }
      const chartRes = await api.invoke('laporan:harian', { dari: days[0], sampai: days[6] });
      const chartMap = Object.fromEntries((chartRes || []).map(r => [r.tanggal, r]));
      setChart(days.map(d => ({
        tgl: new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit' }),
        pend: chartMap[d]?.total_pendapatan || 0,
        trx: chartMap[d]?.total_transaksi || 0,
        isToday: d === today,
      })));
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }

  const maxBar = Math.max(...chartData.map(d => d.pend), 1);

  const statusMap = {
    'Lunas':      'green',
    'Proses':     'yellow',
    'Belum Bayar':'red',
    'Dibatalkan': 'gray',
  };

  const invColumns = [
    { key: 'no_invoice', title: 'No. Invoice', render: v => <span style={{ fontFamily: 'JetBrains Mono', fontSize: 11, color: 'var(--text3)' }}>{v}</span> },
    { key: 'nama_pelanggan', title: 'Pelanggan', render: (v, row) => (
      <div>
        <div style={{ fontWeight: 600, fontSize: 13 }}>{v}</div>
        <div style={{ fontSize: 11, color: 'var(--text3)', display: 'flex', alignItems: 'center', gap: 3 }}>
          <Bike size={10} />{row.jenis_motor}
        </div>
      </div>
    )},
    { key: 'total', title: 'Total', render: v => <span style={{ fontFamily: 'JetBrains Mono', fontWeight: 700, color: 'var(--accent)', fontSize: 12 }}>{formatRupiah(v)}</span> },
    { key: 'status', title: 'Status', render: v => <Badge variant={statusMap[v] || 'gray'}>{v}</Badge> },
    { key: 'id', title: '', align: 'right', render: (_, row) => (
      <Button variant="ghost" size="icon" icon={<Printer size={12} />} onClick={() => api.invoke('printer:printInvoice', row.id)} />
    )},
  ];

  return (
    <div className="fade-in">
      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 18 }}>
        <StatCard label="Pendapatan Hari Ini" value={formatRupiah(stats.pendapatan)}
          icon={<TrendingUp size={18} />} color="var(--accent)" bg="var(--accent-light)"
          trend="Hari ini" trendUp />
        <StatCard label="Servis Hari Ini" value={`${stats.servis} Unit`}
          icon={<Wrench size={18} />} color="var(--green)" bg="var(--green-bg)"
          trend="Unit masuk" trendUp />
        <StatCard label="Total Pelanggan" value={String(stats.pelanggan)}
          icon={<Users size={18} />} color="var(--blue)" bg="var(--blue-bg)"
          trend="Terdaftar" trendUp onClick={() => onNavigate('pelanggan')} />
        <StatCard label="Stok Menipis" value={`${stats.stokMenipis} Item`}
          icon={<AlertTriangle size={18} />} color="var(--yellow)" bg="var(--yellow-bg)"
          trend={stats.stokMenipis > 0 ? 'Perlu restock' : 'Aman'} trendUp={stats.stokMenipis === 0}
          onClick={() => onNavigate('sparepart')} />
      </div>

      {/* Chart + Activity */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 14, marginBottom: 14 }}>
        {/* Chart */}
        <Card>
          <CardHeader
            title="Grafik Pendapatan — 7 Hari Terakhir"
            icon={<BarChart3 size={14} />}
            iconBg="var(--accent-light)" iconColor="var(--accent)"
          />
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 100, marginTop: 8 }}>
            {chartData.map((d, i) => (
              <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, height: '100%' }}>
                <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end', width: '100%' }}>
                  <div style={{
                    width: '100%', borderRadius: '5px 5px 0 0', minHeight: 4,
                    height: `${(d.pend / maxBar) * 100}%`,
                    background: d.isToday
                      ? 'linear-gradient(180deg, #e85d04, #f48c06)'
                      : 'linear-gradient(180deg, #e8eaed, #d1d5db)',
                    transition: 'height 0.4s ease',
                  }} title={`${formatRupiah(d.pend)}\n${d.trx} transaksi`} />
                </div>
                <div style={{ fontSize: 9.5, color: d.isToday ? 'var(--accent)' : 'var(--text3)', fontFamily: 'JetBrains Mono', fontWeight: d.isToday ? 700 : 400 }}>
                  {d.tgl}
                </div>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', paddingTop: 4 }}>
            {chartData.map((d, i) => (
              <div key={i} style={{ flex: 1, textAlign: 'center', fontFamily: 'JetBrains Mono', fontSize: 9.5, color: d.isToday ? 'var(--accent)' : 'var(--text3)', fontWeight: d.isToday ? 700 : 400 }}>
                {d.pend > 0 ? `${(d.pend / 1000).toFixed(0)}K` : '-'}
              </div>
            ))}
          </div>
        </Card>

        {/* Activity */}
        <Card>
          <CardHeader title="Transaksi Terbaru" icon={<Zap size={14} />} iconBg="var(--blue-bg)" iconColor="var(--blue)" />
          {loading ? (
            <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--text3)', fontSize: 13 }}>Memuat...</div>
          ) : recentInv.slice(0, 5).map((inv, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '9px 10px', borderRadius: 8,
              background: 'var(--surface2)', border: '1px solid var(--border)',
              marginBottom: i < 4 ? 7 : 0,
            }}>
              <div style={{
                width: 7, height: 7, borderRadius: '50%', flexShrink: 0,
                background: inv.status === 'Lunas' ? 'var(--green)' : inv.status === 'Proses' ? 'var(--yellow)' : 'var(--red)',
              }} />
              <div style={{ flex: 1, overflow: 'hidden' }}>
                <div style={{ fontSize: 12.5, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {inv.nama_pelanggan}
                </div>
                <div style={{ fontSize: 10.5, color: 'var(--text3)' }}>{inv.no_invoice}</div>
              </div>
              <div style={{ fontSize: 11, fontFamily: 'JetBrains Mono', fontWeight: 600, color: 'var(--accent)', whiteSpace: 'nowrap' }}>
                {formatRupiah(inv.total)}
              </div>
            </div>
          ))}
        </Card>
      </div>

      {/* Recent Invoices Table */}
      <Card>
        <CardHeader
          title="Invoice Terbaru"
          icon={<ReceiptText size={14} />}
          iconBg="var(--accent-light)" iconColor="var(--accent)"
          actions={<Button variant="ghost" size="sm" icon={<ChevronRight size={12} />} onClick={() => onNavigate('invoice')}>Lihat semua</Button>}
        />
        <Table columns={invColumns} data={recentInv} loading={loading} emptyText="Belum ada invoice hari ini" />
      </Card>
    </div>
  );
}

async function mockInvoke(ch) {
  if (ch === 'invoice:getAll')          return MOCK_INVOICES;
  if (ch === 'pelanggan:getAll')        return Array(138).fill({});
  if (ch === 'sparepart:getStokMenipis') return Array(3).fill({});
  if (ch === 'laporan:harian')          return [{ total_pendapatan: 485000, total_transaksi: 5 }];
  return [];
}

const MOCK_INVOICES = [
  { id:1, no_invoice:'INV-20240422-001', nama_pelanggan:'Budi Santoso', jenis_motor:'Honda Beat', total:200000, status:'Lunas' },
  { id:2, no_invoice:'INV-20240422-002', nama_pelanggan:'Siti Rahayu', jenis_motor:'Yamaha NMAX', total:350000, status:'Lunas' },
  { id:3, no_invoice:'INV-20240421-005', nama_pelanggan:'Dedi Kurniawan', jenis_motor:'Honda Vario', total:185000, status:'Proses' },
  { id:4, no_invoice:'INV-20240421-004', nama_pelanggan:'Rina Marlina', jenis_motor:'Suzuki GSX', total:420000, status:'Lunas' },
  { id:5, no_invoice:'INV-20240420-008', nama_pelanggan:'Ahmad Fauzi', jenis_motor:'Honda PCX', total:750000, status:'Belum Bayar' },
];

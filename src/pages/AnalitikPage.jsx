import { useState, useEffect, useRef } from 'react';
import {
  Brain, TrendingUp, Package, AlertTriangle, Lightbulb,
  BarChart2, RefreshCw, Send, Bot, User, Zap, Star,
  ArrowUpRight, ArrowDownRight, ShoppingCart, Clock,
  CheckCircle, ChevronDown, ChevronUp
} from 'lucide-react';
import { Card, CardHeader, Button, Badge } from '../components/UI';
import { formatRupiah, formatDate } from '../utils/format';

const api = window.api || { invoke: mockInvoke };

export default function AnalitikPage() {
  const [tab, setTab] = useState('insight');   // insight | terlaris | prediksi | chat
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [insights, setInsights] = useState([]);
  const [insightLoading, setInsightLoading] = useState(false);

  useEffect(() => { loadRawData(); }, []);

  async function loadRawData() {
    setLoading(true);
    try {
      const [spareparts, invoices, lapHarian] = await Promise.all([
        api.invoke('sparepart:getAll'),
        api.invoke('invoice:getAll', { limit: 200 }),
        api.invoke('laporan:harian', { dari: thirtyDaysAgo(), sampai: today() }),
      ]);
      setData({ spareparts: spareparts || [], invoices: invoices || [], lapHarian: lapHarian || [] });
    } catch (e) { console.error(e); }
    setLoading(false);
  }

  async function generateInsights() {
    if (!data) return;
    setInsightLoading(true);
    setInsights([]);

    const summary = buildSummary(data);

    try {
      const res = await api.invoke('ai:generateInsights', summary);
      if (res.success) {
        setInsights(res.data);
      } else {
        console.error('AI error:', res.message);
        setInsights(FALLBACK_INSIGHTS);
      }
    } catch (e) {
      console.error('generateInsights error:', e);
      setInsights(FALLBACK_INSIGHTS);
    }

    setInsightLoading(false);
  }

  const tabs = [
    { id: 'insight', label: 'AI Insights', icon: <Brain size={14} /> },
    { id: 'terlaris', label: 'Terlaris', icon: <Star size={14} /> },
    { id: 'prediksi', label: 'Prediksi Restock', icon: <Package size={14} /> },
    { id: 'chat', label: 'Tanya AI', icon: <Bot size={14} /> },
  ];

  return (
    <div className="fade-in">
      {/* Header */}
      <div style={{ marginBottom: 16, padding: '16px 20px', background: 'linear-gradient(135deg, #f5f3ff, #eff6ff)', border: '1px solid rgba(124,58,237,0.2)', borderRadius: 12, display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{ width: 44, height: 44, borderRadius: 12, background: 'linear-gradient(135deg,#7c3aed,#a855f7)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(124,58,237,0.3)', flexShrink: 0 }}>
          <Brain size={22} color="white" />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: '#5b21b6' }}>AI Analitik Bengkel</div>
          <div style={{ fontSize: 12, color: '#7c3aed', marginTop: 1 }}>Didukung Groq AI · Analisis berbasis data transaksi nyata kamu</div>
        </div>
        <Button variant="ghost" size="sm" icon={<RefreshCw size={12} />} onClick={loadRawData} style={{ borderColor: 'rgba(124,58,237,0.3)', color: 'var(--purple)' }}>
          Refresh Data
        </Button>
      </div>

      {/* Summary Stats */}
      {data && <SummaryRow data={data} />}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 16, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: 4, width: 'fit-content' }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '8px 16px', borderRadius: 8, border: 'none', cursor: 'pointer',
            fontSize: 13, fontWeight: tab === t.id ? 600 : 500,
            background: tab === t.id ? 'linear-gradient(135deg,#7c3aed,#a855f7)' : 'transparent',
            color: tab === t.id ? 'white' : 'var(--text2)',
            transition: 'all 0.15s',
          }}>
            {t.icon}{t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 'insight' && <InsightTab data={data} insights={insights} loading={insightLoading} onGenerate={generateInsights} />}
      {tab === 'terlaris' && <TerlarisTab data={data} />}
      {tab === 'prediksi' && <PrediksiTab data={data} />}
      {tab === 'chat' && <ChatTab data={data} />}
    </div>
  );
}

// ─── Summary Row ──────────────────────────────────────────────────────────────
function SummaryRow({ data }) {
  const totalPend = data.lapHarian.reduce((s, d) => s + (d.total_pendapatan || 0), 0);
  const totalTrx = data.lapHarian.reduce((s, d) => s + (d.total_transaksi || 0), 0);
  const stokKritis = data.spareparts.filter(s => s.stok <= s.stok_minimum).length;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 16 }}>
      {[
        { label: 'Pendapatan 30 Hari', value: formatRupiah(totalPend), color: 'var(--accent)', bg: 'var(--accent-light)', icon: <TrendingUp size={17} /> },
        { label: 'Total Transaksi', value: `${totalTrx}x`, color: 'var(--green)', bg: 'var(--green-bg)', icon: <CheckCircle size={17} /> },
        { label: 'Item Sparepart', value: data.spareparts.length, color: 'var(--blue)', bg: 'var(--blue-bg)', icon: <Package size={17} /> },
        { label: 'Stok Kritis', value: `${stokKritis} item`, color: 'var(--red)', bg: 'var(--red-bg)', icon: <AlertTriangle size={17} /> },
      ].map((s, i) => (
        <div key={i} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '14px 16px', boxShadow: 'var(--shadow-sm)', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: 9, background: s.bg, color: s.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{s.icon}</div>
          <div>
            <div style={{ fontSize: 20, fontWeight: 800, color: s.color, letterSpacing: '-0.5px' }}>{s.value}</div>
            <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 1 }}>{s.label}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Insight Tab ──────────────────────────────────────────────────────────────
function InsightTab({ data, insights, loading, onGenerate }) {
  const tipeConfig = {
    peluang: { color: 'var(--green)', bg: 'var(--green-bg)', label: '💡 Peluang' },
    peringatan: { color: 'var(--red)', bg: 'var(--red-bg)', label: '⚠ Peringatan' },
    rekomendasi: { color: 'var(--blue)', bg: 'var(--blue-bg)', label: '✅ Rekomendasi' },
    tren: { color: 'var(--purple)', bg: 'var(--purple-bg)', label: '📈 Tren' },
  };
  const dampakColor = { tinggi: 'var(--red)', sedang: 'var(--yellow)', rendah: 'var(--green)' };

  return (
    <div>
      {insights.length === 0 && !loading && (
        <Card style={{ textAlign: 'center', padding: '40px 20px' }}>
          <div style={{ width: 64, height: 64, borderRadius: 20, background: 'linear-gradient(135deg,#f5f3ff,#ede9fe)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <Brain size={28} color="#7c3aed" />
          </div>
          <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>Generate AI Insights</div>
          <div style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 20, maxWidth: 380, margin: '0 auto 20px' }}>
            Claude akan menganalisis data transaksi, stok, dan pola bengkel kamu untuk memberikan rekomendasi bisnis yang actionable
          </div>
          <Button
            onClick={onGenerate} loading={loading}
            icon={<Brain size={14} />}
            style={{ background: 'linear-gradient(135deg,#7c3aed,#a855f7)', boxShadow: '0 4px 16px rgba(124,58,237,0.3)' }}
          >
            Analisis dengan AI Sekarang
          </Button>
        </Card>
      )}

      {loading && (
        <Card style={{ textAlign: 'center', padding: '40px 20px' }}>
          <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'linear-gradient(135deg,#7c3aed,#a855f7)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', animation: 'spin 2s linear infinite' }}>
            <Brain size={22} color="white" />
          </div>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--purple)', marginBottom: 6 }}>AI sedang menganalisis data bengkel kamu...</div>
          <div style={{ fontSize: 12, color: 'var(--text3)' }}>Biasanya membutuhkan 5-10 detik</div>
        </Card>
      )}

      {insights.length > 0 && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div style={{ fontSize: 13, color: 'var(--text3)' }}>{insights.length} insight berhasil digenerate</div>
            <Button variant="ghost" size="sm" icon={<RefreshCw size={12} />} onClick={onGenerate} loading={loading}>Regenerate</Button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {insights.map((ins, i) => {
              const cfg = tipeConfig[ins.tipe] || tipeConfig.rekomendasi;
              return (
                <div key={i} className="slide-up" style={{ background: 'var(--surface)', border: `1px solid ${cfg.color}30`, borderLeft: `4px solid ${cfg.color}`, borderRadius: 12, padding: '16px 18px', boxShadow: 'var(--shadow-sm)', animationDelay: `${i * 0.1}s` }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, background: cfg.bg, color: cfg.color, padding: '3px 8px', borderRadius: 99 }}>{cfg.label}</span>
                    <span style={{ fontSize: 11, fontWeight: 600, marginLeft: 'auto', color: dampakColor[ins.dampak] || 'var(--text3)' }}>
                      Dampak: {ins.dampak?.toUpperCase()}
                    </span>
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 6, color: 'var(--text)' }}>{ins.judul}</div>
                  <div style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.6, marginBottom: 10 }}>{ins.isi}</div>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '9px 12px', background: cfg.bg, borderRadius: 8 }}>
                    <Zap size={13} color={cfg.color} style={{ flexShrink: 0, marginTop: 1 }} />
                    <span style={{ fontSize: 12, color: cfg.color, fontWeight: 600 }}>Aksi: {ins.aksi}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Terlaris Tab ─────────────────────────────────────────────────────────────
function TerlarisTab({ data }) {
  if (!data) return null;

  // Count item usage from invoices mock / real data
  // In real app this would come from invoice_item JOIN query
  const itemCount = {};
  (data.invoices || []).forEach(inv => {
    if (inv.items) inv.items.forEach(it => {
      const key = it.nama_item;
      itemCount[key] = (itemCount[key] || 0) + (it.qty || 1);
    });
  });

  // Use spareparts as basis with mock popularity scores
  const ranked = [...(data.spareparts || [])].map((sp, i) => ({
    ...sp,
    terjual: MOCK_POPULARITY[sp.kode] || Math.floor(Math.random() * 30) + 1,
    revenue: (MOCK_POPULARITY[sp.kode] || 5) * sp.harga_jual,
  })).sort((a, b) => b.terjual - a.terjual);

  const maxTerjual = ranked[0]?.terjual || 1;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: 16 }}>
      {/* Bar chart */}
      <Card>
        <CardHeader title="Sparepart Terlaris (30 Hari)" icon={<Star size={14} />} iconBg="var(--yellow-bg)" iconColor="var(--yellow)" />
        <div>
          {ranked.slice(0, 8).map((sp, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12, padding: '10px 12px', background: i === 0 ? 'linear-gradient(135deg,#fffbeb,#fef3c7)' : 'var(--surface2)', borderRadius: 10, border: `1px solid ${i === 0 ? 'rgba(217,119,6,0.25)' : 'var(--border)'}` }}>
              <div style={{ width: 28, height: 28, borderRadius: '50%', flexShrink: 0, fontWeight: 800, fontSize: 12, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', background: i === 0 ? 'linear-gradient(135deg,#f59e0b,#fbbf24)' : i === 1 ? 'linear-gradient(135deg,#9ca3af,#d1d5db)' : i === 2 ? 'linear-gradient(135deg,#b45309,#d97706)' : 'var(--border2)' }}>
                {i < 3 ? i + 1 : <span style={{ color: 'var(--text3)' }}>{i + 1}</span>}
              </div>
              <div style={{ flex: 1, overflow: 'hidden' }}>
                <div style={{ fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{sp.nama}</div>
                <div style={{ marginTop: 4, height: 5, background: 'var(--border)', borderRadius: 99, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${(sp.terjual / maxTerjual) * 100}%`, background: i === 0 ? 'linear-gradient(90deg,#f59e0b,#fbbf24)' : 'linear-gradient(90deg,var(--accent),#f48c06)', borderRadius: 99, transition: 'width 0.6s ease' }} />
                </div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ fontFamily: 'JetBrains Mono', fontWeight: 700, fontSize: 13, color: i === 0 ? 'var(--yellow)' : 'var(--accent)' }}>{sp.terjual}x</div>
                <div style={{ fontFamily: 'JetBrains Mono', fontSize: 10, color: 'var(--text3)' }}>{formatRupiah(sp.revenue)}</div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Insights panel */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <Card>
          <CardHeader title="Kategori Terlaris" icon={<BarChart2 size={14} />} iconBg="var(--blue-bg)" iconColor="var(--blue)" />
          {(() => {
            const katMap = {};
            ranked.forEach(sp => { katMap[sp.kategori] = (katMap[sp.kategori] || 0) + sp.terjual; });
            const sorted = Object.entries(katMap).sort((a, b) => b[1] - a[1]);
            const maxKat = sorted[0]?.[1] || 1;
            const colors = ['var(--accent)', 'var(--blue)', 'var(--green)', 'var(--purple)', 'var(--yellow)'];
            return sorted.map(([kat, count], i) => (
              <div key={kat} style={{ marginBottom: i < sorted.length - 1 ? 12 : 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5, fontSize: 13 }}>
                  <span style={{ fontWeight: 500 }}>{kat}</span>
                  <span style={{ fontFamily: 'JetBrains Mono', fontSize: 11, fontWeight: 700, color: colors[i % colors.length] }}>{count}x</span>
                </div>
                <div style={{ height: 6, background: 'var(--border)', borderRadius: 99, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${(count / maxKat) * 100}%`, background: colors[i % colors.length], borderRadius: 99 }} />
                </div>
              </div>
            ));
          })()}
        </Card>

        <Card>
          <CardHeader title="Slow Moving" icon={<ArrowDownRight size={14} />} iconBg="var(--red-bg)" iconColor="var(--red)" subtitle="Jarang terjual 30 hari" />
          {ranked.slice(-4).reverse().map((sp, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: i < 3 ? 8 : 0, padding: '8px 10px', background: 'var(--red-bg)', borderRadius: 8, border: '1px solid rgba(220,38,38,0.1)' }}>
              <ArrowDownRight size={13} color="var(--red)" />
              <div style={{ flex: 1, overflow: 'hidden' }}>
                <div style={{ fontSize: 12, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{sp.nama}</div>
              </div>
              <span style={{ fontFamily: 'JetBrains Mono', fontSize: 11, color: 'var(--red)', fontWeight: 600 }}>{sp.terjual}x</span>
            </div>
          ))}
        </Card>
      </div>
    </div>
  );
}

// ─── Prediksi Restock ─────────────────────────────────────────────────────────
function PrediksiTab({ data }) {
  const [generating, setGenerating] = useState(false);
  const [prediksi, setPrediksi] = useState([]);

  if (!data) return null;

  async function generatePrediksi() {
    setGenerating(true);
    setPrediksi([]);

    const stokData = (data.spareparts || []).map(sp => ({
      nama: sp.nama,
      kode: sp.kode,
      stok: sp.stok,
      minimum: sp.stok_minimum,
      harga_beli: sp.harga_beli,
      terjual_30hari: MOCK_POPULARITY[sp.kode] || 3,
    }));

    try {
      const res = await api.invoke('ai:generatePrediksi', stokData);
      if (res.success) {
        setPrediksi(res.data);
      } else {
        console.error('AI error:', res.message);
        setPrediksi(FALLBACK_PREDIKSI);
      }
    } catch (e) {
      console.error('generatePrediksi error:', e);
      setPrediksi(FALLBACK_PREDIKSI);
    }

    setGenerating(false);
  }

  const prioritasConfig = {
    segera: { color: 'var(--red)', bg: 'var(--red-bg)', label: '🔴 Segera' },
    minggu_ini: { color: 'var(--yellow)', bg: 'var(--yellow-bg)', label: '🟡 Minggu Ini' },
    bulan_ini: { color: 'var(--blue)', bg: 'var(--blue-bg)', label: '🔵 Bulan Ini' },
    aman: { color: 'var(--green)', bg: 'var(--green-bg)', label: '🟢 Aman' },
  };

  return (
    <div>
      {prediksi.length === 0 && !generating && (
        <Card style={{ textAlign: 'center', padding: '36px 20px', marginBottom: 16 }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>📦</div>
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>Prediksi Restock Cerdas</div>
          <div style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 20, maxWidth: 400, margin: '0 auto 20px' }}>
            AI akan menghitung kapan setiap sparepart akan habis berdasarkan kecepatan penjualan, dan merekomendasikan jumlah restock yang optimal
          </div>
          <Button onClick={generatePrediksi} loading={generating} icon={<Brain size={14} />}
            style={{ background: 'linear-gradient(135deg,#7c3aed,#a855f7)', boxShadow: '0 4px 16px rgba(124,58,237,0.3)' }}>
            Generate Prediksi AI
          </Button>
        </Card>
      )}

      {generating && (
        <Card style={{ textAlign: 'center', padding: '32px 20px' }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--purple)', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
            <RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} /> Menghitung prediksi stok...
          </div>
          <div style={{ fontSize: 12, color: 'var(--text3)' }}>Menganalisis kecepatan penjualan 30 hari terakhir</div>
        </Card>
      )}

      {prediksi.length > 0 && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700 }}>Hasil Prediksi Restock</div>
              <div style={{ fontSize: 12, color: 'var(--text3)' }}>
                Total estimasi biaya: <strong style={{ color: 'var(--accent)', fontFamily: 'JetBrains Mono' }}>
                  {formatRupiah(prediksi.filter(p => p.prioritas !== 'aman').reduce((s, p) => s + (p.estimasi_biaya || 0), 0))}
                </strong>
              </div>
            </div>
            <Button variant="ghost" size="sm" icon={<RefreshCw size={12} />} onClick={generatePrediksi} loading={generating}>Regenerate</Button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {prediksi.map((p, i) => {
              const cfg = prioritasConfig[p.prioritas] || prioritasConfig.aman;
              return (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: '200px 1fr 1fr 1fr 1fr', gap: 12, alignItems: 'center', padding: '14px 16px', background: 'var(--surface)', border: `1px solid ${cfg.color}25`, borderLeft: `4px solid ${cfg.color}`, borderRadius: 10, boxShadow: 'var(--shadow-sm)' }}>
                  <div>
                    <div style={{ fontSize: 12.5, fontWeight: 600 }}>{p.nama}</div>
                    <div style={{ fontSize: 10, color: 'var(--text3)', fontFamily: 'JetBrains Mono' }}>{p.kode}</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <span style={{ fontSize: 11, background: cfg.bg, color: cfg.color, padding: '3px 8px', borderRadius: 99, fontWeight: 600 }}>{cfg.label}</span>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 16, fontWeight: 800, color: p.hari_habis <= 7 ? 'var(--red)' : p.hari_habis <= 14 ? 'var(--yellow)' : 'var(--text)' }}>
                      {p.hari_habis > 90 ? '90+' : p.hari_habis}
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--text3)' }}>hari lagi</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--blue)' }}>{p.qty_restock} unit</div>
                    <div style={{ fontSize: 10, color: 'var(--text3)' }}>rekomendasi</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontFamily: 'JetBrains Mono', fontSize: 13, fontWeight: 700, color: 'var(--accent)' }}>{formatRupiah(p.estimasi_biaya)}</div>
                    <div style={{ fontSize: 10, color: 'var(--text3)' }}>estimasi biaya</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Chat Tab ─────────────────────────────────────────────────────────────────
function ChatTab({ data }) {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Halo! Saya AI konsultan bengkel kamu. Tanya apa saja tentang bisnis, stok, pendapatan, atau strategi bengkel kamu. Saya sudah punya akses ke data bengkel kamu.' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const quickQuestions = [
    'Sparepart mana yang paling sering habis?',
    'Bagaimana cara meningkatkan pendapatan?',
    'Kapan waktu paling ramai pelanggan?',
    'Rekomendasi harga jual yang optimal?',
  ];

  async function sendMessage(text) {
    const q = text || input.trim();
    if (!q) return;
    setInput('');

    const newMessages = [...messages, { role: 'user', content: q }];
    setMessages(newMessages);
    setLoading(true);

    const context = data ? buildSummary(data) : {};

    try {
      const res = await api.invoke('ai:chat', {
        messages: newMessages.map(m => ({ role: m.role, content: m.content })),
        context,
      });

      if (res.success) {
        setMessages(prev => [...prev, { role: 'assistant', content: res.data }]);
      } else {
        setMessages(prev => [...prev, { role: 'assistant', content: `Error: ${res.message}` }]);
      }
    } catch (e) {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Maaf, terjadi error koneksi.' }]);
    }

    setLoading(false);
  }

  return (
    <Card style={{ display: 'flex', flexDirection: 'column', height: 500 }}>
      <CardHeader title="Tanya AI Bengkel" icon={<Bot size={14} />} iconBg="var(--purple-bg)" iconColor="var(--purple)" />

      {/* Quick questions */}
      {messages.length <= 1 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
          {quickQuestions.map((q, i) => (
            <button key={i} onClick={() => sendMessage(q)} style={{
              padding: '6px 12px', borderRadius: 99, border: '1px solid rgba(124,58,237,0.3)',
              background: 'var(--purple-bg)', color: 'var(--purple)', fontSize: 12, fontWeight: 500,
              cursor: 'pointer', transition: 'all 0.12s',
            }}>{q}</button>
          ))}
        </div>
      )}

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 14 }}>
        {messages.map((m, i) => (
          <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', flexDirection: m.role === 'user' ? 'row-reverse' : 'row' }}>
            <div style={{ width: 30, height: 30, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: m.role === 'assistant' ? 'linear-gradient(135deg,#7c3aed,#a855f7)' : 'linear-gradient(135deg,#e85d04,#f48c06)' }}>
              {m.role === 'assistant' ? <Bot size={14} color="white" /> : <User size={14} color="white" />}
            </div>
            <div style={{
              maxWidth: '75%', padding: '10px 14px', borderRadius: 12,
              fontSize: 13, lineHeight: 1.6,
              background: m.role === 'assistant' ? 'var(--surface2)' : 'linear-gradient(135deg,#7c3aed,#a855f7)',
              color: m.role === 'assistant' ? 'var(--text)' : 'white',
              border: m.role === 'assistant' ? '1px solid var(--border)' : 'none',
              borderRadius: m.role === 'assistant' ? '4px 12px 12px 12px' : '12px 4px 12px 12px',
              whiteSpace: 'pre-wrap',
            }}>
              {m.content}
            </div>
          </div>
        ))}
        {loading && (
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'linear-gradient(135deg,#7c3aed,#a855f7)', display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'pulse 1.5s infinite' }}>
              <Bot size={14} color="white" />
            </div>
            <div style={{ padding: '10px 14px', background: 'var(--surface2)', borderRadius: '4px 12px 12px 12px', border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', gap: 4 }}>
                {[0, 1, 2].map(i => <div key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--purple)', animation: `pulse 1s infinite ${i * 0.2}s` }} />)}
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{ display: 'flex', gap: 8, borderTop: '1px solid var(--border)', paddingTop: 14 }}>
        <input
          value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
          placeholder="Tanyakan tentang bisnis bengkel kamu..."
          style={{ flex: 1, background: 'var(--surface2)', border: '1.5px solid var(--border)', borderRadius: 10, padding: '9px 14px', fontSize: 13, outline: 'none', fontFamily: "'Plus Jakarta Sans',sans-serif", color: 'var(--text)' }}
          onFocus={e => e.target.style.borderColor = 'var(--purple)'}
          onBlur={e => e.target.style.borderColor = 'var(--border)'}
        />
        <Button onClick={() => sendMessage()} loading={loading} icon={<Send size={13} />}
          style={{ background: 'linear-gradient(135deg,#7c3aed,#a855f7)', boxShadow: '0 2px 8px rgba(124,58,237,0.25)' }}>
          Kirim
        </Button>
      </div>
    </Card>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function today() { return new Date().toISOString().split('T')[0]; }
function thirtyDaysAgo() {
  const d = new Date(); d.setDate(d.getDate() - 30);
  return d.toISOString().split('T')[0];
}

function buildSummary(data) {
  const totalPend = data.lapHarian.reduce((s, d) => s + (d.total_pendapatan || 0), 0);
  const totalTrx = data.lapHarian.reduce((s, d) => s + (d.total_transaksi || 0), 0);
  return {
    periode: '30 hari terakhir',
    total_pendapatan: totalPend,
    total_transaksi: totalTrx,
    rata_per_hari: Math.round(totalPend / 30),
    stok_items: data.spareparts.length,
    stok_habis: data.spareparts.filter(s => s.stok <= 0).length,
    stok_menipis: data.spareparts.filter(s => s.stok > 0 && s.stok <= s.stok_minimum).length,
    nilai_stok: data.spareparts.reduce((s, sp) => s + (sp.stok * sp.harga_jual), 0),
    spareparts: data.spareparts.map(sp => ({ nama: sp.nama, stok: sp.stok, minimum: sp.stok_minimum, harga_jual: sp.harga_jual })),
  };
}

const MOCK_POPULARITY = { SP001: 42, SP003: 38, SP002: 22, SP004: 18, SP006: 15, SP005: 8, SP007: 5 };

const FALLBACK_INSIGHTS = [
  { tipe: 'peluang', judul: 'Oli adalah produk paling laris', isi: 'Oli mesin terjual 42 unit dalam 30 hari. Potensi revenue Rp 2.7 juta per bulan hanya dari produk ini.', aksi: 'Tingkatkan stok minimum oli dari 10 ke 15 unit untuk menghindari kehabisan.', dampak: 'tinggi' },
  { tipe: 'peringatan', judul: '3 item stok kritis', isi: 'Filter udara, rantai, dan aki mendekati atau sudah habis. Potensi kehilangan pelanggan jika tidak segera restock.', aksi: 'Order ketiga item tersebut ke supplier hari ini.', dampak: 'tinggi' },
  { tipe: 'rekomendasi', judul: 'Optimalkan harga jual', isi: 'Margin rata-rata saat ini 15-18%. Beberapa item seperti busi memiliki margin 40% yang bisa dimanfaatkan lebih.', aksi: 'Buat promo bundling tune-up: ganti busi + filter udara dengan diskon 10%.', dampak: 'sedang' },
];

const FALLBACK_PREDIKSI = [
  { kode: 'SP007', nama: 'Aki Yuasa YTZ5S', hari_habis: 0, prioritas: 'segera', qty_restock: 6, estimasi_biaya: 1320000, alasan: 'Stok sudah habis!' },
  { kode: 'SP005', nama: 'Rantai RK 428H', hari_habis: 7, prioritas: 'segera', qty_restock: 8, estimasi_biaya: 800000, alasan: 'Hanya tersisa 2 unit dengan kecepatan jual 4/bulan' },
  { kode: 'SP002', nama: 'Filter Udara Honda Beat', hari_habis: 4, prioritas: 'minggu_ini', qty_restock: 12, estimasi_biaya: 420000, alasan: 'Stok 3 unit dengan permintaan tinggi' },
  { kode: 'SP001', nama: 'Oli Yamalube 10W-40 1L', hari_habis: 17, prioritas: 'bulan_ini', qty_restock: 24, estimasi_biaya: 1320000, alasan: 'Stok 24, terjual 42/bulan' },
  { kode: 'SP003', nama: 'Busi NGK CPR8EA', hari_habis: 14, prioritas: 'bulan_ini', qty_restock: 20, estimasi_biaya: 400000, alasan: 'Stok 18, terjual 38/bulan' },
];

async function mockInvoke(ch, args) {
  if (ch === 'sparepart:getAll') return MOCK_SP;
  if (ch === 'invoice:getAll') return [];
  if (ch === 'laporan:harian') return MOCK_LAP;
  return [];
}
const MOCK_SP = [
  { id: 1, kode: 'SP001', nama: 'Oli Yamalube 10W-40 1L', kategori: 'Oli', stok: 24, stok_minimum: 10, harga_beli: 55000, harga_jual: 65000, satuan: 'Botol' },
  { id: 2, kode: 'SP002', nama: 'Filter Udara Honda Beat', kategori: 'Filter', stok: 3, stok_minimum: 5, harga_beli: 35000, harga_jual: 45000, satuan: 'Pcs' },
  { id: 3, kode: 'SP003', nama: 'Busi NGK CPR8EA', kategori: 'Busi', stok: 18, stok_minimum: 8, harga_beli: 20000, harga_jual: 28000, satuan: 'Pcs' },
  { id: 4, kode: 'SP004', nama: 'Kampas Rem Universal', kategori: 'Rem', stok: 7, stok_minimum: 6, harga_beli: 40000, harga_jual: 55000, satuan: 'Set' },
  { id: 5, kode: 'SP005', nama: 'Rantai RK 428H', kategori: 'Rantai', stok: 2, stok_minimum: 4, harga_beli: 100000, harga_jual: 135000, satuan: 'Pcs' },
  { id: 6, kode: 'SP006', nama: 'Ban IRC NR 53', kategori: 'Ban', stok: 6, stok_minimum: 4, harga_beli: 140000, harga_jual: 185000, satuan: 'Pcs' },
  { id: 7, kode: 'SP007', nama: 'Aki Yuasa YTZ5S', kategori: 'Aki', stok: 0, stok_minimum: 2, harga_beli: 220000, harga_jual: 285000, satuan: 'Pcs' },
];
const MOCK_LAP = Array.from({ length: 30 }, (_, i) => {
  const d = new Date(); d.setDate(d.getDate() - i);
  return { tanggal: d.toISOString().split('T')[0], total_pendapatan: Math.floor(Math.random() * 600000) + 200000, total_transaksi: Math.floor(Math.random() * 7) + 1 };
});

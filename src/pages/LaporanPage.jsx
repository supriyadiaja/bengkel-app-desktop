import { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { BarChart3, TrendingUp, ReceiptText, Zap, Download, Printer, Star, X, FileText } from 'lucide-react';
import { Card, CardHeader, Button, Badge, StatCard, Table } from '../components/UI';
import { formatRupiah, formatDate, MONTHS, monthRange } from '../utils/format';

const api = window.api || { invoke: mockInvoke };

export default function LaporanPage() {
  const now = new Date();
  const [year,  setYear]  = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [dailyData, setDaily]   = useState([]);
  const [monthly,   setMonthly] = useState(null);
  const [loading, setLoading]   = useState(true);
  const [showCetak, setShowCetak] = useState(false);

  useEffect(() => { loadData(); }, [year, month]);

  async function loadData() {
    setLoading(true);
    const { dari, sampai } = monthRange(year, month);
    const [harian, bulanan] = await Promise.all([
      api.invoke('laporan:harian', { dari, sampai }),
      api.invoke('laporan:bulanan', { tahun: year, bulan: month }),
    ]);
    setDaily(harian || []);
    setMonthly(bulanan || null);
    setLoading(false);
  }

  const totalPend  = dailyData.reduce((s, d) => s + (d.total_pendapatan || 0), 0);
  const totalTrx   = dailyData.reduce((s, d) => s + (d.total_transaksi  || 0), 0);
  const rataRata   = totalTrx > 0 ? totalPend / totalTrx : 0;
  const maxBar     = Math.max(...dailyData.map(d => d.total_pendapatan || 0), 1);

  // ─── Export Excel ──────────────────────────────────────────────────────────
  function exportExcel() {
    if (dailyData.length === 0) {
      alert('Belum ada data untuk diekspor!');
      return;
    }

    const wb = XLSX.utils.book_new();

    // Sheet 1: Laporan Harian
    const hariRows = [
      [`LAPORAN KEUANGAN HARIAN — ${MONTHS[month - 1].toUpperCase()} ${year}`],
      ['Dua Putra Jaya Motor'],
      [],
      ['Tanggal', 'Total Pendapatan (Rp)', 'Total Transaksi', 'Rata-rata/Transaksi (Rp)'],
      ...dailyData.map(d => [
        formatDate(d.tanggal),
        d.total_pendapatan || 0,
        d.total_transaksi || 0,
        d.total_transaksi > 0 ? Math.round((d.total_pendapatan || 0) / d.total_transaksi) : 0,
      ]),
      [],
      ['TOTAL', totalPend, totalTrx, totalTrx > 0 ? Math.round(totalPend / totalTrx) : 0],
    ];

    const wsHari = XLSX.utils.aoa_to_sheet(hariRows);
    wsHari['!cols'] = [{ wch: 18 }, { wch: 25 }, { wch: 18 }, { wch: 28 }];
    wsHari['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 3 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: 3 } },
    ];
    XLSX.utils.book_append_sheet(wb, wsHari, 'Laporan Harian');

    // Sheet 2: Ringkasan Bulanan
    const totalHariAktif = dailyData.length;
    const bulananRows = [
      [`RINGKASAN BULANAN — ${MONTHS[month - 1].toUpperCase()} ${year}`],
      ['Dua Putra Jaya Motor'],
      [],
      ['RINGKASAN', ''],
      ['Total Pendapatan', totalPend],
      ['Total Transaksi', totalTrx],
      ['Hari Aktif', totalHariAktif],
      ['Rata-rata per Transaksi', totalTrx > 0 ? Math.round(totalPend / totalTrx) : 0],
      ['Rata-rata per Hari', totalHariAktif > 0 ? Math.round(totalPend / totalHariAktif) : 0],
      [],
    ];

    if (monthly?.perKategori?.length > 0) {
      bulananRows.push(['PER KATEGORI', '', '']);
      bulananRows.push(['Kategori', 'Total (Rp)', 'Persentase (%)']);
      const totalKat = monthly.perKategori.reduce((s, k) => s + k.total, 0);
      monthly.perKategori.forEach(k => {
        const pct = totalKat > 0 ? ((k.total / totalKat) * 100).toFixed(1) : '0.0';
        bulananRows.push([k.kategori, k.total, `${pct}%`]);
      });
    }

    const wsBulanan = XLSX.utils.aoa_to_sheet(bulananRows);
    wsBulanan['!cols'] = [{ wch: 30 }, { wch: 25 }, { wch: 18 }];
    wsBulanan['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 2 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: 2 } },
    ];
    XLSX.utils.book_append_sheet(wb, wsBulanan, 'Ringkasan Bulanan');

    XLSX.writeFile(wb, `Laporan-${MONTHS[month - 1]}-${year}.xlsx`);
  }

  // ─── Print / PDF ───────────────────────────────────────────────────────────
  function getPrintHTML() {
    const totalKat = monthly?.perKategori?.reduce((s, k) => s + k.total, 0) || 0;
    const kategoryHTML = monthly?.perKategori?.length > 0
      ? monthly.perKategori.map(k => {
          const pct = totalKat > 0 ? ((k.total / totalKat) * 100).toFixed(1) : '0.0';
          return `<div class="kategori-row"><span>${k.kategori}</span><span>${formatRupiah(k.total)} (${pct}%)</span></div>`;
        }).join('')
      : '<div style="color:#999;font-size:11px;padding:8px 0">Belum ada data kategori</div>';

    const rowsHTML = dailyData.map(d => `
      <tr>
        <td>${formatDate(d.tanggal)}</td>
        <td style="text-align:right">${formatRupiah(d.total_pendapatan)}</td>
        <td style="text-align:center">${d.total_transaksi}x</td>
        <td style="text-align:right">${formatRupiah(d.total_transaksi > 0 ? Math.round(d.total_pendapatan / d.total_transaksi) : 0)}</td>
      </tr>
    `).join('');

    const tanggalCetak = new Date().toLocaleDateString('id-ID', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });

    return `
      <div class="header">
        <div style="font-size:20px;font-weight:800;color:#e85d04">Dua Putra Jaya Motor</div>
        <div style="font-size:13px;color:#555;margin-top:4px">Laporan Keuangan — ${MONTHS[month - 1]} ${year}</div>
      </div>

      <div class="stats">
        <div class="stat-box">
          <div class="stat-value">${formatRupiah(totalPend)}</div>
          <div class="stat-label">Total Pendapatan</div>
        </div>
        <div class="stat-box">
          <div class="stat-value">${totalTrx}x</div>
          <div class="stat-label">Total Transaksi</div>
        </div>
        <div class="stat-box">
          <div class="stat-value">${formatRupiah(rataRata)}</div>
          <div class="stat-label">Rata-rata/Transaksi</div>
        </div>
        <div class="stat-box">
          <div class="stat-value">${dailyData.length} hari</div>
          <div class="stat-label">Hari Aktif</div>
        </div>
      </div>

      <div class="section-title">Laporan Harian</div>
      <table>
        <thead>
          <tr>
            <th>Tanggal</th>
            <th style="text-align:right">Pendapatan</th>
            <th style="text-align:center">Transaksi</th>
            <th style="text-align:right">Rata-rata/Transaksi</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHTML}
          <tr class="total-row">
            <td>TOTAL</td>
            <td style="text-align:right">${formatRupiah(totalPend)}</td>
            <td style="text-align:center">${totalTrx}x</td>
            <td style="text-align:right">${formatRupiah(totalTrx > 0 ? Math.round(totalPend / totalTrx) : 0)}</td>
          </tr>
        </tbody>
      </table>

      <div class="section-title" style="margin-top:16px">Per Kategori</div>
      ${kategoryHTML}

      <div class="footer">
        Dicetak pada ${tanggalCetak} &nbsp;·&nbsp; Dua Putra Jaya Motor
      </div>
    `;
  }

  const PRINT_STYLE = `
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, sans-serif; font-size: 12px; color: #1a1a1a; padding: 24px; }
    .header { text-align: center; border-bottom: 2px solid #e85d04; padding-bottom: 12px; margin-bottom: 20px; }
    .stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 20px; }
    .stat-box { border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px; text-align: center; }
    .stat-value { font-size: 15px; font-weight: 800; color: #e85d04; }
    .stat-label { font-size: 10px; color: #888; margin-top: 2px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
    th { background: #e85d04; color: white; padding: 8px 10px; font-size: 11px; }
    td { padding: 7px 10px; border-bottom: 1px solid #f3f4f6; font-size: 11px; }
    tr:nth-child(even) td { background: #fafafa; }
    .total-row td { font-weight: 800; background: #fff7ed !important; color: #e85d04; border-top: 2px solid #e85d04; }
    .section-title { font-size: 13px; font-weight: 700; margin-bottom: 10px; color: #374151; border-left: 3px solid #e85d04; padding-left: 8px; }
    .kategori-row { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #f3f4f6; font-size: 11px; }
    .footer { text-align: center; margin-top: 24px; font-size: 10px; color: #999; border-top: 1px solid #e5e7eb; padding-top: 12px; }
  `;

  function handlePrint() {
    if (dailyData.length === 0) { alert('Belum ada data!'); return; }
    const win = window.open('', '_blank');
    win.document.write(`<!DOCTYPE html><html><head><title>Laporan ${MONTHS[month-1]} ${year}</title><style>${PRINT_STYLE}</style></head><body>${getPrintHTML()}</body></html>`);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); win.close(); }, 500);
    setShowCetak(false);
  }

  function handleExportPDF() {
    if (dailyData.length === 0) { alert('Belum ada data!'); return; }
    const win = window.open('', '_blank');
    win.document.write(`<!DOCTYPE html><html><head><title>Laporan ${MONTHS[month-1]} ${year}</title><style>${PRINT_STYLE}</style><script>window.onload=function(){window.print()}<\/script></head><body>${getPrintHTML()}</body></html>`);
    win.document.close();
    setShowCetak(false);
  }

  // ─── Table columns ─────────────────────────────────────────────────────────
  const hariColumns = [
    { key:'tanggal', title:'Tanggal', render:v=><span style={{fontFamily:'JetBrains Mono',fontSize:12}}>{formatDate(v)}</span> },
    { key:'total_pendapatan', title:'Pendapatan', align:'right', render:v=><span style={{fontFamily:'JetBrains Mono',fontWeight:700,color:'var(--accent)'}}>{formatRupiah(v)}</span> },
    { key:'total_transaksi',  title:'Transaksi', align:'center', render:v=><Badge variant="blue">{v}x</Badge> },
    { key:'total_pendapatan', title:'Rata-rata', align:'right', render:(v,row)=><span style={{fontFamily:'JetBrains Mono',fontSize:12,color:'var(--text2)'}}>{formatRupiah(row.total_transaksi>0?v/row.total_transaksi:0)}</span> },
  ];

  const years = Array.from({length:5},(_,i)=>now.getFullYear()-i);

  return (
    <div className="fade-in">

      {/* ── Filter Bar ── */}
      <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:16,padding:'12px 16px',background:'var(--surface)',border:'1px solid var(--border)',borderRadius:12,boxShadow:'var(--shadow-sm)'}}>
        <span style={{fontSize:13,fontWeight:600,color:'var(--text2)'}}>Periode:</span>
        <select value={month} onChange={e=>setMonth(Number(e.target.value))}
          style={{background:'var(--surface2)',border:'1.5px solid var(--border)',borderRadius:8,padding:'7px 11px',fontSize:13,color:'var(--text)',outline:'none',cursor:'pointer'}}>
          {MONTHS.map((m,i)=><option key={i} value={i+1}>{m}</option>)}
        </select>
        <select value={year} onChange={e=>setYear(Number(e.target.value))}
          style={{background:'var(--surface2)',border:'1.5px solid var(--border)',borderRadius:8,padding:'7px 11px',fontSize:13,color:'var(--text)',outline:'none',cursor:'pointer'}}>
          {years.map(y=><option key={y} value={y}>{y}</option>)}
        </select>
        <Button variant="ghost" size="sm" onClick={loadData}>Refresh</Button>
        <div style={{marginLeft:'auto',display:'flex',gap:8}}>
          <Button variant="ghost" size="sm" icon={<Download size={12}/>} onClick={exportExcel}>Export Excel</Button>
          <Button variant="ghost" size="sm" icon={<Printer size={12}/>} onClick={() => setShowCetak(true)}>Cetak</Button>
        </div>
      </div>

      {/* ── Stats ── */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:14,marginBottom:16}}>
        <StatCard label={`Pendapatan ${MONTHS[month-1]}`} value={formatRupiah(totalPend)} icon={<TrendingUp size={18}/>} color="var(--accent)" bg="var(--accent-light)" trend="Bulan ini" trendUp />
        <StatCard label="Total Transaksi"    value={String(totalTrx)} icon={<ReceiptText size={18}/>} color="var(--green)" bg="var(--green-bg)" trend={`${totalTrx} servis`} trendUp />
        <StatCard label="Rata-rata/Transaksi" value={formatRupiah(rataRata)} icon={<BarChart3 size={18}/>} color="var(--blue)" bg="var(--blue-bg)" trend="Per servis" trendUp />
        <StatCard label="Hari Aktif" value={`${dailyData.length} hari`} icon={<Zap size={18}/>} color="var(--yellow)" bg="var(--yellow-bg)" trend={`dari ${new Date(year,month,0).getDate()} hari`} trendUp />
      </div>

      {/* ── Chart + Categories ── */}
      <div style={{display:'grid',gridTemplateColumns:'2fr 1fr',gap:14,marginBottom:14}}>
        <Card>
          <CardHeader title={`Grafik Pendapatan — ${MONTHS[month-1]} ${year}`} icon={<BarChart3 size={14}/>} iconBg="var(--accent-light)" iconColor="var(--accent)" />
          {loading ? (
            <div style={{height:120,display:'flex',alignItems:'center',justifyContent:'center',color:'var(--text3)',fontSize:13}}>Memuat...</div>
          ) : dailyData.length === 0 ? (
            <div style={{height:120,display:'flex',alignItems:'center',justifyContent:'center',color:'var(--text3)',fontSize:13}}>Belum ada data untuk periode ini</div>
          ) : (
            <>
              <div style={{display:'flex',alignItems:'flex-end',gap:4,height:110,marginTop:8}}>
                {dailyData.map((d,i)=>(
                  <div key={i} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:4,height:'100%'}}>
                    <div style={{flex:1,display:'flex',alignItems:'flex-end',width:'100%'}}>
                      <div style={{width:'100%',borderRadius:'4px 4px 0 0',minHeight:4,
                        height:`${((d.total_pendapatan||0)/maxBar)*100}%`,
                        background:'linear-gradient(180deg,#e85d04,#f48c06)',
                        transition:'height 0.4s ease',
                      }} title={`${formatDate(d.tanggal)}: ${formatRupiah(d.total_pendapatan)}`}/>
                    </div>
                    {dailyData.length <= 15 && (
                      <div style={{fontSize:9,color:'var(--text3)',fontFamily:'JetBrains Mono'}}>
                        {new Date(d.tanggal).getDate()}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </Card>

        <div style={{display:'flex',flexDirection:'column',gap:14}}>
          <Card>
            <CardHeader title="Per Kategori" icon={<TrendingUp size={14}/>} iconBg="var(--green-bg)" iconColor="var(--green)" />
            {monthly?.perKategori?.length > 0 ? monthly.perKategori.map((k,i)=>{
              const total = monthly.perKategori.reduce((s,c)=>s+c.total,0);
              const pct = total > 0 ? Math.round((k.total/total)*100) : 0;
              const colors = ['var(--accent)','var(--blue)','var(--green)','var(--purple)'];
              return (
                <div key={i} style={{marginBottom: i<monthly.perKategori.length-1?14:0}}>
                  <div style={{display:'flex',justifyContent:'space-between',marginBottom:5,fontSize:13}}>
                    <span style={{fontWeight:500}}>{k.kategori}</span>
                    <span style={{fontFamily:'JetBrains Mono',color:colors[i%colors.length],fontWeight:700,fontSize:11}}>{formatRupiah(k.total)}</span>
                  </div>
                  <div style={{height:7,background:'var(--border)',borderRadius:99,overflow:'hidden'}}>
                    <div style={{width:`${pct}%`,height:'100%',background:colors[i%colors.length],borderRadius:99,transition:'width 0.4s'}}/>
                  </div>
                  <div style={{fontSize:10,color:'var(--text3)',marginTop:2}}>{pct}%</div>
                </div>
              );
            }) : (
              <div style={{textAlign:'center',padding:'16px 0',color:'var(--text3)',fontSize:13}}>
                {loading ? 'Memuat...' : 'Belum ada data'}
              </div>
            )}
          </Card>

          <Card>
            <CardHeader title="Top Mekanik" icon={<Star size={14}/>} iconBg="var(--purple-bg)" iconColor="var(--purple)" />
            {[
              {n:'Agus',  s:52, p:5100000, r:1},
              {n:'Bowo',  s:48, p:4700000, r:2},
              {n:'Candra',s:42, p:4400000, r:3},
            ].map((m,i)=>(
              <div key={i} style={{display:'flex',alignItems:'center',gap:10,marginBottom:i<2?8:0,padding:'9px 11px',background:'var(--surface2)',borderRadius:8,border:'1px solid var(--border)'}}>
                <div style={{width:26,height:26,borderRadius:'50%',flexShrink:0,fontWeight:800,fontSize:12,color:'white',display:'flex',alignItems:'center',justifyContent:'center',
                  background:i===0?'linear-gradient(135deg,#f59e0b,#fbbf24)':i===1?'linear-gradient(135deg,#9ca3af,#d1d5db)':'linear-gradient(135deg,#b45309,#d97706)'}}>
                  {m.r}
                </div>
                <div style={{flex:1}}>
                  <div style={{fontSize:13,fontWeight:600}}>{m.n}</div>
                  <div style={{fontSize:11,color:'var(--text3)'}}>{m.s} unit</div>
                </div>
                <span style={{fontFamily:'JetBrains Mono',fontSize:12,fontWeight:700,color:'var(--green)'}}>{formatRupiah(m.p)}</span>
              </div>
            ))}
          </Card>
        </div>
      </div>

      {/* ── Daily Table ── */}
      <Card>
        <CardHeader
          title={`Laporan Harian — ${MONTHS[month-1]} ${year}`}
          icon={<ReceiptText size={14}/>}
          iconBg="var(--accent-light)" iconColor="var(--accent)"
          subtitle={`${dailyData.length} hari aktif`}
        />
        <Table columns={hariColumns} data={dailyData} loading={loading} emptyText="Belum ada data transaksi untuk periode ini" />
        {dailyData.length > 0 && (
          <div style={{borderTop:'1px solid var(--border)',marginTop:12,paddingTop:12,display:'flex',justifyContent:'flex-end',gap:32}}>
            {[
              ['Total Pendapatan', formatRupiah(totalPend), 'var(--accent)'],
              ['Total Transaksi', `${totalTrx}x`, 'var(--blue)'],
              ['Rata-rata/Hari', formatRupiah(dailyData.length>0?totalPend/dailyData.length:0), 'var(--green)'],
            ].map(([k,v,c])=>(
              <div key={k} style={{textAlign:'right'}}>
                <div style={{fontSize:11,color:'var(--text3)',marginBottom:2}}>{k}</div>
                <div style={{fontFamily:'JetBrains Mono',fontWeight:800,color:c,fontSize:15}}>{v}</div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* ── Modal Cetak ── */}
      {showCetak && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000}}>
          <div style={{background:'var(--surface)',borderRadius:16,padding:28,width:420,boxShadow:'0 20px 60px rgba(0,0,0,0.3)'}}>

            {/* Header modal */}
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:20}}>
              <div>
                <div style={{fontSize:16,fontWeight:700}}>Cetak Laporan</div>
                <div style={{fontSize:12,color:'var(--text3)',marginTop:2}}>{MONTHS[month-1]} {year}</div>
              </div>
              <button onClick={()=>setShowCetak(false)} style={{background:'none',border:'none',cursor:'pointer',color:'var(--text3)',display:'flex',alignItems:'center',justifyContent:'center',width:32,height:32,borderRadius:8}}>
                <X size={18}/>
              </button>
            </div>

            {dailyData.length === 0 ? (
              <div style={{textAlign:'center',padding:'24px 0',color:'var(--text3)',fontSize:13}}>
                <div style={{fontSize:32,marginBottom:8}}>📭</div>
                Belum ada data untuk periode {MONTHS[month-1]} {year}
              </div>
            ) : (
              <div style={{display:'flex',flexDirection:'column',gap:12}}>

                {/* Opsi PDF */}
                <button onClick={handleExportPDF} style={{
                  display:'flex',alignItems:'center',gap:14,padding:'16px 18px',
                  border:'1.5px solid rgba(220,38,38,0.25)',borderRadius:12,cursor:'pointer',
                  background:'#fef2f2',transition:'all 0.15s',textAlign:'left',width:'100%',
                }}>
                  <div style={{width:44,height:44,borderRadius:12,background:'#dc2626',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,boxShadow:'0 4px 12px rgba(220,38,38,0.3)'}}>
                    <FileText size={22} color="white"/>
                  </div>
                  <div>
                    <div style={{fontSize:14,fontWeight:700,color:'#dc2626'}}>Export PDF</div>
                    <div style={{fontSize:12,color:'#888',marginTop:2}}>Simpan sebagai file PDF ke komputer</div>
                  </div>
                </button>

                {/* Opsi Print */}
                <button onClick={handlePrint} style={{
                  display:'flex',alignItems:'center',gap:14,padding:'16px 18px',
                  border:'1.5px solid rgba(232,93,4,0.25)',borderRadius:12,cursor:'pointer',
                  background:'var(--accent-light)',transition:'all 0.15s',textAlign:'left',width:'100%',
                }}>
                  <div style={{width:44,height:44,borderRadius:12,background:'#e85d04',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,boxShadow:'0 4px 12px rgba(232,93,4,0.3)'}}>
                    <Printer size={22} color="white"/>
                  </div>
                  <div>
                    <div style={{fontSize:14,fontWeight:700,color:'#e85d04'}}>Print Langsung</div>
                    <div style={{fontSize:12,color:'#888',marginTop:2}}>Kirim ke printer yang terhubung</div>
                  </div>
                </button>

              </div>
            )}

            <button onClick={()=>setShowCetak(false)} style={{
              width:'100%',marginTop:16,padding:'10px',
              background:'var(--surface2)',border:'1px solid var(--border)',
              borderRadius:8,cursor:'pointer',fontSize:13,color:'var(--text2)',
            }}>
              Batal
            </button>
          </div>
        </div>
      )}

    </div>
  );
}

// ─── Mock Data ────────────────────────────────────────────────────────────────
async function mockInvoke(ch) {
  if (ch === 'laporan:harian') return MOCK_HARIAN;
  if (ch === 'laporan:bulanan') return {
    summary: { total_pendapatan:14200000, total_transaksi:142, rata_rata:100000 },
    perKategori: [
      { kategori:'Jasa Servis', total:7800000 },
      { kategori:'Sparepart', total:4900000 },
      { kategori:'Cuci Motor', total:1500000 },
    ],
  };
  return {};
}

const MOCK_HARIAN = [
  { tanggal:'2026-04-16', total_pendapatan:520000, total_transaksi:5 },
  { tanggal:'2026-04-17', total_pendapatan:380000, total_transaksi:4 },
  { tanggal:'2026-04-18', total_pendapatan:640000, total_transaksi:6 },
  { tanggal:'2026-04-19', total_pendapatan:210000, total_transaksi:2 },
  { tanggal:'2026-04-20', total_pendapatan:750000, total_transaksi:7 },
  { tanggal:'2026-04-21', total_pendapatan:320000, total_transaksi:3 },
  { tanggal:'2026-04-22', total_pendapatan:485000, total_transaksi:5 },
];
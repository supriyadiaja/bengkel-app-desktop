import { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, ReceiptText, Zap, Download, Printer, Star, ArrowUpRight } from 'lucide-react';
import { Card, CardHeader, Button, Badge, StatCard, Table } from '../components/UI';
import { formatRupiah, formatDate, MONTHS, monthRange } from '../utils/format';

const api = window.api || { invoke: mockInvoke };

export default function LaporanPage() {
  const now = new Date();
  const [year,  setYear]  = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [tab,   setTab]   = useState('harian'); // harian | bulanan
  const [dailyData, setDaily]   = useState([]);
  const [monthly,   setMonthly] = useState(null);
  const [loading, setLoading]   = useState(true);

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

  const hariColumns = [
    { key:'tanggal', title:'Tanggal', render:v=><span style={{fontFamily:'JetBrains Mono',fontSize:12}}>{formatDate(v)}</span> },
    { key:'total_pendapatan', title:'Pendapatan', align:'right', render:v=><span style={{fontFamily:'JetBrains Mono',fontWeight:700,color:'var(--accent)'}}>{formatRupiah(v)}</span> },
    { key:'total_transaksi',  title:'Transaksi', align:'center', render:v=><Badge variant="blue">{v}x</Badge> },
    { key:'total_pendapatan', title:'Rata-rata', align:'right', render:(v,row)=><span style={{fontFamily:'JetBrains Mono',fontSize:12,color:'var(--text2)'}}>{formatRupiah(row.total_transaksi>0?v/row.total_transaksi:0)}</span> },
  ];

  const years = Array.from({length:5},(_,i)=>now.getFullYear()-i);

  return (
    <div className="fade-in">
      {/* Filter */}
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
          <Button variant="ghost" size="sm" icon={<Download size={12}/>}>Export Excel</Button>
          <Button variant="ghost" size="sm" icon={<Printer size={12}/>}>Cetak</Button>
        </div>
      </div>

      {/* Stats */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:14,marginBottom:16}}>
        <StatCard label={`Pendapatan ${MONTHS[month-1]}`} value={formatRupiah(totalPend)} icon={<TrendingUp size={18}/>} color="var(--accent)" bg="var(--accent-light)" trend="Bulan ini" trendUp />
        <StatCard label="Total Transaksi"    value={String(totalTrx)} icon={<ReceiptText size={18}/>} color="var(--green)" bg="var(--green-bg)" trend={`${totalTrx} servis`} trendUp />
        <StatCard label="Rata-rata/Transaksi" value={formatRupiah(rataRata)} icon={<BarChart3 size={18}/>} color="var(--blue)" bg="var(--blue-bg)" trend="Per servis" trendUp />
        <StatCard label="Hari Aktif" value={`${dailyData.length} hari`} icon={<Zap size={18}/>} color="var(--yellow)" bg="var(--yellow-bg)" trend={`dari ${new Date(year,month,0).getDate()} hari`} trendUp />
      </div>

      {/* Chart + Categories */}
      <div style={{display:'grid',gridTemplateColumns:'2fr 1fr',gap:14,marginBottom:14}}>
        {/* Bar Chart */}
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
                        background:`linear-gradient(180deg,#e85d04,#f48c06)`,
                        transition:'height 0.4s ease',
                      }} title={`${formatDate(d.tanggal)}\n${formatRupiah(d.total_pendapatan)}\n${d.total_transaksi} transaksi`}/>
                    </div>
                    {dailyData.length <= 15 && (
                      <div style={{fontSize:9,color:'var(--text3)',fontFamily:'JetBrains Mono'}}>
                        {new Date(d.tanggal).getDate()}
                      </div>
                    )}
                  </div>
                ))}
              </div>
              {dailyData.length <= 15 && (
                <div style={{display:'flex',paddingTop:4}}>
                  {dailyData.map((d,i)=>(
                    <div key={i} style={{flex:1,textAlign:'center',fontFamily:'JetBrains Mono',fontSize:9,color:'var(--text3)'}}>
                      {((d.total_pendapatan||0)/1000)>0?`${((d.total_pendapatan||0)/1000).toFixed(0)}K`:''}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </Card>

        {/* Per Kategori */}
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

          {/* Top Mekanik placeholder */}
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

      {/* Daily Table */}
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
            {[['Total Pendapatan', formatRupiah(totalPend), 'var(--accent)'], ['Total Transaksi', `${totalTrx}x`, 'var(--blue)'], ['Rata-rata/Hari', formatRupiah(dailyData.length>0?totalPend/dailyData.length:0), 'var(--green)']].map(([k,v,c])=>(
              <div key={k} style={{textAlign:'right'}}>
                <div style={{fontSize:11,color:'var(--text3)',marginBottom:2}}>{k}</div>
                <div style={{fontFamily:'JetBrains Mono',fontWeight:800,color:c,fontSize:15}}>{v}</div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

async function mockInvoke(ch, args) {
  if (ch === 'laporan:harian') return MOCK_HARIAN;
  if (ch === 'laporan:bulanan') return { summary:{total_pendapatan:14200000,total_transaksi:142,rata_rata:100000}, perKategori:[{kategori:'Jasa Servis',total:7800000},{kategori:'Sparepart',total:4900000},{kategori:'Cuci Motor',total:1500000}] };
  return {};
}
const MOCK_HARIAN = [
  {tanggal:'2026-04-16',total_pendapatan:520000,total_transaksi:5},
  {tanggal:'2026-04-17',total_pendapatan:380000,total_transaksi:4},
  {tanggal:'2026-04-18',total_pendapatan:640000,total_transaksi:6},
  {tanggal:'2026-04-19',total_pendapatan:210000,total_transaksi:2},
  {tanggal:'2026-04-20',total_pendapatan:750000,total_transaksi:7},
  {tanggal:'2026-04-21',total_pendapatan:320000,total_transaksi:3},
  {tanggal:'2026-04-22',total_pendapatan:485000,total_transaksi:5},
];

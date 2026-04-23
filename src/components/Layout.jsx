import { useState, useEffect, useRef } from 'react';
import {
  LayoutDashboard, FileText, Users, Package, BarChart3,
  Printer, Store, Shield, LogOut, Bell, Calendar, Wrench,
  AlertTriangle, XCircle, ChevronRight, X, Brain
} from 'lucide-react';

const NAV = [
  { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { id: 'invoice',   icon: FileText,        label: 'Invoice & Servis' },
  { id: 'pelanggan', icon: Users,           label: 'Pelanggan' },
  { id: 'sparepart', icon: Package,         label: 'Stok Sparepart', badgeWarn: true },
  { id: 'laporan',   icon: BarChart3,       label: 'Laporan Keuangan' },
  { id: 'analitik',  icon: Brain,           label: 'AI Analitik',    badgeNew: true },
];

const SETTINGS_NAV = [
  { id: 'printer', icon: Printer, label: 'Konfigurasi Printer' },
  { id: 'bengkel', icon: Store,   label: 'Profil Bengkel' },
  { id: 'akun',    icon: Shield,  label: 'Akun & Keamanan' },
];

const PAGE_META = {
  dashboard: { title: 'Dashboard',           sub: 'Ringkasan operasional bengkel hari ini' },
  invoice:   { title: 'Invoice & Servis',    sub: 'Buat invoice baru dan cetak struk thermal printer' },
  pelanggan: { title: 'Data Pelanggan',      sub: 'Kelola data pelanggan & riwayat kendaraan' },
  sparepart: { title: 'Stok Sparepart',      sub: 'Manajemen inventaris sparepart & material' },
  laporan:   { title: 'Laporan Keuangan',    sub: 'Analisis pendapatan & performa bengkel' },
  analitik:  { title: 'AI Analitik',         sub: 'Wawasan cerdas berbasis data transaksi bengkel kamu' },
  printer:   { title: 'Konfigurasi Printer', sub: 'Pengaturan thermal printer 58/80mm' },
  bengkel:   { title: 'Profil Bengkel',      sub: 'Data dan informasi bengkel' },
  akun:      { title: 'Akun & Keamanan',     sub: 'Manajemen pengguna dan PIN' },
};

export default function Layout({ page, setPage, currentUser, onLogout, children, stokWarning = 0, stokMenipisList = [] }) {
  const meta  = PAGE_META[page] || PAGE_META.dashboard;
  const today = new Date().toLocaleDateString('id-ID', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
  const [notifOpen, setNotifOpen] = useState(false);
  const notifRef = useRef(null);

  useEffect(() => {
    function handleOutside(e) {
      if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false);
    }
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  const navItemStyle = (active) => ({
    display: 'flex', alignItems: 'center', gap: 9,
    padding: '9px 10px', borderRadius: 8, cursor: 'pointer',
    fontSize: 13, fontWeight: active ? 600 : 500,
    color: active ? 'var(--accent)' : 'var(--text2)',
    background: active ? 'var(--accent-light)' : 'transparent',
    border: `1.5px solid ${active ? 'rgba(232,93,4,0.18)' : 'transparent'}`,
    marginBottom: 1, transition: 'all 0.12s',
  });

  return (
    <div style={{ display: 'flex', height: '100vh', background: 'var(--bg)' }}>

      {/* ── SIDEBAR ── */}
      <aside style={{ width: 234, flexShrink: 0, background: 'var(--surface)', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', boxShadow: 'var(--shadow-sm)' }}>

        <div style={{ padding: '18px 16px 14px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 11 }}>
          <div style={{ width: 38, height: 38, borderRadius: 10, flexShrink: 0, background: 'linear-gradient(135deg,#e85d04,#f48c06)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 10px rgba(232,93,4,0.28)' }}>
            <Wrench size={18} color="white" strokeWidth={2.5} />
          </div>
          <div>
            <div style={{ fontSize: 13.5, fontWeight: 800, lineHeight: 1.15, letterSpacing: '-0.2px' }}>Bengkel Maju Jaya</div>
            <div style={{ fontSize: 9.5, color: 'var(--text3)', fontFamily: "'JetBrains Mono',monospace", marginTop: 2 }}>v1.0 · BANDUNG</div>
          </div>
        </div>

        <nav style={{ padding: '12px 10px', flex: 1, overflowY: 'auto' }}>
          <div style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '1.4px', color: 'var(--text3)', padding: '4px 8px 7px', textTransform: 'uppercase' }}>Menu Utama</div>
          {NAV.map(({ id, icon: Icon, label, badgeWarn, badgeNew }) => {
            const active = page === id;
            return (
              <div key={id} onClick={() => setPage(id)} style={navItemStyle(active)}
                onMouseEnter={e => { if (!active) { e.currentTarget.style.background = 'var(--surface2)'; e.currentTarget.style.color = 'var(--text)'; }}}
                onMouseLeave={e => { if (!active) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text2)'; }}}
              >
                <Icon size={15} style={{ flexShrink: 0 }} />
                <span style={{ flex: 1 }}>{label}</span>
                {badgeWarn && stokWarning > 0 && (
                  <span style={{ minWidth: 18, height: 18, background: 'var(--yellow)', color: 'white', fontSize: 10, fontWeight: 700, borderRadius: 99, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 5px' }}>{stokWarning}</span>
                )}
                {badgeNew && (
                  <span style={{ fontSize: 9, fontWeight: 700, background: 'linear-gradient(135deg,#7c3aed,#a855f7)', color: 'white', padding: '2px 6px', borderRadius: 99 }}>AI</span>
                )}
              </div>
            );
          })}

          <div style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '1.4px', color: 'var(--text3)', padding: '16px 8px 7px', textTransform: 'uppercase' }}>Pengaturan</div>
          {SETTINGS_NAV.map(({ id, icon: Icon, label }) => {
            const active = page === id;
            return (
              <div key={id} onClick={() => setPage(id)} style={navItemStyle(active)}
                onMouseEnter={e => { if (!active) { e.currentTarget.style.background = 'var(--surface2)'; e.currentTarget.style.color = 'var(--text)'; }}}
                onMouseLeave={e => { if (!active) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text2)'; }}}
              >
                <Icon size={15} style={{ flexShrink: 0 }} />{label}
              </div>
            );
          })}
        </nav>

        <div style={{ padding: '12px 14px', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: '50%', flexShrink: 0, background: 'linear-gradient(135deg,#e85d04,#f48c06)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: 'white' }}>
            {currentUser?.nama?.charAt(0) || 'A'}
          </div>
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <div style={{ fontSize: 12.5, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{currentUser?.nama || 'Admin'}</div>
            <div style={{ fontSize: 10.5, color: 'var(--text3)', textTransform: 'capitalize' }}>{currentUser?.role || 'Administrator'}</div>
          </div>
          <div onClick={onLogout} title="Keluar"
            style={{ color: 'var(--text3)', cursor: 'pointer', padding: 6, borderRadius: 6, display: 'flex', transition: 'all 0.12s' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--red-bg)'; e.currentTarget.style.color = 'var(--red)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text3)'; }}
          >
            <LogOut size={14} />
          </div>
        </div>
      </aside>

      {/* ── MAIN ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>

        <header style={{ padding: '12px 24px', background: 'var(--surface)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: 'var(--shadow-sm)', flexShrink: 0, position: 'relative', zIndex: 50 }}>
          <div>
            <div style={{ fontSize: 17, fontWeight: 800, letterSpacing: '-0.4px' }}>{meta.title}</div>
            <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 1 }}>{meta.sub}</div>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5, color: 'var(--text3)', background: 'var(--surface2)', border: '1px solid var(--border)', padding: '7px 11px', borderRadius: 8, fontFamily: "'JetBrains Mono',monospace" }}>
              <Calendar size={11} />{today}
            </div>

            {/* ── NOTIFICATION BELL ── */}
            <div ref={notifRef} style={{ position: 'relative' }}>
              <button
                onClick={() => setNotifOpen(o => !o)}
                style={{
                  width: 36, height: 36, borderRadius: 8, border: 'none',
                  background: notifOpen ? 'var(--accent-light)' : 'var(--surface2)',
                  outline: `1.5px solid ${notifOpen ? 'rgba(232,93,4,0.3)' : 'var(--border)'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', position: 'relative',
                  color: notifOpen ? 'var(--accent)' : 'var(--text2)',
                  transition: 'all 0.15s',
                }}
              >
                <Bell size={14} />
                {stokWarning > 0 && (
                  <div style={{
                    position: 'absolute', top: -5, right: -5,
                    minWidth: 16, height: 16, background: 'var(--red)',
                    borderRadius: 99, border: '2px solid white',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 9, fontWeight: 800, color: 'white', padding: '0 3px',
                  }}>{stokWarning}</div>
                )}
              </button>

              {/* Panel */}
              {notifOpen && (
                <div className="slide-up" style={{
                  position: 'absolute', top: 'calc(100% + 10px)', right: 0,
                  width: 340, background: 'var(--surface)',
                  border: '1px solid var(--border)', borderRadius: 12,
                  boxShadow: 'var(--shadow-lg)', zIndex: 300, overflow: 'hidden',
                }}>
                  <div style={{ padding: '14px 16px 11px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700 }}>Peringatan Stok</div>
                      <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 1 }}>
                        {stokWarning > 0 ? `${stokWarning} item perlu perhatian` : 'Semua stok aman'}
                      </div>
                    </div>
                    <button onClick={() => setNotifOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', padding: 4, borderRadius: 6, display: 'flex' }}>
                      <X size={14} />
                    </button>
                  </div>

                  <div style={{ maxHeight: 320, overflowY: 'auto' }}>
                    {stokWarning === 0 ? (
                      <div style={{ padding: '28px 16px', textAlign: 'center', color: 'var(--text3)' }}>
                        <div style={{ fontSize: 28, marginBottom: 8 }}>✅</div>
                        <div style={{ fontSize: 13 }}>Semua stok dalam kondisi aman</div>
                      </div>
                    ) : stokMenipisList.map((sp, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '10px 16px', borderBottom: i < stokMenipisList.length - 1 ? '1px solid rgba(0,0,0,0.05)' : 'none' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'var(--surface2)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      >
                        <div style={{ width: 30, height: 30, borderRadius: 8, flexShrink: 0, background: sp.stok <= 0 ? 'var(--red-bg)' : 'var(--yellow-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {sp.stok <= 0 ? <XCircle size={14} color="var(--red)" /> : <AlertTriangle size={14} color="var(--yellow)" />}
                        </div>
                        <div style={{ flex: 1, overflow: 'hidden' }}>
                          <div style={{ fontSize: 12.5, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{sp.nama}</div>
                          <div style={{ fontSize: 11, color: sp.stok <= 0 ? 'var(--red)' : 'var(--yellow)', marginTop: 1, fontWeight: 500 }}>
                            {sp.stok <= 0 ? '⚠ Stok habis!' : `Sisa ${sp.stok} ${sp.satuan} (min. ${sp.stok_minimum})`}
                          </div>
                        </div>
                        <span style={{ fontSize: 10, color: 'var(--text3)', fontFamily: 'JetBrains Mono', flexShrink: 0 }}>{sp.kode}</span>
                      </div>
                    ))}
                  </div>

                  {stokWarning > 0 && (
                    <button onClick={() => { setPage('sparepart'); setNotifOpen(false); }} style={{
                      width: '100%', padding: '10px 16px', background: 'var(--surface2)', border: 'none',
                      borderTop: '1px solid var(--border)', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', gap: 6,
                      fontSize: 12, fontWeight: 600, color: 'var(--accent)',
                    }}>
                      Kelola Stok Sparepart <ChevronRight size={13} />
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </header>

        <main style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }} className="fade-in">
          {children}
        </main>
      </div>
    </div>
  );
}

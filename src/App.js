import { useState, useEffect } from 'react';
import './index.css';
import { AppProvider, useApp } from './context/AppContext';
import { Toast } from './components/UI';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import Dashboard from './pages/Dashboard';
import InvoicePage from './pages/InvoicePage';
import PelangganPage from './pages/PelangganPage';
import SparepartPage from './pages/SparepartPage';
import LaporanPage from './pages/LaporanPage';
import AnalitikPage from './pages/AnalitikPage';
import RiwayatGudangPage from './pages/RiwayatGudangPage';
import { PrinterSettings, BengkelSettings, AkunSettings } from './pages/SettingsPages';

const api = window.api || { invoke: async () => ({}) };

function AppInner() {
  const { toasts, currentUser, setCurrentUser } = useApp();
  const [page, setPage]         = useState('dashboard');
  const [loggedIn, setLoggedIn] = useState(false);
  const [stokWarning, setStokW] = useState(0);
  const [stokMenipisList, setStokList] = useState([]);

  // Auto-login in browser dev mode (no window.api)
  useEffect(() => {
    if (!window.api) {
      setCurrentUser({ id: 1, nama: 'Administrator', role: 'admin' });
      setLoggedIn(true);
    }
  }, []);

  // Fetch stok warning list on login and page change
  useEffect(() => {
    if (loggedIn) {
      api.invoke('sparepart:getStokMenipis').then(r => {
        const list = r || [];
        setStokList(list);
        setStokW(list.length);
      });
    }
  }, [loggedIn, page]);

  function handleLogin(user) {
    setCurrentUser(user);
    setLoggedIn(true);
  }

  function handleLogout() {
    setLoggedIn(false);
    setCurrentUser(null);
    setPage('dashboard');
  }

  function renderPage() {
    switch (page) {
      case 'dashboard': return <Dashboard onNavigate={setPage} />;
      case 'invoice':   return <InvoicePage />;
      case 'pelanggan': return <PelangganPage onNewInvoice={() => setPage('invoice')} />;
      case 'gudang': return <RiwayatGudangPage />;
      case 'sparepart': return <SparepartPage />;
      case 'analitik':  return <AnalitikPage />;
      case 'laporan':
        return currentUser?.role === 'admin' ? <LaporanPage /> : (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text3)' }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>🔒</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text2)', marginBottom: 8 }}>Akses Dibatasi</div>
            <div style={{ fontSize: 13 }}>Fitur laporan keuangan hanya tersedia untuk Admin</div>
          </div>
        );
      case 'printer': return <PrinterSettings />;
      case 'bengkel': return <BengkelSettings />;
      case 'akun':    return currentUser?.role === 'admin' ? <AkunSettings /> : null;
      default:        return <Dashboard onNavigate={setPage} />;
    }
  }

  if (!loggedIn) {
    return (
      <>
        <LoginPage onLogin={handleLogin} />
        <Toast toasts={toasts} />
      </>
    );
  }

  return (
    <>
      <Layout
        page={page}
        setPage={setPage}
        currentUser={currentUser}
        onLogout={handleLogout}
        stokWarning={stokWarning}
        stokMenipisList={stokMenipisList}
      >
        {renderPage()}
      </Layout>
      <Toast toasts={toasts} />
    </>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppInner />
    </AppProvider>
  );
}

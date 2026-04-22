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
import { PrinterSettings, BengkelSettings, AkunSettings } from './pages/SettingsPages';

const api = window.api || { invoke: async () => ({}) };

function AppInner() {
  const { toasts, currentUser, setCurrentUser } = useApp();
  const [page, setPage]       = useState('dashboard');
  const [loggedIn, setLoggedIn] = useState(false);
  const [stokWarning, setStokW] = useState(0);

  // Auto-login in dev mode (no window.api = browser)
  useEffect(() => {
    if (!window.api) {
      setCurrentUser({ id: 1, nama: 'Administrator', role: 'admin' });
      setLoggedIn(true);
    }
  }, []);

  // Load stok warning count
  useEffect(() => {
    if (loggedIn) {
      api.invoke('sparepart:getStokMenipis').then(r => setStokW((r || []).length));
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

  if (!loggedIn) {
    return (
      <>
        <LoginPage onLogin={handleLogin} />
        <Toast toasts={toasts} />
      </>
    );
  }

  function renderPage() {
    switch (page) {
      case 'dashboard': return <Dashboard onNavigate={setPage} />;
      case 'invoice':   return <InvoicePage />;
      case 'pelanggan': return <PelangganPage onNewInvoice={() => setPage('invoice')} />;
      case 'sparepart': return <SparepartPage />;
      case 'laporan':   return currentUser?.role === 'admin' ? <LaporanPage /> : (
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

  return (
    <>
      <Layout
        page={page}
        setPage={setPage}
        currentUser={currentUser}
        onLogout={handleLogout}
        stokWarning={stokWarning}
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

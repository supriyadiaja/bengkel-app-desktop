import { useState } from 'react';
import { Wrench, Delete } from 'lucide-react';
import { useApp } from '../context/AppContext';

export default function LoginPage({ onLogin }) {
  const { showToast } = useApp();
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [shake, setShake] = useState(false);

  const handleKey = (k) => {
    if (pin.length >= 6) return;
    setPin(p => p + k);
  };

  const handleDel = () => setPin(p => p.slice(0, -1));
  const handleClear = () => setPin('');

  const handleLogin = async (finalPin) => {
    const p = finalPin || pin;
    if (p.length < 4) return;
    setLoading(true);
    try {
      const api = window.api || mockApi;
      const res = await api.invoke('auth:login', { pin: p });
      if (res.success) {
        onLogin(res.user);
        if (window.api) window.api.send('auth:openMain');
      } else {
        setShake(true);
        setPin('');
        setTimeout(() => setShake(false), 500);
        showToast(res.message || 'PIN salah', 'error');
      }
    } catch (e) {
      showToast('Gagal login', 'error');
    }
    setLoading(false);
  };

  const handlePad = (k) => {
    const np = pin + k;
    setPin(np);
    if (np.length === 4 || np.length === 6) {
      setTimeout(() => handleLogin(np), 100);
    }
  };

  const dots = Array.from({ length: 4 }, (_, i) => i < pin.length);

  return (
    <div style={{
      width: '100vw', height: '100vh',
      background: 'linear-gradient(135deg, #fff3ed 0%, #f0f2f5 50%, #eff6ff 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: "'Plus Jakarta Sans', sans-serif",
    }}>
      {/* Background decoration */}
      <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
        <div style={{ position: 'absolute', top: -80, right: -80, width: 360, height: 360, borderRadius: '50%', background: 'rgba(232,93,4,0.06)' }} />
        <div style={{ position: 'absolute', bottom: -60, left: -60, width: 280, height: 280, borderRadius: '50%', background: 'rgba(37,99,235,0.05)' }} />
      </div>

      <div style={{
        background: 'white', borderRadius: 20, padding: '36px 32px',
        width: 360, boxShadow: '0 20px 60px rgba(0,0,0,0.12), 0 4px 16px rgba(0,0,0,0.06)',
        border: '1px solid var(--border)', position: 'relative',
        animation: shake ? 'shakeX 0.4s ease' : 'slideUp 0.3s ease both',
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{
            width: 56, height: 56, borderRadius: 16,
            background: 'linear-gradient(135deg, #e85d04, #f48c06)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 14px', boxShadow: '0 8px 24px rgba(232,93,4,0.3)',
          }}>
            <Wrench size={26} color="white" strokeWidth={2.5} />
          </div>
          <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-0.4px', marginBottom: 4 }}>
            Bengkel Maju Jaya
          </div>
          <div style={{ fontSize: 13, color: 'var(--text3)' }}>Masukkan PIN untuk melanjutkan</div>
        </div>

        {/* PIN Dots */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 14, marginBottom: 28 }}>
          {dots.map((filled, i) => (
            <div key={i} style={{
              width: 14, height: 14, borderRadius: '50%',
              background: filled ? 'var(--accent)' : 'var(--border)',
              transition: 'all 0.15s',
              transform: filled ? 'scale(1.15)' : 'scale(1)',
              boxShadow: filled ? '0 2px 8px rgba(232,93,4,0.4)' : 'none',
            }} />
          ))}
        </div>

        {/* Numpad */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
          {[1,2,3,4,5,6,7,8,9].map(n => (
            <button key={n} onClick={() => handlePad(String(n))} disabled={loading} style={{
              height: 52, borderRadius: 12, border: '1.5px solid var(--border)',
              background: 'var(--surface2)', fontSize: 18, fontWeight: 700,
              color: 'var(--text)', cursor: 'pointer',
              transition: 'all 0.1s', fontFamily: "'JetBrains Mono', monospace",
            }}
              onMouseDown={e => e.currentTarget.style.background = 'var(--accent-light)'}
              onMouseUp={e => e.currentTarget.style.background = 'var(--surface2)'}
            >
              {n}
            </button>
          ))}
          {/* Bottom row: clear, 0, del */}
          <button onClick={handleClear} style={{
            height: 52, borderRadius: 12, border: '1.5px solid var(--border)',
            background: 'var(--surface2)', fontSize: 12, fontWeight: 700,
            color: 'var(--text3)', cursor: 'pointer', transition: 'all 0.1s',
          }}>CLR</button>
          <button onClick={() => handlePad('0')} style={{
            height: 52, borderRadius: 12, border: '1.5px solid var(--border)',
            background: 'var(--surface2)', fontSize: 18, fontWeight: 700,
            color: 'var(--text)', cursor: 'pointer', transition: 'all 0.1s',
            fontFamily: "'JetBrains Mono', monospace",
          }}
            onMouseDown={e => e.currentTarget.style.background = 'var(--accent-light)'}
            onMouseUp={e => e.currentTarget.style.background = 'var(--surface2)'}
          >0</button>
          <button onClick={handleDel} style={{
            height: 52, borderRadius: 12, border: '1.5px solid var(--border)',
            background: 'var(--surface2)', fontSize: 12, fontWeight: 700,
            color: 'var(--text3)', cursor: 'pointer', transition: 'all 0.1s',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Delete size={18} />
          </button>
        </div>

        {/* Login button */}
        <button
          onClick={() => handleLogin()}
          disabled={pin.length < 4 || loading}
          style={{
            width: '100%', marginTop: 16, height: 48,
            borderRadius: 12, border: 'none',
            background: pin.length >= 4 ? 'var(--accent)' : 'var(--border)',
            color: pin.length >= 4 ? 'white' : 'var(--text3)',
            fontSize: 14, fontWeight: 700, cursor: pin.length >= 4 ? 'pointer' : 'default',
            transition: 'all 0.15s',
            boxShadow: pin.length >= 4 ? '0 4px 16px rgba(232,93,4,0.3)' : 'none',
            fontFamily: "'Plus Jakarta Sans', sans-serif",
          }}
        >
          {loading ? 'Memverifikasi...' : 'Masuk'}
        </button>

        <div style={{ textAlign: 'center', marginTop: 14, fontSize: 11, color: 'var(--text3)' }}>
          PIN default Admin: <strong style={{ fontFamily: 'JetBrains Mono', color: 'var(--text2)' }}>1234</strong>
          &nbsp;·&nbsp; Kasir: <strong style={{ fontFamily: 'JetBrains Mono', color: 'var(--text2)' }}>0000</strong>
        </div>
      </div>

      <style>{`
        @keyframes shakeX {
          0%,100%{transform:translateX(0)}
          20%{transform:translateX(-8px)}
          40%{transform:translateX(8px)}
          60%{transform:translateX(-5px)}
          80%{transform:translateX(5px)}
        }
      `}</style>
    </div>
  );
}

// Mock for browser/artifact preview
const mockApi = {
  invoke: async (ch, args) => {
    if (ch === 'auth:login') {
      if (args.pin === '1234') return { success: true, user: { id:1, nama:'Administrator', role:'admin' } };
      if (args.pin === '0000') return { success: true, user: { id:2, nama:'Kasir', role:'kasir' } };
      return { success: false, message: 'PIN salah' };
    }
    return {};
  },
  send: () => {},
};

import { X, Loader2, Search } from 'lucide-react';
import { createPortal } from 'react-dom';

// ─── Button ──────────────────────────────────────────────────────────────────
const btnBase = {
  display: 'inline-flex', alignItems: 'center', gap: 6,
  padding: '8px 15px', borderRadius: 8, border: 'none',
  cursor: 'pointer', fontSize: 13, fontWeight: 600,
  fontFamily: "'Plus Jakarta Sans', sans-serif",
  transition: 'all 0.12s', lineHeight: 1, whiteSpace: 'nowrap',
};

const variants = {
  primary:  { background: 'var(--accent)', color: 'white', boxShadow: '0 2px 8px rgba(232,93,4,0.2)' },
  ghost:    { background: 'var(--surface2)', color: 'var(--text)', border: '1px solid var(--border)' },
  danger:   { background: 'var(--red-bg)', color: 'var(--red)', border: '1px solid rgba(220,38,38,0.2)' },
  success:  { background: 'var(--green-bg)', color: 'var(--green)', border: '1px solid rgba(5,150,105,0.2)' },
  outline:  { background: 'transparent', color: 'var(--accent)', border: '1.5px solid var(--accent)' },
};

export function Button({ children, variant = 'primary', size = 'md', icon, loading, disabled, onClick, style, type = 'button' }) {
  const sz = size === 'sm' ? { padding: '5px 11px', fontSize: 12 }
           : size === 'icon' ? { padding: '7px', fontSize: 13 }
           : {};
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      style={{ ...btnBase, ...variants[variant], ...sz, ...style, opacity: (disabled || loading) ? 0.6 : 1 }}
    >
      {loading ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : icon}
      {children}
    </button>
  );
}

// ─── Badge ───────────────────────────────────────────────────────────────────
const badgeVariants = {
  green:  { background: 'var(--green-bg)',  color: 'var(--green)' },
  red:    { background: 'var(--red-bg)',    color: 'var(--red)' },
  yellow: { background: 'var(--yellow-bg)', color: 'var(--yellow)' },
  blue:   { background: 'var(--blue-bg)',   color: 'var(--blue)' },
  orange: { background: 'var(--accent-light)', color: 'var(--accent)' },
  purple: { background: 'var(--purple-bg)', color: 'var(--purple)' },
  gray:   { background: 'var(--surface3)', color: 'var(--text3)' },
};

export function Badge({ children, variant = 'blue', icon, style }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '3px 8px', borderRadius: 99,
      fontSize: 11, fontWeight: 600,
      fontFamily: "'JetBrains Mono', monospace",
      ...badgeVariants[variant], ...style
    }}>
      {icon}<span>{children}</span>
    </span>
  );
}

// ─── Card ────────────────────────────────────────────────────────────────────
export function Card({ children, style, className }) {
  return (
    <div className={className} style={{
      background: 'var(--surface)', border: '1px solid var(--border)',
      borderRadius: 'var(--r)', padding: 20, boxShadow: 'var(--shadow-sm)',
      ...style
    }}>
      {children}
    </div>
  );
}

export function CardHeader({ title, subtitle, icon, iconBg, iconColor, actions }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {icon && (
          <div style={{
            width: 28, height: 28, borderRadius: 7,
            background: iconBg || 'var(--accent-light)',
            color: iconColor || 'var(--accent)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>{icon}</div>
        )}
        <div>
          <div style={{ fontSize: 13, fontWeight: 700 }}>{title}</div>
          {subtitle && <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 1 }}>{subtitle}</div>}
        </div>
      </div>
      {actions && <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>{actions}</div>}
    </div>
  );
}

// ─── Modal ───────────────────────────────────────────────────────────────────
export function Modal({ open, onClose, title, subtitle, children, footer, width = 540 }) {
  if (!open) return null;

  return createPortal(
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(17,24,39,0.45)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '20px',
        backdropFilter: 'blur(4px)',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        className="slide-up"
        style={{
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: 14, width, maxWidth: '95vw',
          maxHeight: '90vh', overflowY: 'auto',
          boxShadow: 'var(--shadow-lg)',
          display: 'flex', flexDirection: 'column',
        }}
      >
        <div style={{
          display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
          padding: '22px 26px 16px', borderBottom: '1px solid var(--border)', flexShrink: 0,
        }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, letterSpacing: '-0.3px' }}>{title}</div>
            {subtitle && <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>{subtitle}</div>}
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} icon={<X size={14} />} />
        </div>

        <div style={{ padding: '20px 26px', overflowY: 'auto', flex: 1 }}>
          {children}
        </div>

        {footer && (
          <div style={{
            display: 'flex', gap: 10, justifyContent: 'flex-end',
            padding: '14px 26px', borderTop: '1px solid var(--border)', flexShrink: 0,
          }}>
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}

// ─── Table ───────────────────────────────────────────────────────────────────
export function Table({ columns, data, emptyText = 'Tidak ada data', loading }) {
  if (loading) return (
    <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text3)' }}>
      <Loader2 size={22} style={{ animation: 'spin 1s linear infinite', marginBottom: 8 }} />
      <div style={{ fontSize: 13 }}>Memuat data...</div>
    </div>
  );
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr>
            {columns.map((col, i) => (
              <th key={i} style={{
                textAlign: col.align || 'left', padding: '9px 12px',
                color: 'var(--text3)', fontWeight: 600, fontSize: 11,
                letterSpacing: '0.6px', textTransform: 'uppercase',
                background: 'var(--surface2)', borderBottom: '1px solid var(--border)',
                whiteSpace: 'nowrap',
              }}>
                {col.title}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text3)', fontSize: 13 }}>
                {emptyText}
              </td>
            </tr>
          ) : data.map((row, ri) => (
            <tr key={ri} style={{ borderBottom: '1px solid rgba(0,0,0,0.04)', transition: 'background 0.1s', cursor: 'default' }}
              onMouseEnter={e => e.currentTarget.style.background = '#fafbfc'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              {columns.map((col, ci) => (
                <td key={ci} style={{ padding: '11px 12px', verticalAlign: 'middle', textAlign: col.align || 'left' }}>
                  {col.render ? col.render(row[col.key], row) : row[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Form Components ─────────────────────────────────────────────────────────
export function FormGrid({ children, cols = 2 }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 12 }}>
      {children}
    </div>
  );
}

const inputBase = {
  background: 'var(--surface2)', border: '1.5px solid var(--border)',
  borderRadius: 8, padding: '8px 11px', color: 'var(--text)',
  fontSize: 13, fontFamily: "'Plus Jakarta Sans', sans-serif",
  outline: 'none', transition: 'border-color 0.12s, box-shadow 0.12s',
  width: '100%',
};

export function FormField({ label, children, span, required }) {
  return (
    <div style={{ gridColumn: span ? `span ${span}` : undefined, display: 'flex', flexDirection: 'column', gap: 5 }}>
      <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text2)', letterSpacing: '0.4px', textTransform: 'uppercase' }}>
        {label}{required && <span style={{ color: 'var(--red)', marginLeft: 2 }}>*</span>}
      </label>
      {children}
    </div>
  );
}

export function Input({ value, onChange, placeholder, type = 'text', disabled, style, onFocus, onBlur }) {
  return (
    <input
      type={type} value={value} onChange={onChange} placeholder={placeholder}
      disabled={disabled} style={{ ...inputBase, ...style }}
      onFocus={e => { e.target.style.borderColor = 'var(--accent)'; e.target.style.boxShadow = '0 0 0 3px rgba(232,93,4,0.08)'; e.target.style.background = 'white'; onFocus && onFocus(e); }}
      onBlur={e => { e.target.style.borderColor = 'var(--border)'; e.target.style.boxShadow = 'none'; e.target.style.background = 'var(--surface2)'; onBlur && onBlur(e); }}
    />
  );
}

export function Select({ value, onChange, children, style, disabled }) {
  return (
    <select
      value={value} onChange={onChange} disabled={disabled}
      style={{ ...inputBase, cursor: 'pointer', ...style }}
      onFocus={e => { e.target.style.borderColor = 'var(--accent)'; e.target.style.boxShadow = '0 0 0 3px rgba(232,93,4,0.08)'; }}
      onBlur={e => { e.target.style.borderColor = 'var(--border)'; e.target.style.boxShadow = 'none'; }}
    >
      {children}
    </select>
  );
}

export function Textarea({ value, onChange, placeholder, rows = 3, style }) {
  return (
    <textarea
      value={value} onChange={onChange} placeholder={placeholder} rows={rows}
      style={{ ...inputBase, resize: 'vertical', ...style }}
      onFocus={e => { e.target.style.borderColor = 'var(--accent)'; e.target.style.boxShadow = '0 0 0 3px rgba(232,93,4,0.08)'; e.target.style.background = 'white'; }}
      onBlur={e => { e.target.style.borderColor = 'var(--border)'; e.target.style.boxShadow = 'none'; e.target.style.background = 'var(--surface2)'; }}
    />
  );
}

// ─── Search Input ─────────────────────────────────────────────────────────────
export function SearchInput({ value, onChange, placeholder = 'Cari...', width = 220 }) {
  return (
    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
      <Search size={13} style={{ position: 'absolute', left: 10, color: 'var(--text3)', pointerEvents: 'none' }} />
      <input
        value={value} onChange={onChange} placeholder={placeholder}
        style={{ ...inputBase, paddingLeft: 32, width, transition: 'all 0.15s' }}
        onFocus={e => { e.target.style.borderColor = 'var(--accent)'; e.target.style.width = (width + 40) + 'px'; e.target.style.boxShadow = '0 0 0 3px rgba(232,93,4,0.08)'; e.target.style.background = 'white'; }}
        onBlur={e => { e.target.style.borderColor = 'var(--border)'; e.target.style.width = width + 'px'; e.target.style.boxShadow = 'none'; e.target.style.background = 'var(--surface2)'; }}
      />
    </div>
  );
}

// ─── Stat Card ───────────────────────────────────────────────────────────────
export function StatCard({ label, value, trend, trendUp, icon, color, bg, onClick }) {
  return (
    <div onClick={onClick} style={{
      background: 'var(--surface)', border: '1px solid var(--border)',
      borderRadius: 'var(--r)', padding: '16px 18px', boxShadow: 'var(--shadow-sm)',
      display: 'flex', flexDirection: 'column', gap: 10,
      cursor: onClick ? 'pointer' : 'default',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div style={{ width: 38, height: 38, borderRadius: 9, background: bg, color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {icon}
        </div>
        {trend && (
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 3,
            fontSize: 11, fontWeight: 600, padding: '3px 7px', borderRadius: 99,
            background: trendUp ? 'var(--green-bg)' : 'var(--yellow-bg)',
            color: trendUp ? 'var(--green)' : 'var(--yellow)',
          }}>{trend}</span>
        )}
      </div>
      <div>
        <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-0.8px', color }}>{value}</div>
        <div style={{ fontSize: 12, color: 'var(--text3)', fontWeight: 500, marginTop: 2 }}>{label}</div>
      </div>
    </div>
  );
}

// ─── Toast ───────────────────────────────────────────────────────────────────
export function Toast({ toasts }) {
  return (
    <div style={{ position: 'fixed', bottom: 20, right: 20, zIndex: 999, display: 'flex', flexDirection: 'column', gap: 8 }}>
      {toasts.map(t => (
        <div key={t.id} className="slide-up" style={{
          background: t.type === 'error' ? 'var(--red)' : t.type === 'warning' ? 'var(--yellow)' : '#111827',
          color: 'white', borderRadius: 10, padding: '12px 16px',
          fontSize: 13, fontWeight: 500, boxShadow: 'var(--shadow-lg)',
          display: 'flex', alignItems: 'center', gap: 8, maxWidth: 340,
        }}>
          <span>{t.message}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Empty State ─────────────────────────────────────────────────────────────
export function EmptyState({ icon, title, description, action }) {
  return (
    <div style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--text3)' }}>
      <div style={{ fontSize: 40, marginBottom: 12 }}>{icon}</div>
      <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text2)', marginBottom: 6 }}>{title}</div>
      <div style={{ fontSize: 13, marginBottom: action ? 20 : 0 }}>{description}</div>
      {action}
    </div>
  );
}

// ─── Confirm Dialog ──────────────────────────────────────────────────────────
export function ConfirmDialog({ open, onClose, onConfirm, title, message, confirmText = 'Ya, Hapus', loading }) {
  return (
    <Modal open={open} onClose={onClose} title={title} width={400}
      footer={<>
        <Button variant="ghost" onClick={onClose}>Batal</Button>
        <Button variant="danger" onClick={onConfirm} loading={loading}>{confirmText}</Button>
      </>}
    >
      <p style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.6 }}>{message}</p>
    </Modal>
  );
}

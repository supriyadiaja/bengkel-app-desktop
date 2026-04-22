export function formatRupiah(n) {
  return 'Rp ' + Number(n || 0).toLocaleString('id-ID');
}

export function formatDate(dateStr) {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function formatDateTime(dateStr) {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  return d.toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function formatDateInput(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr).toISOString().split('T')[0];
}

export function todayISO() {
  return new Date().toISOString().split('T')[0];
}

export function monthRange(year, month) {
  const dari  = `${year}-${String(month).padStart(2,'0')}-01`;
  const sampai = `${year}-${String(month).padStart(2,'0')}-31`;
  return { dari, sampai };
}

export const MONTHS = [
  'Januari','Februari','Maret','April','Mei','Juni',
  'Juli','Agustus','September','Oktober','November','Desember'
];

export const STATUS_INVOICE = ['Lunas','Proses','Belum Bayar','Dibatalkan'];
export const METODE_BAYAR   = ['Tunai','Transfer','QRIS','Kredit'];
export const SATUAN_ITEM    = ['Jasa','Pcs','Botol','Set','Lembar','Meter'];
export const KATEGORI_SP    = ['Oli','Filter','Busi','Rem','Ban','Aki','Rantai','Lampu','Body','Lainnya'];

// ⚠️ PENTING: Data dari Supabase kamu tersimpan sebagai WIB (+07:00)
// Jadi kita TIDAK boleh konversi timezone lagi. Tampilkan apa adanya.

/**
 * Format jam:menit (data sudah WIB)
 * Contoh: "2026-09-14T19:58:28+07:00" → "19:58"
 */
export const fmtTime = (input) => {
  if (!input) return '-';
  try {
    if (typeof input === 'string') {
      // Extract HH:mm langsung dari string ISO
      // Format: "2026-09-14T19:58:28+07:00"
      const match = input.match(/T(\d{2}):(\d{2})/);
      if (match) return `${match[1]}:${match[2]}`;
    }
    // Fallback kalau input berupa Date object
    const d = typeof input === 'string' ? new Date(input) : input;
    if (isNaN(d.getTime())) return '-';
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    return `${hh}:${mm}`;
  } catch {
    return '-';
  }
};

/**
 * Format tanggal pendek: "14 Sep 2026"
 * Input bisa "2026-09-14" atau ISO string
 */
export const fmtDate = (input) => {
  if (!input) return '-';
  try {
    if (typeof input === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(input)) {
      const [y, m, d] = input.split('-');
      const bulan = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
      return `${d} ${bulan[parseInt(m, 10) - 1]} ${y}`;
    }
    const d = typeof input === 'string' ? new Date(input) : input;
    if (isNaN(d.getTime())) return '-';
    return d.toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return '-';
  }
};

/**
 * Format tanggal panjang: "Senin, 14 September 2026"
 */
export const fmtFullDate = (input) => {
  if (!input) return '-';
  try {
    const d = typeof input === 'string' ? new Date(input) : input;
    if (isNaN(d.getTime())) return '-';
    return d.toLocaleDateString('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return '-';
  }
};

/**
 * Format durasi menit → "8j 30m"
 */
export const fmtDuration = (minutes) => {
  const m = Number(minutes);
  if (!m || m <= 0 || isNaN(m)) return '-';
  const h = Math.floor(m / 60);
  const min = m % 60;
  if (h === 0) return `${min}m`;
  if (min === 0) return `${h}j`;
  return `${h}j ${min}m`;
};

/**
 * Ambil tanggal hari ini format YYYY-MM-DD (pakai waktu lokal WIB)
 */
export const getTodayWIB = () => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};
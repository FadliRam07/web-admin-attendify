import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import Sidebar from '../components/Sidebar';
import { Download, Filter, Search, MapPin, X, ImageOff } from 'lucide-react';
import { fmtTime, fmtDate, fmtDuration, getTodayWIB } from '../lib/formatTime';

export default function Attendance() {
  const [logs, setLogs] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const [fromDate, setFromDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  });
  const [toDate, setToDate] = useState(getTodayWIB());
  const [selectedLog, setSelectedLog] = useState(null);
  
  const [checkInSignedUrl, setCheckInSignedUrl] = useState(null);
  const [checkOutSignedUrl, setCheckOutSignedUrl] = useState(null);
  const [photoLoading, setPhotoLoading] = useState(false);

  useEffect(() => {
    fetchLogs();
  }, []);

  useEffect(() => {
    const q = search.toLowerCase();
    setFiltered(
      logs.filter((l) => {
        const matchSearch =
          (l.profiles?.full_name || '').toLowerCase().includes(q) ||
          (l.profiles?.email || '').toLowerCase().includes(q);
        const matchStatus =
          statusFilter === 'all' ||
          (statusFilter === 'late' ? l.late_minutes > 0 : l.late_minutes === 0);
        return matchSearch && matchStatus;
      })
    );
  }, [search, statusFilter, logs]);

  const getSignedUrl = async (path) => {
    if (!path) return null;
    if (path.startsWith('http')) return path;
    
    try {
      const { data, error } = await supabase.storage
        .from('attendance-photos')
        .createSignedUrl(path, 3600);
      
      if (error) {
        console.error('Signed URL error:', error);
        return null;
      }
      return data?.signedUrl || null;
    } catch (e) {
      console.error('Signed URL exception:', e);
      return null;
    }
  };

  const handleOpenDetail = async (log) => {
    setSelectedLog(log);
    setPhotoLoading(true);
    setCheckInSignedUrl(null);
    setCheckOutSignedUrl(null);

    const isFallback = (path) => !path || path.startsWith('fallback_');
    const checkInPath = isFallback(log.check_in_photo) ? null : log.check_in_photo;
    const checkOutPath = isFallback(log.check_out_photo) ? null : log.check_out_photo;

    try {
      const [checkInUrl, checkOutUrl] = await Promise.all([
        checkInPath ? getSignedUrl(checkInPath) : Promise.resolve(null),
        checkOutPath ? getSignedUrl(checkOutPath) : Promise.resolve(null),
      ]);

      setCheckInSignedUrl(checkInUrl);
      setCheckOutSignedUrl(checkOutUrl);
    } catch (e) {
      console.error('Error loading photos:', e);
    } finally {
      setPhotoLoading(false);
    }
  };

  const handleCloseDetail = () => {
    setSelectedLog(null);
    setCheckInSignedUrl(null);
    setCheckOutSignedUrl(null);
  };

  const fetchLogs = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('attendances')
      .select('*')
      .gte('attendance_date', fromDate)
      .lte('attendance_date', toDate)
      .order('check_in', { ascending: false });

    if (error) {
      console.error(error);
      setLogs([]);
      setLoading(false);
      return;
    }

    const userIds = [...new Set((data || []).map((l) => l.user_id))];
    let profMap = {};
    if (userIds.length > 0) {
      const { data: profs } = await supabase
        .from('profiles')
        .select('id, full_name, email, avatar_url')
        .in('id', userIds);
      profMap = Object.fromEntries((profs || []).map((p) => [p.id, p]));
    }

    const joined = (data || []).map((l) => ({ ...l, profiles: profMap[l.user_id] }));
    setLogs(joined);
    setLoading(false);
  };

  const initials = (n) =>
    n ? n.split(' ').map((x) => x[0]).slice(0, 2).join('').toUpperCase() : '?';

  // ============ EXPORT CSV (DIPERBAIKI) ============
  const exportCSV = () => {
    // Format tanggal+jam export
    const now = new Date();
    const timestamp = now.toLocaleString('id-ID', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    }).replace(/[/:]/g, '-').replace(/,\s/g, '_');

    // Header kolom
    const headers = [
      'No',
      'Nama Karyawan',
      'Email',
      'Tanggal',
      'Jam Masuk',
      'Jam Pulang',
      'Menit Terlambat',
      'Durasi Kerja (menit)',
      'Latitude Masuk',
      'Longitude Masuk',
      'Status',
    ];

    // Data rows
    const rows = filtered.map((l, index) => [
      index + 1,
      l.profiles?.full_name || '-',
      l.profiles?.email || '-',
      fmtDate(l.attendance_date),
      fmtTime(l.check_in),
      fmtTime(l.check_out),
      l.late_minutes || 0,
      l.work_duration || 0,
      l.check_in_latitude ? l.check_in_latitude.toFixed(6) : '',
      l.check_in_longitude ? l.check_in_longitude.toFixed(6) : '',
      l.late_minutes > 0 ? 'Terlambat' : 'Tepat Waktu',
    ]);

    // Pakai tanda ; (semicolon) biar Excel Indonesia langsung pisah kolom
    const csvContent = [
      headers.join(';'),
      ...rows.map((r) => r.map((c) => `"${c}"`).join(';')),
    ].join('\n');

    // Tambahkan BOM biar Excel baca UTF-8 dengan benar
    const blob = new Blob(['\ufeff' + csvContent], {
      type: 'text/csv;charset=utf-8;',
    });

    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `Rekap-Absensi_${fromDate}_sd_${toDate}_${timestamp}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 p-4 pt-20 sm:p-6 sm:pt-20 lg:p-8 lg:pt-8 min-w-0">
        <div className="flex flex-wrap justify-between items-center gap-3 mb-5">
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold text-brand-600">Rekap Absensi</h1>
            <p className="text-gray-500 text-xs sm:text-sm mt-1">Riwayat absensi lengkap dengan GPS & foto</p>
          </div>
          <button
            onClick={exportCSV}
            disabled={filtered.length === 0}
            className="inline-flex items-center gap-2 px-3 sm:px-5 py-2 sm:py-2.5 bg-gradient-to-br from-brand-600 to-brand-500 text-white font-semibold text-xs sm:text-sm rounded-xl hover:-translate-y-0.5 hover:shadow-lg disabled:opacity-50"
          >
            <Download size={14} /> Export CSV
          </button>
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-4 sm:p-5 mb-5">
          <div className="flex items-center gap-2 mb-3 text-brand-600 font-semibold text-sm">
            <Filter size={16} /> Filter
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">Dari</label>
              <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="w-full px-4 py-2.5 bg-gray-50 border-[1.5px] border-gray-200 rounded-xl text-sm outline-none focus:border-brand-600 focus:bg-white" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">Sampai</label>
              <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="w-full px-4 py-2.5 bg-gray-50 border-[1.5px] border-gray-200 rounded-xl text-sm outline-none focus:border-brand-600 focus:bg-white" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">Status</label>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-full px-4 py-2.5 bg-gray-50 border-[1.5px] border-gray-200 rounded-xl text-sm outline-none focus:border-brand-600 focus:bg-white">
                <option value="all">Semua</option>
                <option value="on_time">Tepat Waktu</option>
                <option value="late">Terlambat</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">Cari</label>
              <div className="relative">
                <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input placeholder="Nama / email..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full pl-10 pr-3 py-2.5 bg-gray-50 border-[1.5px] border-gray-200 rounded-xl text-sm outline-none focus:border-brand-600 focus:bg-white" />
              </div>
            </div>
          </div>
          <button onClick={fetchLogs} className="mt-4 px-4 sm:px-5 py-2 sm:py-2.5 bg-brand-600 text-white text-xs sm:text-sm font-semibold rounded-xl hover:bg-brand-500">
            Terapkan Tanggal
          </button>
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-4 sm:p-6">
          <div className="flex justify-between items-center mb-4 sm:mb-5">
            <h3 className="text-brand-600 font-bold text-sm sm:text-base">Riwayat Absensi</h3>
            <span className="bg-blue-50 text-blue-700 text-[10px] sm:text-xs font-semibold px-2 sm:px-3 py-1 rounded-full">
              {filtered.length} record
            </span>
          </div>

          {loading ? (
            <div className="py-12 flex flex-col items-center text-gray-400">
              <div className="w-10 h-10 border-4 border-gray-200 border-t-brand-600 rounded-full animate-spin mb-3" /> Memuat...
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center text-gray-400 text-sm">Tidak ada data absensi</div>
          ) : (
            <div className="overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0">
              <table className="w-full text-xs sm:text-sm min-w-[700px]">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-3 text-brand-600 text-[10px] sm:text-xs uppercase font-semibold">Karyawan</th>
                    <th className="text-left py-3 px-3 text-brand-600 text-[10px] sm:text-xs uppercase font-semibold">Tanggal</th>
                    <th className="text-left py-3 px-3 text-brand-600 text-[10px] sm:text-xs uppercase font-semibold">Masuk</th>
                    <th className="text-left py-3 px-3 text-brand-600 text-[10px] sm:text-xs uppercase font-semibold">Pulang</th>
                    <th className="text-left py-3 px-3 text-brand-600 text-[10px] sm:text-xs uppercase font-semibold">Telat</th>
                    <th className="text-left py-3 px-3 text-brand-600 text-[10px] sm:text-xs uppercase font-semibold">Durasi</th>
                    <th className="text-left py-3 px-3 text-brand-600 text-[10px] sm:text-xs uppercase font-semibold">Detail</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((log) => (
                    <tr key={log.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2 sm:gap-3">
                          {log.profiles?.avatar_url ? (
                            <img src={log.profiles.avatar_url} alt="" className="w-8 h-8 sm:w-9 sm:h-9 rounded-full object-cover shrink-0" />
                          ) : (
                            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-gradient-to-br from-brand-600 to-brand-300 text-white flex items-center justify-center font-semibold text-xs shrink-0">
                              {initials(log.profiles?.full_name)}
                            </div>
                          )}
                          <div className="min-w-0">
                            <div className="font-semibold text-gray-800 truncate">{log.profiles?.full_name || '-'}</div>
                            <div className="text-[10px] sm:text-xs text-gray-400 truncate">{log.profiles?.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-gray-600 whitespace-nowrap">{fmtDate(log.attendance_date)}</td>
                      <td className="py-3 px-3 whitespace-nowrap">{fmtTime(log.check_in)}</td>
                      <td className="py-3 px-3 whitespace-nowrap">{fmtTime(log.check_out)}</td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        {log.late_minutes > 0 ? <span className="text-red-600 font-semibold">{log.late_minutes} mnt</span> : <span className="text-emerald-600">-</span>}
                      </td>
                      <td className="py-3 px-3 text-gray-600 whitespace-nowrap">{fmtDuration(log.work_duration)}</td>
                      <td className="py-3 px-3">
                        <button
                          onClick={() => handleOpenDetail(log)}
                          className="inline-flex items-center gap-1 px-2 sm:px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg text-[10px] sm:text-xs font-semibold hover:bg-blue-500 hover:text-white whitespace-nowrap"
                        >
                          <MapPin size={12} /> Lihat
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {selectedLog && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 animate-fadeIn" onClick={handleCloseDetail}>
          <div className="bg-white rounded-2xl p-4 sm:p-7 w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4 sm:mb-5">
              <h3 className="text-brand-600 font-bold text-sm sm:text-lg">
                Detail — {selectedLog.profiles?.full_name}
              </h3>
              <button onClick={handleCloseDetail} className="text-gray-400 hover:text-gray-700">
                <X size={20} />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="border rounded-xl p-3 sm:p-4">
                <h4 className="font-semibold text-emerald-600 mb-3 text-sm">Check In</h4>
                {photoLoading ? (
                  <div className="w-full h-40 sm:h-48 bg-gray-100 rounded-lg flex items-center justify-center mb-3">
                    <div className="w-8 h-8 border-4 border-gray-200 border-t-emerald-500 rounded-full animate-spin"></div>
                  </div>
                ) : selectedLog.check_in_photo ? (
                  checkInSignedUrl ? (
                    <img src={checkInSignedUrl} alt="Check In" className="w-full h-40 sm:h-48 object-cover rounded-lg mb-3" />
                  ) : (
                    <div className="w-full h-40 sm:h-48 bg-red-50 rounded-lg flex flex-col items-center justify-center text-red-400 text-sm mb-3 gap-2">
                      <ImageOff size={24} />
                      <span>Gagal memuat foto</span>
                    </div>
                  )
                ) : (
                  <div className="w-full h-40 sm:h-48 bg-gray-100 rounded-lg flex items-center justify-center text-gray-400 text-sm mb-3">
                    Tidak ada foto
                  </div>
                )}
                <p className="text-sm text-gray-600 mb-1">
                  <span className="font-semibold">Jam:</span> {fmtTime(selectedLog.check_in)} WIB
                </p>
                <p className="text-xs text-gray-500 mb-2 break-all">
                  <span className="font-semibold">Lokasi:</span> {selectedLog.check_in_latitude?.toFixed(6) || '-'}, {selectedLog.check_in_longitude?.toFixed(6) || '-'}
                </p>
                {selectedLog.check_in_latitude && (
                  <a href={`https://www.google.com/maps?q=${selectedLog.check_in_latitude},${selectedLog.check_in_longitude}`} target="_blank" rel="noreferrer" className="text-xs text-blue-600 underline">
                    Buka di Google Maps
                  </a>
                )}
              </div>

              <div className="border rounded-xl p-3 sm:p-4">
                <h4 className="font-semibold text-brand-600 mb-3 text-sm">Check Out</h4>
                {photoLoading ? (
                  <div className="w-full h-40 sm:h-48 bg-gray-100 rounded-lg flex items-center justify-center mb-3">
                    <div className="w-8 h-8 border-4 border-gray-200 border-t-brand-600 rounded-full animate-spin"></div>
                  </div>
                ) : selectedLog.check_out_photo ? (
                  checkOutSignedUrl ? (
                    <img src={checkOutSignedUrl} alt="Check Out" className="w-full h-40 sm:h-48 object-cover rounded-lg mb-3" />
                  ) : (
                    <div className="w-full h-40 sm:h-48 bg-red-50 rounded-lg flex flex-col items-center justify-center text-red-400 text-sm mb-3 gap-2">
                      <ImageOff size={24} />
                      <span>Gagal memuat foto</span>
                    </div>
                  )
                ) : (
                  <div className="w-full h-40 sm:h-48 bg-gray-100 rounded-lg flex items-center justify-center text-gray-400 text-sm mb-3">
                    Tidak ada foto
                  </div>
                )}
                <p className="text-sm text-gray-600 mb-1">
                  <span className="font-semibold">Jam:</span> {fmtTime(selectedLog.check_out)} WIB
                </p>
                <p className="text-xs text-gray-500 mb-2 break-all">
                  <span className="font-semibold">Lokasi:</span> {selectedLog.check_out_latitude?.toFixed(6) || '-'}, {selectedLog.check_out_longitude?.toFixed(6) || '-'}
                </p>
                {selectedLog.check_out_latitude && (
                  <a href={`https://www.google.com/maps?q=${selectedLog.check_out_latitude},${selectedLog.check_out_longitude}`} target="_blank" rel="noreferrer" className="text-xs text-blue-600 underline">
                    Buka di Google Maps
                  </a>
                )}
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3 text-center">
              <div className="bg-gray-50 rounded-xl p-2 sm:p-3">
                <p className="text-[10px] sm:text-xs text-gray-500">Terlambat</p>
                <p className="font-bold text-brand-600 text-sm">{selectedLog.late_minutes || 0} menit</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-2 sm:p-3">
                <p className="text-[10px] sm:text-xs text-gray-500">Durasi Kerja</p>
                <p className="font-bold text-brand-600 text-sm">{fmtDuration(selectedLog.work_duration)}</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-2 sm:p-3">
                <p className="text-[10px] sm:text-xs text-gray-500">Status</p>
                <p className="font-bold text-brand-600 text-sm">{selectedLog.status}</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-2 sm:p-3">
                <p className="text-[10px] sm:text-xs text-gray-500">Tanggal</p>
                <p className="font-bold text-brand-600 text-sm">{fmtDate(selectedLog.attendance_date)}</p>
              </div>
            </div>

            {selectedLog.notes && (
              <div className="mt-4 bg-amber-50 rounded-xl p-3 sm:p-4">
                <p className="text-xs font-semibold text-amber-700 mb-1">Catatan:</p>
                <p className="text-sm text-amber-800">{selectedLog.notes}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
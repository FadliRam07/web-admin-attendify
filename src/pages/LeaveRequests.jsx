import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import Sidebar from '../components/Sidebar';
import { Check, X, FileText, Search, AlertCircle, ExternalLink, Download, Filter } from 'lucide-react';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

export default function LeaveRequests() {
  const [leaves, setLeaves] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [debugMsg, setDebugMsg] = useState('');

  const [signedUrls, setSignedUrls] = useState({});
  const [loadingUrls, setLoadingUrls] = useState({});

  useEffect(() => { fetchLeaves(); }, []);

  useEffect(() => {
    const q = search.toLowerCase();
    setFiltered(
      leaves.filter((l) => {
        const matchSearch =
          (l.profiles?.full_name || '').toLowerCase().includes(q) ||
          (l.reason || '').toLowerCase().includes(q);
        const matchStatus = statusFilter === 'all' || l.status === statusFilter;
        const matchType = typeFilter === 'all' || l.type === typeFilter;
        return matchSearch && matchStatus && matchType;
      })
    );
  }, [search, statusFilter, typeFilter, leaves]);

  const fetchLeaves = async () => {
    setLoading(true);
    setDebugMsg('');

    const { data, error } = await supabase
      .from('leave_requests')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Leave error:', error);
      setDebugMsg(`Error: ${error.message}`);
      setLeaves([]);
      setLoading(false);
      return;
    }

    const userIds = [...new Set((data || []).map((l) => l.user_id).filter(Boolean))];
    let profMap = {};
    if (userIds.length > 0) {
      const { data: profs } = await supabase
        .from('profiles')
        .select('id, full_name, email, avatar_url')
        .in('id', userIds);
      profMap = Object.fromEntries((profs || []).map((p) => [p.id, p]));
    }

    const joined = (data || []).map((l) => ({ ...l, profiles: profMap[l.user_id] }));
    setLeaves(joined);
    setLoading(false);
  };

  const getSignedUrl = async (path) => {
    if (!path) return null;
    if (path.startsWith('http')) return path;
    try {
      const { data, error } = await supabase.storage
        .from('leave-attachments')
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

  const handleOpenAttachment = async (leave) => {
    const id = leave.id;
    const path = leave.attachment_url;
    if (!path) return;

    if (signedUrls[id]) {
      window.open(signedUrls[id], '_blank', 'noopener,noreferrer');
      return;
    }

    setLoadingUrls((prev) => ({ ...prev, [id]: true }));
    try {
      const url = await getSignedUrl(path);
      if (url) {
        setSignedUrls((prev) => ({ ...prev, [id]: url }));
        window.open(url, '_blank', 'noopener,noreferrer');
      } else {
        alert('Gagal membuka lampiran. File mungkin sudah dihapus.');
      }
    } catch (e) {
      console.error('Open attachment error:', e);
      alert('Gagal membuka lampiran: ' + e.message);
    } finally {
      setLoadingUrls((prev) => ({ ...prev, [id]: false }));
    }
  };

  const handleAction = async (id, status) => {
    const adminNote = status === 'rejected' ? prompt('Alasan penolakan (opsional):') : null;
    const { data: { session } } = await supabase.auth.getSession();

    const { error } = await supabase
      .from('leave_requests')
      .update({
        status,
        admin_note: adminNote,
        approved_by: session?.user?.id,
        approved_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) alert('Gagal: ' + error.message);
    else fetchLeaves();
  };

  const fmtDate = (d) => d ? new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '-';
  const fmtDateTime = (d) => d ? new Date(d).toLocaleString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-';
  const initials = (n) => n ? n.split(' ').map((x) => x[0]).slice(0, 2).join('').toUpperCase() : '?';
  const typeLabel = { leave: 'Cuti', sick: 'Sakit', permission: 'Izin', official_duty: 'Tugas Dinas' };

  const getTypeStyle = (type) => {
    switch (type) {
      case 'leave': return 'bg-blue-100 text-blue-700';
      case 'sick': return 'bg-purple-100 text-purple-700';
      case 'permission': return 'bg-cyan-100 text-cyan-700';
      case 'official_duty': return 'bg-indigo-100 text-indigo-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const hitungHari = (start, end) => {
    if (!start || !end) return 0;
    const s = new Date(start);
    const e = new Date(end);
    const diff = Math.ceil((e - s) / (1000 * 60 * 60 * 24)) + 1;
    return diff > 0 ? diff : 0;
  };

  // ============ EXPORT EXCEL (TABEL RAPI) ============
  const exportExcel = async () => {
    const wb = new ExcelJS.Workbook();
    wb.creator = 'Attendify Admin Panel';
    wb.created = new Date();

    const ws = wb.addWorksheet('Izin Cuti Sakit', {
      pageSetup: {
        paperSize: 9,
        orientation: 'landscape',
        fitToPage: true,
        fitToWidth: 1,
        fitToHeight: 0,
        margins: { left: 0.5, right: 0.5, top: 0.7, bottom: 0.7, header: 0.3, footer: 0.3 },
      },
    });

    // Judul
    ws.mergeCells('A1:L1');
    const titleCell = ws.getCell('A1');
    titleCell.value = 'REKAP PENGAJUAN IZIN / CUTI / SAKIT';
    titleCell.font = { name: 'Calibri', size: 16, bold: true, color: { argb: 'FF4A3428' } };
    titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
    ws.getRow(1).height = 30;

    ws.mergeCells('A2:L2');
    const subtitleCell = ws.getCell('A2');
    subtitleCell.value = 'PT Icommits Karya Solusi';
    subtitleCell.font = { name: 'Calibri', size: 11, italic: true, color: { argb: 'FF6B4E3D' } };
    subtitleCell.alignment = { vertical: 'middle', horizontal: 'center' };
    ws.getRow(2).height = 20;

    ws.getRow(3).height = 8;

    // Header kolom
    const headers = [
      { header: 'No', width: 5 },
      { header: 'Nama Karyawan', width: 22 },
      { header: 'Email', width: 26 },
      { header: 'Jenis', width: 13 },
      { header: 'Tanggal Mulai', width: 13 },
      { header: 'Tanggal Selesai', width: 13 },
      { header: 'Total Hari', width: 10 },
      { header: 'Alasan', width: 30 },
      { header: 'Status', width: 12 },
      { header: 'Catatan Admin', width: 22 },
      { header: 'Tgl Pengajuan', width: 18 },
      { header: 'Tgl Approve', width: 18 },
    ];

    ws.columns = headers.map((h) => ({ width: h.width }));

    const headerRow = ws.getRow(4);
    headers.forEach((h, i) => {
      headerRow.getCell(i + 1).value = h.header;
    });

    headerRow.eachCell((cell) => {
      cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF6B4E3D' } };
      cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FF4A3428' } },
        left: { style: 'thin', color: { argb: 'FF4A3428' } },
        bottom: { style: 'thin', color: { argb: 'FF4A3428' } },
        right: { style: 'thin', color: { argb: 'FF4A3428' } },
      };
    });
    headerRow.height = 30;

    // Isi data
    filtered.forEach((l, index) => {
      const rowData = [
        index + 1,
        l.profiles?.full_name || '-',
        l.profiles?.email || '-',
        typeLabel[l.type] || l.type,
        fmtDate(l.start_date),
        fmtDate(l.end_date),
        hitungHari(l.start_date, l.end_date),
        l.reason || '-',
        l.status === 'approved' ? 'Disetujui' : l.status === 'rejected' ? 'Ditolak' : 'Pending',
        l.admin_note || '-',
        fmtDateTime(l.created_at),
        l.approved_at ? fmtDateTime(l.approved_at) : '-',
      ];

      const row = ws.addRow(rowData);

      row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
        cell.font = { name: 'Calibri', size: 10, color: { argb: 'FF2B1810' } };
        cell.alignment = {
          vertical: 'middle',
          horizontal: colNumber === 1 || colNumber === 7 ? 'center' : 'left',
          wrapText: colNumber === 8 || colNumber === 10,
        };
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFE5DDD1' } },
          left: { style: 'thin', color: { argb: 'FFE5DDD1' } },
          bottom: { style: 'thin', color: { argb: 'FFE5DDD1' } },
          right: { style: 'thin', color: { argb: 'FFE5DDD1' } },
        };
        if (index % 2 === 0) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFAF6F1' } };
        }
      });

      // Highlight Status
      const statusCell = row.getCell(9);
      if (l.status === 'approved') {
        statusCell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF2E7D32' } };
      } else if (l.status === 'rejected') {
        statusCell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFC62828' } };
      } else {
        statusCell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFC77E32' } };
      }

      row.height = 22;
    });

    // Baris total
    const totalRowIndex = 5 + filtered.length;
    ws.mergeCells(`A${totalRowIndex}:F${totalRowIndex}`);
    const totalLabelCell = ws.getCell(`A${totalRowIndex}`);
    totalLabelCell.value = 'TOTAL';
    totalLabelCell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
    totalLabelCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4A3428' } };
    totalLabelCell.alignment = { vertical: 'middle', horizontal: 'center' };

    const totalHariCell = ws.getCell(`G${totalRowIndex}`);
    totalHariCell.value = filtered.reduce((sum, l) => sum + hitungHari(l.start_date, l.end_date), 0);
    totalHariCell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
    totalHariCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4A3428' } };
    totalHariCell.alignment = { vertical: 'middle', horizontal: 'center' };

    for (let i = 1; i <= 12; i++) {
      const cell = ws.getRow(totalRowIndex).getCell(i);
      cell.border = {
        top: { style: 'medium', color: { argb: 'FF4A3428' } },
        left: { style: 'thin', color: { argb: 'FF4A3428' } },
        bottom: { style: 'medium', color: { argb: 'FF4A3428' } },
        right: { style: 'thin', color: { argb: 'FF4A3428' } },
      };
      if (i !== 7) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4A3428' } };
        cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
      }
    }

    // Footer
    const footerRowIndex = totalRowIndex + 2;
    ws.mergeCells(`A${footerRowIndex}:L${footerRowIndex}`);
    const footerCell = ws.getCell(`A${footerRowIndex}`);
    const now = new Date();
    footerCell.value = `Dicetak pada: ${now.toLocaleString('id-ID', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })} WIB  |  Total ${filtered.length} pengajuan`;
    footerCell.font = { name: 'Calibri', size: 9, italic: true, color: { argb: 'FF7B5E4E' } };
    footerCell.alignment = { vertical: 'middle', horizontal: 'right' };

    // Download
    const timestamp = now.toLocaleString('id-ID', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    }).replace(/[/:]/g, '-').replace(/,\s/g, '_');

    const buffer = await wb.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    saveAs(blob, `Rekap-Izin-Cuti-Sakit_${timestamp}.xlsx`);
  };

  const stats = {
    total: filtered.length,
    pending: filtered.filter((l) => l.status === 'pending').length,
    approved: filtered.filter((l) => l.status === 'approved').length,
    rejected: filtered.filter((l) => l.status === 'rejected').length,
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 p-4 pt-20 sm:p-6 sm:pt-20 lg:p-8 lg:pt-8 min-w-0">
        <div className="flex flex-wrap justify-between items-center gap-3 mb-5">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-brand-600">Pengajuan Cuti & Izin</h1>
            <p className="text-gray-500 text-xs sm:text-sm mt-1">Kelola pengajuan izin, sakit, cuti, dan tugas dinas</p>
          </div>
          <button
            onClick={exportExcel}
            disabled={filtered.length === 0}
            className="inline-flex items-center gap-2 px-3 sm:px-5 py-2 sm:py-2.5 bg-gradient-to-br from-brand-600 to-brand-500 text-white font-semibold text-xs sm:text-sm rounded-xl hover:-translate-y-0.5 hover:shadow-lg disabled:opacity-50"
          >
            <Download size={14} /> Export Excel
          </button>
        </div>

        {debugMsg && (
          <div className="flex items-start gap-2 bg-red-50 text-red-600 px-4 py-3 rounded-xl mb-5 text-sm border-l-4 border-red-500">
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
            <span className="break-all">{debugMsg}</span>
          </div>
        )}

        {/* Statistik */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-5">
          <div className="bg-white rounded-xl p-4 border border-gray-100">
            <p className="text-[10px] sm:text-xs text-gray-500 uppercase font-semibold tracking-wide">Total</p>
            <p className="text-xl sm:text-2xl font-bold text-brand-600 mt-1">{stats.total}</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-100">
            <p className="text-[10px] sm:text-xs text-amber-600 uppercase font-semibold tracking-wide">Pending</p>
            <p className="text-xl sm:text-2xl font-bold text-amber-600 mt-1">{stats.pending}</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-100">
            <p className="text-[10px] sm:text-xs text-emerald-600 uppercase font-semibold tracking-wide">Disetujui</p>
            <p className="text-xl sm:text-2xl font-bold text-emerald-600 mt-1">{stats.approved}</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-100">
            <p className="text-[10px] sm:text-xs text-red-600 uppercase font-semibold tracking-wide">Ditolak</p>
            <p className="text-xl sm:text-2xl font-bold text-red-600 mt-1">{stats.rejected}</p>
          </div>
        </div>

        {/* Filter */}
        <div className="bg-white rounded-2xl shadow-sm p-4 sm:p-5 mb-5">
          <div className="flex items-center gap-2 mb-3 text-brand-600 font-semibold text-sm">
            <Filter size={16} /> Filter
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">Cari</label>
              <div className="relative">
                <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  placeholder="Nama / alasan..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-10 pr-3 py-2.5 bg-gray-50 border-[1.5px] border-gray-200 rounded-xl text-sm outline-none focus:border-brand-600 focus:bg-white"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">Jenis</label>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="w-full px-4 py-2.5 bg-gray-50 border-[1.5px] border-gray-200 rounded-xl text-sm outline-none focus:border-brand-600 focus:bg-white"
              >
                <option value="all">Semua Jenis</option>
                <option value="permission">Izin</option>
                <option value="sick">Sakit</option>
                <option value="leave">Cuti</option>
                <option value="official_duty">Tugas Dinas</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-4 py-2.5 bg-gray-50 border-[1.5px] border-gray-200 rounded-xl text-sm outline-none focus:border-brand-600 focus:bg-white"
              >
                <option value="all">Semua Status</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
          </div>
        </div>

        {/* Tabel */}
        <div className="bg-white rounded-2xl shadow-sm p-4 sm:p-6">
          <div className="flex justify-between items-center mb-4 sm:mb-5">
            <h3 className="text-brand-600 font-bold text-sm sm:text-base">Daftar Pengajuan</h3>
            <span className="bg-blue-50 text-blue-700 text-[10px] sm:text-xs font-semibold px-2 sm:px-3 py-1 rounded-full">
              {filtered.length} pengajuan
            </span>
          </div>

          {loading ? (
            <div className="py-12 flex flex-col items-center text-gray-400">
              <div className="w-10 h-10 border-4 border-gray-200 border-t-brand-600 rounded-full animate-spin mb-3" /> Memuat...
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center text-gray-400 text-sm flex flex-col items-center gap-2">
              <FileText size={40} className="text-gray-300" />
              Tidak ada pengajuan
            </div>
          ) : (
            <div className="overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0">
              <table className="w-full text-xs sm:text-sm min-w-[900px]">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-3 text-brand-600 text-[10px] sm:text-xs uppercase font-semibold">Karyawan</th>
                    <th className="text-left py-3 px-3 text-brand-600 text-[10px] sm:text-xs uppercase font-semibold">Jenis</th>
                    <th className="text-left py-3 px-3 text-brand-600 text-[10px] sm:text-xs uppercase font-semibold">Tanggal</th>
                    <th className="text-center py-3 px-3 text-brand-600 text-[10px] sm:text-xs uppercase font-semibold">Total Hari</th>
                    <th className="text-left py-3 px-3 text-brand-600 text-[10px] sm:text-xs uppercase font-semibold">Alasan</th>
                    <th className="text-left py-3 px-3 text-brand-600 text-[10px] sm:text-xs uppercase font-semibold">Lampiran</th>
                    <th className="text-left py-3 px-3 text-brand-600 text-[10px] sm:text-xs uppercase font-semibold">Status</th>
                    <th className="text-left py-3 px-3 text-brand-600 text-[10px] sm:text-xs uppercase font-semibold">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((leave) => (
                    <tr key={leave.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2 sm:gap-3">
                          {leave.profiles?.avatar_url ? (
                            <img src={leave.profiles.avatar_url} alt="" className="w-8 h-8 sm:w-9 sm:h-9 rounded-full object-cover shrink-0" />
                          ) : (
                            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-gradient-to-br from-brand-600 to-brand-300 text-white flex items-center justify-center font-semibold text-xs shrink-0">
                              {initials(leave.profiles?.full_name)}
                            </div>
                          )}
                          <div className="min-w-0">
                            <div className="font-semibold text-gray-800 truncate">{leave.profiles?.full_name || '-'}</div>
                            <div className="text-[10px] sm:text-xs text-gray-400 truncate">{leave.profiles?.email}</div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-3">
                        <span className={`text-[10px] sm:text-xs font-semibold px-2 py-1 rounded-full whitespace-nowrap ${getTypeStyle(leave.type)}`}>
                          {typeLabel[leave.type] || leave.type}
                        </span>
                      </td>

                      <td className="py-3 px-3 text-gray-600 whitespace-nowrap text-xs">
                        {fmtDate(leave.start_date)} <span className="text-gray-300">s/d</span> {fmtDate(leave.end_date)}
                      </td>

                      <td className="py-3 px-3 text-center">
                        <span className="inline-block font-semibold text-brand-600 text-xs sm:text-sm">
                          {hitungHari(leave.start_date, leave.end_date)} hari
                        </span>
                      </td>

                      <td className="py-3 px-3 text-gray-600 max-w-[200px]">
                        <div className="truncate text-xs" title={leave.reason}>{leave.reason || '-'}</div>
                        {leave.admin_note && (
                          <div className="text-[10px] text-gray-400 italic truncate mt-0.5" title={leave.admin_note}>
                            Catatan: {leave.admin_note}
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-3">
                        {leave.attachment_url ? (
                          <button
                            onClick={() => handleOpenAttachment(leave)}
                            disabled={loadingUrls[leave.id]}
                            className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 rounded-lg text-[10px] sm:text-xs font-semibold hover:bg-blue-100 disabled:opacity-50"
                          >
                            {loadingUrls[leave.id] ? (
                              <>
                                <div className="w-3 h-3 border-2 border-blue-700 border-t-transparent rounded-full animate-spin" />
                                <span>Memuat</span>
                              </>
                            ) : (
                              <>
                                <ExternalLink size={11} />
                                <span>Lihat</span>
                              </>
                            )}
                          </button>
                        ) : (
                          <span className="text-[10px] sm:text-xs text-gray-400">-</span>
                        )}
                      </td>

                      <td className="py-3 px-3">
                        <span className={`text-[10px] sm:text-xs font-semibold px-2 py-1 rounded-full whitespace-nowrap ${
                          leave.status === 'approved' ? 'bg-emerald-100 text-emerald-700' :
                          leave.status === 'rejected' ? 'bg-red-100 text-red-700' :
                          'bg-amber-100 text-amber-700'
                        }`}>
                          {leave.status === 'approved' ? 'Disetujui' : leave.status === 'rejected' ? 'Ditolak' : 'Pending'}
                        </span>
                      </td>

                      <td className="py-3 px-3">
                        {leave.status === 'pending' ? (
                          <div className="flex gap-1">
                            <button
                              onClick={() => handleAction(leave.id, 'approved')}
                              className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-500 text-white rounded-lg text-[10px] sm:text-xs font-semibold hover:bg-emerald-600 whitespace-nowrap"
                            >
                              <Check size={11} /> Setujui
                            </button>
                            <button
                              onClick={() => handleAction(leave.id, 'rejected')}
                              className="inline-flex items-center gap-1 px-2 py-1 bg-red-500 text-white rounded-lg text-[10px] sm:text-xs font-semibold hover:bg-red-600 whitespace-nowrap"
                            >
                              <X size={11} /> Tolak
                            </button>
                          </div>
                        ) : (
                          <span className="text-[10px] sm:text-xs text-gray-400 italic">
                            {leave.approved_at ? fmtDateTime(leave.approved_at) : '-'}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
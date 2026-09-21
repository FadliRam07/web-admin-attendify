import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import Sidebar from '../components/Sidebar';
import { Check, X, FileText, Search, AlertCircle } from 'lucide-react';

export default function LeaveRequests() {
  const [leaves, setLeaves] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [debugMsg, setDebugMsg] = useState('');

  useEffect(() => { fetchLeaves(); }, []);

  useEffect(() => {
    const q = search.toLowerCase();
    setFiltered(leaves.filter((l) => {
      const matchSearch = (l.profiles?.full_name || '').toLowerCase().includes(q) || (l.reason || '').toLowerCase().includes(q);
      const matchStatus = statusFilter === 'all' || l.status === statusFilter;
      return matchSearch && matchStatus;
    }));
  }, [search, statusFilter, leaves]);

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
  const initials = (n) => n ? n.split(' ').map((x) => x[0]).slice(0, 2).join('').toUpperCase() : '?';
  const typeLabel = { leave: 'Cuti', sick: 'Sakit', permission: 'Izin', official_duty: 'Tugas Dinas' };

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 p-4 pt-20 sm:p-6 sm:pt-20 lg:p-8 lg:pt-8 min-w-0">
        <div className="mb-5">
          <h1 className="text-xl sm:text-2xl font-bold text-brand-600">Pengajuan Cuti & Izin</h1>
          <p className="text-gray-500 text-xs sm:text-sm mt-1">Approve atau tolak pengajuan karyawan</p>
        </div>

        {debugMsg && (
          <div className="flex items-start gap-2 bg-red-50 text-red-600 px-4 py-3 rounded-xl mb-5 text-sm border-l-4 border-red-500">
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
            <span className="break-all">{debugMsg}</span>
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-sm p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
            <div className="flex flex-col sm:flex-row gap-2 flex-1">
              <div className="relative w-full sm:max-w-xs">
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input placeholder="Cari nama atau alasan..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full pl-11 pr-4 py-2.5 bg-gray-50 border-[1.5px] border-gray-200 rounded-xl text-sm outline-none focus:border-brand-600 focus:bg-white" />
              </div>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-4 py-2.5 bg-gray-50 border-[1.5px] border-gray-200 rounded-xl text-sm outline-none focus:border-brand-600 focus:bg-white">
                <option value="all">Semua Status</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
            <span className="bg-blue-50 text-blue-700 text-xs font-semibold px-3 py-1 rounded-full self-start">
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
            <div className="space-y-3">
              {filtered.map((leave) => (
                <div key={leave.id} className="border border-gray-200 rounded-xl p-3 sm:p-4 hover:shadow-md transition-shadow">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      {leave.profiles?.avatar_url ? (
                        <img src={leave.profiles.avatar_url} alt="" className="w-10 h-10 sm:w-11 sm:h-11 rounded-full object-cover shrink-0" />
                      ) : (
                        <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-gradient-to-br from-brand-600 to-brand-300 text-white flex items-center justify-center font-semibold text-sm shrink-0">
                          {initials(leave.profiles?.full_name)}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-gray-800 text-sm sm:text-base truncate">{leave.profiles?.full_name || 'Unknown'}</span>
                          <span className="text-[10px] sm:text-xs font-semibold px-2 py-0.5 rounded-full bg-brand-100 text-brand-700 whitespace-nowrap">{typeLabel[leave.type] || leave.type}</span>
                          <span className={`text-[10px] sm:text-xs font-semibold px-2 py-0.5 rounded-full whitespace-nowrap ${
                            leave.status === 'approved' ? 'bg-emerald-100 text-emerald-700' :
                            leave.status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                          }`}>{leave.status}</span>
                        </div>
                        <p className="text-[10px] sm:text-xs text-gray-400 mt-0.5 truncate">{leave.profiles?.email}</p>
                        <p className="text-xs sm:text-sm text-gray-600 mt-2">
                          <strong>{fmtDate(leave.start_date)}</strong> s/d <strong>{fmtDate(leave.end_date)}</strong>
                        </p>
                        <p className="text-xs sm:text-sm text-gray-700 mt-1 break-words">{leave.reason}</p>
                        {leave.attachment_url && (
                          <a href={leave.attachment_url} target="_blank" rel="noreferrer" className="text-[10px] sm:text-xs text-blue-600 underline mt-1 inline-block">📎 Lihat Lampiran</a>
                        )}
                        {leave.admin_note && (
                          <p className="text-[10px] sm:text-xs text-gray-500 mt-1 italic break-words">Catatan admin: {leave.admin_note}</p>
                        )}
                      </div>
                    </div>

                    {leave.status === 'pending' && (
                      <div className="flex gap-2 shrink-0 sm:self-start">
                        <button onClick={() => handleAction(leave.id, 'approved')} className="inline-flex items-center gap-1 px-3 sm:px-4 py-2 bg-emerald-500 text-white rounded-xl text-[10px] sm:text-xs font-semibold hover:bg-emerald-600">
                          <Check size={14} /> Approve
                        </button>
                        <button onClick={() => handleAction(leave.id, 'rejected')} className="inline-flex items-center gap-1 px-3 sm:px-4 py-2 bg-red-500 text-white rounded-xl text-[10px] sm:text-xs font-semibold hover:bg-red-600">
                          <X size={14} /> Tolak
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
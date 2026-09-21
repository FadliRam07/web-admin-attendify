import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import Sidebar from '../components/Sidebar';
import { Users, UserCheck, Clock, UserX, RefreshCw, AlertCircle } from 'lucide-react';
import { fmtTime, fmtFullDate, getTodayWIB } from '../lib/formatTime';

export default function Dashboard() {
  const [stats, setStats] = useState({ total: 0, present: 0, late: 0, absent: 0 });
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [debugMsg, setDebugMsg] = useState('');
  const today = getTodayWIB();

  useEffect(() => {
    fetchData();
    const channel = supabase
      .channel('attendance-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'attendances' }, fetchData)
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setDebugMsg('');

    const { count: total, error: err1 } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'user')
      .eq('status', 'active');

    if (err1) {
      console.error('Err profiles:', err1);
      setDebugMsg(`Error profiles: ${err1.message}`);
    }

    const { data: todayLogs, error: err2 } = await supabase
      .from('attendances')
      .select('*')
      .eq('attendance_date', today)
      .order('check_in', { ascending: false });

    if (err2) {
      console.error('Err attendances:', err2);
      setDebugMsg(`Error attendance: ${err2.message}`);
      setLoading(false);
      return;
    }

    const userIds = [...new Set((todayLogs || []).map((l) => l.user_id))];
    let profMap = {};
    if (userIds.length > 0) {
      const { data: profs } = await supabase
        .from('profiles')
        .select('id, full_name, email, avatar_url')
        .in('id', userIds);
      profMap = Object.fromEntries((profs || []).map((p) => [p.id, p]));
    }

    const joined = (todayLogs || []).map((l) => ({ ...l, profiles: profMap[l.user_id] }));
    setLogs(joined);

    const present = joined.length;
    const late = joined.filter((l) => l.late_minutes > 0).length;

    setStats({
      total: total || 0,
      present,
      late,
      absent: Math.max(0, (total || 0) - present),
    });
    setLoading(false);
  };

  const initials = (n) =>
    n ? n.split(' ').map((x) => x[0]).slice(0, 2).join('').toUpperCase() : '?';

  const cards = [
    { label: 'Total Karyawan', value: stats.total, icon: Users, color: 'bg-brand-100 text-brand-600' },
    { label: 'Hadir Hari Ini', value: stats.present, icon: UserCheck, color: 'bg-emerald-100 text-emerald-600' },
    { label: 'Terlambat', value: stats.late, icon: Clock, color: 'bg-red-100 text-red-600' },
    { label: 'Belum Absen', value: stats.absent, icon: UserX, color: 'bg-blue-100 text-blue-600' },
  ];

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 p-4 pt-20 sm:p-6 sm:pt-20 lg:p-8 lg:pt-8 min-w-0">
        <div className="flex flex-wrap justify-between items-start gap-3 mb-5">
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold text-brand-600">Dashboard</h1>
            <p className="text-gray-500 text-xs sm:text-sm mt-1">
              Ringkasan absensi — {fmtFullDate(new Date())}
            </p>
          </div>
          <button
            onClick={fetchData}
            className="inline-flex items-center gap-2 px-3 sm:px-4 py-2 bg-white border border-gray-200 text-brand-600 text-xs sm:text-sm font-semibold rounded-xl hover:bg-gray-50 shadow-sm"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>

        {debugMsg && (
          <div className="flex items-start gap-2 bg-red-50 text-red-600 px-4 py-3 rounded-xl mb-5 text-sm border-l-4 border-red-500">
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
            <span className="break-all">{debugMsg}</span>
          </div>
        )}

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-5">
          {cards.map((s) => (
            <div
              key={s.label}
              className="bg-white p-3 sm:p-5 rounded-2xl shadow-sm hover:-translate-y-1 hover:shadow-lg transition-all flex items-center gap-2 sm:gap-4"
            >
              <div className={`w-10 h-10 sm:w-14 sm:h-14 rounded-xl flex items-center justify-center shrink-0 ${s.color}`}>
                <s.icon size={20} className="sm:hidden" />
                <s.icon size={24} className="hidden sm:block" />
              </div>
              <div className="min-w-0">
                <p className="text-gray-400 text-[10px] sm:text-xs uppercase font-medium tracking-wide truncate">
                  {s.label}
                </p>
                <p className="text-lg sm:text-2xl font-bold text-brand-600 mt-0.5">{s.value}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-4 sm:p-6">
          <div className="flex items-center justify-between mb-4 sm:mb-5">
            <h3 className="text-brand-600 font-bold text-sm sm:text-base">Log Absensi Hari Ini</h3>
            <span className="bg-blue-50 text-blue-700 text-[10px] sm:text-xs font-semibold px-2 sm:px-3 py-1 rounded-full">
              {logs.length} record
            </span>
          </div>

          {loading ? (
            <div className="py-12 flex flex-col items-center text-gray-400">
              <div className="w-10 h-10 border-4 border-gray-200 border-t-brand-600 rounded-full animate-spin mb-3" />
              <span className="text-sm">Memuat data...</span>
            </div>
          ) : logs.length === 0 ? (
            <div className="py-12 text-center text-gray-400 text-sm">Belum ada absensi hari ini</div>
          ) : (
            <div className="overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0">
              <table className="w-full text-xs sm:text-sm min-w-[600px]">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-3 text-brand-600 text-[10px] sm:text-xs uppercase font-semibold">Karyawan</th>
                    <th className="text-left py-3 px-3 text-brand-600 text-[10px] sm:text-xs uppercase font-semibold">Check In</th>
                    <th className="text-left py-3 px-3 text-brand-600 text-[10px] sm:text-xs uppercase font-semibold">Check Out</th>
                    <th className="text-left py-3 px-3 text-brand-600 text-[10px] sm:text-xs uppercase font-semibold">Telat</th>
                    <th className="text-left py-3 px-3 text-brand-600 text-[10px] sm:text-xs uppercase font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
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
                      <td className="py-3 px-3 whitespace-nowrap">{fmtTime(log.check_in)}</td>
                      <td className="py-3 px-3 whitespace-nowrap">{fmtTime(log.check_out)}</td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        {log.late_minutes > 0 ? (
                          <span className="text-red-600 font-semibold">{log.late_minutes} mnt</span>
                        ) : (
                          <span className="text-emerald-600">-</span>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`text-[10px] sm:text-xs font-semibold px-2 sm:px-3 py-1 rounded-full whitespace-nowrap ${
                            log.late_minutes > 0 ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'
                          }`}
                        >
                          {log.late_minutes > 0 ? 'Terlambat' : 'Tepat Waktu'}
                        </span>
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
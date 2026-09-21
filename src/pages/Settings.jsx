import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import Sidebar from '../components/Sidebar';
import { Save, Clock, MapPin, AlertCircle, CheckCircle } from 'lucide-react';

export default function Settings() {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);

  useEffect(() => { fetchSettings(); }, []);

  const fetchSettings = async () => {
    setLoading(true);
    const { data } = await supabase.from('office_settings').select('*').limit(1).maybeSingle();
    setSettings(data);
    setLoading(false);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    try {
      const { id, created_at, updated_at, ...payload } = settings;
      const { error } = await supabase.from('office_settings').update(payload).eq('id', id);
      if (error) throw error;
      setMsg({ type: 'success', text: 'Pengaturan berhasil disimpan!' });
      setTimeout(() => setMsg(null), 3000);
    } catch (err) {
      setMsg({ type: 'error', text: 'Gagal: ' + err.message });
    } finally {
      setSaving(false);
    }
  };

  const update = (k, v) => setSettings((s) => ({ ...s, [k]: v }));

  if (loading) return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 p-4 pt-20 sm:p-6 sm:pt-20 lg:p-8 lg:pt-8 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-gray-200 border-t-brand-600 rounded-full animate-spin" />
      </main>
    </div>
  );

  if (!settings) return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 p-4 pt-20 sm:p-6 sm:pt-20 lg:p-8 lg:pt-8">
        <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-xl text-amber-700">
          Tabel <code>office_settings</code> belum ada data.
        </div>
      </main>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 p-4 pt-20 sm:p-6 sm:pt-20 lg:p-8 lg:pt-8 min-w-0">
        <div className="mb-5">
          <h1 className="text-xl sm:text-2xl font-bold text-brand-600">Pengaturan</h1>
          <p className="text-gray-500 text-xs sm:text-sm mt-1">Konfigurasi jam kerja & lokasi kantor</p>
        </div>

        {msg && (
          <div className={`flex items-center gap-2 px-4 py-3 rounded-xl mb-5 text-sm border-l-4 animate-fadeIn ${
            msg.type === 'success' ? 'bg-emerald-50 text-emerald-700 border-emerald-500' : 'bg-red-50 text-red-600 border-red-500'
          }`}>
            {msg.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
            {msg.text}
          </div>
        )}

        <form onSubmit={handleSave}>
          <div className="bg-white rounded-2xl shadow-sm p-4 sm:p-6 mb-5">
            <div className="flex items-center gap-2 text-brand-600 font-bold mb-5 text-sm sm:text-base">
              <Clock size={18} /> Jam Kerja & Toleransi
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <Input label="Nama Kantor" value={settings.office_name} onChange={(v) => update('office_name', v)} />
              <Input label="Check In Mulai" type="time" value={settings.check_in_start} onChange={(v) => update('check_in_start', v)} />
              <Input label="Check In Selesai" type="time" value={settings.check_in_end} onChange={(v) => update('check_in_end', v)} />
              <Input label="Check Out Mulai" type="time" value={settings.check_out_start} onChange={(v) => update('check_out_start', v)} />
              <Input label="Check Out Selesai" type="time" value={settings.check_out_end} onChange={(v) => update('check_out_end', v)} />
              <Input label="Toleransi Telat (menit)" type="number" value={settings.late_tolerance_minutes} onChange={(v) => update('late_tolerance_minutes', parseInt(v) || 0)} />
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm p-4 sm:p-6 mb-5">
            <div className="flex items-center gap-2 text-brand-600 font-bold mb-5 text-sm sm:text-base">
              <MapPin size={18} /> Lokasi Kantor (Geofencing)
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <Input label="Latitude" type="number" step="any" value={settings.latitude} onChange={(v) => update('latitude', parseFloat(v))} />
              <Input label="Longitude" type="number" step="any" value={settings.longitude} onChange={(v) => update('longitude', parseFloat(v))} />
              <Input label="Radius (meter)" type="number" value={settings.radius_meter} onChange={(v) => update('radius_meter', parseInt(v) || 0)} />
            </div>
            <p className="text-xs text-gray-400 mt-3">💡 Karyawan hanya bisa absen dalam radius ini dari kantor.</p>
          </div>

          <button type="submit" disabled={saving} className="inline-flex items-center gap-2 px-5 sm:px-6 py-3 bg-gradient-to-br from-brand-600 to-brand-500 text-white font-semibold text-sm rounded-xl hover:-translate-y-0.5 hover:shadow-lg disabled:opacity-60 w-full sm:w-auto justify-center">
            <Save size={16} /> {saving ? 'Menyimpan...' : 'Simpan Pengaturan'}
          </button>
        </form>
      </main>
    </div>
  );
}

function Input({ label, value, onChange, type = 'text', step }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-500 mb-1.5">{label}</label>
      <input
        type={type}
        step={step}
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-4 py-3 bg-gray-50 border-[1.5px] border-gray-200 rounded-xl text-sm outline-none focus:border-brand-600 focus:bg-white focus:ring-4 focus:ring-brand-600/10"
      />
    </div>
  );
}
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import Sidebar from '../components/Sidebar';
import { Pencil, Trash2, Search, X } from 'lucide-react';

export default function Employees() {
  const [employees, setEmployees] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [depts, setDepts] = useState([]);
  const [positions, setPositions] = useState([]);

  useEffect(() => {
    fetchAll();
  }, []);

  useEffect(() => {
    const q = search.toLowerCase();
    setFiltered(
      employees.filter(
        (e) =>
          (e.full_name || '').toLowerCase().includes(q) ||
          (e.email || '').toLowerCase().includes(q) ||
          (e.nik || '').toLowerCase().includes(q)
      )
    );
  }, [search, employees]);

  const fetchAll = async () => {
    setLoading(true);
    const [emp, d, p] = await Promise.all([
      supabase.from('profiles').select('*').order('full_name'),
      supabase.from('departments').select('*').order('name'),
      supabase.from('positions').select('*').order('name'),
    ]);
    setEmployees(emp.data || []);
    setDepts(d.data || []);
    setPositions(p.data || []);
    setLoading(false);
  };

  const openModal = (emp) => {
    setEditing(emp);
    setForm({
      full_name: emp.full_name || '',
      nik: emp.nik || '',
      phone: emp.phone || '',
      gender: emp.gender || '',
      address: emp.address || '',
      birth_date: emp.birth_date || '',
      department_id: emp.department_id || '',
      position_id: emp.position_id || '',
      role: emp.role || 'user',
      status: emp.status || 'active',
    });
    setModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { ...form };
      if (!payload.birth_date) payload.birth_date = null;
      if (!payload.department_id) payload.department_id = null;
      if (!payload.position_id) payload.position_id = null;

      const { error } = await supabase.from('profiles').update(payload).eq('id', editing.id);
      if (error) throw error;
      setModalOpen(false);
      fetchAll();
    } catch (err) {
      alert('Gagal: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Yakin hapus data ini?')) return;
    const { error } = await supabase.from('profiles').delete().eq('id', id);
    if (error) alert('Gagal: ' + error.message);
    else fetchAll();
  };

  const initials = (n) =>
    n ? n.split(' ').map((x) => x[0]).slice(0, 2).join('').toUpperCase() : '?';
  const getDeptName = (id) => depts.find((d) => d.id === id)?.name || '-';
  const getPosName = (id) => positions.find((p) => p.id === id)?.name || '-';

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 p-4 pt-20 sm:p-6 sm:pt-20 lg:p-8 lg:pt-8 min-w-0">
        <div className="mb-5">
          <h1 className="text-xl sm:text-2xl font-bold text-brand-600">Data Karyawan</h1>
          <p className="text-gray-500 text-xs sm:text-sm mt-1">Kelola data seluruh karyawan Attendify</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
            <div className="relative w-full sm:max-w-sm">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                placeholder="Cari nama, email, atau NIK..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-11 pr-4 py-2.5 bg-gray-50 border-[1.5px] border-gray-200 rounded-xl text-sm outline-none focus:border-brand-600 focus:bg-white"
              />
            </div>
            <span className="bg-blue-50 text-blue-700 text-xs font-semibold px-3 py-1 rounded-full self-start">
              {filtered.length} karyawan
            </span>
          </div>

          {loading ? (
            <div className="py-12 flex flex-col items-center text-gray-400">
              <div className="w-10 h-10 border-4 border-gray-200 border-t-brand-600 rounded-full animate-spin mb-3" />
              Memuat data...
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center text-gray-400 text-sm">Tidak ada data karyawan</div>
          ) : (
            <div className="overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0">
              <table className="w-full text-xs sm:text-sm min-w-[700px]">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-3 text-brand-600 text-[10px] sm:text-xs uppercase font-semibold">Nama</th>
                    <th className="text-left py-3 px-3 text-brand-600 text-[10px] sm:text-xs uppercase font-semibold">NIK</th>
                    <th className="text-left py-3 px-3 text-brand-600 text-[10px] sm:text-xs uppercase font-semibold">Departemen</th>
                    <th className="text-left py-3 px-3 text-brand-600 text-[10px] sm:text-xs uppercase font-semibold">Jabatan</th>
                    <th className="text-left py-3 px-3 text-brand-600 text-[10px] sm:text-xs uppercase font-semibold">Role</th>
                    <th className="text-left py-3 px-3 text-brand-600 text-[10px] sm:text-xs uppercase font-semibold">Status</th>
                    <th className="text-left py-3 px-3 text-brand-600 text-[10px] sm:text-xs uppercase font-semibold">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((emp) => (
                    <tr key={emp.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2 sm:gap-3">
                          {emp.avatar_url ? (
                            <img src={emp.avatar_url} alt="" className="w-8 h-8 sm:w-9 sm:h-9 rounded-full object-cover shrink-0" />
                          ) : (
                            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-gradient-to-br from-brand-600 to-brand-300 text-white flex items-center justify-center font-semibold text-xs shrink-0">
                              {initials(emp.full_name)}
                            </div>
                          )}
                          <div className="min-w-0">
                            <div className="font-semibold text-gray-800 truncate">{emp.full_name}</div>
                            <div className="text-[10px] sm:text-xs text-gray-400 truncate">{emp.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-gray-600 whitespace-nowrap">{emp.nik || '-'}</td>
                      <td className="py-3 px-3 text-gray-600 whitespace-nowrap">{getDeptName(emp.department_id)}</td>
                      <td className="py-3 px-3 text-gray-600 whitespace-nowrap">{getPosName(emp.position_id)}</td>
                      <td className="py-3 px-3">
                        <span className={`text-[10px] sm:text-xs font-semibold px-2 sm:px-3 py-1 rounded-full ${
                          emp.role === 'admin' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-700'
                        }`}>{emp.role}</span>
                      </td>
                      <td className="py-3 px-3">
                        <span className={`text-[10px] sm:text-xs font-semibold px-2 sm:px-3 py-1 rounded-full ${
                          emp.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                        }`}>{emp.status}</span>
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex gap-1">
                          <button onClick={() => openModal(emp)} className="inline-flex items-center gap-1 px-2 sm:px-3 py-1.5 bg-amber-100 text-amber-700 rounded-lg text-[10px] sm:text-xs font-semibold hover:bg-amber-500 hover:text-white transition-colors">
                            <Pencil size={12} />
                          </button>
                          <button onClick={() => handleDelete(emp.id)} className="inline-flex items-center gap-1 px-2 sm:px-3 py-1.5 bg-red-100 text-red-700 rounded-lg text-[10px] sm:text-xs font-semibold hover:bg-red-500 hover:text-white transition-colors">
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 animate-fadeIn" onClick={() => setModalOpen(false)}>
          <div className="bg-white rounded-2xl p-5 sm:p-7 w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl animate-slideUp" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-brand-600 font-bold text-base sm:text-lg">Edit Karyawan</h3>
              <button onClick={() => setModalOpen(false)} className="text-gray-400 hover:text-gray-700"><X size={20} /></button>
            </div>

            <form onSubmit={handleSave} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Nama Lengkap" value={form.full_name} onChange={(v) => setForm({ ...form, full_name: v })} required />
              <Field label="NIK" value={form.nik} onChange={(v) => setForm({ ...form, nik: v })} />
              <Field label="Phone" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} />
              <Field label="Tanggal Lahir" type="date" value={form.birth_date} onChange={(v) => setForm({ ...form, birth_date: v })} />
              <div>
                <label className="block text-xs font-semibold text-brand-600 mb-1.5">Gender</label>
                <select value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })} className="w-full px-4 py-3 bg-gray-50 border-[1.5px] border-gray-200 rounded-xl text-sm outline-none focus:border-brand-600 focus:bg-white">
                  <option value="">- Pilih -</option>
                  <option value="male">Laki-laki</option>
                  <option value="female">Perempuan</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-brand-600 mb-1.5">Departemen</label>
                <select value={form.department_id} onChange={(e) => setForm({ ...form, department_id: e.target.value })} className="w-full px-4 py-3 bg-gray-50 border-[1.5px] border-gray-200 rounded-xl text-sm outline-none focus:border-brand-600 focus:bg-white">
                  <option value="">- Pilih -</option>
                  {depts.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-brand-600 mb-1.5">Jabatan</label>
                <select value={form.position_id} onChange={(e) => setForm({ ...form, position_id: e.target.value })} className="w-full px-4 py-3 bg-gray-50 border-[1.5px] border-gray-200 rounded-xl text-sm outline-none focus:border-brand-600 focus:bg-white">
                  <option value="">- Pilih -</option>
                  {positions.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-brand-600 mb-1.5">Role</label>
                <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className="w-full px-4 py-3 bg-gray-50 border-[1.5px] border-gray-200 rounded-xl text-sm outline-none focus:border-brand-600 focus:bg-white">
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-brand-600 mb-1.5">Status</label>
                <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="w-full px-4 py-3 bg-gray-50 border-[1.5px] border-gray-200 rounded-xl text-sm outline-none focus:border-brand-600 focus:bg-white">
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-brand-600 mb-1.5">Alamat</label>
                <textarea value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} rows={2} className="w-full px-4 py-3 bg-gray-50 border-[1.5px] border-gray-200 rounded-xl text-sm outline-none focus:border-brand-600 focus:bg-white" />
              </div>

              <div className="sm:col-span-2 flex gap-2.5 pt-2">
                <button type="button" onClick={() => setModalOpen(false)} className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold text-sm hover:bg-gray-200">Batal</button>
                <button type="submit" disabled={saving} className="flex-1 py-3 bg-gradient-to-br from-brand-600 to-brand-500 text-white rounded-xl font-semibold text-sm hover:shadow-lg disabled:opacity-60">
                  {saving ? 'Menyimpan...' : 'Simpan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, value, onChange, type = 'text', required }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-brand-600 mb-1.5">{label}</label>
      <input type={type} value={value || ''} onChange={(e) => onChange(e.target.value)} required={required} className="w-full px-4 py-3 bg-gray-50 border-[1.5px] border-gray-200 rounded-xl text-sm outline-none focus:border-brand-600 focus:bg-white" />
    </div>
  );
}
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import Sidebar from '../components/Sidebar';
import { Plus, Pencil, Trash2, X, Megaphone, AlertCircle, CheckCircle, ExternalLink, Copy } from 'lucide-react';

export default function Announcements() {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);
  const [form, setForm] = useState({
    title: '',
    message: '',
    priority: 'normal',
    link_url: '',
    is_active: true,
  });

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const fetchAnnouncements = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('announcements')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) console.error(error);
    else setAnnouncements(data || []);
    setLoading(false);
  };

  const openModal = (ann = null) => {
    if (ann) {
      setEditing(ann);
      setForm({
        title: ann.title,
        message: ann.message,
        priority: ann.priority || 'normal',
        link_url: ann.link_url || '',
        is_active: ann.is_active ?? true,
      });
    } else {
      setEditing(null);
      setForm({ title: '', message: '', priority: 'normal', link_url: '', is_active: true });
    }
    setModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMsg(null);

    try {
      let linkUrl = form.link_url.trim();
      if (linkUrl && !linkUrl.startsWith('http://') && !linkUrl.startsWith('https://')) {
        linkUrl = 'https://' + linkUrl;
      }

      if (editing) {
        const { error } = await supabase
          .from('announcements')
          .update({
            title: form.title,
            message: form.message,
            priority: form.priority,
            link_url: linkUrl || null,
            is_active: form.is_active,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editing.id);
        if (error) throw error;
        setMsg({ type: 'success', text: 'Pengumuman berhasil diperbarui!' });
      } else {
        const { data: { session } } = await supabase.auth.getSession();
        const { error } = await supabase.from('announcements').insert({
          title: form.title,
          message: form.message,
          priority: form.priority,
          link_url: linkUrl || null,
          is_active: form.is_active,
          created_by: session?.user?.id,
        });
        if (error) throw error;
        setMsg({ type: 'success', text: 'Pengumuman berhasil dikirim ke semua user!' });
      }

      setModalOpen(false);
      fetchAnnouncements();
      setTimeout(() => setMsg(null), 4000);
    } catch (err) {
      setMsg({ type: 'error', text: 'Gagal menyimpan: ' + err.message });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Yakin hapus pengumuman ini?')) return;
    const { error } = await supabase.from('announcements').delete().eq('id', id);
    if (error) alert('Gagal: ' + error.message);
    else fetchAnnouncements();
  };

  const toggleActive = async (ann) => {
    const { error } = await supabase
      .from('announcements')
      .update({ is_active: !ann.is_active })
      .eq('id', ann.id);
    if (error) alert('Gagal: ' + error.message);
    else fetchAnnouncements();
  };

  const copyLink = (url) => {
    navigator.clipboard.writeText(url).then(() => {
      setMsg({ type: 'success', text: 'Link berhasil disalin!' });
      setTimeout(() => setMsg(null), 2000);
    }).catch(() => {
      alert('Gagal menyalin link');
    });
  };

  const fmtDate = (d) =>
    d ? new Date(d).toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }) : '-';

  const getPriorityStyle = (priority) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-100 text-red-700 border-red-300';
      case 'important':
        return 'bg-amber-100 text-amber-700 border-amber-300';
      default:
        return 'bg-blue-100 text-blue-700 border-blue-300';
    }
  };

  const getPriorityLabel = (priority) => {
    switch (priority) {
      case 'urgent':
        return 'PENTING';
      case 'important':
        return 'PERHATIAN';
      default:
        return 'INFO';
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 p-4 pt-20 sm:p-6 sm:pt-20 lg:p-8 lg:pt-8 min-w-0">
        <div className="flex flex-wrap justify-between items-center gap-3 mb-5">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-brand-600">Pengumuman</h1>
            <p className="text-gray-500 text-xs sm:text-sm mt-1">
              Kirim informasi ke semua user aplikasi
            </p>
          </div>
          <button
            onClick={() => openModal()}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-br from-brand-600 to-brand-500 text-white font-semibold text-sm rounded-xl hover:-translate-y-0.5 hover:shadow-lg"
          >
            <Plus size={16} /> Buat Pengumuman
          </button>
        </div>

        {msg && (
          <div className={`flex items-center gap-2 px-4 py-3 rounded-xl mb-5 text-sm border-l-4 ${
            msg.type === 'success' ? 'bg-emerald-50 text-emerald-700 border-emerald-500' : 'bg-red-50 text-red-600 border-red-500'
          }`}>
            {msg.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
            {msg.text}
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-sm p-4 sm:p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-brand-600 font-bold text-sm sm:text-base">Daftar Pengumuman</h3>
            <span className="bg-blue-50 text-blue-700 text-xs font-semibold px-3 py-1 rounded-full">
              {announcements.length} pengumuman
            </span>
          </div>

          {loading ? (
            <div className="py-12 flex flex-col items-center text-gray-400">
              <div className="w-10 h-10 border-4 border-gray-200 border-t-brand-600 rounded-full animate-spin mb-3" />
              Memuat data...
            </div>
          ) : announcements.length === 0 ? (
            <div className="py-12 text-center text-gray-400 text-sm flex flex-col items-center gap-2">
              <Megaphone size={40} className="text-gray-300" />
              Belum ada pengumuman
            </div>
          ) : (
            <div className="space-y-3">
              {announcements.map((ann) => (
                <div key={ann.id} className="border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1.5">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getPriorityStyle(ann.priority)}`}>
                          {getPriorityLabel(ann.priority)}
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          ann.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'
                        }`}>
                          {ann.is_active ? 'AKTIF' : 'NONAKTIF'}
                        </span>
                      </div>
                      <h4 className="font-bold text-gray-800 text-sm sm:text-base">{ann.title}</h4>
                      <p className="text-xs sm:text-sm text-gray-600 mt-1 break-words">{ann.message}</p>
                      
                      {ann.link_url && (
                        <div className="mt-3 flex flex-wrap items-center gap-2 p-2 bg-blue-50 rounded-lg">
                          <ExternalLink size={14} className="text-blue-600 shrink-0" />
                          <a
                            href={ann.link_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-blue-700 underline font-medium truncate flex-1 min-w-0"
                            title={ann.link_url}
                          >
                            {ann.link_url}
                          </a>
                          <button
                            onClick={() => copyLink(ann.link_url)}
                            className="inline-flex items-center gap-1 px-2 py-1 bg-white border border-blue-200 text-blue-700 rounded-md text-[10px] font-semibold hover:bg-blue-100 shrink-0"
                            title="Salin link"
                          >
                            <Copy size={11} /> Salin
                          </button>
                        </div>
                      )}

                      <p className="text-[10px] sm:text-xs text-gray-400 mt-2">{fmtDate(ann.created_at)}</p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <button
                        onClick={() => toggleActive(ann)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
                          ann.is_active
                            ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                        }`}
                      >
                        {ann.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                      </button>
                      <button
                        onClick={() => openModal(ann)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-amber-100 text-amber-700 rounded-lg text-xs font-semibold hover:bg-amber-500 hover:text-white"
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        onClick={() => handleDelete(ann.id)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-red-100 text-red-700 rounded-lg text-xs font-semibold hover:bg-red-500 hover:text-white"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 animate-fadeIn" onClick={() => setModalOpen(false)}>
          <div className="bg-white rounded-2xl p-5 sm:p-7 w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-brand-600 font-bold text-base sm:text-lg">
                {editing ? 'Edit Pengumuman' : 'Buat Pengumuman'}
              </h3>
              <button onClick={() => setModalOpen(false)} className="text-gray-400 hover:text-gray-700">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-brand-600 mb-1.5">Judul</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  required
                  placeholder="Contoh: Rapat bulanan"
                  className="w-full px-4 py-3 bg-gray-50 border-[1.5px] border-gray-200 rounded-xl text-sm outline-none focus:border-brand-600 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-brand-600 mb-1.5">Isi Pengumuman</label>
                <textarea
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                  required
                  rows={4}
                  placeholder="Tulis isi pengumuman di sini..."
                  className="w-full px-4 py-3 bg-gray-50 border-[1.5px] border-gray-200 rounded-xl text-sm outline-none focus:border-brand-600 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-brand-600 mb-1.5">
                  Link (Opsional)
                </label>
                <input
                  type="text"
                  value={form.link_url}
                  onChange={(e) => setForm({ ...form, link_url: e.target.value })}
                  placeholder="https://contoh.com/info-penting"
                  className="w-full px-4 py-3 bg-gray-50 border-[1.5px] border-gray-200 rounded-xl text-sm outline-none focus:border-brand-600 focus:bg-white"
                />
                <p className="text-[10px] text-gray-400 mt-1">
                  💡 Link akan otomatis ditambahkan <code>https://</code> jika belum ada. User bisa klik atau salin link ini.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-brand-600 mb-1.5">Prioritas</label>
                <select
                  value={form.priority}
                  onChange={(e) => setForm({ ...form, priority: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-50 border-[1.5px] border-gray-200 rounded-xl text-sm outline-none focus:border-brand-600 focus:bg-white"
                >
                  <option value="normal">Info (Normal)</option>
                  <option value="important">Perhatian (Kuning)</option>
                  <option value="urgent">Penting (Merah)</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={form.is_active}
                  onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                  className="w-4 h-4"
                />
                <label htmlFor="is_active" className="text-sm text-gray-700 font-medium">
                  Aktifkan (langsung tampil di aplikasi user)
                </label>
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold text-sm hover:bg-gray-200"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-3 bg-gradient-to-br from-brand-600 to-brand-500 text-white rounded-xl font-semibold text-sm hover:shadow-lg disabled:opacity-60"
                >
                  {saving ? 'Menyimpan...' : 'Simpan & Kirim'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  CalendarCheck,
  FileText,
  Settings as SettingsIcon,
  LogOut,
  Menu,
  X,
  Megaphone,  // ← TAMBAH
} from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

const menus = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/employees', label: 'Data Karyawan', icon: Users },
  { to: '/attendance', label: 'Rekap Absensi', icon: CalendarCheck },
  { to: '/leave', label: 'Pengajuan Cuti', icon: FileText },
  { to: '/announcements', label: 'Pengumuman', icon: Megaphone },  // ← TAMBAH
  { to: '/settings', label: 'Pengaturan', icon: SettingsIcon },
];

export default function Sidebar() {
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = async () => {
    if (!window.confirm('Yakin ingin logout?')) return;
    await supabase.auth.signOut();
    navigate('/login');
  };

  const closeMobile = () => setMobileOpen(false);

  return (
    <>
      {/* ============ MOBILE TOP BAR ============ */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-brand-800 text-white px-4 py-3 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-brand-300 text-brand-700 rounded-lg flex items-center justify-center font-bold">
            A
          </div>
          <div>
            <h2 className="font-bold text-sm leading-tight">Attendify</h2>
            <p className="text-[10px] opacity-70">Admin Panel</p>
          </div>
        </div>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="p-2 rounded-lg hover:bg-white/10 transition-colors"
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* ============ MOBILE OVERLAY ============ */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/50 animate-fadeIn"
          onClick={closeMobile}
        />
      )}

      {/* ============ SIDEBAR ============ */}
      <aside
        className={`
          fixed lg:sticky top-0 left-0 z-50 h-screen
          w-64 bg-gradient-to-b from-brand-800 to-brand-600 text-white
          flex flex-col p-5
          transition-transform duration-300 ease-in-out
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        {/* Brand */}
        <div className="flex items-center justify-between gap-3 mb-9 px-2">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-brand-300 text-brand-700 rounded-xl flex items-center justify-center font-bold text-xl shadow-lg shrink-0">
              A
            </div>
            <div>
              <h2 className="font-bold text-lg leading-tight">Attendify</h2>
              <p className="text-[11px] opacity-70">Admin Panel</p>
            </div>
          </div>
          {/* Close button di dalam sidebar (mobile) */}
          <button
            onClick={closeMobile}
            className="lg:hidden p-1.5 rounded-lg hover:bg-white/10 transition-colors"
            aria-label="Close menu"
          >
            <X size={20} />
          </button>
        </div>

        {/* Menu */}
        <nav className="flex-1 flex flex-col gap-1">
          {menus.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              onClick={closeMobile}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-brand-300 text-brand-700 font-semibold shadow-lg shadow-brand-300/30'
                    : 'text-white/75 hover:bg-white/10 hover:text-white'
                }`
              }
            >
              <Icon size={18} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="mt-auto flex items-center justify-center gap-2 py-3 rounded-xl bg-red-500/15 text-red-200 border border-red-500/30 hover:bg-red-500 hover:text-white transition-all text-sm font-semibold"
        >
          <LogOut size={16} />
          <span>Logout</span>
        </button>
      </aside>
    </>
  );
}
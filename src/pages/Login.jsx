import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { Mail, Lock, Eye, EyeOff, AlertCircle, Fingerprint } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password });
    if (authError) {
      setError(authError.message === 'Invalid login credentials' ? 'Email atau password salah.' : authError.message);
      setLoading(false);
      return;
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role, status')
      .eq('id', data.user.id)
      .single();

    if (profile?.role !== 'admin') {
      await supabase.auth.signOut();
      setError('Akses ditolak. Akun ini bukan admin.');
      setLoading(false);
      return;
    }

    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-5 bg-gradient-to-br from-brand-800 via-brand-600 to-brand-500 relative overflow-hidden">
      <div className="absolute -top-48 -right-48 w-[600px] h-[600px] rounded-full bg-brand-300/10 blur-3xl" />
      <div className="absolute -bottom-40 -left-40 w-[400px] h-[400px] rounded-full bg-brand-300/10 blur-3xl" />

      <div className="relative z-10 w-full max-w-md bg-white rounded-3xl shadow-2xl p-10 max-md:p-7 animate-slideUp">
        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-brand-600 to-brand-500 text-brand-300 mx-auto mb-5 flex items-center justify-center shadow-lg shadow-brand-600/30">
          <Fingerprint size={30} />
        </div>
        <h1 className="text-3xl font-bold text-brand-600 text-center mb-1">Attendify</h1>
        <p className="text-center text-gray-500 text-sm mb-8">Masuk ke Admin Panel</p>

        {error && (
          <div className="flex items-start gap-2 bg-red-50 text-red-600 px-4 py-3 rounded-xl mb-5 text-sm border-l-4 border-red-500">
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-brand-600 mb-1.5">Email</label>
            <div className="relative">
              <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@attendify.com"
                required
                className="w-full pl-11 pr-4 py-3 bg-gray-50 border-[1.5px] border-gray-200 rounded-xl text-sm outline-none focus:border-brand-600 focus:bg-white focus:ring-4 focus:ring-brand-600/10 transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-brand-600 mb-1.5">Password</label>
            <div className="relative">
              <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type={showPw ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full pl-11 pr-11 py-3 bg-gray-50 border-[1.5px] border-gray-200 rounded-xl text-sm outline-none focus:border-brand-600 focus:bg-white focus:ring-4 focus:ring-brand-600/10 transition-all"
              />
              <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-brand-600">
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button type="submit" disabled={loading} className="w-full py-3.5 bg-gradient-to-br from-brand-600 to-brand-500 text-white font-semibold rounded-xl hover:-translate-y-0.5 hover:shadow-xl hover:shadow-brand-600/30 disabled:opacity-60 transition-all">
            {loading ? 'Memproses...' : 'Login'}
          </button>
        </form>
        <p className="text-center text-xs text-gray-400 mt-6">© 2026 Attendify Admin Panel</p>
      </div>
    </div>
  );
}
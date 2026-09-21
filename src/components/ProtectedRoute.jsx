import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';

export default function ProtectedRoute({ children }) {
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    checkAdmin();
    const { data: listener } = supabase.auth.onAuthStateChange(() => checkAdmin());
    return () => listener.subscription.unsubscribe();
  }, []);

  const checkAdmin = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      setIsAdmin(false);
      setLoading(false);
      return;
    }
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .single();
    setIsAdmin(profile?.role === 'admin');
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3 text-gray-400">
          <div className="w-10 h-10 border-4 border-gray-200 border-t-brand-600 rounded-full animate-spin" />
          <span className="text-sm">Memverifikasi akses...</span>
        </div>
      </div>
    );
  }

  if (!isAdmin) return <Navigate to="/login" replace />;
  return children;
}
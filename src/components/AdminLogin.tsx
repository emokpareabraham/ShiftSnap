import React, { useState } from 'react';
import { Lock, Mail, AlertCircle, UserCircle, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';

interface AdminLoginProps {
  onLogin: (user: any) => void;
  isSuper?: boolean;
}

export const AdminLogin: React.FC<AdminLoginProps> = ({ onLogin, isSuper = false }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const endpoint = isSuper ? '/api/super/auth' : '/api/auth/admin';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await res.json();
      if (res.ok) {
        onLogin(isSuper ? true : data.user);
      } else {
        setError(data.error || 'Invalid email or password');
      }
    } catch (err) {
      setError('Connection error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 bg-black">
      <div className="w-full max-w-md bg-zinc-900 p-8 rounded-3xl border border-zinc-800 shadow-2xl space-y-8">
        <div className="text-center space-y-2">
          <div className="w-16 h-16 bg-emerald-600/10 text-emerald-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
            {isSuper ? <ShieldCheck size={32} /> : <Lock size={32} />}
          </div>
          <h1 className="text-3xl font-bold text-white">
            {isSuper ? 'Super Admin' : 'Admin Login'}
          </h1>
          <p className="text-zinc-400">
            {isSuper ? 'Manage platform organizations' : 'Access business dashboard'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-500 ml-1">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={20} />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-black border border-zinc-800 rounded-2xl py-4 pl-12 pr-4 text-white focus:outline-none focus:border-emerald-500 transition-all"
                  placeholder="admin@example.com"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-500 ml-1">Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={20} />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-black border border-zinc-800 rounded-2xl py-4 pl-12 pr-12 text-white focus:outline-none focus:border-emerald-500 transition-all"
                  placeholder="Enter password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>
          </div>

          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center space-x-3 text-red-500 text-sm">
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-4">
            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-bold text-lg transition-all shadow-lg active:scale-95 disabled:opacity-50"
            >
              {loading ? 'Logging in...' : 'Login to Dashboard'}
            </button>
          </div>
        </form>

        <div className="pt-4 border-t border-zinc-800 flex flex-col space-y-3">
          <Link
            to="/"
            className="flex items-center justify-center space-x-2 text-zinc-500 hover:text-zinc-300 transition-all"
          >
            <UserCircle size={18} />
            <span className="text-sm font-medium">Switch to Staff Login</span>
          </Link>
          {!isSuper && (
            <Link
              to="/super-admin"
              className="text-center text-xs text-zinc-600 hover:text-zinc-400 transition-all"
            >
              Platform Super Admin? Login here
            </Link>
          )}
        </div>
      </div>
    </div>
  );
};

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link, useParams } from 'react-router-dom';
import { PinPad } from './components/PinPad';
import { EmployeeDashboard } from './components/EmployeeDashboard';
import { AdminLogin } from './components/AdminLogin';
import { AdminDashboard } from './components/AdminDashboard';
import { SuperAdminDashboard } from './components/SuperAdminDashboard';
import { SetupAccount } from './components/SetupAccount';
import { Shield, Loader2, Search, ArrowRight } from 'lucide-react';
import { OrganizationProvider, useOrganization } from './context/OrganizationContext';
import { User } from './types';

const LandingPage = () => {
  const [slug, setSlug] = useState('');
  const [error, setError] = useState('');

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!slug) return;
    
    try {
      const res = await fetch(`/api/config/${slug}`);
      if (res.ok) {
        window.location.href = `/${slug}`;
      } else {
        setError('Organization not found. Please check the slug.');
      }
    } catch (err) {
      setError('Connection error');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-black text-white">
      <div className="w-full max-w-md space-y-8 text-center">
        <div className="space-y-4">
          <div className="w-20 h-20 bg-emerald-600 rounded-3xl flex items-center justify-center shadow-2xl shadow-emerald-900/40 mx-auto transform -rotate-6">
            <Shield size={40} className="text-white" />
          </div>
          <h1 className="text-4xl font-black tracking-tighter uppercase italic">ShiftSnap</h1>
          <p className="text-zinc-500 font-medium">Multi-tenant staff clock-in platform</p>
        </div>

        <form onSubmit={handleSearch} className="space-y-4">
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600 group-focus-within:text-emerald-500 transition-colors" size={20} />
            <input 
              type="text"
              placeholder="Enter organization slug..."
              value={slug}
              onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/\s+/g, '-'))}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl py-4 pl-12 pr-4 focus:outline-none focus:border-emerald-500 transition-all text-lg"
            />
          </div>
          {error && <p className="text-red-500 text-sm font-bold">{error}</p>}
          <button 
            type="submit"
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-4 rounded-2xl font-black uppercase tracking-widest flex items-center justify-center space-x-2 transition-all shadow-lg shadow-emerald-900/20"
          >
            <span>Find Organization</span>
            <ArrowRight size={20} />
          </button>
        </form>

        <div className="pt-8 border-t border-zinc-900">
          <Link to="/admin" className="text-zinc-600 hover:text-zinc-400 text-sm font-bold uppercase tracking-widest transition-colors">
            Business Admin Login
          </Link>
        </div>
      </div>
    </div>
  );
};

const ClockInPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const { organization, settings, loading, error, fetchConfig } = useOrganization();
  const [employee, setEmployee] = useState<User | null>(null);
  const [authError, setAuthError] = useState<string | undefined>();
  const [authLoading, setAuthLoading] = useState(false);

  useEffect(() => {
    if (slug) {
      fetchConfig(slug);
    }
  }, [slug]);

  const logout = useCallback(() => {
    setEmployee(null);
    setAuthError(undefined);
  }, []);

  const handlePinComplete = async (pin: string) => {
    if (!organization) return;
    try {
      setAuthLoading(true);
      setAuthError(undefined);

      const res = await fetch('/api/auth/employee', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin, organization_id: organization.id })
      });

      if (res.ok) {
        const data = await res.json();
        setEmployee(data);
      } else {
        setAuthError('Invalid PIN. Please try again.');
      }
    } catch (err) {
      setAuthError('Connection error');
    } finally {
      setAuthLoading(false);
    }
  };

  if (!slug) {
    return <LandingPage />;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <Loader2 className="animate-spin text-emerald-500" size={32} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black p-6">
        <div className="text-center space-y-4">
          <h1 className="text-xl font-bold text-red-500">Error</h1>
          <p className="text-zinc-400">{error}</p>
        </div>
      </div>
    );
  }

  const labels = settings?.labels || { staff: 'Staff', clockIn: 'Clock In', clockOut: 'Clock Out', location: 'Location' };

  return (
    <div className="min-h-screen flex flex-col bg-black text-white">
      <header className="p-6 flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-900/20">
            <Shield size={20} className="text-white" />
          </div>
          <span className="text-xl font-black tracking-tighter uppercase">
            {organization?.name || 'SHIFTSNAP'}
          </span>
        </div>

        <Link
          to="/admin"
          className="p-3 bg-zinc-900 text-zinc-500 rounded-xl hover:text-zinc-300 transition-all border border-zinc-800"
        >
          <Shield size={20} />
        </Link>
      </header>

      <main className="flex-1 flex items-center justify-center p-6">
        {!employee ? (
          <div className="w-full">
            <PinPad onComplete={handlePinComplete} error={authError} />
            {authLoading && (
              <div className="mt-6 text-center text-zinc-400 text-sm">
                Verifying PIN...
              </div>
            )}
          </div>
        ) : (
          <EmployeeDashboard employee={employee} onLogout={logout} />
        )}
      </main>

      <footer className="p-6 text-center text-zinc-600 text-sm">
        &copy; {new Date().getFullYear()} {organization?.name || 'ShiftSnap'} &bull; Secure Terminal
      </footer>
    </div>
  );
};

export default function App() {
  const [adminUser, setAdminUser] = useState<any>(null);
  const [superAdmin, setSuperAdmin] = useState(false);

  return (
    <Router>
      <OrganizationProvider>
        <div className="min-h-screen bg-black text-white selection:bg-emerald-500/30">
          {/* Debug message */}
          <div className="sr-only">ShiftSnap App Running</div>
          <Routes>
            <Route path="/:slug" element={<ClockInPage />} />
            <Route path="/" element={<ClockInPage />} />
            
            <Route
              path="/admin"
              element={
                adminUser ? (
                  <AdminDashboard user={adminUser} onLogout={() => setAdminUser(null)} />
                ) : (
                  <AdminLogin onLogin={setAdminUser} />
                )
              }
            />

            <Route
              path="/super-admin"
              element={
                superAdmin ? (
                  <SuperAdminDashboard 
                    onLogout={() => setSuperAdmin(false)} 
                    onAdminLogin={(user: any) => {
                      setAdminUser(user);
                      setSuperAdmin(false);
                    }}
                  />
                ) : (
                  <AdminLogin onLogin={() => setSuperAdmin(true)} isSuper />
                )
              }
            />

            <Route path="/setup/:token" element={<SetupAccount />} />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </OrganizationProvider>
    </Router>
  );
}

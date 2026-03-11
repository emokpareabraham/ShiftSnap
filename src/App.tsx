/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link } from 'react-router-dom';
import { PinPad } from './components/PinPad';
import { EmployeeDashboard } from './components/EmployeeDashboard';
import { AdminLogin } from './components/AdminLogin';
import { AdminDashboard } from './components/AdminDashboard';
import { Shield } from 'lucide-react';

interface Employee {
  id: number;
  name: string;
  role: string;
  status: 'in' | 'out';
}

export default function App() {
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);

  const logout = useCallback(() => {
    setEmployee(null);
    setError(undefined);
  }, []);

  useEffect(() => {
    if (!employee) return;

    let timeout: ReturnType<typeof setTimeout>;

    const resetTimer = () => {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        logout();
      }, 120000);
    };

    window.addEventListener('mousemove', resetTimer);
    window.addEventListener('keypress', resetTimer);
    window.addEventListener('touchstart', resetTimer);

    resetTimer();

    return () => {
      clearTimeout(timeout);
      window.removeEventListener('mousemove', resetTimer);
      window.removeEventListener('keypress', resetTimer);
      window.removeEventListener('touchstart', resetTimer);
    };
  }, [employee, logout]);

  const handlePinComplete = async (pin: string) => {
    try {
      setLoading(true);
      setError(undefined);

      const res = await fetch('/api/auth/employee', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin })
      });

      if (res.ok) {
        const data = await res.json();
        setEmployee(data);
        setError(undefined);
      } else {
        setError('Invalid PIN. Please try again.');
      }
    } catch (err) {
      console.error('PIN login error:', err);
      setError('Connection error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Router>
      <div className="min-h-screen bg-black text-white selection:bg-emerald-500/30">
        <Routes>
          <Route
            path="/"
            element={
              <div className="min-h-screen flex flex-col">
                <header className="p-6 flex justify-between items-center">
                  <div className="flex items-center space-x-2">
                    <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-900/20">
                      <Shield size={20} className="text-white" />
                    </div>
                    <span className="text-xl font-black tracking-tighter">SHIFTSNAP</span>
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
                      <PinPad onComplete={handlePinComplete} error={error} />
                      {loading && (
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
                  &copy; {new Date().getFullYear()} ShiftSnap Systems &bull; Secure Terminal
                </footer>
              </div>
            }
          />

          <Route
            path="/admin"
            element={
              isAdmin ? (
                <AdminDashboard onLogout={() => setIsAdmin(false)} />
              ) : (
                <AdminLogin onLogin={setIsAdmin} />
              )
            }
          />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </Router>
  );
}
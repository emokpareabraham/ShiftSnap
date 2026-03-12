import React, { useState, useEffect, useMemo } from 'react';
import {
  Users,
  FileText,
  Settings as SettingsIcon,
  Plus,
  Edit2,
  Trash2,
  Download,
  MapPin,
  Save,
  LogOut,
  Eye,
  EyeOff,
  Clock,
  Table,
  AlertCircle,
  Calendar
} from 'lucide-react';
import {
  format,
  differenceInMinutes,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  subMonths,
  startOfYear,
  endOfYear,
  subYears
} from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';

interface Employee {
  id: number;
  name: string;
  role: string;
  pin: string;
  status: 'in' | 'out';
}

interface Shift {
  id: number;
  employee_id: number;
  employee_name: string;
  type: 'in' | 'out';
  timestamp: string;
  photo: string;
  latitude: number;
  longitude: number;
}

interface PairedShift {
  inId: number;
  outId: number | null;
  employeeId: number;
  employeeName: string;
  clockIn: string;
  clockOut: string | null;
  duration: string;
  inPhoto: string;
  outPhoto: string | null;
  inLocation: string;
  outLocation: string | null;
}

export const AdminDashboard: React.FC<{ onLogout: () => void }> = ({ onLogout }) => {
  const [activeTab, setActiveTab] = useState<'employees' | 'timesheets' | 'settings'>('employees');
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [settings, setSettings] = useState<any>({});
  const [newAdminPassword, setNewAdminPassword] = useState('');
  const [isEditing, setIsEditing] = useState<Employee | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newEmployee, setNewEmployee] = useState({ name: '', role: '', pin: '' });
  const [showPin, setShowPin] = useState<number | null>(null);
  const [exportLoading, setExportLoading] = useState(false);
  const [googleConnected, setGoogleConnected] = useState(false);
  const [startDate, setStartDate] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [dateRangePreset, setDateRangePreset] = useState<string>('thisMonth');
  const [saveStatus, setSaveStatus] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [editingShift, setEditingShift] = useState<{ id: number; timestamp: string } | null>(null);
  const [loadingSettings, setLoadingSettings] = useState(false);
  const [googleConfig, setGoogleConfig] = useState<any>(null);

  const [deleteLoading, setDeleteLoading] = useState<number | null>(null);
  const [clearLoading, setClearLoading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ inId: number; outId: number | null } | null>(null);
  const [clearConfirm, setClearConfirm] = useState(false);

  useEffect(() => {
    fetchEmployees();
    fetchShifts();
    fetchSettings();

    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'OAUTH_AUTH_SUCCESS') {
        setGoogleConnected(true);
        fetchSettings();
        alert('Google Sheets connected successfully!');
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const fetchEmployees = async () => {
    try {
      const res = await fetch('/api/employees');
      if (!res.ok) throw new Error('Failed to fetch employees');
      setEmployees(await res.json());
    } catch (err) {
      console.error('Fetch employees error:', err);
    }
  };

  const fetchShifts = async () => {
    try {
      const res = await fetch('/api/shifts');
      if (!res.ok) throw new Error('Failed to fetch shifts');
      setShifts(await res.json());
    } catch (err) {
      console.error('Fetch shifts error:', err);
    }
  };

  const fetchSettings = async () => {
    try {
      setLoadingSettings(true);
      const res = await fetch('/api/settings');
      if (!res.ok) throw new Error('Failed to fetch settings');
      const data = await res.json();
      setSettings(data);
      setGoogleConnected(!!data.google_sheets_token);
      
      // Also fetch debug config
      const configRes = await fetch('/api/debug/google-config');
      if (configRes.ok) {
        setGoogleConfig(await configRes.json());
      }
    } catch (err) {
      console.error('Fetch settings error:', err);
      setSaveStatus({ message: 'Failed to load settings.', type: 'error' });
      setTimeout(() => setSaveStatus(null), 4000);
    } finally {
      setLoadingSettings(false);
    }
  };

  const handleManualClockOut = async (id: number) => {
    if (!id) return;

    if (confirm('Are you sure you want to manually clock this employee out?')) {
      try {
        const res = await fetch(`/api/employees/${id}/clock-out`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        });

        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.error || 'Failed to clock out');
        }

        await Promise.all([fetchEmployees(), fetchShifts()]);
        alert('Employee has been clocked out successfully.');
      } catch (err: any) {
        console.error('Manual clock out error:', err);
        alert(`Failed to clock out: ${err.message}`);
      }
    }
  };

  const handleDateRangePresetChange = (preset: string) => {
    setDateRangePreset(preset);
    const today = new Date();

    let start = today;
    let end = today;

    switch (preset) {
      case 'all':
        setStartDate('2020-01-01');
        setEndDate(format(today, 'yyyy-MM-dd'));
        return;
      case 'thisWeek':
        start = startOfWeek(today, { weekStartsOn: 1 });
        end = endOfWeek(today, { weekStartsOn: 1 });
        break;
      case 'thisMonth':
        start = startOfMonth(today);
        end = endOfMonth(today);
        break;
      case 'lastMonth': {
        const lastMonth = subMonths(today, 1);
        start = startOfMonth(lastMonth);
        end = endOfMonth(lastMonth);
        break;
      }
      case 'thisYear':
        start = startOfYear(today);
        end = endOfYear(today);
        break;
      case 'lastYear': {
        const lastYear = subYears(today, 1);
        start = startOfYear(lastYear);
        end = endOfYear(lastYear);
        break;
      }
      case 'custom':
        return;
      default:
        return;
    }

    setStartDate(format(start, 'yyyy-MM-dd'));
    setEndDate(format(end, 'yyyy-MM-dd'));
  };

  const handleAddEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch('/api/employees', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newEmployee)
    });
    setShowAddModal(false);
    setNewEmployee({ name: '', role: '', pin: '' });
    fetchEmployees();
  };

  const handleUpdateEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isEditing) return;
    await fetch(`/api/employees/${isEditing.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(isEditing)
    });
    setIsEditing(null);
    fetchEmployees();
  };

  const handleDeleteEmployee = async (id: number) => {
    if (confirm('Are you sure you want to deactivate this employee?')) {
      await fetch(`/api/employees/${id}`, { method: 'DELETE' });
      fetchEmployees();
    }
  };

  const handleUpdateSettings = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const settingsToSave = { ...settings };

      if (typeof settingsToSave.pg_config === 'string' && settingsToSave.pg_config.trim()) {
        try {
          settingsToSave.pg_config = JSON.parse(settingsToSave.pg_config);
        } catch {
          // leave as string
        }
      }

      if (newAdminPassword.trim()) {
        settingsToSave.admin_password = newAdminPassword.trim();
      } else {
        delete settingsToSave.admin_password;
      }

      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settingsToSave)
      });

      const data = await res.json();

      if (res.ok) {
        if (data.settings) {
          setSettings(data.settings);
          setGoogleConnected(!!data.settings.google_sheets_token);
        } else {
          await fetchSettings();
        }

        setNewAdminPassword('');
        setSaveStatus({ message: 'Settings saved successfully!', type: 'success' });
        setTimeout(() => setSaveStatus(null), 5000);
      } else {
        setSaveStatus({ message: data.error || 'Failed to save settings.', type: 'error' });
      }
    } catch (err) {
      console.error('Save settings error:', err);
      setSaveStatus({ message: 'Connection error.', type: 'error' });
    }
  };

  const handleDeletePair = async () => {
    if (!deleteConfirm) return;
    const { inId, outId } = deleteConfirm;
    setDeleteConfirm(null);

    setDeleteLoading(inId);
    try {
      const resIn = await fetch(`/api/shifts/${inId}`, { method: 'DELETE' });
      if (!resIn.ok) {
        let errorMsg = 'Failed to delete clock-in';
        try {
          const data = await resIn.json();
          errorMsg = data.error || errorMsg;
        } catch {}
        throw new Error(errorMsg);
      }

      if (outId) {
        const resOut = await fetch(`/api/shifts/${outId}`, { method: 'DELETE' });
        if (!resOut.ok) {
          let errorMsg = 'Failed to delete clock-out';
          try {
            const data = await resOut.json();
            errorMsg = data.error || errorMsg;
          } catch {}
          throw new Error(errorMsg);
        }
      }

      await fetchShifts();
      await fetchEmployees();
    } catch (err: any) {
      console.error('Delete error:', err);
      alert(`Error deleting shift: ${err.message}`);
    } finally {
      setDeleteLoading(null);
    }
  };

  const handleDeleteAllShifts = async () => {
    setClearConfirm(false);
    setClearLoading(true);
    try {
      const res = await fetch('/api/shifts', { method: 'DELETE' });
      if (!res.ok) {
        let errorMsg = 'Failed to delete all shifts';
        try {
          const data = await res.json();
          errorMsg = data.error || errorMsg;
        } catch {}
        throw new Error(errorMsg);
      }

      await fetchShifts();
      await fetchEmployees();
      alert('All shift records have been cleared.');
    } catch (err: any) {
      console.error('Clear all error:', err);
      alert(`Error clearing shifts: ${err.message}`);
    } finally {
      setClearLoading(false);
    }
  };

  const handleUpdateShift = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingShift) return;
    await fetch(`/api/shifts/${editingShift.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ timestamp: editingShift.timestamp })
    });
    setEditingShift(null);
    fetchShifts();
  };

  const useCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported on this device.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;

        setSettings((prev: any) => ({
          ...prev,
          restaurant_lat: String(lat),
          restaurant_lng: String(lng)
        }));

        setSaveStatus({
          message: 'Current location captured. Click "Save All Settings" to store it.',
          type: 'success'
        });
        setTimeout(() => setSaveStatus(null), 4000);
      },
      (error) => {
        console.error('Geolocation error:', error);
        alert('Unable to get current location. Please allow location permission and try again.');
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0
      }
    );
  };

  const disconnectGoogleSheets = async () => {
    if (!confirm('Are you sure you want to disconnect Google Sheets? You will need to reconnect to export again.')) return;

    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ google_sheets_token: '' })
      });

      const data = await res.json();

      if (res.ok) {
        setGoogleConnected(false);
        if (data.settings) {
          setSettings(data.settings);
        } else {
          setSettings((prev: any) => ({ ...prev, google_sheets_token: '' }));
        }
        alert('Disconnected successfully');
      }
    } catch {
      alert('Failed to disconnect');
    }
  };

  const connectGoogleSheets = async () => {
    try {
      const res = await fetch('/api/auth/google/url');
      const data = await res.json();
      if (data.error) {
        alert(data.error);
        return;
      }
      window.open(data.url, 'google_auth', 'width=600,height=700');
    } catch {
      alert('Failed to connect to Google Sheets. Please check your internet connection.');
    }
  };

  const exportToGoogleSheets = async () => {
    const newWindow = window.open('', '_blank');
    if (!newWindow) {
      alert('Popup blocked! Please allow popups for this site to export.');
      return;
    }

    const updateStatus = (msg: string, isError = false) => {
      if (newWindow.closed) return;
      newWindow.document.body.innerHTML = `
        <div style="font-family: sans-serif; text-align: center; margin-top: 100px; padding: 20px; background: #09090b; color: #fafafa; height: 100vh; margin: 0; display: flex; flex-direction: column; align-items: center; justify-content: center;">
          <div style="font-size: 48px; margin-bottom: 24px;">${isError ? '❌' : '📊'}</div>
          <h1 style="font-size: 20px; font-weight: 600; margin-bottom: 8px;">${isError ? 'Export Failed' : 'Creating Spreadsheet'}</h1>
          <p style="color: ${isError ? '#f87171' : '#a1a1aa'}; font-size: 14px; max-width: 400px; line-height: 1.5;">${msg}</p>
          ${isError ? '<button onclick="window.close()" style="margin-top: 24px; padding: 10px 20px; background: #27272a; color: white; border: 1px solid #3f3f46; border-radius: 12px; cursor: pointer; font-weight: 600;">Close Window</button>' : '<div style="margin-top: 24px; width: 40px; height: 40px; border: 3px solid #27272a; border-top-color: #10b981; border-radius: 50%; animate: spin 1s linear infinite;"></div><style>@keyframes spin { to { transform: rotate(360deg); } }</style>'}
        </div>
      `;
    };

    updateStatus('Creating your Google Sheet... This may take a few seconds.');

    setExportLoading(true);
    try {
      const res = await fetch('/api/export/google-sheets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startDate: new Date(startDate).toISOString(),
          endDate: new Date(`${endDate}T23:59:59`).toISOString()
        })
      });
      const data = await res.json();
      if (res.ok) {
        updateStatus('Success! Redirecting to your spreadsheet...');
        newWindow.location.href = data.url;
      } else {
        updateStatus(data.error || 'Failed to export. Please ensure your Google connection is still valid in Settings.', true);
      }
    } catch {
      updateStatus('A network error occurred. Please check your connection and try again.', true);
    } finally {
      setExportLoading(false);
    }
  };

  const pairedShifts = useMemo(() => {
    const pairs: PairedShift[] = [];
    const employeeShifts: Record<number, Shift[]> = {};

    shifts.forEach((s) => {
      if (!employeeShifts[s.employee_id]) employeeShifts[s.employee_id] = [];
      employeeShifts[s.employee_id].push(s);
    });

    Object.values(employeeShifts).forEach((group) => {
      const sorted = [...group].sort((a, b) => {
        const timeA = new Date(a.timestamp).getTime();
        const timeB = new Date(b.timestamp).getTime();
        if (timeA !== timeB) return timeA - timeB;
        return a.id - b.id;
      });

      for (let i = 0; i < sorted.length; i++) {
        const current = sorted[i];
        if (current.type === 'in') {
          const next = sorted[i + 1];
          if (next && next.type === 'out') {
            const start = new Date(current.timestamp);
            const end = new Date(next.timestamp);
            const diff = differenceInMinutes(end, start);
            const hours = Math.floor(diff / 60);
            const mins = diff % 60;

            pairs.push({
              inId: current.id,
              outId: next.id,
              employeeId: current.employee_id,
              employeeName: current.employee_name,
              clockIn: current.timestamp,
              clockOut: next.timestamp,
              duration: `${hours}h ${mins}m`,
              inPhoto: current.photo,
              outPhoto: next.photo,
              inLocation: `${current.latitude.toFixed(4)}, ${current.longitude.toFixed(4)}`,
              outLocation: `${next.latitude.toFixed(4)}, ${next.longitude.toFixed(4)}`
            });
            i++;
          } else {
            pairs.push({
              inId: current.id,
              outId: null,
              employeeId: current.employee_id,
              employeeName: current.employee_name,
              clockIn: current.timestamp,
              clockOut: null,
              duration: 'Active',
              inPhoto: current.photo,
              outPhoto: null,
              inLocation: `${current.latitude.toFixed(4)}, ${current.longitude.toFixed(4)}`,
              outLocation: null
            });
          }
        }
      }
    });

    return pairs.sort((a, b) => new Date(b.clockIn).getTime() - new Date(a.clockIn).getTime());
  }, [shifts]);

  const filteredPairedShifts = useMemo(() => {
    return pairedShifts.filter((s) => {
      const shiftDate = new Date(s.clockIn);
      const start = new Date(startDate);
      const end = new Date(`${endDate}T23:59:59`);
      return shiftDate >= start && shiftDate <= end;
    });
  }, [pairedShifts, startDate, endDate]);

  const exportToCSV = () => {
    const headers = ['Employee', 'Clock In', 'Clock Out', 'Duration', 'In Location', 'Out Location'];
    const rows = filteredPairedShifts.map((s) => [
      s.employeeName,
      format(new Date(s.clockIn), 'yyyy-MM-dd h:mm:ss a'),
      s.clockOut ? format(new Date(s.clockOut), 'yyyy-MM-dd h:mm:ss a') : 'N/A',
      s.duration,
      s.inLocation,
      s.outLocation || 'N/A'
    ]);

    const csvContent = [headers, ...rows].map((e) => e.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `timesheets_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        <header className="flex items-center justify-between bg-zinc-900 p-6 rounded-3xl border border-zinc-800">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-emerald-600 rounded-2xl flex items-center justify-center">
              <SettingsIcon size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Admin Dashboard</h1>
              <p className="text-zinc-400 text-sm">Manage your restaurant operations</p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <nav className="flex bg-black p-1 rounded-2xl border border-zinc-800">
              <button
                onClick={() => setActiveTab('employees')}
                className={`px-6 py-2 rounded-xl text-sm font-bold transition-all ${
                  activeTab === 'employees' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                Employees
              </button>
              <button
                onClick={() => setActiveTab('timesheets')}
                className={`px-6 py-2 rounded-xl text-sm font-bold transition-all ${
                  activeTab === 'timesheets' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                Timesheets
              </button>
              <button
                onClick={() => setActiveTab('settings')}
                className={`px-6 py-2 rounded-xl text-sm font-bold transition-all ${
                  activeTab === 'settings' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                Settings
              </button>
            </nav>
            <button
              onClick={onLogout}
              className="p-3 bg-zinc-800 text-zinc-400 rounded-2xl hover:bg-zinc-700 transition-all"
            >
              <LogOut size={20} />
            </button>
          </div>
        </header>

        <main>
          {activeTab === 'employees' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold flex items-center space-x-2">
                  <Users className="text-emerald-500" />
                  <span>Employee Management</span>
                </h2>
                <button
                  onClick={() => setShowAddModal(true)}
                  className="flex items-center space-x-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-500 rounded-2xl font-bold transition-all"
                >
                  <Plus size={20} />
                  <span>Add Employee</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {employees.map((emp) => (
                  <div key={emp.id} className="bg-zinc-900 p-6 rounded-3xl border border-zinc-800 space-y-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="text-xl font-bold">{emp.name}</h3>
                        <p className="text-zinc-400">{emp.role}</p>
                      </div>
                      <div
                        className={`px-3 py-1 rounded-full text-xs font-bold ${
                          emp.status === 'in' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-zinc-800 text-zinc-500'
                        }`}
                      >
                        {emp.status === 'in' ? 'IN' : 'OUT'}
                      </div>
                    </div>

                    <div className="flex items-center justify-between bg-black p-3 rounded-xl border border-zinc-800">
                      <div className="flex items-center space-x-2">
                        <span className="text-zinc-500 text-sm">PIN:</span>
                        <span className="font-mono font-bold">{showPin === emp.id ? emp.pin : '••••'}</span>
                      </div>
                      <button
                        onClick={() => setShowPin(showPin === emp.id ? null : emp.id)}
                        className="text-zinc-500 hover:text-white"
                      >
                        {showPin === emp.id ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>

                    <div className="flex space-x-2 pt-2">
                      {emp.status === 'in' ? (
                        <button
                          onClick={() => handleManualClockOut(emp.id)}
                          className="flex-1 flex items-center justify-center space-x-2 py-2 bg-red-600 hover:bg-red-500 rounded-xl transition-all text-sm font-bold text-white"
                        >
                          <Clock size={16} />
                          <span>Clock Out</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => setIsEditing(emp)}
                          className="flex-1 flex items-center justify-center space-x-2 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-xl transition-all text-sm font-bold"
                        >
                          <Edit2 size={16} />
                          <span>Edit</span>
                        </button>
                      )}
                      <button
                        onClick={() => handleDeleteEmployee(emp.id)}
                        className="p-2 bg-red-500/10 text-red-500 hover:bg-red-500/20 rounded-xl transition-all"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'timesheets' && (
            <div className="space-y-6">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <h2 className="text-2xl font-bold flex items-center space-x-2">
                  <FileText className="text-emerald-500" />
                  <span>Timesheets</span>
                </h2>

                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center space-x-2 bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2">
                    <Calendar size={16} className="text-zinc-500" />
                    <select
                      value={dateRangePreset}
                      onChange={(e) => handleDateRangePresetChange(e.target.value)}
                      className="bg-transparent text-sm focus:outline-none cursor-pointer pr-2"
                    >
                      <option value="thisMonth" className="bg-zinc-900">
                        This Month
                      </option>
                      <option value="thisWeek" className="bg-zinc-900">
                        This Week
                      </option>
                      <option value="lastMonth" className="bg-zinc-900">
                        Last Month
                      </option>
                      <option value="thisYear" className="bg-zinc-900">
                        This Year
                      </option>
                      <option value="lastYear" className="bg-zinc-900">
                        Last Year
                      </option>
                      <option value="all" className="bg-zinc-900">
                        All Dates
                      </option>
                      <option value="custom" className="bg-zinc-900">
                        Custom Range
                      </option>
                    </select>
                  </div>

                  {dateRangePreset === 'custom' && (
                    <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded-xl p-1 animate-in fade-in slide-in-from-left-2">
                      <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="bg-transparent text-xs p-2 focus:outline-none"
                      />
                      <span className="text-zinc-600 px-1">to</span>
                      <input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="bg-transparent text-xs p-2 focus:outline-none"
                      />
                    </div>
                  )}

                  <button
                    onClick={exportToCSV}
                    className="flex items-center space-x-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-xl font-bold transition-all text-sm"
                  >
                    <Download size={18} />
                    <span>CSV</span>
                  </button>
                  <button
                    onClick={exportToGoogleSheets}
                    disabled={exportLoading}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-xl font-bold transition-all disabled:opacity-50 text-sm ${
                      settings.google_sheets_token || googleConnected
                        ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                        : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                    }`}
                    title={!(settings.google_sheets_token || googleConnected) ? 'Connect Google Sheets in Settings first' : ''}
                  >
                    <Table size={18} />
                    <span>{exportLoading ? 'Exporting...' : 'Export to Google Sheets'}</span>
                  </button>
                  <button
                    onClick={() => setClearConfirm(true)}
                    disabled={clearLoading}
                    className="flex items-center space-x-2 px-4 py-2 bg-red-600/10 text-red-500 hover:bg-red-600 hover:text-white rounded-xl font-bold transition-all text-sm disabled:opacity-50"
                  >
                    <Trash2 size={18} />
                    <span>{clearLoading ? 'Clearing...' : 'Clear All'}</span>
                  </button>
                </div>
              </div>

              <div className="bg-zinc-900 rounded-3xl border border-zinc-800 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left min-w-[1200px]">
                    <thead className="bg-black/50 border-b border-zinc-800">
                      <tr>
                        <th className="p-6 font-bold text-zinc-400">Employee</th>
                        <th className="p-6 font-bold text-zinc-400">Clock In</th>
                        <th className="p-6 font-bold text-zinc-400">Clock Out</th>
                        <th className="p-6 font-bold text-zinc-400">Duration</th>
                        <th className="p-6 font-bold text-zinc-400">Photos (In/Out)</th>
                        <th className="p-6 font-bold text-zinc-400">Locations (In/Out)</th>
                        <th className="p-6 font-bold text-zinc-400">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800">
                      {filteredPairedShifts.map((shift, idx) => (
                        <tr key={idx} className="hover:bg-white/5 transition-all group">
                          <td className="p-6 font-bold">{shift.employeeName}</td>
                          <td className="p-6 text-emerald-500 font-medium">
                            <div className="flex items-center space-x-2">
                              <span>{format(new Date(shift.clockIn), 'MMM d, h:mm a')}</span>
                              <button
                                onClick={() => setEditingShift({ id: shift.inId, timestamp: shift.clockIn })}
                                className="opacity-0 group-hover:opacity-100 p-1 hover:bg-emerald-500/20 rounded transition-all"
                              >
                                <Edit2 size={12} />
                              </button>
                            </div>
                          </td>
                          <td className="p-6 text-red-500 font-medium">
                            <div className="flex items-center space-x-2">
                              {shift.clockOut ? (
                                <>
                                  <span>{format(new Date(shift.clockOut), 'MMM d, h:mm a')}</span>
                                  {shift.outId && (
                                    <button
                                      onClick={() => setEditingShift({ id: shift.outId!, timestamp: shift.clockOut! })}
                                      className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-500/20 rounded transition-all"
                                    >
                                      <Edit2 size={12} />
                                    </button>
                                  )}
                                </>
                              ) : (
                                <button
                                  onClick={() => handleManualClockOut(shift.employeeId)}
                                  className="flex items-center space-x-1 px-3 py-1.5 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white rounded-lg transition-all text-[10px] font-bold uppercase tracking-wider"
                                >
                                  <Clock size={10} />
                                  <span>Force Clock Out</span>
                                </button>
                              )}
                            </div>
                          </td>
                          <td className="p-6">
                            <span
                              className={`px-3 py-1 rounded-full text-xs font-bold ${
                                shift.duration === 'Active' ? 'bg-emerald-500/10 text-emerald-500 animate-pulse' : 'bg-zinc-800 text-zinc-400'
                              }`}
                            >
                              {shift.duration}
                            </span>
                          </td>
                          <td className="p-6">
                            <div className="flex items-center space-x-2">
                              <img
                                src={shift.inPhoto}
                                alt="In"
                                className="w-10 h-10 rounded-lg object-cover border border-zinc-800 hover:scale-150 transition-all cursor-zoom-in"
                              />
                              {shift.outPhoto && (
                                <img
                                  src={shift.outPhoto}
                                  alt="Out"
                                  className="w-10 h-10 rounded-lg object-cover border border-zinc-800 hover:scale-150 transition-all cursor-zoom-in"
                                />
                              )}
                            </div>
                          </td>
                          <td className="p-6 text-zinc-500 text-[10px] font-mono leading-tight">
                            <div>IN: {shift.inLocation}</div>
                            {shift.outLocation && <div>OUT: {shift.outLocation}</div>}
                          </td>
                          <td className="p-6">
                            <div className="flex items-center space-x-2">
                              <button
                                onClick={() => setDeleteConfirm({ inId: shift.inId, outId: shift.outId })}
                                disabled={deleteLoading === shift.inId}
                                className="p-2 text-zinc-500 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all disabled:opacity-50"
                                title="Delete Entire Shift"
                              >
                                {deleteLoading === shift.inId ? (
                                  <div className="w-[18px] h-[18px] border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
                                ) : (
                                  <Trash2 size={18} />
                                )}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="max-w-2xl space-y-6">
              <h2 className="text-2xl font-bold flex items-center space-x-2">
                <SettingsIcon className="text-emerald-500" />
                <span>Restaurant Settings</span>
              </h2>

              <form onSubmit={handleUpdateSettings} className="bg-zinc-900 p-8 rounded-3xl border border-zinc-800 space-y-8">
                <div className="space-y-4">
                  <h3 className="text-lg font-bold flex items-center space-x-2 text-zinc-400">
                    <MapPin size={18} />
                    <span>GPS Enforcement</span>
                  </h3>

                  <div className="bg-black border border-zinc-800 rounded-xl p-4 text-xs text-zinc-400 space-y-1">
                    <div>Saved Latitude: {settings.restaurant_lat || 'Not set'}</div>
                    <div>Saved Longitude: {settings.restaurant_lng || 'Not set'}</div>
                    <div>Saved Radius: {settings.allowed_radius || 'Not set'} metres</div>
                    <div>
                      Last Updated:{' '}
                      {settings.admin_last_updated ? format(new Date(settings.admin_last_updated), 'MMM d, yyyy h:mm a') : 'Unknown'}
                    </div>
                    {loadingSettings && <div className="text-emerald-500">Loading latest settings...</div>}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm text-zinc-500">Latitude</label>
                      <input
                        type="number"
                        step="any"
                        value={settings.restaurant_lat || ''}
                        onChange={(e) => setSettings((prev: any) => ({ ...prev, restaurant_lat: e.target.value }))}
                        className="w-full bg-black border border-zinc-800 rounded-xl p-3 focus:outline-none focus:border-emerald-500 transition-all"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm text-zinc-500">Longitude</label>
                      <input
                        type="number"
                        step="any"
                        value={settings.restaurant_lng || ''}
                        onChange={(e) => setSettings((prev: any) => ({ ...prev, restaurant_lng: e.target.value }))}
                        className="w-full bg-black border border-zinc-800 rounded-xl p-3 focus:outline-none focus:border-emerald-500 transition-all"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm text-zinc-500">Allowed Radius (metres)</label>
                    <input
                      type="number"
                      value={settings.allowed_radius || ''}
                      onChange={(e) => setSettings((prev: any) => ({ ...prev, allowed_radius: e.target.value }))}
                      className="w-full bg-black border border-zinc-800 rounded-xl p-3 focus:outline-none focus:border-emerald-500 transition-all"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={useCurrentLocation}
                    className="w-full py-3 bg-zinc-800 hover:bg-zinc-700 rounded-xl font-bold transition-all text-sm"
                  >
                    Use My Current Location
                  </button>
                </div>

                <div className="space-y-4 pt-4 border-t border-zinc-800">
                  <h3 className="text-lg font-bold text-zinc-400">Integrations</h3>
                  <div className="space-y-4">
                    {googleConfig && !googleConfig.configured && (
                      <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 space-y-3">
                        <div className="flex items-center space-x-2 text-red-500 font-bold text-sm">
                          <AlertCircle size={18} />
                          <span>Google OAuth Configuration Issue</span>
                        </div>
                        
                        <div className="space-y-2 text-xs text-zinc-400">
                          {googleConfig.missing.GOOGLE_CLIENT_ID && (
                            <p>• <code className="text-red-400">GOOGLE_CLIENT_ID</code> is missing.</p>
                          )}
                          {googleConfig.missing.GOOGLE_CLIENT_SECRET && (
                            <p>• <code className="text-red-400">GOOGLE_CLIENT_SECRET</code> is missing.</p>
                          )}
                          
                          {googleConfig.detectedTypos.length > 0 && (
                            <div className="mt-2 p-2 bg-black/40 rounded-lg border border-red-500/10">
                              <p className="text-red-400 font-medium mb-1">Potential Typos Detected:</p>
                              <ul className="list-disc list-inside space-y-1">
                                {googleConfig.detectedTypos.map((typo: string) => (
                                  <li key={typo}><code className="text-white">{typo}</code></li>
                                ))}
                              </ul>
                              <p className="mt-2 text-[10px]">Please rename these to exactly <code className="text-emerald-500">GOOGLE_CLIENT_ID</code> or <code className="text-emerald-500">GOOGLE_CLIENT_SECRET</code>.</p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-2xl p-4 space-y-2">
                      <p className="text-xs text-zinc-400 leading-relaxed">
                        To use Google Sheets export, you must set <code className="text-emerald-500">GOOGLE_CLIENT_ID</code> and <code className="text-emerald-500">GOOGLE_CLIENT_SECRET</code> in the <span className="font-bold">Secrets</span> menu of AI Studio.
                      </p>
                      <p className="text-[10px] text-zinc-500">
                        Redirect URI: <code className="bg-black px-1 rounded">{googleConfig?.redirectUri || 'Loading...'}</code>
                      </p>
                    </div>

                    <div className="flex flex-col space-y-2">
                      <button
                        type="button"
                        onClick={connectGoogleSheets}
                        className={`w-full py-3 rounded-xl font-bold transition-all text-sm flex items-center justify-center space-x-2 ${
                          settings.google_sheets_token || googleConnected
                            ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                            : 'bg-emerald-600/10 text-emerald-500 border border-emerald-500/20 hover:bg-emerald-600/20'
                        }`}
                      >
                        <Table size={18} />
                        <span>{settings.google_sheets_token || googleConnected ? 'Google Sheets Connected' : 'Connect Google Sheets'}</span>
                      </button>

                      {(settings.google_sheets_token || googleConnected) && (
                        <button
                          type="button"
                          onClick={disconnectGoogleSheets}
                          className="w-full py-2 text-xs text-red-500 hover:text-red-400 transition-colors font-medium"
                        >
                          Disconnect Account
                        </button>
                      )}
                    </div>

                    {(settings.google_sheets_token || googleConnected) && (
                      <div className="space-y-2">
                        <p className="text-xs text-zinc-500 text-center">
                          Your data is permanently linked. You can export anytime from the Timesheets tab.
                        </p>
                        <p className="text-[10px] text-emerald-500/50 text-center uppercase tracking-widest font-bold">
                          Note: Ensure "Google Sheets API" is enabled in your Google Cloud Console.
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-4 pt-4 border-t border-zinc-800">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-zinc-400">Database Status</h3>
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                      <span className="text-xs text-emerald-500 font-medium uppercase tracking-wider">Connected to PostgreSQL</span>
                    </div>
                  </div>
                  <p className="text-xs text-zinc-500 leading-relaxed">
                    Your application is currently using a Supabase PostgreSQL database for persistent storage. 
                    All employee data and shifts are securely stored in the cloud.
                  </p>
                </div>

                <div className="space-y-4 pt-4 border-t border-zinc-800">
                  <h3 className="text-lg font-bold text-zinc-400">Security</h3>

                  <AnimatePresence>
                    {saveStatus && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className={`p-4 rounded-xl text-sm font-bold flex items-center justify-between ${
                          saveStatus.type === 'success' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'
                        }`}
                      >
                        <span>{saveStatus.message}</span>
                        {settings.admin_last_updated && (
                          <span className="text-[10px] opacity-50">
                            Last changed: {format(new Date(settings.admin_last_updated), 'MMM d, h:mm a')}
                          </span>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div className="space-y-2">
                    <label className="text-sm text-zinc-500">Admin Username</label>
                    <input
                      type="text"
                      value={settings.admin_username || ''}
                      onChange={(e) => setSettings((prev: any) => ({ ...prev, admin_username: e.target.value }))}
                      className="w-full bg-black border border-zinc-800 rounded-xl p-3 focus:outline-none focus:border-emerald-500 transition-all"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm text-zinc-500">Admin Email (for resets)</label>
                    <input
                      type="email"
                      value={settings.admin_email || ''}
                      onChange={(e) => setSettings((prev: any) => ({ ...prev, admin_email: e.target.value }))}
                      className="w-full bg-black border border-zinc-800 rounded-xl p-3 focus:outline-none focus:border-emerald-500 transition-all"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm text-zinc-500">Change Admin Password</label>
                    <input
                      type="password"
                      placeholder="Enter new password"
                      value={newAdminPassword}
                      onChange={(e) => setNewAdminPassword(e.target.value)}
                      className="w-full bg-black border border-zinc-800 rounded-xl p-3 focus:outline-none focus:border-emerald-500 transition-all"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 rounded-2xl font-bold transition-all flex items-center justify-center space-x-2 shadow-lg"
                >
                  <Save size={20} />
                  <span>Save All Settings</span>
                </button>
              </form>
            </div>
          )}
        </main>
      </div>

      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-zinc-900 p-8 rounded-3xl border border-zinc-800 w-full max-w-md shadow-2xl"
            >
              <h2 className="text-2xl font-bold mb-6">Add New Employee</h2>
              <form onSubmit={handleAddEmployee} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm text-zinc-500">Full Name</label>
                  <input
                    required
                    value={newEmployee.name}
                    onChange={(e) => setNewEmployee({ ...newEmployee, name: e.target.value })}
                    className="w-full bg-black border border-zinc-800 rounded-xl p-3 focus:outline-none focus:border-emerald-500 transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm text-zinc-500">Role</label>
                  <input
                    required
                    value={newEmployee.role}
                    onChange={(e) => setNewEmployee({ ...newEmployee, role: e.target.value })}
                    className="w-full bg-black border border-zinc-800 rounded-xl p-3 focus:outline-none focus:border-emerald-500 transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm text-zinc-500">PIN (4-6 digits)</label>
                  <input
                    required
                    pattern="[0-9]{4,6}"
                    value={newEmployee.pin}
                    onChange={(e) => setNewEmployee({ ...newEmployee, pin: e.target.value })}
                    className="w-full bg-black border border-zinc-800 rounded-xl p-3 focus:outline-none focus:border-emerald-500 transition-all"
                  />
                </div>
                <div className="flex space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="flex-1 py-3 bg-zinc-800 hover:bg-zinc-700 rounded-xl font-bold transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 rounded-xl font-bold transition-all"
                  >
                    Create
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {deleteConfirm && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-zinc-900 p-8 rounded-3xl border border-zinc-800 w-full max-w-sm shadow-2xl text-center space-y-6"
            >
              <div className="w-16 h-16 bg-red-500/10 rounded-2xl flex items-center justify-center mx-auto text-red-500">
                <Trash2 size={32} />
              </div>
              <div className="space-y-2">
                <h2 className="text-xl font-bold">Delete Shift Record?</h2>
                <p className="text-zinc-400 text-sm">This action cannot be undone. This will permanently remove this shift from the history.</p>
              </div>
              <div className="flex flex-col space-y-2">
                <button onClick={handleDeletePair} className="w-full py-3 bg-red-600 hover:bg-red-500 text-white rounded-xl font-bold transition-all">
                  Confirm Delete
                </button>
                <button
                  onClick={() => setDeleteConfirm(null)}
                  className="w-full py-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 rounded-xl font-bold transition-all"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {clearConfirm && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-zinc-900 p-8 rounded-3xl border border-zinc-800 w-full max-w-sm shadow-2xl text-center space-y-6"
            >
              <div className="w-16 h-16 bg-red-500/10 rounded-2xl flex items-center justify-center mx-auto text-red-500">
                <AlertCircle size={32} />
              </div>
              <div className="space-y-2">
                <h2 className="text-xl font-bold">Clear All Records?</h2>
                <p className="text-red-500 text-sm font-bold uppercase tracking-tighter">Warning: This cannot be undone!</p>
                <p className="text-zinc-400 text-sm">This will permanently delete every single shift record in the database.</p>
              </div>
              <div className="flex flex-col space-y-2">
                <button
                  onClick={handleDeleteAllShifts}
                  className="w-full py-3 bg-red-600 hover:bg-red-500 text-white rounded-xl font-bold transition-all"
                >
                  Yes, Delete Everything
                </button>
                <button
                  onClick={() => setClearConfirm(false)}
                  className="w-full py-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 rounded-xl font-bold transition-all"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isEditing && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-zinc-900 p-8 rounded-3xl border border-zinc-800 w-full max-w-md shadow-2xl"
            >
              <h2 className="text-2xl font-bold mb-6">Edit Employee</h2>
              <form onSubmit={handleUpdateEmployee} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm text-zinc-500">Full Name</label>
                  <input
                    required
                    value={isEditing.name}
                    onChange={(e) => setIsEditing({ ...isEditing, name: e.target.value })}
                    className="w-full bg-black border border-zinc-800 rounded-xl p-3 focus:outline-none focus:border-emerald-500 transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm text-zinc-500">Role</label>
                  <input
                    required
                    value={isEditing.role}
                    onChange={(e) => setIsEditing({ ...isEditing, role: e.target.value })}
                    className="w-full bg-black border border-zinc-800 rounded-xl p-3 focus:outline-none focus:border-emerald-500 transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm text-zinc-500">PIN (4-6 digits)</label>
                  <input
                    required
                    pattern="[0-9]{4,6}"
                    value={isEditing.pin}
                    onChange={(e) => setIsEditing({ ...isEditing, pin: e.target.value })}
                    className="w-full bg-black border border-zinc-800 rounded-xl p-3 focus:outline-none focus:border-emerald-500 transition-all"
                  />
                </div>
                <div className="flex space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setIsEditing(null)}
                    className="flex-1 py-3 bg-zinc-800 hover:bg-zinc-700 rounded-xl font-bold transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 rounded-xl font-bold transition-all"
                  >
                    Update
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {editingShift && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-zinc-900 p-8 rounded-3xl border border-zinc-800 w-full max-w-md shadow-2xl"
            >
              <h2 className="text-2xl font-bold mb-6">Edit Shift Time</h2>
              <form onSubmit={handleUpdateShift} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm text-zinc-500">Timestamp</label>
                  <input
                    type="datetime-local"
                    required
                    value={format(new Date(editingShift.timestamp), "yyyy-MM-dd'T'HH:mm")}
                    onChange={(e) => setEditingShift({ ...editingShift, timestamp: new Date(e.target.value).toISOString() })}
                    className="w-full bg-black border border-zinc-800 rounded-xl p-3 focus:outline-none focus:border-emerald-500 transition-all"
                  />
                </div>
                <div className="flex space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setEditingShift(null)}
                    className="flex-1 py-3 bg-zinc-800 hover:bg-zinc-700 rounded-xl font-bold transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 rounded-xl font-bold transition-all"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
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
  Calendar,
  Building2,
  Camera,
  Shield,
  Globe,
  Palette,
  Key,
  CheckCircle2,
  ChevronRight
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
import { useOrganization } from '../context/OrganizationContext';
import { User, Shift, Location } from '../types';

export const AdminDashboard: React.FC<{ onLogout: () => void; user: User }> = ({ onLogout, user }) => {
  const { organization, settings, locations, refreshData } = useOrganization();
  const [activeTab, setActiveTab] = useState<'staff' | 'timesheets' | 'locations' | 'settings'>('staff');
  const [staff, setStaff] = useState<User[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [localSettings, setLocalSettings] = useState<any>(null);
  const [isEditing, setIsEditing] = useState<User | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newStaff, setNewStaff] = useState({ name: '', email: '', pin: '', role: 'staff' });
  const [showPin, setShowPin] = useState<number | null>(null);
  const [exportLoading, setExportLoading] = useState(false);
  const [startDate, setStartDate] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [dateRangePreset, setDateRangePreset] = useState<string>('thisMonth');
  const [saveStatus, setSaveStatus] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [editingShift, setEditingShift] = useState<{ id: number; timestamp: string } | null>(null);
  const [loading, setLoading] = useState(false);

  const [showLocationModal, setShowLocationModal] = useState(false);
  const [newLocation, setNewLocation] = useState({ name: '', address: '', latitude: 0, longitude: 0, radius: 200 });
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);

  useEffect(() => {
    if (organization) {
      fetchStaff();
      fetchShifts();
      setLocalSettings(settings);
    }
  }, [organization, settings]);

  const headers = {
    'Content-Type': 'application/json',
    'x-organization-id': organization?.id?.toString() || ''
  };

  const fetchStaff = async () => {
    try {
      const res = await fetch('/api/admin/staff', { headers });
      if (res.ok) setStaff(await res.json());
    } catch (err) {
      console.error('Fetch staff error:', err);
    }
  };

  const fetchShifts = async () => {
    try {
      const res = await fetch('/api/shifts', { headers });
      if (res.ok) setShifts(await res.json());
    } catch (err) {
      console.error('Fetch shifts error:', err);
    }
  };

  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/admin/staff', {
      method: 'POST',
      headers,
      body: JSON.stringify(newStaff)
    });
    if (res.ok) {
      setShowAddModal(false);
      setNewStaff({ name: '', email: '', pin: '', role: 'staff' });
      fetchStaff();
    }
  };

  const handleUpdateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isEditing) return;
    const res = await fetch(`/api/admin/staff/${isEditing.id}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(isEditing)
    });
    if (res.ok) {
      setIsEditing(null);
      fetchStaff();
    }
  };

  const handleDeleteStaff = async (id: number) => {
    if (confirm(`Are you sure you want to deactivate this ${settings?.labels?.staff || 'staff'}?`)) {
      await fetch(`/api/admin/staff/${id}`, { method: 'DELETE', headers });
      fetchStaff();
    }
  };

  const handleUpdateSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers,
        body: JSON.stringify(localSettings)
      });
      if (res.ok) {
        setSaveStatus({ message: 'Settings saved successfully!', type: 'success' });
        refreshData();
      } else {
        setSaveStatus({ message: 'Failed to save settings.', type: 'error' });
      }
    } catch (err) {
      setSaveStatus({ message: 'Connection error.', type: 'error' });
    } finally {
      setLoading(false);
      setTimeout(() => setSaveStatus(null), 3000);
    }
  };

  const handleAddLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/admin/locations', {
      method: 'POST',
      headers,
      body: JSON.stringify(newLocation)
    });
    if (res.ok) {
      setShowLocationModal(false);
      setNewLocation({ name: '', address: '', latitude: 0, longitude: 0, radius: 200 });
      refreshData();
    }
  };

  const handleUpdateLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLocation) return;
    const res = await fetch(`/api/admin/locations/${editingLocation.id}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(editingLocation)
    });
    if (res.ok) {
      setEditingLocation(null);
      refreshData();
    }
  };

  const handleConnectGoogle = async () => {
    try {
      const res = await fetch('/api/auth/google/url', { headers });
      const { url } = await res.json();
      const win = window.open(url, 'google_auth', 'width=600,height=600');
      
      const checkAuth = (event: MessageEvent) => {
        if (event.data?.type === 'OAUTH_AUTH_SUCCESS') {
          setSaveStatus({ message: 'Google Sheets connected!', type: 'success' });
          refreshData();
          window.removeEventListener('message', checkAuth);
        }
      };
      window.addEventListener('message', checkAuth);
    } catch (err) {
      setSaveStatus({ message: 'Failed to connect Google Sheets', type: 'error' });
    }
  };

  const handleExportGoogle = async () => {
    setExportLoading(true);
    try {
      const res = await fetch('/api/export/google-sheets', {
        method: 'POST',
        headers,
        body: JSON.stringify({ startDate, endDate })
      });
      const data = await res.json();
      if (data.success) {
        window.open(data.url, '_blank');
      } else {
        setSaveStatus({ message: data.error || 'Export failed', type: 'error' });
      }
    } catch (err) {
      setSaveStatus({ message: 'Export error', type: 'error' });
    } finally {
      setExportLoading(false);
    }
  };

  const handleDeleteLocation = async (id: number) => {
    if (confirm('Delete this location?')) {
      await fetch(`/api/admin/locations/${id}`, { method: 'DELETE', headers });
      refreshData();
    }
  };

  const pairedShifts = useMemo(() => {
    const pairs: any[] = [];
    const userShifts: Record<number, Shift[]> = {};

    shifts.forEach((s) => {
      if (!userShifts[s.user_id]) userShifts[s.user_id] = [];
      userShifts[s.user_id].push(s);
    });

    Object.values(userShifts).forEach((group) => {
      const sorted = [...group].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
      for (let i = 0; i < sorted.length; i++) {
        const current = sorted[i];
        if (current.type === 'in') {
          const next = sorted[i + 1];
          if (next && next.type === 'out') {
            const diff = differenceInMinutes(new Date(next.timestamp), new Date(current.timestamp));
            pairs.push({
              inId: current.id,
              outId: next.id,
              userName: current.employee_name,
              clockIn: current.timestamp,
              clockOut: next.timestamp,
              duration: `${Math.floor(diff / 60)}h ${diff % 60}m`,
              inPhoto: current.photo,
              outPhoto: next.photo,
              locationName: locations.find(l => l.id === current.location_id)?.name || 'Unknown'
            });
            i++;
          } else {
            pairs.push({
              inId: current.id,
              outId: null,
              userName: current.employee_name,
              clockIn: current.timestamp,
              clockOut: null,
              duration: 'Active',
              inPhoto: current.photo,
              outPhoto: null,
              locationName: locations.find(l => l.id === current.location_id)?.name || 'Unknown'
            });
          }
        }
      }
    });
    return pairs.sort((a, b) => new Date(b.clockIn).getTime() - new Date(a.clockIn).getTime());
  }, [shifts, locations]);

  const filteredShifts = useMemo(() => {
    return pairedShifts.filter(s => {
      const d = new Date(s.clockIn);
      return d >= new Date(startDate) && d <= new Date(endDate + 'T23:59:59');
    });
  }, [pairedShifts, startDate, endDate]);

  const exportToCSV = () => {
    const headers = ['Staff', 'Clock In', 'Clock Out', 'Duration', 'Location'];
    const rows = filteredShifts.map(s => [
      s.userName,
      format(new Date(s.clockIn), 'yyyy-MM-dd HH:mm'),
      s.clockOut ? format(new Date(s.clockOut), 'yyyy-MM-dd HH:mm') : 'N/A',
      s.duration,
      s.locationName
    ]);
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `timesheets-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
  };

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        <header className="flex flex-col md:flex-row md:items-center justify-between bg-zinc-900 p-6 rounded-3xl border border-zinc-800 gap-6">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-emerald-600 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-900/20">
              <Building2 size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tighter uppercase">{organization?.name}</h1>
              <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest">Admin Dashboard</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-4 overflow-x-auto pb-2 md:pb-0">
            <nav className="flex bg-black p-1 rounded-2xl border border-zinc-800">
              {[
                { id: 'staff', label: settings?.labels?.staff || 'Staff', icon: Users },
                { id: 'timesheets', label: 'Timesheets', icon: FileText },
                { id: 'locations', label: settings?.labels?.location || 'Locations', icon: MapPin },
                { id: 'settings', label: 'Settings', icon: SettingsIcon }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                    activeTab === tab.id ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  <tab.icon size={16} />
                  <span className="hidden sm:inline">{tab.label}</span>
                </button>
              ))}
            </nav>
            <button onClick={onLogout} className="p-3 bg-zinc-800 text-zinc-400 rounded-2xl hover:bg-zinc-700 transition-all">
              <LogOut size={20} />
            </button>
          </div>
        </header>

        <main className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          {activeTab === 'staff' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold tracking-tight">{settings?.labels?.staff || 'Staff'} Management</h2>
                <button onClick={() => setShowAddModal(true)} className="bg-emerald-600 hover:bg-emerald-500 px-6 py-3 rounded-2xl font-bold flex items-center space-x-2 shadow-lg shadow-emerald-900/20">
                  <Plus size={20} />
                  <span>Add {settings?.labels?.staff || 'Staff'}</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {staff.map(s => (
                  <div key={s.id} className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 space-y-4 hover:border-zinc-700 transition-all group">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-zinc-800 rounded-full flex items-center justify-center text-zinc-400">
                          <Users size={20} />
                        </div>
                        <div>
                          <h3 className="font-bold text-lg">{s.name}</h3>
                          <p className="text-zinc-500 text-xs uppercase font-bold tracking-wider">{s.role}</p>
                        </div>
                      </div>
                      <span className={`px-2 py-1 rounded-lg text-[10px] font-black tracking-tighter ${s.status === 'in' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-zinc-800 text-zinc-500'}`}>
                        {s.status?.toUpperCase()}
                      </span>
                    </div>
                    
                    <div className="bg-black rounded-xl p-3 flex justify-between items-center border border-zinc-800">
                      <div className="flex items-center space-x-2">
                        <Key size={14} className="text-zinc-600" />
                        <span className="font-mono font-bold">{showPin === s.id ? s.pin : '••••'}</span>
                      </div>
                      <button onClick={() => setShowPin(showPin === s.id ? null : s.id)} className="text-zinc-600 hover:text-white">
                        {showPin === s.id ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>

                    <div className="flex space-x-2 pt-2 opacity-0 group-hover:opacity-100 transition-all">
                      <button onClick={() => setIsEditing(s)} className="flex-1 bg-zinc-800 hover:bg-zinc-700 py-2 rounded-xl text-sm font-bold">Edit</button>
                      <button onClick={() => handleDeleteStaff(s.id)} className="p-2 bg-red-500/10 text-red-500 hover:bg-red-500/20 rounded-xl"><Trash2 size={18} /></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'timesheets' && (
            <div className="space-y-6">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <h2 className="text-2xl font-bold tracking-tight">Timesheets</h2>
                <div className="flex items-center space-x-3">
                  <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded-xl p-1">
                    <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="bg-transparent text-xs p-2 focus:outline-none" />
                    <span className="text-zinc-600">to</span>
                    <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="bg-transparent text-xs p-2 focus:outline-none" />
                  </div>
                  <button onClick={exportToCSV} className="bg-zinc-800 hover:bg-zinc-700 p-3 rounded-xl text-zinc-400 hover:text-white transition-all">
                    <Download size={20} />
                  </button>
                  <button 
                    onClick={handleExportGoogle} 
                    disabled={exportLoading}
                    className="bg-zinc-800 hover:bg-zinc-700 p-3 rounded-xl text-emerald-500 hover:text-emerald-400 transition-all disabled:opacity-50"
                  >
                    <Table size={20} />
                  </button>
                </div>
              </div>

              <div className="bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-zinc-950 text-zinc-500 text-[10px] font-black uppercase tracking-widest border-b border-zinc-800">
                      <tr>
                        <th className="p-6">{settings?.labels?.staff || 'Staff'}</th>
                        <th className="p-6">{settings?.labels?.clockIn || 'Clock In'}</th>
                        <th className="p-6">{settings?.labels?.clockOut || 'Clock Out'}</th>
                        <th className="p-6">Duration</th>
                        <th className="p-6">{settings?.labels?.location || 'Location'}</th>
                        <th className="p-6">Photos</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800">
                      {filteredShifts.map((s, i) => (
                        <tr key={i} className="hover:bg-white/5 transition-all">
                          <td className="p-6 font-bold">{s.userName}</td>
                          <td className="p-6 text-emerald-500 font-medium">{format(new Date(s.clockIn), 'MMM d, HH:mm')}</td>
                          <td className="p-6 text-red-500 font-medium">{s.clockOut ? format(new Date(s.clockOut), 'MMM d, HH:mm') : 'Active'}</td>
                          <td className="p-6 font-mono text-xs">{s.duration}</td>
                          <td className="p-6 text-zinc-400 text-sm">{s.locationName}</td>
                          <td className="p-6">
                            <div className="flex space-x-2">
                              {s.inPhoto && <img src={s.inPhoto} className="w-8 h-8 rounded-lg object-cover border border-zinc-800" />}
                              {s.outPhoto && <img src={s.outPhoto} className="w-8 h-8 rounded-lg object-cover border border-zinc-800" />}
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

          {activeTab === 'locations' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold tracking-tight">{settings?.labels?.location || 'Locations'}</h2>
                <button onClick={() => setShowLocationModal(true)} className="bg-emerald-600 hover:bg-emerald-500 px-6 py-3 rounded-2xl font-bold flex items-center space-x-2 shadow-lg shadow-emerald-900/20">
                  <Plus size={20} />
                  <span>Add {settings?.labels?.location || 'Location'}</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {locations.map(loc => (
                  <div key={loc.id} className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 space-y-4 hover:border-zinc-700 transition-all group">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-emerald-500/10 text-emerald-500 rounded-xl flex items-center justify-center">
                          <MapPin size={20} />
                        </div>
                        <div>
                          <h3 className="font-bold text-lg">{loc.name}</h3>
                          <p className="text-zinc-500 text-xs truncate max-w-[150px]">{loc.address || 'No address set'}</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                      <div className="bg-black p-2 rounded-lg border border-zinc-800">
                        <p className="opacity-50">Radius</p>
                        <p className="text-white">{loc.radius}m</p>
                      </div>
                      <div className="bg-black p-2 rounded-lg border border-zinc-800">
                        <p className="opacity-50">Coordinates</p>
                        <p className="text-white truncate">{loc.latitude.toFixed(2)}, {loc.longitude.toFixed(2)}</p>
                      </div>
                    </div>

                    <div className="flex space-x-2 pt-2 opacity-0 group-hover:opacity-100 transition-all">
                      <button onClick={() => setEditingLocation(loc)} className="flex-1 bg-zinc-800 hover:bg-zinc-700 py-2 rounded-xl text-sm font-bold">Edit</button>
                      <button onClick={() => handleDeleteLocation(loc.id)} className="p-2 bg-red-500/10 text-red-500 hover:bg-red-500/20 rounded-xl"><Trash2 size={18} /></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'settings' && localSettings && (
            <div className="max-w-4xl space-y-8">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold tracking-tight">Organization Settings</h2>
                <button onClick={handleUpdateSettings} disabled={loading} className="bg-emerald-600 hover:bg-emerald-500 px-8 py-3 rounded-2xl font-bold flex items-center space-x-2 shadow-lg shadow-emerald-900/20 disabled:opacity-50">
                  <Save size={20} />
                  <span>{loading ? 'Saving...' : 'Save Changes'}</span>
                </button>
              </div>

              {saveStatus && (
                <div className={`p-4 rounded-2xl font-bold flex items-center space-x-3 ${saveStatus.type === 'success' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
                  {saveStatus.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
                  <span>{saveStatus.message}</span>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Labels Section */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 space-y-6">
                  <div className="flex items-center space-x-3 text-emerald-500">
                    <Globe size={24} />
                    <h3 className="text-xl font-bold">White-Labeling</h3>
                  </div>
                  <div className="space-y-4">
                    {[
                      { key: 'staff', label: 'Staff Label', placeholder: 'e.g. Employee, Team Member' },
                      { key: 'location', label: 'Location Label', placeholder: 'e.g. Store, Office, Site' },
                      { key: 'clockIn', label: 'Clock In Label', placeholder: 'e.g. Start Shift, Punch In' },
                      { key: 'clockOut', label: 'Clock Out Label', placeholder: 'e.g. End Shift, Punch Out' }
                    ].map(item => (
                      <div key={item.key} className="space-y-2">
                        <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">{item.label}</label>
                        <input 
                          type="text"
                          value={localSettings.labels[item.key]}
                          onChange={e => setLocalSettings({...localSettings, labels: {...localSettings.labels, [item.key]: e.target.value}})}
                          className="w-full bg-black border border-zinc-800 rounded-xl p-3 focus:outline-none focus:border-emerald-500"
                          placeholder={item.placeholder}
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Features Section */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 space-y-6">
                  <div className="flex items-center space-x-3 text-emerald-500">
                    <Shield size={24} />
                    <h3 className="text-xl font-bold">Security & Features</h3>
                  </div>
                  <div className="space-y-4">
                    {[
                      { key: 'requirePhoto', label: 'Require Photo on Clock In/Out', icon: Camera },
                      { key: 'enforceGeofencing', label: 'Enforce Geofencing', icon: MapPin },
                      { key: 'allowPINLogin', label: 'Allow PIN Login (Kiosk Mode)', icon: Key }
                    ].map(item => (
                      <label key={item.key} className="flex items-center justify-between p-4 bg-black rounded-2xl border border-zinc-800 cursor-pointer hover:border-zinc-700 transition-all">
                        <div className="flex items-center space-x-3">
                          <item.icon size={20} className="text-zinc-500" />
                          <span className="text-sm font-bold">{item.label}</span>
                        </div>
                        <input 
                          type="checkbox"
                          checked={localSettings.features[item.key]}
                          onChange={e => setLocalSettings({...localSettings, features: {...localSettings.features, [item.key]: e.target.checked}})}
                          className="w-5 h-5 accent-emerald-500"
                        />
                      </label>
                    ))}
                  </div>
                </div>

                {/* Branding Section */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 space-y-6 md:col-span-2">
                  <div className="flex items-center space-x-3 text-emerald-500">
                    <Palette size={24} />
                    <h3 className="text-xl font-bold">Branding</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Primary Color</label>
                      <div className="flex space-x-3">
                        <input 
                          type="color"
                          value={localSettings.branding.primaryColor}
                          onChange={e => setLocalSettings({...localSettings, branding: {...localSettings.branding, primaryColor: e.target.value}})}
                          className="w-12 h-12 bg-transparent border-none cursor-pointer"
                        />
                        <input 
                          type="text"
                          value={localSettings.branding.primaryColor}
                          onChange={e => setLocalSettings({...localSettings, branding: {...localSettings.branding, primaryColor: e.target.value}})}
                          className="flex-1 bg-black border border-zinc-800 rounded-xl p-3 focus:outline-none focus:border-emerald-500 font-mono"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Logo URL</label>
                      <input 
                        type="text"
                        value={localSettings.branding.logoUrl}
                        onChange={e => setLocalSettings({...localSettings, branding: {...localSettings.branding, logoUrl: e.target.value}})}
                        className="w-full bg-black border border-zinc-800 rounded-xl p-3 focus:outline-none focus:border-emerald-500"
                        placeholder="https://example.com/logo.png"
                      />
                    </div>
                  </div>
                </div>

                {/* Integrations Section */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 space-y-6 md:col-span-2">
                  <div className="flex items-center space-x-3 text-emerald-500">
                    <Globe size={24} />
                    <h3 className="text-xl font-bold">Integrations</h3>
                  </div>
                  <div className="flex items-center justify-between p-6 bg-black rounded-2xl border border-zinc-800">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-emerald-500/10 rounded-xl flex items-center justify-center text-emerald-500">
                        <Table size={24} />
                      </div>
                      <div>
                        <h4 className="font-bold">Google Sheets</h4>
                        <p className="text-xs text-zinc-500">Export timesheets directly to Google Sheets</p>
                      </div>
                    </div>
                    <button 
                      onClick={handleConnectGoogle}
                      className={`px-6 py-2 rounded-xl font-bold transition-all ${
                        localSettings.google_sheets_token 
                          ? 'bg-zinc-800 text-zinc-400 hover:text-white' 
                          : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                      }`}
                    >
                      {localSettings.google_sheets_token ? 'Reconnect' : 'Connect'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Staff Modal */}
      <AnimatePresence>
        {(showAddModal || isEditing) && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-zinc-900 p-8 rounded-3xl border border-zinc-800 w-full max-w-md shadow-2xl">
              <h2 className="text-2xl font-bold mb-6">{isEditing ? 'Edit' : 'Add'} {settings?.labels?.staff || 'Staff'}</h2>
              <form onSubmit={isEditing ? handleUpdateStaff : handleAddStaff} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Full Name</label>
                  <input required value={isEditing ? isEditing.name : newStaff.name} onChange={e => isEditing ? setIsEditing({...isEditing, name: e.target.value}) : setNewStaff({...newStaff, name: e.target.value})} className="w-full bg-black border border-zinc-800 rounded-xl p-3 focus:outline-none focus:border-emerald-500" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Email (Optional)</label>
                  <input type="email" value={isEditing ? isEditing.email || '' : newStaff.email} onChange={e => isEditing ? setIsEditing({...isEditing, email: e.target.value}) : setNewStaff({...newStaff, email: e.target.value})} className="w-full bg-black border border-zinc-800 rounded-xl p-3 focus:outline-none focus:border-emerald-500" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">PIN (4-6 Digits)</label>
                  <input required pattern="[0-9]{4,6}" value={isEditing ? isEditing.pin : newStaff.pin} onChange={e => isEditing ? setIsEditing({...isEditing, pin: e.target.value}) : setNewStaff({...newStaff, pin: e.target.value})} className="w-full bg-black border border-zinc-800 rounded-xl p-3 focus:outline-none focus:border-emerald-500" />
                </div>
                <div className="flex space-x-3 pt-4">
                  <button type="button" onClick={() => { setShowAddModal(false); setIsEditing(null); }} className="flex-1 py-3 bg-zinc-800 hover:bg-zinc-700 rounded-xl font-bold">Cancel</button>
                  <button type="submit" className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 rounded-xl font-bold">{isEditing ? 'Update' : 'Create'}</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Location Modal */}
      <AnimatePresence>
        {(showLocationModal || editingLocation) && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-zinc-900 p-8 rounded-3xl border border-zinc-800 w-full max-w-md shadow-2xl">
              <h2 className="text-2xl font-bold mb-6">{editingLocation ? 'Edit' : 'Add'} {settings?.labels?.location || 'Location'}</h2>
              <form onSubmit={editingLocation ? handleUpdateLocation : handleAddLocation} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Name</label>
                  <input required value={editingLocation ? editingLocation.name : newLocation.name} onChange={e => editingLocation ? setEditingLocation({...editingLocation, name: e.target.value}) : setNewLocation({...newLocation, name: e.target.value})} className="w-full bg-black border border-zinc-800 rounded-xl p-3 focus:outline-none focus:border-emerald-500" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Address</label>
                  <input value={editingLocation ? editingLocation.address || '' : newLocation.address} onChange={e => editingLocation ? setEditingLocation({...editingLocation, address: e.target.value}) : setNewLocation({...newLocation, address: e.target.value})} className="w-full bg-black border border-zinc-800 rounded-xl p-3 focus:outline-none focus:border-emerald-500" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Latitude</label>
                    <input type="number" step="any" required value={editingLocation ? editingLocation.latitude : newLocation.latitude} onChange={e => editingLocation ? setEditingLocation({...editingLocation, latitude: parseFloat(e.target.value)}) : setNewLocation({...newLocation, latitude: parseFloat(e.target.value)})} className="w-full bg-black border border-zinc-800 rounded-xl p-3 focus:outline-none focus:border-emerald-500" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Longitude</label>
                    <input type="number" step="any" required value={editingLocation ? editingLocation.longitude : newLocation.longitude} onChange={e => editingLocation ? setEditingLocation({...editingLocation, longitude: parseFloat(e.target.value)}) : setNewLocation({...newLocation, longitude: parseFloat(e.target.value)})} className="w-full bg-black border border-zinc-800 rounded-xl p-3 focus:outline-none focus:border-emerald-500" />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Radius (metres)</label>
                  <input type="number" required value={editingLocation ? editingLocation.radius : newLocation.radius} onChange={e => editingLocation ? setEditingLocation({...editingLocation, radius: parseInt(e.target.value)}) : setNewLocation({...newLocation, radius: parseInt(e.target.value)})} className="w-full bg-black border border-zinc-800 rounded-xl p-3 focus:outline-none focus:border-emerald-500" />
                </div>
                <div className="flex space-x-3 pt-4">
                  <button type="button" onClick={() => { setShowLocationModal(false); setEditingLocation(null); }} className="flex-1 py-3 bg-zinc-800 hover:bg-zinc-700 rounded-xl font-bold">Cancel</button>
                  <button type="submit" className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 rounded-xl font-bold">{editingLocation ? 'Update' : 'Create'}</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

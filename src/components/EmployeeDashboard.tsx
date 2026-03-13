import React, { useState, useEffect } from 'react';
import { Clock, History, LogOut, AlertCircle, CheckCircle2, MapPin, Camera } from 'lucide-react';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';
import { CameraCapture } from './CameraCapture';
import { calculateDistance } from '../utils/geo';
import { useOrganization } from '../context/OrganizationContext';
import { User, Shift, Location } from '../types';

interface EmployeeDashboardProps {
  employee: User;
  onLogout: () => void;
}

export const EmployeeDashboard: React.FC<EmployeeDashboardProps> = ({ employee, onLogout }) => {
  const { organization, settings, locations } = useOrganization();
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [showCamera, setShowCamera] = useState(false);
  const [showClockOutConfirm, setShowClockOutConfirm] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [currentStatus, setCurrentStatus] = useState<'in' | 'out'>(employee.status || 'out');
  const [selectedLocationId, setSelectedLocationId] = useState<number | null>(null);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (employee.id) {
      fetchShifts();
    }
  }, [employee.id]);

  useEffect(() => {
    if (locations.length > 0 && !selectedLocationId) {
      setSelectedLocationId(locations[0].id);
    }
  }, [locations]);

  const fetchShifts = async () => {
    try {
      const res = await fetch(`/api/shifts/employee/${employee.id}`, {
        headers: { 'x-organization-id': organization?.id?.toString() || '' }
      });
      if (res.ok) setShifts(await res.json());
    } catch (err) {
      console.error('Fetch shifts error:', err);
    }
  };

  const handleClockAction = async (photo: string) => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    setShowCamera(false);

    try {
      if (!organization || !settings) throw new Error('Organization data not loaded.');
      if (!selectedLocationId) throw new Error('Please select a location.');

      const location = locations.find(l => l.id === selectedLocationId);
      if (!location) throw new Error('Invalid location selected.');

      let latitude = 0;
      let longitude = 0;

      if (settings.features.enforceGeofencing) {
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
          });
        });
        latitude = position.coords.latitude;
        longitude = position.coords.longitude;

        const dist = calculateDistance(latitude, longitude, location.latitude, location.longitude);
        if (dist > location.radius) {
          throw new Error(`Too far from ${location.name}. Must be within ${location.radius}m.`);
        }
      }

      const shiftType = currentStatus === 'in' ? 'out' : 'in';
      const res = await fetch('/api/staff/clock', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-organization-id': organization.id.toString()
        },
        body: JSON.stringify({
          user_id: employee.id,
          type: shiftType,
          photo: settings.features.requirePhoto ? photo : null,
          location_id: selectedLocationId,
          latitude,
          longitude
        })
      });

      if (!res.ok) throw new Error('Failed to save shift.');

      setSuccess(`Successfully clocked ${shiftType}!`);
      setCurrentStatus(shiftType);
      fetchShifts();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || 'An error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const handleClockButtonClick = () => {
    setError(null);
    setSuccess(null);
    if (currentStatus === 'in') {
      setShowClockOutConfirm(true);
    } else {
      if (settings?.features.requirePhoto) {
        setShowCamera(true);
      } else {
        handleClockAction('');
      }
    }
  };

  const lastClockIn = shifts.find(s => s.type === 'in');
  const labels = settings?.labels || { staff: 'Staff', clockIn: 'Clock In', clockOut: 'Clock Out', location: 'Location' };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <div className="flex items-center justify-between bg-zinc-900 p-8 rounded-3xl border border-zinc-800 shadow-xl">
        <div className="space-y-1">
          <h1 className="text-4xl font-bold text-white">{employee.name}</h1>
          <p className="text-zinc-400 text-lg uppercase font-bold tracking-widest text-xs">{employee.role}</p>
        </div>
        <div className="flex flex-col items-end space-y-2">
          <div className="text-2xl font-black text-emerald-500 font-mono tracking-wider">
            {format(currentTime, 'h:mm:ss a')}
          </div>
          <button onClick={onLogout} className="flex items-center space-x-2 px-6 py-3 bg-zinc-800 text-zinc-300 rounded-2xl hover:bg-zinc-700 transition-all font-medium">
            <LogOut size={20} />
            <span>Logout</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-zinc-900 p-8 rounded-3xl border border-zinc-800 shadow-xl flex flex-col items-center justify-center space-y-6">
          <div className="w-full space-y-4">
            <div className="text-center">
              <p className="text-zinc-400 font-medium mb-2 uppercase tracking-widest text-[10px]">Current Status</p>
              <div className={`text-xl font-bold px-6 py-2 rounded-full inline-block ${
                currentStatus === 'in' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-zinc-800 text-zinc-400'
              }`}>
                {currentStatus === 'in' ? `CLOCKED IN` : `CLOCKED OUT`}
              </div>
            </div>

            {currentStatus === 'out' && locations.length > 1 && (
              <div className="space-y-2">
                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest flex items-center space-x-1">
                  <MapPin size={12} />
                  <span>Select {labels.location}</span>
                </label>
                <select 
                  value={selectedLocationId || ''} 
                  onChange={e => setSelectedLocationId(Number(e.target.value))}
                  className="w-full bg-black border border-zinc-800 rounded-2xl p-4 text-white font-bold focus:outline-none focus:border-emerald-500"
                >
                  {locations.map(loc => <option key={loc.id} value={loc.id}>{loc.name}</option>)}
                </select>
              </div>
            )}

            {currentStatus === 'in' && lastClockIn && (
              <div className="bg-emerald-500/5 border border-emerald-500/10 p-4 rounded-2xl text-center">
                <p className="text-zinc-500 text-[10px] uppercase tracking-widest mb-1">Clocked in at</p>
                <p className="text-xl font-bold text-emerald-500">
                  {format(new Date(lastClockIn.timestamp), 'h:mm a')}
                </p>
                <p className="text-xs text-zinc-500 mt-1">
                  {locations.find(l => l.id === lastClockIn.location_id)?.name}
                </p>
              </div>
            )}
          </div>

          <button
            onClick={handleClockButtonClick}
            disabled={loading}
            className={`w-full py-12 rounded-[2.5rem] text-3xl font-black tracking-tighter transition-all shadow-2xl active:scale-95 flex flex-col items-center justify-center space-y-4 ${
              currentStatus === 'in'
                ? 'bg-red-600 hover:bg-red-500 text-white'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white'
            } disabled:opacity-50`}
          >
            <Clock size={48} />
            <span>{currentStatus === 'in' ? labels.clockOut.toUpperCase() : labels.clockIn.toUpperCase()}</span>
          </button>

          <AnimatePresence>
            {error && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="w-full p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center space-x-3 text-red-500">
                <AlertCircle size={20} />
                <p className="text-sm font-medium">{error}</p>
              </motion.div>
            )}
            {success && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="w-full p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center space-x-3 text-emerald-500">
                <CheckCircle2 size={20} />
                <p className="text-sm font-medium">{success}</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="bg-zinc-900 p-8 rounded-3xl border border-zinc-800 shadow-xl flex flex-col">
          <div className="flex items-center space-x-2 mb-6">
            <History size={24} className="text-zinc-400" />
            <h2 className="text-xl font-bold text-white">Recent Activity</h2>
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto max-h-[400px] pr-2 custom-scrollbar">
            {shifts.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-zinc-500 space-y-2">
                <Clock size={40} className="opacity-20" />
                <p>No recent activity</p>
              </div>
            ) : (
              shifts.map((shift) => (
                <div key={shift.id} className="flex items-center space-x-4 p-4 bg-zinc-800/50 rounded-2xl border border-zinc-800">
                  {shift.photo ? (
                    <img src={shift.photo} className="w-16 h-16 rounded-xl object-cover border border-zinc-700" />
                  ) : (
                    <div className="w-16 h-16 bg-zinc-700 rounded-xl flex items-center justify-center text-zinc-500">
                      <Camera size={24} />
                    </div>
                  )}
                  <div className="flex-1">
                    <p className={`font-bold ${shift.type === 'in' ? 'text-emerald-500' : 'text-red-500'}`}>
                      {shift.type === 'in' ? labels.clockIn : labels.clockOut}
                    </p>
                    <p className="text-xs text-zinc-400">
                      {format(new Date(shift.timestamp), 'MMM d, h:mm a')}
                    </p>
                    <p className="text-[10px] text-zinc-600 uppercase font-bold">
                      {locations.find(l => l.id === shift.location_id)?.name}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showClockOutConfirm && (
          <div className="fixed inset-0 z-[70] bg-black/80 backdrop-blur-md flex items-center justify-center p-6">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-zinc-900 p-8 rounded-[2.5rem] border border-zinc-800 max-w-md w-full space-y-8 text-center shadow-2xl">
              <div className="w-20 h-20 bg-red-500/10 rounded-3xl flex items-center justify-center mx-auto text-red-500">
                <Clock size={40} />
              </div>
              <div className="space-y-2">
                <h2 className="text-3xl font-bold text-white">Confirm {labels.clockOut}</h2>
                <p className="text-zinc-400 text-lg">Current time: <span className="text-white font-bold">{format(currentTime, 'h:mm a')}</span></p>
              </div>
              <div className="flex flex-col space-y-3">
                <button onClick={() => { setShowClockOutConfirm(false); if(settings?.features.requirePhoto) setShowCamera(true); else handleClockAction(''); }} className="w-full py-4 bg-red-600 hover:bg-red-500 text-white rounded-2xl font-bold text-xl transition-all">Confirm</button>
                <button onClick={() => setShowClockOutConfirm(false)} className="w-full py-4 bg-zinc-800 text-zinc-400 hover:text-white rounded-2xl font-bold transition-all">Cancel</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {showCamera && (
        <CameraCapture onCapture={handleClockAction} onCancel={() => setShowCamera(false)} />
      )}

      {loading && (
        <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-center justify-center">
          <div className="bg-zinc-900 p-8 rounded-3xl border border-zinc-800 flex flex-col items-center space-y-4">
            <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-white font-bold">Processing...</p>
          </div>
        </div>
      )}
    </div>
  );
};

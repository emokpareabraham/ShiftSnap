import React, { useState, useEffect } from 'react';
import { Clock, History, LogOut, AlertCircle, CheckCircle2 } from 'lucide-react';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';
import { CameraCapture } from './CameraCapture';
import { calculateDistance } from '../utils/geo';

interface Employee {
  id: number;
  name: string;
  role: string;
  status: 'in' | 'out';
}

interface Shift {
  id: number;
  type: 'in' | 'out';
  timestamp: string;
  photo: string;
}

interface EmployeeDashboardProps {
  employee: Employee;
  onLogout: () => void;
}

export const EmployeeDashboard: React.FC<EmployeeDashboardProps> = ({ employee, onLogout }) => {
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [showCamera, setShowCamera] = useState(false);
  const [showClockOutConfirm, setShowClockOutConfirm] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [settings, setSettings] = useState<any>(null);
  const [currentStatus, setCurrentStatus] = useState<'in' | 'out'>(employee.status);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    setCurrentStatus(employee.status);
  }, [employee.status]);

  useEffect(() => {
    fetchShifts();
    fetchSettings();
  }, [employee.id]);

  const fetchShifts = async () => {
    try {
      const res = await fetch(`/api/shifts/employee/${employee.id}`);
      if (!res.ok) throw new Error('Failed to fetch shifts');
      const data = await res.json();
      setShifts(data);
    } catch (err) {
      console.error('Fetch shifts error:', err);
    }
  };

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/settings');
      if (!res.ok) throw new Error('Failed to fetch settings');
      const data = await res.json();
      setSettings(data);
      console.log('[EmployeeDashboard] Loaded settings:', data);
    } catch (err) {
      console.error('Fetch settings error:', err);
      setError('Failed to load restaurant settings.');
    }
  };

  const fetchEmployeeStatus = async () => {
    try {
      const res = await fetch('/api/employees');
      if (!res.ok) throw new Error('Failed to fetch employees');
      const employees = await res.json();
      const updatedEmployee = employees.find((e: any) => e.id === employee.id);
      if (updatedEmployee) {
        setCurrentStatus(updatedEmployee.status);
      }
    } catch (err) {
      console.error('Fetch employee status error:', err);
    }
  };

  const handleClockAction = async (photo: string) => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    setShowCamera(false);

    try {
      if (!settings) {
        throw new Error('Restaurant settings have not loaded yet.');
      }

      const restaurantLat = parseFloat(settings.restaurant_lat);
      const restaurantLng = parseFloat(settings.restaurant_lng);
      const allowedRadius = parseFloat(settings.allowed_radius);

      if (
        Number.isNaN(restaurantLat) ||
        Number.isNaN(restaurantLng) ||
        Number.isNaN(allowedRadius)
      ) {
        throw new Error('Restaurant GPS settings are invalid. Please contact admin.');
      }

      if (restaurantLat === 0 && restaurantLng === 0) {
        throw new Error('Restaurant location has not been configured yet. Please contact admin.');
      }

      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        });
      });

      const { latitude, longitude } = position.coords;

      const dist = calculateDistance(
        latitude,
        longitude,
        restaurantLat,
        restaurantLng
      );

      console.log('[EmployeeDashboard] Geofence check:', {
        employeeLat: latitude,
        employeeLng: longitude,
        restaurantLat,
        restaurantLng,
        allowedRadius,
        distance: dist
      });

      if (dist > allowedRadius) {
        setError(`You are too far from the restaurant (${Math.round(dist)}m). Must be within ${allowedRadius}m.`);
        setLoading(false);
        return;
      }

      const shiftType = currentStatus === 'in' ? 'out' : 'in';

      const res = await fetch('/api/shifts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employee_id: employee.id,
          type: shiftType,
          photo,
          latitude,
          longitude
        })
      });

      if (!res.ok) {
        throw new Error('Failed to save shift. Please try again.');
      }

      setSuccess(`Successfully clocked ${shiftType}!`);
      setCurrentStatus(shiftType === 'in' ? 'in' : 'out');

      await Promise.all([fetchShifts(), fetchEmployeeStatus()]);

      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Geolocation error. Please ensure location services are enabled.');
    } finally {
      setLoading(false);
    }
  };

  const handleClockButtonClick = () => {
    setError(null);
    setSuccess(null);

    if (!settings) {
      setError('Settings are still loading. Please wait a moment and try again.');
      return;
    }

    if (currentStatus === 'in') {
      setShowClockOutConfirm(true);
    } else {
      setShowCamera(true);
    }
  };

  const handleConfirmClockOut = () => {
    setShowClockOutConfirm(false);
    setShowCamera(true);
  };

  const lastClockIn = shifts.find(s => s.type === 'in');

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <div className="flex items-center justify-between bg-zinc-900 p-8 rounded-3xl border border-zinc-800 shadow-xl">
        <div className="space-y-1">
          <h1 className="text-4xl font-bold text-white">{employee.name}</h1>
          <p className="text-zinc-400 text-lg">{employee.role}</p>
        </div>
        <div className="flex flex-col items-end space-y-2">
          <div className="text-2xl font-black text-emerald-500 font-mono tracking-wider">
            {format(currentTime, 'h:mm:ss a')}
          </div>
          <button
            onClick={onLogout}
            className="flex items-center space-x-2 px-6 py-3 bg-zinc-800 text-zinc-300 rounded-2xl hover:bg-zinc-700 transition-all font-medium"
          >
            <LogOut size={20} />
            <span>Logout</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-zinc-900 p-8 rounded-3xl border border-zinc-800 shadow-xl flex flex-col items-center justify-center space-y-6">
          <div className="text-center space-y-4">
            <div>
              <p className="text-zinc-400 font-medium mb-2 uppercase tracking-widest text-xs">Current Status</p>
              <div className={`text-2xl font-bold px-6 py-2 rounded-full inline-block ${
                currentStatus === 'in' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-zinc-800 text-zinc-400'
              }`}>
                {currentStatus === 'in' ? 'CLOCKED IN' : 'CLOCKED OUT'}
              </div>
            </div>

            {currentStatus === 'in' && lastClockIn && (
              <div className="bg-emerald-500/5 border border-emerald-500/10 p-4 rounded-2xl">
                <p className="text-zinc-500 text-xs uppercase tracking-widest mb-1">Clocked in at</p>
                <p className="text-xl font-bold text-emerald-500">
                  {format(new Date(lastClockIn.timestamp), 'h:mm a')}
                </p>
              </div>
            )}
          </div>

          <button
            onClick={handleClockButtonClick}
            disabled={loading}
            className={`w-full py-12 rounded-3xl text-3xl font-bold transition-all shadow-2xl active:scale-95 flex flex-col items-center justify-center space-y-4 ${
              currentStatus === 'in'
                ? 'bg-red-600 hover:bg-red-500 text-white'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            <Clock size={48} />
            <span>{currentStatus === 'in' ? 'CLOCK OUT' : 'CLOCK IN'}</span>
          </button>

          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="w-full p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center space-x-3 text-red-500"
              >
                <AlertCircle size={20} />
                <p className="text-sm font-medium">{error}</p>
              </motion.div>
            )}
            {success && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="w-full p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center space-x-3 text-emerald-500"
              >
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
                <p>No recent shifts found</p>
              </div>
            ) : (
              shifts.map((shift) => (
                <div key={shift.id} className="flex items-center space-x-4 p-4 bg-zinc-800/50 rounded-2xl border border-zinc-800">
                  <img
                    src={shift.photo}
                    alt="Selfie"
                    className="w-16 h-16 rounded-xl object-cover border border-zinc-700"
                  />
                  <div className="flex-1">
                    <p className={`font-bold ${shift.type === 'in' ? 'text-emerald-500' : 'text-red-500'}`}>
                      Clocked {shift.type.toUpperCase()}
                    </p>
                    <p className="text-sm text-zinc-400">
                      {format(new Date(shift.timestamp), 'MMM d, h:mm a')}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {showClockOutConfirm && (
        <div className="fixed inset-0 z-[70] bg-black/80 backdrop-blur-md flex items-center justify-center p-6">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-zinc-900 p-8 rounded-[2.5rem] border border-zinc-800 max-w-md w-full space-y-8 text-center shadow-2xl"
          >
            <div className="w-20 h-20 bg-red-500/10 rounded-3xl flex items-center justify-center mx-auto text-red-500">
              <Clock size={40} />
            </div>

            <div className="space-y-2">
              <h2 className="text-3xl font-bold text-white">Confirm Clock Out</h2>
              <p className="text-zinc-400 text-lg">
                The current time is <span className="text-white font-bold">{format(currentTime, 'h:mm a')}</span>.
              </p>
              <p className="text-zinc-500">Are you sure you want to end your shift now?</p>
            </div>

            <div className="flex flex-col space-y-3">
              <button
                onClick={handleConfirmClockOut}
                className="w-full py-4 bg-red-600 hover:bg-red-500 text-white rounded-2xl font-bold text-xl transition-all shadow-lg active:scale-95"
              >
                Confirm Clock Out
              </button>
              <button
                onClick={() => setShowClockOutConfirm(false)}
                className="w-full py-4 bg-zinc-800 text-zinc-400 hover:text-white rounded-2xl font-bold transition-all"
              >
                Cancel
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {showCamera && (
        <CameraCapture
          onCapture={handleClockAction}
          onCancel={() => setShowCamera(false)}
        />
      )}

      {loading && (
        <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-center justify-center">
          <div className="bg-zinc-900 p-8 rounded-3xl border border-zinc-800 flex flex-col items-center space-y-4">
            <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-white font-bold">Verifying Location...</p>
          </div>
        </div>
      )}
    </div>
  );
};
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Shield, CheckCircle, Loader2, MapPin, Building2, User, Lock } from 'lucide-react';

export const SetupAccount: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [invite, setInvite] = useState<any>(null);

  const [formData, setFormData] = useState({
    name: '',
    password: '',
    confirmPassword: '',
    businessName: '',
    locationName: 'Main Office',
    locationAddress: '',
    lat: 0,
    lng: 0
  });

  useEffect(() => {
    validateToken();
  }, [token]);

  const validateToken = async () => {
    try {
      const res = await fetch(`/api/setup/validate/${token}`);
      if (!res.ok) throw new Error('Invalid or expired invite token');
      const data = await res.json();
      setInvite(data);
      setFormData(prev => ({ ...prev, businessName: data.organization_name }));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleComplete = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      alert("Passwords do not match");
      return;
    }

    try {
      setLoading(true);
      const res = await fetch('/api/setup/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          password: formData.password,
          name: formData.name,
          businessName: formData.businessName,
          location: {
            name: formData.locationName,
            address: formData.locationAddress,
            lat: formData.lat,
            lng: formData.lng
          }
        })
      });

      if (res.ok) {
        setStep(4);
      } else {
        const data = await res.json();
        throw new Error(data.error || 'Failed to complete setup');
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading && step !== 4) {
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
          <h1 className="text-2xl font-bold text-red-500">Invalid Link</h1>
          <p className="text-zinc-400">{error}</p>
          <button onClick={() => navigate('/')} className="text-emerald-500 hover:underline">Go Home</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center p-6">
      <div className="w-full max-w-xl bg-zinc-900 border border-zinc-800 rounded-3xl p-8 md:p-12 shadow-2xl space-y-8">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 bg-emerald-600 rounded-2xl flex items-center justify-center">
            <Shield className="text-white" size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tighter uppercase">SHIFTSNAP</h1>
            <p className="text-zinc-500 text-sm font-bold">ORGANIZATION SETUP</p>
          </div>
        </div>

        {step === 1 && (
          <div className="space-y-6">
            <div className="space-y-2">
              <h2 className="text-3xl font-bold">Welcome!</h2>
              <p className="text-zinc-400">You've been invited to manage <strong>{invite?.organization_name}</strong>. Let's get your account ready.</p>
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-bold text-zinc-500 flex items-center space-x-2">
                  <User size={16} />
                  <span>Your Full Name</span>
                </label>
                <input 
                  type="text"
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-4 focus:outline-none focus:border-emerald-500"
                  placeholder="John Doe"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-zinc-500 flex items-center space-x-2">
                    <Lock size={16} />
                    <span>Password</span>
                  </label>
                  <input 
                    type="password"
                    value={formData.password}
                    onChange={e => setFormData({...formData, password: e.target.value})}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-4 focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-zinc-500 flex items-center space-x-2">
                    <Lock size={16} />
                    <span>Confirm Password</span>
                  </label>
                  <input 
                    type="password"
                    value={formData.confirmPassword}
                    onChange={e => setFormData({...formData, confirmPassword: e.target.value})}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-4 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>
            </div>
            <button 
              onClick={() => setStep(2)}
              disabled={!formData.name || !formData.password || formData.password !== formData.confirmPassword}
              className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white py-4 rounded-xl font-bold transition-all"
            >
              Next: Business Details
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
            <div className="space-y-2">
              <h2 className="text-3xl font-bold">Business Info</h2>
              <p className="text-zinc-400">Confirm your business name as you want it to appear in the app.</p>
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-bold text-zinc-500 flex items-center space-x-2">
                  <Building2 size={16} />
                  <span>Business Display Name</span>
                </label>
                <input 
                  type="text"
                  value={formData.businessName}
                  onChange={e => setFormData({...formData, businessName: e.target.value})}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-4 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>
            <div className="flex space-x-3">
              <button 
                onClick={() => setStep(1)}
                className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white py-4 rounded-xl font-bold transition-all"
              >
                Back
              </button>
              <button 
                onClick={() => setStep(3)}
                className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white py-4 rounded-xl font-bold transition-all"
              >
                Next: Location
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6">
            <div className="space-y-2">
              <h2 className="text-3xl font-bold">First Location</h2>
              <p className="text-zinc-400">Add your primary location to start clocking in staff.</p>
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-bold text-zinc-500 flex items-center space-x-2">
                  <MapPin size={16} />
                  <span>Location Name</span>
                </label>
                <input 
                  type="text"
                  value={formData.locationName}
                  onChange={e => setFormData({...formData, locationName: e.target.value})}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-4 focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-zinc-500">Address (Optional)</label>
                <input 
                  type="text"
                  value={formData.locationAddress}
                  onChange={e => setFormData({...formData, locationAddress: e.target.value})}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-4 focus:outline-none focus:border-emerald-500"
                  placeholder="123 Main St, City"
                />
              </div>
            </div>
            <div className="flex space-x-3">
              <button 
                onClick={() => setStep(2)}
                className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white py-4 rounded-xl font-bold transition-all"
              >
                Back
              </button>
              <button 
                onClick={handleComplete}
                className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white py-4 rounded-xl font-bold transition-all"
              >
                Complete Setup
              </button>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="text-center space-y-6 py-8">
            <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle className="text-emerald-500" size={48} />
            </div>
            <div className="space-y-2">
              <h2 className="text-3xl font-bold">Setup Complete!</h2>
              <p className="text-zinc-400">Your organization is ready. You can now log in to your admin dashboard.</p>
            </div>
            <button 
              onClick={() => navigate('/admin')}
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-4 rounded-xl font-bold transition-all shadow-lg shadow-emerald-900/20"
            >
              Go to Admin Login
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

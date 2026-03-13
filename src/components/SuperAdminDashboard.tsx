import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  Plus, 
  Mail, 
  CheckCircle, 
  XCircle, 
  LogOut, 
  LayoutDashboard,
  Users,
  ExternalLink,
  Copy,
  Check,
  Trash2,
  ShieldAlert,
  ShieldCheck,
  FileText,
  Key,
  UserCog,
  Loader2,
  Eye,
  EyeOff
} from 'lucide-react';
import { Organization } from '../types';

export const SuperAdminDashboard: React.FC<{ 
  onLogout: () => void,
  onAdminLogin?: (user: any) => void 
}> = ({ onLogout, onAdminLogin }) => {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [showAddOrg, setShowAddOrg] = useState(false);
  const [newOrg, setNewOrg] = useState({ name: '', slug: '' });
  const [inviteEmail, setInviteEmail] = useState('');
  const [selectedOrg, setSelectedOrg] = useState<number | null>(null);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [invites, setInvites] = useState<any[]>([]);
  const [appUrl, setAppUrl] = useState('');
  const [showEmailTemplate, setShowEmailTemplate] = useState<{ email: string, token: string } | null>(null);
  const [showManageAdmin, setShowManageAdmin] = useState<{ id: number, name: string } | null>(null);
  const [adminForm, setAdminForm] = useState({ email: '', password: '', name: '' });
  const [adminLoading, setAdminLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [showAdminPassword, setShowAdminPassword] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      await Promise.all([fetchOrganizations(), fetchInvites()]);
      setInitialLoading(false);
    };
    loadData();
  }, []);

  useEffect(() => {
    if (showManageAdmin) {
      fetchAdminDetails(showManageAdmin.id);
    }
  }, [showManageAdmin]);

  const fetchAdminDetails = async (id: number) => {
    setAdminLoading(true);
    try {
      const res = await fetch(`/api/super/organizations/${id}/admin`);
      const data = await res.json();
      if (data) {
        setAdminForm({ email: data.email, password: data.plain_password || '', name: data.name });
      } else {
        setAdminForm({ email: '', password: '', name: '' });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setAdminLoading(false);
    }
  };

  const handleUpdateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showManageAdmin) return;
    setAdminLoading(true);
    try {
      const res = await fetch(`/api/super/organizations/${showManageAdmin.id}/admin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(adminForm)
      });
      if (res.ok) {
        alert('Admin credentials updated successfully!');
        setShowManageAdmin(null);
      }
    } catch (err) {
      alert('Failed to update admin credentials');
    } finally {
      setAdminLoading(false);
    }
  };

  const fetchOrganizations = async () => {
    try {
      const res = await fetch('/api/super/organizations');
      const data = await res.json();
      setOrganizations(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to fetch organizations:', err);
      setOrganizations([]);
    }
  };

  const fetchInvites = async () => {
    try {
      const res = await fetch('/api/super/invites');
      const data = await res.json();
      setInvites(data.invites || []);
      setAppUrl(data.appUrl || '');
    } catch (err) {
      console.error('Failed to fetch invites:', err);
      setInvites([]);
    }
  };

  const handleToggleStatus = async (id: number, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
    const res = await fetch(`/api/super/organizations/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus })
    });
    if (res.ok) {
      fetchOrganizations();
    }
  };

  const handleRevokeInvite = async (token: string) => {
    // Using a custom alert/confirm pattern is better for iframes
    if (!window.confirm('Are you sure you want to revoke this invitation?')) return;
    const res = await fetch(`/api/super/invites/${token}`, {
      method: 'DELETE'
    });
    if (res.ok) {
      fetchInvites();
    }
  };

  const handleLoginAs = async (orgId: number) => {
    try {
      const res = await fetch(`/api/super/login-as/${orgId}`, { method: 'POST' });
      const data = await res.json();
      if (res.ok && onAdminLogin) {
        onAdminLogin(data.user);
      } else {
        alert(data.error || 'Failed to login as admin');
      }
    } catch (err) {
      alert('Connection error');
    }
  };

  const handleCreateOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/super/organizations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newOrg)
    });
    if (res.ok) {
      setShowAddOrg(false);
      setNewOrg({ name: '', slug: '' });
      fetchOrganizations();
    }
  };

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrg) return;
    const res = await fetch('/api/super/invites', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ organization_id: selectedOrg, email: inviteEmail })
    });
    if (res.ok) {
      fetchInvites();
      setInviteEmail('');
      setSelectedOrg(null);
    }
  };

  const copyInviteLink = (token: string) => {
    const baseUrl = appUrl || window.location.origin;
    const link = `${baseUrl}${baseUrl.endsWith('/') ? '' : '/'}setup/${token}`;
    navigator.clipboard.writeText(link);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 2000);
  };

  if (initialLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="animate-spin text-emerald-500" size={32} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <nav className="border-b border-zinc-800 p-6 flex justify-between items-center">
        <div className="flex items-center space-x-3">
          <Building2 className="text-emerald-500" />
          <h1 className="text-xl font-bold tracking-tight">SUPER ADMIN</h1>
        </div>
        <button 
          onClick={onLogout}
          className="flex items-center space-x-2 text-zinc-400 hover:text-white transition-colors"
        >
          <LogOut size={20} />
          <span>Logout</span>
        </button>
      </nav>

      <main className="p-8 max-w-7xl mx-auto space-y-8">
        <div className="flex justify-between items-end">
          <div>
            <h2 className="text-3xl font-black tracking-tighter">ORGANIZATIONS</h2>
            <p className="text-zinc-500">Manage multi-tenant business accounts</p>
          </div>
          <button 
            onClick={() => setShowAddOrg(true)}
            className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-3 rounded-xl font-bold flex items-center space-x-2 transition-all shadow-lg shadow-emerald-900/20"
          >
            <Plus size={20} />
            <span>New Organization</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {organizations.map(org => (
            <div key={org.id} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-xl font-bold">{org.name}</h3>
                  <p className="text-zinc-500 text-sm">slug: {org.slug}</p>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-bold ${org.status === 'active' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
                  {org.status.toUpperCase()}
                </span>
              </div>

              <div className="pt-4 flex space-x-2">
                <button 
                  onClick={() => setSelectedOrg(Number(org.id))}
                  className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white py-2 rounded-lg text-sm font-bold flex items-center justify-center space-x-2"
                >
                  <Mail size={16} />
                  <span>Invite Admin</span>
                </button>
                <button 
                  onClick={() => handleToggleStatus(Number(org.id), org.status)}
                  className={`p-2 rounded-lg ${org.status === 'active' ? 'bg-red-500/10 text-red-500 hover:bg-red-500/20' : 'bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20'}`}
                  title={org.status === 'active' ? 'Revoke Access' : 'Restore Access'}
                >
                  {org.status === 'active' ? <ShieldAlert size={16} /> : <ShieldCheck size={16} />}
                </button>
                <button 
                  onClick={() => setShowManageAdmin({ id: Number(org.id), name: org.name })}
                  className="p-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 rounded-lg"
                  title="Manage Admin Credentials"
                >
                  <UserCog size={16} />
                </button>
                <button 
                  onClick={() => handleLoginAs(Number(org.id))}
                  className="p-2 bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-500 rounded-lg"
                  title="Login as Admin"
                >
                  <LogOut size={16} className="rotate-180" />
                </button>
                <a 
                  href={`/${org.slug}`} 
                  target="_blank" 
                  rel="noreferrer"
                  className="p-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 rounded-lg"
                >
                  <ExternalLink size={16} />
                </a>
              </div>
            </div>
          ))}
        </div>

        {invites.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-xl font-bold">Recent Invites</h3>
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-zinc-950 text-zinc-500 text-xs uppercase font-bold">
                  <tr>
                    <th className="p-4">Email</th>
                    <th className="p-4">Organization</th>
                    <th className="p-4">Status</th>
                    <th className="p-4">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800">
                  {invites.map((invite, i) => (
                    <tr key={i}>
                      <td className="p-4">
                        <div className="font-bold">{invite.email}</div>
                        <div className="text-xs text-zinc-500">
                          {invite.created_at ? new Date(invite.created_at).toLocaleDateString() : 'Pending'}
                        </div>
                      </td>
                      <td className="p-4 text-zinc-400">
                        {organizations.find(o => Number(o.id) === invite.organization_id)?.name}
                      </td>
                      <td className="p-4">
                        {invite.accepted_at ? (
                          <span className="text-emerald-500 text-xs font-bold flex items-center space-x-1">
                            <CheckCircle size={12} />
                            <span>Accepted</span>
                          </span>
                        ) : new Date(invite.expires_at) < new Date() ? (
                          <span className="text-red-500 text-xs font-bold flex items-center space-x-1">
                            <XCircle size={12} />
                            <span>Expired</span>
                          </span>
                        ) : (
                          <span className="text-amber-500 text-xs font-bold flex items-center space-x-1">
                            <Mail size={12} />
                            <span>Pending</span>
                          </span>
                        )}
                      </td>
                      <td className="p-4">
                        <div className="flex items-center space-x-3">
                          {!invite.accepted_at && (
                            <>
                              <button 
                                onClick={() => copyInviteLink(invite.token)}
                                className="text-zinc-400 hover:text-white"
                                title="Copy Link"
                              >
                                {copiedToken === invite.token ? <Check size={16} /> : <Copy size={16} />}
                              </button>
                              <button 
                                onClick={() => setShowEmailTemplate({ email: invite.email, token: invite.token })}
                                className="text-zinc-400 hover:text-emerald-500"
                                title="Email Template"
                              >
                                <FileText size={16} />
                              </button>
                              <button 
                                onClick={() => handleRevokeInvite(invite.token)}
                                className="text-zinc-400 hover:text-red-500"
                                title="Revoke Invite"
                              >
                                <Trash2 size={16} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* Add Org Modal */}
      {showAddOrg && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-6 z-50">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 w-full max-w-md space-y-6">
            <h3 className="text-2xl font-bold">Create Organization</h3>
            <form onSubmit={handleCreateOrg} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-bold text-zinc-500">Business Name</label>
                <input 
                  type="text"
                  required
                  value={newOrg.name}
                  onChange={e => setNewOrg({...newOrg, name: e.target.value, slug: e.target.value.toLowerCase().replace(/\s+/g, '-')})}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 focus:outline-none focus:border-emerald-500"
                  placeholder="e.g. Acme Corp"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-zinc-500">Slug (URL identifier)</label>
                <input 
                  type="text"
                  required
                  value={newOrg.slug}
                  onChange={e => setNewOrg({...newOrg, slug: e.target.value})}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 focus:outline-none focus:border-emerald-500"
                  placeholder="e.g. acme-corp"
                />
              </div>
              <div className="flex space-x-3 pt-4">
                <button 
                  type="button"
                  onClick={() => setShowAddOrg(false)}
                  className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white py-3 rounded-xl font-bold"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white py-3 rounded-xl font-bold"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Invite Modal */}
      {selectedOrg && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-6 z-50">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 w-full max-w-md space-y-6">
            <h3 className="text-2xl font-bold">Invite Sub Admin</h3>
            <p className="text-zinc-400">Invite a manager to setup their organization account.</p>
            <form onSubmit={handleSendInvite} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-bold text-zinc-500">Admin Email</label>
                <input 
                  type="email"
                  required
                  value={inviteEmail}
                  onChange={e => setInviteEmail(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 focus:outline-none focus:border-emerald-500"
                  placeholder="admin@business.com"
                />
              </div>
              <div className="flex space-x-3 pt-4">
                <button 
                  type="button"
                  onClick={() => setSelectedOrg(null)}
                  className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white py-3 rounded-xl font-bold"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white py-3 rounded-xl font-bold"
                >
                  Send Invite
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Email Template Modal */}
      {showEmailTemplate && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-6 z-50">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 w-full max-w-2xl space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-2xl font-bold">Email Template</h3>
              <button onClick={() => setShowEmailTemplate(null)} className="text-zinc-500 hover:text-white">
                <XCircle size={24} />
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="bg-black border border-zinc-800 rounded-xl p-6 font-mono text-sm whitespace-pre-wrap">
{`Subject: Welcome to ShiftSnap - Setup Your Account

Hi there,

You've been invited to manage your organization on ShiftSnap.

To get started, please use the secure setup link below to create your admin account and configure your business settings:

${(appUrl || window.location.origin).replace(/\/$/, '')}/setup/${showEmailTemplate.token}

This link will expire in 7 days.

Best regards,
The ShiftSnap Team`}
              </div>
              
              <div className="flex space-x-3">
                <button 
                  onClick={() => {
                    const baseUrl = (appUrl || window.location.origin).replace(/\/$/, '');
                    const body = `Hi there,\n\nYou've been invited to manage your organization on ShiftSnap.\n\nTo get started, please use the secure setup link below to create your admin account and configure your business settings:\n\n${baseUrl}/setup/${showEmailTemplate.token}\n\nThis link will expire in 7 days.\n\nBest regards,\nThe ShiftSnap Team`;
                    navigator.clipboard.writeText(body);
                    alert('Email body copied to clipboard!');
                  }}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white py-3 rounded-xl font-bold flex items-center justify-center space-x-2"
                >
                  <Copy size={20} />
                  <span>Copy Body</span>
                </button>
                <a 
                  href={`mailto:${showEmailTemplate.email}?subject=Welcome to ShiftSnap - Setup Your Account&body=${encodeURIComponent(`Hi there,\n\nYou've been invited to manage your organization on ShiftSnap.\n\nTo get started, please use the secure setup link below to create your admin account and configure your business settings:\n\n${(appUrl || window.location.origin).replace(/\/$/, '')}/setup/${showEmailTemplate.token}\n\nThis link will expire in 7 days.\n\nBest regards,\nThe ShiftSnap Team`)}`}
                  className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white py-3 rounded-xl font-bold flex items-center justify-center space-x-2"
                >
                  <Mail size={20} />
                  <span>Open in Mail</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Manage Admin Modal */}
      {showManageAdmin && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-6 z-50">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 w-full max-w-md space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-2xl font-bold">Manage Admin</h3>
              <button onClick={() => setShowManageAdmin(null)} className="text-zinc-500 hover:text-white">
                <XCircle size={24} />
              </button>
            </div>
            <p className="text-zinc-400 text-sm">Directly set or reset the admin credentials for <span className="text-white font-bold">{showManageAdmin.name}</span>.</p>
            
            {adminLoading && !adminForm.email ? (
              <div className="flex justify-center py-8">
                <Loader2 className="animate-spin text-emerald-500" />
              </div>
            ) : (
              <form onSubmit={handleUpdateAdmin} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-zinc-500">Admin Name</label>
                  <input 
                    type="text"
                    required
                    value={adminForm.name}
                    onChange={e => setAdminForm({...adminForm, name: e.target.value})}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 focus:outline-none focus:border-emerald-500"
                    placeholder="e.g. John Doe"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-zinc-500">Admin Email</label>
                  <input 
                    type="email"
                    required
                    value={adminForm.email}
                    onChange={e => setAdminForm({...adminForm, email: e.target.value})}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 focus:outline-none focus:border-emerald-500"
                    placeholder="admin@business.com"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-zinc-500">Password</label>
                  <div className="relative">
                    <input 
                      type={showAdminPassword ? "text" : "password"}
                      required
                      value={adminForm.password}
                      onChange={e => setAdminForm({...adminForm, password: e.target.value})}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 pr-12 focus:outline-none focus:border-emerald-500"
                      placeholder="••••••••"
                    />
                    <button 
                      type="button"
                      onClick={() => setShowAdminPassword(!showAdminPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white"
                    >
                      {showAdminPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                  <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest">This is the password the tenant will use to log in</p>
                </div>
                <button 
                  type="submit"
                  disabled={adminLoading}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-3 rounded-xl font-bold flex items-center justify-center space-x-2 disabled:opacity-50"
                >
                  {adminLoading ? <Loader2 className="animate-spin" size={20} /> : <Key size={20} />}
                  <span>{adminForm.email ? 'Update Credentials' : 'Create Admin'}</span>
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

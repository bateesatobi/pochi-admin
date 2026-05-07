import React, { useState } from 'react';
import { Settings as SettingsIcon, Plus, ShieldCheck } from 'lucide-react';
import { api } from '../context/AdminAuthContext';
import { useAdminAuth } from '../context/AdminAuthContext';

const Settings = () => {
  const { admin } = useAdminAuth();
  const [form, setForm] = useState({ email:'', password:'', full_name:'' });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const handleCreate = async (e) => {
    e.preventDefault();
    setLoading(true); setSuccess(''); setError('');
    try {
      const params = new URLSearchParams(form);
      await api.post(`/admin/create-admin?email=${form.email}&password=${form.password}&full_name=${encodeURIComponent(form.full_name)}`);
      setSuccess(`Admin account for ${form.email} created successfully.`);
      setForm({ email:'', password:'', full_name:'' });
    } catch (e) { setError(e.response?.data?.detail || 'Failed to create admin.'); }
    setLoading(false);
  };

  return (
    <div className="animate-fade">
      <div className="page-header">
        <h1>System Settings</h1>
        <p>Administrative account management and platform configuration.</p>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:24 }}>
        {/* Current admin info */}
        <div className="card">
          <div style={{ display:'flex', alignItems:'center', gap:14, marginBottom:20 }}>
            <div style={{ width:56, height:56, borderRadius:14, background:'var(--primary-glow)', border:'1px solid var(--primary)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:22, fontWeight:900, color:'var(--primary)' }}>
              {admin?.full_name?.[0] || 'A'}
            </div>
            <div>
              <div style={{ fontSize:17, fontWeight:800, color:'var(--text)' }}>{admin?.full_name || 'Admin'}</div>
              <div style={{ fontSize:13, color:'var(--text-muted)' }}>{admin?.email}</div>
              <span className="badge badge-admin" style={{ marginTop:4 }}>Super Admin</span>
            </div>
          </div>
          <div style={{ background:'var(--glass)', border:'1px solid var(--border)', borderRadius:10, padding:16 }}>
            <div style={{ display:'flex', alignItems:'center', gap:8, color:'var(--success)', fontSize:13, fontWeight:700 }}>
              <ShieldCheck size={16}/> Session is active and authenticated
            </div>
          </div>
        </div>

        {/* Create new admin */}
        <div className="card">
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:20 }}>
            <Plus size={18} color="var(--primary)"/>
            <h3 style={{ fontSize:15, fontWeight:800, color:'var(--text)' }}>Create New Admin Account</h3>
          </div>

          {success && <div style={{ background:'rgba(16,185,129,0.1)', border:'1px solid rgba(16,185,129,0.3)', borderRadius:8, padding:12, fontSize:13, color:'#34D399', marginBottom:16 }}>{success}</div>}
          {error && <div style={{ background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.3)', borderRadius:8, padding:12, fontSize:13, color:'#F87171', marginBottom:16 }}>{error}</div>}

          <form onSubmit={handleCreate} style={{ display:'flex', flexDirection:'column', gap:16 }}>
            <div className="form-group">
              <label>Full Name</label>
              <input className="form-input" placeholder="Jane Doe" value={form.full_name} onChange={e=>setForm(f=>({...f,full_name:e.target.value}))} required/>
            </div>
            <div className="form-group">
              <label>Email Address</label>
              <input className="form-input" type="email" placeholder="admin@pakacha.com" value={form.email} onChange={e=>setForm(f=>({...f,email:e.target.value}))} required/>
            </div>
            <div className="form-group">
              <label>Password</label>
              <input className="form-input" type="password" placeholder="Strong password..." value={form.password} onChange={e=>setForm(f=>({...f,password:e.target.value}))} required/>
            </div>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              <Plus size={16}/> {loading ? 'Creating...' : 'Create Admin'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Settings;

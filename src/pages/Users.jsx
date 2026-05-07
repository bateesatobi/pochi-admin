import React, { useState, useEffect } from 'react';
import { Users, Search, X, Eye, UserCheck, UserX, Trash2, ShoppingBag, CreditCard, Building2, MapPin, AlertCircle } from 'lucide-react';
import { api } from '../context/AdminAuthContext';

const ROLES = ['', 'CUSTOMER', 'BUSINESS_OWNER', 'ADMIN'];

const UsersPage = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [selected, setSelected] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [page, setPage] = useState(1);
  const PER_PAGE = 15;

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const params = roleFilter ? `?role=${roleFilter}` : '';
      const r = await api.get(`/admin/users${params}`);
      setUsers(r.data);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { fetchUsers(); }, [roleFilter]);

  const filtered = users.filter(u =>
    u.email?.toLowerCase().includes(search.toLowerCase()) ||
    u.full_name?.toLowerCase().includes(search.toLowerCase())
  );
  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const paged = filtered.slice((page-1)*PER_PAGE, page*PER_PAGE);

  const openDrawer = async (user) => {
    setDrawerOpen(true);
    setSelected({ user, stats: null, business: null });
    try {
      const r = await api.get(`/admin/users/${user.id}`);
      setSelected(r.data);
    } catch (e) { console.error(e); }
  };

  const toggleStatus = async (id) => {
    setActionLoading(true);
    try {
      const r = await api.patch(`/admin/users/${id}/status`);
      setUsers(prev => prev.map(u => u.id === id ? { ...u, is_active: r.data.is_active } : u));
      if (selected?.user?.id === id) setSelected(s => ({ ...s, user: { ...s.user, is_active: r.data.is_active } }));
    } catch (e) { alert(e.response?.data?.detail || 'Action failed'); }
    setActionLoading(false);
  };

  const deleteUser = async (id) => {
    if (!confirm('Delete this user permanently?')) return;
    setActionLoading(true);
    try {
      await api.delete(`/admin/users/${id}`);
      setDrawerOpen(false);
      await fetchUsers();
    } catch (e) { alert(e.response?.data?.detail || 'Failed'); }
    setActionLoading(false);
  };

  const user = selected?.user;
  const business = selected?.business;
  const stats = selected?.stats;

  return (
    <div className="animate-fade">
      <div className="page-header">
        <h1>Users & Customers</h1>
        <p>Manage all platform users — customers, business owners, and admins.</p>
      </div>

      <div className="controls-bar">
        <div className="search-input-wrap">
          <Search size={16}/>
          <input placeholder="Search by name or email..." value={search} onChange={e=>{setSearch(e.target.value);setPage(1);}} />
        </div>
        <select className="filter-select" value={roleFilter} onChange={e=>{setRoleFilter(e.target.value);setPage(1);}}>
          {ROLES.map(r => <option key={r} value={r}>{r || 'All Roles'}</option>)}
        </select>
      </div>

      <div className="table-wrapper">
        <table className="data-table">
          <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th>Verified</th><th>Actions</th></tr></thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6}><div className="loader-wrap" style={{padding:'40px 0'}}><div className="spinner"/>Loading...</div></td></tr>
            ) : paged.length === 0 ? (
              <tr><td colSpan={6}><div className="empty-state"><Users size={40}/><p>No users found.</p></div></td></tr>
            ) : paged.map(u => (
              <tr key={u.id}>
                <td className="td-name">{u.full_name || '—'}</td>
                <td>{u.email}</td>
                <td><span className={`badge badge-${u.role?.toLowerCase()}`}>{u.role}</span></td>
                <td><span className={`badge ${u.is_active ? 'badge-active' : 'badge-inactive'}`}>{u.is_active ? 'Active' : 'Inactive'}</span></td>
                <td><span className={`badge ${u.is_verified ? 'badge-approved' : 'badge-pending'}`}>{u.is_verified ? 'Yes' : 'No'}</span></td>
                <td>
                  <div style={{display:'flex',gap:6}}>
                    <button className="btn btn-ghost btn-sm btn-icon" onClick={()=>openDrawer(u)}><Eye size={14}/></button>
                    <button className={`btn btn-sm btn-icon ${u.is_active ? 'btn-danger' : 'btn-success'}`} onClick={()=>toggleStatus(u.id)} disabled={actionLoading}>
                      {u.is_active ? <UserX size={14}/> : <UserCheck size={14}/>}
                    </button>
                    <button className="btn btn-danger btn-sm btn-icon" onClick={()=>deleteUser(u.id)} disabled={actionLoading}><Trash2 size={14}/></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {totalPages > 1 && (
          <div className="pagination">
            <div className="pagination-info">Showing {(page-1)*PER_PAGE+1}–{Math.min(page*PER_PAGE,filtered.length)} of {filtered.length}</div>
            <div className="pagination-btns">
              <button className="p-btn" disabled={page===1} onClick={()=>setPage(p=>p-1)}>‹</button>
              {[...Array(totalPages)].map((_,i)=><button key={i} className={`p-btn ${page===i+1?'active':''}`} onClick={()=>setPage(i+1)}>{i+1}</button>)}
              <button className="p-btn" disabled={page===totalPages} onClick={()=>setPage(p=>p+1)}>›</button>
            </div>
          </div>
        )}
      </div>

      <div className={`drawer-overlay ${drawerOpen?'open':''}`} onClick={()=>setDrawerOpen(false)}>
        <div className="drawer" onClick={e=>e.stopPropagation()}>
          <div className="drawer-head">
            <div className="drawer-head-left">
              <div className="drawer-head-icon"><Users size={20}/></div>
              <div><h2>{user?.full_name||'User Details'}</h2><p>{user?.email}</p></div>
            </div>
            <button className="drawer-close" onClick={()=>setDrawerOpen(false)}><X size={16}/></button>
          </div>
          <div className="drawer-body">
            {user && (
              <>
                {/* Linked Business Section */}
                {user.role === 'BUSINESS_OWNER' && (
                  <div className="detail-section" style={{ border:`1px solid ${business ? 'var(--accent)' : 'var(--danger)'}`, background: business ? 'rgba(249,115,22,0.05)' : 'rgba(239,68,68,0.05)' }}>
                    <div className="detail-section-title" style={{ color: business ? 'var(--accent)' : 'var(--danger)' }}>Linked Business Profile</div>
                    {business ? (
                      <div style={{ display:'flex', alignItems:'center', gap:16 }}>
                        <div style={{ width:48, height:48, borderRadius:12, background:'var(--accent)', color:'white', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                          <Building2 size={24}/>
                        </div>
                        <div style={{ flex:1 }}>
                          <div style={{ fontSize:16, fontWeight:800, color:'var(--text)' }}>{business.name}</div>
                          <div style={{ display:'flex', alignItems:'center', gap:8, marginTop:4 }}>
                            <span className={`badge badge-${business.status?.toLowerCase()}`}>{business.status}</span>
                            <span style={{ fontSize:12, color:'var(--text-subtle)', display:'flex', alignItems:'center', gap:4 }}>
                              <MapPin size={12}/> {business.city}
                            </span>
                          </div>
                        </div>
                        <a href={`/businesses?search=${encodeURIComponent(business.name)}`} className="btn btn-ghost btn-sm btn-icon" title="View Full Business Profile">
                          <Eye size={14}/>
                        </a>
                      </div>
                    ) : (
                      <div style={{ display:'flex', alignItems:'center', gap:10, color:'var(--danger)', fontSize:13, fontWeight:600 }}>
                        <AlertCircle size={18}/> No business linked to this owner account.
                      </div>
                    )}
                  </div>
                )}

                {/* Show stats for anyone who has ordered anything */}
                {(stats?.order_count > 0 || user.role === 'CUSTOMER') && (
                  <div className="detail-section">
                    <div className="detail-section-title">Platform Purchasing Stats</div>
                    <div className="detail-grid">
                      <div className="detail-item">
                        <label><ShoppingBag size={10} style={{marginRight:4}}/> Total Orders</label>
                        <span style={{fontSize:18,fontWeight:800}}>{stats?.order_count || 0}</span>
                      </div>
                      <div className="detail-item">
                        <label><CreditCard size={10} style={{marginRight:4}}/> Total Spent</label>
                        <span style={{fontSize:18,fontWeight:800,color:'var(--primary)'}}>UGX {(stats?.total_spent || 0).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                )}

                <div className="detail-section">
                  <div className="detail-section-title">Account Information</div>
                  <div className="detail-grid">
                    <div className="detail-item"><label>Full Name</label><span>{user.full_name||'—'}</span></div>
                    <div className="detail-item"><label>Email</label><span>{user.email}</span></div>
                    <div className="detail-item"><label>Role</label><span><span className={`badge badge-${user.role?.toLowerCase()}`}>{user.role}</span></span></div>
                    <div className="detail-item"><label>Status</label><span><span className={`badge ${user.is_active?'badge-active':'badge-inactive'}`}>{user.is_active?'Active':'Inactive'}</span></span></div>
                    <div className="detail-item"><label>Verified</label><span>{user.is_verified?'Yes':'No'}</span></div>
                    <div className="detail-item"><label>Joined</label><span>{user.created_at ? new Date(user.created_at).toLocaleDateString() : '—'}</span></div>
                    <div className="detail-item" style={{gridColumn:'1/-1'}}><label>User ID</label><span style={{fontSize:12,opacity:0.7}}>{user.id}</span></div>
                  </div>
                </div>
              </>
            )}
          </div>
          <div className="drawer-footer">
            <button className={`btn flex-1 ${user?.is_active?'btn-danger':'btn-success'}`} disabled={actionLoading} onClick={()=>user&&toggleStatus(user.id)}>
              {user?.is_active ? <><UserX size={16}/> Deactivate</> : <><UserCheck size={16}/> Activate</>}
            </button>
            <button className="btn btn-danger btn-icon" disabled={actionLoading} onClick={()=>user&&deleteUser(user.id)}><Trash2 size={16}/></button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UsersPage;

import React, { useState } from 'react';
import { Building2, Search, X, Eye, CheckCircle, XCircle, AlertCircle, Trash2, RefreshCw, BarChart3, TrendingUp, Package, Clock, ShieldAlert, Wallet } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '../context/AdminAuthContext';
import { useBusinesses } from '../hooks/queries';
import { alertSuccess, alertError, confirmDelete } from '../utils/swal';

const STATUS_OPTIONS = ['', 'BASIC_REGISTERED', 'KYC_SUBMITTED', 'APPROVED', 'REJECTED', 'SUSPENDED'];

const Businesses = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const { data: businesses = [], isLoading: loading, refetch } = useBusinesses(statusFilter);
  const [selected, setSelected] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [page, setPage] = useState(1);
  const PER_PAGE = 12;

  const refreshBusinesses = () =>
    queryClient.invalidateQueries({ queryKey: ['admin', 'businesses'] });

  const filtered = businesses.filter(b =>
    b.name?.toLowerCase().includes(search.toLowerCase()) ||
    b.city?.toLowerCase().includes(search.toLowerCase()) ||
    b.contact_email?.toLowerCase().includes(search.toLowerCase())
  );

  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const paged = filtered.slice((page-1)*PER_PAGE, page*PER_PAGE);

  const openDrawer = async (biz) => {
    setDrawerOpen(true);
    setSelected({ business: biz, stats: null });
    try {
      const r = await api.get(`/admin/businesses/${biz.id}`);
      setSelected(r.data);
    } catch { setSelected({ business: biz, owner: null, stats: null }); }
  };

  const updateStatus = async (id, status) => {
    setActionLoading(true);
    try {
      await api.patch(`/admin/businesses/${id}/status?new_status=${status}`);
      await refreshBusinesses();
      if (selected?.business?.id === id) {
        const r = await api.get(`/admin/businesses/${id}`);
        setSelected(r.data);
      }
      alertSuccess('Status Updated', `Business status updated to ${status}.`);
    } catch (e) { 
      alertError('Action Failed', e.response?.data?.detail || 'Action failed');
    }
    setActionLoading(false);
  };

  const deleteBiz = async (id) => {
    const result = await confirmDelete({
      title: 'Delete business?',
      text: 'This business profile will be permanently removed.',
    });
    if (!result.isConfirmed) return;
    
    setActionLoading(true);
    try {
      await api.delete(`/admin/businesses/${id}`);
      setDrawerOpen(false);
      await refreshBusinesses();
      alertSuccess('Deleted', 'The business profile has been deleted.');
    } catch (e) { 
      alertError('Delete Failed', e.response?.data?.detail || 'Delete failed');
    }
    setActionLoading(false);
  };

  const biz = selected?.business;
  const stats = selected?.stats;

  return (
    <div className="animate-fade">
      <div className="page-header" style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
        <div>
          <h1>Business Management</h1>
          <p>Approve KYC submissions and oversee all registered merchants.</p>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={() => refetch()}><RefreshCw size={14}/> Refresh</button>
      </div>

      <div className="controls-bar">
        <div className="search-input-wrap">
          <Search size={16}/>
          <input placeholder="Search by name, city or email..." value={search} onChange={e=>{setSearch(e.target.value);setPage(1);}} />
        </div>
        <select className="filter-select" value={statusFilter} onChange={e=>{setStatusFilter(e.target.value);setPage(1);}}>
          {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s || 'All Statuses'}</option>)}
        </select>
      </div>

      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th>Business Name</th>
              <th>Location</th>
              <th>Currency</th>
              <th>Status</th>
              <th>Contact</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6}><div className="loader-wrap" style={{padding:'40px 0'}}><div className="spinner"/>Loading...</div></td></tr>
            ) : paged.length === 0 ? (
              <tr><td colSpan={6}><div className="empty-state"><Building2 size={40}/><p>No businesses found.</p></div></td></tr>
            ) : paged.map(b => (
              <tr key={b.id}>
                <td className="td-name">{b.name}</td>
                <td>{b.city}, {b.country}</td>
                <td>{b.trading_currency}</td>
                <td><span className={`badge badge-${b.status?.toLowerCase()}`}>{b.status?.replace('_',' ')}</span></td>
                <td>{b.contact_email}</td>
                <td>
                  <div style={{ display:'flex', gap:6 }}>
                    <button className="btn btn-ghost btn-sm btn-icon" onClick={() => openDrawer(b)} title="View"><Eye size={14}/></button>
                    {b.status === 'KYC_SUBMITTED' && (
                      <>
                        <button className="btn btn-success btn-sm btn-icon" onClick={() => updateStatus(b.id,'APPROVED')} title="Approve"><CheckCircle size={14}/></button>
                        <button className="btn btn-danger btn-sm btn-icon" onClick={() => updateStatus(b.id,'REJECTED')} title="Reject"><XCircle size={14}/></button>
                      </>
                    )}
                    {b.status === 'APPROVED' && (
                      <button className="btn btn-danger btn-sm btn-icon" onClick={() => updateStatus(b.id,'SUSPENDED')} title="Suspend"><AlertCircle size={14}/></button>
                    )}
                    {b.status === 'SUSPENDED' && (
                      <button className="btn btn-success btn-sm btn-icon" onClick={() => updateStatus(b.id,'APPROVED')} title="Reinstate"><CheckCircle size={14}/></button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {totalPages > 1 && (
          <div className="pagination">
            <div className="pagination-info">Showing {(page-1)*PER_PAGE+1}–{Math.min(page*PER_PAGE, filtered.length)} of {filtered.length}</div>
            <div className="pagination-btns">
              <button className="p-btn" disabled={page===1} onClick={()=>setPage(p=>p-1)}>‹</button>
              {[...Array(totalPages)].map((_,i)=><button key={i} className={`p-btn ${page===i+1?'active':''}`} onClick={()=>setPage(i+1)}>{i+1}</button>)}
              <button className="p-btn" disabled={page===totalPages} onClick={()=>setPage(p=>p+1)}>›</button>
            </div>
          </div>
        )}
      </div>

      {/* Drawer */}
      <div className={`drawer-overlay ${drawerOpen ? 'open' : ''}`} onClick={()=>setDrawerOpen(false)}>
        <div className="drawer" onClick={e=>e.stopPropagation()}>
          <div className="drawer-head">
            <div className="drawer-head-left">
              <div className="drawer-head-icon"><Building2 size={20}/></div>
              <div>
                <h2>{biz?.name || 'Business Details'}</h2>
                <p><span className={`badge badge-${biz?.status?.toLowerCase()}`}>{biz?.status?.replace('_',' ')}</span></p>
              </div>
            </div>
            <button className="drawer-close" onClick={()=>setDrawerOpen(false)}><X size={16}/></button>
          </div>

          <div className="drawer-body">
            {biz && <>
              {/* Business Health Scorecard */}
              <div className="detail-section" style={{ border:'1px solid var(--primary-glow)', background:'rgba(79,70,229,0.05)' }}>
                <div className="detail-section-title" style={{ color:'var(--primary)' }}>Business Health Scorecard</div>
                <div className="detail-grid" style={{ gridTemplateColumns:'repeat(2, 1fr)', rowGap:16 }}>
                  <div className="detail-item">
                    <label><TrendingUp size={10} style={{marginRight:4}}/> Fulfillment Rate</label>
                    <span style={{ fontSize:20, fontWeight:900, color: (stats?.fulfillment_rate||0) > 80 ? 'var(--success)' : (stats?.fulfillment_rate||0) > 50 ? 'var(--warning)' : 'var(--danger)' }}>
                      {Math.round(stats?.fulfillment_rate || 0)}%
                    </span>
                  </div>
                  <div className="detail-item">
                    <label><BarChart3 size={10} style={{marginRight:4}}/> Avg. Order Value</label>
                    <span style={{ fontSize:16, fontWeight:800 }}>UGX {Math.round(stats?.avg_order_value || 0).toLocaleString()}</span>
                  </div>
                  <div className="detail-item">
                    <label><Wallet size={10} style={{marginRight:4}}/> Platform Fees</label>
                    <span style={{ fontSize:16, fontWeight:800, color:'var(--primary)' }}>UGX {Math.round(stats?.platform_fees || 0).toLocaleString()}</span>
                  </div>
                  <div className="detail-item">
                    <label><ShieldAlert size={10} style={{marginRight:4}}/> Inventory Health</label>
                    <span style={{ fontSize:14, fontWeight:700, color: (stats?.out_of_stock||0) > 0 ? 'var(--danger)' : 'var(--success)' }}>
                      {stats?.out_of_stock || 0} Out of Stock
                    </span>
                  </div>
                  <div className="detail-item">
                    <label><Clock size={10} style={{marginRight:4}}/> Last Active</label>
                    <span style={{ fontSize:12, color:'var(--text-muted)' }}>{stats?.last_active ? new Date(stats.last_active).toLocaleString() : '—'}</span>
                  </div>
                  <div className="detail-item">
                    <label><Package size={10} style={{marginRight:4}}/> Platform Revenue</label>
                    <span style={{ fontSize:16, fontWeight:800, color:'var(--success)' }}>UGX {(stats?.total_revenue || 0).toLocaleString()}</span>
                  </div>
                </div>
              </div>

              <div className="detail-section">
                <div className="detail-section-title">Operational Overview</div>
                <div className="detail-grid">
                  <div className="detail-item"><label>Total Products</label><span>{stats?.product_count || 0} Listings</span></div>
                  <div className="detail-item"><label>Order Volume</label><span>{stats?.order_count || 0} Paid Orders</span></div>
                </div>
              </div>

              <div className="detail-section">
                <div className="detail-section-title">Business Info</div>
                <div className="detail-grid">
                  <div className="detail-item"><label>Name</label><span>{biz.name}</span></div>
                  <div className="detail-item"><label>City</label><span>{biz.city}</span></div>
                  <div className="detail-item"><label>Country</label><span>{biz.country}</span></div>
                  <div className="detail-item"><label>Currency</label><span>{biz.trading_currency}</span></div>
                  <div className="detail-item"><label>Role</label><span>{biz.business_role}</span></div>
                  <div className="detail-item"><label>Status</label><span>{biz.status}</span></div>
                </div>
              </div>

              <div className="detail-section">
                <div className="detail-section-title">Contact Information</div>
                <div className="detail-grid">
                  <div className="detail-item"><label>Contact Person</label><span>{biz.contact_person_name}</span></div>
                  <div className="detail-item"><label>Designation</label><span>{biz.contact_person_designation}</span></div>
                  <div className="detail-item"><label>Email</label><span>{biz.contact_email}</span></div>
                  <div className="detail-item"><label>Phone</label><span>{biz.contact_telephone}</span></div>
                </div>
              </div>

              {selected?.owner && (
                <div className="detail-section">
                  <div className="detail-section-title">Primary Owner Account</div>
                  <div className="detail-grid">
                    <div className="detail-item"><label>Name</label><span>{selected.owner.full_name}</span></div>
                    <div className="detail-item"><label>Email</label><span>{selected.owner.email}</span></div>
                  </div>
                </div>
              )}

              {/* KYC Docs preview */}
              {(biz.logo_b64 || biz.license_b64 || biz.refund_policy_b64) && (
                <div className="detail-section">
                  <div className="detail-section-title">KYC Documents</div>
                  <div style={{ display:'flex', gap:12, flexWrap:'wrap' }}>
                    {biz.logo_b64 && <div><div style={{fontSize:10,fontWeight:700,color:'var(--text-subtle)',textTransform:'uppercase',marginBottom:6}}>Logo</div><img src={biz.logo_b64} alt="Logo" style={{width:80,height:80,objectFit:'cover',borderRadius:10,border:'1px solid var(--border)'}}/></div>}
                    {biz.license_b64 && <div><div style={{fontSize:10,fontWeight:700,color:'var(--text-subtle)',textTransform:'uppercase',marginBottom:6}}>License</div><img src={biz.license_b64} alt="License" style={{width:80,height:80,objectFit:'cover',borderRadius:10,border:'1px solid var(--border)'}}/></div>}
                    {biz.owner_id_front_b64 && <div><div style={{fontSize:10,fontWeight:700,color:'var(--text-subtle)',textTransform:'uppercase',marginBottom:6}}>ID Front</div><img src={biz.owner_id_front_b64} alt="ID" style={{width:80,height:80,objectFit:'cover',borderRadius:10,border:'1px solid var(--border)'}}/></div>}
                    {biz.refund_policy_b64 && (
                      <div>
                        <div style={{fontSize:10,fontWeight:700,color:'var(--text-subtle)',textTransform:'uppercase',marginBottom:6}}>
                          Refund Policy {biz.refund_policy_type === 'signed_template' ? '(Pochi template)' : '(Own)'}
                        </div>
                        {biz.refund_policy_b64.startsWith('data:image') ? (
                          <img src={biz.refund_policy_b64} alt="Refund policy" style={{width:80,height:80,objectFit:'cover',borderRadius:10,border:'1px solid var(--border)'}}/>
                        ) : (
                          <a href={biz.refund_policy_b64} target="_blank" rel="noopener noreferrer" download style={{fontSize:12,fontWeight:600}}>View document</a>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>}
          </div>

          <div className="drawer-footer">
            {biz?.status === 'KYC_SUBMITTED' && <>
              <button className="btn btn-success flex-1" disabled={actionLoading} onClick={() => updateStatus(biz.id,'APPROVED')}><CheckCircle size={16}/> Approve</button>
              <button className="btn btn-danger" disabled={actionLoading} onClick={() => updateStatus(biz.id,'REJECTED')}><XCircle size={16}/> Reject</button>
            </>}
            {biz?.status === 'APPROVED' && (
              <button className="btn btn-danger" disabled={actionLoading} onClick={() => updateStatus(biz.id,'SUSPENDED')}>Suspend</button>
            )}
            {biz?.status === 'SUSPENDED' && (
              <button className="btn btn-success" disabled={actionLoading} onClick={() => updateStatus(biz.id,'APPROVED')}>Reinstate</button>
            )}
            <button className="btn btn-danger btn-icon" disabled={actionLoading} onClick={() => biz && deleteBiz(biz.id)} title="Delete" style={{marginLeft:'auto'}}><Trash2 size={16}/></button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Businesses;

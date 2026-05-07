import React, { useState, useEffect } from 'react';
import { ShoppingCart, Search, Filter, Calendar, Eye, Download, RefreshCw, User, Building2, CreditCard, X } from 'lucide-react';
import { api } from '../context/AdminAuthContext';

const STATUS_OPTIONS = ['', 'PENDING', 'PAID', 'FULFILLED', 'CANCELLED'];

// Helper to ensure base64 has data URI prefix
const formatImage = (b64) => {
  if (!b64) return null;
  if (b64.startsWith('data:')) return b64;
  return `data:image/jpeg;base64,${b64}`;
};

const Orders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [page, setPage] = useState(1);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const PER_PAGE = 12;

  const fetchOrders = async () => {
    setLoading(true);
    try {
      let url = `/admin/orders?status=${statusFilter}`;
      if (startDate) url += `&start_date=${startDate}`;
      if (endDate) url += `&end_date=${endDate}`;

      const r = await api.get(url);
      setOrders(r.data);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { fetchOrders(); }, [statusFilter, startDate, endDate]);

  const filtered = orders.filter(o =>
    o.id.toLowerCase().includes(search.toLowerCase()) ||
    o.customer_name?.toLowerCase().includes(search.toLowerCase()) ||
    o.business_name?.toLowerCase().includes(search.toLowerCase())
  );
  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const paged = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const stats = {
    total: orders.length,
    revenue: orders.filter(o => o.status !== 'CANCELLED').reduce((acc, o) => acc + o.total, 0),
    pending: orders.filter(o => o.status === 'PENDING').length
  };

  const openDetails = (order) => {
    setSelectedOrder(order);
    setDrawerOpen(true);
  };

  return (
    <div className="animate-fade">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1>Order Oversight</h1>
          <p>Monitor all marketplace transactions and track fulfillment status.</p>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={fetchOrders}><RefreshCw size={14} /> Refresh</button>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(79,70,229,0.1)', color: 'var(--primary)' }}><ShoppingCart size={20} /></div>
          <div className="stat-info">
            <label>Total in View</label>
            <div className="stat-value">{stats.total}</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(16,185,129,0.1)', color: 'var(--success)' }}><CreditCard size={20} /></div>
          <div className="stat-info">
            <label>Revenue (View)</label>
            <div className="stat-value">UGX {stats.revenue.toLocaleString()}</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(245,158,11,0.1)', color: 'var(--warning)' }}><ShoppingCart size={20} /></div>
          <div className="stat-info">
            <label>Pending</label>
            <div className="stat-value">{stats.pending}</div>
          </div>
        </div>
      </div>

      <div className="controls-bar" style={{ flexWrap: 'wrap', gap: 12 }}>
        <div className="search-input-wrap" style={{ flex: '1 1 300px' }}>
          <Search size={16} />
          <input placeholder="Search Order ID, Customer or Business..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
        </div>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <select className="filter-select" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s || 'All Statuses'}</option>)}
          </select>

          <div className="date-filter-group">
            <Calendar size={14} />
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
            <span>–</span>
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
          </div>
        </div>
      </div>

      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th>Order ID</th>
              <th>Customer</th>
              <th>Merchant</th>
              <th>Date</th>
              <th>Total</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7}><div className="loader-wrap" style={{ padding: '40px 0' }}><div className="spinner" />Loading...</div></td></tr>
            ) : paged.length === 0 ? (
              <tr><td colSpan={7}><div className="empty-state"><ShoppingCart size={40} /><p>No orders found.</p></div></td></tr>
            ) : paged.map(o => (
              <tr key={o.id}>
                <td className="td-name" style={{ fontSize: 12, fontFamily: 'monospace' }}>#{o.id.slice(0, 8)}</td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <User size={12} color="var(--primary)" />
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>{o.customer_name}</span>
                  </div>
                </td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 24, height: 24, borderRadius: 6, overflow: 'hidden', background: 'var(--surface-2)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {o.business_logo ? (
                        <img src={formatImage(o.business_logo)} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <Building2 size={12} color="var(--accent)" />
                      )}
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>{o.business_name}</span>
                  </div>
                </td>
                <td>{new Date(o.created_at).toLocaleDateString()}</td>
                <td style={{ fontWeight: 700 }}>{o.total.toLocaleString()} <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{o.currency}</span></td>
                <td><span className={`badge badge-${o.status.toLowerCase()}`}>{o.status}</span></td>
                <td>
                  <button className="btn btn-ghost btn-sm" onClick={() => openDetails(o)}>Details</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {totalPages > 1 && (
          <div className="pagination">
            <div className="pagination-info">Showing {(page - 1) * PER_PAGE + 1}–{Math.min(page * PER_PAGE, filtered.length)} of {filtered.length}</div>
            <div className="pagination-btns">
              <button className="p-btn" disabled={page === 1} onClick={() => setPage(p => p - 1)}>‹</button>
              {[...Array(totalPages)].map((_, i) => <button key={i} className={`p-btn ${page === i + 1 ? 'active' : ''}`} onClick={() => setPage(i + 1)}>{i + 1}</button>)}
              <button className="p-btn" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>›</button>
            </div>
          </div>
        )}
      </div>

      {/* Basic Detail Drawer Placeholder */}
      <div className={`drawer-overlay ${drawerOpen ? 'open' : ''}`} onClick={() => setDrawerOpen(false)}>
        <div className="drawer" onClick={e => e.stopPropagation()}>
          <div className="drawer-head">
            <div className="drawer-head-left">
              <div className="drawer-head-icon"><ShoppingCart size={20} /></div>
              <div>
                <h2>Order Details</h2>
                <p>#{selectedOrder?.id}</p>
              </div>
            </div>
            <button className="drawer-close" onClick={() => setDrawerOpen(false)}><X size={16} /></button>
          </div>
          <div className="drawer-body">
            {selectedOrder && (
              <>
                <div className="detail-section">
                  <div className="detail-section-title">Fulfillment Status</div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--glass)', padding: 12, borderRadius: 12, border: '1px solid var(--border)' }}>
                    <span className={`badge badge-${selectedOrder.status.toLowerCase()}`}>{selectedOrder.status}</span>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{new Date(selectedOrder.created_at).toLocaleString()}</span>
                  </div>
                </div>

                <div className="detail-section">
                  <div className="detail-section-title">Stakeholders</div>
                  <div className="detail-grid">
                    <div className="detail-item">
                      <label>Customer</label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                        <User size={14} color="var(--primary)" />
                        <span>{selectedOrder.customer_name}</span>
                      </div>
                    </div>
                    <div className="detail-item">
                      <label>Merchant</label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                        <Building2 size={14} color="var(--accent)" />
                        <span>{selectedOrder.business_name}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="detail-section">
                  <div className="detail-section-title">Financial Summary</div>
                  <div style={{ fontSize: 24, fontWeight: 900, color: 'var(--text)' }}>
                    {selectedOrder.total.toLocaleString()} {selectedOrder.currency}
                  </div>
                </div>
              </>
            )}
          </div>
          <div className="drawer-footer">
            <button className="btn btn-primary flex-1" onClick={() => window.print()}><Download size={16} /> Export Invoice</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Orders;

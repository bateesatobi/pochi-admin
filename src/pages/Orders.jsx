import React, { useState } from 'react';
import {
  ShoppingCart, Search, Calendar, Eye, Download, RefreshCw, User, Building2,
  CreditCard, X, Package, Truck, CheckCircle, XCircle,
} from 'lucide-react';
import {
  useAdminOrders,
  useAdminOrderDetail,
  useOrderRequests,
  useReviewOrderRequest,
} from '../hooks/queries';
import { toast, alertError, confirmAction } from '../utils/swal';

const STATUS_OPTIONS = ['', 'PENDING', 'PAID', 'FULFILLED', 'DELIVERED', 'CANCELLED', 'REFUNDED'];

const formatImage = (b64) => {
  if (!b64) return null;
  if (b64.startsWith('data:')) return b64;
  return `data:image/jpeg;base64,${b64}`;
};

const shortId = (id) => (id ? String(id).slice(0, 8) : '—');

const Orders = () => {
  const [activeTab, setActiveTab] = useState('orders');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const { data: orders = [], isLoading: loading, refetch } = useAdminOrders({
    statusFilter,
    startDate,
    endDate,
  });
  const { data: refundRequests = [], isLoading: loadingRefunds, refetch: refetchRefunds } = useOrderRequests('PENDING');
  const reviewRequest = useReviewOrderRequest();

  const [page, setPage] = useState(1);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const PER_PAGE = 12;

  const { data: orderDetail, isLoading: detailLoading } = useAdminOrderDetail(
    selectedOrder?.id,
    drawerOpen && !!selectedOrder?.id,
  );

  const filtered = orders.filter((o) =>
    String(o.id).toLowerCase().includes(search.toLowerCase()) ||
    o.customer_name?.toLowerCase().includes(search.toLowerCase()) ||
    o.business_name?.toLowerCase().includes(search.toLowerCase()) ||
    (o.business_names || []).some((n) => n?.toLowerCase().includes(search.toLowerCase())),
  );
  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const paged = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const stats = {
    total: orders.length,
    revenue: orders.filter((o) => o.status !== 'CANCELLED').reduce((acc, o) => acc + (o.total || 0), 0),
    pending: orders.filter((o) => o.status === 'PENDING').length,
    refundQueue: refundRequests.length,
  };

  const openDetails = (order) => {
    setSelectedOrder(order);
    setDrawerOpen(true);
  };

  const displayOrder = orderDetail || selectedOrder;
  const subOrders = orderDetail?.sub_orders || selectedOrder?.sub_orders || [];

  const handleReviewRefund = async (request, action) => {
    const ok = await confirmAction({
      title: action === 'approve' ? 'Approve refund?' : 'Reject refund request?',
      text: action === 'approve'
        ? 'This will process Yo! reversal for mobile money or mark manual refund for card payments.'
        : 'The customer will be notified that the refund was rejected.',
      confirmButtonText: action === 'approve' ? 'Approve' : 'Reject',
    });
    if (!ok.isConfirmed) return;

    try {
      await reviewRequest.mutateAsync({
        requestId: request.id,
        action,
        review_note: action === 'approve' ? 'Approved via admin portal' : 'Rejected via admin portal',
      });
      toast(action === 'approve' ? 'Refund approved' : 'Refund rejected');
      refetchRefunds();
      refetch();
    } catch (err) {
      alertError('Action failed', err.response?.data?.detail || 'Please try again.');
    }
  };

  return (
    <div className="animate-fade">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1>Order Oversight</h1>
          <p>Monitor parent orders, vendor sub-orders, and refund requests.</p>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={() => { refetch(); refetchRefunds(); }}>
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      <div className="orders-tab-bar" style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        <button
          type="button"
          className={`btn btn-sm ${activeTab === 'orders' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setActiveTab('orders')}
        >
          All Orders
        </button>
        <button
          type="button"
          className={`btn btn-sm ${activeTab === 'refunds' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setActiveTab('refunds')}
        >
          Refund Requests
          {stats.refundQueue > 0 && (
            <span style={{ marginLeft: 8, background: 'var(--warning)', color: '#000', borderRadius: 999, padding: '2px 8px', fontSize: 11 }}>
              {stats.refundQueue}
            </span>
          )}
        </button>
      </div>

      {activeTab === 'orders' && (
        <>
          <div className="stat-grid">
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
              <input placeholder="Search Order ID, Customer or Business..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
            </div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <select className="filter-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s || 'All Statuses'}</option>)}
              </select>
              <div className="date-filter-group">
                <Calendar size={14} />
                <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                <span>–</span>
                <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
              </div>
            </div>
          </div>

          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Parent Order</th>
                  <th>Customer</th>
                  <th>Merchant(s)</th>
                  <th>Sub-Orders</th>
                  <th>Date</th>
                  <th>Total</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={8}><div className="loader-wrap" style={{ padding: '40px 0' }}><div className="spinner" />Loading...</div></td></tr>
                ) : paged.length === 0 ? (
                  <tr><td colSpan={8}><div className="empty-state"><ShoppingCart size={40} /><p>No orders found.</p></div></td></tr>
                ) : paged.map((o) => (
                  <tr key={o.id}>
                    <td className="td-name" style={{ fontSize: 12, fontFamily: 'monospace' }}>#{shortId(o.id)}</td>
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
                        <span style={{ fontSize: 13, fontWeight: 600 }}>
                          {(o.business_names && o.business_names.length > 1)
                            ? `${o.business_names.length} sellers`
                            : o.business_name}
                        </span>
                      </div>
                    </td>
                    <td>
                      <span className="badge" style={{ background: 'var(--surface-2)' }}>
                        {o.sub_order_count ?? (o.sub_orders?.length || 1)}
                      </span>
                    </td>
                    <td>{new Date(o.created_at).toLocaleDateString()}</td>
                    <td style={{ fontWeight: 700 }}>{o.total.toLocaleString()} <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{o.currency}</span></td>
                    <td><span className={`badge badge-${String(o.status).toLowerCase()}`}>{o.status}</span></td>
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
                  <button className="p-btn" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>‹</button>
                  {[...Array(totalPages)].map((_, i) => <button key={i} className={`p-btn ${page === i + 1 ? 'active' : ''}`} onClick={() => setPage(i + 1)}>{i + 1}</button>)}
                  <button className="p-btn" disabled={page === totalPages} onClick={() => setPage((p) => p + 1)}>›</button>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {activeTab === 'refunds' && (
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Request</th>
                <th>Parent Order</th>
                <th>Reason</th>
                <th>Requested</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loadingRefunds ? (
                <tr><td colSpan={5}><div className="loader-wrap" style={{ padding: '40px 0' }}><div className="spinner" />Loading...</div></td></tr>
              ) : refundRequests.length === 0 ? (
                <tr><td colSpan={5}><div className="empty-state"><CheckCircle size={40} /><p>No pending refund requests.</p></div></td></tr>
              ) : refundRequests.map((req) => (
                <tr key={req.id}>
                  <td style={{ fontFamily: 'monospace', fontSize: 12 }}>#{shortId(req.id)}</td>
                  <td style={{ fontFamily: 'monospace', fontSize: 12 }}>#{shortId(req.order_id)}</td>
                  <td style={{ maxWidth: 280 }}>{req.reason}</td>
                  <td>{req.created_at ? new Date(req.created_at).toLocaleString() : '—'}</td>
                  <td style={{ display: 'flex', gap: 8 }}>
                    <button
                      className="btn btn-primary btn-sm"
                      disabled={reviewRequest.isPending}
                      onClick={() => handleReviewRefund(req, 'approve')}
                    >
                      Approve
                    </button>
                    <button
                      className="btn btn-ghost btn-sm"
                      disabled={reviewRequest.isPending}
                      onClick={() => handleReviewRefund(req, 'reject')}
                    >
                      Reject
                    </button>
                    <button className="btn btn-ghost btn-sm" onClick={() => openDetails({ id: req.order_id })}>
                      View order
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className={`drawer-overlay ${drawerOpen ? 'open' : ''}`} onClick={() => setDrawerOpen(false)}>
        <div className="drawer" onClick={(e) => e.stopPropagation()}>
          <div className="drawer-head">
            <div className="drawer-head-left">
              <div className="drawer-head-icon"><ShoppingCart size={20} /></div>
              <div>
                <h2>Parent Order</h2>
                <p>#{shortId(displayOrder?.id)}</p>
              </div>
            </div>
            <button className="drawer-close" onClick={() => setDrawerOpen(false)}><X size={16} /></button>
          </div>
          <div className="drawer-body">
            {detailLoading && !orderDetail ? (
              <div className="loader-wrap" style={{ padding: 24 }}><div className="spinner" />Loading order...</div>
            ) : displayOrder && (
              <>
                <div className="detail-section">
                  <div className="detail-section-title">Fulfillment Status</div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--glass)', padding: 12, borderRadius: 12, border: '1px solid var(--border)' }}>
                    <span className={`badge badge-${String(displayOrder.status).toLowerCase()}`}>{displayOrder.status}</span>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      {displayOrder.created_at ? new Date(displayOrder.created_at).toLocaleString() : ''}
                    </span>
                  </div>
                </div>

                <div className="detail-section">
                  <div className="detail-section-title">Stakeholders</div>
                  <div className="detail-grid">
                    <div className="detail-item">
                      <label>Customer</label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                        <User size={14} color="var(--primary)" />
                        <span>{displayOrder.customer_name || displayOrder.customer_email || '—'}</span>
                      </div>
                    </div>
                    <div className="detail-item">
                      <label>Merchant(s)</label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                        <Building2 size={14} color="var(--accent)" />
                        <span>{(displayOrder.business_names || [displayOrder.business_name]).filter(Boolean).join(', ') || '—'}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="detail-section">
                  <div className="detail-section-title">Financial Summary</div>
                  <div style={{ fontSize: 24, fontWeight: 900, color: 'var(--text)' }}>
                    {(displayOrder.total || 0).toLocaleString()} {displayOrder.currency || 'UGX'}
                  </div>
                </div>

                {subOrders.length > 0 && (
                  <div className="detail-section">
                    <div className="detail-section-title">Vendor Sub-Orders ({subOrders.length})</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {subOrders.map((sub) => (
                        <div key={sub.id} style={{ padding: 12, borderRadius: 12, border: '1px solid var(--border)', background: 'var(--glass)' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                            <div>
                              <div style={{ fontSize: 12, fontFamily: 'monospace', fontWeight: 700 }}>#{shortId(sub.id)}</div>
                              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{sub.business_name || 'Seller'}</div>
                            </div>
                            <span className={`badge badge-${String(sub.status).toLowerCase()}`}>{sub.status}</span>
                          </div>
                          <div style={{ fontSize: 13, fontWeight: 700 }}>UGX {(sub.subtotal ?? sub.total ?? 0).toLocaleString()}</div>
                          {(sub.tracking_number || sub.carrier) && (
                            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                              <Truck size={12} /> {sub.carrier || 'Carrier'} · {sub.tracking_number}
                            </div>
                          )}
                          {sub.items?.length > 0 && (
                            <div style={{ marginTop: 8, fontSize: 12, color: 'var(--text-muted)' }}>
                              {sub.items.map((it) => `${it.product_name || it.sku} ×${it.quantity}`).join(', ')}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {orderDetail?.items?.length > 0 && (
                  <div className="detail-section">
                    <div className="detail-section-title">All Line Items</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {orderDetail.items.map((item, idx) => (
                        <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '8px 0', borderBottom: '1px dashed var(--border)' }}>
                          <span><Package size={12} style={{ verticalAlign: 'middle', marginRight: 6 }} />{item.product_name || item.sku} × {item.quantity}</span>
                          <span style={{ fontWeight: 700 }}>UGX {((item.unit_price * item.quantity) - (item.discount_applied || 0)).toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {orderDetail?.pending_refund_request && (
                  <div className="detail-section" style={{ border: '1px solid rgba(245,158,11,0.4)', background: 'rgba(245,158,11,0.06)' }}>
                    <div className="detail-section-title">Pending Refund</div>
                    <p style={{ fontSize: 13, margin: '0 0 12px' }}>{orderDetail.pending_refund_request.reason}</p>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button className="btn btn-primary btn-sm" onClick={() => handleReviewRefund(orderDetail.pending_refund_request, 'approve')}>Approve</button>
                      <button className="btn btn-ghost btn-sm" onClick={() => handleReviewRefund(orderDetail.pending_refund_request, 'reject')}>Reject</button>
                    </div>
                  </div>
                )}
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

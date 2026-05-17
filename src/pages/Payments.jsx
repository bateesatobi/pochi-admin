import React, { useState, useEffect } from 'react';
import {
  CreditCard, ArrowUpCircle, RefreshCw, Loader2, CheckCircle2,
  XCircle, Clock, Building2, Smartphone, AlertTriangle, Send,
  DollarSign, TrendingUp, Activity
} from 'lucide-react';
import Swal from 'sweetalert2';
import './Payments.css';
import { api } from '../context/AdminAuthContext';

const fmt = (n) => `UGX ${Number(n || 0).toLocaleString('en-UG', { minimumFractionDigits: 0 })}`;
const fmtDate = (d) => new Date(d).toLocaleDateString('en-UG', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

const STATUS_CONFIG = {
  COMPLETED: { label: 'Completed', icon: CheckCircle2, cls: 'status-completed' },
  PENDING:   { label: 'Pending',   icon: Clock,         cls: 'status-pending' },
  FAILED:    { label: 'Failed',    icon: XCircle,       cls: 'status-failed' },
  CANCELLED: { label: 'Cancelled', icon: XCircle,       cls: 'status-cancelled' },
};

const AdminPayments = () => {
  const [tab, setTab]                   = useState('pending');
  const [pendingDis, setPendingDis]     = useState(() => {
    const cached = localStorage.getItem('cached_admin_pending_disbursements');
    return cached ? JSON.parse(cached) : [];
  });
  const [transactions, setTxs]          = useState(() => {
    const cached = localStorage.getItem('cached_admin_pay_transactions');
    return cached ? JSON.parse(cached) : [];
  });
  const [disbursements, setDisbursements] = useState(() => {
    const cached = localStorage.getItem('cached_admin_disbursements');
    return cached ? JSON.parse(cached) : [];
  });
  const [loading, setLoading]           = useState(
    pendingDis.length === 0 && transactions.length === 0 && disbursements.length === 0
  );
  const [disbursingId, setDisbursingId] = useState(null);

  const load = async () => {
    if (pendingDis.length === 0 && transactions.length === 0 && disbursements.length === 0) setLoading(true);
    try {
      const [pendRes, txRes, disRes] = await Promise.all([
        api.get('/admin/payments/pending-disbursements'),
        api.get('/admin/payments/transactions'),
        api.get('/admin/payments/disbursements'),
      ]);
      setPendingDis(pendRes.data || []);
      setTxs(txRes.data || []);
      setDisbursements(disRes.data || []);
      localStorage.setItem('cached_admin_pending_disbursements', JSON.stringify(pendRes.data || []));
      localStorage.setItem('cached_admin_pay_transactions', JSON.stringify(txRes.data || []));
      localStorage.setItem('cached_admin_disbursements', JSON.stringify(disRes.data || []));
    } catch (err) {
      console.error('Failed to load admin payments:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    const handleDisbCompleted = () => {
      console.log("Real-time disbursement event received. Reloading payments data...");
      load();
    };
    window.addEventListener('poch-disbursement-completed', handleDisbCompleted);
    return () => {
      window.removeEventListener('poch-disbursement-completed', handleDisbCompleted);
    };
  }, []);

  const handleDisburse = async (business) => {
    if (!business.payout_account) {
      Swal.fire({
        icon: 'warning',
        title: 'No Payout Account',
        text: `${business.business_name} has not configured a mobile money payout account. Ask them to set it up in their Business Portal → Payments.`,
        background: '#fff',
        color: '#0b182a',
      });
      return;
    }

    const { isConfirmed, value: notes } = await Swal.fire({
      title: `Disburse to ${business.business_name}`,
      html: `
        <div style="text-align:left;font-family:inherit">
          <p style="margin:0 0 12px;color:#64748b;font-size:13px">Review before disbursing:</p>
          <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:16px;display:flex;flex-direction:column;gap:10px;margin-bottom:16px">
            <div style="display:flex;justify-content:space-between"><span style="font-size:12px;color:#64748b;font-weight:700">Gross Collected</span><span style="font-weight:800;color:#0b182a">${fmt(business.total_collected)}</span></div>
            <div style="display:flex;justify-content:space-between"><span style="font-size:12px;color:#64748b;font-weight:700">Platform Fee (5%)</span><span style="font-weight:700;color:#ef4444">-${fmt(business.platform_fee)}</span></div>
            <div style="display:flex;justify-content:space-between"><span style="font-size:12px;color:#64748b;font-weight:700">Already Disbursed</span><span style="font-weight:700;color:#64748b">-${fmt(business.total_disbursed)}</span></div>
            <hr style="margin:4px 0;border:none;border-top:1px solid #e2e8f0"/>
            <div style="display:flex;justify-content:space-between"><span style="font-size:13px;font-weight:800;color:#0b182a">Net To Disburse</span><span style="font-weight:800;font-size:16px;color:#16a34a">${fmt(business.pending_balance)}</span></div>
          </div>
          <div style="background:#fff7ed;border:1px solid #ffedd5;border-radius:10px;padding:12px;margin-bottom:16px">
            <p style="margin:0;font-size:12px;color:#9a3412"><strong>📱 Sending to:</strong> ${business.payout_account?.account_name} — ${business.payout_account?.phone_number} (${business.payout_account?.provider})</p>
          </div>
          <input id="swal-notes" placeholder="Optional notes (e.g. May 2026 payout)" style="width:100%;padding:10px 14px;border:1px solid #e2e8f0;border-radius:8px;font-size:13px;font-family:inherit;box-sizing:border-box" />
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'Disburse via YO! Payments',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#FF7F50',
      focusConfirm: false,
      preConfirm: () => document.getElementById('swal-notes')?.value || '',
    });

    if (!isConfirmed) return;

    setDisbursingId(business.business_id);
    try {
      const res = await api.post(
        `/admin/payments/disburse/${business.business_id}`,
        null,
        { params: { notes } }
      );

      if (res.data.success) {
        Swal.fire({
          icon: 'success',
          title: 'Disbursement Successful! 🎉',
          html: `
            <p style="font-size:14px;color:#64748b;margin:0 0 8px">Successfully sent <strong style="color:#16a34a">${fmt(res.data.amount_disbursed)}</strong> to ${business.business_name}</p>
            <p style="font-size:12px;color:#64748b;margin:0">YO! Reference: <code style="background:#f1f5f9;padding:2px 6px;border-radius:4px">${res.data.yo_transaction_id || 'N/A'}</code></p>
          `,
          timer: 4000,
          showConfirmButton: false,
          timerProgressBar: true,
        });
        localStorage.removeItem('cached_admin_pending_disbursements');
        localStorage.removeItem('cached_admin_pay_transactions');
        localStorage.removeItem('cached_admin_disbursements');
        load();
      } else {
        Swal.fire({ icon: 'error', title: 'Disbursement Failed', text: res.data.message });
      }
    } catch (err) {
      const msg = err.response?.data?.detail || 'Disbursement failed. Please try again.';
      Swal.fire({ icon: 'error', title: 'Error', text: msg });
    } finally {
      setDisbursingId(null);
    }
  };

  // KPI totals
  const totalCollected = transactions.reduce((s, t) => t.status === 'COMPLETED' ? s + t.amount : s, 0);
  const totalFee = totalCollected * 0.05;
  const totalDisbursed = disbursements.reduce((s, d) => d.status === 'COMPLETED' ? s + d.net_amount : s, 0);
  const pendingTotal = pendingDis.reduce((s, b) => s + b.pending_balance, 0);

  return (
    <div className="admin-payments animate-slide-up">
      {/* Page Header */}
      <div className="ap-header">
        <div>
          <h1 className="ap-title">Payments & Disbursements</h1>
          <p className="ap-subtitle">Manage platform collections, track transactions, and disburse earnings to businesses.</p>
        </div>
        <button className="ap-btn-refresh" onClick={load} disabled={loading}>
          {loading ? <Loader2 size={16} className="spin" /> : <RefreshCw size={16} />}
          Refresh
        </button>
      </div>

      {/* KPI Row */}
      <div className="ap-kpi-row">
        <div className="ap-kpi">
          <div className="ap-kpi-icon ap-kpi-collected"><TrendingUp size={20} /></div>
          <div>
            <div className="ap-kpi-label">Total Collected (UGX)</div>
            <div className="ap-kpi-value">{fmt(totalCollected)}</div>
          </div>
        </div>
        <div className="ap-kpi">
          <div className="ap-kpi-icon ap-kpi-fee"><DollarSign size={20} /></div>
          <div>
            <div className="ap-kpi-label">Platform Revenue (5%)</div>
            <div className="ap-kpi-value">{fmt(totalFee)}</div>
          </div>
        </div>
        <div className="ap-kpi">
          <div className="ap-kpi-icon ap-kpi-disbursed"><ArrowUpCircle size={20} /></div>
          <div>
            <div className="ap-kpi-label">Total Disbursed to Businesses</div>
            <div className="ap-kpi-value">{fmt(totalDisbursed)}</div>
          </div>
        </div>
        <div className="ap-kpi ap-kpi-attention">
          <div className="ap-kpi-icon ap-kpi-pending"><Clock size={20} /></div>
          <div>
            <div className="ap-kpi-label">Pending Payouts</div>
            <div className="ap-kpi-value">{fmt(pendingTotal)}</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="ap-tabs">
        {[
          { key: 'pending', label: `Pending Disbursements (${pendingDis.length})` },
          { key: 'transactions', label: `Payment Transactions (${transactions.length})` },
          { key: 'disbursements', label: `Disbursement History (${disbursements.length})` },
        ].map(t => (
          <button key={t.key} className={`ap-tab ${tab === t.key ? 'active' : ''}`} onClick={() => setTab(t.key)}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Pending Disbursements ── */}
      {tab === 'pending' && (
        loading ? (
          <div className="ap-loading"><Loader2 size={22} className="spin" /> Loading...</div>
        ) : pendingDis.length === 0 ? (
          <div className="ap-empty">
            <CheckCircle2 size={40} className="ap-empty-icon" />
            <h3>All Clear!</h3>
            <p>No businesses have pending balances at this time. All payouts are up to date.</p>
          </div>
        ) : (
          <div className="ap-pending-list">
            {pendingDis.map(biz => (
              <div key={biz.business_id} className="ap-pending-card">
                <div className="ap-pending-top">
                  <div className="ap-biz-info">
                    <div className="ap-biz-avatar">{biz.business_name?.[0]?.toUpperCase()}</div>
                    <div>
                      <div className="ap-biz-name">{biz.business_name}</div>
                      <div className="ap-biz-email">{biz.contact_email}</div>
                    </div>
                  </div>
                  <div className="ap-pending-balance">
                    <span className="ap-pending-label">Pending Balance</span>
                    <span className="ap-pending-amount">{fmt(biz.pending_balance)}</span>
                  </div>
                </div>

                <div className="ap-pending-breakdown">
                  <div className="ap-breakdown-row">
                    <span>Gross Collected</span><span>{fmt(biz.total_collected)}</span>
                  </div>
                  <div className="ap-breakdown-row fee">
                    <span>Platform Fee (5%)</span><span>−{fmt(biz.platform_fee)}</span>
                  </div>
                  <div className="ap-breakdown-row disbursed">
                    <span>Already Disbursed</span><span>−{fmt(biz.total_disbursed)}</span>
                  </div>
                </div>

                {biz.payout_account ? (
                  <div className="ap-payout-info">
                    <Smartphone size={14} />
                    <span><strong>{biz.payout_account.account_name}</strong> · {biz.payout_account.phone_number} · {biz.payout_account.provider}</span>
                  </div>
                ) : (
                  <div className="ap-payout-warning">
                    <AlertTriangle size={14} />
                    <span>No payout account configured by this business.</span>
                  </div>
                )}

                <button
                  className="ap-btn-disburse"
                  onClick={() => handleDisburse(biz)}
                  disabled={disbursingId === biz.business_id || !biz.payout_account}
                >
                  {disbursingId === biz.business_id ? (
                    <><Loader2 size={15} className="spin" /> Disbursing via YO!...</>
                  ) : (
                    <><Send size={15} /> Disburse {fmt(biz.pending_balance)} via YO! Payments</>
                  )}
                </button>
              </div>
            ))}
          </div>
        )
      )}

      {/* ── Payment Transactions ── */}
      {tab === 'transactions' && (
        loading ? (
          <div className="ap-loading"><Loader2 size={22} className="spin" /> Loading...</div>
        ) : transactions.length === 0 ? (
          <div className="ap-empty">
            <CreditCard size={40} className="ap-empty-icon" />
            <h3>No Transactions Yet</h3>
            <p>Payment transactions will appear here when clients initiate mobile money payments.</p>
          </div>
        ) : (
          <div className="ap-table-wrap">
            <table className="ap-table">
              <thead>
                <tr>
                  <th>Reference</th>
                  <th>Phone</th>
                  <th>Amount</th>
                  <th>Currency</th>
                  <th>Status</th>
                  <th>YO! Transaction ID</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map(tx => {
                  const cfg = STATUS_CONFIG[tx.status] || STATUS_CONFIG.PENDING;
                  const Icon = cfg.icon;
                  return (
                    <tr key={tx.id}>
                      <td><code className="ref-code">{tx.internal_reference}</code></td>
                      <td>{tx.phone_number}</td>
                      <td className="amount-col">{fmt(tx.amount)}</td>
                      <td>{tx.currency}</td>
                      <td><span className={`ap-status ${cfg.cls}`}><Icon size={11} /> {cfg.label}</span></td>
                      <td>{tx.yo_transaction_id ? <code className="ref-code">{tx.yo_transaction_id}</code> : <span className="na-dash">—</span>}</td>
                      <td className="date-col">{fmtDate(tx.created_at)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )
      )}

      {/* ── Disbursement History ── */}
      {tab === 'disbursements' && (
        loading ? (
          <div className="ap-loading"><Loader2 size={22} className="spin" /> Loading...</div>
        ) : disbursements.length === 0 ? (
          <div className="ap-empty">
            <ArrowUpCircle size={40} className="ap-empty-icon" />
            <h3>No Disbursements Yet</h3>
            <p>Disbursement records will appear here after you initiate payouts to businesses.</p>
          </div>
        ) : (
          <div className="ap-table-wrap">
            <table className="ap-table">
              <thead>
                <tr>
                  <th>Business</th>
                  <th>Gross</th>
                  <th>Fee (5%)</th>
                  <th>Net Sent</th>
                  <th>Phone · Provider</th>
                  <th>Status</th>
                  <th>YO! Ref</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {disbursements.map(d => {
                  const cfg = STATUS_CONFIG[d.status] || STATUS_CONFIG.PENDING;
                  const Icon = cfg.icon;
                  return (
                    <tr key={d.id}>
                      <td className="biz-col"><Building2 size={13} /> {d.business_name}</td>
                      <td>{fmt(d.gross_amount)}</td>
                      <td className="fee-col">−{fmt(d.platform_fee)}</td>
                      <td className="net-col">{fmt(d.net_amount)}</td>
                      <td>{d.phone_number} · <strong>{d.provider}</strong></td>
                      <td><span className={`ap-status ${cfg.cls}`}><Icon size={11} /> {cfg.label}</span></td>
                      <td>{d.yo_transaction_id ? <code className="ref-code">{d.yo_transaction_id}</code> : <span className="na-dash">—</span>}</td>
                      <td className="date-col">{fmtDate(d.created_at)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )
      )}
    </div>
  );
};

export default AdminPayments;

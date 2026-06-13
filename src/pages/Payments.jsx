import React, { useState, useEffect } from 'react';
import {
  CreditCard, ArrowUpCircle, RefreshCw, Loader2, CheckCircle2,
  XCircle, Clock, Building2, Smartphone, AlertTriangle, Send,
  DollarSign, TrendingUp, Activity
} from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { alertSuccess, alertError, alertWarning, fire } from '../utils/swal';
import './Payments.css';
import { api } from '../context/AdminAuthContext';
import {
  usePendingDisbursements,
  useAdminPayTransactions,
  useAdminDisbursements,
  usePlatformSettings,
} from '../hooks/queries';

const fmt = (n) => `UGX ${Number(n || 0).toLocaleString('en-UG', { minimumFractionDigits: 0 })}`;
const fmtDate = (d) => new Date(d).toLocaleDateString('en-UG', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

const STATUS_CONFIG = {
  COMPLETED: { label: 'Completed', icon: CheckCircle2, cls: 'status-completed' },
  PENDING:   { label: 'Pending',   icon: Clock,         cls: 'status-pending' },
  FAILED:    { label: 'Failed',    icon: XCircle,       cls: 'status-failed' },
  CANCELLED: { label: 'Cancelled', icon: XCircle,       cls: 'status-cancelled' },
};

const AdminPayments = () => {
  const queryClient = useQueryClient();
  const { data: pendingDis = [], isLoading: pendingLoading } = usePendingDisbursements();
  const { data: transactions = [], isLoading: txLoading } = useAdminPayTransactions();
  const { data: disbursements = [], isLoading: disLoading } = useAdminDisbursements();
  const { data: platformSettings } = usePlatformSettings();
  const platformFeePct = platformSettings?.default_platform_fee_pct ?? 5;

  const [tab, setTab] = useState('pending');
  const [disbursingId, setDisbursingId] = useState(null);
  const loading = pendingLoading && txLoading && disLoading && !pendingDis.length;

  const refreshPayments = () =>
    queryClient.invalidateQueries({ queryKey: ['admin', 'payments'] });

  const handleDisburse = async (business) => {
    if (!business.payout_account) {
      alertWarning(
        'No Payout Account',
        `${business.business_name} has not configured a mobile money payout account. Ask them to set it up in Business Portal → Payments.`
      );
      return;
    }

    const { isConfirmed, value: notes } = await fire({
      title: `Disburse to ${business.business_name}`,
      html: `
        <div class="poch-disburse-review">
          <p class="poch-disburse-lead">Review before disbursing:</p>
          <div class="poch-disburse-card">
            <div class="poch-disburse-row"><span>Gross Collected</span><strong>${fmt(business.total_collected)}</strong></div>
            <div class="poch-disburse-row"><span>Platform Fee (${platformFeePct}%)</span><strong class="text-danger">-${fmt(business.platform_fee)}</strong></div>
            <div class="poch-disburse-row"><span>Already Disbursed</span><strong class="text-muted">-${fmt(business.total_disbursed)}</strong></div>
            <hr />
            <div class="poch-disburse-row poch-disburse-total"><span>Net To Disburse</span><strong class="text-success">${fmt(business.pending_balance)}</strong></div>
          </div>
          <div class="poch-disburse-notice">
            <strong>Sending to:</strong> ${business.payout_account?.account_name} — ${business.payout_account?.phone_number} (${business.payout_account?.provider})
          </div>
          <input id="swal-notes" class="poch-swal-input" placeholder="Optional notes (e.g. May 2026 payout)" />
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'Disburse via YO! Payments',
      cancelButtonText: 'Cancel',
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
        alertSuccess(
          'Disbursement Successful',
          `Sent ${fmt(res.data.amount_disbursed)} to ${business.business_name}. Reference: ${res.data.yo_transaction_id || 'N/A'}`,
          { timer: 4000 }
        );
        refreshPayments();
      } else {
        alertError('Disbursement Failed', res.data.message);
      }
    } catch (err) {
      const msg = err.response?.data?.detail || 'Disbursement failed. Please try again.';
      alertError('Error', msg);
    } finally {
      setDisbursingId(null);
    }
  };

  // KPI totals
  const totalCollected = transactions.reduce((s, t) => t.status === 'COMPLETED' ? s + t.amount : s, 0);
  const totalFee = totalCollected * (platformFeePct / 100);
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
        <button className="ap-btn-refresh" onClick={refreshPayments} disabled={loading}>
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
            <div className="ap-kpi-label">Platform Revenue ({platformFeePct}%)</div>
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

import React, { useState, useEffect, useMemo } from 'react';
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
import { formatMoney } from '../utils/currency';

const fmt = (n, currency = 'UGX') => formatMoney(n, currency);
const fmtDate = (d) => new Date(d).toLocaleDateString('en-UG', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
const PAGE_SIZE = 12;

const STATUS_CONFIG = {
  COMPLETED: { label: 'Completed', icon: CheckCircle2, cls: 'status-completed' },
  PENDING:   { label: 'Pending',   icon: Clock,         cls: 'status-pending' },
  FAILED:    { label: 'Failed',    icon: XCircle,       cls: 'status-failed' },
  CANCELLED: { label: 'Cancelled', icon: XCircle,       cls: 'status-cancelled' },
};

const normalize = (v) => (v ?? '').toString().toLowerCase().trim();
const sortArrow = (sortState, key) => (sortState.key !== key ? '↕' : sortState.direction === 'asc' ? '↑' : '↓');

const AdminPayments = () => {
  const queryClient = useQueryClient();
  const { data: pendingDis = [], isLoading: pendingLoading } = usePendingDisbursements();
  const { data: transactions = [], isLoading: txLoading } = useAdminPayTransactions();
  const { data: disbursements = [], isLoading: disLoading } = useAdminDisbursements();
  const { data: platformSettings } = usePlatformSettings();
  const platformFeePct = platformSettings?.default_platform_fee_pct ?? 5;

  const [tab, setTab] = useState('pending');
  const [disbursingId, setDisbursingId] = useState(null);
  const [txPage, setTxPage] = useState(1);
  const [disPage, setDisPage] = useState(1);
  const [txSearch, setTxSearch] = useState('');
  const [disSearch, setDisSearch] = useState('');
  const [txSort, setTxSort] = useState({ key: 'created_at', direction: 'desc' });
  const [disSort, setDisSort] = useState({ key: 'created_at', direction: 'desc' });
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

  useEffect(() => {
    setTxPage(1);
  }, [tab]);

  useEffect(() => {
    setDisPage(1);
  }, [tab]);

  const filteredTransactions = useMemo(() => {
    const q = normalize(txSearch);
    if (!q) return transactions;
    return transactions.filter(tx => normalize([
      tx.internal_reference,
      tx.phone_number,
      tx.status,
      tx.currency,
      tx.yo_transaction_id,
    ].join(' ')).includes(q));
  }, [transactions, txSearch]);

  const filteredDisbursements = useMemo(() => {
    const q = normalize(disSearch);
    if (!q) return disbursements;
    return disbursements.filter(d => normalize([
      d.business_name,
      d.phone_number,
      d.provider,
      d.status,
      d.yo_transaction_id,
    ].join(' ')).includes(q));
  }, [disbursements, disSearch]);

  const txValue = (row, key) => {
    if (key === 'amount') return Number(row.amount || 0);
    if (key === 'created_at') return new Date(row.created_at || 0).getTime();
    return normalize(row[key]);
  };

  const disValue = (row, key) => {
    if (key === 'gross_amount' || key === 'platform_fee' || key === 'net_amount') return Number(row[key] || 0);
    if (key === 'created_at') return new Date(row.created_at || 0).getTime();
    return normalize(row[key]);
  };

  const sortedTransactions = useMemo(() => {
    const rows = [...filteredTransactions];
    rows.sort((a, b) => {
      const av = txValue(a, txSort.key);
      const bv = txValue(b, txSort.key);
      const cmp = av > bv ? 1 : av < bv ? -1 : 0;
      return txSort.direction === 'asc' ? cmp : -cmp;
    });
    return rows;
  }, [filteredTransactions, txSort]);

  const sortedDisbursements = useMemo(() => {
    const rows = [...filteredDisbursements];
    rows.sort((a, b) => {
      const av = disValue(a, disSort.key);
      const bv = disValue(b, disSort.key);
      const cmp = av > bv ? 1 : av < bv ? -1 : 0;
      return disSort.direction === 'asc' ? cmp : -cmp;
    });
    return rows;
  }, [filteredDisbursements, disSort]);

  useEffect(() => {
    const maxPage = Math.max(1, Math.ceil(sortedTransactions.length / PAGE_SIZE));
    if (txPage > maxPage) setTxPage(maxPage);
  }, [sortedTransactions.length, txPage]);

  useEffect(() => {
    const maxPage = Math.max(1, Math.ceil(sortedDisbursements.length / PAGE_SIZE));
    if (disPage > maxPage) setDisPage(maxPage);
  }, [sortedDisbursements.length, disPage]);

  useEffect(() => {
    setTxPage(1);
  }, [txSearch]);

  useEffect(() => {
    setDisPage(1);
  }, [disSearch]);

  const txTotalPages = Math.max(1, Math.ceil(sortedTransactions.length / PAGE_SIZE));
  const disTotalPages = Math.max(1, Math.ceil(sortedDisbursements.length / PAGE_SIZE));
  const txStart = (txPage - 1) * PAGE_SIZE;
  const disStart = (disPage - 1) * PAGE_SIZE;
  const txRows = sortedTransactions.slice(txStart, txStart + PAGE_SIZE);
  const disRows = sortedDisbursements.slice(disStart, disStart + PAGE_SIZE);

  const toggleSort = (state, setState, key) => {
    setState(prev => {
      if (prev.key !== key) return { key, direction: 'asc' };
      return { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
    });
  };

  const renderPager = (page, totalPages, onPageChange, totalRows, start) => {
    if (totalRows <= PAGE_SIZE) return null;
    return (
      <div className="ap-pagination">
        <div className="ap-pagination-info">
          Showing {start + 1}-{Math.min(start + PAGE_SIZE, totalRows)} of {totalRows}
        </div>
        <div className="ap-pagination-btns">
          <button className="ap-page-btn" disabled={page === 1} onClick={() => onPageChange(page - 1)}>‹</button>
          {Array.from({ length: totalPages }).map((_, i) => (
            <button
              key={i + 1}
              className={`ap-page-btn ${page === i + 1 ? 'active' : ''}`}
              onClick={() => onPageChange(i + 1)}
            >
              {i + 1}
            </button>
          ))}
          <button className="ap-page-btn" disabled={page === totalPages} onClick={() => onPageChange(page + 1)}>›</button>
        </div>
      </div>
    );
  };

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
                    <span>Platform Fee ({platformFeePct}%)</span><span>−{fmt(biz.platform_fee)}</span>
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
            <div className="ap-table-tools">
              <input
                className="ap-table-search"
                type="search"
                placeholder="Search reference, phone, status, YO ref..."
                value={txSearch}
                onChange={(e) => setTxSearch(e.target.value)}
              />
              <div className="ap-table-count">{sortedTransactions.length} result{sortedTransactions.length === 1 ? '' : 's'}</div>
            </div>
            <table className="ap-table">
              <thead>
                <tr>
                  <th><button className={`ap-sort-head ${txSort.key === 'internal_reference' ? 'active' : ''}`} onClick={() => toggleSort(txSort, setTxSort, 'internal_reference')}>Reference {sortArrow(txSort, 'internal_reference')}</button></th>
                  <th><button className={`ap-sort-head ${txSort.key === 'phone_number' ? 'active' : ''}`} onClick={() => toggleSort(txSort, setTxSort, 'phone_number')}>Phone {sortArrow(txSort, 'phone_number')}</button></th>
                  <th><button className={`ap-sort-head ${txSort.key === 'amount' ? 'active' : ''}`} onClick={() => toggleSort(txSort, setTxSort, 'amount')}>Amount {sortArrow(txSort, 'amount')}</button></th>
                  <th><button className={`ap-sort-head ${txSort.key === 'currency' ? 'active' : ''}`} onClick={() => toggleSort(txSort, setTxSort, 'currency')}>Currency {sortArrow(txSort, 'currency')}</button></th>
                  <th><button className={`ap-sort-head ${txSort.key === 'status' ? 'active' : ''}`} onClick={() => toggleSort(txSort, setTxSort, 'status')}>Status {sortArrow(txSort, 'status')}</button></th>
                  <th><button className={`ap-sort-head ${txSort.key === 'yo_transaction_id' ? 'active' : ''}`} onClick={() => toggleSort(txSort, setTxSort, 'yo_transaction_id')}>YO! Transaction ID {sortArrow(txSort, 'yo_transaction_id')}</button></th>
                  <th><button className={`ap-sort-head ${txSort.key === 'created_at' ? 'active' : ''}`} onClick={() => toggleSort(txSort, setTxSort, 'created_at')}>Date {sortArrow(txSort, 'created_at')}</button></th>
                </tr>
              </thead>
              <tbody>
                {txRows.length === 0 && (
                  <tr>
                    <td colSpan={7} className="ap-table-empty-cell">No transactions match your search.</td>
                  </tr>
                )}
                {txRows.map(tx => {
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
            {renderPager(txPage, txTotalPages, setTxPage, sortedTransactions.length, txStart)}
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
            <div className="ap-table-tools">
              <input
                className="ap-table-search"
                type="search"
                placeholder="Search business, phone, provider, status, YO ref..."
                value={disSearch}
                onChange={(e) => setDisSearch(e.target.value)}
              />
              <div className="ap-table-count">{sortedDisbursements.length} result{sortedDisbursements.length === 1 ? '' : 's'}</div>
            </div>
            <table className="ap-table">
              <thead>
                <tr>
                  <th><button className={`ap-sort-head ${disSort.key === 'business_name' ? 'active' : ''}`} onClick={() => toggleSort(disSort, setDisSort, 'business_name')}>Business {sortArrow(disSort, 'business_name')}</button></th>
                  <th><button className={`ap-sort-head ${disSort.key === 'gross_amount' ? 'active' : ''}`} onClick={() => toggleSort(disSort, setDisSort, 'gross_amount')}>Gross {sortArrow(disSort, 'gross_amount')}</button></th>
                  <th><button className={`ap-sort-head ${disSort.key === 'platform_fee' ? 'active' : ''}`} onClick={() => toggleSort(disSort, setDisSort, 'platform_fee')}>Fee ({platformFeePct}%) {sortArrow(disSort, 'platform_fee')}</button></th>
                  <th><button className={`ap-sort-head ${disSort.key === 'net_amount' ? 'active' : ''}`} onClick={() => toggleSort(disSort, setDisSort, 'net_amount')}>Net Sent {sortArrow(disSort, 'net_amount')}</button></th>
                  <th><button className={`ap-sort-head ${disSort.key === 'phone_number' ? 'active' : ''}`} onClick={() => toggleSort(disSort, setDisSort, 'phone_number')}>Phone · Provider {sortArrow(disSort, 'phone_number')}</button></th>
                  <th><button className={`ap-sort-head ${disSort.key === 'status' ? 'active' : ''}`} onClick={() => toggleSort(disSort, setDisSort, 'status')}>Status {sortArrow(disSort, 'status')}</button></th>
                  <th><button className={`ap-sort-head ${disSort.key === 'yo_transaction_id' ? 'active' : ''}`} onClick={() => toggleSort(disSort, setDisSort, 'yo_transaction_id')}>YO! Ref {sortArrow(disSort, 'yo_transaction_id')}</button></th>
                  <th><button className={`ap-sort-head ${disSort.key === 'created_at' ? 'active' : ''}`} onClick={() => toggleSort(disSort, setDisSort, 'created_at')}>Date {sortArrow(disSort, 'created_at')}</button></th>
                </tr>
              </thead>
              <tbody>
                {disRows.length === 0 && (
                  <tr>
                    <td colSpan={8} className="ap-table-empty-cell">No disbursements match your search.</td>
                  </tr>
                )}
                {disRows.map(d => {
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
            {renderPager(disPage, disTotalPages, setDisPage, sortedDisbursements.length, disStart)}
          </div>
        )
      )}
    </div>
  );
};

export default AdminPayments;

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Wallet, RefreshCw, Loader2, Snowflake, Sun, Scale,
  Unlock, RotateCcw, Landmark, Building2, User, Layers,
} from 'lucide-react';
import { api } from '../context/AdminAuthContext';
import { formatMoney } from '../utils/currency';
import { alertError, alertSuccess, alertWarning, fire } from '../utils/swal';
import './Wallets.css';

const fmt = (n, currency = 'UGX') => formatMoney(n, currency);
const fmtDate = (d) =>
  d
    ? new Date(d).toLocaleString('en-UG', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '—';

const statusPill = (status) => {
  const s = (status || '').toUpperCase();
  if (s === 'FROZEN') return 'aw-pill aw-pill-frozen';
  if (s === 'CLOSED') return 'aw-pill aw-pill-closed';
  return 'aw-pill aw-pill-active';
};

const ownerIcon = (type) => {
  const t = (type || '').toUpperCase();
  if (t === 'BUSINESS') return Building2;
  if (t === 'PLATFORM') return Layers;
  return User;
};

const AdminWallets = () => {
  const [tab, setTab] = useState('accounts');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [treasury, setTreasury] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [holds, setHolds] = useState([]);
  const [ownerFilter, setOwnerFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedId, setSelectedId] = useState(null);
  const [ledger, setLedger] = useState([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [adjustAmount, setAdjustAmount] = useState('');
  const [adjustBucket, setAdjustBucket] = useState('AVAILABLE');
  const [adjustNote, setAdjustNote] = useState('');
  const [busy, setBusy] = useState(false);

  const selected = useMemo(
    () => accounts.find((a) => a.id === selectedId) || null,
    [accounts, selectedId]
  );

  const loadCore = useCallback(async ({ soft = false } = {}) => {
    if (soft) setRefreshing(true);
    else setLoading(true);
    try {
      const params = {};
      if (ownerFilter) params.owner_type = ownerFilter;
      if (statusFilter) params.status = statusFilter;
      const [tRes, aRes, hRes] = await Promise.all([
        api.get('/admin/wallets/treasury'),
        api.get('/admin/wallets', { params }),
        api.get('/admin/wallets/holds/open'),
      ]);
      setTreasury(tRes.data);
      setAccounts(Array.isArray(aRes.data) ? aRes.data : []);
      setHolds(Array.isArray(hRes.data) ? hRes.data : []);
    } catch (err) {
      alertError('Could not load wallets', err.response?.data?.detail || err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [ownerFilter, statusFilter]);

  const loadDetail = useCallback(async (accountId) => {
    if (!accountId) {
      setLedger([]);
      return;
    }
    setDetailLoading(true);
    try {
      const [acctRes, ledgerRes] = await Promise.all([
        api.get(`/admin/wallets/${accountId}`),
        api.get(`/admin/wallets/${accountId}/ledger`, { params: { limit: 80 } }),
      ]);
      setAccounts((prev) => {
        const next = [...prev];
        const idx = next.findIndex((a) => a.id === accountId);
        if (idx >= 0) next[idx] = acctRes.data;
        else next.unshift(acctRes.data);
        return next;
      });
      setLedger(Array.isArray(ledgerRes.data) ? ledgerRes.data : []);
    } catch (err) {
      alertError('Could not load wallet detail', err.response?.data?.detail || err.message);
    } finally {
      setDetailLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCore();
  }, [loadCore]);

  useEffect(() => {
    if (selectedId) loadDetail(selectedId);
  }, [selectedId, loadDetail]);

  const refreshAll = async () => {
    await loadCore({ soft: true });
    if (selectedId) await loadDetail(selectedId);
  };

  const onFreezeToggle = async () => {
    if (!selected) return;
    const frozen = (selected.status || '').toUpperCase() === 'FROZEN';
    setBusy(true);
    try {
      const path = frozen
        ? `/admin/wallets/${selected.id}/unfreeze`
        : `/admin/wallets/${selected.id}/freeze`;
      const res = await api.post(path);
      alertSuccess(frozen ? 'Wallet unfrozen' : 'Wallet frozen');
      setAccounts((prev) => prev.map((a) => (a.id === selected.id ? res.data : a)));
      await loadCore({ soft: true });
    } catch (err) {
      alertError('Action failed', err.response?.data?.detail || err.message);
    } finally {
      setBusy(false);
    }
  };

  const onAdjust = async () => {
    if (!selected) return;
    const amount = Number(adjustAmount);
    if (!amount || Number.isNaN(amount)) {
      alertWarning('Enter an amount', 'Use a positive number to credit, negative to debit.');
      return;
    }
    if (!adjustNote.trim()) {
      alertWarning('Note required', 'Every manual adjustment needs a reason.');
      return;
    }
    const { isConfirmed } = await fire({
      title: 'Confirm adjustment',
      html: `<p>Apply <strong>${amount > 0 ? '+' : ''}${fmt(amount, selected.currency)}</strong> to <strong>${adjustBucket}</strong>?</p><p style="color:#64748b;font-size:13px">${adjustNote}</p>`,
      showCancelButton: true,
      confirmButtonText: 'Post adjustment',
    });
    if (!isConfirmed) return;
    setBusy(true);
    try {
      await api.post(`/admin/wallets/${selected.id}/adjust`, {
        amount,
        bucket: adjustBucket,
        note: adjustNote.trim(),
      });
      alertSuccess('Adjustment posted');
      setAdjustAmount('');
      setAdjustNote('');
      await refreshAll();
    } catch (err) {
      alertError('Adjustment failed', err.response?.data?.detail || err.message);
    } finally {
      setBusy(false);
    }
  };

  const onHoldAction = async (hold, action) => {
    const label = action === 'release' ? 'Release hold to available' : 'Refund / cancel hold';
    const { isConfirmed } = await fire({
      title: label,
      text: `${fmt(hold.amount, hold.currency)} on hold ${String(hold.id).slice(0, 8)}…`,
      showCancelButton: true,
      confirmButtonText: action === 'release' ? 'Release' : 'Refund hold',
    });
    if (!isConfirmed) return;
    setBusy(true);
    try {
      await api.post(`/admin/wallets/holds/${hold.id}/${action}`);
      alertSuccess(action === 'release' ? 'Hold released' : 'Hold refunded');
      await refreshAll();
    } catch (err) {
      alertError('Hold action failed', err.response?.data?.detail || err.message);
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="aw-loading">
        <Loader2 className="spin" size={20} /> Loading wallets…
      </div>
    );
  }

  const byType = treasury?.by_owner_type || {};

  return (
    <div className="admin-wallets">
      <div className="aw-header">
        <div>
          <h1 className="aw-title">Pochi Wallet</h1>
          <p className="aw-subtitle">
            Internal ledger over Yo / Pesapal. Pending = held sales, Available = withdrawable,
            Pending withdrawal = Yo B2C in flight. Compare treasury liabilities to Yo merchant float.
          </p>
        </div>
        <div className="aw-header-actions">
          <button type="button" className="aw-btn" onClick={refreshAll} disabled={refreshing || busy}>
            <RefreshCw size={15} className={refreshing ? 'spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      <div className="aw-callout">
        <strong>What you manage here:</strong> freeze risky accounts, release or refund vendor holds,
        post audited adjustments, and watch whether total liabilities still match money in the Yo float.
        Customer top-ups credit available after Yo success; vendor earnings start as pending until released.
      </div>

      <div className="aw-kpi-row">
        <div className="aw-kpi">
          <div className="aw-kpi-label">Total liabilities</div>
          <div className="aw-kpi-value">{fmt(treasury?.liabilities_total || 0, treasury?.currency)}</div>
          <div className="aw-kpi-meta">{treasury?.accounts || 0} accounts · {treasury?.currency || 'UGX'}</div>
        </div>
        <div className="aw-kpi">
          <div className="aw-kpi-label">Pending (held)</div>
          <div className="aw-kpi-value">{fmt(treasury?.pending || 0, treasury?.currency)}</div>
          <div className="aw-kpi-meta">Not yet withdrawable</div>
        </div>
        <div className="aw-kpi">
          <div className="aw-kpi-label">Available</div>
          <div className="aw-kpi-value">{fmt(treasury?.available || 0, treasury?.currency)}</div>
          <div className="aw-kpi-meta">Ready to spend / withdraw</div>
        </div>
        <div className="aw-kpi">
          <div className="aw-kpi-label">Pending withdrawal</div>
          <div className="aw-kpi-value">{fmt(treasury?.pending_withdrawal || 0, treasury?.currency)}</div>
          <div className="aw-kpi-meta">Locked while Yo pays out</div>
        </div>
      </div>

      <div className="aw-kpi-row" style={{ gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' }}>
        {['CUSTOMER', 'BUSINESS', 'PLATFORM'].map((type) => {
          const row = byType[type] || {};
          return (
            <div className="aw-kpi" key={type}>
              <div className="aw-kpi-label">{type} wallets</div>
              <div className="aw-kpi-value" style={{ fontSize: 18 }}>
                {row.count || 0}
              </div>
              <div className="aw-kpi-meta">
                Avail {fmt(row.available || 0)} · Pend {fmt(row.pending || 0)}
              </div>
            </div>
          );
        })}
      </div>

      <div className="aw-layout">
        <section className="aw-panel">
          <div className="aw-tabs">
            <button
              type="button"
              className={`aw-tab ${tab === 'accounts' ? 'active' : ''}`}
              onClick={() => setTab('accounts')}
            >
              <Wallet size={14} style={{ marginRight: 6, verticalAlign: -2 }} />
              Accounts ({accounts.length})
            </button>
            <button
              type="button"
              className={`aw-tab ${tab === 'holds' ? 'active' : ''}`}
              onClick={() => setTab('holds')}
            >
              Open holds ({holds.length})
            </button>
          </div>

          {tab === 'accounts' && (
            <>
              <div className="aw-filters">
                <select
                  className="aw-select"
                  value={ownerFilter}
                  onChange={(e) => setOwnerFilter(e.target.value)}
                >
                  <option value="">All owner types</option>
                  <option value="CUSTOMER">Customer</option>
                  <option value="BUSINESS">Business</option>
                  <option value="PLATFORM">Platform</option>
                </select>
                <select
                  className="aw-select"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="">All statuses</option>
                  <option value="ACTIVE">Active</option>
                  <option value="FROZEN">Frozen</option>
                  <option value="CLOSED">Closed</option>
                </select>
              </div>
              <div className="aw-table-wrap">
                {accounts.length === 0 ? (
                  <div className="aw-empty">No wallet accounts yet. They appear after top-ups or paid orders.</div>
                ) : (
                  <table className="aw-table">
                    <thead>
                      <tr>
                        <th>Owner</th>
                        <th>Status</th>
                        <th>Pending</th>
                        <th>Available</th>
                        <th>Withdrawing</th>
                        <th>Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {accounts.map((a) => {
                        const Icon = ownerIcon(a.owner_type);
                        return (
                          <tr
                            key={a.id}
                            className={selectedId === a.id ? 'active' : ''}
                            onClick={() => setSelectedId(a.id)}
                          >
                            <td>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <Icon size={14} />
                                <div>
                                  <div style={{ fontWeight: 800 }}>{a.owner_type}</div>
                                  <div style={{ fontSize: 11, color: 'var(--text-subtle)' }}>
                                    {String(a.owner_id).slice(0, 8)}…
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td>
                              <span className={statusPill(a.status)}>{a.status}</span>
                            </td>
                            <td>{fmt(a.pending, a.currency)}</td>
                            <td>{fmt(a.available, a.currency)}</td>
                            <td>{fmt(a.pending_withdrawal, a.currency)}</td>
                            <td style={{ fontWeight: 800 }}>{fmt(a.total, a.currency)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </>
          )}

          {tab === 'holds' && (
            <div className="aw-table-wrap">
              {holds.length === 0 ? (
                <div className="aw-empty">No open holds. Vendor sale credits wait here until release.</div>
              ) : (
                <table className="aw-table">
                  <thead>
                    <tr>
                      <th>Hold</th>
                      <th>Order</th>
                      <th>Amount</th>
                      <th>Fee</th>
                      <th>Created</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {holds.map((h) => (
                      <tr key={h.id} onClick={() => setSelectedId(h.account_id)}>
                        <td>
                          <span className="aw-pill aw-pill-held">HELD</span>
                          <div style={{ fontSize: 11, color: 'var(--text-subtle)', marginTop: 4 }}>
                            {String(h.id).slice(0, 8)}…
                          </div>
                        </td>
                        <td>{h.order_id ? `${String(h.order_id).slice(0, 8)}…` : '—'}</td>
                        <td style={{ fontWeight: 800 }}>{fmt(h.amount, h.currency)}</td>
                        <td>{fmt(h.platform_fee || 0, h.currency)}</td>
                        <td>{fmtDate(h.created_at)}</td>
                        <td onClick={(e) => e.stopPropagation()}>
                          <div className="aw-actions">
                            <button
                              type="button"
                              className="aw-btn aw-btn-success"
                              disabled={busy}
                              onClick={() => onHoldAction(h, 'release')}
                            >
                              <Unlock size={13} /> Release
                            </button>
                            <button
                              type="button"
                              className="aw-btn aw-btn-danger"
                              disabled={busy}
                              onClick={() => onHoldAction(h, 'refund')}
                            >
                              <RotateCcw size={13} /> Refund
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </section>

        <aside className="aw-panel">
          <div className="aw-panel-head">
            <h3>Account detail</h3>
            <Landmark size={16} color="var(--text-subtle)" />
          </div>
          {!selected ? (
            <div className="aw-empty">Select a wallet account to inspect balances, freeze, adjust, or audit the ledger.</div>
          ) : detailLoading ? (
            <div className="aw-loading">
              <Loader2 className="spin" size={18} /> Loading detail…
            </div>
          ) : (
            <div className="aw-detail">
              <div>
                <p className="aw-detail-title">
                  {selected.owner_type} · {selected.currency}
                </p>
                <div className="aw-detail-id">{selected.id}</div>
                <div style={{ marginTop: 8 }}>
                  <span className={statusPill(selected.status)}>{selected.status}</span>
                  <span className="aw-pill aw-pill-type" style={{ marginLeft: 6 }}>
                    {selected.owner_type}
                  </span>
                </div>
              </div>

              <div className="aw-balance-grid">
                <div className="aw-balance-cell">
                  <span>Pending</span>
                  <strong>{fmt(selected.pending, selected.currency)}</strong>
                </div>
                <div className="aw-balance-cell">
                  <span>Available</span>
                  <strong>{fmt(selected.available, selected.currency)}</strong>
                </div>
                <div className="aw-balance-cell">
                  <span>Withdrawing</span>
                  <strong>{fmt(selected.pending_withdrawal, selected.currency)}</strong>
                </div>
              </div>

              <div className="aw-actions">
                <button type="button" className="aw-btn" disabled={busy} onClick={onFreezeToggle}>
                  {(selected.status || '').toUpperCase() === 'FROZEN' ? (
                    <>
                      <Sun size={14} /> Unfreeze
                    </>
                  ) : (
                    <>
                      <Snowflake size={14} /> Freeze
                    </>
                  )}
                </button>
              </div>

              <div className="aw-adjust">
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <Scale size={14} />
                  <strong style={{ fontSize: 13 }}>Manual adjustment</strong>
                </div>
                <label>Amount (+ credit / − debit)</label>
                <input
                  className="aw-input"
                  type="number"
                  value={adjustAmount}
                  onChange={(e) => setAdjustAmount(e.target.value)}
                  placeholder="e.g. 5000 or -1000"
                />
                <label>Bucket</label>
                <select
                  className="aw-select"
                  value={adjustBucket}
                  onChange={(e) => setAdjustBucket(e.target.value)}
                >
                  <option value="AVAILABLE">Available</option>
                  <option value="PENDING">Pending</option>
                </select>
                <label>Reason (required)</label>
                <input
                  className="aw-input"
                  value={adjustNote}
                  onChange={(e) => setAdjustNote(e.target.value)}
                  placeholder="Promo credit, dispute fix…"
                />
                <button
                  type="button"
                  className="aw-btn aw-btn-primary"
                  disabled={busy}
                  onClick={onAdjust}
                >
                  Post adjustment
                </button>
              </div>

              <div>
                <h4 style={{ margin: '0 0 8px', fontSize: 13, fontWeight: 800 }}>Ledger</h4>
                <div className="aw-ledger">
                  {ledger.length === 0 ? (
                    <div className="aw-empty">No ledger entries</div>
                  ) : (
                    ledger.map((e) => (
                      <div className="aw-ledger-row" key={e.id}>
                        <div>
                          <div className="aw-ledger-type">{e.entry_type}</div>
                          <div className="aw-ledger-meta">
                            {e.bucket} · {fmtDate(e.created_at)}
                            {e.note ? ` · ${e.note}` : ''}
                          </div>
                        </div>
                        <div className={`aw-ledger-amt ${e.amount >= 0 ? 'pos' : 'neg'}`}>
                          {e.amount >= 0 ? '+' : ''}
                          {fmt(e.amount, selected.currency)}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
};

export default AdminWallets;

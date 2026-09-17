import React, { useMemo, useState } from 'react';
import {
  Banknote, RefreshCw, Loader2, Inbox, Wrench, Plus,
  Landmark, AlertTriangle, Clock, X, Pencil, FileDown,
} from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { alertSuccess, alertError, fire } from '../utils/swal';
import './PayLater.css';
import { api } from '../context/AdminAuthContext';
import {
  useFinancingLenders,
  useFinancingLoans,
  useFinancingNotices,
  useFinancingPartners,
  useFinancingSettlement,
  useFinancingTreasury,
  useFinancingCredits,
  useFinancingUnmatched,
} from '../hooks/queries';
import { formatMoney } from '../utils/currency';
import { queryKeys } from '../lib/queryKeys';

const fmt = (n, currency = 'UGX') => formatMoney(n, currency);

const emptyFunder = {
  lender_id: '',
  display_name: '',
  live_url: '',
  rank: 100,
  is_active: true,
  mock: false,
  interest_monthly_pct: 2.5,
  timeout_seconds: 8,
};

const downloadDocxFromB64 = (b64, filename) => {
  if (!b64) return;
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) bytes[i] = bin.charCodeAt(i);
  const blob = new Blob([bytes], {
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename || 'Pochi-Funder-Integration.docx';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
};

const statusPill = (status) => {
  if (['DISBURSED', 'REPAYING', 'CLOSED'].includes(status)) return 'ok';
  if (['HELD_NO_PAYOUT', 'PARTIAL_DISBURSED', 'DELINQUENT', 'PENDING_FUNDER'].includes(status)) return 'wait';
  return 'off';
};

const Loading = () => (
  <div className="paylater-loading"><Loader2 className="spin" size={22} /> Loading…</div>
);

const Empty = ({ title, body }) => (
  <div className="paylater-empty">
    <h3>{title}</h3>
    <p>{body}</p>
  </div>
);

const PayLater = () => {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState('loans');
  const [busy, setBusy] = useState('');
  const [form, setForm] = useState(emptyFunder);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingFunder, setEditingFunder] = useState(false);

  const { data: loans = [], isLoading: loansLoading, refetch: refetchLoans } = useFinancingLoans();
  const { data: lenders = [], isLoading: lendersLoading, refetch: refetchLenders } = useFinancingLenders();
  const { data: notices = [], isLoading: noticesLoading, refetch: refetchNotices } = useFinancingNotices();
  const { data: unmatched = [], isLoading: unmatchedLoading, refetch: refetchUnmatched } = useFinancingUnmatched();
  const { data: partners = [], isLoading: partnersLoading, refetch: refetchPartners } = useFinancingPartners();
  const { data: settlement, refetch: refetchSettlement } = useFinancingSettlement();
  const { data: treasury } = useFinancingTreasury();
  const { data: funderCredits = [] } = useFinancingCredits();
  const settlementBatches = Array.isArray(settlement) ? settlement : [];

  const refreshAll = () => {
    queryClient.invalidateQueries({ queryKey: ['admin', 'financing'] });
    refetchLoans();
    refetchLenders();
    refetchPartners();
    refetchNotices();
    refetchUnmatched();
    refetchSettlement();
  };

  const kpis = useMemo(() => {
    const held = loans.filter((l) => ['HELD_NO_PAYOUT', 'PARTIAL_DISBURSED'].includes(l.status)).length;
    const overdue = loans.filter((l) => l.status === 'DELINQUENT').length;
    const awaitingFunds = loans.filter((l) => l.status === 'PENDING_FUNDER' || (l.approved_at && !l.funds_reserved)).length;
    return { total: loans.length, held, overdue, awaitingFunds, unmatched: unmatched.length };
  }, [loans, unmatched]);

  const unread = notices.filter((n) => !n.is_read).length;

  const tabs = [
    { id: 'loans', label: 'Loans', icon: Banknote, count: kpis.total },
    { id: 'funders', label: 'Funders', icon: Landmark, count: lenders.length },
    { id: 'inbox', label: 'Inbox', icon: Inbox, count: unread },
    { id: 'ops', label: 'Ops', icon: Wrench, count: unmatched.length },
  ];

  const runOp = async (key, path, successMsg) => {
    setBusy(key);
    try {
      const r = await api.post(path);
      alertSuccess(successMsg, JSON.stringify(r.data));
      refreshAll();
    } catch (err) {
      alertError('Failed', err.response?.data?.detail || err.message);
    } finally {
      setBusy('');
    }
  };

  const saveFunder = async (e) => {
    e.preventDefault();
    setBusy('funder');
    try {
      const body = {
        display_name: form.display_name,
        rank: Number(form.rank),
        interest_monthly_pct: Number(form.interest_monthly_pct),
        timeout_seconds: Number(form.timeout_seconds),
        is_active: form.is_active,
        mock: form.mock,
      };
      if (editingFunder) {
        body.lender_id = form.lender_id;
        if (form.live_url) body.eligibility_url = form.live_url;
      }
      const { data } = await api.post('/financing/admin/lenders', body);
      if (data?.integration_docx_base64) {
        downloadDocxFromB64(data.integration_docx_base64, data.integration_filename);
      }
      const partner = data?.partner || {};
      if (data?.copy_now && (data.outbound_api_key || partner.client_secret)) {
        await fire({
          title: 'Copy these now — shown once',
          html: `<pre style="text-align:left;white-space:pre-wrap;font-size:12px">${[
            `Funder ID: ${data.lender_id}`,
            `Eligibility URL: ${data.eligibility_url}`,
            `Outbound API key: ${data.outbound_api_key || '—'}`,
            `Client ID: ${partner.client_id || '—'}`,
            `Client secret: ${partner.client_secret || '—'}`,
            `Webhook secret: ${partner.webhook_secret || '—'}`,
            '',
            'A Word integration pack was downloaded.',
          ].join('\n')}</pre>`,
        });
      } else {
        alertSuccess('Funder saved', `${form.display_name} is ${form.is_active ? 'active' : 'inactive'} in the bid list.`);
      }
      closeDrawer();
      refetchLenders();
    } catch (err) {
      alertError('Could not save funder', err.response?.data?.detail || err.message);
    } finally {
      setBusy('');
    }
  };

  const issueKeys = async (lenderId) => {
    const { isConfirmed } = await fire({
      title: `Issue API keys for ${lenderId}?`,
      text: 'The client secret is shown once. Copy it into the funder’s system.',
      showCancelButton: true,
      confirmButtonText: 'Issue credentials',
    });
    if (!isConfirmed) return;
    setBusy('keys');
    try {
      const r = await api.post('/financing/admin/partners', {
        lender_id: lenderId,
        environment: 'production',
      });
      await fire({
        title: 'Copy these now',
        html: `<pre style="text-align:left;white-space:pre-wrap;font-size:12px">${JSON.stringify(r.data, null, 2)}</pre>`,
      });
      refetchPartners();
    } catch (err) {
      alertError('Could not issue keys', err.response?.data?.detail || err.message);
    } finally {
      setBusy('');
    }
  };

  const partnerReasonPrompt = async (title, text) => {
    const result = await fire({
      title,
      text,
      input: 'text',
      inputPlaceholder: 'Reason',
      showCancelButton: true,
      confirmButtonText: 'Continue',
      inputValidator: (value) => (!value || value.trim().length < 3 ? 'Enter at least 3 characters.' : undefined),
    });
    return result.isConfirmed ? result.value.trim() : '';
  };

  const rotatePartner = async (clientId) => {
    const reason = await partnerReasonPrompt('Rotate partner credentials', 'Provide the rotation reason.');
    if (!reason) return;
    setBusy(`rotate-${clientId}`);
    try {
      const { data } = await api.post(`/financing/admin/partners/${clientId}/rotate`, { reason });
      await fire({
        title: 'Copy rotated secrets now',
        html: `<pre style="text-align:left;white-space:pre-wrap;font-size:12px">${JSON.stringify({
          client_id: data.client_id,
          lender_id: data.lender_id,
          environment: data.environment,
          client_secret: data.client_secret,
          webhook_secret: data.webhook_secret,
        }, null, 2)}</pre>`,
      });
      refetchPartners();
    } catch (err) {
      alertError('Could not rotate partner', err.response?.data?.detail || err.message);
    } finally {
      setBusy('');
    }
  };

  const revokePartnerTokens = async (clientId) => {
    const reason = await partnerReasonPrompt('Revoke all partner tokens', 'Provide the revoke reason.');
    if (!reason) return;
    setBusy(`revoke-${clientId}`);
    try {
      await api.post(`/financing/admin/partners/${clientId}/revoke-tokens`, { reason });
      alertSuccess('Tokens revoked', `${clientId} must request a new token.`);
      refetchPartners();
    } catch (err) {
      alertError('Could not revoke tokens', err.response?.data?.detail || err.message);
    } finally {
      setBusy('');
    }
  };

  const setPartnerEnabled = async (clientId, enable) => {
    setBusy(`${enable ? 'enable' : 'disable'}-${clientId}`);
    try {
      await api.post(`/financing/admin/partners/${clientId}/${enable ? 'enable' : 'disable'}`);
      alertSuccess(enable ? 'Partner enabled' : 'Partner disabled', clientId);
      refetchPartners();
    } catch (err) {
      alertError('Could not update partner', err.response?.data?.detail || err.message);
    } finally {
      setBusy('');
    }
  };

  const switchPartnerEnvironment = async (clientId, currentEnv) => {
    const targetEnv = currentEnv === 'sandbox' ? 'production' : 'sandbox';
    const { isConfirmed } = await fire({
      title: `Switch environment to ${targetEnv}?`,
      text: 'This revokes active tokens for this partner.',
      showCancelButton: true,
      confirmButtonText: `Switch to ${targetEnv}`,
    });
    if (!isConfirmed) return;
    setBusy(`env-${clientId}`);
    try {
      await api.post(`/financing/admin/partners/${clientId}/environment`, { environment: targetEnv });
      alertSuccess('Environment switched', `${clientId} is now ${targetEnv}.`);
      refetchPartners();
    } catch (err) {
      alertError('Could not switch environment', err.response?.data?.detail || err.message);
    } finally {
      setBusy('');
    }
  };

  const downloadPack = async (lenderId) => {
    setBusy('doc');
    try {
      const r = await api.get(`/financing/admin/lenders/${lenderId}/integration.docx`, { responseType: 'blob' });
      const url = URL.createObjectURL(r.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Pochi-Funder-Integration-${lenderId}.docx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      alertError('Could not download pack', err.response?.data?.detail || err.message);
    } finally {
      setBusy('');
    }
  };

  const closeDrawer = () => {
    setDrawerOpen(false);
    setForm(emptyFunder);
    setEditingFunder(false);
  };

  const openAddDrawer = () => {
    setForm(emptyFunder);
    setEditingFunder(false);
    setDrawerOpen(true);
  };

  const openEditDrawer = (row) => {
    setForm({
      lender_id: row.lender_id || '',
      display_name: row.display_name || '',
      live_url: '',
      rank: row.rank ?? 100,
      is_active: row.is_active !== false,
      mock: Boolean(row.mock),
      interest_monthly_pct: row.interest_monthly_pct ?? 2.5,
      timeout_seconds: row.timeout_seconds ?? 8,
      eligibility_url: row.eligibility_url || '',
    });
    setEditingFunder(true);
    setDrawerOpen(true);
  };

  const markNotice = async (id) => {
    try {
      await api.post(`/financing/admin/notices/${id}/read`);
      queryClient.invalidateQueries({ queryKey: queryKeys.financingNotices });
    } catch (err) {
      alertError('Could not mark read', err.response?.data?.detail || err.message);
    }
  };

  return (
    <div className="paylater">
      <div className="paylater-header">
        <div>
          <h1 className="paylater-title">Pay Later</h1>
          <p className="paylater-subtitle">
            Funder book, vendor payouts, and collections. Loan proceeds never go to the customer phone.
          </p>
        </div>
        <div className="paylater-header-actions">
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={() => {
              setTab('funders');
              openAddDrawer();
            }}
          >
            <Plus size={14} /> Add funder
          </button>
          <button type="button" className="paylater-refresh" onClick={refreshAll}>
            <RefreshCw size={14} /> Refresh
          </button>
        </div>
      </div>

      <div className="paylater-kpis">
        <div className="paylater-kpi">
          <div className="paylater-kpi-icon"><Banknote size={16} /></div>
          <div>
            <div className="paylater-kpi-label">Loans</div>
            <div className="paylater-kpi-value">{kpis.total}</div>
          </div>
        </div>
        <div className="paylater-kpi warn">
          <div className="paylater-kpi-icon"><Clock size={16} /></div>
          <div>
            <div className="paylater-kpi-label">Awaiting cash</div>
            <div className="paylater-kpi-value">{kpis.awaitingFunds}</div>
          </div>
        </div>
        <div className="paylater-kpi warn">
          <div className="paylater-kpi-icon"><AlertTriangle size={16} /></div>
          <div>
            <div className="paylater-kpi-label">Held payouts</div>
            <div className="paylater-kpi-value">{kpis.held}</div>
          </div>
        </div>
        <div className="paylater-kpi">
          <div className="paylater-kpi-icon"><Inbox size={16} /></div>
          <div>
            <div className="paylater-kpi-label">Delinquent / unmatched</div>
            <div className="paylater-kpi-value">{kpis.overdue} / {kpis.unmatched}</div>
          </div>
        </div>
      </div>

      <div className="paylater-tabs" role="tablist">
        {tabs.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              className={`paylater-tab ${tab === t.id ? 'active' : ''}`}
              onClick={() => setTab(t.id)}
            >
              <Icon size={15} />
              {t.label}
              <span className="paylater-tab-count">{t.count}</span>
            </button>
          );
        })}
      </div>

      {tab === 'loans' && (
        <section className="paylater-panel">
          <div className="paylater-panel-head"><h2>Loan book</h2></div>
          {loansLoading ? <Loading /> : !loans.length ? (
            <Empty title="No loans yet" body="Pay Later loans appear here after a customer confirms an offer." />
          ) : (
            <div className="paylater-table-wrap">
              <table className="paylater-table">
                <thead>
                  <tr>
                    <th>Status</th>
                    <th>Lender</th>
                    <th>Principal</th>
                    <th>Outstanding</th>
                    <th>Funds</th>
                    <th>Hold</th>
                    <th>Next due</th>
                  </tr>
                </thead>
                <tbody>
                  {loans.map((loan) => (
                    <tr key={loan.loan_id}>
                      <td><span className={`paylater-pill ${statusPill(loan.status)}`}>{loan.status}</span></td>
                      <td>
                        {loan.lender_id}
                        <div className="paylater-sub">{loan.lender_loan_ref || loan.loan_id?.slice(0, 8)}</div>
                      </td>
                      <td>{fmt(loan.principal, loan.currency)}</td>
                      <td>{fmt(loan.outstanding, loan.currency)}</td>
                      <td>
                        <span className={`paylater-pill ${loan.funds_reserved ? 'ok' : 'wait'}`}>
                          {loan.funds_reserved ? 'Reserved' : 'Waiting'}
                        </span>
                      </td>
                      <td>{loan.payout_hold_reason || '—'}</td>
                      <td>{loan.next_due_at ? new Date(loan.next_due_at).toLocaleDateString('en-UG') : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {tab === 'funders' && (
        <section className="paylater-panel">
          <div className="paylater-panel-head">
            <h2>Funders</h2>
            <button type="button" className="btn btn-primary btn-sm" onClick={openAddDrawer}>
              <Plus size={14} /> Add funder
            </button>
          </div>
          {lendersLoading ? <Loading /> : !lenders.length ? (
            <Empty title="No funders listed" body="Add a funder from the right. ID, eligibility URL, and keys are generated; a Word pack downloads on save." />
          ) : (
            <>
              <div className="paylater-table-wrap">
                <table className="paylater-table">
                  <thead>
                    <tr>
                      <th>Funder</th>
                      <th>Mode</th>
                      <th>Eligibility URL</th>
                      <th>Rank</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {lenders.map((row) => (
                      <tr key={row.lender_id}>
                        <td>
                          {row.display_name}
                          <div className="paylater-sub">{row.lender_id}</div>
                        </td>
                        <td>
                          <span className={`paylater-pill ${row.mock || !row.eligibility_url ? 'wait' : row.is_active ? 'ok' : 'off'}`}>
                            {row.mock || !row.eligibility_url ? 'Mock' : row.is_active ? 'Live' : 'Off'}
                          </span>
                        </td>
                        <td className="paylater-sub">{row.eligibility_url || '—'}</td>
                        <td>{row.rank}</td>
                        <td>
                          <div className="paylater-row-actions">
                            <button type="button" className="paylater-ghost" onClick={() => openEditDrawer(row)}>
                              <Pencil size={13} /> Edit
                            </button>
                            <button type="button" className="paylater-ghost" onClick={() => downloadPack(row.lender_id)} disabled={busy === 'doc'}>
                              <FileDown size={13} /> Integration pack
                            </button>
                            <button type="button" className="paylater-ghost" onClick={() => issueKeys(row.lender_id)} disabled={busy === 'keys'}>
                              Rotate API keys
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="paylater-panel-head paylater-subhead">
                <h2>Partner credential lifecycle</h2>
              </div>
              {partnersLoading ? <Loading /> : !partners.length ? (
                <Empty title="No partner credentials yet" body="Issue credentials from a funder row to activate partner access." />
              ) : (
                <div className="paylater-table-wrap">
                  <table className="paylater-table">
                    <thead>
                      <tr>
                        <th>Client</th>
                        <th>Lender</th>
                        <th>Environment</th>
                        <th>Status</th>
                        <th>Last used</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {partners.map((p) => (
                        <tr key={p.client_id}>
                          <td>
                            {p.client_id}
                            <div className="paylater-sub">v{p.token_version}</div>
                          </td>
                          <td>{p.lender_id}</td>
                          <td>
                            <span className={`paylater-pill ${p.environment === 'production' ? 'ok' : 'wait'}`}>{p.environment}</span>
                          </td>
                          <td>
                            <span className={`paylater-pill ${p.is_active ? 'ok' : 'off'}`}>{p.is_active ? 'Enabled' : 'Disabled'}</span>
                          </td>
                          <td className="paylater-sub">
                            {p.last_used_at ? new Date(p.last_used_at).toLocaleString('en-UG') : 'Never'}
                            <div>{p.last_used_ip || '—'} · {p.last_used_path || '—'}</div>
                          </td>
                          <td>
                            <div className="paylater-row-actions">
                              <button type="button" className="paylater-ghost" onClick={() => rotatePartner(p.client_id)} disabled={busy === `rotate-${p.client_id}`}>
                                Rotate
                              </button>
                              <button type="button" className="paylater-ghost" onClick={() => revokePartnerTokens(p.client_id)} disabled={busy === `revoke-${p.client_id}`}>
                                Revoke tokens
                              </button>
                              <button type="button" className="paylater-ghost" onClick={() => switchPartnerEnvironment(p.client_id, p.environment)} disabled={busy === `env-${p.client_id}`}>
                                Env: {p.environment === 'sandbox' ? 'to production' : 'to sandbox'}
                              </button>
                              {p.is_active ? (
                                <button type="button" className="paylater-ghost" onClick={() => setPartnerEnabled(p.client_id, false)} disabled={busy === `disable-${p.client_id}`}>
                                  Disable
                                </button>
                              ) : (
                                <button type="button" className="paylater-ghost" onClick={() => setPartnerEnabled(p.client_id, true)} disabled={busy === `enable-${p.client_id}`}>
                                  Enable
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </section>
      )}

      {tab === 'inbox' && (
        <section className="paylater-panel">
          <div className="paylater-panel-head"><h2>Pay Later notices</h2></div>
          {noticesLoading ? <Loading /> : !notices.length ? (
            <Empty title="Inbox is empty" body="Approvals, holds, unmatched webhooks, and write-offs land here." />
          ) : (
            <div className="paylater-notices">
              {notices.map((n) => (
                <article key={n.id} className="paylater-notice">
                  <div>
                    <h3>{n.title}</h3>
                    <div className="paylater-sub">{n.kind} · {n.created_at ? new Date(n.created_at).toLocaleString('en-UG') : ''}</div>
                    <p>{n.message}</p>
                  </div>
                  {!n.is_read && (
                    <button type="button" className="paylater-ghost" onClick={() => markNotice(n.id)}>Mark read</button>
                  )}
                </article>
              ))}
            </div>
          )}
        </section>
      )}

      {tab === 'ops' && (
        <section className="paylater-panel">
          <div className="paylater-panel-head"><h2>Operations</h2></div>
          {treasury && (
            <div className="paylater-settle">
              <div className="paylater-kpi-label">Funder → Pochi Yo wallet</div>
              <div className="paylater-settle-row">
                Send to existing Yo merchant {treasury.yo_merchant_code || 'YO_API_USERNAME'} · {treasury.account_name || 'Pochi'} · IPN {treasury.yo_ipn_url || '/yo-ipn'}
              </div>
              <div className="paylater-sub">{treasury.how_to_pay}</div>
            </div>
          )}
          {funderCredits.length > 0 && (
            <div className="paylater-table-wrap">
              <table className="paylater-table">
                <thead>
                  <tr>
                    <th>Reference</th>
                    <th>Loan / request</th>
                    <th>Amount</th>
                    <th>Source</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {funderCredits.map((row) => (
                    <tr key={row.id}>
                      <td>
                        {row.payment_reference}
                        <div className="paylater-sub">{row.yo_network_ref || row.narrative || '—'}</div>
                      </td>
                      <td>
                        {row.loan_id ? row.loan_id.slice(0, 8) : 'Unmatched'}
                        <div className="paylater-sub">{row.application_id ? `app ${row.application_id.slice(0, 8)}` : '—'}</div>
                      </td>
                      <td>{fmt(row.amount, row.currency)}</td>
                      <td>{row.source}</td>
                      <td><span className={`paylater-pill ${row.status === 'MATCHED' ? 'ok' : 'wait'}`}>{row.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="paylater-ops">
            <button type="button" disabled={!!busy} onClick={() => runOp('col', '/financing/admin/collections/run', 'Collections cycle')}>
              {busy === 'col' ? <Loader2 className="spin" size={14} /> : <Wrench size={14} />} Run collections
            </button>
            <button type="button" disabled={!!busy} onClick={() => runOp('pay', '/financing/admin/payouts/retry', 'Payout retry')}>
              Retry held payouts
            </button>
            <button type="button" disabled={!!busy} onClick={() => runOp('rec', '/financing/admin/reconcile', 'Reconcile')}>
              Match unmatched webhooks
            </button>
          </div>
          {settlementBatches.map((batch) => (
            <div key={`${batch.period}-${batch.lender_id}`} className="paylater-settle">
              <div className="paylater-kpi-label">Settlement {batch.period} · {batch.lender_id}</div>
              <div className="paylater-settle-row">Net {fmt(batch.net)} · cash moved: {String(batch.cash_moved ?? false)}</div>
              <div className="paylater-sub">{JSON.stringify(batch.payment_instruction || {})}</div>
            </div>
          ))}
          {unmatchedLoading ? <Loading /> : (
            <div className="paylater-table-wrap">
              <table className="paylater-table">
                <thead>
                  <tr>
                    <th>Source</th>
                    <th>Reason</th>
                    <th>When</th>
                  </tr>
                </thead>
                <tbody>
                  {unmatched.length ? unmatched.map((row) => (
                    <tr key={row.id}>
                      <td>{row.source}</td>
                      <td>{row.reason}</td>
                      <td>{row.created_at ? new Date(row.created_at).toLocaleString('en-UG') : '—'}</td>
                    </tr>
                  )) : (
                    <tr><td colSpan={3}>No unmatched webhooks.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      <div className={`drawer-overlay ${drawerOpen ? 'open' : ''}`} onClick={closeDrawer}>
        <div className="drawer" onClick={(e) => e.stopPropagation()}>
          <div className="drawer-head">
            <div className="drawer-head-left">
              <div className="drawer-head-icon"><Landmark size={20} /></div>
              <div>
                <h2>{editingFunder ? 'Update funder' : 'Add funder'}</h2>
                <p>{editingFunder ? form.lender_id : 'Appears in the bid list after save'}</p>
              </div>
            </div>
            <button type="button" className="drawer-close" onClick={closeDrawer}><X size={16} /></button>
          </div>
          <form className="paylater-drawer-form" onSubmit={saveFunder}>
            <div className="drawer-body">
              <div className="detail-section">
                <div className="detail-section-title">Identity</div>
                <p className="paylater-sub" style={{ margin: '0 0 12px' }}>
                  Funder ID, eligibility URL, and API keys are generated on save. A Word pack downloads with the integration steps.
                </p>
                <div className="detail-grid">
                  <div className="detail-item" style={{ gridColumn: '1 / -1' }}>
                    <label>Display name</label>
                    <input
                      required
                      value={form.display_name}
                      onChange={(e) => setForm({ ...form, display_name: e.target.value })}
                      placeholder="Pilot MFI"
                    />
                  </div>
                  {editingFunder && (
                    <>
                      <div className="detail-item">
                        <label>Funder ID</label>
                        <input readOnly value={form.lender_id} />
                      </div>
                      <div className="detail-item" style={{ gridColumn: '1 / -1' }}>
                        <label>Generated eligibility URL</label>
                        <input readOnly value={form.eligibility_url || ''} />
                      </div>
                      <div className="detail-item" style={{ gridColumn: '1 / -1' }}>
                        <label>Live eligibility URL (optional override)</label>
                        <input
                          type="url"
                          value={form.live_url}
                          onChange={(e) => setForm({ ...form, live_url: e.target.value })}
                          placeholder="https://bank.example/v1/pochi/eligibility"
                        />
                      </div>
                    </>
                  )}
                </div>
              </div>
              <div className="detail-section">
                <div className="detail-section-title">Bid settings</div>
                <div className="detail-grid">
                  <div className="detail-item">
                    <label>Rank</label>
                    <input type="number" value={form.rank} onChange={(e) => setForm({ ...form, rank: e.target.value })} />
                  </div>
                  <div className="detail-item">
                    <label>Monthly interest %</label>
                    <input type="number" step="0.01" value={form.interest_monthly_pct} onChange={(e) => setForm({ ...form, interest_monthly_pct: e.target.value })} />
                  </div>
                  <div className="detail-item">
                    <label>Timeout (seconds)</label>
                    <input type="number" value={form.timeout_seconds} onChange={(e) => setForm({ ...form, timeout_seconds: e.target.value })} />
                  </div>
                  <div className="detail-item">
                    <label>Flags</label>
                    <div className="paylater-checks">
                      <label className="paylater-check">
                        <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} />
                        Active in bids
                      </label>
                      <label className="paylater-check">
                        <input type="checkbox" checked={form.mock} onChange={(e) => setForm({ ...form, mock: e.target.checked })} />
                        Mock
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="drawer-footer">
              <button type="button" className="btn btn-ghost" onClick={closeDrawer}>Cancel</button>
              <button type="submit" className="btn btn-primary flex-1" disabled={busy === 'funder'}>
                {busy === 'funder' ? <Loader2 size={14} className="spin" /> : <Plus size={14} />}
                {editingFunder ? 'Save changes' : 'Save funder'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default PayLater;

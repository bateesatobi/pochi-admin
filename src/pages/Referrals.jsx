import React, { useMemo, useState } from 'react';
import {
  Gift, RefreshCw, Loader2, Trophy, AlertTriangle, Package,
  BarChart3, Snowflake, CheckCircle2, X, ScrollText,
} from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { alertSuccess, alertError, fire } from '../utils/swal';
import { api } from '../context/AdminAuthContext';
import {
  useReferralAnalytics,
  useReferralAudit,
  useReferralCampaigns,
  useReferralEvents,
  useReferralKits,
  useReferralLeaderboard,
} from '../hooks/queries';
import { queryKeys } from '../lib/queryKeys';
import { formatMoney } from '../utils/currency';
import './Referrals.css';

const Loading = () => (
  <div className="ref-loading"><Loader2 className="spin" size={22} /> Loading…</div>
);

const Empty = ({ title, body }) => (
  <div className="ref-empty">
    <h3>{title}</h3>
    <p>{body}</p>
  </div>
);

const statusClass = (status) => {
  if (status === 'live') return 'ok';
  if (status === 'frozen') return 'wait';
  if (status === 'archived') return 'off';
  return 'draft';
};

const toLocalInput = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const fmtPct = (value) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return '0%';
  return `${(n * 100).toFixed(1)}%`;
};

const Referrals = () => {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState('leaderboard');
  const [busy, setBusy] = useState('');
  const [selectedId, setSelectedId] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [form, setForm] = useState({
    name: 'Race to Install',
    status: 'draft',
    starts_at: '',
    ends_at: '',
    activation_hours: 48,
    kit_inventory: 10,
    percent: 15,
    cap_amount: 5000,
    expiry_hours: 168,
    secondary_percent: 25,
    secondary_cap: 10000,
  });

  const {
    data: campaigns = [],
    isLoading: campaignsLoading,
    isError: campaignsError,
    error: campaignsErr,
    refetch: refetchCampaigns,
  } = useReferralCampaigns();

  const campaignId = selectedId || campaigns[0]?.id || '';
  const campaign = campaigns.find((c) => c.id === campaignId) || campaigns[0] || null;

  const { data: leaderboard = [], isLoading: lbLoading, refetch: refetchLb } = useReferralLeaderboard(campaignId, !!campaignId);
  const { data: events = [], isLoading: eventsLoading, refetch: refetchEvents } = useReferralEvents(campaignId, false, !!campaignId);
  const { data: fraudEvents = [], refetch: refetchFraud } = useReferralEvents(campaignId, true, !!campaignId && tab === 'fraud');
  const { data: kits = [], isLoading: kitsLoading, refetch: refetchKits } = useReferralKits(campaignId, !!campaignId);
  const { data: analytics, refetch: refetchAnalytics } = useReferralAnalytics(campaignId, !!campaignId);
  const { data: audit = [], isLoading: auditLoading, refetch: refetchAudit } = useReferralAudit(campaignId, !!campaignId && tab === 'audit');

  const disabled = campaignsError && campaignsErr?.response?.status === 404;

  const refreshAll = () => {
    queryClient.invalidateQueries({ queryKey: ['admin', 'referrals'] });
    refetchCampaigns();
    refetchLb();
    refetchEvents();
    refetchFraud();
    refetchKits();
    refetchAnalytics();
    refetchAudit();
  };

  const openCreate = () => {
    const now = new Date();
    const end = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    setForm({
      _mode: 'create',
      name: 'Race to Install',
      status: 'draft',
      starts_at: toLocalInput(now.toISOString()),
      ends_at: toLocalInput(end.toISOString()),
      activation_hours: 48,
      kit_inventory: 10,
      percent: 15,
      cap_amount: 5000,
      expiry_hours: 168,
      secondary_percent: 25,
      secondary_cap: 10000,
    });
    setDrawerOpen(true);
  };

  const openEdit = () => {
    if (!campaign) return;
    const tier = campaign.discount_tier_config || {};
    const sec = campaign.secondary_tier_config || {};
    setForm({
      _mode: 'edit',
      name: campaign.name || '',
      status: campaign.status || 'draft',
      starts_at: toLocalInput(campaign.starts_at),
      ends_at: toLocalInput(campaign.ends_at),
      activation_hours: campaign.activation_hours ?? 48,
      kit_inventory: campaign.kit_inventory ?? 10,
      percent: tier.percent ?? 15,
      cap_amount: tier.cap_amount ?? 5000,
      expiry_hours: tier.expiry_hours ?? 168,
      secondary_percent: sec.percent ?? 25,
      secondary_cap: sec.cap_amount ?? 10000,
    });
    setDrawerOpen(true);
  };

  const saveCampaign = async () => {
    setBusy('save');
    try {
      const body = {
        name: form.name,
        status: form.status,
        starts_at: new Date(form.starts_at).toISOString(),
        ends_at: new Date(form.ends_at).toISOString(),
        activation_hours: Number(form.activation_hours),
        kit_inventory: Number(form.kit_inventory),
        discount_tier_config: {
          percent: Number(form.percent),
          cap_amount: Number(form.cap_amount),
          expiry_hours: Number(form.expiry_hours),
        },
        secondary_tier_config: {
          percent: Number(form.secondary_percent),
          cap_amount: Number(form.secondary_cap),
          expiry_hours: 336,
        },
      };
      let saved;
      if (form._mode === 'edit' && campaign) {
        const r = await api.patch(`/referrals/admin/campaigns/${campaign.id}`, body);
        saved = r.data;
      } else {
        const r = await api.post('/referrals/admin/campaigns', body);
        saved = r.data;
        setSelectedId(saved.id);
      }
      alertSuccess('Campaign saved', saved.name);
      setDrawerOpen(false);
      refreshAll();
    } catch (e) {
      alertError('Save failed', e?.response?.data?.detail || e.message);
    } finally {
      setBusy('');
    }
  };

  const seedCampaign = async () => {
    setBusy('seed');
    try {
      const r = await api.post('/referrals/admin/seed');
      setSelectedId(r.data.id);
      alertSuccess('Seeded', r.data.name);
      refreshAll();
    } catch (e) {
      alertError('Seed failed', e?.response?.data?.detail || e.message);
    } finally {
      setBusy('');
    }
  };

  const freezeCampaign = async () => {
    if (!campaign) return;
    const conf = await fire({
      title: 'Freeze campaign?',
      text: 'Top 10 get kit slots; ranks 11–25 get secondary coupons. No further activations.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Freeze',
    });
    if (!conf.isConfirmed) return;
    setBusy('freeze');
    try {
      const r = await api.post(`/referrals/admin/campaigns/${campaign.id}/freeze`);
      alertSuccess('Frozen', JSON.stringify(r.data));
      refreshAll();
    } catch (e) {
      alertError('Freeze failed', e?.response?.data?.detail || e.message);
    } finally {
      setBusy('');
    }
  };

  const verifyUser = async (userId) => {
    setBusy(`verify-${userId}`);
    try {
      await api.post(`/referrals/admin/verify/${userId}`, null, {
        params: { campaign_id: campaignId },
      });
      alertSuccess('Verified', 'Kit identity check marked verified');
      refreshAll();
    } catch (e) {
      alertError('Verify failed', e?.response?.data?.detail || e.message);
    } finally {
      setBusy('');
    }
  };

  const markCollected = async (kitId) => {
    setBusy(`kit-${kitId}`);
    try {
      await api.put(`/referrals/admin/kits/${kitId}`, { pickup_status: 'collected' });
      alertSuccess('Updated', 'Kit marked collected');
      refreshAll();
    } catch (e) {
      alertError('Update failed', e?.response?.data?.detail || e.message);
    } finally {
      setBusy('');
    }
  };

  const unflag = async (eventId) => {
    setBusy(`unflag-${eventId}`);
    try {
      await api.post('/referrals/admin/unflag', { event_id: eventId });
      alertSuccess('Unflagged', 'Event cleared for rewards on next activation');
      refreshAll();
    } catch (e) {
      alertError('Unflag failed', e?.response?.data?.detail || e.message);
    } finally {
      setBusy('');
    }
  };

  const tabs = [
    { id: 'leaderboard', label: 'Leaderboard', icon: Trophy, count: leaderboard.length },
    { id: 'fraud', label: 'Fraud', icon: AlertTriangle, count: fraudEvents.length },
    { id: 'kits', label: 'Kits', icon: Package, count: kits.length },
    { id: 'analytics', label: 'Analytics', icon: BarChart3, count: null },
    { id: 'audit', label: 'Audit', icon: ScrollText, count: audit.length },
  ];

  const kpis = useMemo(() => ({
    installs: analytics?.installs ?? events.length,
    verified: analytics?.verified_activations ?? events.filter((e) => e.verified).length,
    rate: analytics?.activation_rate ?? 0,
    fraud: analytics?.fraud_flagged ?? fraudEvents.length,
    cost: analytics?.actual_cost ?? analytics?.estimated_cost ?? 0,
  }), [analytics, events, fraudEvents]);

  if (campaignsLoading) return <Loading />;

  if (disabled) {
    return (
      <div className="ref">
        <Empty
          title="Referral system is off"
          body="Set REFERRAL_ENABLED=true on the backend, redeploy, then Seed or create a campaign. Admin APIs return 404 while the flag is false."
        />
      </div>
    );
  }

  return (
    <div className="ref">
      <div className="ref-header">
        <div>
          <h1 className="ref-title">Race to Install</h1>
          <p className="ref-subtitle">
            Configure campaigns, watch the leaderboard, verify kit winners, and review fraud flags.
          </p>
        </div>
        <div className="ref-header-actions">
          <button type="button" className="ref-refresh" onClick={refreshAll}>
            <RefreshCw size={15} /> Refresh
          </button>
          <button type="button" className="ref-btn ghost" onClick={seedCampaign} disabled={!!busy}>
            {busy === 'seed' ? <Loader2 className="spin" size={15} /> : <Gift size={15} />}
            Seed default
          </button>
          <button type="button" className="ref-btn" onClick={openCreate}>
            New campaign
          </button>
        </div>
      </div>

      <div className="ref-kpis">
        <div className="ref-kpi">
          <div className="ref-kpi-label">Installs</div>
          <div className="ref-kpi-value">{kpis.installs}</div>
        </div>
        <div className="ref-kpi">
          <div className="ref-kpi-label">Verified</div>
          <div className="ref-kpi-value">{kpis.verified}</div>
        </div>
        <div className="ref-kpi">
          <div className="ref-kpi-label">Activation rate</div>
          <div className="ref-kpi-value">{fmtPct(kpis.rate)}</div>
        </div>
        <div className="ref-kpi warn">
          <div className="ref-kpi-label">Fraud flagged</div>
          <div className="ref-kpi-value">{kpis.fraud}</div>
        </div>
        <div className="ref-kpi">
          <div className="ref-kpi-label">Redeemed cost</div>
          <div className="ref-kpi-value">{formatMoney(kpis.cost, 'UGX')}</div>
        </div>
      </div>

      <div className="ref-campaign-bar">
        <label>
          Campaign
          <select
            value={campaignId}
            onChange={(e) => setSelectedId(e.target.value)}
          >
            {campaigns.length === 0 && <option value="">No campaigns</option>}
            {campaigns.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.status})
              </option>
            ))}
          </select>
        </label>
        {campaign && (
          <span className={`ref-pill ${statusClass(campaign.status)}`}>{campaign.status}</span>
        )}
        <div className="ref-campaign-actions">
          <button
            type="button"
            className="ref-btn ghost"
            disabled={!campaign}
            onClick={openEdit}
          >
            Edit
          </button>
          <button
            type="button"
            className="ref-btn danger"
            disabled={!campaign || campaign.status === 'frozen' || busy === 'freeze'}
            onClick={freezeCampaign}
          >
            {busy === 'freeze' ? <Loader2 className="spin" size={15} /> : <Snowflake size={15} />}
            Freeze
          </button>
        </div>
      </div>

      <div className="ref-tabs">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`ref-tab ${tab === t.id ? 'active' : ''}`}
            onClick={() => setTab(t.id)}
          >
            <t.icon size={15} />
            {t.label}
            {t.count != null && <span className="ref-tab-count">{t.count}</span>}
          </button>
        ))}
      </div>

      {tab === 'leaderboard' && (
        <div className="ref-panel">
          <div className="ref-panel-head">
            <h2>Live leaderboard</h2>
          </div>
          {lbLoading ? <Loading /> : leaderboard.length === 0 ? (
            <Empty title="No ranks yet" body="Verified referrals will appear here." />
          ) : (
            <div className="ref-table-wrap">
              <table className="ref-table">
                <thead>
                  <tr>
                    <th>Rank</th>
                    <th>Name</th>
                    <th>Verified</th>
                    <th>Frozen</th>
                    <th>Fraud</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {leaderboard.map((row) => (
                    <tr key={row.user_id}>
                      <td>{row.rank ?? '—'}</td>
                      <td>
                        <div className="ref-name">{row.full_name || row.user_id?.slice(0, 8)}</div>
                        <div className="ref-muted">{row.user_id?.slice(0, 8)}</div>
                      </td>
                      <td>{row.verified_count}</td>
                      <td>{row.frozen_rank ?? '—'}</td>
                      <td>{row.fraud_related_count || 0}</td>
                      <td>
                        {(row.rank || 0) <= 20 && (
                          <button
                            type="button"
                            className="ref-btn ghost small"
                            disabled={!!busy}
                            onClick={() => verifyUser(row.user_id)}
                          >
                            {busy === `verify-${row.user_id}` ? <Loader2 className="spin" size={14} /> : <CheckCircle2 size={14} />}
                            Verify
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === 'fraud' && (
        <div className="ref-panel">
          <div className="ref-panel-head">
            <h2>Flagged events</h2>
          </div>
          {fraudEvents.length === 0 ? (
            <Empty title="No fraud flags" body="Duplicate phone, MoMo, or device hashes show up here." />
          ) : (
            <div className="ref-table-wrap">
              <table className="ref-table">
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Phone</th>
                    <th>Reason</th>
                    <th>Install</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {fraudEvents.map((e) => (
                    <tr key={e.id}>
                      <td>
                        <div className="ref-name">{e.email || e.referred_user_id?.slice(0, 8) || '—'}</div>
                      </td>
                      <td>{e.phone_masked || '—'}</td>
                      <td>{e.fraud_reason || '—'}</td>
                      <td>{e.install_ts ? new Date(e.install_ts).toLocaleString() : '—'}</td>
                      <td>
                        <button
                          type="button"
                          className="ref-btn ghost small"
                          disabled={!!busy}
                          onClick={() => unflag(e.id)}
                        >
                          Unflag
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === 'kits' && (
        <div className="ref-panel">
          <div className="ref-panel-head">
            <h2>Kit allocations</h2>
          </div>
          {kitsLoading ? <Loading /> : kits.length === 0 ? (
            <Empty title="No kits yet" body="Freeze a live campaign to allocate top-10 kit slots." />
          ) : (
            <div className="ref-table-wrap">
              <table className="ref-table">
                <thead>
                  <tr>
                    <th>Rank</th>
                    <th>User</th>
                    <th>Verification</th>
                    <th>Pickup</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {kits.map((k) => (
                    <tr key={k.id}>
                      <td>{k.rank}</td>
                      <td className="ref-muted">{k.user_id?.slice(0, 8)}</td>
                      <td><span className={`ref-pill ${k.verification_status === 'verified' ? 'ok' : 'wait'}`}>{k.verification_status}</span></td>
                      <td><span className={`ref-pill ${k.pickup_status === 'collected' ? 'ok' : 'draft'}`}>{k.pickup_status}</span></td>
                      <td>
                        {k.pickup_status !== 'collected' && (
                          <button
                            type="button"
                            className="ref-btn ghost small"
                            disabled={!!busy}
                            onClick={() => markCollected(k.id)}
                          >
                            Mark collected
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === 'analytics' && (
        <div className="ref-panel">
          <div className="ref-panel-head">
            <h2>Campaign analytics</h2>
          </div>
          {!analytics ? (
            <Empty title="No data" body="Analytics appear once installs are attributed." />
          ) : (
            <div className="ref-analytics">
              <div><span>Installs</span><strong>{analytics.installs}</strong></div>
              <div><span>Verified activations</span><strong>{analytics.verified_activations}</strong></div>
              <div><span>Activation rate</span><strong>{fmtPct(analytics.activation_rate)}</strong></div>
              <div><span>Coupon redemptions</span><strong>{analytics.coupon_redemptions}</strong></div>
              <div><span>Wishlist activations</span><strong>{analytics.wishlist_activations ?? 0}</strong></div>
              <div><span>Purchase activations</span><strong>{analytics.purchase_activations ?? 0}</strong></div>
              <div><span>Estimated cost (cap)</span><strong>{formatMoney(analytics.estimated_cost, 'UGX')}</strong></div>
              <div><span>Actual redeemed</span><strong>{formatMoney(analytics.actual_cost || 0, 'UGX')}</strong></div>
              <div><span>Fraud flagged</span><strong>{analytics.fraud_flagged}</strong></div>
            </div>
          )}
          {eventsLoading ? null : events.length > 0 && (
            <div className="ref-table-wrap" style={{ marginTop: 16 }}>
              <table className="ref-table">
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Verified</th>
                    <th>Fraud</th>
                    <th>Qualify</th>
                    <th>Install</th>
                  </tr>
                </thead>
                <tbody>
                  {events.slice(0, 50).map((e) => (
                    <tr key={e.id}>
                      <td>{e.email || e.referred_user_id?.slice(0, 8) || '—'}</td>
                      <td>{e.verified ? 'yes' : 'no'}</td>
                      <td>{e.fraud_flag ? e.fraud_reason || 'flagged' : '—'}</td>
                      <td>{e.qualify_reason || '—'}</td>
                      <td>{e.install_ts ? new Date(e.install_ts).toLocaleString() : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === 'audit' && (
        <div className="ref-panel">
          <div className="ref-panel-head">
            <h2>Campaign audit log</h2>
          </div>
          {auditLoading ? <Loading /> : audit.length === 0 ? (
            <Empty title="No audit events" body="Code issue, attribution, activation, and kit actions appear here." />
          ) : (
            <div className="ref-table-wrap">
              <table className="ref-table">
                <thead>
                  <tr>
                    <th>When</th>
                    <th>Event</th>
                    <th>Actor</th>
                    <th>Payload</th>
                  </tr>
                </thead>
                <tbody>
                  {audit.map((row) => (
                    <tr key={row.id}>
                      <td>{row.created_at ? new Date(row.created_at).toLocaleString() : '—'}</td>
                      <td>{row.event_type}</td>
                      <td className="ref-muted">{row.actor_user_id ? String(row.actor_user_id).slice(0, 8) : '—'}</td>
                      <td className="ref-muted">{row.payload_json ? JSON.stringify(row.payload_json) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {drawerOpen && (
        <div className="ref-drawer-backdrop" onClick={() => setDrawerOpen(false)}>
          <div className="ref-drawer" onClick={(e) => e.stopPropagation()}>
            <div className="ref-drawer-head">
              <h2>{form._mode === 'edit' ? 'Edit campaign' : 'New campaign'}</h2>
              <button type="button" className="ref-icon-btn" onClick={() => setDrawerOpen(false)}><X size={18} /></button>
            </div>
            <div className="ref-drawer-body">
              <label>Name<input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
              <label>Status
                <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                  <option value="draft">draft</option>
                  <option value="live">live</option>
                  <option value="frozen">frozen</option>
                  <option value="archived">archived</option>
                </select>
              </label>
              <label>Starts<input type="datetime-local" value={form.starts_at} onChange={(e) => setForm({ ...form, starts_at: e.target.value })} /></label>
              <label>Ends<input type="datetime-local" value={form.ends_at} onChange={(e) => setForm({ ...form, ends_at: e.target.value })} /></label>
              <label>Activation hours<input type="number" value={form.activation_hours} onChange={(e) => setForm({ ...form, activation_hours: e.target.value })} /></label>
              <label>Kit inventory<input type="number" value={form.kit_inventory} onChange={(e) => setForm({ ...form, kit_inventory: e.target.value })} /></label>
              <label>Discount %<input type="number" value={form.percent} onChange={(e) => setForm({ ...form, percent: e.target.value })} /></label>
              <label>Cap (UGX)<input type="number" value={form.cap_amount} onChange={(e) => setForm({ ...form, cap_amount: e.target.value })} /></label>
              <label>Coupon expiry hours<input type="number" value={form.expiry_hours} onChange={(e) => setForm({ ...form, expiry_hours: e.target.value })} /></label>
              <label>Secondary % (ranks 11–25)<input type="number" value={form.secondary_percent} onChange={(e) => setForm({ ...form, secondary_percent: e.target.value })} /></label>
              <label>Secondary cap<input type="number" value={form.secondary_cap} onChange={(e) => setForm({ ...form, secondary_cap: e.target.value })} /></label>
            </div>
            <div className="ref-drawer-foot">
              <button type="button" className="ref-btn ghost" onClick={() => setDrawerOpen(false)}>Cancel</button>
              <button type="button" className="ref-btn" disabled={busy === 'save'} onClick={saveCampaign}>
                {busy === 'save' ? <Loader2 className="spin" size={15} /> : null}
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Referrals;

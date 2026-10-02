import React, { useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Percent, Save, RefreshCw, Coins, Receipt, Globe, Info, Plus, Trash2 } from 'lucide-react';
import { alertSuccess, alertError } from '../utils/swal';
import { api } from '../context/AdminAuthContext';
import { usePlatformSettings, useAdminFxRates } from '../hooks/queries';
import { queryKeys } from '../lib/queryKeys';
import { formatMoney, roundForCurrency } from '../utils/currency';
import './PlatformSettings.css';

const EXAMPLE_BASE = 100; // USD — catalog prices are stored in USD

const DEFAULT_OVERRIDE_ROWS = [
  { pair: 'USD-SSP', rate: '' },
];

const computeBreakdown = (basePrice, feePct, vatPct) => {
  const fee = roundForCurrency(basePrice * (feePct / 100), 'USD');
  const afterFee = basePrice + fee;
  const vat = roundForCurrency(afterFee * (vatPct / 100), 'USD');
  const listing = roundForCurrency(afterFee + vat, 'USD');
  return { fee, vat, listing };
};

const fmt = (n) => formatMoney(n, 'USD');

const overridesToRows = (overrides) => {
  const entries = Object.entries(overrides || {});
  if (!entries.length) return DEFAULT_OVERRIDE_ROWS.map((r) => ({ ...r }));
  return entries.map(([pair, rate]) => ({ pair, rate: String(rate) }));
};

const rowsToOverrides = (rows) => {
  const out = {};
  for (const row of rows) {
    const pair = String(row.pair || '').trim().toUpperCase();
    if (!pair) continue;
    const rate = Number(row.rate);
    if (!Number.isFinite(rate) || rate <= 0) {
      throw new Error(`Enter a positive rate for ${pair || 'each pair'}`);
    }
    out[pair] = rate;
  }
  return out;
};

const PlatformSettings = () => {
  const queryClient = useQueryClient();
  const { data: settings, isLoading, isError, error, refetch } = usePlatformSettings();
  const { data: fxPreview, isLoading: fxLoading, refetch: refetchFx } = useAdminFxRates();
  const [feePct, setFeePct] = useState(5);
  const [vatPct, setVatPct] = useState(18);
  const [overrideRows, setOverrideRows] = useState(DEFAULT_OVERRIDE_ROWS);
  const [saving, setSaving] = useState(false);
  const [savingFx, setSavingFx] = useState(false);

  useEffect(() => {
    if (settings) {
      setFeePct(settings.default_platform_fee_pct);
      setVatPct(settings.default_vat_pct);
      setOverrideRows(overridesToRows(settings.fx_rates_json));
    }
  }, [settings]);

  const breakdown = useMemo(
    () => computeBreakdown(EXAMPLE_BASE, Number(feePct) || 0, Number(vatPct) || 0),
    [feePct, vatPct]
  );

  const dirty =
    settings &&
    (Number(feePct) !== Number(settings.default_platform_fee_pct) ||
      Number(vatPct) !== Number(settings.default_vat_pct));

  const handleSave = async (e) => {
    e?.preventDefault();
    setSaving(true);
    try {
      // Fee/VAT only — do not touch fx_rates_json so existing overrides stay intact.
      await api.patch('/admin/settings/platform', {
        default_platform_fee_pct: parseFloat(feePct),
        default_vat_pct: parseFloat(vatPct),
        fx_provider: 'live',
      });
      await queryClient.invalidateQueries({ queryKey: queryKeys.platformSettings });
      await refetchFx();
      alertSuccess('Settings saved', 'Platform fee and VAT defaults are now live.');
    } catch (err) {
      alertError('Error', err.response?.data?.detail || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveFxOverrides = async () => {
    setSavingFx(true);
    try {
      const fx_rates_json = rowsToOverrides(overrideRows);
      await api.patch('/admin/settings/platform', {
        fx_provider: 'live',
        fx_rates_json,
      });
      await queryClient.invalidateQueries({ queryKey: queryKeys.platformSettings });
      await queryClient.invalidateQueries({ queryKey: queryKeys.fxRates });
      await refetchFx();
      alertSuccess(
        'FX overrides saved',
        'Live market rates stay on. Your pairs override only when set (e.g. USD-SSP).'
      );
    } catch (err) {
      alertError('Error', err.message || err.response?.data?.detail || 'Failed to save FX overrides');
    } finally {
      setSavingFx(false);
    }
  };

  const handleClearFxOverrides = async () => {
    setSavingFx(true);
    try {
      await api.patch('/admin/settings/platform', {
        fx_provider: 'live',
        fx_rates_json: {},
      });
      setOverrideRows(DEFAULT_OVERRIDE_ROWS.map((r) => ({ ...r })));
      await queryClient.invalidateQueries({ queryKey: queryKeys.platformSettings });
      await queryClient.invalidateQueries({ queryKey: queryKeys.fxRates });
      await refetchFx();
      alertSuccess('Overrides cleared', 'Pricing again uses the live FX feed only.');
    } catch (err) {
      alertError('Error', err.response?.data?.detail || 'Failed to clear FX overrides');
    } finally {
      setSavingFx(false);
    }
  };

  if (isLoading) {
    return <div className="page-loading">Loading platform settings...</div>;
  }

  if (isError) {
    return (
      <div className="platform-settings-container animate-fade">
        <div className="cat-empty glass" style={{ marginTop: 40 }}>
          <h2>Could not load settings</h2>
          <p>{error?.response?.data?.detail || error?.message || 'Try again.'}</p>
          <button type="button" className="btn-settings-save" onClick={() => refetch()}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  const fxRates = fxPreview?.sample_rates ? Object.entries(fxPreview.sample_rates) : [];

  return (
    <div className="platform-settings-container animate-fade">
      <div className="page-header-refined">
        <div className="title-group">
          <h1>Platform Fee & Tax</h1>
          <p>Global defaults applied to new products, checkout pricing, and merchant payouts.</p>
        </div>
        <div className="header-actions">
          <button type="button" className="btn-settings-ghost" onClick={() => refetchFx()} disabled={fxLoading}>
            <RefreshCw size={16} /> Refresh FX
          </button>
          <button type="button" className="btn-settings-save" onClick={handleSave} disabled={saving || !dirty}>
            <span className="icon-box"><Save size={18} /></span>
            {saving ? 'Saving...' : dirty ? 'Save changes' : 'Saved'}
          </button>
        </div>
      </div>

      <div className="settings-stats-row">
        <div className="settings-stat-card glass">
          <div className="stat-icon orange"><Percent size={22} /></div>
          <div>
            <span className="stat-label">Platform fee</span>
            <strong className="stat-value">{feePct}%</strong>
          </div>
        </div>
        <div className="settings-stat-card glass">
          <div className="stat-icon indigo"><Receipt size={22} /></div>
          <div>
            <span className="stat-label">Default VAT</span>
            <strong className="stat-value">{vatPct}%</strong>
          </div>
        </div>
        <div className="settings-stat-card glass">
          <div className="stat-icon emerald"><Globe size={22} /></div>
          <div>
            <span className="stat-label">FX pairs loaded</span>
            <strong className="stat-value">{fxPreview?.pairs_loaded ?? '—'}</strong>
          </div>
        </div>
      </div>

      <div className="settings-tip-banner glass">
        <div className="tip-icon"><Info size={18} /></div>
        <p>
          Fee and VAT work as before. Exchange rates stay on the live feed by default.
          Optional overrides (e.g. USD-SSP) only replace those pairs — Uganda UGX checkout and Pesapal rails are unchanged.
        </p>
      </div>

      <form className="settings-grid" onSubmit={handleSave}>
        <div className="settings-panel glass">
          <h3>Pricing defaults</h3>
          <p className="panel-sub">Adjust the global platform commission and tax applied server-side.</p>

          <div className="settings-field">
            <label htmlFor="fee-pct">
              Platform fee
              <span className="value-pill">{feePct}%</span>
            </label>
            <input
              id="fee-pct"
              type="range"
              min="0"
              max="25"
              step="0.5"
              value={feePct}
              onChange={(e) => setFeePct(e.target.value)}
            />
            <input
              type="number"
              min="0"
              max="100"
              step="0.1"
              value={feePct}
              onChange={(e) => setFeePct(e.target.value)}
            />
            <p className="field-hint">Commission retained by the platform on each sale before merchant payout.</p>
          </div>

          <div className="settings-field">
            <label htmlFor="vat-pct">
              Default VAT
              <span className="value-pill">{vatPct}%</span>
            </label>
            <input
              id="vat-pct"
              type="range"
              min="0"
              max="30"
              step="0.5"
              value={vatPct}
              onChange={(e) => setVatPct(e.target.value)}
            />
            <input
              type="number"
              min="0"
              max="100"
              step="0.1"
              value={vatPct}
              onChange={(e) => setVatPct(e.target.value)}
            />
            <p className="field-hint">Applied on the subtotal after platform fee when merchants don&apos;t override VAT.</p>
          </div>

          <ul className="impact-list">
            <li>New product listing price previews</li>
            <li>Checkout and cart totals</li>
            <li>Merchant disbursement deductions</li>
          </ul>
        </div>

        <div className="settings-panel glass">
          <h3>Live preview</h3>
          <p className="panel-sub">How a {fmt(EXAMPLE_BASE)} merchant base price becomes a buyer price.</p>

          <div className="preview-example-label">Example breakdown</div>
          <div className="preview-breakdown">
            <div className="preview-row">
              <span>Merchant base price</span>
              <strong>{fmt(EXAMPLE_BASE)}</strong>
            </div>
            <div className="preview-row">
              <span>Platform fee ({feePct}%)</span>
              <strong>+{fmt(breakdown.fee)}</strong>
            </div>
            <div className="preview-row">
              <span>VAT on subtotal ({vatPct}%)</span>
              <strong>+{fmt(breakdown.vat)}</strong>
            </div>
            <div className="preview-row total">
              <span>Buyer listing price</span>
              <strong>{fmt(breakdown.listing)}</strong>
            </div>
          </div>

          <ul className="impact-list">
            <li>Merchant receives base price minus promotions</li>
            <li>Platform keeps {feePct}% of collected sale value</li>
            <li>VAT is included in the buyer-facing price</li>
          </ul>
        </div>
      </form>

      <div className="fx-panel glass">
        <div className="fx-panel-header">
          <div>
            <h3><Coins size={18} style={{ verticalAlign: 'middle', marginRight: 8 }} />Exchange rates</h3>
            <p>
              Live public market data · {fxPreview?.provider || 'live'} feed · overrides apply on top
            </p>
          </div>
          <button type="button" className="btn-settings-ghost" onClick={() => refetchFx()} disabled={fxLoading}>
            <RefreshCw size={16} /> {fxLoading ? 'Loading...' : 'Refresh'}
          </button>
        </div>

        {fxLoading && !fxPreview ? (
          <div className="fx-empty">Loading exchange rates...</div>
        ) : fxRates.length === 0 ? (
          <div className="fx-empty">Could not load exchange rate preview.</div>
        ) : (
          <div className="fx-rates-grid">
            {fxRates.map(([pair, rate]) => (
              <div key={pair} className="fx-rate-chip">
                <div className="pair">{pair.replace('-', ' → ')}</div>
                <div className="rate">{Number(rate).toLocaleString(undefined, { maximumFractionDigits: 4 })}</div>
              </div>
            ))}
          </div>
        )}

        <div className="fx-overrides">
          <div className="fx-overrides-header">
            <div>
              <h4>Admin FX overrides</h4>
              <p>Optional. Live rates remain the default. Add USD-SSP (and others) without changing UGX behaviour.</p>
            </div>
            <div className="fx-overrides-actions">
              <button
                type="button"
                className="btn-settings-ghost"
                onClick={() => setOverrideRows((rows) => [...rows, { pair: '', rate: '' }])}
              >
                <Plus size={16} /> Add pair
              </button>
              <button type="button" className="btn-settings-ghost" onClick={handleClearFxOverrides} disabled={savingFx}>
                Clear
              </button>
              <button type="button" className="btn-settings-save" onClick={handleSaveFxOverrides} disabled={savingFx}>
                <span className="icon-box"><Save size={18} /></span>
                {savingFx ? 'Saving...' : 'Save overrides'}
              </button>
            </div>
          </div>

          <div className="fx-override-rows">
            {overrideRows.map((row, idx) => (
              <div key={`fx-row-${idx}`} className="fx-override-row">
                <input
                  aria-label={`FX pair ${idx + 1}`}
                  placeholder="USD-SSP"
                  value={row.pair}
                  onChange={(e) => {
                    const next = [...overrideRows];
                    next[idx] = { ...next[idx], pair: e.target.value };
                    setOverrideRows(next);
                  }}
                />
                <input
                  aria-label={`FX rate ${idx + 1}`}
                  type="number"
                  min="0"
                  step="any"
                  placeholder="Rate"
                  value={row.rate}
                  onChange={(e) => {
                    const next = [...overrideRows];
                    next[idx] = { ...next[idx], rate: e.target.value };
                    setOverrideRows(next);
                  }}
                />
                <button
                  type="button"
                  className="btn-settings-ghost"
                  aria-label={`Remove FX pair ${idx + 1}`}
                  onClick={() => setOverrideRows((rows) => (rows.length <= 1 ? DEFAULT_OVERRIDE_ROWS.map((r) => ({ ...r })) : rows.filter((_, i) => i !== idx)))}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlatformSettings;

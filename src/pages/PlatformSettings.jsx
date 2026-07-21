import React, { useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Percent, Save, RefreshCw, Coins, Receipt, Globe, Info } from 'lucide-react';
import { alertSuccess, alertError } from '../utils/swal';
import { api } from '../context/AdminAuthContext';
import { usePlatformSettings, useAdminFxRates } from '../hooks/queries';
import { queryKeys } from '../lib/queryKeys';
import { formatMoney, roundForCurrency } from '../utils/currency';
import './PlatformSettings.css';

const EXAMPLE_BASE = 100; // USD — catalog prices are stored in USD

const computeBreakdown = (basePrice, feePct, vatPct) => {
  const fee = roundForCurrency(basePrice * (feePct / 100), 'USD');
  const afterFee = basePrice + fee;
  const vat = roundForCurrency(afterFee * (vatPct / 100), 'USD');
  const listing = roundForCurrency(afterFee + vat, 'USD');
  return { fee, vat, listing };
};

const fmt = (n) => formatMoney(n, 'USD');

const PlatformSettings = () => {
  const queryClient = useQueryClient();
  const { data: settings, isLoading, isError, error, refetch } = usePlatformSettings();
  const { data: fxPreview, isLoading: fxLoading, refetch: refetchFx } = useAdminFxRates();
  const [feePct, setFeePct] = useState(5);
  const [vatPct, setVatPct] = useState(18);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (settings) {
      setFeePct(settings.default_platform_fee_pct);
      setVatPct(settings.default_vat_pct);
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
          These rates drive how merchant base prices become buyer listing prices, how checkout totals are calculated,
          and how platform fees are deducted from disbursements. Changes apply to new pricing calculations immediately.
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
              Live public market data · {fxPreview?.provider || 'live'} feed · refreshed hourly
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
      </div>
    </div>
  );
};

export default PlatformSettings;

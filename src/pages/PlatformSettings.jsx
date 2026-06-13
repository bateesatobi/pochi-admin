import React, { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Percent, Save, RefreshCw } from 'lucide-react';
import { alertSuccess, alertError } from '../utils/swal';
import { api } from '../context/AdminAuthContext';
import { usePlatformSettings, useAdminFxRates } from '../hooks/queries';
import { queryKeys } from '../lib/queryKeys';

const PlatformSettings = () => {
  const queryClient = useQueryClient();
  const { data: settings, isLoading: loading } = usePlatformSettings();
  const { data: fxPreview, refetch: refetchFx } = useAdminFxRates();
  const [feePct, setFeePct] = useState(5);
  const [vatPct, setVatPct] = useState(18);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (settings) {
      setFeePct(settings.default_platform_fee_pct);
      setVatPct(settings.default_vat_pct);
    }
  }, [settings]);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.patch('/admin/settings/platform', {
        default_platform_fee_pct: parseFloat(feePct),
        default_vat_pct: parseFloat(vatPct),
        fx_provider: 'live',
      });
      await queryClient.invalidateQueries({ queryKey: queryKeys.platformSettings });
      await refetchFx();
      alertSuccess('Settings saved');
    } catch (err) {
      alertError('Error', err.response?.data?.detail || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="page-loading">Loading settings...</div>;

  return (
    <div className="animate-fade">
      <div className="page-header-refined" style={{ marginBottom: 24 }}>
        <h1>Platform Settings</h1>
        <p>Configure global platform fee and default tax rates applied server-side.</p>
      </div>

      <form onSubmit={handleSave} className="glass" style={{ padding: 28, borderRadius: 16, maxWidth: 520 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
          <Percent size={20} color="var(--primary)" />
          <h3 style={{ margin: 0 }}>Pricing Defaults</h3>
        </div>

        <label style={{ display: 'block', marginBottom: 8, fontWeight: 600 }}>Platform fee (%)</label>
        <input
          type="number"
          min="0"
          max="100"
          step="0.1"
          value={feePct}
          onChange={(e) => setFeePct(e.target.value)}
          style={{ width: '100%', marginBottom: 16, padding: 12, borderRadius: 10, border: '1px solid var(--border)' }}
        />

        <label style={{ display: 'block', marginBottom: 8, fontWeight: 600 }}>Default VAT (%)</label>
        <input
          type="number"
          min="0"
          max="100"
          step="0.1"
          value={vatPct}
          onChange={(e) => setVatPct(e.target.value)}
          style={{ width: '100%', marginBottom: 24, padding: 12, borderRadius: 10, border: '1px solid var(--border)' }}
        />

        <div style={{ marginBottom: 24, padding: 16, borderRadius: 12, background: 'var(--surface-muted, rgba(0,0,0,0.04))' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <h4 style={{ margin: 0 }}>Exchange rates</h4>
            <button type="button" className="btn btn-secondary" onClick={() => refetchFx()} style={{ padding: '6px 10px', fontSize: 13 }}>
              <RefreshCw size={14} /> Refresh
            </button>
          </div>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '0 0 12px' }}>
            Rates are fetched automatically from live public market data (refreshed hourly). No manual setup required.
          </p>
          {fxPreview ? (
            <>
              <p style={{ fontSize: 13, margin: '0 0 8px' }}>
                <strong>{fxPreview.pairs_loaded}</strong> currency pairs loaded
              </p>
              {fxPreview.sample_rates && Object.keys(fxPreview.sample_rates).length > 0 && (
                <div style={{ fontFamily: 'monospace', fontSize: 12, lineHeight: 1.6 }}>
                  {Object.entries(fxPreview.sample_rates).map(([pair, rate]) => (
                    <div key={pair}>{pair}: {Number(rate).toLocaleString(undefined, { maximumFractionDigits: 4 })}</div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Could not load live rates preview.</p>
          )}
        </div>

        <button type="submit" className="btn btn-primary" disabled={saving}>
          <Save size={16} /> {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </form>
    </div>
  );
};

export default PlatformSettings;

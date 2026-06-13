import React, { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '../context/AdminAuthContext';
import { Plus, Tag, Trash2 } from 'lucide-react';
import { alertSuccess, alertError, confirmDelete } from '../utils/swal';
import { usePromotions, useCoupons } from '../hooks/queries';
import { queryKeys } from '../lib/queryKeys';

const defaultExpiry = () => {
  const d = new Date();
  d.setMonth(d.getMonth() + 6);
  return d.toISOString().slice(0, 16);
};

const Promotions = () => {
  const queryClient = useQueryClient();
  const { data: promotions = [] } = usePromotions();
  const { data: coupons = [] } = useCoupons();
  const [promoForm, setPromoForm] = useState({
    name: '', promotion_type: 'PERCENTAGE', discount_value: 10, stacking: 'EXCLUSIVE',
    start_date: '', end_date: '', usage_limit: '', per_user_limit: '', product_sku: '', rules_json: [],
  });
  const [couponForm, setCouponForm] = useState({
    code: '', discount_type: 'PERCENTAGE', value: 10, expires_at: defaultExpiry(),
    usage_limit: '', per_user_limit: '', stacking: 'STACKABLE', product_sku: '',
  });

  const refreshPromotions = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.promotions });
    queryClient.invalidateQueries({ queryKey: queryKeys.coupons });
  };

  const createPromotion = async (e) => {
    e.preventDefault();
    try {
      await api.post('/admin/promotions/promotions', {
        ...promoForm,
        discount_value: Number(promoForm.discount_value),
        usage_limit: promoForm.usage_limit ? Number(promoForm.usage_limit) : null,
        per_user_limit: promoForm.per_user_limit ? Number(promoForm.per_user_limit) : null,
        start_date: promoForm.start_date ? new Date(promoForm.start_date).toISOString() : null,
        end_date: promoForm.end_date ? new Date(promoForm.end_date).toISOString() : null,
        product_sku: promoForm.product_sku || null,
      });
      await refreshPromotions();
      alertSuccess('Promotion created');
    } catch (err) {
      alertError('Error', err.response?.data?.detail || 'Failed to create promotion');
    }
  };

  const createCoupon = async (e) => {
    e.preventDefault();
    try {
      await api.post('/admin/promotions/coupons', {
        ...couponForm,
        code: couponForm.code.toUpperCase(),
        value: Number(couponForm.value),
        expires_at: new Date(couponForm.expires_at).toISOString(),
        usage_limit: couponForm.usage_limit ? Number(couponForm.usage_limit) : null,
        per_user_limit: couponForm.per_user_limit ? Number(couponForm.per_user_limit) : null,
        product_sku: couponForm.product_sku || null,
      });
      await refreshPromotions();
      alertSuccess('Coupon created');
    } catch (err) {
      alertError('Error', err.response?.data?.detail || 'Failed to create coupon');
    }
  };

  const deactivatePromotion = async (id) => {
    if (!(await confirmDelete({ title: 'Deactivate promotion?' }))) return;
    try {
      await api.delete(`/admin/promotions/promotions/${id}`);
      await refreshPromotions();
      alertSuccess('Promotion deactivated');
    } catch (err) {
      alertError('Error', err.response?.data?.detail || 'Failed');
    }
  };

  const deleteCoupon = async (code) => {
    if (!(await confirmDelete({ title: `Delete coupon ${code}?` }))) return;
    try {
      await api.delete(`/admin/promotions/coupons/${code}`);
      await refreshPromotions();
      alertSuccess('Coupon deleted');
    } catch (err) {
      alertError('Error', err.response?.data?.detail || 'Failed');
    }
  };

  return (
    <div className="animate-fade">
      <div className="page-header-refined" style={{ marginBottom: 24 }}>
        <h1>Promotions & Coupons</h1>
        <p>Platform-wide campaigns, referral promos, and coupon codes with usage limits.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        <form onSubmit={createPromotion} className="glass" style={{ padding: 24, borderRadius: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <h3><Tag size={18} /> New Promotion</h3>
          <input placeholder="Name" value={promoForm.name} onChange={(e) => setPromoForm({ ...promoForm, name: e.target.value })} required style={{ width: '100%', padding: 10 }} />
          <select value={promoForm.promotion_type} onChange={(e) => setPromoForm({ ...promoForm, promotion_type: e.target.value })} style={{ width: '100%', padding: 10 }}>
            <option value="PERCENTAGE">Percentage</option>
            <option value="FIXED_AMOUNT">Fixed Amount</option>
            <option value="FLASH_SALE">Flash Sale</option>
            <option value="MERCHANT">Merchant Promo</option>
            <option value="REFERRAL">Referral</option>
            <option value="BULK_B2B">Bulk B2B</option>
            <option value="BUY_X_GET_Y">Buy X Get Y</option>
            <option value="FREE_SHIPPING">Free Shipping</option>
          </select>
          <input type="number" placeholder="Discount value" value={promoForm.discount_value} onChange={(e) => setPromoForm({ ...promoForm, discount_value: e.target.value })} style={{ width: '100%', padding: 10 }} />
          <select value={promoForm.stacking} onChange={(e) => setPromoForm({ ...promoForm, stacking: e.target.value })} style={{ width: '100%', padding: 10 }}>
            <option value="STACKABLE">Stackable</option>
            <option value="EXCLUSIVE">Exclusive</option>
          </select>
          <input placeholder="Product SKU (optional)" value={promoForm.product_sku} onChange={(e) => setPromoForm({ ...promoForm, product_sku: e.target.value })} style={{ width: '100%', padding: 10 }} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <input type="datetime-local" value={promoForm.start_date} onChange={(e) => setPromoForm({ ...promoForm, start_date: e.target.value })} />
            <input type="datetime-local" value={promoForm.end_date} onChange={(e) => setPromoForm({ ...promoForm, end_date: e.target.value })} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <input type="number" placeholder="Total usage limit" value={promoForm.usage_limit} onChange={(e) => setPromoForm({ ...promoForm, usage_limit: e.target.value })} />
            <input type="number" placeholder="Per-user limit" value={promoForm.per_user_limit} onChange={(e) => setPromoForm({ ...promoForm, per_user_limit: e.target.value })} />
          </div>
          <button type="submit" className="btn btn-primary"><Plus size={16} /> Create Promotion</button>
        </form>

        <form onSubmit={createCoupon} className="glass" style={{ padding: 24, borderRadius: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <h3><Tag size={18} /> New Coupon</h3>
          <input placeholder="Code" value={couponForm.code} onChange={(e) => setCouponForm({ ...couponForm, code: e.target.value.toUpperCase() })} required style={{ width: '100%', padding: 10 }} />
          <select value={couponForm.discount_type} onChange={(e) => setCouponForm({ ...couponForm, discount_type: e.target.value })} style={{ width: '100%', padding: 10 }}>
            <option value="PERCENTAGE">Percentage</option>
            <option value="FIXED">Fixed</option>
          </select>
          <input type="number" placeholder="Value" value={couponForm.value} onChange={(e) => setCouponForm({ ...couponForm, value: e.target.value })} style={{ width: '100%', padding: 10 }} />
          <input type="datetime-local" value={couponForm.expires_at} onChange={(e) => setCouponForm({ ...couponForm, expires_at: e.target.value })} style={{ width: '100%', padding: 10 }} />
          <input placeholder="Product SKU (optional)" value={couponForm.product_sku} onChange={(e) => setCouponForm({ ...couponForm, product_sku: e.target.value })} style={{ width: '100%', padding: 10 }} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <input type="number" placeholder="Usage limit" value={couponForm.usage_limit} onChange={(e) => setCouponForm({ ...couponForm, usage_limit: e.target.value })} />
            <input type="number" placeholder="Per-user limit" value={couponForm.per_user_limit} onChange={(e) => setCouponForm({ ...couponForm, per_user_limit: e.target.value })} />
          </div>
          <select value={couponForm.stacking} onChange={(e) => setCouponForm({ ...couponForm, stacking: e.target.value })} style={{ width: '100%', padding: 10 }}>
            <option value="STACKABLE">Stackable</option>
            <option value="EXCLUSIVE">Exclusive</option>
          </select>
          <button type="submit" className="btn btn-primary"><Plus size={16} /> Create Coupon</button>
        </form>
      </div>

      <div className="glass" style={{ marginTop: 24, padding: 24, borderRadius: 16 }}>
        <h3>Promotions ({promotions.length})</h3>
        <ul>{promotions.map((p) => (
          <li key={p.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0' }}>
            <span>{p.name} — {p.discount_value} ({p.stacking}) {p.is_active === false ? '[inactive]' : ''}</span>
            {p.is_active !== false && (
              <button type="button" className="btn btn-ghost" onClick={() => deactivatePromotion(p.id)}><Trash2 size={14} /></button>
            )}
          </li>
        ))}</ul>
        <h3 style={{ marginTop: 16 }}>Coupons ({coupons.length})</h3>
        <ul>{coupons.map((c) => (
          <li key={c.code} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0' }}>
            <span>{c.code} — {c.value} ({c.discount_type}) used {c.used_count}{c.usage_limit ? `/${c.usage_limit}` : ''}</span>
            <button type="button" className="btn btn-ghost" onClick={() => deleteCoupon(c.code)}><Trash2 size={14} /></button>
          </li>
        ))}</ul>
      </div>
    </div>
  );
};

export default Promotions;

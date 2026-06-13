import React, { useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  Tag,
  Plus,
  Trash2,
  Percent,
  Zap,
  Ticket,
  Search,
  X,
  Calendar,
  Layers,
  Sparkles,
  Package,
  Gift,
} from 'lucide-react';
import { api } from '../context/AdminAuthContext';
import { alertSuccess, alertError, confirmDelete } from '../utils/swal';
import { usePromotions, useCoupons, useAdminProducts } from '../hooks/queries';
import { queryKeys } from '../lib/queryKeys';
import './Promotions.css';

const PROMO_TYPES = [
  { value: 'PERCENTAGE', label: 'Percentage off', icon: Percent },
  { value: 'FIXED_AMOUNT', label: 'Fixed amount off', icon: Tag },
  { value: 'FLASH_SALE', label: 'Flash sale', icon: Zap },
  { value: 'MERCHANT', label: 'Merchant promo', icon: Sparkles },
  { value: 'REFERRAL', label: 'Referral', icon: Gift },
  { value: 'BULK_B2B', label: 'Bulk / B2B', icon: Layers },
  { value: 'BUY_X_GET_Y', label: 'Buy X Get Y', icon: Package },
  { value: 'FREE_SHIPPING', label: 'Free shipping', icon: Ticket },
];

const EMPTY_PROMO = {
  name: '',
  promotion_type: 'PERCENTAGE',
  discount_value: 10,
  stacking: 'EXCLUSIVE',
  product_sku: '',
  start_date: '',
  end_date: '',
  usage_limit: '',
  per_user_limit: '',
};

const defaultExpiry = () => {
  const d = new Date();
  d.setMonth(d.getMonth() + 6);
  return d.toISOString().slice(0, 16);
};

const EMPTY_COUPON = {
  code: '',
  discount_type: 'PERCENTAGE',
  value: 10,
  expires_at: defaultExpiry(),
  usage_limit: '',
  per_user_limit: '',
  stacking: 'STACKABLE',
  product_sku: '',
};

const formatDate = (value) => {
  if (!value) return null;
  return new Date(value).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

const promoTypeLabel = (type) =>
  PROMO_TYPES.find((t) => t.value === type)?.label || type?.replace(/_/g, ' ');

const Promotions = () => {
  const queryClient = useQueryClient();
  const { data: promotions = [], isLoading: promosLoading } = usePromotions();
  const { data: coupons = [], isLoading: couponsLoading } = useCoupons();
  const { data: products = [] } = useAdminProducts();

  const [activeTab, setActiveTab] = useState('promotions');
  const [searchTerm, setSearchTerm] = useState('');
  const [showPromoModal, setShowPromoModal] = useState(false);
  const [showCouponModal, setShowCouponModal] = useState(false);
  const [promoForm, setPromoForm] = useState(EMPTY_PROMO);
  const [couponForm, setCouponForm] = useState(EMPTY_COUPON);
  const [saving, setSaving] = useState(false);

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.promotions });
    queryClient.invalidateQueries({ queryKey: queryKeys.coupons });
  };

  const activePromos = promotions.filter((p) => p.is_active !== false);
  const inactivePromos = promotions.filter((p) => p.is_active === false);
  const totalRedemptions = coupons.reduce((sum, c) => sum + (c.used_count || 0), 0);

  const productName = (sku) => products.find((p) => p.sku === sku)?.name || sku;

  const filteredPromos = useMemo(
    () =>
      promotions.filter(
        (p) =>
          p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          p.promotion_type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (p.product_sku && p.product_sku.toLowerCase().includes(searchTerm.toLowerCase()))
      ),
    [promotions, searchTerm]
  );

  const filteredCoupons = useMemo(
    () =>
      coupons.filter(
        (c) =>
          c.code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (c.product_sku && c.product_sku.toLowerCase().includes(searchTerm.toLowerCase()))
      ),
    [coupons, searchTerm]
  );

  const closePromoModal = () => {
    setShowPromoModal(false);
    setPromoForm(EMPTY_PROMO);
  };

  const closeCouponModal = () => {
    setShowCouponModal(false);
    setCouponForm({ ...EMPTY_COUPON, expires_at: defaultExpiry() });
  };

  const buildPromoPayload = () => ({
    ...promoForm,
    discount_value: Number(promoForm.discount_value),
    usage_limit: promoForm.usage_limit ? Number(promoForm.usage_limit) : null,
    per_user_limit: promoForm.per_user_limit ? Number(promoForm.per_user_limit) : null,
    start_date: promoForm.start_date ? new Date(promoForm.start_date).toISOString() : null,
    end_date: promoForm.end_date ? new Date(promoForm.end_date).toISOString() : null,
    product_sku: promoForm.product_sku || null,
    rules_json: [],
  });

  const buildCouponPayload = () => ({
    ...couponForm,
    code: couponForm.code.toUpperCase(),
    value: Number(couponForm.value),
    expires_at: new Date(couponForm.expires_at).toISOString(),
    usage_limit: couponForm.usage_limit ? Number(couponForm.usage_limit) : null,
    per_user_limit: couponForm.per_user_limit ? Number(couponForm.per_user_limit) : null,
    product_sku: couponForm.product_sku || null,
  });

  const createPromotion = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/admin/promotions/promotions', buildPromoPayload());
      refresh();
      closePromoModal();
      alertSuccess('Promotion created', 'Platform campaign is now live.');
    } catch (err) {
      alertError('Error', err.response?.data?.detail || 'Failed to create promotion');
    } finally {
      setSaving(false);
    }
  };

  const createCoupon = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/admin/promotions/coupons', buildCouponPayload());
      refresh();
      closeCouponModal();
      alertSuccess('Coupon created', 'The code is ready to share.');
    } catch (err) {
      alertError('Error', err.response?.data?.detail || 'Failed to create coupon');
    } finally {
      setSaving(false);
    }
  };

  const deactivatePromotion = async (id, name) => {
    const result = await confirmDelete({
      title: 'Deactivate promotion?',
      text: `"${name}" will stop applying at checkout.`,
      confirmButtonText: 'Deactivate',
    });
    if (!result.isConfirmed) return;
    try {
      await api.delete(`/admin/promotions/promotions/${id}`);
      refresh();
      alertSuccess('Promotion deactivated');
    } catch (err) {
      alertError('Error', err.response?.data?.detail || 'Failed to deactivate');
    }
  };

  const deleteCoupon = async (code) => {
    const result = await confirmDelete({
      title: `Delete coupon ${code}?`,
      text: 'This code will stop working immediately.',
    });
    if (!result.isConfirmed) return;
    try {
      await api.delete(`/admin/promotions/coupons/${code}`);
      refresh();
      alertSuccess('Coupon deleted');
    } catch (err) {
      alertError('Error', err.response?.data?.detail || 'Failed to delete');
    }
  };

  const isLoading = promosLoading || couponsLoading;

  return (
    <div className="promotions-container animate-fade">
      <div className="page-header-refined">
        <div className="title-group">
          <h1>Promotions & Coupons</h1>
          <p>Platform-wide campaigns, referral promos, and coupon codes.</p>
        </div>
        <div className="header-actions">
          <button type="button" className="btn-promo-secondary" onClick={() => setShowCouponModal(true)}>
            <span className="icon-box outline"><Ticket size={18} /></span>
            New Coupon
          </button>
          <button type="button" className="btn-promo-primary" onClick={() => setShowPromoModal(true)}>
            <span className="icon-box"><Plus size={18} /></span>
            New Promotion
          </button>
        </div>
      </div>

      <div className="promo-stats-row">
        <div className="promo-stat-card glass">
          <div className="stat-icon emerald"><Sparkles size={22} /></div>
          <div>
            <span className="stat-label">Active campaigns</span>
            <strong className="stat-value">{activePromos.length}</strong>
          </div>
        </div>
        <div className="promo-stat-card glass">
          <div className="stat-icon indigo"><Ticket size={22} /></div>
          <div>
            <span className="stat-label">Coupon codes</span>
            <strong className="stat-value">{coupons.length}</strong>
          </div>
        </div>
        <div className="promo-stat-card glass">
          <div className="stat-icon amber"><Zap size={22} /></div>
          <div>
            <span className="stat-label">Total redemptions</span>
            <strong className="stat-value">{totalRedemptions}</strong>
          </div>
        </div>
      </div>

      <div className="promo-tip-banner glass">
        <div className="tip-icon"><Tag size={18} /></div>
        <p>
          Platform campaigns apply across all merchants unless scoped to a product SKU.
          {inactivePromos.length > 0 && ` ${inactivePromos.length} inactive campaign(s) in history.`}
        </p>
      </div>

      <div className="promo-toolbar glass">
        <div className="promo-tabs">
          <button
            type="button"
            className={`promo-tab ${activeTab === 'promotions' ? 'active' : ''}`}
            onClick={() => setActiveTab('promotions')}
          >
            <Sparkles size={16} />
            Promotions
            <span className="tab-count">{promotions.length}</span>
          </button>
          <button
            type="button"
            className={`promo-tab ${activeTab === 'coupons' ? 'active' : ''}`}
            onClick={() => setActiveTab('coupons')}
          >
            <Ticket size={16} />
            Coupons
            <span className="tab-count">{coupons.length}</span>
          </button>
        </div>
        <div className="search-box-refined">
          <Search size={18} className="search-icon" />
          <input
            type="text"
            placeholder={activeTab === 'promotions' ? 'Search campaigns...' : 'Search coupon codes...'}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {isLoading ? (
        <div className="promo-loading glass">Loading promotions...</div>
      ) : activeTab === 'promotions' ? (
        filteredPromos.length === 0 ? (
          <div className="promo-empty glass">
            <div className="empty-icon"><Sparkles size={52} /></div>
            <h2>{searchTerm ? 'No promotions found' : 'No promotions yet'}</h2>
            <p>
              {searchTerm
                ? 'Try a different search term.'
                : 'Create platform-wide discounts and flash sales for the marketplace.'}
            </p>
            {!searchTerm && (
              <button type="button" className="btn-promo-primary" onClick={() => setShowPromoModal(true)}>
                <Plus size={18} /> Create promotion
              </button>
            )}
          </div>
        ) : (
          <div className="promo-cards-grid">
            {filteredPromos.map((p) => {
              const TypeIcon = PROMO_TYPES.find((t) => t.value === p.promotion_type)?.icon || Tag;
              const inactive = p.is_active === false;
              return (
                <article key={p.id} className="promo-campaign-card glass">
                  <div className="card-top">
                    <div className={`promo-type-icon ${p.promotion_type?.toLowerCase()}`}>
                      <TypeIcon size={20} />
                    </div>
                    {!inactive && (
                      <button
                        type="button"
                        className="action-circle danger"
                        onClick={() => deactivatePromotion(p.id, p.name)}
                        title="Deactivate"
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>
                  <div className="card-body">
                    <h3>{p.name}</h3>
                    <p className="promo-discount-line">
                      <strong>{p.discount_value}{p.promotion_type === 'FIXED_AMOUNT' ? ' UGX' : '%'}</strong>
                      {' '}off · {promoTypeLabel(p.promotion_type)}
                    </p>
                  </div>
                  <div className="card-meta">
                    {inactive ? (
                      <span className="badge-inactive">Inactive</span>
                    ) : (
                      <span className={`stack-badge ${p.stacking?.toLowerCase()}`}>{p.stacking}</span>
                    )}
                    {p.product_sku ? (
                      <span className="scope-badge">Product: {productName(p.product_sku)}</span>
                    ) : (
                      <span className="scope-badge store">Platform-wide</span>
                    )}
                  </div>
                  {(p.start_date || p.end_date) && (
                    <div className="card-dates">
                      <Calendar size={14} />
                      <span>{formatDate(p.start_date) || 'Now'} — {formatDate(p.end_date) || 'No end'}</span>
                    </div>
                  )}
                  {(p.usage_limit || p.per_user_limit) && (
                    <div className="card-limits">
                      {p.usage_limit && <span>Max {p.usage_limit} uses</span>}
                      {p.per_user_limit && <span>{p.per_user_limit} per user</span>}
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )
      ) : filteredCoupons.length === 0 ? (
        <div className="promo-empty glass">
          <div className="empty-icon"><Ticket size={52} /></div>
          <h2>{searchTerm ? 'No coupons found' : 'No coupon codes yet'}</h2>
          <p>
            {searchTerm
              ? 'Try a different search term.'
              : 'Create shareable codes for platform-wide or product-specific discounts.'}
          </p>
          {!searchTerm && (
            <button type="button" className="btn-promo-primary" onClick={() => setShowCouponModal(true)}>
              <Plus size={18} /> Create coupon
            </button>
          )}
        </div>
      ) : (
        <div className="promo-cards-grid">
          {filteredCoupons.map((c) => (
            <article key={c.code} className="promo-coupon-card glass">
              <div className="card-top">
                <div className="coupon-code-display">{c.code}</div>
                <button
                  type="button"
                  className="action-circle danger"
                  onClick={() => deleteCoupon(c.code)}
                  title="Delete"
                >
                  <Trash2 size={15} />
                </button>
              </div>
              <div className="card-body">
                <p className="coupon-value-line">
                  <strong>
                    {c.discount_type === 'PERCENTAGE' ? `${c.value}%` : `UGX ${Number(c.value).toLocaleString()}`}
                  </strong>
                  {' '}discount
                </p>
                <p className="coupon-usage-line">
                  Used <strong>{c.used_count || 0}</strong>
                  {c.usage_limit ? ` of ${c.usage_limit}` : ''} times
                </p>
              </div>
              <div className="card-meta">
                <span className={`stack-badge ${c.stacking?.toLowerCase()}`}>{c.stacking}</span>
                {c.product_sku ? (
                  <span className="scope-badge">Product: {productName(c.product_sku)}</span>
                ) : (
                  <span className="scope-badge store">Any product</span>
                )}
              </div>
              <div className="card-dates">
                <Calendar size={14} />
                <span>Expires {formatDate(c.expires_at)}</span>
              </div>
              {c.per_user_limit && (
                <div className="card-limits"><span>{c.per_user_limit} per user</span></div>
              )}
            </article>
          ))}
        </div>
      )}

      {showPromoModal && (
        <div className="promo-modal-overlay" onClick={closePromoModal} role="presentation">
          <form className="promo-modal glass" onSubmit={createPromotion} onClick={(e) => e.stopPropagation()}>
            <div className="promo-modal-header">
              <div>
                <h3>New platform promotion</h3>
                <p>Automatic discount applied at checkout</p>
              </div>
              <button type="button" className="action-dot" onClick={closePromoModal} aria-label="Close">
                <X size={18} />
              </button>
            </div>
            <div className="promo-form-grid">
              <div className="form-field form-field-wide">
                <label htmlFor="promo-name">Campaign name</label>
                <input id="promo-name" value={promoForm.name} onChange={(e) => setPromoForm({ ...promoForm, name: e.target.value })} placeholder="e.g. Launch Week Sale" required autoFocus />
              </div>
              <div className="form-field">
                <label htmlFor="promo-type">Type</label>
                <select id="promo-type" value={promoForm.promotion_type} onChange={(e) => setPromoForm({ ...promoForm, promotion_type: e.target.value })}>
                  {PROMO_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div className="form-field">
                <label htmlFor="promo-discount">Discount value</label>
                <input id="promo-discount" type="number" min="0" value={promoForm.discount_value} onChange={(e) => setPromoForm({ ...promoForm, discount_value: e.target.value })} required />
              </div>
              <div className="form-field">
                <label htmlFor="promo-stacking">Stacking</label>
                <select id="promo-stacking" value={promoForm.stacking} onChange={(e) => setPromoForm({ ...promoForm, stacking: e.target.value })}>
                  <option value="STACKABLE">Stackable</option>
                  <option value="EXCLUSIVE">Exclusive</option>
                </select>
              </div>
              <div className="form-field form-field-wide">
                <label htmlFor="promo-product">Product scope</label>
                <select id="promo-product" value={promoForm.product_sku} onChange={(e) => setPromoForm({ ...promoForm, product_sku: e.target.value })}>
                  <option value="">All products (platform-wide)</option>
                  {products.map((p) => <option key={p.sku} value={p.sku}>{p.name}</option>)}
                </select>
              </div>
              <div className="form-field">
                <label htmlFor="promo-start">Start date</label>
                <input id="promo-start" type="datetime-local" value={promoForm.start_date} onChange={(e) => setPromoForm({ ...promoForm, start_date: e.target.value })} />
              </div>
              <div className="form-field">
                <label htmlFor="promo-end">End date</label>
                <input id="promo-end" type="datetime-local" value={promoForm.end_date} onChange={(e) => setPromoForm({ ...promoForm, end_date: e.target.value })} />
              </div>
              <div className="form-field">
                <label htmlFor="promo-usage">Total usage limit</label>
                <input id="promo-usage" type="number" min="1" placeholder="Unlimited" value={promoForm.usage_limit} onChange={(e) => setPromoForm({ ...promoForm, usage_limit: e.target.value })} />
              </div>
              <div className="form-field">
                <label htmlFor="promo-per-user">Per user limit</label>
                <input id="promo-per-user" type="number" min="1" placeholder="Unlimited" value={promoForm.per_user_limit} onChange={(e) => setPromoForm({ ...promoForm, per_user_limit: e.target.value })} />
              </div>
            </div>
            <div className="promo-form-actions">
              <button type="button" className="btn-promo-secondary flat" onClick={closePromoModal}>Cancel</button>
              <button type="submit" className="btn-promo-primary" disabled={saving}>{saving ? 'Creating...' : 'Create promotion'}</button>
            </div>
          </form>
        </div>
      )}

      {showCouponModal && (
        <div className="promo-modal-overlay" onClick={closeCouponModal} role="presentation">
          <form className="promo-modal glass" onSubmit={createCoupon} onClick={(e) => e.stopPropagation()}>
            <div className="promo-modal-header">
              <div>
                <h3>New coupon code</h3>
                <p>Shareable code customers enter at checkout</p>
              </div>
              <button type="button" className="action-dot" onClick={closeCouponModal} aria-label="Close">
                <X size={18} />
              </button>
            </div>
            <div className="promo-form-grid">
              <div className="form-field form-field-wide">
                <label htmlFor="coupon-code">Coupon code</label>
                <input id="coupon-code" className="code-input" value={couponForm.code} onChange={(e) => setCouponForm({ ...couponForm, code: e.target.value.toUpperCase() })} placeholder="e.g. LAUNCH20" required autoFocus />
              </div>
              <div className="form-field">
                <label htmlFor="coupon-type">Discount type</label>
                <select id="coupon-type" value={couponForm.discount_type} onChange={(e) => setCouponForm({ ...couponForm, discount_type: e.target.value })}>
                  <option value="PERCENTAGE">Percentage</option>
                  <option value="FIXED">Fixed amount</option>
                </select>
              </div>
              <div className="form-field">
                <label htmlFor="coupon-value">Value</label>
                <input id="coupon-value" type="number" min="0" value={couponForm.value} onChange={(e) => setCouponForm({ ...couponForm, value: e.target.value })} required />
              </div>
              <div className="form-field">
                <label htmlFor="coupon-expires">Expires</label>
                <input id="coupon-expires" type="datetime-local" value={couponForm.expires_at} onChange={(e) => setCouponForm({ ...couponForm, expires_at: e.target.value })} required />
              </div>
              <div className="form-field form-field-wide">
                <label htmlFor="coupon-product">Product scope</label>
                <select id="coupon-product" value={couponForm.product_sku} onChange={(e) => setCouponForm({ ...couponForm, product_sku: e.target.value })}>
                  <option value="">Any product</option>
                  {products.map((p) => <option key={p.sku} value={p.sku}>{p.name}</option>)}
                </select>
              </div>
              <div className="form-field">
                <label htmlFor="coupon-usage">Usage limit</label>
                <input id="coupon-usage" type="number" min="1" placeholder="Unlimited" value={couponForm.usage_limit} onChange={(e) => setCouponForm({ ...couponForm, usage_limit: e.target.value })} />
              </div>
              <div className="form-field">
                <label htmlFor="coupon-per-user">Per user limit</label>
                <input id="coupon-per-user" type="number" min="1" placeholder="Unlimited" value={couponForm.per_user_limit} onChange={(e) => setCouponForm({ ...couponForm, per_user_limit: e.target.value })} />
              </div>
              <div className="form-field">
                <label htmlFor="coupon-stacking">Stacking</label>
                <select id="coupon-stacking" value={couponForm.stacking} onChange={(e) => setCouponForm({ ...couponForm, stacking: e.target.value })}>
                  <option value="STACKABLE">Stackable</option>
                  <option value="EXCLUSIVE">Exclusive</option>
                </select>
              </div>
            </div>
            <div className="promo-form-actions">
              <button type="button" className="btn-promo-secondary flat" onClick={closeCouponModal}>Cancel</button>
              <button type="submit" className="btn-promo-primary" disabled={saving}>{saving ? 'Creating...' : 'Create coupon'}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default Promotions;

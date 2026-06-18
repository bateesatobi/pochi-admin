import React, { useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, Edit3, Search, X, Layers, Grid, Tag, Store, ShoppingBag } from 'lucide-react';
import { alertSuccess, alertError, alertWarning, confirmDelete } from '../utils/swal';
import { api } from '../context/AdminAuthContext';
import { useAdminCategories } from '../hooks/queries';
import { queryKeys } from '../lib/queryKeys';
import './Categories.css';

const CHANNELS = ['RETAIL', 'WHOLESALE'];
const EMPTY_FORM = { name: '', description: '', channel: 'RETAIL' };

const formChannel = (channel) =>
  channel === 'WHOLESALE' ? 'WHOLESALE' : 'RETAIL';

const isPlatformCategory = (cat) => cat.business_id == null;

const channelLabel = (channel) => {
  if (channel === 'RETAIL') return 'Retail';
  if (channel === 'WHOLESALE') return 'Wholesale';
  return 'Retail & Wholesale';
};

const Categories = () => {
  const queryClient = useQueryClient();
  const { data: categories = [], isLoading, isError, error, refetch } = useAdminCategories();
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);

  const refreshCategories = () =>
    queryClient.invalidateQueries({ queryKey: queryKeys.categories });

  const resetModal = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setShowModal(false);
  };

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setShowModal(true);
  };

  const openEdit = (cat) => {
    setForm({
      name: cat.name,
      description: cat.description || '',
      channel: formChannel(cat.channel),
    });
    setEditingId(cat.id);
    setShowModal(true);
  };

  const filteredCategories = useMemo(
    () =>
      categories.filter(
        (c) =>
          c.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (c.description && c.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
          (c.channel && c.channel.toLowerCase().includes(searchTerm.toLowerCase()))
      ),
    [categories, searchTerm]
  );

  const platformCount = categories.filter(isPlatformCategory).length;
  const merchantCount = categories.length - platformCount;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      alertWarning('Name required', 'Enter a category name.');
      return;
    }

    setSaving(true);
    try {
      if (editingId) {
        await api.patch(`/admin/categories/${editingId}`, form);
      } else {
        await api.post('/admin/categories/', form);
      }
      await refreshCategories();
      resetModal();
      alertSuccess(editingId ? 'Category updated' : 'Category created');
    } catch (err) {
      alertError('Error', err.response?.data?.detail || 'Failed to save category');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (cat) => {
    const result = await confirmDelete({
      title: 'Delete category?',
      text: `"${cat.name}" will be removed permanently.`,
    });
    if (!result.isConfirmed) return;

    try {
      await api.delete(`/admin/categories/${cat.id}`);
      await refreshCategories();
      if (editingId === cat.id) resetModal();
      alertSuccess('Category deleted');
    } catch (err) {
      alertError('Error', err.response?.data?.detail || 'Failed to delete category');
    }
  };

  return (
    <div className="categories-container animate-fade">
      <div className="page-header-refined">
        <div className="title-group">
          <h1>Product Categories</h1>
          <p>All platform categories available to merchants across retail and wholesale.</p>
        </div>
        <div className="header-actions">
          <button type="button" className="btn-add-category" onClick={openCreate}>
            <span className="icon-box">
              <Plus size={18} />
            </span>
            Add Category
          </button>
        </div>
      </div>

      <div className="cat-stats-row">
        <div className="cat-stat-card glass">
          <div className="stat-icon indigo"><Layers size={22} /></div>
          <div>
            <span className="stat-label">Total categories</span>
            <strong className="stat-value">{categories.length}</strong>
          </div>
        </div>
        <div className="cat-stat-card glass">
          <div className="stat-icon emerald"><ShoppingBag size={22} /></div>
          <div>
            <span className="stat-label">Platform-wide</span>
            <strong className="stat-value">{platformCount}</strong>
          </div>
        </div>
        <div className="cat-stat-card glass">
          <div className="stat-icon emerald"><Store size={22} /></div>
          <div>
            <span className="stat-label">Merchant-owned</span>
            <strong className="stat-value">{merchantCount}</strong>
          </div>
        </div>
      </div>

      <div className="cat-toolbar glass">
        <div className="search-box-refined">
          <Search size={18} className="search-icon" />
          <input
            type="text"
            placeholder="Search all categories..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <span className="cat-count-label">
          {platformCount} platform · {merchantCount} merchant · showing {filteredCategories.length}
        </span>
      </div>

      {isLoading ? (
        <div className="cat-loading glass">Loading categories...</div>
      ) : isError ? (
        <div className="cat-empty glass">
          <div className="empty-icon"><Layers size={52} /></div>
          <h2>Could not load categories</h2>
          <p>{error?.response?.data?.detail || error?.message || 'Check your connection and try again.'}</p>
          <button type="button" className="btn-add-category" onClick={() => refetch()}>
            Retry
          </button>
        </div>
      ) : filteredCategories.length === 0 ? (
        <div className="cat-empty glass">
          <div className="empty-icon">
            <Layers size={52} />
          </div>
          <h2>{searchTerm ? 'No categories found' : 'No categories yet'}</h2>
          <p>
            {searchTerm
              ? 'Try a different search term.'
              : 'Add platform-wide categories that all merchants can assign to products.'}
          </p>
          {!searchTerm && (
            <button type="button" className="btn-add-category" onClick={openCreate}>
              <Plus size={18} /> Add first category
            </button>
          )}
        </div>
      ) : (
        <div className="categories-grid">
          {filteredCategories.map((cat) => (
            <article key={cat.id} className={`category-card glass${isPlatformCategory(cat) ? ' platform-category' : ''}`}>
              <div className="card-top">
                <div className="cat-icon-box">
                  <Grid size={22} />
                </div>
                <div className="cat-actions-menu">
                  <button type="button" className="action-circle" onClick={() => openEdit(cat)} title="Edit">
                    <Edit3 size={15} />
                  </button>
                  <button
                    type="button"
                    className="action-circle danger"
                    onClick={() => handleDelete(cat)}
                    title="Delete"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
              <div className="card-body">
                <h3>{cat.name}</h3>
                <p>{cat.description || 'No description provided.'}</p>
              </div>
              <div className="card-footer">
                <span className={`channel-badge ${isPlatformCategory(cat) ? 'platform' : 'merchant'} ${cat.channel?.toLowerCase() || 'both'}`}>
                  <Tag size={12} />
                  {isPlatformCategory(cat) ? 'Platform' : 'Merchant'} · {channelLabel(cat.channel || 'BOTH')}
                </span>
              </div>
            </article>
          ))}
        </div>
      )}

      {showModal && (
        <div className="category-modal-overlay" onClick={resetModal} role="presentation">
          <form
            className="category-modal glass"
            onSubmit={handleSubmit}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="category-modal-header">
              <div>
                <h3>{editingId ? 'Edit category' : 'New category'}</h3>
                <p>Platform categories are shared across all merchants.</p>
              </div>
              <button type="button" className="action-dot" onClick={resetModal} aria-label="Close">
                <X size={18} />
              </button>
            </div>

            <div className="category-form-grid">
              <div className="form-field">
                <label htmlFor="cat-name">Name</label>
                <input
                  id="cat-name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Electronics"
                  required
                  autoFocus
                />
              </div>
              <div className="form-field">
                <label htmlFor="cat-channel">Channel</label>
                <select
                  id="cat-channel"
                  value={form.channel}
                  onChange={(e) => setForm({ ...form, channel: e.target.value })}
                >
                  {CHANNELS.map((c) => (
                    <option key={c} value={c}>{channelLabel(c)}</option>
                  ))}
                </select>
              </div>
              <div className="form-field">
                <label htmlFor="cat-desc">Description</label>
                <textarea
                  id="cat-desc"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Optional short description"
                />
              </div>
            </div>

            <div className="category-form-actions">
              <button type="button" className="btn-modal-cancel" onClick={resetModal}>
                Cancel
              </button>
              <button type="submit" className="btn-add-category" disabled={saving}>
                {saving ? 'Saving...' : editingId ? 'Save changes' : 'Create category'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default Categories;

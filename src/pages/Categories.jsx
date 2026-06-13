import React, { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, Edit3 } from 'lucide-react';
import { alertSuccess, alertError, confirmDelete } from '../utils/swal';
import { api } from '../context/AdminAuthContext';
import { useAdminCategories } from '../hooks/queries';
import { queryKeys } from '../lib/queryKeys';

const CHANNELS = ['RETAIL', 'WHOLESALE', 'BOTH'];

const Categories = () => {
  const queryClient = useQueryClient();
  const { data: categories = [] } = useAdminCategories();
  const [form, setForm] = useState({ name: '', description: '', channel: 'BOTH' });
  const [editingId, setEditingId] = useState(null);

  const refreshCategories = () =>
    queryClient.invalidateQueries({ queryKey: queryKeys.categories });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await api.patch(`/admin/categories/${editingId}`, form);
      } else {
        await api.post('/admin/categories/', form);
      }
      setForm({ name: '', description: '', channel: 'BOTH' });
      setEditingId(null);
      await refreshCategories();
      alertSuccess('Category saved');
    } catch (err) {
      alertError('Error', err.response?.data?.detail || 'Failed to save category');
    }
  };

  const handleDelete = async (id) => {
    if (!(await confirmDelete({ title: 'Delete category?', text: 'This category will be removed permanently.' })).isConfirmed) return;
    await api.delete(`/admin/categories/${id}`);
    await refreshCategories();
  };

  return (
    <div className="animate-fade">
      <div className="page-header-refined" style={{ marginBottom: 24 }}>
        <h1>Product Categories</h1>
        <p>Manage global marketplace categories for retail and wholesale channels.</p>
      </div>

      <form onSubmit={handleSubmit} className="card" style={{ marginBottom: 24, padding: 20 }}>
        <h3 style={{ marginBottom: 16 }}>{editingId ? 'Edit Category' : 'Add Category'}</h3>
        <div style={{ display: 'grid', gap: 12, gridTemplateColumns: '1fr 1fr 1fr auto' }}>
          <input placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          <input placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <select value={form.channel} onChange={(e) => setForm({ ...form, channel: e.target.value })}>
            {CHANNELS.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <button type="submit" className="btn btn-primary">{editingId ? 'Update' : 'Add'}</button>
        </div>
      </form>

      <div className="card">
        <table className="data-table">
          <thead><tr><th>Name</th><th>Channel</th><th>Description</th><th>Actions</th></tr></thead>
          <tbody>
            {categories.map((cat) => (
              <tr key={cat.id}>
                <td>{cat.name}</td>
                <td>{cat.channel}</td>
                <td>{cat.description || '—'}</td>
                <td style={{ display: 'flex', gap: 8 }}>
                  <button className="btn btn-ghost btn-sm" onClick={() => { setEditingId(cat.id); setForm({ name: cat.name, description: cat.description || '', channel: cat.channel || 'BOTH' }); }}><Edit3 size={14} /></button>
                  <button className="btn btn-ghost btn-sm" onClick={() => handleDelete(cat.id)}><Trash2 size={14} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Categories;

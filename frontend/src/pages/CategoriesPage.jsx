import { useEffect, useState } from 'react';
import { FolderPlus, Trash2 } from 'lucide-react';
import { apiRequest, getUserErrorMessage } from '../services/api';

export default function CategoriesPage() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ name: '', type: 'EXPENSE' });
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');

  async function loadCategories() {
    try {
      setLoading(true);
      const result = await apiRequest('/categories');
      setCategories(result || []);
      setError('');
    } catch (loadError) {
      setError(getUserErrorMessage(loadError));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCategories();
  }, []);

  async function handleCreate(event) {
    event.preventDefault();
    setSaving(true); setError(''); setSuccess('');
    try {
      await apiRequest(editingId ? `/categories/${editingId}` : '/categories', {
        method: editingId ? 'PUT' : 'POST',
        body: JSON.stringify({
          name: form.name.trim(),
          type: form.type
        })
      });
      setSuccess(editingId ? 'Category updated.' : 'Category created.');
      setForm({ name: '', type: 'EXPENSE' });
      setEditingId(null);
      await loadCategories();
    } catch (submitError) {
      setError(getUserErrorMessage(submitError));
    } finally { setSaving(false); }
  }

  async function handleDelete(id) {
    const confirmed = window.confirm('Delete this category?');
    if (!confirmed) return;

    try {
      await apiRequest(`/categories/${id}`, { method: 'DELETE' });
      await loadCategories();
    } catch (deleteError) {
      setError(getUserErrorMessage(deleteError));
    }
  }

  function handleEdit(category) {
    setEditingId(category.id);
    setForm({ name: category.name, type: category.type });
    setSuccess(''); setError('');
  }

  return (
    <div className="page-stack">
      <section className="panel-card">
        <div className="panel-header">
          <div>
            <p className="eyebrow">CATEGORY MANAGEMENT</p>
            <h3>Organise spending and income</h3>
          </div>
        </div>

        <form className="category-form" onSubmit={handleCreate}>
          <div className="inline-form">
            <input type="text" value={form.name} onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))} placeholder="Category name" required />
            <select value={form.type} onChange={(event) => setForm((prev) => ({ ...prev, type: event.target.value }))}>
              <option value="EXPENSE">Expense</option>
              <option value="INCOME">Income</option>
            </select>
            <button type="submit" className="primary-button" disabled={saving}>
              <FolderPlus size={16} /> {saving ? 'Saving…' : editingId ? 'Save category' : 'Add category'}
            </button>
            {editingId && <button type="button" className="secondary-button small" onClick={() => { setEditingId(null); setForm({ name: '', type: 'EXPENSE' }); }}>Cancel</button>}
          </div>
        </form>
        {success && <div className="success-panel" role="status">{success}</div>}
      </section>

      {error && <div className="error-panel">{error}</div>}

      <section className="panel-card">
        {loading ? (
          <div className="loading-card">Loading categories…</div>
        ) : categories.length === 0 ? (
          <div className="empty-card">
            <FolderPlus size={22} />
            <h4>No categories yet</h4>
            <p>Create your first category to keep transactions organized.</p>
          </div>
        ) : (
          <div className="category-grid">
            {categories.map((category) => (
              <div key={category.id} className="category-tile">
                <div>
                  <span className={`pill ${category.type === 'INCOME' ? 'income' : 'expense'}`}>{category.type}</span>
                  <h4>{category.name}</h4>
                </div>
                <button type="button" className="icon-button" onClick={() => handleEdit(category)} aria-label={`Edit ${category.name}`}><FolderPlus size={16} /></button>
                <button type="button" className="icon-button danger" onClick={() => handleDelete(category.id)}>
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

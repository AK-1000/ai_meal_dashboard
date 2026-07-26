'use client';

import React, { useEffect, useState } from 'react';
import { Ticket, Plus, Trash2, Edit2, ShieldAlert, CheckSquare, Square } from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase-browser';

export default function PromoCodesPage() {
  const [promoCodes, setPromoCodes] = useState<any[]>([]);
  const [sponsors, setSponsors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingCode, setEditingCode] = useState<any | null>(null);

  // Form states
  const [code, setCode] = useState('');
  const [sponsorId, setSponsorId] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [isActive, setIsActive] = useState(true);

  // Selection state for bulk operations
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const codesRes = await fetch('/api/promo-codes', {
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      });
      const codesData = await codesRes.json();
      setPromoCodes(codesData.promoCodes || []);

      const sponsorsRes = await fetch('/api/sponsors', {
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      });
      const sponsorsData = await sponsorsRes.json();
      setSponsors(sponsorsData.sponsors || []);
    } catch (err) {
      console.error(err);
      toast.error('Error fetching data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSavePromoCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code) {
      toast.error('Please fill in required fields.');
      return;
    }

    const payload = {
      code: code.toUpperCase().trim(),
      sponsor_id: sponsorId || null,
      expires_at: expiresAt ? new Date(expiresAt).toISOString() : null,
      status: isActive ? 'active' : 'inactive'
    };

    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      let res;
      if (editingCode) {
        res = await fetch(`/api/promo-codes/${editingCode.id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`
          },
          body: JSON.stringify(payload)
        });
      } else {
        res = await fetch('/api/promo-codes', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`
          },
          body: JSON.stringify(payload)
        });
      }

      if (res.ok) {
        toast.success(editingCode ? 'Referral code updated.' : 'Referral code created.');
        resetForm();
        fetchData();
      } else {
        const err = await res.json();
        toast.error(err.error || 'Failed to save referral code.');
      }
    } catch (err) {
      console.error(err);
      toast.error('Error saving promo code.');
    }
  };

  const handleEditClick = (item: any) => {
    setEditingCode(item);
    setCode(item.code || '');
    setSponsorId(item.sponsor_id || '');
    setExpiresAt(item.expires_at ? new Date(item.expires_at).toISOString().slice(0, 16) : '');
    setIsActive(item.status === 'active' || item.status === true || item.is_active === true);
    setShowAddForm(true);
  };

  const handleToggleActive = async (item: any) => {
    const isCurrentlyActive = item.status === 'active' || item.status === true || item.is_active === true;
    const newStatus = isCurrentlyActive ? 'inactive' : 'active';
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch(`/api/promo-codes/${item.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ status: newStatus })
      });

      if (res.ok) {
        toast.success(`Referral code ${item.code} set to ${newStatus}.`);
        fetchData();
      } else {
        toast.error('Failed to update status.');
      }
    } catch (err) {
      console.error(err);
      toast.error('Error toggling state.');
    }
  };

  const handleDeleteCode = async (id: string) => {
    if (!confirm('Are you sure you want to permanently delete this referral code?')) return;
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch(`/api/promo-codes/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (res.ok) {
        toast.success('Referral code deleted successfully.');
        setSelectedIds(prev => prev.filter(i => i !== id));
        fetchData();
      } else {
        const err = await res.json();
        toast.error(err.error || 'Failed to delete code.');
      }
    } catch (err) {
      console.error(err);
      toast.error('Error deleting code.');
    }
  };

  // Bulk Operations
  const toggleSelectAll = () => {
    if (selectedIds.length === promoCodes.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(promoCodes.map(p => p.id));
    }
  };

  const toggleSelectRow = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleBulkStatusChange = async (targetStatus: 'active' | 'inactive') => {
    if (selectedIds.length === 0) return;
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch('/api/promo-codes/bulk', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ ids: selectedIds, status: targetStatus })
      });

      if (res.ok) {
        toast.success(`Updated ${selectedIds.length} referral code(s) to ${targetStatus}.`);
        setSelectedIds([]);
        fetchData();
      } else {
        const err = await res.json();
        toast.error(err.error || 'Failed to bulk update status.');
      }
    } catch (err) {
      console.error(err);
      toast.error('Error performing bulk action.');
    }
  };

  const resetForm = () => {
    setEditingCode(null);
    setShowAddForm(false);
    setCode('');
    setSponsorId('');
    setExpiresAt('');
    setIsActive(true);
  };

  return (
    <div style={styles.container}>
      <div className="flex-between">
        <div>
          <h1 className="title-large">Referral Codes</h1>
          <p style={styles.subtitle}>Manage referral and discount codes for sponsors — edit, enable/disable, or bulk select</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          {!showAddForm && (
            <button className="btn btn-primary" onClick={() => { resetForm(); setShowAddForm(true); }}>
              <Plus size={16} />
              <span>Create Code</span>
            </button>
          )}
        </div>
      </div>

      {/* Bulk Operations Toolbar */}
      {selectedIds.length > 0 && (
        <div className="card animate-fade-in" style={{ backgroundColor: '#F0FDF4', borderColor: '#BBF7D0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', fontWeight: 600, color: '#166534' }}>
            <span>{selectedIds.length} referral code(s) selected</span>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button className="btn btn-outline" style={{ backgroundColor: 'white' }} onClick={() => handleBulkStatusChange('inactive')}>
              Set Selected to Inactive
            </button>
            <button className="btn btn-primary" onClick={() => handleBulkStatusChange('active')}>
              Set Selected to Active
            </button>
          </div>
        </div>
      )}

      {showAddForm && (
        <div className="card animate-fade-in" style={{ maxWidth: '700px' }}>
          <h3 className="title-medium" style={{ marginBottom: '1.5rem' }}>
            {editingCode ? `Edit Code: ${editingCode.code}` : 'Create Referral Code'}
          </h3>
          <form onSubmit={handleSavePromoCode} style={styles.formGrid}>
            <div className="form-group">
              <label className="form-label" htmlFor="code-name">Discount Code (E.g. DIET50)</label>
              <input
                id="code-name"
                type="text"
                placeholder="PROMO50"
                value={code || ''}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                className="input-field"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="code-sponsor">Sponsor Partner (Optional)</label>
              <select
                id="code-sponsor"
                value={sponsorId || ''}
                onChange={(e) => setSponsorId(e.target.value)}
                className="input-field"
              >
                <option value="">Independent / System Code</option>
                {sponsors.map(s => (
                  <option key={s.id} value={s.id}>{s.name} ({s.code_prefix || 'No prefix'})</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="code-expiry">Expiration Date (leave empty for never expires)</label>
              <input
                id="code-expiry"
                type="datetime-local"
                value={expiresAt || ''}
                onChange={(e) => setExpiresAt(e.target.value)}
                className="input-field"
              />
            </div>

            <div className="form-group flex-center" style={{ flexDirection: 'row', justifyContent: 'flex-start', gap: '0.75rem', marginTop: '1.25rem' }}>
              <input
                type="checkbox"
                id="code-active"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                style={{ width: '18px', height: '18px', cursor: 'pointer' }}
              />
              <label className="form-label" htmlFor="code-active" style={{ cursor: 'pointer' }}>Is Active Code</label>
            </div>

            <div style={{ gridColumn: 'span 2', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
              <button type="button" className="btn btn-outline" onClick={resetForm}>Cancel</button>
              <button type="submit" className="btn btn-primary">{editingCode ? 'Update Code' : 'Save Referral Code'}</button>
            </div>
          </form>
        </div>
      )}

      {/* Listing Table */}
      {loading ? (
        <div style={styles.loadingContainer}>
          <div style={styles.spinner}></div>
          <p>Loading referral codes...</p>
        </div>
      ) : (
        <div className="table-container">
          <table className="admin-table">
            <thead>
              <tr>
                <th style={{ width: '40px' }}>
                  <input
                    type="checkbox"
                    checked={promoCodes.length > 0 && selectedIds.length === promoCodes.length}
                    onChange={toggleSelectAll}
                    style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                  />
                </th>
                <th>Code</th>
                <th>Sponsor</th>
                <th>Discount</th>
                <th>Expiration Date</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {promoCodes.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
                    No referral codes found. Click Create Code to add one.
                  </td>
                </tr>
              ) : (
                promoCodes.map((item) => {
                  const isItemActive = item.status === 'active' || item.status === true || item.is_active === true;
                  const isSelected = selectedIds.includes(item.id);
                  const discountVal = item.sponsors?.discount_percentage;

                  return (
                    <tr key={item.id} style={{ backgroundColor: isSelected ? 'rgba(0, 200, 150, 0.05)' : undefined }}>
                      <td>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectRow(item.id)}
                          style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                        />
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <Ticket size={16} style={{ color: 'var(--primary)' }} />
                          <strong style={{ fontFamily: 'monospace', fontSize: '0.95rem' }}>{item.code}</strong>
                        </div>
                      </td>
                      <td>{item.sponsors?.name || <span style={{ color: 'var(--text-muted)' }}>System / Independent</span>}</td>
                      <td>
                        <strong>{discountVal ? `${discountVal}% OFF` : 'Standard'}</strong>
                      </td>
                      <td>{item.expires_at ? new Date(item.expires_at).toLocaleString() : <span style={{ color: 'var(--text-muted)' }}>Never Expires</span>}</td>
                      <td>
                        <button 
                          style={{ background: 'transparent', border: 'none', padding: 0, cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                          onClick={() => handleToggleActive(item)}
                          title={isItemActive ? 'Deactivate' : 'Activate'}
                        >
                          {isItemActive ? (
                            <span className="badge badge-success">Active</span>
                          ) : (
                            <span className="badge badge-error">Inactive</span>
                          )}
                        </button>
                      </td>
                      <td>
                        <div style={styles.actions}>
                          <button className="btn btn-outline btn-icon" onClick={() => handleEditClick(item)} title="Edit Code">
                            <Edit2 size={14} />
                          </button>
                          <button className="btn btn-outline btn-icon" onClick={() => handleDeleteCode(item.id)} title="Delete Code">
                            <Trash2 size={14} style={{ color: 'var(--error)' }} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem',
  },
  subtitle: {
    fontSize: '0.9rem',
    color: 'var(--text-secondary)',
    marginTop: '0.25rem',
  },
  formGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '1.25rem',
  },
  actions: {
    display: 'flex',
    gap: '0.5rem',
    justifyContent: 'flex-end',
  },
  loadingContainer: {
    padding: '6rem 0',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '1rem',
    color: 'var(--text-secondary)',
  },
  spinner: {
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    border: '3px solid #CBD5E1',
    borderTopColor: 'var(--primary)',
    animation: 'spin 1s linear infinite',
  },
};

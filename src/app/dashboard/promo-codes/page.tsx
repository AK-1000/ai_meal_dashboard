'use client';

import React, { useEffect, useState } from 'react';
import { Ticket, Plus, Trash2, ShieldAlert, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase-browser';

export default function PromoCodesPage() {
  const [promoCodes, setPromoCodes] = useState<any[]>([]);
  const [sponsors, setSponsors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);

  // Form states
  const [code, setCode] = useState('');
  const [sponsorId, setSponsorId] = useState('');
  const [discountPercentage, setDiscountPercentage] = useState(10);
  const [expiresAt, setExpiresAt] = useState('');
  const [isActive, setIsActive] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // Fetch promo codes
      const codesRes = await fetch('/api/promo-codes', {
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      });
      const codesData = await codesRes.json();
      setPromoCodes(codesData.promoCodes || []);

      // Fetch sponsors for dropdown
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
    if (!code || !discountPercentage) {
      toast.error('Please fill in required fields.');
      return;
    }

    const payload = {
      code: code.toUpperCase().trim(),
      sponsor_id: sponsorId || null,
      discount_percentage: Number(discountPercentage),
      expires_at: expiresAt ? new Date(expiresAt).toISOString() : null,
      is_active: isActive
    };

    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch('/api/promo-codes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        toast.success('Promo code created successfully.');
        resetForm();
        fetchData();
      } else {
        const err = await res.json();
        toast.error(err.error || 'Failed to create promo code.');
      }
    } catch (err) {
      console.error(err);
      toast.error('Error saving promo code.');
    }
  };

  const handleToggleActive = async (item: any) => {
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
        body: JSON.stringify({ is_active: !item.is_active })
      });

      if (res.ok) {
        toast.success(`Promo code ${item.code} status updated.`);
        fetchData();
      } else {
        toast.error('Failed to toggle active state.');
      }
    } catch (err) {
      console.error(err);
      toast.error('Error toggling state.');
    }
  };

  const handleDeleteCode = async (id: string) => {
    if (!confirm('Are you sure you want to permanently delete this promo code?')) return;
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
        toast.success('Promo code deleted successfully.');
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

  const handleTriggerDailyGeneration = async () => {
    setGenerating(true);
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch('/api/promo-codes/generate', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (res.ok) {
        const result = await res.json();
        toast.success('Daily promo codes generated successfully!');
        fetchData();
      } else {
        const err = await res.json();
        toast.error(err.error || 'Failed to trigger daily generation.');
      }
    } catch (err) {
      console.error(err);
      toast.error('Error generating daily promo codes.');
    } finally {
      setGenerating(false);
    }
  };

  const resetForm = () => {
    setShowAddForm(false);
    setCode('');
    setSponsorId('');
    setDiscountPercentage(10);
    setExpiresAt('');
    setIsActive(true);
  };

  return (
    <div style={styles.container}>
      <div className="flex-between">
        <div>
          <h1 className="title-large">Promo Codes</h1>
          <p style={styles.subtitle}>Manage discount codes, view referral usage stats and trigger daily seed operations</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button 
            className="btn btn-outline" 
            style={{ borderColor: 'var(--primary)', color: 'var(--primary-dark)', display: 'flex', gap: '6px' }}
            onClick={handleTriggerDailyGeneration}
            disabled={generating}
          >
            <Sparkles size={16} />
            <span>{generating ? 'Generating Codes...' : 'Trigger Daily Codes'}</span>
          </button>
          {!showAddForm && (
            <button className="btn btn-primary" onClick={() => setShowAddForm(true)}>
              <Plus size={16} />
              <span>Create Code</span>
            </button>
          )}
        </div>
      </div>

      {showAddForm && (
        <div className="card animate-fade-in" style={{ maxWidth: '700px' }}>
          <h3 className="title-medium" style={{ marginBottom: '1.5rem' }}>Create Promo Code</h3>
          <form onSubmit={handleSavePromoCode} style={styles.formGrid}>
            <div className="form-group">
              <label className="form-label" htmlFor="code-name">Discount Code (E.g. DIET50)</label>
              <input
                id="code-name"
                type="text"
                placeholder="PROMO50"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                className="input-field"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="code-sponsor">Sponsor Partner (Optional)</label>
              <select
                id="code-sponsor"
                value={sponsorId}
                onChange={(e) => setSponsorId(e.target.value)}
                className="input-field"
              >
                <option value="">Independent / System Code</option>
                {sponsors.map(s => (
                  <option key={s.id} value={s.id}>{s.name} ({s.code_prefix})</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="code-discount">Discount Percentage (%)</label>
              <input
                id="code-discount"
                type="number"
                min={1}
                max={100}
                value={discountPercentage}
                onChange={(e) => setDiscountPercentage(Number(e.target.value))}
                className="input-field"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="code-expiry">Expiration Date</label>
              <input
                id="code-expiry"
                type="datetime-local"
                value={expiresAt}
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
              <label className="form-label" htmlFor="code-active" style={{ cursor: 'pointer' }}>Active on creation</label>
            </div>

            <div style={{ gridColumn: 'span 2', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
              <button type="button" className="btn btn-outline" onClick={resetForm}>Cancel</button>
              <button type="submit" className="btn btn-primary">Save Promo Code</button>
            </div>
          </form>
        </div>
      )}

      {/* Listing Table */}
      {loading ? (
        <div style={styles.loadingContainer}>
          <div style={styles.spinner}></div>
          <p>Loading promo codes...</p>
        </div>
      ) : (
        <div className="table-container">
          <table className="admin-table">
            <thead>
              <tr>
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
                  <td colSpan={6} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
                    No promo codes found. Click Create Code to manually generate one.
                  </td>
                </tr>
              ) : (
                promoCodes.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Ticket size={16} style={{ color: 'var(--primary)' }} />
                        <strong style={{ fontFamily: 'monospace', fontSize: '0.95rem' }}>{item.code}</strong>
                      </div>
                    </td>
                    <td>{item.sponsors?.name || <span style={{ color: 'var(--text-muted)' }}>System / Independent</span>}</td>
                    <td><strong>{item.discount_percentage}% OFF</strong></td>
                    <td>{item.expires_at ? new Date(item.expires_at).toLocaleString() : <span style={{ color: 'var(--text-muted)' }}>Never Expires</span>}</td>
                    <td>
                      <button 
                        style={{ background: 'transparent', padding: 0, cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                        onClick={() => handleToggleActive(item)}
                        title={item.is_active ? 'Deactivate' : 'Activate'}
                      >
                        {item.is_active ? (
                          <span className="badge badge-success">Active</span>
                        ) : (
                          <span className="badge badge-error">Inactive</span>
                        )}
                      </button>
                    </td>
                    <td>
                      <div style={styles.actions}>
                        <button className="btn btn-outline btn-icon" onClick={() => handleDeleteCode(item.id)}>
                          <Trash2 size={14} style={{ color: 'var(--error)' }} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
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

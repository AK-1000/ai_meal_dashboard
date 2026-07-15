'use client';

import React, { useEffect, useState } from 'react';
import { Award, Plus, Trash2, Edit2, Check, X, ShieldAlert } from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase-browser';

export default function SponsorsPage() {
  const [sponsors, setSponsors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingSponsor, setEditingSponsor] = useState<any | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);

  // Form states
  const [name, setName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [discountPercentage, setDiscountPercentage] = useState(10);
  const [commissionPercentage, setCommissionPercentage] = useState(5);
  const [codePrefix, setCodePrefix] = useState('');
  const [isActive, setIsActive] = useState(true);

  const fetchSponsors = async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch('/api/sponsors', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (res.ok) {
        const data = await res.json();
        setSponsors(data.sponsors || []);
      } else {
        toast.error('Failed to load sponsors list.');
      }
    } catch (err) {
      console.error(err);
      toast.error('Error fetching sponsors.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSponsors();
  }, []);

  const handleSaveSponsor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !contactEmail || !codePrefix) {
      toast.error('Please fill in all required fields.');
      return;
    }

    const payload = {
      name,
      contact_email: contactEmail,
      discount_percentage: Number(discountPercentage),
      commission_percentage: Number(commissionPercentage),
      code_prefix: codePrefix.toUpperCase(),
      is_active: isActive
    };

    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      let res;
      if (editingSponsor) {
        res = await fetch(`/api/sponsors/${editingSponsor.id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`
          },
          body: JSON.stringify(payload)
        });
      } else {
        res = await fetch('/api/sponsors', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`
          },
          body: JSON.stringify(payload)
        });
      }

      if (res.ok) {
        toast.success(editingSponsor ? 'Sponsor updated successfully.' : 'Sponsor created successfully.');
        resetForm();
        fetchSponsors();
      } else {
        const err = await res.json();
        toast.error(err.error || 'Failed to save sponsor.');
      }
    } catch (err) {
      console.error(err);
      toast.error('Error saving sponsor.');
    }
  };

  const handleEditClick = (sponsor: any) => {
    setEditingSponsor(sponsor);
    setName(sponsor.name);
    setContactEmail(sponsor.contact_email);
    setDiscountPercentage(sponsor.discount_percentage);
    setCommissionPercentage(sponsor.commission_percentage);
    setCodePrefix(sponsor.code_prefix);
    setIsActive(sponsor.is_active ?? true);
    setShowAddForm(true);
  };

  const handleDeleteSponsor = async (id: string) => {
    if (!confirm('Are you sure you want to permanently delete this sponsor? All associated referral codes may become inactive.')) return;
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch(`/api/sponsors/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (res.ok) {
        toast.success('Sponsor deleted successfully.');
        fetchSponsors();
      } else {
        const err = await res.json();
        toast.error(err.error || 'Failed to delete sponsor.');
      }
    } catch (err) {
      console.error(err);
      toast.error('Error deleting sponsor.');
    }
  };

  const resetForm = () => {
    setEditingSponsor(null);
    setShowAddForm(false);
    setName('');
    setContactEmail('');
    setDiscountPercentage(10);
    setCommissionPercentage(5);
    setCodePrefix('');
    setIsActive(true);
  };

  return (
    <div style={styles.container}>
      <div className="flex-between">
        <div>
          <h1 className="title-large">Sponsor Management</h1>
          <p style={styles.subtitle}>Configure sponsors, referral commissions and promo code presets</p>
        </div>
        {!showAddForm && (
          <button className="btn btn-primary" onClick={() => setShowAddForm(true)}>
            <Plus size={16} />
            <span>Add Sponsor</span>
          </button>
        )}
      </div>

      {showAddForm && (
        <div className="card animate-fade-in" style={{ maxWidth: '700px' }}>
          <h3 className="title-medium" style={{ marginBottom: '1.5rem' }}>
            {editingSponsor ? `Edit Sponsor: ${editingSponsor.name}` : 'Add Sponsor Partner'}
          </h3>
          <form onSubmit={handleSaveSponsor} style={styles.formGrid}>
            <div className="form-group">
              <label className="form-label" htmlFor="sponsor-name">Partner Name</label>
              <input
                id="sponsor-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="input-field"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="sponsor-email">Contact Email</label>
              <input
                id="sponsor-email"
                type="email"
                placeholder="partner@company.com"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                className="input-field"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="code-prefix">Promo Code Prefix (UPPERCASE)</label>
              <input
                id="code-prefix"
                type="text"
                placeholder="E.g. KETO, DIET"
                value={codePrefix}
                onChange={(e) => setCodePrefix(e.target.value.toUpperCase())}
                className="input-field"
                maxLength={8}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="discount-pct">Discount Percentage (%)</label>
              <input
                id="discount-pct"
                type="number"
                min={0}
                max={100}
                value={discountPercentage}
                onChange={(e) => setDiscountPercentage(Number(e.target.value))}
                className="input-field"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="commission-pct">Commission Percentage (%)</label>
              <input
                id="commission-pct"
                type="number"
                min={0}
                max={100}
                value={commissionPercentage}
                onChange={(e) => setCommissionPercentage(Number(e.target.value))}
                className="input-field"
                required
              />
            </div>

            <div className="form-group flex-center" style={{ flexDirection: 'row', justifyContent: 'flex-start', gap: '0.75rem', marginTop: '1.25rem' }}>
              <input
                type="checkbox"
                id="sponsor-active"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                style={{ width: '18px', height: '18px', cursor: 'pointer' }}
              />
              <label className="form-label" htmlFor="sponsor-active" style={{ cursor: 'pointer' }}>Is Active Partner</label>
            </div>

            <div style={{ gridColumn: 'span 2', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
              <button type="button" className="btn btn-outline" onClick={resetForm}>Cancel</button>
              <button type="submit" className="btn btn-primary">Save Partner</button>
            </div>
          </form>
        </div>
      )}

      {/* Listing Table */}
      {loading ? (
        <div style={styles.loadingContainer}>
          <div style={styles.spinner}></div>
          <p>Loading sponsors...</p>
        </div>
      ) : (
        <div className="table-container">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Partner Name</th>
                <th>Contact Email</th>
                <th>Code Prefix</th>
                <th>Discount</th>
                <th>Commission</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {sponsors.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
                    No sponsor partners found. Click Add Sponsor to get started.
                  </td>
                </tr>
              ) : (
                sponsors.map((s) => (
                  <tr key={s.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Award size={18} style={{ color: 'var(--primary-teal)' }} />
                        <strong>{s.name}</strong>
                      </div>
                    </td>
                    <td>{s.contact_email}</td>
                    <td style={{ fontWeight: 700, fontFamily: 'monospace' }}>{s.code_prefix}</td>
                    <td>{s.discount_percentage}%</td>
                    <td>{s.commission_percentage}%</td>
                    <td>
                      {s.is_active ? (
                        <span className="badge badge-success">Active</span>
                      ) : (
                        <span className="badge badge-error">Inactive</span>
                      )}
                    </td>
                    <td>
                      <div style={styles.actions}>
                        <button className="btn btn-outline btn-icon" onClick={() => handleEditClick(s)}>
                          <Edit2 size={14} />
                        </button>
                        <button className="btn btn-outline btn-icon" onClick={() => handleDeleteSponsor(s.id)}>
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
  emptyText: {
    fontSize: '0.875rem',
    color: 'var(--text-secondary)',
    textAlign: 'center',
    padding: '3rem 0',
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

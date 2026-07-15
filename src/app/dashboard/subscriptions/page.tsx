'use client';

import React, { useEffect, useState } from 'react';
import { Award, Plus, Trash2, Edit2, Check, X, ToggleLeft, ToggleRight } from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase-browser';

export default function SubscriptionsPage() {
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingPlan, setEditingPlan] = useState<any | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);

  // Form states
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [priceMonthly, setPriceMonthly] = useState(0);
  const [priceYearly, setPriceYearly] = useState(0);
  const [features, setFeatures] = useState<string>('');
  const [rank, setRank] = useState(1);
  const [active, setActive] = useState(true);
  const [areebaCode, setAreebaCode] = useState('');
  const [appleMonthly, setAppleMonthly] = useState('');
  const [appleYearly, setAppleYearly] = useState('');

  const fetchPlans = async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch('/api/subscriptions/plans', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (res.ok) {
        const data = await res.json();
        setPlans(data.plans || []);
      } else {
        toast.error('Failed to load subscription plans.');
      }
    } catch (err) {
      console.error(err);
      toast.error('Error fetching plans.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlans();
  }, []);

  const handleSavePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;

    const featuresArray = features.split('\n').map(f => f.trim()).filter(Boolean);
    const planPayload = {
      name,
      description,
      price_monthly: Number(priceMonthly),
      price_yearly: Number(priceYearly),
      features: featuresArray,
      rank: Number(rank),
      active,
      areeba_product_code: areebaCode,
      apple_product_id_monthly: appleMonthly,
      apple_product_id_yearly: appleYearly,
      price_monthly_total: Number(priceMonthly),
      price_yearly_total: Number(priceYearly)
    };

    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      let res;
      if (editingPlan) {
        res = await fetch(`/api/subscriptions/${editingPlan.id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`
          },
          body: JSON.stringify(planPayload)
        });
      } else {
        res = await fetch('/api/subscriptions/plans', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`
          },
          body: JSON.stringify(planPayload)
        });
      }

      if (res.ok) {
        toast.success(editingPlan ? 'Plan updated successfully.' : 'Plan created successfully.');
        resetForm();
        fetchPlans();
      } else {
        const err = await res.json();
        toast.error(err.error || 'Failed to save plan.');
      }
    } catch (err) {
      console.error(err);
      toast.error('Error saving plan.');
    }
  };

  const handleEditClick = (plan: any) => {
    setEditingPlan(plan);
    setName(plan.name);
    setDescription(plan.description || '');
    setPriceMonthly(plan.price_monthly || 0);
    setPriceYearly(plan.price_yearly || 0);
    setFeatures(Array.isArray(plan.features) ? plan.features.join('\n') : '');
    setRank(plan.rank || 1);
    setActive(plan.active ?? true);
    setAreebaCode(plan.areeba_product_code || '');
    setAppleMonthly(plan.apple_product_id_monthly || '');
    setAppleYearly(plan.apple_product_id_yearly || '');
    setShowAddForm(true);
  };

  const handleDeletePlan = async (id: string) => {
    if (!confirm('Are you sure you want to permanently delete this subscription plan?')) return;
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch(`/api/subscriptions/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (res.ok) {
        toast.success('Plan deleted successfully.');
        fetchPlans();
      } else {
        const err = await res.json();
        toast.error(err.error || 'Failed to delete plan.');
      }
    } catch (err) {
      console.error(err);
      toast.error('Error deleting plan.');
    }
  };

  const handleToggleActive = async (plan: any) => {
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch(`/api/subscriptions/${plan.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ active: !plan.active })
      });

      if (res.ok) {
        toast.success(`Plan ${plan.name} status updated.`);
        fetchPlans();
      } else {
        toast.error('Failed to toggle active state.');
      }
    } catch (err) {
      console.error(err);
      toast.error('Error toggling plan state.');
    }
  };

  const resetForm = () => {
    setEditingPlan(null);
    setShowAddForm(false);
    setName('');
    setDescription('');
    setPriceMonthly(0);
    setPriceYearly(0);
    setFeatures('');
    setRank(1);
    setActive(true);
    setAreebaCode('');
    setAppleMonthly('');
    setAppleYearly('');
  };

  return (
    <div style={styles.container}>
      <div className="flex-between">
        <div>
          <h1 className="title-large">Subscription Plans</h1>
          <p style={styles.subtitle}>Configure pricing models, Apple IDs and features split</p>
        </div>
        {!showAddForm && (
          <button className="btn btn-primary" onClick={() => setShowAddForm(true)}>
            <Plus size={16} />
            <span>Create Plan</span>
          </button>
        )}
      </div>

      {showAddForm && (
        <div className="card animate-fade-in" style={{ maxWidth: '800px' }}>
          <h3 className="title-medium" style={{ marginBottom: '1.5rem' }}>
            {editingPlan ? `Edit Tier: ${editingPlan.name}` : 'Create Pricing Plan'}
          </h3>
          <form onSubmit={handleSavePlan} style={styles.formGrid}>
            <div className="form-group">
              <label className="form-label" htmlFor="plan-name">Plan Name</label>
              <input
                id="plan-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="input-field"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="plan-rank">Rank (Sort Order)</label>
              <input
                id="plan-rank"
                type="number"
                value={rank}
                onChange={(e) => setRank(Number(e.target.value))}
                className="input-field"
                required
              />
            </div>

            <div className="form-group" style={{ gridColumn: 'span 2' }}>
              <label className="form-label" htmlFor="plan-desc">Description</label>
              <input
                id="plan-desc"
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="input-field"
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="price-monthly">Monthly Price ($)</label>
              <input
                id="price-monthly"
                type="number"
                step="0.01"
                value={priceMonthly}
                onChange={(e) => setPriceMonthly(Number(e.target.value))}
                className="input-field"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="price-yearly">Yearly Price ($)</label>
              <input
                id="price-yearly"
                type="number"
                step="0.01"
                value={priceYearly}
                onChange={(e) => setPriceYearly(Number(e.target.value))}
                className="input-field"
                required
              />
            </div>

            <div className="form-group" style={{ gridColumn: 'span 2' }}>
              <label className="form-label" htmlFor="plan-features">Features (One per line)</label>
              <textarea
                id="plan-features"
                rows={4}
                value={features}
                onChange={(e) => setFeatures(e.target.value)}
                className="input-field"
                style={{ fontFamily: 'sans-serif', resize: 'vertical' }}
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="apple-monthly">Apple Product ID Monthly</label>
              <input
                id="apple-monthly"
                type="text"
                placeholder="com.aimeal.pro.monthly"
                value={appleMonthly}
                onChange={(e) => setAppleMonthly(e.target.value)}
                className="input-field"
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="apple-yearly">Apple Product ID Yearly</label>
              <input
                id="apple-yearly"
                type="text"
                placeholder="com.aimeal.pro.yearly"
                value={appleYearly}
                onChange={(e) => setAppleYearly(e.target.value)}
                className="input-field"
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="areeba-code">Areeba Product Code (Android)</label>
              <input
                id="areeba-code"
                type="text"
                placeholder="PRO_CYCLE"
                value={areebaCode}
                onChange={(e) => setAreebaCode(e.target.value)}
                className="input-field"
              />
            </div>

            <div className="form-group flex-center" style={{ flexDirection: 'row', justifyContent: 'flex-start', gap: '0.75rem', marginTop: '1.25rem' }}>
              <input
                type="checkbox"
                id="plan-active"
                checked={active}
                onChange={(e) => setActive(e.target.checked)}
                style={{ width: '18px', height: '18px', cursor: 'pointer' }}
              />
              <label className="form-label" htmlFor="plan-active" style={{ cursor: 'pointer' }}>Active and Visible to Users</label>
            </div>

            <div style={{ gridColumn: 'span 2', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
              <button type="button" className="btn btn-outline" onClick={resetForm}>Cancel</button>
              <button type="submit" className="btn btn-primary">Save Pricing Tier</button>
            </div>
          </form>
        </div>
      )}

      {/* Plans List Grid */}
      {loading ? (
        <div style={styles.loadingContainer}>
          <div style={styles.spinner}></div>
          <p>Loading plans list...</p>
        </div>
      ) : (
        <div style={styles.plansGrid}>
          {plans.length === 0 ? (
            <p style={styles.emptyText}>No pricing plans created yet.</p>
          ) : (
            plans.map((plan) => (
              <div key={plan.id} className="card" style={{ ...styles.planCard, borderTop: plan.active ? '4px solid var(--primary)' : '4px solid var(--text-muted)' }}>
                <div style={styles.planHeader}>
                  <div>
                    <h3 style={styles.planName}>{plan.name}</h3>
                    <p style={styles.planDesc}>{plan.description || 'No description provided'}</p>
                  </div>
                  <div style={styles.planActions}>
                    <button className="btn btn-outline btn-icon" onClick={() => handleEditClick(plan)}>
                      <Edit2 size={14} />
                    </button>
                    <button className="btn btn-outline btn-icon" onClick={() => handleDeletePlan(plan.id)}>
                      <Trash2 size={14} style={{ color: 'var(--error)' }} />
                    </button>
                  </div>
                </div>

                <div style={styles.pricingRow}>
                  <div style={styles.priceItem}>
                    <span style={styles.priceLabel}>Monthly</span>
                    <span style={styles.priceVal}>${plan.price_monthly}</span>
                  </div>
                  <div style={styles.priceItem}>
                    <span style={styles.priceLabel}>Yearly</span>
                    <span style={styles.priceVal}>${plan.price_yearly}</span>
                  </div>
                </div>

                <div style={styles.statusRow}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Status:</span>
                  <button 
                    style={{ background: 'transparent', padding: 0, cursor: 'pointer', display: 'flex', alignItems: 'center' }} 
                    onClick={() => handleToggleActive(plan)}
                    title={plan.active ? 'Click to deactivate' : 'Click to activate'}
                  >
                    {plan.active ? (
                      <span className="badge badge-success">
                        <span className="badge-dot"></span>
                        Active
                      </span>
                    ) : (
                      <span className="badge badge-error">
                        <span className="badge-dot"></span>
                        Inactive
                      </span>
                    )}
                  </button>
                </div>

                <div style={styles.featuresList}>
                  <span style={styles.featuresTitle}>Features Included:</span>
                  {Array.isArray(plan.features) && plan.features.length > 0 ? (
                    <ul style={styles.ul}>
                      {plan.features.map((f: string, i: number) => (
                        <li key={i} style={styles.li}>
                          <Check size={14} style={{ color: 'var(--primary)', flexShrink: 0 }} />
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>No features defined.</p>
                  )}
                </div>
              </div>
            ))
          )}
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
  plansGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
    gap: '1.5rem',
    marginTop: '1rem',
  },
  planCard: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.25rem',
    minHeight: '380px',
  },
  planHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  planName: {
    fontSize: '1.25rem',
    fontWeight: 700,
    color: 'var(--text-dark)',
  },
  planDesc: {
    fontSize: '0.8rem',
    color: 'var(--text-secondary)',
    marginTop: '0.25rem',
  },
  planActions: {
    display: 'flex',
    gap: '0.5rem',
  },
  pricingRow: {
    display: 'flex',
    gap: '1.5rem',
    padding: '0.75rem',
    backgroundColor: '#F8F9FA',
    borderRadius: 'var(--radius-sm)',
  },
  priceItem: {
    display: 'flex',
    flexDirection: 'column',
    flexGrow: 1,
  },
  priceLabel: {
    fontSize: '0.7rem',
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    fontWeight: 600,
  },
  priceVal: {
    fontSize: '1.25rem',
    fontWeight: 800,
    color: 'var(--text-dark)',
  },
  statusRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottom: '1px solid #F1F5F9',
    paddingBottom: '0.75rem',
  },
  featuresList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
  },
  featuresTitle: {
    fontSize: '0.75rem',
    fontWeight: 700,
    color: 'var(--text-secondary)',
    textTransform: 'uppercase',
  },
  ul: {
    listStyleType: 'none',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.4rem',
  },
  li: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    fontSize: '0.85rem',
    color: 'var(--text-primary)',
  },
  emptyText: {
    fontSize: '0.875rem',
    color: 'var(--text-secondary)',
    textAlign: 'center',
    gridColumn: '1 / -1',
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

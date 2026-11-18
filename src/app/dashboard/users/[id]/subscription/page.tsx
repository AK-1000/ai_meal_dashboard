'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft, 
  CreditCard, 
  Sparkles, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  Calendar, 
  ShieldAlert, 
  RefreshCw, 
  PlusCircle, 
  Check, 
  X,
  History,
  TrendingUp,
  UserCheck
} from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase-browser';

export default function UserSubscriptionPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  // Loaded Data
  const [data, setData] = useState<any>(null);

  // Trial Extension state
  const [extendDays, setExtendDays] = useState(7);
  const [customTrialEndDate, setCustomTrialEndDate] = useState('');

  // Tier Change state
  const [selectedTier, setSelectedTier] = useState<'pro' | 'vip'>('pro');
  const [selectedCycle, setSelectedCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [selectedStatus, setSelectedStatus] = useState<'active' | 'trialing' | 'canceled' | 'expired'>('active');
  const [customPlanEndDate, setCustomPlanEndDate] = useState('');

  useEffect(() => {
    const pathParts = window.location.pathname.split('/');
    // e.g. /dashboard/users/[id]/subscription
    const userIdx = pathParts.indexOf('users');
    if (userIdx !== -1 && pathParts[userIdx + 1]) {
      setUserId(pathParts[userIdx + 1]);
    }
  }, []);

  const fetchSubscriptionData = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch(`/api/users/${userId}/subscription`, {
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      });

      if (res.ok) {
        const result = await res.json();
        setData(result);
        const u = result.user;
        setSelectedTier(u.subscription_tier === 'vip' ? 'vip' : 'pro');
        setSelectedCycle(u.billing_cycle || 'monthly');
        setSelectedStatus(u.subscription_status || 'active');
        if (u.plan_end_date) {
          setCustomPlanEndDate(new Date(u.plan_end_date).toISOString().split('T')[0]);
        }
      } else {
        toast.error('Failed to load user subscription.');
      }
    } catch (err) {
      console.error(err);
      toast.error('Error fetching subscription details.');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (userId) {
      fetchSubscriptionData();
    }
  }, [userId, fetchSubscriptionData]);

  const handleAction = async (payload: any, successMsg: string) => {
    if (!userId) return;
    setUpdating(true);
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch(`/api/users/${userId}/subscription`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify(payload)
      });

      const resData = await res.json();
      if (res.ok && resData.success) {
        toast.success(successMsg);
        fetchSubscriptionData();
      } else {
        toast.error(resData.error || 'Failed to update subscription');
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Error updating subscription');
    } finally {
      setUpdating(false);
    }
  };

  if (loading || !data) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.spinner}></div>
        <p>Loading subscription controls...</p>
      </div>
    );
  }

  const { user, subscriptions } = data;
  const isTrialActive = user.trial_status === 'active' || user.subscription_status === 'trialing';
  
  let trialDaysLeft = null;
  if (user.trial_ends_at) {
    trialDaysLeft = Math.max(0, Math.ceil((new Date(user.trial_ends_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
  }

  return (
    <div style={styles.container}>
      {/* Breadcrumb Header */}
      <div style={styles.header}>
        <div style={styles.breadcrumb}>
          <Link href="/dashboard/users" style={styles.breadcrumbLink}>Users</Link>
          <span style={styles.breadcrumbSeparator}>/</span>
          <Link href={`/dashboard/users/${userId}`} style={styles.breadcrumbLink}>
            {user.name || user.email}
          </Link>
          <span style={styles.breadcrumbSeparator}>/</span>
          <span style={styles.breadcrumbCurrent}>Subscription & Trial</span>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 className="title-large" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <CreditCard className="text-primary" size={26} />
              <span>Manage User Subscription</span>
            </h1>
            <p style={styles.subtitle}>
              Grant Pro trials, extend duration, convert to paid plans, or update billing cycles for {user.email}.
            </p>
          </div>
          <Link href={`/dashboard/users/${userId}`} className="btn btn-outline" style={{ gap: '0.375rem' }}>
            <ArrowLeft size={16} />
            <span>Back to User Profile</span>
          </Link>
        </div>
      </div>

      {/* Current Subscription Status Banner */}
      <div className="card" style={styles.statusBannerCard}>
        <div style={styles.bannerGrid}>
          <div>
            <span style={styles.bannerLabel}>Current Tier</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '4px' }}>
              {user.subscription_tier === 'vip' ? (
                <span className="badge badge-primary" style={{ fontSize: '0.875rem', padding: '4px 10px' }}>VIP</span>
              ) : isTrialActive ? (
                <span className="badge" style={{ backgroundColor: '#FEF3C7', color: '#B45309', border: '1px solid #FDE68A', fontSize: '0.875rem', padding: '4px 10px', fontWeight: 600 }}>
                  PRO TRIAL
                </span>
              ) : user.subscription_status !== 'active' ? (
                <span className="badge" style={{ backgroundColor: '#FEF3C7', color: '#B45309', border: '1px solid #FDE68A', fontSize: '0.875rem', padding: '4px 10px', fontWeight: 600 }}>
                  PRO TRIAL (EXPIRED)
                </span>
              ) : (
                <span className="badge badge-info" style={{ fontSize: '0.875rem', padding: '4px 10px' }}>
                  PRO (PAID)
                </span>
              )}
            </div>
          </div>

          <div>
            <span style={styles.bannerLabel}>Subscription Status</span>
            <div style={{ marginTop: '4px' }}>
              <span className={`badge ${user.subscription_status === 'active' ? 'badge-success' : 'badge-error'}`}>
                {user.subscription_status || 'expired'}
              </span>
            </div>
          </div>

          <div>
            <span style={styles.bannerLabel}>Billing Cycle</span>
            <div style={styles.bannerVal}>
              {user.billing_cycle ? (
                <span style={{ textTransform: 'capitalize' }}>{user.billing_cycle}</span>
              ) : (
                <span style={{ color: '#94A3B8' }}>None (Trial)</span>
              )}
            </div>
          </div>

          <div>
            <span style={styles.bannerLabel}>Plan End / Renewal Date</span>
            <div style={styles.bannerVal}>
              {user.plan_end_date ? (
                <span>{new Date(user.plan_end_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
              ) : (
                <span style={{ color: '#94A3B8' }}>No expiration</span>
              )}
            </div>
          </div>

          <div>
            <span style={styles.bannerLabel}>Device Platform</span>
            <div style={styles.bannerVal}>
              <span style={{ textTransform: 'capitalize' }}>
                {user.device_platform ? user.device_platform.toUpperCase() : 'Web / Admin Granted'}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div style={styles.panelsGrid}>
        {/* Left Column: Pro Trial Operations */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="card" style={styles.card}>
            <div style={styles.cardHeader}>
              <div style={{ ...styles.cardIconBox, backgroundColor: '#FEF3C7' }}>
                <Clock size={18} color="#D97706" />
              </div>
              <div>
                <h2 style={styles.cardTitle}>Pro Trial Management</h2>
                <p style={styles.cardSubtitle}>
                  {isTrialActive ? 'User currently has an active Pro trial' : 'User does not currently have an active trial'}
                </p>
              </div>
            </div>

            {isTrialActive ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                {/* Active Trial Info Box */}
                <div style={styles.activeTrialBox}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Sparkles size={18} color="#D97706" />
                      <span style={{ fontWeight: 700, color: '#B45309', fontSize: '0.9375rem' }}>
                        {trialDaysLeft} Days Remaining in Trial
                      </span>
                    </div>
                    <span className="badge" style={{ backgroundColor: '#FDE68A', color: '#92400E' }}>
                      Expires {new Date(user.trial_ends_at).toLocaleDateString()}
                    </span>
                  </div>
                  <p style={{ fontSize: '0.8125rem', color: '#78350F', marginTop: '0.5rem' }}>
                    Started on {user.trial_started_at ? new Date(user.trial_started_at).toLocaleDateString() : 'N/A'} via provider: <strong>{user.trial_provider || 'admin'}</strong>.
                  </p>
                </div>

                {/* Extend Trial Duration */}
                <div>
                  <label className="form-label">Extend Current Trial</label>
                  <div style={styles.presetGrid}>
                    <button
                      type="button"
                      disabled={updating}
                      onClick={() => handleAction({ action: 'extend_trial', trialDays: 7 }, 'Added 7 days to trial')}
                      className="btn btn-outline"
                      style={{ fontSize: '0.8125rem' }}
                    >
                      + 7 Days
                    </button>
                    <button
                      type="button"
                      disabled={updating}
                      onClick={() => handleAction({ action: 'extend_trial', trialDays: 14 }, 'Added 14 days to trial')}
                      className="btn btn-outline"
                      style={{ fontSize: '0.8125rem' }}
                    >
                      + 14 Days
                    </button>
                    <button
                      type="button"
                      disabled={updating}
                      onClick={() => handleAction({ action: 'extend_trial', trialDays: 30 }, 'Added 30 days to trial')}
                      className="btn btn-outline"
                      style={{ fontSize: '0.8125rem' }}
                    >
                      + 30 Days
                    </button>
                  </div>
                </div>

                {/* Custom Date Extension */}
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Set Specific Trial End Date</label>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <input
                      type="date"
                      className="input-field"
                      value={customTrialEndDate}
                      onChange={(e) => setCustomTrialEndDate(e.target.value)}
                    />
                    <button
                      type="button"
                      disabled={updating || !customTrialEndDate}
                      onClick={() => handleAction({ action: 'extend_trial', trialEndDate: customTrialEndDate }, 'Trial end date updated')}
                      className="btn btn-primary"
                      style={{ whiteSpace: 'nowrap' }}
                    >
                      Apply Date
                    </button>
                  </div>
                </div>

                {/* Convert or Cancel Actions */}
                <div style={{ display: 'flex', gap: '0.75rem', paddingTop: '0.5rem', borderTop: '1px solid #F1F5F9' }}>
                  <button
                    type="button"
                    disabled={updating}
                    onClick={() => handleAction({ action: 'convert_to_paid', tier: 'pro', billingCycle: user.billing_cycle || 'monthly' }, 'User marked as paid subscriber')}
                    className="btn btn-primary flex-center"
                    style={{ flex: 1, gap: '0.375rem', background: '#16A34A' }}
                  >
                    <UserCheck size={16} />
                    <span>Convert to Paid Pro</span>
                  </button>
                  <button
                    type="button"
                    disabled={updating}
                    onClick={() => handleAction({ action: 'cancel' }, 'Trial cancelled')}
                    className="btn btn-outline"
                    style={{ color: '#DC2626', borderColor: '#FCA5A5' }}
                  >
                    End Trial Now
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <p style={{ fontSize: '0.875rem', color: '#64748B', lineHeight: 1.5 }}>
                  This user currently does not have an active Pro trial. You can activate a trial at any time to give them full Pro access.
                </p>

                <div style={styles.presetGrid}>
                  <button
                    type="button"
                    disabled={updating}
                    onClick={() => handleAction({ action: 'grant_trial', trialDays: 7 }, 'Granted 7-day Pro trial')}
                    className="btn btn-outline"
                    style={{ padding: '0.75rem 0.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center' }}
                  >
                    <span style={{ fontWeight: 700, fontSize: '0.9375rem' }}>7 Days</span>
                    <span style={{ fontSize: '0.6875rem', color: '#64748B' }}>Standard</span>
                  </button>
                  <button
                    type="button"
                    disabled={updating}
                    onClick={() => handleAction({ action: 'grant_trial', trialDays: 14 }, 'Granted 14-day Pro trial')}
                    className="btn btn-outline"
                    style={{ padding: '0.75rem 0.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center' }}
                  >
                    <span style={{ fontWeight: 700, fontSize: '0.9375rem' }}>14 Days</span>
                    <span style={{ fontSize: '0.6875rem', color: '#64748B' }}>2 Weeks</span>
                  </button>
                  <button
                    type="button"
                    disabled={updating}
                    onClick={() => handleAction({ action: 'grant_trial', trialDays: 30 }, 'Granted 30-day Pro trial')}
                    className="btn btn-outline"
                    style={{ padding: '0.75rem 0.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center' }}
                  >
                    <span style={{ fontWeight: 700, fontSize: '0.9375rem' }}>30 Days</span>
                    <span style={{ fontSize: '0.6875rem', color: '#64748B' }}>1 Month</span>
                  </button>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Or Custom Trial Duration (Days)</label>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <input
                      type="number"
                      min="1"
                      max="365"
                      className="input-field"
                      placeholder="e.g. 21"
                      value={extendDays}
                      onChange={(e) => setExtendDays(Number(e.target.value))}
                    />
                    <button
                      type="button"
                      disabled={updating}
                      onClick={() => handleAction({ action: 'grant_trial', trialDays: extendDays }, `Granted ${extendDays}-day Pro trial`)}
                      className="btn btn-primary"
                      style={{ whiteSpace: 'nowrap' }}
                    >
                      Activate Pro Trial
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Plan & Tier Modification */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="card" style={styles.card}>
            <div style={styles.cardHeader}>
              <div style={{ ...styles.cardIconBox, backgroundColor: '#E0F2FE' }}>
                <CreditCard size={18} color="#0284C7" />
              </div>
              <div>
                <h2 style={styles.cardTitle}>Change Plan & Tier</h2>
                <p style={styles.cardSubtitle}>Directly update subscription tier and expiration</p>
              </div>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleAction({
                  action: 'change_tier',
                  tier: selectedTier,
                  billingCycle: selectedCycle,
                  status: selectedStatus,
                  planEndDate: customPlanEndDate || null
                }, 'Plan updated successfully');
              }}
              style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}
            >
              <div className="form-group">
                <label className="form-label">Select Tier</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.5rem' }}>
                  {(['pro', 'vip'] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setSelectedTier(t)}
                      style={{
                        ...styles.toggleBtn,
                        ...(selectedTier === t ? styles.toggleBtnActive : {})
                      }}
                    >
                      {t.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Billing Cycle</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                  <button
                    type="button"
                    onClick={() => setSelectedCycle('monthly')}
                    style={{
                      ...styles.toggleBtn,
                      ...(selectedCycle === 'monthly' ? styles.toggleBtnActive : {})
                    }}
                  >
                    Monthly
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedCycle('yearly')}
                    style={{
                      ...styles.toggleBtn,
                      ...(selectedCycle === 'yearly' ? styles.toggleBtnActive : {})
                    }}
                  >
                    Yearly
                  </button>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Subscription Status</label>
                <select
                  className="input-field"
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value as any)}
                >
                  <option value="active">Active</option>
                  <option value="trialing">Trialing</option>
                  <option value="canceled">Canceled</option>
                  <option value="expired">Expired</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Expiration / Renewal Date</label>
                <input
                  type="date"
                  className="input-field"
                  value={customPlanEndDate}
                  onChange={(e) => setCustomPlanEndDate(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                <button
                  type="submit"
                  disabled={updating}
                  className="btn btn-primary"
                  style={{ minWidth: '140px' }}
                >
                  {updating ? 'Saving...' : 'Save Plan Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Subscription Records History */}
      <div className="card" style={styles.card}>
        <div style={styles.cardHeader}>
          <div style={{ ...styles.cardIconBox, backgroundColor: '#F1F5F9' }}>
            <History size={18} color="#475569" />
          </div>
          <div>
            <h2 style={styles.cardTitle}>Subscription Audit History</h2>
            <p style={styles.cardSubtitle}>Historical subscription events and period records</p>
          </div>
        </div>

        {subscriptions.length === 0 ? (
          <p style={{ color: '#94A3B8', fontSize: '0.875rem', padding: '1rem 0' }}>No previous subscription records found.</p>
        ) : (
          <div className="table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Plan</th>
                  <th>Period Start</th>
                  <th>Period End</th>
                  <th>Status</th>
                  <th>Billing Mode</th>
                  <th>Provider</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {subscriptions.map((sub: any) => (
                  <tr key={sub.id}>
                    <td>
                      <span style={{ fontWeight: 600 }}>
                        {sub.subscription_plans?.name || 'Custom / Pro'}
                      </span>
                    </td>
                    <td>{sub.current_period_start ? new Date(sub.current_period_start).toLocaleDateString() : 'N/A'}</td>
                    <td>{sub.current_period_end ? new Date(sub.current_period_end).toLocaleDateString() : 'None'}</td>
                    <td>
                      <span className={`badge ${
                        sub.status === 'active' ? 'badge-success' : 
                        sub.status === 'trialing' ? 'badge-warning' : 'badge-error'
                      }`}>
                        {sub.status}
                      </span>
                    </td>
                    <td style={{ textTransform: 'capitalize' }}>{sub.billing_mode || 'standard'}</td>
                    <td style={{ textTransform: 'capitalize' }}>{sub.billing_provider || 'manual'}</td>
                    <td style={{ fontSize: '0.8125rem', color: '#64748B' }}>
                      {new Date(sub.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem',
    maxWidth: '1200px',
    margin: '0 auto',
    paddingBottom: '3rem'
  },
  header: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem'
  },
  breadcrumb: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    fontSize: '0.875rem'
  },
  breadcrumbLink: {
    color: '#64748B',
    fontWeight: 500,
    textDecoration: 'none'
  },
  breadcrumbSeparator: {
    color: '#CBD5E1'
  },
  breadcrumbCurrent: {
    color: '#1E293B',
    fontWeight: 600
  },
  subtitle: {
    color: '#64748B',
    fontSize: '0.875rem',
    marginTop: '0.25rem'
  },
  statusBannerCard: {
    backgroundColor: '#FFFFFF',
    border: '1px solid #E2E8F0',
    borderRadius: '12px',
    padding: '1.25rem 1.5rem'
  },
  bannerGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(5, 1fr)',
    gap: '1.5rem'
  },
  bannerLabel: {
    fontSize: '0.75rem',
    fontWeight: 600,
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: '0.05em'
  },
  bannerVal: {
    fontSize: '0.9375rem',
    fontWeight: 600,
    color: '#0F172A',
    marginTop: '4px'
  },
  panelsGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '1.5rem'
  },
  card: {
    backgroundColor: '#FFFFFF',
    border: '1px solid #E2E8F0',
    borderRadius: '12px',
    padding: '1.5rem'
  },
  cardHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    marginBottom: '1.25rem',
    paddingBottom: '0.75rem',
    borderBottom: '1px solid #F1F5F9'
  },
  cardIconBox: {
    width: '36px',
    height: '36px',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  cardTitle: {
    fontSize: '1rem',
    fontWeight: 700,
    color: '#0F172A'
  },
  cardSubtitle: {
    fontSize: '0.75rem',
    color: '#64748B'
  },
  activeTrialBox: {
    padding: '1rem',
    backgroundColor: '#FEF3C7',
    border: '1px solid #FDE68A',
    borderRadius: '8px'
  },
  presetGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '0.5rem',
    marginTop: '0.375rem'
  },
  toggleBtn: {
    padding: '0.625rem',
    borderRadius: '6px',
    border: '1px solid #CBD5E1',
    backgroundColor: '#FFFFFF',
    fontSize: '0.8125rem',
    fontWeight: 600,
    color: '#475569',
    cursor: 'pointer',
    transition: 'all 0.15s ease'
  },
  toggleBtnActive: {
    border: '1px solid #4CAF50',
    backgroundColor: '#ECFDF5',
    color: '#065F46'
  },
  loadingContainer: {
    padding: '4rem 0',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '1rem',
    color: 'var(--text-secondary)'
  },
  spinner: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    border: '3px solid #CBD5E1',
    borderTopColor: 'var(--primary)',
    animation: 'spin 1s linear infinite'
  }
};

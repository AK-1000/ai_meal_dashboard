'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { 
  CreditCard, 
  DollarSign, 
  Clock, 
  TrendingUp, 
  AlertTriangle, 
  Search, 
  Plus, 
  Edit2, 
  Trash2, 
  Check, 
  X, 
  ToggleLeft, 
  ToggleRight, 
  Sparkles, 
  Users,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Settings
} from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase-browser';

export default function SubscriptionsPage() {
  const [activeTab, setActiveTab] = useState<'tracking' | 'plans'>('tracking');

  // Tracking state
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    activePaid: 0,
    activePaidPro: 0,
    activePaidVip: 0,
    activeTrials: 0,
    canceled: 0,
    estimatedMrr: 0
  });
  const [trackingLoading, setTrackingLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [planFilter, setPlanFilter] = useState('');
  const [cycleFilter, setCycleFilter] = useState('');
  const [platformFilter, setPlatformFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, total: 0, pages: 1, limit: 10 });

  // Plans Management state
  const [plans, setPlans] = useState<any[]>([]);
  const [plansLoading, setPlansLoading] = useState(true);
  const [editingPlan, setEditingPlan] = useState<any | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);

  // Form states for Plan
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

  // 1. Fetch User Subscriptions
  const fetchSubscriptions = useCallback(async () => {
    setTrackingLoading(true);
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const params = new URLSearchParams({
        page: page.toString(),
        limit: '10',
        search,
        status: statusFilter,
        plan: planFilter,
        cycle: cycleFilter,
        platform: platformFilter
      });

      const res = await fetch(`/api/subscriptions?${params}`, {
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      });

      if (res.ok) {
        const data = await res.json();
        setSubscriptions(data.subscriptions || []);
        if (data.stats) setStats(data.stats);
        if (data.pagination) setPagination(data.pagination);
      } else {
        toast.error('Failed to load user subscriptions.');
      }
    } catch (err) {
      console.error(err);
      toast.error('Error fetching subscriptions.');
    } finally {
      setTrackingLoading(false);
    }
  }, [page, search, statusFilter, planFilter, cycleFilter, platformFilter]);

  // 2. Fetch Plans Catalog
  const fetchPlans = async () => {
    setPlansLoading(true);
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch('/api/subscriptions/plans', {
        headers: { 'Authorization': `Bearer ${session.access_token}` }
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
      setPlansLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscriptions();
  }, [fetchSubscriptions]);

  useEffect(() => {
    if (activeTab === 'plans') {
      fetchPlans();
    }
  }, [activeTab]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchSubscriptions();
  };

  // Plan Form actions
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
        headers: { 'Authorization': `Bearer ${session.access_token}` }
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
      {/* Header */}
      <div className="flex-between">
        <div>
          <h1 className="title-large">Subscriptions & Revenue Tracking</h1>
          <p style={styles.subtitle}>
            Monitor customer subscriptions, Pro trial conversions, estimated MRR, and configure plan tiers.
          </p>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div style={styles.kpiGrid}>
        <div style={styles.kpiCard}>
          <div style={styles.kpiHeader}>
            <span style={styles.kpiTitle}>Estimated MRR</span>
            <div style={{ ...styles.kpiIcon, backgroundColor: 'rgba(76, 175, 80, 0.1)', color: '#4CAF50' }}>
              <DollarSign size={18} />
            </div>
          </div>
          <div style={{ ...styles.kpiValue, color: '#16A34A' }}>${stats.estimatedMrr}</div>
          <div style={styles.kpiSub}>Monthly recurring revenue</div>
        </div>

        <div style={styles.kpiCard}>
          <div style={styles.kpiHeader}>
            <span style={styles.kpiTitle}>Paying Subscribers</span>
            <div style={{ ...styles.kpiIcon, backgroundColor: 'rgba(33, 150, 243, 0.1)', color: '#2196F3' }}>
              <TrendingUp size={18} />
            </div>
          </div>
          <div style={styles.kpiValue}>{stats.activePaid}</div>
          <div style={styles.kpiSub}>{stats.activePaidPro} Pro &bull; {stats.activePaidVip} VIP</div>
        </div>

        <div style={styles.kpiCard}>
          <div style={styles.kpiHeader}>
            <span style={styles.kpiTitle}>In Pro Trial</span>
            <div style={{ ...styles.kpiIcon, backgroundColor: 'rgba(255, 152, 0, 0.1)', color: '#FF9800' }}>
              <Clock size={18} />
            </div>
          </div>
          <div style={{ ...styles.kpiValue, color: '#D97706' }}>{stats.activeTrials}</div>
          <div style={styles.kpiSub}>Active trial users</div>
        </div>

        <div style={styles.kpiCard}>
          <div style={styles.kpiHeader}>
            <span style={styles.kpiTitle}>Cancelled / Churned</span>
            <div style={{ ...styles.kpiIcon, backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#EF4444' }}>
              <AlertTriangle size={18} />
            </div>
          </div>
          <div style={{ ...styles.kpiValue, color: '#DC2626' }}>{stats.canceled}</div>
          <div style={styles.kpiSub}>Total cancellations</div>
        </div>

        <div style={styles.kpiCard}>
          <div style={styles.kpiHeader}>
            <span style={styles.kpiTitle}>Total Records</span>
            <div style={{ ...styles.kpiIcon, backgroundColor: 'rgba(100, 116, 139, 0.1)', color: '#64748B' }}>
              <CreditCard size={18} />
            </div>
          </div>
          <div style={styles.kpiValue}>{stats.total}</div>
          <div style={styles.kpiSub}>All subscription records</div>
        </div>
      </div>

      {/* Main Tab Switcher */}
      <div style={styles.tabBar}>
        <button
          onClick={() => setActiveTab('tracking')}
          style={{
            ...styles.tabButton,
            ...(activeTab === 'tracking' ? styles.tabButtonActive : {})
          }}
        >
          <CreditCard size={16} />
          <span>Live User Subscriptions</span>
        </button>
        <button
          onClick={() => setActiveTab('plans')}
          style={{
            ...styles.tabButton,
            ...(activeTab === 'plans' ? styles.tabButtonActive : {})
          }}
        >
          <Settings size={16} />
          <span>Plan Catalog & Pricing</span>
        </button>
      </div>

      {/* TAB 1: Live User Subscriptions Tracking */}
      {activeTab === 'tracking' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Search & Filter Bar */}
          <div className="card" style={styles.filterCard}>
            <form onSubmit={handleSearchSubmit} style={styles.searchForm}>
              <div style={styles.searchInputWrapper}>
                <Search size={18} style={styles.searchIcon} />
                <input
                  type="text"
                  placeholder="Search by user email or name..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="input-field"
                  style={styles.searchInput}
                />
              </div>
              <button type="submit" className="btn btn-primary">Filter</button>
            </form>

            <div style={styles.selectGroup}>
              <select
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                className="input-field"
                style={styles.selectInput}
              >
                <option value="">All Statuses</option>
                <option value="active">Active</option>
                <option value="trialing">In Trial</option>
                <option value="canceled">Canceled</option>
                <option value="expired">Expired</option>
              </select>

              <select
                value={planFilter}
                onChange={(e) => { setPlanFilter(e.target.value); setPage(1); }}
                className="input-field"
                style={styles.selectInput}
              >
                <option value="">All Plans</option>
                <option value="Pro">Pro (Paid)</option>
                <option value="Pro_Trial">Pro Trial</option>
                <option value="VIP">VIP</option>
              </select>

              <select
                value={cycleFilter}
                onChange={(e) => { setCycleFilter(e.target.value); setPage(1); }}
                className="input-field"
                style={styles.selectInput}
              >
                <option value="">All Cycles</option>
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
              </select>

              <select
                value={platformFilter}
                onChange={(e) => { setPlatformFilter(e.target.value); setPage(1); }}
                className="input-field"
                style={styles.selectInput}
              >
                <option value="">All Platforms</option>
                <option value="ios">iOS</option>
                <option value="android">Android</option>
                <option value="admin">Web / Admin</option>
              </select>
            </div>
          </div>

          {/* Subscriptions Table */}
          {trackingLoading ? (
            <div style={styles.loadingContainer}>
              <div style={styles.spinner}></div>
              <p>Fetching user subscriptions...</p>
            </div>
          ) : (
            <div className="table-container">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Plan / Tier</th>
                    <th>Subscription Status</th>
                    <th>Billing Cycle</th>
                    <th>Platform</th>
                    <th>Period Start</th>
                    <th>End / Renewal</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {subscriptions.length === 0 ? (
                    <tr>
                      <td colSpan={8} style={styles.emptyCell}>
                        No subscriptions found matching the selected filters.
                      </td>
                    </tr>
                  ) : (
                    subscriptions.map((sub: any) => {
                      const u = sub.users;
                      const isSubTrial = sub.billing_mode === 'trial' || 
                        sub.status === 'trialing' || 
                        u?.trial_status === 'active' || 
                        (u?.trial_status === 'expired' && sub.status === 'expired') ||
                        (sub.status === 'expired' && !sub.areeba_subscription_reference && sub.billing_mode !== 'iap' && sub.billing_mode !== 'complimentary');
                      const isVip = sub.subscription_plans?.name?.toLowerCase() === 'vip';

                      let trialDays = null;
                      if (isSubTrial && (sub.current_period_end || u?.trial_ends_at)) {
                        const targetEnd = sub.current_period_end || u?.trial_ends_at;
                        trialDays = Math.max(0, Math.ceil((new Date(targetEnd).getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
                      }

                      return (
                        <tr key={sub.id}>
                          <td>
                            {u ? (
                              <Link href={`/dashboard/users/${u.id}`} style={{ display: 'flex', flexDirection: 'column' }}>
                                <span style={styles.userName}>{u.name || 'Unnamed User'}</span>
                                <span style={styles.userEmail}>{u.email}</span>
                              </Link>
                            ) : (
                              <span style={{ color: '#94A3B8' }}>User {sub.user_id?.slice(0, 8)}...</span>
                            )}
                          </td>
                          <td>
                            {isVip ? (
                              <span className="badge badge-primary">VIP</span>
                            ) : isSubTrial ? (
                              <span className="badge" style={{ backgroundColor: '#FEF3C7', color: '#B45309', border: '1px solid #FDE68A', fontWeight: 600 }}>
                                Pro Trial
                              </span>
                            ) : (
                              <span className="badge badge-info">Pro</span>
                            )}
                          </td>
                          <td>
                            {isSubTrial && sub.status === 'active' ? (
                              <span className="badge" style={{ backgroundColor: '#FEF3C7', color: '#B45309', border: '1px solid #FDE68A' }}>
                                Pro Trial ({trialDays}d left)
                              </span>
                            ) : isSubTrial && sub.status === 'expired' ? (
                              <span className="badge badge-error">
                                Trial Expired
                              </span>
                            ) : (
                              <span className={`badge ${sub.status === 'active' ? 'badge-success' : 'badge-error'}`}>
                                {sub.status}
                              </span>
                            )}
                          </td>
                          <td>
                            <span style={{ textTransform: 'capitalize' }}>
                              {sub.billing_cycle || 'N/A'}
                            </span>
                          </td>
                          <td>
                            {(() => {
                              const prov = (sub.billing_provider || '').toLowerCase();
                              const userPlat = (u?.device_platform || '').toLowerCase();
                              if (prov === 'apple' || (!prov && userPlat === 'ios')) {
                                return (
                                  <span className="badge badge-info" style={{ fontSize: '0.75rem' }}>
                                    iOS
                                  </span>
                                );
                              }
                              if (prov === 'google' || (!prov && userPlat === 'android')) {
                                return (
                                  <span className="badge badge-success" style={{ fontSize: '0.75rem' }}>
                                    Android
                                  </span>
                                );
                              }
                              if (prov === 'areeba') {
                                return (
                                  <span className="badge badge-warning" style={{ fontSize: '0.75rem' }}>
                                    {userPlat === 'android' ? 'Android' : (userPlat === 'ios' ? 'iOS' : 'Web / Admin')}
                                  </span>
                                );
                              }
                              return (
                                <span className="badge badge-neutral" style={{ fontSize: '0.75rem' }}>
                                  Web / Admin
                                </span>
                              );
                            })()}
                          </td>
                          <td style={styles.dateCell}>
                            {sub.current_period_start ? new Date(sub.current_period_start).toLocaleDateString() : 'N/A'}
                          </td>
                          <td style={styles.dateCell}>
                            {sub.current_period_end ? new Date(sub.current_period_end).toLocaleDateString() : 'None'}
                          </td>
                          <td>
                            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                              {u?.id && (
                                <Link
                                  href={`/dashboard/users/${u.id}/subscription`}
                                  className="btn btn-outline"
                                  style={{ padding: '0.375rem 0.75rem', fontSize: '0.75rem', gap: '0.25rem' }}
                                >
                                  <span>Manage</span>
                                  <ExternalLink size={12} />
                                </Link>
                              )}
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

          {/* Pagination Footer */}
          {!trackingLoading && pagination.pages > 1 && (
            <div style={styles.paginationContainer}>
              <div style={styles.paginationInfo}>
                Showing page {pagination.page} of {pagination.pages} ({pagination.total} total subscriptions)
              </div>
              <div style={styles.paginationButtons}>
                <button
                  className="btn btn-outline btn-icon"
                  disabled={page <= 1}
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                >
                  <ChevronLeft size={18} />
                </button>
                <button
                  className="btn btn-outline btn-icon"
                  disabled={page >= pagination.pages}
                  onClick={() => setPage(p => p + 1)}
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: Plan Catalog & Pricing Configuration */}
      {activeTab === 'plans' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="flex-between">
            <div>
              <h2 className="title-medium">Tier Pricing Models</h2>
              <p style={styles.subtitle}>Manage features and App Store StoreKit Product IDs</p>
            </div>
            {!showAddForm && (
              <button className="btn btn-primary" onClick={() => setShowAddForm(true)}>
                <Plus size={16} />
                <span>Create Pricing Plan</span>
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
                  <label className="form-label" htmlFor="plan-price-m">Monthly Price ($)</label>
                  <input
                    id="plan-price-m"
                    type="number"
                    step="0.01"
                    value={priceMonthly}
                    onChange={(e) => setPriceMonthly(Number(e.target.value))}
                    className="input-field"
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="plan-price-y">Yearly Price ($)</label>
                  <input
                    id="plan-price-y"
                    type="number"
                    step="0.01"
                    value={priceYearly}
                    onChange={(e) => setPriceYearly(Number(e.target.value))}
                    className="input-field"
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="plan-apple-m">Apple Product ID (Monthly)</label>
                  <input
                    id="plan-apple-m"
                    type="text"
                    placeholder="com.aimeal.pro.monthly"
                    value={appleMonthly}
                    onChange={(e) => setAppleMonthly(e.target.value)}
                    className="input-field"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="plan-apple-y">Apple Product ID (Yearly)</label>
                  <input
                    id="plan-apple-y"
                    type="text"
                    placeholder="com.aimeal.pro.yearly"
                    value={appleYearly}
                    onChange={(e) => setAppleYearly(e.target.value)}
                    className="input-field"
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
                    style={{ resize: 'vertical' }}
                  />
                </div>

                <div style={{ gridColumn: 'span 2', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                  <button type="button" className="btn btn-outline" onClick={resetForm}>Cancel</button>
                  <button type="submit" className="btn btn-primary">
                    {editingPlan ? 'Update Plan' : 'Save Plan'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {plansLoading ? (
            <div style={styles.loadingContainer}>
              <div style={styles.spinner}></div>
              <p>Loading plans catalog...</p>
            </div>
          ) : (
            <div style={styles.plansGrid}>
              {plans.map((p) => {
                const featureList = Array.isArray(p.features) ? p.features : (p.features?.features || []);
                return (
                  <div key={p.id} className="card" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                    <div className="flex-between" style={{ marginBottom: '1rem' }}>
                      <span className={`badge ${
                        p.name.toLowerCase() === 'vip' ? 'badge-primary' :
                        p.name.toLowerCase() === 'pro' ? 'badge-info' : 'badge-neutral'
                      }`}>
                        {p.name}
                      </span>
                      <button 
                        style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}
                        onClick={() => handleToggleActive(p)}
                        title={p.active ? 'Deactivate' : 'Activate'}
                      >
                        {p.active ? <ToggleRight size={28} color="var(--primary)" /> : <ToggleLeft size={28} color="var(--text-secondary)" />}
                      </button>
                    </div>

                    <div style={{ marginBottom: '1rem' }}>
                      <span style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-dark)' }}>
                        ${p.price_monthly}
                      </span>
                      <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}> / month</span>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                        ${p.price_yearly} billed yearly
                      </div>
                    </div>

                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.5rem', minHeight: '40px' }}>
                      {p.description || 'No description provided.'}
                    </p>

                    <div style={{ flexGrow: 1, marginBottom: '1.5rem' }}>
                      <div style={{ fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                        Features Included
                      </div>
                      <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {featureList.map((f: string, i: number) => (
                          <li key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
                            <Check size={14} color="var(--primary)" />
                            <span>{f}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div style={{ borderTop: '1px solid #E2E8F0', paddingTop: '1rem', marginTop: 'auto' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Order: {p.rank}</span>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button className="btn btn-outline btn-icon" onClick={() => handleEditClick(p)}>
                            <Edit2 size={16} />
                          </button>
                          <button className="btn btn-outline btn-icon" onClick={() => handleDeletePlan(p.id)}>
                            <Trash2 size={16} style={{ color: 'var(--error)' }} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
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
    fontSize: '0.875rem',
    color: '#64748B',
    marginTop: '0.25rem',
  },
  kpiGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(5, 1fr)',
    gap: '1rem',
  },
  kpiCard: {
    backgroundColor: '#FFFFFF',
    border: '1px solid #E2E8F0',
    borderRadius: '10px',
    padding: '1rem',
    boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
  },
  kpiHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '0.5rem'
  },
  kpiTitle: {
    fontSize: '0.75rem',
    fontWeight: 600,
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: '0.05em'
  },
  kpiIcon: {
    width: '32px',
    height: '32px',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  kpiValue: {
    fontSize: '1.5rem',
    fontWeight: 700,
    color: '#0F172A',
    marginBottom: '0.25rem'
  },
  kpiSub: {
    fontSize: '0.6875rem',
    color: '#94A3B8'
  },
  tabBar: {
    display: 'flex',
    gap: '0.75rem',
    borderBottom: '2px solid #E2E8F0',
    paddingBottom: '0.5rem'
  },
  tabButton: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.625rem 1.25rem',
    backgroundColor: 'transparent',
    border: 'none',
    borderRadius: '8px',
    fontSize: '0.875rem',
    fontWeight: 600,
    color: '#64748B',
    cursor: 'pointer',
    transition: 'all 0.15s ease'
  },
  tabButtonActive: {
    backgroundColor: '#E2E8F0',
    color: '#0F172A'
  },
  filterCard: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '1rem',
  },
  searchForm: {
    display: 'flex',
    gap: '0.5rem',
    flex: '1 1 300px',
  },
  searchInputWrapper: {
    position: 'relative',
    flex: 1,
  },
  searchIcon: {
    position: 'absolute',
    left: '12px',
    top: '50%',
    transform: 'translateY(-50%)',
    color: 'var(--text-secondary)',
  },
  searchInput: {
    paddingLeft: '38px',
    width: '100%',
  },
  selectGroup: {
    display: 'flex',
    gap: '0.75rem',
  },
  selectInput: {
    minWidth: '130px',
  },
  userCell: {
    display: 'flex',
    flexDirection: 'column',
  },
  userName: {
    fontWeight: 600,
    color: 'var(--text-dark)',
    fontSize: '0.875rem',
  },
  userEmail: {
    fontSize: '0.775rem',
    color: 'var(--text-secondary)',
  },
  dateCell: {
    fontSize: '0.85rem',
    color: 'var(--text-secondary)',
  },
  emptyCell: {
    textAlign: 'center',
    padding: '3rem 0',
    color: 'var(--text-secondary)',
  },
  paginationContainer: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: '0.5rem',
  },
  paginationInfo: {
    fontSize: '0.875rem',
    color: 'var(--text-secondary)',
  },
  paginationButtons: {
    display: 'flex',
    gap: '0.5rem',
  },
  plansGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: '1.5rem',
  },
  formGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '1rem',
  },
  loadingContainer: {
    padding: '4rem 0',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '1rem',
    color: 'var(--text-secondary)',
  },
  spinner: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    border: '3px solid #CBD5E1',
    borderTopColor: 'var(--primary)',
    animation: 'spin 1s linear infinite',
  },
};

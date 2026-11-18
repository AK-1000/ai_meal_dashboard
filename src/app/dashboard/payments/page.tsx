'use client';

import React, { useEffect, useState, useCallback, Component, ErrorInfo, ReactNode } from 'react';
import Link from 'next/link';
import { 
  Search, 
  DollarSign, 
  RotateCcw, 
  ChevronLeft, 
  ChevronRight, 
  RefreshCw, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  CreditCard, 
  Eye, 
  X, 
  FileText,
  User,
  Calendar,
  Sparkles,
  ExternalLink,
  ShieldAlert,
  Smartphone,
  Filter,
  Layers
} from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase-browser';

// Safe Formatters to prevent any page crash
const safeAmount = (val: any): string => {
  if (val === null || val === undefined || isNaN(Number(val))) return '0.00';
  return Number(val).toFixed(2);
};

const safeDate = (val?: string | null): string => {
  if (!val) return '—';
  try {
    const d = new Date(val);
    return isNaN(d.getTime()) ? '—' : d.toLocaleDateString();
  } catch {
    return '—';
  }
};

const safeDateTime = (val?: string | null): string => {
  if (!val) return '—';
  try {
    const d = new Date(val);
    return isNaN(d.getTime()) ? '—' : d.toLocaleString();
  } catch {
    return '—';
  }
};

const safeSlice = (val?: string | null, len = 16): string => {
  if (!val) return '—';
  const str = String(val);
  return str.length > len ? `${str.slice(0, len)}...` : str;
};

// Error Boundary to prevent white screen of death
interface ErrorBoundaryProps {
  children: ReactNode;
}
interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class PaymentsErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('PaymentsErrorBoundary caught error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '2rem', textAlign: 'center', backgroundColor: '#FFF5F5', borderRadius: '12px', border: '1px solid #FEB2B2', margin: '2rem' }}>
          <AlertTriangle size={48} color="#E53E3E" style={{ margin: '0 auto 1rem' }} />
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#C53030', marginBottom: '0.5rem' }}>An error occurred on the Payments page</h2>
          <p style={{ color: '#742A2A', fontSize: '0.875rem', marginBottom: '1.5rem' }}>{this.state.error?.message || 'Unexpected rendering error.'}</p>
          <button 
            className="btn btn-primary"
            onClick={() => {
              this.setState({ hasError: false, error: null });
              window.location.reload();
            }}
          >
            Reload Page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

function PaymentsPageContent() {
  const [payments, setPayments] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalRevenue: 0,
    totalCount: 0,
    succeededCount: 0,
    pendingCount: 0,
    failedCount: 0,
    refundedCount: 0,
    productionRevenue: 0,
    productionCount: 0,
    productionSucceededCount: 0,
    sandboxRevenue: 0,
    sandboxCount: 0,
    sandboxSucceededCount: 0,
    combinedRevenue: 0,
    combinedCount: 0,
  });
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [platform, setPlatform] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [datePreset, setDatePreset] = useState('all');
  const [envFilter, setEnvFilter] = useState<'production' | 'sandbox' | 'all'>('production');

  // Pagination
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, pages: 1, limit: 10 });

  // Receipt Modal state
  const [selectedTx, setSelectedTx] = useState<any | null>(null);
  const [refundingId, setRefundingId] = useState<string | null>(null);

  // Apply Date Presets
  const applyDatePreset = (preset: string) => {
    setDatePreset(preset);
    setPage(1);
    const now = new Date();

    if (preset === 'all') {
      setStartDate('');
      setEndDate('');
    } else if (preset === 'today') {
      const todayStr = now.toISOString().split('T')[0];
      setStartDate(todayStr);
      setEndDate(todayStr);
    } else if (preset === '7d') {
      const past = new Date();
      past.setDate(past.getDate() - 7);
      setStartDate(past.toISOString().split('T')[0]);
      setEndDate(now.toISOString().split('T')[0]);
    } else if (preset === '30d') {
      const past = new Date();
      past.setDate(past.getDate() - 30);
      setStartDate(past.toISOString().split('T')[0]);
      setEndDate(now.toISOString().split('T')[0]);
    } else if (preset === 'thisMonth') {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      setStartDate(startOfMonth.toISOString().split('T')[0]);
      setEndDate(now.toISOString().split('T')[0]);
    }
  };

  const fetchPayments = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();

      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: '10',
        search,
        status,
        platform,
        startDate,
        endDate,
        envFilter,
      });

      const headers: Record<string, string> = {};
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }

      const res = await fetch(`/api/payments?${queryParams.toString()}`, {
        headers,
        credentials: 'include'
      });

      if (res.ok) {
        const data = await res.json();
        setPayments(data.payments || []);
        if (data.stats) setStats(data.stats);
        if (data.pagination) setPagination(data.pagination);
      } else {
        const errJson = await res.json().catch(() => ({}));
        const msg = errJson.error || 'Failed to load transaction history.';
        setFetchError(msg);
      }
    } catch (err: any) {
      if (err?.name === 'AbortError') return;
      console.warn('Payments fetch error:', err);
      setFetchError(err?.message || 'Error fetching transactions.');
    } finally {
      setLoading(false);
    }
  }, [page, search, status, platform, startDate, endDate, envFilter]);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchPayments();
  };

  const handleStatusTab = (newStatus: string) => {
    setStatus(newStatus);
    setPage(1);
  };

  const handleRefund = async (id: string) => {
    if (!confirm('Are you sure you want to mark this transaction as refunded? This will update the database status.')) return;
    setRefundingId(id);
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch(`/api/payments/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ status: 'refunded' })
      });

      if (res.ok) {
        toast.success('Payment successfully marked as refunded.');
        if (selectedTx && selectedTx.id === id) {
          setSelectedTx({ ...selectedTx, status: 'refunded' });
        }
        fetchPayments();
      } else {
        const err = await res.json();
        toast.error(err.error || 'Failed to update transaction status.');
      }
    } catch (err) {
      console.error(err);
      toast.error('Error updating transaction.');
    } finally {
      setRefundingId(null);
    }
  };

  return (
    <div style={styles.container}>
      {/* Header */}
      <div className="flex-between" style={{ alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="title-large">Payments & Revenue Ledger</h1>
          <p style={styles.subtitle}>
            Audit customer payments across iOS StoreKit, Google Play Android IAP, and direct gateways with live sandbox segregation.
          </p>
        </div>

        {/* Environment Filter Selector (Production vs Sandbox) */}
        <div style={styles.envSelectorGroup}>
          <span style={styles.envLabel}>Scope:</span>
          <button
            onClick={() => { setEnvFilter('production'); setPage(1); }}
            style={{
              ...styles.envBtn,
              ...(envFilter === 'production' ? styles.envBtnActiveProd : {})
            }}
          >
            Real Production ({stats.productionCount || 0})
          </button>
          <button
            onClick={() => { setEnvFilter('sandbox'); setPage(1); }}
            style={{
              ...styles.envBtn,
              ...(envFilter === 'sandbox' ? styles.envBtnActiveSand : {})
            }}
          >
            Sandbox Only ({stats.sandboxCount || 0})
          </button>
          <button
            onClick={() => { setEnvFilter('all'); setPage(1); }}
            style={{
              ...styles.envBtn,
              ...(envFilter === 'all' ? styles.envBtnActiveAll : {})
            }}
          >
            All Combined ({stats.combinedCount || (stats.productionCount + stats.sandboxCount)})
          </button>
        </div>
      </div>

      {/* Sandbox Exclusion Banner */}
      {stats.sandboxCount > 0 && envFilter === 'production' && (
        <div style={styles.sandboxNoticeBanner}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
            <span style={{ fontSize: '1rem' }}>🛡️</span>
            <div>
              <strong style={{ color: '#92400E' }}>Production Mode Active:</strong>
              <span style={{ color: '#B45309', marginLeft: '0.375rem', fontSize: '0.8125rem' }}>
                Excluding <strong>{stats.sandboxCount} test transactions</strong> (${safeAmount(stats.sandboxRevenue)}) from test accounts (kassabb1996, mindmatrix, ali.hero12, 71630545, dummy gateway IDs). Revenue below shows strictly real paying users.
              </span>
            </div>
          </div>
          <button 
            onClick={() => { setEnvFilter('sandbox'); setPage(1); }}
            style={styles.sandboxNoticeLink}
          >
            Inspect {stats.sandboxCount} Test Transactions →
          </button>
        </div>
      )}

      {envFilter === 'sandbox' && (
        <div style={{ ...styles.sandboxNoticeBanner, backgroundColor: '#EFF6FF', border: '1px solid #BFDBFE' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
            <span style={{ fontSize: '1rem' }}>🧪</span>
            <div>
              <strong style={{ color: '#1E40AF' }}>Sandbox & Test Ledger Active:</strong>
              <span style={{ color: '#1D4ED8', marginLeft: '0.375rem', fontSize: '0.8125rem' }}>
                Showing only test transactions ({stats.sandboxCount} total, ${safeAmount(stats.sandboxRevenue)} test volume) from kassabb1996, mindmatrix, ali.hero12, and 71630545.
              </span>
            </div>
          </div>
          <button 
            onClick={() => { setEnvFilter('production'); setPage(1); }}
            style={{ ...styles.sandboxNoticeLink, color: '#2563EB' }}
          >
            Switch to Real Production →
          </button>
        </div>
      )}

      {/* KPI Financial Overview Cards */}
      <div style={styles.kpiGrid}>
        <div style={styles.kpiCard}>
          <div style={styles.kpiHeader}>
            <span style={styles.kpiTitle}>
              {envFilter === 'sandbox' ? 'Sandbox Test Revenue' : (envFilter === 'all' ? 'Total Combined Revenue' : 'Production Net Revenue')}
            </span>
            <div style={{ 
              ...styles.kpiIcon, 
              backgroundColor: envFilter === 'sandbox' ? 'rgba(217, 119, 6, 0.1)' : 'rgba(76, 175, 80, 0.1)', 
              color: envFilter === 'sandbox' ? '#D97706' : '#4CAF50' 
            }}>
              <DollarSign size={18} />
            </div>
          </div>
          <div style={{ 
            ...styles.kpiValue, 
            color: envFilter === 'sandbox' ? '#D97706' : '#16A34A' 
          }}>
            ${safeAmount(stats.totalRevenue)}
          </div>
          <div style={styles.kpiSub}>
            From {stats.succeededCount} {envFilter === 'sandbox' ? 'test' : 'verified paying'} successful transactions
          </div>
        </div>

        <div 
          onClick={() => handleStatusTab('succeeded')}
          style={{
            ...styles.kpiCard,
            ...(status === 'succeeded' ? styles.kpiCardActive : {})
          }}
        >
          <div style={styles.kpiHeader}>
            <span style={styles.kpiTitle}>Succeeded</span>
            <div style={{ ...styles.kpiIcon, backgroundColor: 'rgba(76, 175, 80, 0.1)', color: '#16A34A' }}>
              <CheckCircle2 size={18} />
            </div>
          </div>
          <div style={{ ...styles.kpiValue, color: '#16A34A' }}>{stats.succeededCount}</div>
          <div style={styles.kpiSub}>Settled & completed cycles</div>
        </div>

        <div 
          onClick={() => handleStatusTab('pending')}
          style={{
            ...styles.kpiCard,
            ...(status === 'pending' ? styles.kpiCardActive : {})
          }}
        >
          <div style={styles.kpiHeader}>
            <span style={styles.kpiTitle}>Pending / Processing</span>
            <div style={{ ...styles.kpiIcon, backgroundColor: 'rgba(255, 152, 0, 0.1)', color: '#FF9800' }}>
              <Clock size={18} />
            </div>
          </div>
          <div style={{ ...styles.kpiValue, color: '#D97706' }}>{stats.pendingCount}</div>
          <div style={styles.kpiSub}>Awaiting webhook / settlement</div>
        </div>

        <div 
          onClick={() => handleStatusTab('failed')}
          style={{
            ...styles.kpiCard,
            ...(status === 'failed' ? styles.kpiCardActive : {})
          }}
        >
          <div style={styles.kpiHeader}>
            <span style={styles.kpiTitle}>Failed</span>
            <div style={{ ...styles.kpiIcon, backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#EF4444' }}>
              <AlertTriangle size={18} />
            </div>
          </div>
          <div style={{ ...styles.kpiValue, color: '#DC2626' }}>{stats.failedCount}</div>
          <div style={styles.kpiSub}>Card or store decline</div>
        </div>

        <div 
          onClick={() => handleStatusTab('refunded')}
          style={{
            ...styles.kpiCard,
            ...(status === 'refunded' ? styles.kpiCardActive : {})
          }}
        >
          <div style={styles.kpiHeader}>
            <span style={styles.kpiTitle}>Refunded / Revoked</span>
            <div style={{ ...styles.kpiIcon, backgroundColor: 'rgba(100, 116, 139, 0.1)', color: '#64748B' }}>
              <RotateCcw size={18} />
            </div>
          </div>
          <div style={styles.kpiValue}>{stats.refundedCount}</div>
          <div style={styles.kpiSub}>Reversed / revoked transactions</div>
        </div>
      </div>

      {/* Date Filter & Presets Toolbar */}
      <div className="card" style={styles.dateFilterCard}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', color: '#475569', fontSize: '0.8125rem', fontWeight: 600 }}>
            <Calendar size={16} />
            <span>Date Range:</span>
          </div>

          <div style={styles.datePresets}>
            <button
              onClick={() => applyDatePreset('all')}
              style={{ ...styles.presetBtn, ...(datePreset === 'all' ? styles.presetBtnActive : {}) }}
            >
              All Time
            </button>
            <button
              onClick={() => applyDatePreset('today')}
              style={{ ...styles.presetBtn, ...(datePreset === 'today' ? styles.presetBtnActive : {}) }}
            >
              Today
            </button>
            <button
              onClick={() => applyDatePreset('7d')}
              style={{ ...styles.presetBtn, ...(datePreset === '7d' ? styles.presetBtnActive : {}) }}
            >
              Last 7 Days
            </button>
            <button
              onClick={() => applyDatePreset('30d')}
              style={{ ...styles.presetBtn, ...(datePreset === '30d' ? styles.presetBtnActive : {}) }}
            >
              Last 30 Days
            </button>
            <button
              onClick={() => applyDatePreset('thisMonth')}
              style={{ ...styles.presetBtn, ...(datePreset === 'thisMonth' ? styles.presetBtnActive : {}) }}
            >
              This Month
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', flexWrap: 'wrap' }}>
          <div style={styles.dateInputWrapper}>
            <span style={styles.dateLabel}>From:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setDatePreset('custom');
                setPage(1);
              }}
              className="input-field"
              style={styles.dateInput}
            />
          </div>

          <div style={styles.dateInputWrapper}>
            <span style={styles.dateLabel}>To:</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setDatePreset('custom');
                setPage(1);
              }}
              className="input-field"
              style={styles.dateInput}
            />
          </div>

          {(startDate || endDate) && (
            <button
              onClick={() => applyDatePreset('all')}
              className="btn btn-outline"
              style={{ padding: '0.375rem 0.625rem', fontSize: '0.75rem' }}
              title="Clear date filters"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Status Filter Tabs */}
      <div style={styles.tabsRow}>
        <button
          onClick={() => handleStatusTab('')}
          style={{ ...styles.tabBtn, ...(status === '' ? styles.tabBtnActive : {}) }}
        >
          All Transactions ({stats.totalCount})
        </button>
        <button
          onClick={() => handleStatusTab('succeeded')}
          style={{ ...styles.tabBtn, ...(status === 'succeeded' ? styles.tabBtnActive : {}) }}
        >
          Succeeded ({stats.succeededCount})
        </button>
        <button
          onClick={() => handleStatusTab('pending')}
          style={{ ...styles.tabBtn, ...(status === 'pending' ? styles.tabBtnActive : {}) }}
        >
          Pending ({stats.pendingCount})
        </button>
        <button
          onClick={() => handleStatusTab('failed')}
          style={{ ...styles.tabBtn, ...(status === 'failed' ? styles.tabBtnActive : {}) }}
        >
          Failed ({stats.failedCount})
        </button>
        <button
          onClick={() => handleStatusTab('refunded')}
          style={{ ...styles.tabBtn, ...(status === 'refunded' ? styles.tabBtnActive : {}) }}
        >
          Refunded ({stats.refundedCount})
        </button>
      </div>

      {/* Search & Platform Filter Bar */}
      <div className="card" style={styles.filterCard}>
        <form onSubmit={handleSearchSubmit} style={styles.searchForm}>
          <div style={styles.searchInputWrapper}>
            <Search size={18} style={styles.searchIcon} />
            <input
              type="text"
              placeholder="Search by customer email, name, GPA order ID, or transaction ID..."
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
            value={platform}
            onChange={(e) => { setPlatform(e.target.value); setPage(1); }}
            className="input-field"
            style={styles.selectInput}
          >
            <option value="">All Platforms</option>
            <option value="ios">iOS App Store (IAP)</option>
            <option value="android_google_play">Google Play Store (Android IAP)</option>
            <option value="areeba">Areeba Gateway (Direct Card)</option>
          </select>
        </div>
      </div>

      {/* Fetch Error Display */}
      {fetchError && (
        <div style={styles.errorAlert}>
          <AlertTriangle size={18} color="#DC2626" />
          <span style={{ fontSize: '0.875rem', color: '#991B1B' }}>{fetchError}</span>
          <button 
            className="btn btn-outline"
            style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', marginLeft: 'auto' }}
            onClick={() => fetchPayments()}
          >
            Retry
          </button>
        </div>
      )}

      {/* Payments Table */}
      {loading ? (
        <div style={styles.loadingContainer}>
          <div style={styles.spinner}></div>
          <p>Loading transactions...</p>
        </div>
      ) : (
        <div className="table-container">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Customer</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Platform</th>
                <th>Order / Store Reference</th>
                <th>Discount / Promo</th>
                <th>Date</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {payments.length === 0 ? (
                <tr>
                  <td colSpan={8} style={styles.emptyCell}>
                    No payments found matching your filter criteria.
                  </td>
                </tr>
              ) : (
                payments.map((p) => {
                  const u = p.users;
                  const isSuccess = p.status === 'succeeded' || p.status === 'success';
                  const isPending = p.status === 'pending';
                  const isFailed = p.status === 'failed';
                  const isRefunded = p.status === 'refunded' || p.status === 'canceled';

                  return (
                    <tr key={p.id}>
                      <td>
                        {u ? (
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                              <Link href={`/dashboard/users/${u.id}`} style={styles.userName}>
                                {u.name || 'Unnamed User'}
                              </Link>
                              {p.is_sandbox && (
                                <span style={styles.sandboxBadge}>Sandbox / Test</span>
                              )}
                            </div>
                            <span style={styles.userEmail}>{u.email || 'No email'}</span>
                          </div>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ color: '#94A3B8', fontSize: '0.8125rem' }}>
                              User {safeSlice(p.user_id, 8)}
                            </span>
                            {p.is_sandbox && (
                              <span style={styles.sandboxBadge}>Sandbox / Test</span>
                            )}
                          </div>
                        )}
                      </td>
                      <td>
                        <span style={{ fontWeight: 700, fontSize: '0.9375rem', color: '#0F172A' }}>
                          ${safeAmount(p.amount)}
                        </span>
                        <span style={{ fontSize: '0.6875rem', color: '#94A3B8', marginLeft: '4px' }}>
                          {p.currency || 'USD'}
                        </span>
                      </td>
                      <td>
                        {isSuccess ? (
                          <span className="badge badge-success">Succeeded</span>
                        ) : isPending ? (
                          <span className="badge badge-warning">Pending</span>
                        ) : isRefunded ? (
                          <span className="badge badge-info">Refunded</span>
                        ) : (
                          <span className="badge badge-error">Failed</span>
                        )}
                      </td>
                      <td>
                        {p.platform === 'android_google_play' ? (
                          <span style={styles.googlePlayBadge}>
                            Google Play (Android)
                          </span>
                        ) : p.platform === 'ios' ? (
                          <span style={styles.appleStoreBadge}>
                            iOS StoreKit
                          </span>
                        ) : (
                          <span style={styles.areebaBadge}>
                            Areeba Gateway
                          </span>
                        )}
                      </td>
                      <td>
                        <span style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: '#475569' }}>
                          {p.order_id 
                            ? safeSlice(p.order_id, 18) 
                            : safeSlice(p.apple_transaction_id || p.areeba_order_id || p.id, 16)}
                        </span>
                      </td>
                      <td>
                        {p.promo_codes && !Array.isArray(p.promo_codes) ? (
                          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#16A34A', backgroundColor: '#ECFDF5', padding: '2px 6px', borderRadius: '4px' }}>
                            {p.promo_codes.code} {p.discount_percentage ? `(-${p.discount_percentage}%)` : ''}
                          </span>
                        ) : p.discount_percentage ? (
                          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#16A34A', backgroundColor: '#ECFDF5', padding: '2px 6px', borderRadius: '4px' }}>
                            Discount (-{p.discount_percentage}%)
                          </span>
                        ) : (
                          <span style={{ color: '#CBD5E1', fontSize: '0.75rem' }}>None</span>
                        )}
                      </td>
                      <td style={styles.dateCell}>
                        {safeDate(p.created_at)}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.375rem', justifyContent: 'flex-end' }}>
                          <button
                            className="btn btn-outline btn-icon"
                            onClick={() => setSelectedTx(p)}
                            title="View Receipt & Audit Details"
                          >
                            <Eye size={15} />
                          </button>
                          {isSuccess && (
                            <button
                              className="btn btn-outline btn-icon"
                              disabled={refundingId === p.id}
                              onClick={() => handleRefund(p.id)}
                              title="Mark as Refunded"
                            >
                              <RotateCcw size={15} style={{ color: '#DC2626' }} />
                            </button>
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
      {!loading && pagination.pages > 1 && (
        <div style={styles.paginationContainer}>
          <div style={styles.paginationInfo}>
            Showing page {page} of {pagination.pages} ({pagination.total} total payments)
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

      {/* Transaction Receipt Modal */}
      {selectedTx && (
        <div style={styles.modalBackdrop}>
          <div className="card animate-fade-in" style={styles.receiptModal}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', paddingBottom: '0.75rem', borderBottom: '1px solid #F1F5F9' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <FileText size={20} color="#4CAF50" />
                <h3 className="title-medium">Payment Receipt & Audit Details</h3>
              </div>
              <button className="btn btn-outline btn-icon" onClick={() => setSelectedTx(null)}>
                <X size={16} />
              </button>
            </div>

            <div style={styles.receiptGrid}>
              <div style={styles.receiptRow}>
                <span style={styles.receiptLabel}>Transaction / Store ID:</span>
                <span style={styles.receiptValMono}>{selectedTx.id}</span>
              </div>

              {selectedTx.is_sandbox && (
                <div style={styles.receiptRow}>
                  <span style={styles.receiptLabel}>Account Scope:</span>
                  <span style={styles.sandboxBadge}>Sandbox / Test Account</span>
                </div>
              )}

              {selectedTx.users && (
                <div style={styles.receiptRow}>
                  <span style={styles.receiptLabel}>Customer:</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={styles.receiptVal}>{selectedTx.users.name || 'User'} ({selectedTx.users.email})</span>
                    <Link href={`/dashboard/users/${selectedTx.users.id}`} style={{ color: '#2563EB' }}>
                      <ExternalLink size={14} />
                    </Link>
                  </div>
                </div>
              )}

              <div style={styles.receiptRow}>
                <span style={styles.receiptLabel}>Gross Amount:</span>
                <span style={{ fontSize: '1.25rem', fontWeight: 700, color: '#16A34A' }}>
                  ${safeAmount(selectedTx.amount)} {selectedTx.currency || 'USD'}
                </span>
              </div>

              <div style={styles.receiptRow}>
                <span style={styles.receiptLabel}>Status:</span>
                <span className={`badge ${
                  selectedTx.status === 'succeeded' || selectedTx.status === 'success' ? 'badge-success' :
                  selectedTx.status === 'pending' ? 'badge-warning' :
                  selectedTx.status === 'refunded' || selectedTx.status === 'canceled' ? 'badge-info' : 'badge-error'
                }`}>
                  {selectedTx.status}
                </span>
              </div>

              <div style={styles.receiptRow}>
                <span style={styles.receiptLabel}>Platform / Provider:</span>
                <span style={{ ...styles.receiptVal, fontWeight: 600 }}>
                  {selectedTx.platform === 'android_google_play' ? 'Google Play Store (Android IAP)' :
                   selectedTx.platform === 'ios' ? 'iOS App Store (Apple StoreKit)' : 'Areeba Gateway'}
                </span>
              </div>

              {selectedTx.order_id && (
                <div style={styles.receiptRow}>
                  <span style={styles.receiptLabel}>Order Reference:</span>
                  <span style={styles.receiptValMono}>{selectedTx.order_id}</span>
                </div>
              )}

              {selectedTx.apple_transaction_id && (
                <div style={styles.receiptRow}>
                  <span style={styles.receiptLabel}>Apple Transaction ID:</span>
                  <span style={styles.receiptValMono}>{selectedTx.apple_transaction_id}</span>
                </div>
              )}

              {selectedTx.apple_original_transaction_id && (
                <div style={styles.receiptRow}>
                  <span style={styles.receiptLabel}>Apple Original Tx ID:</span>
                  <span style={styles.receiptValMono}>{selectedTx.apple_original_transaction_id}</span>
                </div>
              )}

              {selectedTx.product_id && (
                <div style={styles.receiptRow}>
                  <span style={styles.receiptLabel}>Purchased Product ID:</span>
                  <span style={styles.receiptValMono}>{selectedTx.product_id} ({selectedTx.base_plan_id || 'monthly'})</span>
                </div>
              )}

              {selectedTx.promo_codes && !Array.isArray(selectedTx.promo_codes) && (
                <div style={styles.receiptRow}>
                  <span style={styles.receiptLabel}>Promo Code Applied:</span>
                  <span style={{ ...styles.receiptVal, color: '#16A34A', fontWeight: 600 }}>
                    {selectedTx.promo_codes.code} {selectedTx.discount_percentage ? `(${selectedTx.discount_percentage}% discount)` : ''}
                  </span>
                </div>
              )}

              <div style={styles.receiptRow}>
                <span style={styles.receiptLabel}>Created Date:</span>
                <span style={styles.receiptVal}>
                  {safeDateTime(selectedTx.created_at)}
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid #F1F5F9' }}>
              {(selectedTx.status === 'succeeded' || selectedTx.status === 'success') && (
                <button
                  className="btn btn-outline"
                  style={{ color: '#DC2626', borderColor: '#FCA5A5' }}
                  onClick={() => handleRefund(selectedTx.id)}
                >
                  Mark as Refunded
                </button>
              )}
              <button className="btn btn-primary" onClick={() => setSelectedTx(null)}>
                Close Receipt
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function PaymentsPage() {
  return (
    <PaymentsErrorBoundary>
      <PaymentsPageContent />
    </PaymentsErrorBoundary>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    padding: '2rem',
    maxWidth: '1400px',
    margin: '0 auto',
  },
  subtitle: {
    fontSize: '0.875rem',
    color: '#64748B',
    marginTop: '0.25rem',
  },
  envSelectorGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.375rem',
    backgroundColor: '#F8FAFC',
    padding: '0.25rem',
    borderRadius: '8px',
    border: '1px solid #E2E8F0',
  },
  envLabel: {
    fontSize: '0.75rem',
    fontWeight: 600,
    color: '#64748B',
    padding: '0 0.5rem',
  },
  envBtn: {
    padding: '0.375rem 0.75rem',
    fontSize: '0.75rem',
    fontWeight: 600,
    borderRadius: '6px',
    border: 'none',
    backgroundColor: 'transparent',
    color: '#64748B',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  envBtnActiveProd: {
    backgroundColor: '#FFFFFF',
    color: '#16A34A',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  envBtnActiveAll: {
    backgroundColor: '#FFFFFF',
    color: '#2563EB',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  envBtnActiveSand: {
    backgroundColor: '#FFFFFF',
    color: '#D97706',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  sandboxNoticeBanner: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FEF3C7',
    border: '1px solid #FCD34D',
    borderRadius: '8px',
    padding: '0.75rem 1rem',
    marginTop: '1.25rem',
    marginBottom: '0.5rem',
  },
  sandboxNoticeLink: {
    background: 'none',
    border: 'none',
    color: '#B45309',
    fontWeight: 600,
    fontSize: '0.75rem',
    cursor: 'pointer',
    textDecoration: 'underline',
  },
  sandboxBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    color: '#B45309',
    fontSize: '0.6875rem',
    fontWeight: 700,
    padding: '2px 6px',
    borderRadius: '4px',
    border: '1px solid #FDE68A',
  },
  googlePlayBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    color: '#1D4ED8',
    fontSize: '0.75rem',
    fontWeight: 600,
    padding: '2px 8px',
    borderRadius: '4px',
    border: '1px solid #BFDBFE',
  },
  appleStoreBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    color: '#334155',
    fontSize: '0.75rem',
    fontWeight: 600,
    padding: '2px 8px',
    borderRadius: '4px',
    border: '1px solid #CBD5E1',
  },
  areebaBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    backgroundColor: '#FDF4FF',
    color: '#86198F',
    fontSize: '0.75rem',
    fontWeight: 600,
    padding: '2px 8px',
    borderRadius: '4px',
    border: '1px solid #F5D0FE',
  },
  kpiGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
    gap: '1rem',
    marginTop: '1.25rem',
    marginBottom: '1rem',
  },
  kpiCard: {
    backgroundColor: '#FFFFFF',
    border: '1px solid #E2E8F0',
    borderRadius: '12px',
    padding: '1.25rem',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  kpiCardActive: {
    border: '1px solid #4CAF50',
    boxShadow: '0 0 0 2px rgba(76, 175, 80, 0.2)',
  },
  kpiHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '0.5rem',
  },
  kpiTitle: {
    fontSize: '0.8125rem',
    fontWeight: 600,
    color: '#64748B',
  },
  kpiIcon: {
    width: '32px',
    height: '32px',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  kpiValue: {
    fontSize: '1.625rem',
    fontWeight: 700,
    color: '#0F172A',
    lineHeight: 1.2,
  },
  kpiSub: {
    fontSize: '0.75rem',
    color: '#94A3B8',
    marginTop: '0.25rem',
  },
  dateFilterCard: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '0.75rem',
    padding: '0.875rem 1.25rem',
    marginBottom: '1rem',
    backgroundColor: '#F8FAFC',
    border: '1px solid #E2E8F0',
  },
  datePresets: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.25rem',
    backgroundColor: '#FFFFFF',
    padding: '2px',
    borderRadius: '6px',
    border: '1px solid #E2E8F0',
  },
  presetBtn: {
    padding: '0.25rem 0.625rem',
    fontSize: '0.75rem',
    fontWeight: 500,
    borderRadius: '4px',
    border: 'none',
    backgroundColor: 'transparent',
    color: '#64748B',
    cursor: 'pointer',
  },
  presetBtnActive: {
    backgroundColor: '#0F172A',
    color: '#FFFFFF',
  },
  dateInputWrapper: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.375rem',
  },
  dateLabel: {
    fontSize: '0.75rem',
    fontWeight: 600,
    color: '#64748B',
  },
  dateInput: {
    padding: '0.3125rem 0.625rem',
    fontSize: '0.75rem',
    borderRadius: '6px',
    border: '1px solid #CBD5E1',
    backgroundColor: '#FFFFFF',
  },
  tabsRow: {
    display: 'flex',
    gap: '0.5rem',
    marginBottom: '1rem',
    overflowX: 'auto',
    paddingBottom: '2px',
  },
  tabBtn: {
    padding: '0.5rem 1rem',
    borderRadius: '8px',
    fontSize: '0.8125rem',
    fontWeight: 500,
    border: '1px solid #E2E8F0',
    backgroundColor: '#FFFFFF',
    color: '#64748B',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  tabBtnActive: {
    backgroundColor: '#0F172A',
    color: '#FFFFFF',
    border: '1px solid #0F172A',
  },
  filterCard: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '1rem',
    padding: '0.875rem 1.25rem',
    marginBottom: '1.25rem',
    flexWrap: 'wrap',
  },
  searchForm: {
    display: 'flex',
    gap: '0.5rem',
    flex: '1 1 340px',
  },
  searchInputWrapper: {
    position: 'relative',
    flex: 1,
  },
  searchIcon: {
    position: 'absolute',
    left: '0.75rem',
    top: '50%',
    transform: 'translateY(-50%)',
    color: '#94A3B8',
  },
  searchInput: {
    paddingLeft: '2.375rem',
    width: '100%',
    height: '38px',
  },
  selectGroup: {
    minWidth: '220px',
  },
  selectInput: {
    height: '38px',
    width: '100%',
  },
  errorAlert: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    padding: '0.75rem 1rem',
    backgroundColor: '#FEE2E2',
    border: '1px solid #FCA5A5',
    borderRadius: '8px',
    marginBottom: '1rem',
  },
  userName: {
    fontWeight: 600,
    fontSize: '0.875rem',
    color: '#0F172A',
    textDecoration: 'none',
  },
  userEmail: {
    fontSize: '0.75rem',
    color: '#64748B',
  },
  dateCell: {
    fontSize: '0.8125rem',
    color: '#475569',
    whiteSpace: 'nowrap',
  },
  emptyCell: {
    textAlign: 'center',
    padding: '3rem 1rem',
    color: '#94A3B8',
    fontSize: '0.875rem',
  },
  loadingContainer: {
    padding: '4rem 1rem',
    textAlign: 'center',
    color: '#64748B',
  },
  spinner: {
    width: '32px',
    height: '32px',
    border: '3px solid #E2E8F0',
    borderTopColor: '#4CAF50',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
    margin: '0 auto 1rem',
  },
  paginationContainer: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: '1.25rem',
    paddingTop: '1rem',
    borderTop: '1px solid #E2E8F0',
  },
  paginationInfo: {
    fontSize: '0.8125rem',
    color: '#64748B',
  },
  paginationButtons: {
    display: 'flex',
    gap: '0.5rem',
  },
  modalBackdrop: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 999,
    padding: '1rem',
    backdropFilter: 'blur(4px)',
  },
  receiptModal: {
    width: '100%',
    maxWidth: '560px',
    maxHeight: '90vh',
    overflowY: 'auto',
    backgroundColor: '#FFFFFF',
    borderRadius: '16px',
    padding: '1.75rem',
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
  },
  receiptGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.875rem',
  },
  receiptRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: '0.5rem',
    borderBottom: '1px solid #F8FAFC',
    gap: '1rem',
  },
  receiptLabel: {
    fontSize: '0.8125rem',
    color: '#64748B',
    fontWeight: 500,
  },
  receiptVal: {
    fontSize: '0.8125rem',
    color: '#0F172A',
    fontWeight: 500,
    textAlign: 'right',
  },
  receiptValMono: {
    fontSize: '0.75rem',
    fontFamily: 'monospace',
    color: '#334155',
    backgroundColor: '#F1F5F9',
    padding: '2px 6px',
    borderRadius: '4px',
    wordBreak: 'break-all',
    textAlign: 'right',
  },
};

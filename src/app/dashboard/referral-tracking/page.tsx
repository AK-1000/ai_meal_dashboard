'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { 
  Link2, 
  Search, 
  Users, 
  DollarSign, 
  TrendingUp, 
  CheckCircle2, 
  Clock, 
  Award, 
  Tag, 
  Wallet, 
  ChevronLeft, 
  ChevronRight,
  Gift,
  ExternalLink,
  ShieldCheck,
  Filter,
  RotateCcw
} from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase-browser';

interface SponsorSummaryItem {
  id: string;
  name: string;
  type?: string;
  code_prefix: string;
  primary_code?: string;
  codes?: any[];
  commission_percentage: number;
  status: string;
  totalReferrals: number;
  activeUsers: number;
  paidReferrals: number;
  unpaidReferrals: number;
  unpaidCommission: number;
  paidCommission: number;
  totalCommission: number;
}

export default function ReferralTrackingPage() {
  const searchParams = useSearchParams();
  const initialSponsorParam = searchParams.get('sponsorId') || '';

  const [referrals, setReferrals] = useState<any[]>([]);
  const [sponsorSummary, setSponsorSummary] = useState<SponsorSummaryItem[]>([]);
  const [allSponsors, setAllSponsors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // Filters
  const [sponsorFilter, setSponsorFilter] = useState(initialSponsorParam);
  const [statusFilter, setStatusFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Active View Tab: 'overview' (How many per sponsor) or 'ledger' (Which specific users)
  const [activeTab, setActiveTab] = useState<'both' | 'overview' | 'ledger'>('both');

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const params = new URLSearchParams({
        page: String(page),
        limit: '15',
      });
      if (sponsorFilter) params.append('sponsorId', sponsorFilter);
      if (statusFilter) params.append('paymentStatus', statusFilter);
      if (debouncedSearch) params.append('search', debouncedSearch);

      const res = await fetch(`/api/referral-tracking?${params}`, {
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      });
      const data = await res.json();

      setReferrals(data.referrals || []);
      setSponsorSummary(data.sponsorSummary || []);
      setAllSponsors(data.allSponsors || data.sponsorSummary || []);
      setTotal(data.pagination?.total || 0);
      setTotalPages(data.pagination?.pages || 1);
    } catch (err) {
      console.error(err);
      toast.error('Error fetching referral tracking data.');
    } finally {
      setLoading(false);
    }
  }, [page, sponsorFilter, statusFilter, debouncedSearch]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Aggregate stats
  const totalAttributedUsers = sponsorSummary.reduce((sum, s) => sum + s.totalReferrals, 0);
  const totalActiveUsers = sponsorSummary.reduce((sum, s) => sum + (s.activeUsers || 0), 0);
  const totalUnpaidOwed = sponsorSummary.reduce((sum, s) => sum + (s.unpaidCommission || 0), 0);
  const totalPaidOut = sponsorSummary.reduce((sum, s) => sum + (s.paidCommission || 0), 0);

  const resetFilters = () => {
    setSponsorFilter('');
    setStatusFilter('');
    setSearchTerm('');
    setPage(1);
  };

  const selectedSponsorName = allSponsors.find(s => s.id === sponsorFilter)?.name;

  return (
    <div style={styles.container}>
      {/* Header */}
      <div className="flex-between">
        <div>
          <h1 className="title-large">Referral Tracking & Attribution</h1>
          <p style={styles.subtitle}>
            Monitor how many users used each sponsor's referral codes, view which specific users signed up, and manage owed commissions.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <Link href="/dashboard/sponsor-payments" className="btn btn-primary flex-center" style={{ gap: '0.5rem' }}>
            <Wallet size={16} />
            <span>Sponsor Payouts</span>
          </Link>
        </div>
      </div>

      {/* KPI Overview Grid */}
      <div style={styles.kpiGrid}>
        <div style={styles.kpiCard}>
          <div style={styles.kpiHeader}>
            <span style={styles.kpiTitle}>Total Referred Users</span>
            <div style={{ ...styles.kpiIcon, backgroundColor: 'rgba(33, 150, 243, 0.1)', color: '#2196F3' }}>
              <Users size={18} />
            </div>
          </div>
          <div style={styles.kpiValue}>{totalAttributedUsers}</div>
          <div style={styles.kpiSub}>Across all sponsor partners</div>
        </div>

        <div style={styles.kpiCard}>
          <div style={styles.kpiHeader}>
            <span style={styles.kpiTitle}>Active / Subscribed</span>
            <div style={{ ...styles.kpiIcon, backgroundColor: 'rgba(76, 175, 80, 0.1)', color: '#4CAF50' }}>
              <CheckCircle2 size={18} />
            </div>
          </div>
          <div style={{ ...styles.kpiValue, color: '#16A34A' }}>{totalActiveUsers}</div>
          <div style={styles.kpiSub}>Currently evaluating or paying</div>
        </div>

        <div style={styles.kpiCard}>
          <div style={styles.kpiHeader}>
            <span style={styles.kpiTitle}>Unpaid Commissions</span>
            <div style={{ ...styles.kpiIcon, backgroundColor: 'rgba(255, 152, 0, 0.1)', color: '#FF9800' }}>
              <Clock size={18} />
            </div>
          </div>
          <div style={{ ...styles.kpiValue, color: '#D97706' }}>${totalUnpaidOwed.toFixed(2)}</div>
          <div style={styles.kpiSub}>Ready for sponsor payout</div>
        </div>

        <div style={styles.kpiCard}>
          <div style={styles.kpiHeader}>
            <span style={styles.kpiTitle}>Total Paid to Date</span>
            <div style={{ ...styles.kpiIcon, backgroundColor: 'rgba(99, 102, 241, 0.1)', color: '#6366F1' }}>
              <TrendingUp size={18} />
            </div>
          </div>
          <div style={styles.kpiValue}>${totalPaidOut.toFixed(2)}</div>
          <div style={styles.kpiSub}>Historically settled commissions</div>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div style={styles.tabsRow}>
        <Link href="/dashboard/sponsors" style={styles.tabLink}>
          <Award size={15} />
          <span>Sponsors Directory</span>
        </Link>
        <Link href="/dashboard/promo-codes" style={styles.tabLink}>
          <Tag size={15} />
          <span>Referral Codes</span>
        </Link>
        <div style={styles.tabActivePill}>
          <Link2 size={15} />
          <span>Referral Tracking Ledger</span>
        </div>
        <Link href="/dashboard/sponsor-payments" style={styles.tabLink}>
          <Wallet size={15} />
          <span>Sponsor Payouts</span>
        </Link>
      </div>

      {/* SECTION 1: SPONSORS OVERVIEW (HOW MANY USERS) */}
      <div className="card" style={{ padding: '1.25rem', border: '1px solid #E2E8F0', borderRadius: '10px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div>
            <h3 className="title-medium" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Award size={18} color="#4CAF50" />
              <span>Sponsors Referral Breakdown (How Many Users)</span>
            </h3>
            <p style={{ fontSize: '0.8125rem', color: '#64748B', marginTop: '2px' }}>
              Total users attributed to each sponsor, active users, and unpaid commission balances.
            </p>
          </div>
          {sponsorFilter && (
            <button 
              className="btn btn-outline" 
              style={{ fontSize: '0.75rem', padding: '0.25rem 0.625rem' }}
              onClick={() => { setSponsorFilter(''); setPage(1); }}
            >
              Clear Filter: {selectedSponsorName} &times;
            </button>
          )}
        </div>

        <div className="table-container">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Sponsor Partner</th>
                <th>Primary Code</th>
                <th>Commission %</th>
                <th>Total Attributed</th>
                <th>Active Subscribers</th>
                <th>Commission Balance</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {sponsorSummary.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                    No sponsors found.
                  </td>
                </tr>
              ) : (
                sponsorSummary.map(s => {
                  const isSelected = sponsorFilter === s.id;
                  const primaryCode = s.primary_code || s.code_prefix || '—';

                  return (
                    <tr key={s.id} style={{ backgroundColor: isSelected ? 'rgba(76, 175, 80, 0.08)' : undefined }}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <strong>{s.name}</strong>
                          {s.type && (
                            <span className="badge" style={{ backgroundColor: '#F1F5F9', color: '#64748B', textTransform: 'capitalize', fontSize: '0.7rem' }}>
                              {s.type}
                            </span>
                          )}
                        </div>
                      </td>

                      <td>
                        <code style={{ fontFamily: 'monospace', fontWeight: 700, backgroundColor: '#F8FAFC', padding: '2px 6px', borderRadius: '4px', border: '1px solid #E2E8F0', fontSize: '0.85rem' }}>
                          {primaryCode}
                        </code>
                      </td>

                      <td>
                        <span style={{ fontWeight: 600, color: '#2563EB' }}>{s.commission_percentage}%</span>
                      </td>

                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Users size={14} color="#64748B" />
                          <strong style={{ fontSize: '0.95rem' }}>{s.totalReferrals}</strong>
                          <span style={{ fontSize: '0.75rem', color: '#64748B' }}>users</span>
                        </div>
                      </td>

                      <td>
                        <span className="badge badge-success" style={{ fontWeight: 600 }}>
                          {s.activeUsers || 0} active
                        </span>
                      </td>

                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          {s.unpaidCommission > 0 ? (
                            <span style={{ fontWeight: 700, color: '#D97706', fontSize: '0.875rem' }}>
                              ${s.unpaidCommission.toFixed(2)} Owed
                            </span>
                          ) : (
                            <span style={{ color: '#16A34A', fontSize: '0.8125rem', fontWeight: 600 }}>
                              Settled ($0 Owed)
                            </span>
                          )}
                          <span style={{ fontSize: '0.6875rem', color: '#94A3B8' }}>
                            ${(s.paidCommission || 0).toFixed(2)} paid total
                          </span>
                        </div>
                      </td>

                      <td>
                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', alignItems: 'center' }}>
                          <button
                            className="btn btn-outline"
                            style={{ 
                              fontSize: '0.75rem', 
                              padding: '0.25rem 0.625rem',
                              border: isSelected ? '2px solid #4CAF50' : '1px solid #CBD5E1',
                              backgroundColor: isSelected ? '#F0FDF4' : 'white',
                              color: isSelected ? '#166534' : '#334155',
                              fontWeight: isSelected ? 700 : 500
                            }}
                            onClick={() => {
                              setSponsorFilter(isSelected ? '' : s.id);
                              setPage(1);
                            }}
                          >
                            {isSelected ? 'Viewing Users' : 'View Users'}
                          </button>

                          {s.unpaidCommission > 0 && (
                            <Link
                              href={`/dashboard/sponsor-payments?sponsorId=${s.id}`}
                              className="btn btn-primary"
                              style={{ fontSize: '0.75rem', padding: '0.25rem 0.625rem', textDecoration: 'none' }}
                            >
                              Pay Now
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
      </div>

      {/* SECTION 2: DETAILED REFERRED USERS LEDGER (WHICH SPECIFIC USERS) */}
      <div className="card" style={{ padding: '1.25rem', border: '1px solid #E2E8F0', borderRadius: '10px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div>
            <h3 className="title-medium" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Users size={18} color="#2563EB" />
              <span>
                {selectedSponsorName 
                  ? `Referred Users for ${selectedSponsorName}` 
                  : 'Referred Users Ledger (Which Users)'}
              </span>
            </h3>
            <p style={{ fontSize: '0.8125rem', color: '#64748B', marginTop: '2px' }}>
              Full list of accounts registered with sponsor referral codes, trial days granted, and payment status.
            </p>
          </div>

          {/* Filter Toolbar */}
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', width: '220px' }}>
              <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="text"
                placeholder="Search by user email or name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input-field"
                style={{ paddingLeft: '32px', fontSize: '0.8125rem', padding: '0.375rem 0.5rem 0.375rem 32px' }}
              />
            </div>

            <select
              className="input-field"
              value={sponsorFilter}
              onChange={(e) => { setSponsorFilter(e.target.value); setPage(1); }}
              style={{ fontSize: '0.8125rem', padding: '0.375rem 0.5rem', width: '180px' }}
            >
              <option value="">All Sponsors</option>
              {allSponsors.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>

            <select
              className="input-field"
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              style={{ fontSize: '0.8125rem', padding: '0.375rem 0.5rem', width: '120px' }}
            >
              <option value="">All Payouts</option>
              <option value="unpaid">Unpaid</option>
              <option value="paid">Paid</option>
            </select>

            {(sponsorFilter || statusFilter || searchTerm) && (
              <button
                className="btn btn-outline flex-center"
                style={{ fontSize: '0.8125rem', padding: '0.375rem 0.625rem', gap: '4px' }}
                onClick={resetFilters}
                title="Reset filters"
              >
                <RotateCcw size={13} />
                <span>Reset</span>
              </button>
            )}
          </div>
        </div>

        {/* Ledger Table */}
        {loading ? (
          <div style={styles.loadingContainer}>
            <div style={styles.spinner}></div>
            <p>Loading referred users...</p>
          </div>
        ) : (
          <>
            <div className="table-container">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Referred User</th>
                    <th>Sponsor Partner</th>
                    <th>Referral Code Used</th>
                    <th>Trial Granted</th>
                    <th>Current Status</th>
                    <th>Commission</th>
                    <th>Payout Status</th>
                    <th>Registered Date</th>
                  </tr>
                </thead>
                <tbody>
                  {referrals.length === 0 ? (
                    <tr>
                      <td colSpan={8} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
                        No referred users found matching the selected filters.
                      </td>
                    </tr>
                  ) : (
                    referrals.map((ref) => {
                      const user = ref.users;
                      const sponsor = ref.sponsors;
                      const promoCode = ref.promo_codes;
                      const freeDays = promoCode?.free_days || sponsor?.default_free_days || 7;

                      const isSubActive = user?.subscription_status === 'active';
                      const isTrialActive = user?.subscription_status === 'trialing' || user?.trial_status === 'active';
                      const isExpired = user?.trial_status === 'expired' || user?.subscription_status === 'expired';

                      return (
                        <tr key={ref.id}>
                          {/* User Details */}
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <div style={styles.userAvatar}>
                                {(user?.name || user?.email || 'U').charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <div style={{ fontWeight: 600, color: '#0F172A', fontSize: '0.875rem' }}>
                                  {user?.name || 'User'}
                                </div>
                                <div style={{ fontSize: '0.75rem', color: '#64748B' }}>
                                  {user?.email || 'No email'}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Sponsor Partner */}
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <Award size={14} color="#4CAF50" />
                              <span style={{ fontWeight: 600, color: '#0F172A' }}>
                                {sponsor?.name || 'Unknown Sponsor'}
                              </span>
                            </div>
                          </td>

                          {/* Code Used */}
                          <td>
                            <code style={{ fontFamily: 'monospace', fontWeight: 700, backgroundColor: '#F8FAFC', padding: '2px 6px', borderRadius: '4px', border: '1px solid #E2E8F0', color: '#2563EB', fontSize: '0.85rem' }}>
                              {promoCode?.code || sponsor?.code_prefix || '—'}
                            </code>
                          </td>

                          {/* Trial Granted */}
                          <td>
                            <span className="badge" style={{ backgroundColor: '#F0FDF4', color: '#166534', border: '1px solid #BBF7D0', fontWeight: 600 }}>
                              <Gift size={12} style={{ marginRight: '4px' }} />
                              {freeDays} Days Pro Trial
                            </span>
                          </td>

                          {/* User Current Status */}
                          <td>
                            {isSubActive ? (
                              <span className="badge badge-success">Active Pro</span>
                            ) : isTrialActive ? (
                              <span className="badge badge-warning">In Pro Trial</span>
                            ) : isExpired ? (
                              <span className="badge badge-error">Trial Expired</span>
                            ) : (
                              <span className="badge" style={{ backgroundColor: '#F1F5F9', color: '#64748B' }}>
                                {user?.subscription_status || 'Registered'}
                              </span>
                            )}
                          </td>

                          {/* Commission */}
                          <td>
                            <span style={{ fontWeight: 700, color: '#0F172A', fontSize: '0.875rem' }}>
                              ${Number(ref.commission_amount || 0).toFixed(2)}
                            </span>
                          </td>

                          {/* Payout Status */}
                          <td>
                            {ref.payment_status === 'paid' ? (
                              <span className="badge badge-success">Paid</span>
                            ) : (
                              <span className="badge badge-warning">Unpaid</span>
                            )}
                          </td>

                          {/* Registered Date */}
                          <td style={{ fontSize: '0.8125rem', color: '#64748B' }}>
                            {new Date(ref.created_at).toLocaleDateString()}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div style={styles.pagination}>
                <button
                  className="btn btn-outline"
                  disabled={page <= 1}
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                >
                  <ChevronLeft size={16} />
                  <span>Previous</span>
                </button>
                <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                  Page {page} of {totalPages} ({total} referred accounts)
                </span>
                <button
                  className="btn btn-outline"
                  disabled={page >= totalPages}
                  onClick={() => setPage(p => p + 1)}
                >
                  <span>Next</span>
                  <ChevronRight size={16} />
                </button>
              </div>
            )}
          </>
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
  },
  subtitle: {
    fontSize: '0.875rem',
    color: '#64748B',
    marginTop: '0.25rem',
  },
  kpiGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
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
  tabsRow: {
    display: 'flex',
    gap: '0.5rem',
    borderBottom: '1px solid #E2E8F0',
    paddingBottom: '0.5rem'
  },
  tabActivePill: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.375rem',
    padding: '0.5rem 1rem',
    borderRadius: '6px',
    backgroundColor: '#E2E8F0',
    color: '#0F172A',
    fontWeight: 600,
    fontSize: '0.8125rem'
  },
  tabLink: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.375rem',
    padding: '0.5rem 1rem',
    borderRadius: '6px',
    color: '#64748B',
    fontWeight: 500,
    fontSize: '0.8125rem',
    textDecoration: 'none',
    transition: 'all 0.15s ease'
  },
  userAvatar: {
    width: '28px',
    height: '28px',
    borderRadius: '50%',
    backgroundColor: '#E0F2FE',
    color: '#0369A1',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 700,
    fontSize: '0.75rem'
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
  pagination: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: '1rem',
  }
};

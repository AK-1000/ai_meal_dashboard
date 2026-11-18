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
  AlertTriangle,
  XCircle,
  ShieldCheck,
  ShieldAlert,
  RotateCcw,
  Sparkles
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
  paidCount: number;
  inTrialCount: number;
  expiredCount: number;
  conversionRate: number;
  qualityStatus: 'high_performing' | 'active_converting' | 'evaluating_trials' | 'scam_risk' | 'no_traffic';
  qualityReason: string;
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
  const [conversionStats, setConversionStats] = useState({
    totalReferred: 0,
    paidConverted: 0,
    inTrial: 0,
    expiredUnconverted: 0,
    conversionRate: 0,
  });
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // Filters
  const [sponsorFilter, setSponsorFilter] = useState(initialSponsorParam);
  const [statusFilter, setStatusFilter] = useState('');
  const [conversionStageFilter, setConversionStageFilter] = useState<'all' | 'paid_converted' | 'in_trial' | 'expired_unconverted'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

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
      if (conversionStageFilter && conversionStageFilter !== 'all') {
        params.append('conversionStage', conversionStageFilter);
      }
      if (debouncedSearch) params.append('search', debouncedSearch);

      const res = await fetch(`/api/referral-tracking?${params}`, {
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      });
      const data = await res.json();

      setReferrals(data.referrals || []);
      setSponsorSummary(data.sponsorSummary || []);
      setAllSponsors(data.allSponsors || data.sponsorSummary || []);
      if (data.conversionStats) setConversionStats(data.conversionStats);
      setTotal(data.pagination?.total || 0);
      setTotalPages(data.pagination?.pages || 1);
    } catch (err) {
      console.error(err);
      toast.error('Error fetching referral tracking data.');
    } finally {
      setLoading(false);
    }
  }, [page, sponsorFilter, statusFilter, conversionStageFilter, debouncedSearch]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Aggregate stats
  const totalUnpaidOwed = sponsorSummary.reduce((sum, s) => sum + (s.unpaidCommission || 0), 0);
  const selectedSponsorName = allSponsors.find(s => s.id === sponsorFilter)?.name;

  const resetFilters = () => {
    setSponsorFilter('');
    setStatusFilter('');
    setConversionStageFilter('all');
    setSearchTerm('');
    setPage(1);
  };

  return (
    <div style={styles.container}>
      {/* Header */}
      <div className="flex-between">
        <div>
          <h1 className="title-large">Referral Tracking & Traffic Quality</h1>
          <p style={styles.subtitle}>
            Detect which sponsors bring real paying subscribers versus churned/fake traffic, track active trials, and manage commissions.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <Link href="/dashboard/sponsor-payments" className="btn btn-primary flex-center" style={{ gap: '0.5rem' }}>
            <Wallet size={16} />
            <span>Sponsor Payouts</span>
          </Link>
        </div>
      </div>

      {/* KPI Overview Grid with Conversion Funnel */}
      <div style={styles.kpiGrid}>
        {/* Total Referred */}
        <div style={styles.kpiCard}>
          <div style={styles.kpiHeader}>
            <span style={styles.kpiTitle}>Total Referred Signups</span>
            <div style={{ ...styles.kpiIcon, backgroundColor: 'rgba(33, 150, 243, 0.1)', color: '#2196F3' }}>
              <Users size={18} />
            </div>
          </div>
          <div style={styles.kpiValue}>{conversionStats.totalReferred}</div>
          <div style={styles.kpiSub}>Registered via all sponsor codes</div>
        </div>

        {/* Paid / Converted After Trial */}
        <div style={styles.kpiCard}>
          <div style={styles.kpiHeader}>
            <span style={styles.kpiTitle}>Paid After Trial</span>
            <div style={{ ...styles.kpiIcon, backgroundColor: 'rgba(76, 175, 80, 0.1)', color: '#4CAF50' }}>
              <CheckCircle2 size={18} />
            </div>
          </div>
          <div style={{ ...styles.kpiValue, color: '#16A34A' }}>{conversionStats.paidConverted}</div>
          <div style={styles.kpiSub}>Real paying subscribers converted</div>
        </div>

        {/* Currently in Trial */}
        <div style={styles.kpiCard}>
          <div style={styles.kpiHeader}>
            <span style={styles.kpiTitle}>Evaluating in Trial</span>
            <div style={{ ...styles.kpiIcon, backgroundColor: 'rgba(255, 152, 0, 0.1)', color: '#FF9800' }}>
              <Clock size={18} />
            </div>
          </div>
          <div style={{ ...styles.kpiValue, color: '#D97706' }}>{conversionStats.inTrial}</div>
          <div style={styles.kpiSub}>Active trials (not yet expired)</div>
        </div>

        {/* Expired / Never Paid */}
        <div style={styles.kpiCard}>
          <div style={styles.kpiHeader}>
            <span style={styles.kpiTitle}>Expired (Never Paid)</span>
            <div style={{ ...styles.kpiIcon, backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#EF4444' }}>
              <XCircle size={18} />
            </div>
          </div>
          <div style={{ ...styles.kpiValue, color: '#DC2626' }}>{conversionStats.expiredUnconverted}</div>
          <div style={styles.kpiSub}>Dropped off without subscribing</div>
        </div>

        {/* Overall Conversion Rate */}
        <div style={styles.kpiCard}>
          <div style={styles.kpiHeader}>
            <span style={styles.kpiTitle}>Overall Conversion</span>
            <div style={{ ...styles.kpiIcon, backgroundColor: 'rgba(99, 102, 241, 0.1)', color: '#6366F1' }}>
              <TrendingUp size={18} />
            </div>
          </div>
          <div style={{ ...styles.kpiValue, color: '#4F46E5' }}>{conversionStats.conversionRate}%</div>
          <div style={styles.kpiSub}>
            {conversionStats.conversionRate > 0 ? 'Healthy referral conversion' : 'High trial churn rate'}
          </div>
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
          <span>Referral Tracking & Traffic Quality</span>
        </div>
        <Link href="/dashboard/sponsor-payments" style={styles.tabLink}>
          <Wallet size={15} />
          <span>Sponsor Payouts</span>
        </Link>
      </div>

      {/* SECTION 1: SPONSORS OVERVIEW & TRAFFIC QUALITY AUDIT */}
      <div className="card" style={{ padding: '1.25rem', border: '1px solid #E2E8F0', borderRadius: '10px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div>
            <h3 className="title-medium" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <ShieldCheck size={18} color="#4CAF50" />
              <span>Sponsor Quality & Conversion Audit (Active vs Scam Detection)</span>
            </h3>
            <p style={{ fontSize: '0.8125rem', color: '#64748B', marginTop: '2px' }}>
              Examine each sponsor's conversion rate to verify whether their referrals convert to paid plans or churn immediately after the free trial.
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
                <th>Total Signups</th>
                <th>Paid Post-Trial</th>
                <th>In Trial</th>
                <th>Expired (Never Paid)</th>
                <th>Conversion Rate & Quality Audit</th>
                <th>Owed Balance</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {sponsorSummary.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                    No sponsors registered yet.
                  </td>
                </tr>
              ) : (
                sponsorSummary.map(s => {
                  const isSelected = sponsorFilter === s.id;
                  const primaryCode = s.primary_code || s.code_prefix || '—';

                  return (
                    <tr key={s.id} style={{ backgroundColor: isSelected ? 'rgba(76, 175, 80, 0.08)' : undefined }}>
                      {/* Sponsor Name */}
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <strong style={{ color: '#0F172A', fontSize: '0.9375rem' }}>{s.name}</strong>
                          {s.type && (
                            <span className="badge" style={{ backgroundColor: '#F1F5F9', color: '#64748B', textTransform: 'capitalize', fontSize: '0.7rem' }}>
                              {s.type}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Primary Code */}
                      <td>
                        <code style={{ fontFamily: 'monospace', fontWeight: 700, backgroundColor: '#F8FAFC', padding: '2px 6px', borderRadius: '4px', border: '1px solid #E2E8F0', fontSize: '0.85rem' }}>
                          {primaryCode}
                        </code>
                      </td>

                      {/* Total Signups */}
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Users size={14} color="#64748B" />
                          <strong style={{ fontSize: '0.95rem', color: '#0F172A' }}>{s.totalReferrals}</strong>
                          <span style={{ fontSize: '0.75rem', color: '#64748B' }}>users</span>
                        </div>
                      </td>

                      {/* Paid Post-Trial */}
                      <td>
                        {s.paidCount > 0 ? (
                          <span className="badge" style={{ backgroundColor: '#DCFCE7', color: '#15803D', fontWeight: 700, border: '1px solid #BBF7D0' }}>
                            <CheckCircle2 size={12} style={{ marginRight: '4px' }} />
                            {s.paidCount} Paid
                          </span>
                        ) : (
                          <span style={{ fontSize: '0.8125rem', color: '#94A3B8', fontWeight: 500 }}>0 paid</span>
                        )}
                      </td>

                      {/* In Trial */}
                      <td>
                        {s.inTrialCount > 0 ? (
                          <span className="badge" style={{ backgroundColor: '#FEF3C7', color: '#B45309', fontWeight: 600, border: '1px solid #FDE68A' }}>
                            <Clock size={12} style={{ marginRight: '4px' }} />
                            {s.inTrialCount} in trial
                          </span>
                        ) : (
                          <span style={{ fontSize: '0.8125rem', color: '#94A3B8' }}>0 active</span>
                        )}
                      </td>

                      {/* Expired (Never Paid) */}
                      <td>
                        {s.expiredCount > 0 ? (
                          <span className="badge" style={{ backgroundColor: '#FEE2E2', color: '#B91C1C', fontWeight: 600, border: '1px solid #FECACA' }}>
                            <XCircle size={12} style={{ marginRight: '4px' }} />
                            {s.expiredCount} dropped
                          </span>
                        ) : (
                          <span style={{ fontSize: '0.8125rem', color: '#94A3B8' }}>0</span>
                        )}
                      </td>

                      {/* Quality & Scam Audit Badge */}
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          {s.qualityStatus === 'scam_risk' ? (
                            <span 
                              className="badge" 
                              style={{ 
                                backgroundColor: '#FEF2F2', 
                                color: '#991B1B', 
                                border: '1px solid #F87171', 
                                fontWeight: 700, 
                                fontSize: '0.75rem',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                width: 'fit-content'
                              }}
                              title="100% of completed trials expired without converting to a paid subscription"
                            >
                              <ShieldAlert size={13} color="#DC2626" />
                              <span>0% Conversion (Scam / Fake Risk)</span>
                            </span>
                          ) : s.qualityStatus === 'high_performing' ? (
                            <span 
                              className="badge" 
                              style={{ 
                                backgroundColor: '#F0FDF4', 
                                color: '#166534', 
                                border: '1px solid #86EFAC', 
                                fontWeight: 700, 
                                fontSize: '0.75rem',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                width: 'fit-content'
                              }}
                            >
                              <Sparkles size={13} color="#16A34A" />
                              <span>{s.conversionRate}% High Quality</span>
                            </span>
                          ) : s.qualityStatus === 'active_converting' ? (
                            <span 
                              className="badge badge-success" 
                              style={{ fontWeight: 600, fontSize: '0.75rem', width: 'fit-content' }}
                            >
                              {s.conversionRate}% Converted
                            </span>
                          ) : s.qualityStatus === 'evaluating_trials' ? (
                            <span 
                              className="badge" 
                              style={{ backgroundColor: '#EFF6FF', color: '#1D4ED8', border: '1px solid #BFDBFE', fontWeight: 600, fontSize: '0.75rem', width: 'fit-content' }}
                            >
                              Evaluating Trials
                            </span>
                          ) : (
                            <span style={{ fontSize: '0.75rem', color: '#94A3B8' }}>No traffic</span>
                          )}
                          <span style={{ fontSize: '0.6875rem', color: '#64748B' }}>{s.qualityReason}</span>
                        </div>
                      </td>

                      {/* Commission Balance */}
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          {s.unpaidCommission > 0 ? (
                            <span style={{ fontWeight: 700, color: '#D97706', fontSize: '0.875rem' }}>
                              ${s.unpaidCommission.toFixed(2)} Owed
                            </span>
                          ) : (
                            <span style={{ color: '#16A34A', fontSize: '0.8125rem', fontWeight: 600 }}>
                              Settled ($0)
                            </span>
                          )}
                          <span style={{ fontSize: '0.6875rem', color: '#94A3B8' }}>
                            ${(s.paidCommission || 0).toFixed(2)} paid total
                          </span>
                        </div>
                      </td>

                      {/* Actions */}
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

      {/* SECTION 2: DETAILED REFERRED USERS LEDGER (WHICH SPECIFIC USERS PAID VS REMAINED) */}
      <div className="card" style={{ padding: '1.25rem', border: '1px solid #E2E8F0', borderRadius: '10px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div>
            <h3 className="title-medium" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Users size={18} color="#2563EB" />
              <span>
                {selectedSponsorName 
                  ? `Referred Users for ${selectedSponsorName}` 
                  : 'Referred Users Ledger (Paid Subscribers vs In-Trial vs Expired)'}
              </span>
            </h3>
            <p style={{ fontSize: '0.8125rem', color: '#64748B', marginTop: '2px' }}>
              Inspect individual referred users to see who converted into a paying subscriber, who remains in trial, and who dropped out.
            </p>
          </div>

          {/* Quick Filter Chips: All, Paid, In Trial, Expired */}
          <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap' }}>
            <button
              className="btn btn-outline"
              style={{
                fontSize: '0.75rem',
                padding: '0.3rem 0.625rem',
                border: conversionStageFilter === 'all' ? '2px solid #2563EB' : '1px solid #CBD5E1',
                backgroundColor: conversionStageFilter === 'all' ? '#EFF6FF' : '#FFFFFF',
                color: conversionStageFilter === 'all' ? '#1D4ED8' : '#334155',
                fontWeight: conversionStageFilter === 'all' ? 700 : 500
              }}
              onClick={() => { setConversionStageFilter('all'); setPage(1); }}
            >
              All Users ({conversionStats.totalReferred})
            </button>

            <button
              className="btn btn-outline"
              style={{
                fontSize: '0.75rem',
                padding: '0.3rem 0.625rem',
                border: conversionStageFilter === 'paid_converted' ? '2px solid #16A34A' : '1px solid #CBD5E1',
                backgroundColor: conversionStageFilter === 'paid_converted' ? '#F0FDF4' : '#FFFFFF',
                color: conversionStageFilter === 'paid_converted' ? '#15803D' : '#334155',
                fontWeight: conversionStageFilter === 'paid_converted' ? 700 : 500
              }}
              onClick={() => { setConversionStageFilter('paid_converted'); setPage(1); }}
            >
              Paid After Trial ({conversionStats.paidConverted})
            </button>

            <button
              className="btn btn-outline"
              style={{
                fontSize: '0.75rem',
                padding: '0.3rem 0.625rem',
                border: conversionStageFilter === 'in_trial' ? '2px solid #D97706' : '1px solid #CBD5E1',
                backgroundColor: conversionStageFilter === 'in_trial' ? '#FFFBEB' : '#FFFFFF',
                color: conversionStageFilter === 'in_trial' ? '#B45309' : '#334155',
                fontWeight: conversionStageFilter === 'in_trial' ? 700 : 500
              }}
              onClick={() => { setConversionStageFilter('in_trial'); setPage(1); }}
            >
              In Trial / Remained ({conversionStats.inTrial})
            </button>

            <button
              className="btn btn-outline"
              style={{
                fontSize: '0.75rem',
                padding: '0.3rem 0.625rem',
                border: conversionStageFilter === 'expired_unconverted' ? '2px solid #DC2626' : '1px solid #CBD5E1',
                backgroundColor: conversionStageFilter === 'expired_unconverted' ? '#FEF2F2' : '#FFFFFF',
                color: conversionStageFilter === 'expired_unconverted' ? '#B91C1C' : '#334155',
                fontWeight: conversionStageFilter === 'expired_unconverted' ? 700 : 500
              }}
              onClick={() => { setConversionStageFilter('expired_unconverted'); setPage(1); }}
            >
              Trial Expired / Never Paid ({conversionStats.expiredUnconverted})
            </button>
          </div>
        </div>

        {/* Filter Toolbar */}
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', width: '240px' }}>
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
            style={{ fontSize: '0.8125rem', padding: '0.375rem 0.5rem', width: '130px' }}
          >
            <option value="">All Commission Status</option>
            <option value="unpaid">Unpaid</option>
            <option value="paid">Paid</option>
          </select>

          {(sponsorFilter || statusFilter || conversionStageFilter !== 'all' || searchTerm) && (
            <button
              className="btn btn-outline flex-center"
              style={{ fontSize: '0.8125rem', padding: '0.375rem 0.625rem', gap: '4px' }}
              onClick={resetFilters}
              title="Reset all filters"
            >
              <RotateCcw size={13} />
              <span>Reset</span>
            </button>
          )}
        </div>

        {/* Ledger Table */}
        {loading ? (
          <div style={styles.loadingContainer}>
            <div style={styles.spinner}></div>
            <p>Loading referred accounts...</p>
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
                    <th>Conversion Lifecycle</th>
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
                      const stage = ref.conversion_stage;

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
                              {freeDays} Days Trial
                            </span>
                          </td>

                          {/* Conversion Lifecycle Stage */}
                          <td>
                            {stage === 'paid_converted' ? (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                <span 
                                  className="badge" 
                                  style={{ 
                                    backgroundColor: '#DCFCE7', 
                                    color: '#15803D', 
                                    border: '1px solid #86EFAC', 
                                    fontWeight: 700,
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    width: 'fit-content'
                                  }}
                                >
                                  <CheckCircle2 size={12} color="#16A34A" />
                                  <span>Paid Post-Trial ({user?.subscription_tier?.toUpperCase() || 'PRO'})</span>
                                </span>
                                <span style={{ fontSize: '0.6875rem', color: '#166534', fontWeight: 500 }}>
                                  Active Paid Subscriber
                                </span>
                              </div>
                            ) : stage === 'in_trial' ? (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                <span 
                                  className="badge" 
                                  style={{ 
                                    backgroundColor: '#FEF3C7', 
                                    color: '#B45309', 
                                    border: '1px solid #FDE68A', 
                                    fontWeight: 600,
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    width: 'fit-content'
                                  }}
                                >
                                  <Clock size={12} color="#D97706" />
                                  <span>In Trial ({ref.trial_days_left ?? 0}d left)</span>
                                </span>
                                <span style={{ fontSize: '0.6875rem', color: '#92400E' }}>
                                  Remains in evaluation
                                </span>
                              </div>
                            ) : (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                <span 
                                  className="badge" 
                                  style={{ 
                                    backgroundColor: '#FEE2E2', 
                                    color: '#991B1B', 
                                    border: '1px solid #FCA5A5', 
                                    fontWeight: 600,
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    width: 'fit-content'
                                  }}
                                >
                                  <XCircle size={12} color="#DC2626" />
                                  <span>Trial Expired (Never Paid)</span>
                                </span>
                                <span style={{ fontSize: '0.6875rem', color: '#B91C1C' }}>
                                  Did not convert after free trial
                                </span>
                              </div>
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
                  Page {page} of {totalPages} ({total} accounts)
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
    gridTemplateColumns: 'repeat(5, 1fr)',
    gap: '0.875rem',
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

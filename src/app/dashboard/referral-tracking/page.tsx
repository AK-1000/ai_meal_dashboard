'use client';

import React, { useEffect, useState } from 'react';
import { Link2, Search, Filter, Users, DollarSign, TrendingUp, CheckCircle2, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase-browser';

interface SponsorSummary {
  id: string;
  name: string;
  code_prefix: string;
  commission_percentage: number;
  status: string;
  totalReferrals: number;
  paidReferrals: number;
  unpaidReferrals: number;
}

export default function ReferralTrackingPage() {
  const [referrals, setReferrals] = useState<any[]>([]);
  const [sponsorSummary, setSponsorSummary] = useState<SponsorSummary[]>([]);
  const [allSponsors, setAllSponsors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // Filters
  const [sponsorFilter, setSponsorFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [search, setSearch] = useState('');

  const fetchData = async () => {
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
      if (dateFrom) params.append('dateFrom', dateFrom);
      if (dateTo) params.append('dateTo', dateTo);
      if (search) params.append('search', search);

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
      toast.error('Error fetching referral data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [page, sponsorFilter, statusFilter, dateFrom, dateTo]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchData();
  };

  const totalReferrals = sponsorSummary.reduce((sum, s) => sum + s.totalReferrals, 0);
  const totalUnpaid = sponsorSummary.reduce((sum, s) => sum + s.unpaidReferrals, 0);
  const totalPaid = sponsorSummary.reduce((sum, s) => sum + s.paidReferrals, 0);

  return (
    <div style={styles.container}>
      <div className="flex-between">
        <div>
          <h1 className="title-large">Referral Tracking</h1>
          <p style={styles.subtitle}>Track referrals per sponsor, view commission status, and monitor usage</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div style={styles.summaryGrid}>
        <div className="card" style={styles.summaryCard}>
          <div style={styles.summaryIcon}>
            <Users size={22} style={{ color: 'var(--primary)' }} />
          </div>
          <div>
            <p style={styles.summaryLabel}>Total Referrals</p>
            <h3 style={styles.summaryValue}>{totalReferrals}</h3>
          </div>
        </div>
        <div className="card" style={styles.summaryCard}>
          <div style={{ ...styles.summaryIcon, backgroundColor: 'rgba(34, 197, 94, 0.1)' }}>
            <CheckCircle2 size={22} style={{ color: '#22C55E' }} />
          </div>
          <div>
            <p style={styles.summaryLabel}>Paid</p>
            <h3 style={styles.summaryValue}>{totalPaid}</h3>
          </div>
        </div>
        <div className="card" style={styles.summaryCard}>
          <div style={{ ...styles.summaryIcon, backgroundColor: 'rgba(245, 158, 11, 0.1)' }}>
            <Clock size={22} style={{ color: '#F59E0B' }} />
          </div>
          <div>
            <p style={styles.summaryLabel}>Unpaid</p>
            <h3 style={styles.summaryValue}>{totalUnpaid}</h3>
          </div>
        </div>
        <div className="card" style={styles.summaryCard}>
          <div style={{ ...styles.summaryIcon, backgroundColor: 'rgba(99, 102, 241, 0.1)' }}>
            <TrendingUp size={22} style={{ color: '#6366F1' }} />
          </div>
          <div>
            <p style={styles.summaryLabel}>Total Sponsors</p>
            <h3 style={styles.summaryValue}>{allSponsors.length}</h3>
          </div>
        </div>
      </div>

      {/* Sponsor Breakdown */}
      {sponsorSummary.length > 0 && (
        <div className="card">
          <h3 className="title-medium" style={{ marginBottom: '1rem' }}>Sponsor Breakdown</h3>
          <div className="table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Sponsor</th>
                  <th>Code Prefix</th>
                  <th>Commission %</th>
                  <th>Status</th>
                  <th>Total Referrals</th>
                  <th>Paid</th>
                  <th>Unpaid</th>
                </tr>
              </thead>
              <tbody>
                {sponsorSummary.map(s => (
                  <tr key={s.id}>
                    <td><strong>{s.name}</strong></td>
                    <td><code style={{ fontSize: '0.85rem' }}>{s.code_prefix || '—'}</code></td>
                    <td>{s.commission_percentage}%</td>
                    <td>
                      {s.status === 'active' ? (
                        <span className="badge badge-success">Active</span>
                      ) : (
                        <span className="badge badge-error">Inactive</span>
                      )}
                    </td>
                    <td>{s.totalReferrals}</td>
                    <td><span className="badge badge-success">{s.paidReferrals}</span></td>
                    <td><span className="badge badge-warning">{s.unpaidReferrals}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="card" style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'flex-end' }}>
        <div className="form-group" style={{ flex: '1 1 200px', marginBottom: 0 }}>
          <label className="form-label">Sponsor</label>
          <select className="input-field" value={sponsorFilter} onChange={(e) => { setSponsorFilter(e.target.value); setPage(1); }}>
            <option value="">All Sponsors</option>
            {allSponsors.map(s => (
              <option key={s.id} value={s.id}>
                {s.name} {s.status ? `(${s.status})` : ''}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group" style={{ flex: '1 1 150px', marginBottom: 0 }}>
          <label className="form-label">Status</label>
          <select className="input-field" value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}>
            <option value="">All</option>
            <option value="unpaid">Unpaid</option>
            <option value="paid">Paid</option>
          </select>
        </div>

        <div className="form-group" style={{ flex: '1 1 150px', marginBottom: 0 }}>
          <label className="form-label">From Date</label>
          <input type="date" className="input-field" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setPage(1); }} />
        </div>

        <div className="form-group" style={{ flex: '1 1 150px', marginBottom: 0 }}>
          <label className="form-label">To Date</label>
          <input type="date" className="input-field" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setPage(1); }} />
        </div>

        <form onSubmit={handleSearch} className="form-group" style={{ flex: '1 1 200px', marginBottom: 0 }}>
          <label className="form-label">Search</label>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <input type="text" className="input-field" placeholder="User email..." value={search} onChange={(e) => setSearch(e.target.value)} />
            <button type="submit" className="btn btn-primary" style={{ padding: '0.5rem 0.75rem' }}>
              <Search size={16} />
            </button>
          </div>
        </form>
      </div>

      {/* Referrals Table */}
      {loading ? (
        <div style={styles.loadingContainer}>
          <div style={styles.spinner}></div>
          <p>Loading referrals...</p>
        </div>
      ) : (
        <>
          <div className="table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Sponsor</th>
                  <th>Code Used</th>
                  <th>Type</th>
                  <th>Commission</th>
                  <th>Status</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {referrals.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
                      No referrals found matching the current filters.
                    </td>
                  </tr>
                ) : (
                  referrals.map((ref) => (
                    <tr key={ref.id}>
                      <td>
                        <div>
                          <strong>{ref.users?.name || 'Unknown'}</strong>
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{ref.users?.email}</div>
                        </div>
                      </td>
                      <td>{ref.sponsors?.name || '—'}</td>
                      <td><code style={{ fontSize: '0.85rem', color: 'var(--primary)' }}>{ref.promo_codes?.code || '—'}</code></td>
                      <td>
                        <span className={`badge ${ref.referral_type === 'signup' ? 'badge-info' : 'badge-success'}`}>
                          {ref.referral_type}
                        </span>
                      </td>
                      <td>${Number(ref.commission_amount).toFixed(2)}</td>
                      <td>
                        {ref.payment_status === 'paid' ? (
                          <span className="badge badge-success">Paid</span>
                        ) : (
                          <span className="badge badge-warning">Unpaid</span>
                        )}
                      </td>
                      <td style={{ fontSize: '0.85rem' }}>{new Date(ref.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))
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
                Previous
              </button>
              <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                Page {page} of {totalPages} ({total} referrals)
              </span>
              <button
                className="btn btn-outline"
                disabled={page >= totalPages}
                onClick={() => setPage(p => p + 1)}
              >
                Next
              </button>
            </div>
          )}
        </>
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
  summaryGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '1rem',
  },
  summaryCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    padding: '1.25rem',
  },
  summaryIcon: {
    width: '48px',
    height: '48px',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    flexShrink: 0,
  },
  summaryLabel: {
    fontSize: '0.8rem',
    color: 'var(--text-secondary)',
    marginBottom: '0.25rem',
    fontWeight: 500,
  },
  summaryValue: {
    fontSize: '1.5rem',
    fontWeight: 700,
    color: 'var(--text-dark)',
    margin: 0,
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
  pagination: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '1.5rem',
  },
};

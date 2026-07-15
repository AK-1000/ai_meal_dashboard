'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Search, ShieldAlert, RotateCcw, ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase-browser';

export default function PaymentsPage() {
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, pages: 1, limit: 10 });
  const [refundingId, setRefundingId] = useState<string | null>(null);

  const fetchPayments = useCallback(async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: '10',
        search,
        status
      });

      const res = await fetch(`/api/payments?${queryParams.toString()}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (res.ok) {
        const data = await res.json();
        setPayments(data.payments || []);
        setPagination(data.pagination);
      } else {
        toast.error('Failed to load transaction history.');
      }
    } catch (err) {
      console.error(err);
      toast.error('Error fetching transactions.');
    } finally {
      setLoading(false);
    }
  }, [page, search, status]);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchPayments();
  };

  const handleResetFilters = () => {
    setSearch('');
    setStatus('');
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
      <div className="flex-between">
        <div>
          <h1 className="title-large">Payment History</h1>
          <p style={styles.subtitle}>Track app store purchases, Areeba checkouts and process manual database refunds</p>
        </div>
        <button className="btn btn-outline" onClick={fetchPayments} style={{ padding: '0.5rem 0.75rem' }}>
          <RefreshCw size={16} />
        </button>
      </div>

      {/* Filter / Search card */}
      <div className="card" style={styles.filterCard}>
        <form onSubmit={handleSearchSubmit} style={styles.filterForm}>
          <div style={styles.searchContainer}>
            <Search size={18} style={styles.searchIcon} />
            <input
              type="text"
              placeholder="Search by user email or name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={styles.searchInput}
            />
          </div>

          <div style={styles.selectsContainer}>
            <select
              value={status}
              onChange={(e) => { setStatus(e.target.value); setPage(1); }}
              className="input-field"
              style={styles.select}
            >
              <option value="">All Statuses</option>
              <option value="succeeded">Success</option>
              <option value="failed">Failed</option>
              <option value="refunded">Refunded</option>
            </select>

            <button type="submit" className="btn btn-primary">Search</button>
            <button type="button" className="btn btn-outline" onClick={handleResetFilters}>Reset</button>
          </div>
        </form>
      </div>

      {/* Listing Table */}
      {loading ? (
        <div style={styles.loadingContainer}>
          <div style={styles.spinner}></div>
          <p>Loading transactions...</p>
        </div>
      ) : (
        <>
          <div className="table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Date & Time</th>
                  <th>User</th>
                  <th>Transaction ID</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Platform</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {payments.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
                      No transactions found matching the filter criteria.
                    </td>
                  </tr>
                ) : (
                  payments.map((p) => (
                    <tr key={p.id}>
                      <td>{new Date(p.created_at).toLocaleString()}</td>
                      <td>
                        <div style={styles.userInfo}>
                          <span style={styles.userName}>{p.users?.name || 'Unnamed User'}</span>
                          <span style={styles.userEmail}>{p.users?.email || 'N/A'}</span>
                        </div>
                      </td>
                      <td style={{ fontSize: '0.8rem', fontFamily: 'monospace' }}>
                        {p.areeba_transaction_id || p.apple_transaction_id || p.id}
                      </td>
                      <td>
                        <strong>${Number(p.amount).toFixed(2)}</strong> {p.currency}
                      </td>
                      <td>
                        <span className={`badge ${
                          p.status === 'success' ? 'badge-success' : 
                          p.status === 'refunded' ? 'badge-warning' : 'badge-error'
                        }`}>
                          {p.status}
                        </span>
                      </td>
                      <td>
                        <span style={{ textTransform: 'capitalize', fontWeight: 600 }}>
                          {p.platform || 'areeba'}
                        </span>
                      </td>
                      <td>
                        <div style={styles.actions}>
                          {p.status === 'success' && (!p.platform || p.platform === 'android') ? (
                            <button
                              className="btn btn-outline"
                              style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem', gap: '4px' }}
                              onClick={() => handleRefund(p.id)}
                              disabled={refundingId === p.id}
                            >
                              <RotateCcw size={12} />
                              <span>Refund</span>
                            </button>
                          ) : p.platform === 'ios' ? (
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                              AppStore Manage
                            </span>
                          ) : (
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>-</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {pagination.pages > 1 && (
            <div style={styles.pagination}>
              <span style={styles.paginationText}>
                Showing Page <strong>{pagination.pages}</strong> of {pagination.pages} ({pagination.total} total transactions)
              </span>
              <div style={styles.paginationBtns}>
                <button
                  className="btn btn-outline"
                  disabled={page === 1}
                  onClick={() => setPage(page - 1)}
                  style={{ padding: '0.5rem 0.75rem' }}
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  className="btn btn-outline"
                  disabled={page === pagination.pages}
                  onClick={() => setPage(page + 1)}
                  style={{ padding: '0.5rem 0.75rem' }}
                >
                  <ChevronRight size={16} />
                </button>
              </div>
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
  filterCard: {
    padding: '1.25rem',
  },
  filterForm: {
    display: 'flex',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: '1rem',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  searchContainer: {
    position: 'relative',
    flexGrow: 1,
    minWidth: '280px',
  },
  searchIcon: {
    position: 'absolute',
    left: '12px',
    top: '50%',
    transform: 'translateY(-50%)',
    color: 'var(--text-muted)',
  },
  searchInput: {
    width: '100%',
    padding: '0.625rem 0.875rem 0.625rem 2.5rem',
    border: '1px solid #CBD5E1',
    borderRadius: 'var(--radius-sm)',
    fontSize: '0.875rem',
    outline: 'none',
  },
  selectsContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    flexWrap: 'wrap',
  },
  select: {
    width: '150px',
  },
  userInfo: {
    display: 'flex',
    flexDirection: 'column',
  },
  userName: {
    fontWeight: 600,
    color: 'var(--text-dark)',
  },
  userEmail: {
    fontSize: '0.75rem',
    color: 'var(--text-secondary)',
  },
  actions: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    justifyContent: 'flex-end',
  },
  pagination: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '1rem 0',
  },
  paginationText: {
    fontSize: '0.85rem',
    color: 'var(--text-secondary)',
  },
  paginationBtns: {
    display: 'flex',
    gap: '0.5rem',
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

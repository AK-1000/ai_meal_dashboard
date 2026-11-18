'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { 
  Search, 
  Eye, 
  Trash2, 
  Key, 
  ChevronLeft, 
  ChevronRight, 
  UserPlus,
  Users,
  Sparkles,
  Clock,
  TrendingUp,
  AlertTriangle,
  CreditCard,
  CheckCircle2,
  XCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase-browser';

export default function UsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Search & Filter state
  const [search, setSearch] = useState('');
  const [tier, setTier] = useState('');
  const [status, setStatus] = useState('');
  const [tab, setTab] = useState<'all' | 'trial' | 'converted' | 'cancelled_trial' | 'paid'>('all');

  // Funnel analytics
  const [funnelCounts, setFunnelCounts] = useState({
    total: 0,
    trial: 0,
    converted: 0,
    cancelled: 0,
    paid: 0,
  });

  // Pagination state
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, total: 0, pages: 1, limit: 10 });

  // Dialog state
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [confirmDeleteEmail, setConfirmDeleteEmail] = useState('');
  const [resetPasswordId, setResetPasswordId] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: '10',
        search,
        tier,
        status,
        tab
      });

      const res = await fetch(`/api/users?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (res.ok) {
        const data = await res.json();
        setUsers(data.users || []);
        if (data.funnelCounts) {
          setFunnelCounts(data.funnelCounts);
        }
        setPagination(data.pagination || { page: 1, total: 0, pages: 1, limit: 10 });
      } else {
        toast.error('Failed to load users.');
      }
    } catch (err) {
      console.error(err);
      toast.error('Error loading users.');
    } finally {
      setLoading(false);
    }
  }, [page, search, tier, status, tab]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchUsers();
  };

  const handleTabChange = (newTab: 'all' | 'trial' | 'converted' | 'cancelled_trial' | 'paid') => {
    setTab(newTab);
    setPage(1);
  };

  const handleDeleteUser = async () => {
    if (!confirmDeleteId) return;

    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch(`/api/users/${confirmDeleteId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (res.ok) {
        toast.success(`User ${confirmDeleteEmail} deleted successfully.`);
        setConfirmDeleteId(null);
        fetchUsers();
      } else {
        const err = await res.json();
        toast.error(err.error || 'Failed to delete user.');
      }
    } catch (err) {
      console.error(err);
      toast.error('Error deleting user.');
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetPasswordId || !newPassword) return;

    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch(`/api/users/${resetPasswordId}/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ newPassword })
      });

      if (res.ok) {
        toast.success('Password updated successfully.');
        setResetPasswordId(null);
        setNewPassword('');
      } else {
        const err = await res.json();
        toast.error(err.error || 'Failed to reset password.');
      }
    } catch (err) {
      console.error(err);
      toast.error('Error resetting password.');
    }
  };

  return (
    <div style={styles.container}>
      {/* Header */}
      <div className="flex-between">
        <div>
          <h1 className="title-large">Users & Trial Tracking</h1>
          <p style={styles.subtitle}>
            Monitor all accounts, track active trials, conversions to paid plans, and churned trials.
          </p>
        </div>
        <Link 
          href="/dashboard/users/create"
          className="btn btn-primary flex-center" 
          style={{ gap: '0.5rem' }}
        >
          <UserPlus size={16} />
          <span>Add New User</span>
        </Link>
      </div>

      {/* Trial Funnel KPI Grid */}
      <div style={styles.kpiGrid}>
        {/* Total Users */}
        <div 
          onClick={() => handleTabChange('all')}
          style={{
            ...styles.kpiCard,
            ...(tab === 'all' ? styles.kpiCardActive : {})
          }}
        >
          <div style={styles.kpiHeader}>
            <span style={styles.kpiTitle}>All Users</span>
            <div style={{ ...styles.kpiIcon, backgroundColor: 'rgba(33, 150, 243, 0.1)', color: '#2196F3' }}>
              <Users size={18} />
            </div>
          </div>
          <div style={styles.kpiValue}>{funnelCounts.total}</div>
          <div style={styles.kpiSub}>Total registered accounts</div>
        </div>

        {/* Active Pro Trials */}
        <div 
          onClick={() => handleTabChange('trial')}
          style={{
            ...styles.kpiCard,
            ...(tab === 'trial' ? styles.kpiCardActive : {})
          }}
        >
          <div style={styles.kpiHeader}>
            <span style={styles.kpiTitle}>In Pro Trial</span>
            <div style={{ ...styles.kpiIcon, backgroundColor: 'rgba(255, 152, 0, 0.1)', color: '#FF9800' }}>
              <Clock size={18} />
            </div>
          </div>
          <div style={{ ...styles.kpiValue, color: '#D97706' }}>{funnelCounts.trial}</div>
          <div style={styles.kpiSub}>Currently evaluating Pro</div>
        </div>

        {/* Converted After Trial */}
        <div 
          onClick={() => handleTabChange('converted')}
          style={{
            ...styles.kpiCard,
            ...(tab === 'converted' ? styles.kpiCardActive : {})
          }}
        >
          <div style={styles.kpiHeader}>
            <span style={styles.kpiTitle}>Converted After Trial</span>
            <div style={{ ...styles.kpiIcon, backgroundColor: 'rgba(76, 175, 80, 0.1)', color: '#4CAF50' }}>
              <TrendingUp size={18} />
            </div>
          </div>
          <div style={{ ...styles.kpiValue, color: '#16A34A' }}>{funnelCounts.converted}</div>
          <div style={styles.kpiSub}>Paid subscribers post-trial</div>
        </div>

        {/* Cancelled / Expired Trials */}
        <div 
          onClick={() => handleTabChange('cancelled_trial')}
          style={{
            ...styles.kpiCard,
            ...(tab === 'cancelled_trial' ? styles.kpiCardActive : {})
          }}
        >
          <div style={styles.kpiHeader}>
            <span style={styles.kpiTitle}>Cancelled / Expired Trial</span>
            <div style={{ ...styles.kpiIcon, backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#EF4444' }}>
              <AlertTriangle size={18} />
            </div>
          </div>
          <div style={{ ...styles.kpiValue, color: '#DC2626' }}>{funnelCounts.cancelled}</div>
          <div style={styles.kpiSub}>Did not renew after trial</div>
        </div>

        {/* Active Paid Subscribers */}
        <div 
          onClick={() => handleTabChange('paid')}
          style={{
            ...styles.kpiCard,
            ...(tab === 'paid' ? styles.kpiCardActive : {})
          }}
        >
          <div style={styles.kpiHeader}>
            <span style={styles.kpiTitle}>Paid Subscribers</span>
            <div style={{ ...styles.kpiIcon, backgroundColor: 'rgba(16, 185, 129, 0.1)', color: '#10B981' }}>
              <CreditCard size={18} />
            </div>
          </div>
          <div style={{ ...styles.kpiValue, color: '#059669' }}>{funnelCounts.paid}</div>
          <div style={styles.kpiSub}>Total active paying users</div>
        </div>
      </div>

      {/* Funnel Navigation Tabs */}
      <div style={styles.tabsContainer}>
        <button
          onClick={() => handleTabChange('all')}
          style={{
            ...styles.tabBtn,
            ...(tab === 'all' ? styles.tabBtnActive : {})
          }}
        >
          All Users ({funnelCounts.total})
        </button>
        <button
          onClick={() => handleTabChange('trial')}
          style={{
            ...styles.tabBtn,
            ...(tab === 'trial' ? styles.tabBtnActive : {})
          }}
        >
          In Pro Trial ({funnelCounts.trial})
        </button>
        <button
          onClick={() => handleTabChange('converted')}
          style={{
            ...styles.tabBtn,
            ...(tab === 'converted' ? styles.tabBtnActive : {})
          }}
        >
          Converted After Trial ({funnelCounts.converted})
        </button>
        <button
          onClick={() => handleTabChange('cancelled_trial')}
          style={{
            ...styles.tabBtn,
            ...(tab === 'cancelled_trial' ? styles.tabBtnActive : {})
          }}
        >
          Cancelled / Expired Trials ({funnelCounts.cancelled})
        </button>
        <button
          onClick={() => handleTabChange('paid')}
          style={{
            ...styles.tabBtn,
            ...(tab === 'paid' ? styles.tabBtnActive : {})
          }}
        >
          Paid Subscribers ({funnelCounts.paid})
        </button>
      </div>

      {/* Filter Toolbar */}
      <div className="card" style={styles.filterCard}>
        <form onSubmit={handleSearchSubmit} style={styles.searchForm}>
          <div style={styles.searchInputWrapper}>
            <Search size={18} style={styles.searchIcon} />
            <input
              type="text"
              placeholder="Search by name or email..."
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
            value={tier}
            onChange={(e) => { setTier(e.target.value); setPage(1); }}
            className="input-field"
            style={styles.selectInput}
          >
            <option value="">All Tiers</option>
            <option value="pro">Pro (Paid)</option>
            <option value="pro_trial">Pro Trial</option>
            <option value="vip">VIP</option>
          </select>

          <select
            value={status}
            onChange={(e) => { setStatus(e.target.value); setPage(1); }}
            className="input-field"
            style={styles.selectInput}
          >
            <option value="">All Statuses</option>
            <option value="active">Active</option>
            <option value="trialing">In Trial</option>
            <option value="expired">Expired</option>
            <option value="canceled">Canceled</option>
          </select>
        </div>
      </div>

      {/* Users Table */}
      {loading ? (
        <div style={styles.loadingContainer}>
          <div style={styles.spinner}></div>
          <p>Loading users...</p>
        </div>
      ) : (
        <div className="table-container">
          <table className="admin-table">
            <thead>
              <tr>
                <th>User Details</th>
                <th>Tier</th>
                <th>Subscription & Trial Status</th>
                <th>Verification</th>
                <th>Sponsor / Partner</th>
                <th>Registered Date</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr>
                  <td colSpan={7} style={styles.emptyCell}>
                    No users found for this filter tab.
                  </td>
                </tr>
              ) : (
                users.map((u) => {
                  const isVip = u.subscription_tier?.toLowerCase() === 'vip';
                  const isTrialActive = !isVip && (u.trial_status === 'active' || u.subscription_status === 'trialing') 
                    && (!u.trial_ends_at || new Date(u.trial_ends_at).getTime() > Date.now());
                  const isCancelledTrial = !isVip && u.subscription_status !== 'active';
                  const isConverted = u.subscription_status === 'active' && u.trial_status === 'converted';
                  
                  let daysLeft = null;
                  if (isTrialActive && u.trial_ends_at) {
                    daysLeft = Math.max(0, Math.ceil((new Date(u.trial_ends_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
                  }

                  return (
                    <tr key={u.id}>
                      <td>
                        <div style={styles.userCell}>
                          <div style={styles.avatar}>
                            {u.avatar_url ? (
                              <img src={u.avatar_url} alt={u.name || 'User'} style={styles.avatarImg} />
                            ) : (
                              <span>{(u.name?.[0] || u.email?.[0] || 'U').toUpperCase()}</span>
                            )}
                          </div>
                          <div>
                            <div style={styles.userName}>{u.name || 'Unnamed User'}</div>
                            <div style={styles.userEmail}>{u.email}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        {isVip ? (
                          <span className="badge badge-primary">VIP</span>
                        ) : (isTrialActive || isCancelledTrial) ? (
                          <span className="badge" style={{ backgroundColor: '#FEF3C7', color: '#B45309', border: '1px solid #FDE68A', fontWeight: 600 }}>
                            PRO TRIAL
                          </span>
                        ) : (
                          <span className="badge badge-info">PRO</span>
                        )}
                      </td>
                      <td>
                        {isTrialActive ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            <span className="badge" style={{ backgroundColor: '#FEF3C7', color: '#B45309', border: '1px solid #FDE68A' }}>
                              Pro Trial ({daysLeft}d left)
                            </span>
                            {u.trial_ends_at && (
                              <span style={{ fontSize: '0.6875rem', color: '#92400E' }}>
                                Ends {new Date(u.trial_ends_at).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        ) : isConverted ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            <span className="badge badge-success" style={{ gap: '4px' }}>
                              <Sparkles size={12} />
                              <span>Paid (Converted)</span>
                            </span>
                          </div>
                        ) : isCancelledTrial ? (
                          <span className="badge badge-error">
                            Trial Expired / Cancelled
                          </span>
                        ) : (
                          <span className={`badge ${
                            u.subscription_status === 'active' ? 'badge-success' : 'badge-error'
                          }`}>
                            {u.subscription_status || 'expired'}
                          </span>
                        )}
                      </td>
                      <td>
                        {u.email_verified ? (
                          <span className="badge badge-success">Verified</span>
                        ) : (
                          <span className="badge badge-warning">Unverified</span>
                        )}
                      </td>
                      <td>
                        {u.sponsors ? (
                          <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#D97706' }}>
                            {u.sponsors.name} ({u.sponsors.code_prefix})
                          </span>
                        ) : (
                          <span style={{ fontSize: '0.8125rem', color: '#94A3B8' }}>Direct</span>
                        )}
                      </td>
                      <td style={styles.dateCell}>
                        {u.created_at ? new Date(u.created_at).toLocaleDateString() : 'N/A'}
                      </td>
                      <td>
                        <div style={styles.actionButtons}>
                          <Link href={`/dashboard/users/${u.id}`} className="btn btn-outline btn-icon" title="View Full Details">
                            <Eye size={16} />
                          </Link>
                          <button
                            className="btn btn-outline btn-icon"
                            onClick={() => setResetPasswordId(u.id)}
                            title="Reset Password"
                          >
                            <Key size={16} />
                          </button>
                          <button
                            className="btn btn-outline btn-icon"
                            onClick={() => {
                              setConfirmDeleteId(u.id);
                              setConfirmDeleteEmail(u.email);
                            }}
                            title="Delete User"
                          >
                            <Trash2 size={16} style={{ color: 'var(--error)' }} />
                          </button>
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
            Showing page {pagination.page} of {pagination.pages} ({pagination.total} total filtered users)
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

      {/* Delete Confirmation Modal */}
      {confirmDeleteId && (
        <div style={styles.modalBackdrop}>
          <div className="card animate-fade-in" style={styles.modalCard}>
            <h3 className="title-medium" style={{ color: 'var(--error)', marginBottom: '0.75rem' }}>Delete User Account</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
              Are you sure you want to completely delete <strong>{confirmDeleteEmail}</strong>? This will remove all their saved data, goals, nutrition logs, and subscription records.
            </p>
            <div style={styles.modalActions}>
              <button className="btn btn-outline" onClick={() => setConfirmDeleteId(null)}>Cancel</button>
              <button className="btn btn-danger" onClick={handleDeleteUser}>Confirm Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {resetPasswordId && (
        <div style={styles.modalBackdrop}>
          <div className="card animate-fade-in" style={styles.modalCard}>
            <h3 className="title-medium" style={{ marginBottom: '1rem' }}>Reset User Password</h3>
            <form onSubmit={handleResetPassword}>
              <div className="form-group">
                <label className="form-label" htmlFor="new-password">New Password</label>
                <input
                  id="new-password"
                  type="password"
                  placeholder="Enter new password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="input-field"
                  required
                />
              </div>
              <div style={styles.modalActions}>
                <button type="button" className="btn btn-outline" onClick={() => setResetPasswordId(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Update Password</button>
              </div>
            </form>
          </div>
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
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
  },
  kpiCardActive: {
    border: '1px solid #4CAF50',
    backgroundColor: '#F0FDF4',
    boxShadow: '0 0 0 1px #4CAF50'
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
  tabsContainer: {
    display: 'flex',
    gap: '0.5rem',
    borderBottom: '1px solid #E2E8F0',
    paddingBottom: '0.5rem',
    overflowX: 'auto'
  },
  tabBtn: {
    padding: '0.5rem 1rem',
    fontSize: '0.8125rem',
    fontWeight: 600,
    color: '#64748B',
    backgroundColor: 'transparent',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    whiteSpace: 'nowrap'
  },
  tabBtnActive: {
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
  userCell: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
  },
  avatar: {
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    backgroundColor: 'var(--primary-light)',
    color: 'var(--primary-dark)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 600,
    fontSize: '0.875rem',
    overflow: 'hidden',
  },
  avatarImg: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
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
  actionButtons: {
    display: 'flex',
    gap: '0.375rem',
    justifyContent: 'flex-end',
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
  modalBackdrop: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
  },
  modalCard: {
    maxWidth: '450px',
    width: '90%',
  },
  modalActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '0.75rem',
    marginTop: '1.5rem',
  },
};

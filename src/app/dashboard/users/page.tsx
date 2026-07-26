'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { Search, Eye, Trash2, Key, ChevronLeft, ChevronRight, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase-browser';

export default function UsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [sponsors, setSponsors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Search & Filter state
  const [search, setSearch] = useState('');
  const [tier, setTier] = useState('');
  const [status, setStatus] = useState('');

  // Pagination state
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, total: 0, pages: 1, limit: 10 });

  // Dialog state
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [confirmDeleteEmail, setConfirmDeleteEmail] = useState('');
  const [resetPasswordId, setResetPasswordId] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');

  // Add User State
  const [showAddModal, setShowAddModal] = useState(false);
  const [addName, setAddName] = useState('');
  const [addEmail, setAddEmail] = useState('');
  const [addPassword, setAddPassword] = useState('aimeal@P@assword');
  const [addPhone, setAddPhone] = useState('');
  const [addSponsorId, setAddSponsorId] = useState('');
  const [addPlanId, setAddPlanId] = useState('00000000-0000-0000-0000-000000000001');
  const [addBillingCycle, setAddBillingCycle] = useState('monthly');
  const [addPlanStartDate, setAddPlanStartDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [addPlanEndDate, setAddPlanEndDate] = useState('');
  const [adding, setAdding] = useState(false);

  const fetchSponsors = async () => {
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const res = await fetch('/api/sponsors', {
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setSponsors(data.sponsors || []);
      }
    } catch (err) {
      console.error('Error fetching sponsors:', err);
    }
  };

  useEffect(() => {
    fetchSponsors();
  }, []);

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addEmail || !addPassword) {
      toast.error('Email and password are required.');
      return;
    }
    setAdding(true);
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          name: addName,
          email: addEmail,
          password: addPassword,
          phone: addPhone,
          sponsorId: addSponsorId || null,
          planId: addPlanId,
          planStartDate: addPlanStartDate || null,
          planEndDate: addPlanEndDate || null,
          billingCycle: addPlanId !== '00000000-0000-0000-0000-000000000001' ? addBillingCycle : null
        })
      });

      if (res.ok) {
        toast.success(`User ${addEmail} created successfully.`);
        resetAddForm();
        setShowAddModal(false);
        fetchUsers();
      } else {
        const err = await res.json();
        toast.error(err.error || 'Failed to create user.');
      }
    } catch (err) {
      console.error(err);
      toast.error('Error creating user.');
    } finally {
      setAdding(false);
    }
  };

  const resetAddForm = () => {
    setAddName('');
    setAddEmail('');
    setAddPassword('aimeal@P@assword');
    setAddPhone('');
    setAddSponsorId('');
    setAddPlanId('00000000-0000-0000-0000-000000000001');
    setAddBillingCycle('monthly');
    setAddPlanStartDate(new Date().toISOString().split('T')[0]);
    setAddPlanEndDate('');
  };

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
        status
      });

      const res = await fetch(`/api/users?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (res.ok) {
        const data = await res.json();
        setUsers(data.users || []);
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
  }, [page, search, tier, status]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchUsers();
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
          <h1 className="title-large">Users Management</h1>
          <p style={styles.subtitle}>View, manage, and monitor all platform accounts</p>
        </div>
        <button 
          className="btn btn-primary flex-center" 
          style={{ gap: '0.5rem' }}
          onClick={() => { resetAddForm(); setShowAddModal(true); }}
        >
          <UserPlus size={16} />
          <span>Add New User</span>
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
            <option value="free">Free</option>
            <option value="pro">Pro</option>
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
                <th>Status</th>
                <th>Verification</th>
                <th>Registered Date</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr>
                  <td colSpan={6} style={styles.emptyCell}>
                    No users found. Try adjusting your filters.
                  </td>
                </tr>
              ) : (
                users.map((u) => (
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
                      <span className={`badge ${
                        u.subscription_tier === 'vip' ? 'badge-primary' :
                        u.subscription_tier === 'pro' ? 'badge-info' : 'badge-neutral'
                      }`}>
                        {(u.subscription_tier || 'free').toUpperCase()}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${
                        u.subscription_status === 'active' ? 'badge-success' : 'badge-error'
                      }`}>
                        {u.subscription_status || 'free'}
                      </span>
                    </td>
                    <td>
                      {u.email_verified ? (
                        <span className="badge badge-success">Verified</span>
                      ) : (
                        <span className="badge badge-warning">Unverified</span>
                      )}
                    </td>
                    <td style={styles.dateCell}>
                      {u.created_at ? new Date(u.created_at).toLocaleDateString() : 'N/A'}
                    </td>
                    <td>
                      <div style={styles.actionButtons}>
                        <Link href={`/dashboard/users/${u.id}`} className="btn btn-outline btn-icon" title="View Details">
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
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination Footer */}
      {!loading && pagination.pages > 1 && (
        <div style={styles.paginationContainer}>
          <div style={styles.paginationInfo}>
            Showing page {pagination.page} of {pagination.pages} ({pagination.total} total users)
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
            <h3 className="title-medium" style={{ color: 'var(--error)' }}>Delete User</h3>
            <p style={{ margin: '1rem 0', color: 'var(--text-secondary)' }}>
              Are you sure you want to delete <strong>{confirmDeleteEmail}</strong>? This action cannot be undone.
            </p>
            <div style={styles.modalActions}>
              <button className="btn btn-outline" onClick={() => setConfirmDeleteId(null)}>Cancel</button>
              <button className="btn btn-primary" style={{ backgroundColor: 'var(--error)' }} onClick={handleDeleteUser}>
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {resetPasswordId && (
        <div style={styles.modalBackdrop}>
          <div className="card animate-fade-in" style={styles.modalCard}>
            <h3 className="title-medium">Reset User Password</h3>
            <form onSubmit={handleResetPassword} style={{ marginTop: '1rem' }}>
              <div className="form-group">
                <label className="form-label" htmlFor="new-password">New Password</label>
                <input
                  id="new-password"
                  type="password"
                  placeholder="Minimum 6 characters"
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

      {/* Add User Modal */}
      {showAddModal && (
        <div style={styles.modalBackdrop}>
          <div className="card animate-fade-in" style={{ ...styles.modalCard, maxWidth: '600px' }}>
            <h3 className="title-medium" style={{ marginBottom: '1.5rem' }}>Add New User (Verified)</h3>
            <form onSubmit={handleAddUser}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div className="form-group">
                  <label className="form-label" htmlFor="add-name">Full Name</label>
                  <input
                    id="add-name"
                    type="text"
                    placeholder="John Doe"
                    value={addName}
                    onChange={(e) => setAddName(e.target.value)}
                    className="input-field"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="add-phone">Phone Number</label>
                  <input
                    id="add-phone"
                    type="tel"
                    placeholder="+96171XXXXXX"
                    value={addPhone}
                    onChange={(e) => setAddPhone(e.target.value)}
                    className="input-field"
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div className="form-group">
                  <label className="form-label" htmlFor="add-email">Email Address</label>
                  <input
                    id="add-email"
                    type="email"
                    placeholder="john.doe@example.com"
                    value={addEmail}
                    onChange={(e) => setAddEmail(e.target.value)}
                    className="input-field"
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="add-password">Password</label>
                  <input
                    id="add-password"
                    type="password"
                    placeholder="••••••"
                    value={addPassword}
                    onChange={(e) => setAddPassword(e.target.value)}
                    className="input-field"
                    required
                  />
                </div>
              </div>

              {/* Optional Sponsor Selection */}
              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label className="form-label" htmlFor="add-sponsor">Sponsor Partner (Optional)</label>
                <select
                  id="add-sponsor"
                  value={addSponsorId}
                  onChange={(e) => setAddSponsorId(e.target.value)}
                  className="input-field"
                  style={{ width: '100%' }}
                >
                  <option value="">No Sponsor / Independent User</option>
                  {sponsors.map(s => (
                    <option key={s.id} value={s.id}>{s.name} ({s.code_prefix || 'No prefix'})</option>
                  ))}
                </select>
              </div>

              <div style={{ borderTop: '1px solid #E2E8F0', margin: '1.5rem 0 1rem 0', paddingTop: '1rem' }}>
                <h4 style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-dark)', marginBottom: '0.75rem' }}>Subscription Settings</h4>
                
                <div className="form-group" style={{ marginBottom: '1rem' }}>
                  <label className="form-label" htmlFor="add-plan">Select Plan</label>
                  <select
                    id="add-plan"
                    value={addPlanId}
                    onChange={(e) => setAddPlanId(e.target.value)}
                    className="input-field"
                    style={{ width: '100%' }}
                  >
                    <option value="00000000-0000-0000-0000-000000000001">Free Plan (14-day Trial)</option>
                    <option value="e203edfc-8109-4f44-af32-12b5723c1f15">Pro Plan</option>
                    <option value="7080e55e-0002-494b-ada6-763d74325040">VIP Plan</option>
                  </select>
                </div>

                {addPlanId !== '00000000-0000-0000-0000-000000000001' && (
                  <>
                    <div className="form-group" style={{ marginBottom: '1rem' }}>
                      <label className="form-label" htmlFor="add-billing-cycle">Billing Cycle</label>
                      <select
                        id="add-billing-cycle"
                        value={addBillingCycle}
                        onChange={(e) => setAddBillingCycle(e.target.value)}
                        className="input-field"
                        style={{ width: '100%' }}
                        required
                      >
                        <option value="monthly">Monthly</option>
                        <option value="yearly">Yearly</option>
                      </select>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                      <div className="form-group">
                        <label className="form-label" htmlFor="add-start-date">Start Date</label>
                        <input
                          id="add-start-date"
                          type="date"
                          value={addPlanStartDate}
                          onChange={(e) => setAddPlanStartDate(e.target.value)}
                          className="input-field"
                          required
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label" htmlFor="add-end-date">End Date</label>
                        <input
                          id="add-end-date"
                          type="date"
                          value={addPlanEndDate}
                          onChange={(e) => setAddPlanEndDate(e.target.value)}
                          className="input-field"
                          required
                        />
                      </div>
                    </div>
                  </>
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
                <button type="button" className="btn btn-outline" onClick={() => setShowAddModal(false)} disabled={adding}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={adding}>
                  {adding ? 'Creating...' : 'Create User'}
                </button>
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
    fontSize: '0.9rem',
    color: 'var(--text-secondary)',
    marginTop: '0.25rem',
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

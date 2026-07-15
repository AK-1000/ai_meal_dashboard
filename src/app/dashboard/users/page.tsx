'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { Search, Eye, Trash2, Key, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase-browser';

export default function UsersPage() {
  const [users, setUsers] = useState<any[]>([]);
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
  const [addPlanId, setAddPlanId] = useState('00000000-0000-0000-0000-000000000001');
  const [addBillingCycle, setAddBillingCycle] = useState('monthly');
  const [addPlanStartDate, setAddPlanStartDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [addPlanEndDate, setAddPlanEndDate] = useState('');
  const [adding, setAdding] = useState(false);

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
          planId: addPlanId,
          planStartDate: addPlanStartDate || null,
          planEndDate: addPlanEndDate || null,
          billingCycle: addPlanId !== '00000000-0000-0000-0000-000000000001' ? addBillingCycle : null
        })
      });

      if (res.ok) {
        toast.success(`User ${addEmail} created successfully.`);
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

      const res = await fetch(`/api/users?${queryParams.toString()}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (res.ok) {
        const data = await res.json();
        setUsers(data.users || []);
        setPagination(data.pagination);
      } else {
        toast.error('Failed to load users list.');
      }
    } catch (err) {
      console.error(err);
      toast.error('Error fetching users.');
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

  const handleResetFilters = () => {
    setSearch('');
    setTier('');
    setStatus('');
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

  const handleResetPassword = async () => {
    if (!resetPasswordId || !newPassword) return;
    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters.');
      return;
    }
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
        body: JSON.stringify({ password: newPassword })
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
      {/* Header Actions */}
      <div className="flex-between">
        <div>
          <h1 className="title-large">User Management</h1>
          <p style={styles.subtitle}>Search, view and manage user profile details</p>
        </div>
        <button 
          className="btn btn-primary" 
          onClick={() => {
            setAddName('');
            setAddEmail('');
            setAddPassword('aimeal@P@assword');
            setAddPhone('');
            setAddPlanId('00000000-0000-0000-0000-000000000001');
            setAddBillingCycle('monthly');
            setAddPlanStartDate(new Date().toISOString().split('T')[0]);
            setAddPlanEndDate('');
            setShowAddModal(true);
          }}
        >
          Add User
        </button>
      </div>

      {/* Filter / Search Bar */}
      <div className="card" style={styles.filterCard}>
        <form onSubmit={handleSearchSubmit} style={styles.filterForm}>
          <div style={styles.searchContainer}>
            <Search size={18} style={styles.searchIcon} />
            <input
              type="text"
              placeholder="Search by name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={styles.searchInput}
            />
          </div>

          <div style={styles.selectsContainer}>
            <select 
              value={tier} 
              onChange={(e) => { setTier(e.target.value); setPage(1); }} 
              className="input-field"
              style={styles.select}
            >
              <option value="">All Tiers</option>
              <option value="free">Free</option>
              <option value="pro">Pro</option>
              <option value="gold">Gold</option>
              <option value="premium">Premium</option>
              <option value="vip">VIP</option>
            </select>

            <select 
              value={status} 
              onChange={(e) => { setStatus(e.target.value); setPage(1); }} 
              className="input-field"
              style={styles.select}
            >
              <option value="">All Statuses</option>
              <option value="active">Active</option>
              <option value="canceled">Canceled</option>
              <option value="expired">Expired</option>
              <option value="free">Free</option>
            </select>

            <button type="submit" className="btn btn-primary">Search</button>
            <button type="button" className="btn btn-outline" onClick={handleResetFilters}>Reset</button>
          </div>
        </form>
      </div>

      {/* Users Table */}
      {loading ? (
        <div style={styles.loadingContainer}>
          <div style={styles.spinner}></div>
          <p>Loading users...</p>
        </div>
      ) : (
        <>
          <div className="table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Signup Date</th>
                  <th>Status</th>
                  <th>Tier</th>
                  <th>Platform</th>
                  <th>Country</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
                      No users match the search criteria.
                    </td>
                  </tr>
                ) : (
                  users.map((u) => (
                    <tr key={u.id}>
                      <td>
                        <div style={styles.userInfo}>
                          <span style={styles.userName}>{u.name || 'Unnamed'}</span>
                          <span style={styles.userEmail}>{u.email}</span>
                        </div>
                      </td>
                      <td>{new Date(u.created_at).toLocaleDateString()}</td>
                      <td>
                        <span className={`badge ${
                          u.subscription_status === 'active' ? 'badge-success' : 
                          u.subscription_status === 'canceled' ? 'badge-warning' : 'badge-error'
                        }`}>
                          <span className="badge-dot"></span>
                          {u.subscription_status || 'inactive'}
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${
                          u.subscription_tier?.toLowerCase() === 'vip' ? 'badge-error' : 
                          u.subscription_tier?.toLowerCase() === 'pro' ? 'badge-success' : 
                          u.subscription_tier?.toLowerCase() === 'gold' ? 'badge-warning' : 
                          u.subscription_tier?.toLowerCase() === 'premium' ? 'badge-primary' : 'badge-info'
                        }`}>
                          {u.subscription_tier || 'Free'}
                        </span>
                      </td>
                      <td>
                        <span style={{ fontSize: '0.85rem', fontWeight: 500, textTransform: 'capitalize' }}>
                          {u.device_platform || 'web'}
                        </span>
                      </td>
                      <td>{u.country || 'N/A'}</td>
                      <td>
                        <div style={styles.actions}>
                          <Link href={`/dashboard/users/${u.id}`} className="btn btn-outline btn-icon" title="View details">
                            <Eye size={14} />
                          </Link>
                          <button 
                            className="btn btn-outline btn-icon" 
                            title="Reset password"
                            onClick={() => setResetPasswordId(u.id)}
                          >
                            <Key size={14} />
                          </button>
                          <button 
                            className="btn btn-outline btn-icon btn-danger-hover" 
                            title="Delete user"
                            onClick={() => { setConfirmDeleteId(u.id); setConfirmDeleteEmail(u.email); }}
                          >
                            <Trash2 size={14} style={{ color: 'var(--error)' }} />
                          </button>
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
                Showing Page <strong>{pagination.page}</strong> of {pagination.pages} ({pagination.total} total users)
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

      {/* Delete Confirmation Modal */}
      {confirmDeleteId && (
        <div className="modal-overlay">
          <div className="modal-content animate-fade-in" style={{ maxWidth: '450px' }}>
            <h3 className="title-medium" style={{ color: 'var(--error)' }}>Confirm Delete</h3>
            <p style={{ margin: '1rem 0', fontSize: '0.9rem', lineHeight: '1.5' }}>
              Are you sure you want to permanently delete user <strong>{confirmDeleteEmail}</strong>? This will delete their authentication account and profile data. This action is irreversible.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
              <button className="btn btn-outline" onClick={() => setConfirmDeleteId(null)}>Cancel</button>
              <button className="btn btn-danger" onClick={handleDeleteUser}>Delete Account</button>
            </div>
          </div>
        </div>
      )}

      {/* Password Reset Modal */}
      {resetPasswordId && (
        <div className="modal-overlay">
          <div className="modal-content animate-fade-in" style={{ maxWidth: '400px' }}>
            <h3 className="title-medium">Reset Password</h3>
            <p style={{ margin: '0.5rem 0 1.25rem 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Set a new password for this user account. Minimum 6 characters.
            </p>
            <div className="form-group">
              <label className="form-label" htmlFor="new-password">New Password</label>
              <input
                id="new-password"
                type="password"
                placeholder="••••••"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="input-field"
                required
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
              <button className="btn btn-outline" onClick={() => { setResetPasswordId(null); setNewPassword(''); }}>Cancel</button>
              <button className="btn btn-primary" onClick={handleResetPassword}>Update Password</button>
            </div>
          </div>
        </div>
      )}

      {/* Add User Modal */}
      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal-content animate-fade-in" style={{ maxWidth: '550px' }}>
            <h3 className="title-medium">Add New User</h3>
            <p style={{ margin: '0.5rem 0 1.25rem 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Create a new user account, initialize their profile, and set up their subscription.
            </p>
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
    padding: '4rem 0',
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

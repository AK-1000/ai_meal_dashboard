'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { 
  Ticket, 
  Plus, 
  Trash2, 
  Edit2, 
  Search, 
  ChevronLeft, 
  ChevronRight,
  Copy,
  Check,
  Gift,
  Clock,
  Award,
  Link2,
  Wallet,
  X
} from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase-browser';

export default function PromoCodesPage() {
  const [promoCodes, setPromoCodes] = useState<any[]>([]);
  const [sponsors, setSponsors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingCode, setEditingCode] = useState<any | null>(null);

  // Form states
  const [code, setCode] = useState('');
  const [sponsorId, setSponsorId] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [neverExpires, setNeverExpires] = useState(true);
  const [isActive, setIsActive] = useState(true);
  const [freeDays, setFreeDays] = useState<number>(7);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Selection state for bulk operations
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Search and Pagination states
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const limit = 15;

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const codesRes = await fetch(`/api/promo-codes?page=${page}&limit=${limit}&search=${encodeURIComponent(debouncedSearch)}`, {
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      });
      const codesData = await codesRes.json();
      setPromoCodes(codesData.promoCodes || []);
      setTotalPages(codesData.pagination?.totalPages || 1);
      setTotalItems(codesData.pagination?.total || 0);

      const sponsorsRes = await fetch('/api/sponsors', {
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      });
      const sponsorsData = await sponsorsRes.json();
      setSponsors(sponsorsData.sponsors || []);
    } catch (err) {
      console.error(err);
      toast.error('Error fetching referral codes.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [page, debouncedSearch]);

  const handleCopy = (c: string) => {
    navigator.clipboard.writeText(c);
    setCopiedCode(c);
    toast.success(`Copied code "${c}" to clipboard!`);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleSponsorChange = (selectedSpId: string) => {
    setSponsorId(selectedSpId);
    if (selectedSpId) {
      const sp = sponsors.find(s => s.id === selectedSpId);
      if (sp?.default_free_days) {
        setFreeDays(sp.default_free_days);
      }
    }
  };

  const handleSavePromoCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code) {
      toast.error('Please enter a referral code.');
      return;
    }

    const payload = {
      code: code.toUpperCase().trim(),
      sponsor_id: sponsorId || null,
      expires_at: neverExpires || !expiresAt ? null : new Date(expiresAt).toISOString(),
      never_expires: neverExpires,
      status: isActive ? 'active' : 'inactive',
      free_days: Number(freeDays) || 7,
    };

    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      let res;
      if (editingCode) {
        res = await fetch(`/api/promo-codes/${editingCode.id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`
          },
          body: JSON.stringify(payload)
        });
      } else {
        res = await fetch('/api/promo-codes', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`
          },
          body: JSON.stringify(payload)
        });
      }

      if (res.ok) {
        toast.success(editingCode ? 'Referral code updated.' : 'Referral code created successfully.');
        resetForm();
        fetchData();
      } else {
        const err = await res.json();
        toast.error(err.error || 'Failed to save referral code.');
      }
    } catch (err) {
      console.error(err);
      toast.error('Error saving referral code.');
    }
  };

  const handleEditClick = (item: any) => {
    setEditingCode(item);
    setCode(item.code || '');
    setSponsorId(item.sponsor_id || '');
    const hasExpiry = Boolean(item.expires_at);
    setNeverExpires(!hasExpiry);
    setExpiresAt(item.expires_at ? new Date(item.expires_at).toISOString().slice(0, 16) : '');
    setIsActive(item.status === 'active' || item.status === true || item.is_active === true);
    setFreeDays(item.free_days || 7);
    setShowAddForm(true);
  };

  const handleToggleActive = async (item: any) => {
    const isCurrentlyActive = item.status === 'active' || item.status === true || item.is_active === true;
    const newStatus = isCurrentlyActive ? 'inactive' : 'active';
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch(`/api/promo-codes/${item.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ status: newStatus })
      });

      if (res.ok) {
        toast.success(`Referral code ${item.code} is now ${newStatus}.`);
        fetchData();
      } else {
        toast.error('Failed to update status.');
      }
    } catch (err) {
      console.error(err);
      toast.error('Error toggling status.');
    }
  };

  const handleDeleteCode = async (id: string) => {
    if (!confirm('Are you sure you want to permanently delete this referral code?')) return;
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch(`/api/promo-codes/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (res.ok) {
        toast.success('Referral code deleted successfully.');
        setSelectedIds(prev => prev.filter(i => i !== id));
        fetchData();
      } else {
        const err = await res.json();
        toast.error(err.error || 'Failed to delete code.');
      }
    } catch (err) {
      console.error(err);
      toast.error('Error deleting code.');
    }
  };

  // Bulk Operations
  const toggleSelectAll = () => {
    if (selectedIds.length === promoCodes.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(promoCodes.map(p => p.id));
    }
  };

  const toggleSelectRow = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleBulkStatusChange = async (targetStatus: 'active' | 'inactive') => {
    if (selectedIds.length === 0) return;
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch('/api/promo-codes/bulk', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ ids: selectedIds, status: targetStatus })
      });

      if (res.ok) {
        toast.success(`Updated ${selectedIds.length} referral code(s) to ${targetStatus}.`);
        setSelectedIds([]);
        fetchData();
      } else {
        const err = await res.json();
        toast.error(err.error || 'Failed to bulk update status.');
      }
    } catch (err) {
      console.error(err);
      toast.error('Error performing bulk action.');
    }
  };

  const resetForm = () => {
    setEditingCode(null);
    setShowAddForm(false);
    setCode('');
    setSponsorId('');
    setExpiresAt('');
    setNeverExpires(true);
    setIsActive(true);
    setFreeDays(7);
  };

  return (
    <div style={styles.container}>
      {/* Header */}
      <div className="flex-between">
        <div>
          <h1 className="title-large">Referral Codes</h1>
          <p style={styles.subtitle}>
            Create and manage referral codes for sponsors. Configure custom Pro trial periods granted to users upon signup.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <div style={{ position: 'relative' }}>
            <Search size={18} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Search referral codes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input-field"
              style={{ paddingLeft: '36px', width: '250px' }}
            />
          </div>
          {!showAddForm && (
            <button className="btn btn-primary flex-center" style={{ gap: '0.5rem' }} onClick={() => { resetForm(); setShowAddForm(true); }}>
              <Plus size={16} />
              <span>Create Referral Code</span>
            </button>
          )}
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div style={styles.tabsRow}>
        <Link href="/dashboard/sponsors" style={styles.tabLink}>
          <Award size={15} />
          <span>Sponsors Directory</span>
        </Link>
        <div style={styles.tabActivePill}>
          <Ticket size={15} />
          <span>Referral Codes ({totalItems})</span>
        </div>
        <Link href="/dashboard/referral-tracking" style={styles.tabLink}>
          <Link2 size={15} />
          <span>Referral Tracking Ledger</span>
        </Link>
        <Link href="/dashboard/sponsor-payments" style={styles.tabLink}>
          <Wallet size={15} />
          <span>Sponsor Payouts</span>
        </Link>
      </div>

      {/* Bulk Operations Toolbar */}
      {selectedIds.length > 0 && (
        <div className="card animate-fade-in" style={{ backgroundColor: '#F0FDF4', border: '1px solid #BBF7D0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', fontWeight: 600, color: '#166534' }}>
            <span>{selectedIds.length} referral code(s) selected</span>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button className="btn btn-outline" style={{ backgroundColor: 'white' }} onClick={() => handleBulkStatusChange('inactive')}>
              Set Selected to Inactive
            </button>
            <button className="btn btn-primary" onClick={() => handleBulkStatusChange('active')}>
              Set Selected to Active
            </button>
          </div>
        </div>
      )}

      {/* Create / Edit Form */}
      {showAddForm && (
        <div className="card animate-fade-in" style={{ maxWidth: '750px', border: '1px solid #CBD5E1', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <div>
              <h3 className="title-medium" style={{ margin: 0 }}>
                {editingCode ? `Edit Code: ${editingCode.code}` : 'Create Referral Code'}
              </h3>
              <p style={{ fontSize: '0.8125rem', color: '#64748B', marginTop: '2px' }}>
                Assign to a sponsor partner and define the free trial duration granted to users signing up with this code.
              </p>
            </div>
            <button className="btn btn-outline btn-icon" onClick={resetForm}>
              <X size={16} />
            </button>
          </div>

          <form onSubmit={handleSavePromoCode} style={styles.formGrid}>
            <div className="form-group">
              <label className="form-label" htmlFor="code-sponsor">Sponsor Partner</label>
              <select
                id="code-sponsor"
                value={sponsorId || ''}
                onChange={(e) => handleSponsorChange(e.target.value)}
                className="input-field"
              >
                <option value="">Independent / System Code (No Sponsor)</option>
                {sponsors.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.code_prefix || 'No prefix'}) - {s.commission_percentage || 0}% comm.
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="code-name">Referral Code *</label>
              <input
                id="code-name"
                type="text"
                placeholder="e.g. IRONFIT2026"
                value={code || ''}
                onChange={(e) => setCode(e.target.value.toUpperCase().trim())}
                className="input-field"
                style={{ fontFamily: 'monospace', fontWeight: 700, letterSpacing: '0.05em' }}
                required
              />
            </div>

            {/* Trial Days Granted */}
            <div className="form-group" style={{ gridColumn: 'span 2', backgroundColor: '#F8FAFC', padding: '1rem', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <Gift size={16} color="#16A34A" />
                <label className="form-label" htmlFor="free-days" style={{ fontWeight: 600, color: '#0F172A', marginBottom: 0 }}>
                  Free Trial Days Granted to Referred Users *
                </label>
              </div>
              <p style={{ fontSize: '0.8125rem', color: '#64748B', marginBottom: '0.75rem' }}>
                When users enter this code at sign-up, they receive this many days of free Pro trial before needing to pay. (Standard in app: 7 days)
              </p>

              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                {[7, 14, 30, 60].map((days) => (
                  <button
                    key={days}
                    type="button"
                    onClick={() => setFreeDays(days)}
                    className="btn btn-outline"
                    style={{
                      fontSize: '0.8125rem',
                      padding: '0.375rem 0.75rem',
                      border: freeDays === days ? '2px solid #4CAF50' : '1px solid #CBD5E1',
                      backgroundColor: freeDays === days ? '#F0FDF4' : '#FFFFFF',
                      color: freeDays === days ? '#166534' : '#334155',
                      fontWeight: freeDays === days ? 700 : 500
                    }}
                  >
                    {days === 7 ? '7 Days (Default)' : `${days} Days`}
                  </button>
                ))}

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', marginLeft: '0.5rem' }}>
                  <span style={{ fontSize: '0.8125rem', color: '#64748B' }}>Custom:</span>
                  <input
                    id="free-days"
                    type="number"
                    min={1}
                    max={365}
                    value={freeDays}
                    onChange={(e) => setFreeDays(Number(e.target.value))}
                    className="input-field"
                    style={{ width: '80px', padding: '0.375rem 0.5rem', fontSize: '0.8125rem' }}
                    required
                  />
                  <span style={{ fontSize: '0.8125rem', color: '#64748B' }}>days</span>
                </div>
              </div>
            </div>

            {/* Expiration Settings */}
            <div className="form-group" style={{ gridColumn: 'span 2' }}>
              <label className="form-label">Expiration Setting</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <input
                  type="checkbox"
                  id="code-never-expires"
                  checked={neverExpires}
                  onChange={(e) => setNeverExpires(e.target.checked)}
                  style={{ width: '18px', height: '18px', accentColor: '#4CAF50', cursor: 'pointer' }}
                />
                <label htmlFor="code-never-expires" style={{ fontSize: '0.875rem', cursor: 'pointer', margin: 0, fontWeight: 500 }}>
                  Never expires (Permanent referral code)
                </label>
              </div>

              {!neverExpires && (
                <div style={{ marginTop: '0.5rem' }}>
                  <input
                    id="code-expiry"
                    type="datetime-local"
                    value={expiresAt || ''}
                    onChange={(e) => setExpiresAt(e.target.value)}
                    className="input-field"
                    required={!neverExpires}
                  />
                </div>
              )}
            </div>

            <div className="form-group flex-center" style={{ gridColumn: 'span 2', justifyContent: 'flex-start', gap: '0.75rem' }}>
              <input
                type="checkbox"
                id="code-active"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                style={{ width: '18px', height: '18px', accentColor: '#4CAF50', cursor: 'pointer' }}
              />
              <label className="form-label" htmlFor="code-active" style={{ cursor: 'pointer', marginBottom: 0 }}>
                Active Code (Available for users to redeem during signup)
              </label>
            </div>

            <div style={{ gridColumn: 'span 2', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
              <button type="button" className="btn btn-outline" onClick={resetForm}>Cancel</button>
              <button type="submit" className="btn btn-primary">{editingCode ? 'Update Code' : 'Save Referral Code'}</button>
            </div>
          </form>
        </div>
      )}

      {/* Listing Table */}
      {loading ? (
        <div style={styles.loadingContainer}>
          <div style={styles.spinner}></div>
          <p>Loading referral codes...</p>
        </div>
      ) : (
        <div className="table-container">
          <table className="admin-table">
            <thead>
              <tr>
                <th style={{ width: '40px' }}>
                  <input
                    type="checkbox"
                    checked={promoCodes.length > 0 && selectedIds.length === promoCodes.length}
                    onChange={toggleSelectAll}
                    style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                  />
                </th>
                <th>Referral Code</th>
                <th>Assigned Sponsor</th>
                <th>Trial Days Granted</th>
                <th>Expiration</th>
                <th>Signups / Uses</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {promoCodes.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
                    No referral codes found. Click "Create Referral Code" to add one.
                  </td>
                </tr>
              ) : (
                promoCodes.map((item) => {
                  const isItemActive = item.status === 'active' || item.status === true || item.is_active === true;
                  const isSelected = selectedIds.includes(item.id);
                  const sponsorObj = item.sponsors;

                  return (
                    <tr key={item.id} style={{ backgroundColor: isSelected ? 'rgba(76, 175, 80, 0.05)' : undefined }}>
                      <td>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectRow(item.id)}
                          style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                        />
                      </td>

                      {/* Code */}
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <Ticket size={16} style={{ color: 'var(--primary)' }} />
                          <code style={{ fontFamily: 'monospace', fontSize: '0.95rem', fontWeight: 700, backgroundColor: '#F8FAFC', padding: '3px 8px', borderRadius: '4px', border: '1px solid #E2E8F0' }}>
                            {item.code}
                          </code>
                          <button
                            type="button"
                            onClick={() => handleCopy(item.code)}
                            style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', color: copiedCode === item.code ? '#16A34A' : '#94A3B8' }}
                            title="Copy code"
                          >
                            {copiedCode === item.code ? <Check size={14} color="#16A34A" /> : <Copy size={14} />}
                          </button>
                        </div>
                      </td>

                      {/* Sponsor */}
                      <td>
                        {sponsorObj ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Award size={14} color="#4CAF50" />
                            <span style={{ fontWeight: 600, color: '#0F172A' }}>{sponsorObj.name}</span>
                          </div>
                        ) : (
                          <span className="badge" style={{ backgroundColor: '#F1F5F9', color: '#64748B' }}>
                            System / Independent
                          </span>
                        )}
                      </td>

                      {/* Trial Days Granted */}
                      <td>
                        <span className="badge" style={{ backgroundColor: '#F0FDF4', color: '#166534', border: '1px solid #BBF7D0', fontWeight: 600 }}>
                          <Gift size={12} style={{ marginRight: '4px' }} />
                          {item.free_days || 7} Days Pro Trial
                        </span>
                      </td>

                      {/* Expiration */}
                      <td>
                        {item.expires_at ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8125rem' }}>
                            <Clock size={13} color="#D97706" />
                            <span>{new Date(item.expires_at).toLocaleDateString()}</span>
                          </div>
                        ) : (
                          <span style={{ fontSize: '0.8125rem', color: '#16A34A', fontWeight: 500 }}>
                            Never Expires
                          </span>
                        )}
                      </td>

                      {/* Usage */}
                      <td>
                        <span style={{ fontWeight: 700, color: '#0F172A' }}>
                          {item.unique_users_count || item.total_uses || 0}
                        </span>
                        <span style={{ fontSize: '0.75rem', color: '#64748B', marginLeft: '4px' }}>signups</span>
                      </td>

                      {/* Status */}
                      <td>
                        <button 
                          style={{ background: 'transparent', border: 'none', padding: 0, cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                          onClick={() => handleToggleActive(item)}
                          title={isItemActive ? 'Click to deactivate' : 'Click to activate'}
                        >
                          {isItemActive ? (
                            <span className="badge badge-success">Active</span>
                          ) : (
                            <span className="badge badge-error">Inactive</span>
                          )}
                        </button>
                      </td>

                      {/* Actions */}
                      <td>
                        <div style={{ display: 'flex', gap: '0.375rem', justifyContent: 'flex-end' }}>
                          <button
                            className="btn btn-outline btn-icon"
                            onClick={() => handleEditClick(item)}
                            title="Edit Code"
                          >
                            <Edit2 size={15} />
                          </button>
                          <button
                            className="btn btn-outline btn-icon"
                            onClick={() => handleDeleteCode(item.id)}
                            title="Delete Code"
                          >
                            <Trash2 size={15} style={{ color: 'var(--error)' }} />
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
            Page {page} of {totalPages} ({totalItems} total codes)
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
  pagination: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: '0.5rem',
  }
};

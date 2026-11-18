'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { 
  Award, 
  Plus, 
  Trash2, 
  Edit2, 
  Check, 
  X, 
  ShieldAlert, 
  Users, 
  DollarSign, 
  Search, 
  TrendingUp, 
  Wallet, 
  Link2, 
  Phone, 
  Mail, 
  ExternalLink,
  Building2,
  Percent,
  CheckCircle2,
  Clock
} from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase-browser';

export default function SponsorsPage() {
  const [sponsors, setSponsors] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalPartners: 0,
    activePartners: 0,
    totalReferredAccounts: 0,
    totalUnpaidOwed: 0
  });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editingSponsor, setEditingSponsor] = useState<any | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);

  // Form states
  const [name, setName] = useState('');
  const [partnerType, setPartnerType] = useState('gym');
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [discountPercentage, setDiscountPercentage] = useState(10);
  const [commissionPercentage, setCommissionPercentage] = useState(15);
  const [codePrefix, setCodePrefix] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [defaultFreeDays, setDefaultFreeDays] = useState<number | ''>(7);
  const [notes, setNotes] = useState('');

  const fetchSponsors = useCallback(async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch('/api/sponsors', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (res.ok) {
        const data = await res.json();
        setSponsors(data.sponsors || []);
        if (data.stats) setStats(data.stats);
      } else {
        toast.error('Failed to load sponsors list.');
      }
    } catch (err) {
      console.error(err);
      toast.error('Error fetching sponsors.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSponsors();
  }, [fetchSponsors]);

  const handleSaveSponsor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !contactEmail || !codePrefix) {
      toast.error('Please fill in partner name, email, and code prefix.');
      return;
    }

    const payload = {
      name,
      type: partnerType,
      contact_name: contactName || null,
      contact_email: contactEmail,
      contact_phone: contactPhone || null,
      discount_percentage: Number(discountPercentage),
      commission_percentage: Number(commissionPercentage),
      code_prefix: codePrefix.toUpperCase().trim(),
      status: isActive ? 'active' : 'inactive',
      default_free_days: defaultFreeDays !== '' ? Number(defaultFreeDays) : 7,
      notes: notes || null
    };

    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      let res;
      if (editingSponsor) {
        res = await fetch(`/api/sponsors/${editingSponsor.id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`
          },
          body: JSON.stringify(payload)
        });
      } else {
        res = await fetch('/api/sponsors', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`
          },
          body: JSON.stringify(payload)
        });
      }

      if (res.ok) {
        toast.success(editingSponsor ? 'Partner updated successfully.' : 'Partner registered successfully.');
        resetForm();
        fetchSponsors();
      } else {
        const err = await res.json();
        toast.error(err.error || 'Failed to save partner.');
      }
    } catch (err) {
      console.error(err);
      toast.error('Error saving partner.');
    }
  };

  const handleEditClick = (sponsor: any) => {
    setEditingSponsor(sponsor);
    setName(sponsor.name || '');
    setPartnerType(sponsor.type || 'gym');
    setContactName(sponsor.contact_name || '');
    setContactEmail(sponsor.contact_email || '');
    setContactPhone(sponsor.contact_phone || '');
    setDiscountPercentage(sponsor.discount_percentage ?? 10);
    setCommissionPercentage(sponsor.commission_percentage ?? 15);
    setCodePrefix(sponsor.code_prefix || '');
    setIsActive(sponsor.status === 'active' || sponsor.status === true || sponsor.is_active === true);
    setDefaultFreeDays(sponsor.default_free_days || 7);
    setNotes(sponsor.notes || '');
    setShowAddForm(true);
  };

  const handleDeleteSponsor = async (id: string) => {
    if (!confirm('Are you sure you want to permanently delete this sponsor partner?')) return;
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch(`/api/sponsors/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (res.ok) {
        toast.success('Partner deleted successfully.');
        fetchSponsors();
      } else {
        const err = await res.json();
        toast.error(err.error || 'Failed to delete partner.');
      }
    } catch (err) {
      console.error(err);
      toast.error('Error deleting partner.');
    }
  };

  const resetForm = () => {
    setEditingSponsor(null);
    setShowAddForm(false);
    setName('');
    setPartnerType('gym');
    setContactName('');
    setContactEmail('');
    setContactPhone('');
    setDiscountPercentage(10);
    setCommissionPercentage(15);
    setCodePrefix('');
    setIsActive(true);
    setDefaultFreeDays(7);
    setNotes('');
  };

  const filteredSponsors = sponsors.filter(s => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      s.name?.toLowerCase().includes(q) ||
      s.code_prefix?.toLowerCase().includes(q) ||
      s.contact_email?.toLowerCase().includes(q) ||
      s.contact_name?.toLowerCase().includes(q)
    );
  });

  return (
    <div style={styles.container}>
      {/* Header */}
      <div className="flex-between">
        <div>
          <h1 className="title-large">Sponsors & Gym Partners</h1>
          <p style={styles.subtitle}>
            Enterprise management of gym affiliations, influencer codes, commission payouts, and referral attribution.
          </p>
        </div>
        {!showAddForm && (
          <button 
            className="btn btn-primary flex-center" 
            style={{ gap: '0.5rem' }}
            onClick={() => { resetForm(); setShowAddForm(true); }}
          >
            <Plus size={16} />
            <span>Add New Partner</span>
          </button>
        )}
      </div>

      {/* KPI Overview Grid */}
      <div style={styles.kpiGrid}>
        <div style={styles.kpiCard}>
          <div style={styles.kpiHeader}>
            <span style={styles.kpiTitle}>Total Partners</span>
            <div style={{ ...styles.kpiIcon, backgroundColor: 'rgba(33, 150, 243, 0.1)', color: '#2196F3' }}>
              <Building2 size={18} />
            </div>
          </div>
          <div style={styles.kpiValue}>{stats.totalPartners}</div>
          <div style={styles.kpiSub}>{stats.activePartners} currently active</div>
        </div>

        <div style={styles.kpiCard}>
          <div style={styles.kpiHeader}>
            <span style={styles.kpiTitle}>Attributed Users</span>
            <div style={{ ...styles.kpiIcon, backgroundColor: 'rgba(76, 175, 80, 0.1)', color: '#4CAF50' }}>
              <Users size={18} />
            </div>
          </div>
          <div style={{ ...styles.kpiValue, color: '#16A34A' }}>{stats.totalReferredAccounts}</div>
          <div style={styles.kpiSub}>Registered via partner codes</div>
        </div>

        <div style={styles.kpiCard}>
          <div style={styles.kpiHeader}>
            <span style={styles.kpiTitle}>Pending Payouts</span>
            <div style={{ ...styles.kpiIcon, backgroundColor: 'rgba(255, 152, 0, 0.1)', color: '#FF9800' }}>
              <Clock size={18} />
            </div>
          </div>
          <div style={{ ...styles.kpiValue, color: '#D97706' }}>${stats.totalUnpaidOwed}</div>
          <div style={styles.kpiSub}>Unpaid commissions owed</div>
        </div>

        <div style={styles.kpiCard}>
          <div style={styles.kpiHeader}>
            <span style={styles.kpiTitle}>Quick Navigation</span>
            <div style={{ ...styles.kpiIcon, backgroundColor: 'rgba(100, 116, 139, 0.1)', color: '#64748B' }}>
              <Wallet size={18} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem' }}>
            <Link href="/dashboard/sponsor-payments" className="btn btn-outline" style={{ fontSize: '0.75rem', padding: '0.375rem 0.625rem' }}>
              Payout Center &rarr;
            </Link>
            <Link href="/dashboard/referral-tracking" className="btn btn-outline" style={{ fontSize: '0.75rem', padding: '0.375rem 0.625rem' }}>
              Logs &rarr;
            </Link>
          </div>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div style={styles.tabsRow}>
        <div style={styles.tabActivePill}>
          <Award size={15} />
          <span>Partners Directory ({stats.totalPartners})</span>
        </div>
        <Link href="/dashboard/referral-tracking" style={styles.tabLink}>
          <Link2 size={15} />
          <span>Referral Tracking Logs</span>
        </Link>
        <Link href="/dashboard/sponsor-payments" style={styles.tabLink}>
          <Wallet size={15} />
          <span>Commission Payouts & History</span>
        </Link>
      </div>

      {/* Add / Edit Partner Form */}
      {showAddForm && (
        <div className="card animate-fade-in" style={styles.formCard}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <h2 className="title-medium">
              {editingSponsor ? `Edit Partner: ${editingSponsor.name}` : 'Register New Sponsor Partner'}
            </h2>
            <button className="btn btn-outline btn-icon" onClick={resetForm}>
              <X size={16} />
            </button>
          </div>

          <form onSubmit={handleSaveSponsor} style={styles.formGrid}>
            <div className="form-group">
              <label className="form-label" htmlFor="sponsor-name">Partner / Organization Name *</label>
              <input
                id="sponsor-name"
                type="text"
                placeholder="e.g. Iron Fitness Beirut"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="input-field"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="partner-type">Partner Category</label>
              <select
                id="partner-type"
                value={partnerType}
                onChange={(e) => setPartnerType(e.target.value)}
                className="input-field"
              >
                <option value="gym">Gym / Fitness Club</option>
                <option value="influencer">Fitness Influencer / Creator</option>
                <option value="clinic">Nutrition Clinic / Dietitian</option>
                <option value="corporate">Corporate Wellness</option>
                <option value="partner">General Partner</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="contact-name">Contact Person</label>
              <input
                id="contact-name"
                type="text"
                placeholder="e.g. Coach Ziad"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                className="input-field"
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="contact-email">Contact Email *</label>
              <input
                id="contact-email"
                type="email"
                placeholder="ziad@ironfitness.lb"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                className="input-field"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="contact-phone">Phone Number</label>
              <input
                id="contact-phone"
                type="tel"
                placeholder="+961 70 987654"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                className="input-field"
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="code-prefix">Promo Code Prefix (UPPERCASE) *</label>
              <input
                id="code-prefix"
                type="text"
                placeholder="e.g. IRONFIT"
                value={codePrefix}
                onChange={(e) => setCodePrefix(e.target.value.toUpperCase().trim())}
                className="input-field"
                style={{ fontFamily: 'monospace', fontWeight: 700 }}
                maxLength={10}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="discount-pct">User Discount (% OFF) *</label>
              <input
                id="discount-pct"
                type="number"
                min={0}
                max={100}
                value={discountPercentage}
                onChange={(e) => setDiscountPercentage(Number(e.target.value))}
                className="input-field"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="commission-pct">Partner Commission Rate (%) *</label>
              <input
                id="commission-pct"
                type="number"
                min={0}
                max={100}
                value={commissionPercentage}
                onChange={(e) => setCommissionPercentage(Number(e.target.value))}
                className="input-field"
                required
              />
            </div>

            <div className="form-group" style={{ gridColumn: 'span 2' }}>
              <label className="form-label" htmlFor="partner-notes">Contract / Agreement Notes</label>
              <textarea
                id="partner-notes"
                rows={2}
                placeholder="Add special contractual terms, payout IBAN, or notes..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="input-field"
                style={{ resize: 'vertical' }}
              />
            </div>

            <div className="form-group flex-center" style={{ gridColumn: 'span 2', justifyContent: 'flex-start', gap: '0.75rem' }}>
              <input
                type="checkbox"
                id="sponsor-active"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                style={{ width: '18px', height: '18px', accentColor: '#4CAF50', cursor: 'pointer' }}
              />
              <label className="form-label" htmlFor="sponsor-active" style={{ cursor: 'pointer', marginBottom: 0 }}>
                Active Partnership (Allows code redemption and commission calculation)
              </label>
            </div>

            <div style={{ gridColumn: 'span 2', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
              <button type="button" className="btn btn-outline" onClick={resetForm}>Cancel</button>
              <button type="submit" className="btn btn-primary">
                {editingSponsor ? 'Update Partner Details' : 'Save & Register Partner'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Filter / Search Bar */}
      <div className="card" style={styles.filterCard}>
        <div style={styles.searchInputWrapper}>
          <Search size={18} style={styles.searchIcon} />
          <input
            type="text"
            placeholder="Search partners by name, code prefix, or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-field"
            style={styles.searchInput}
          />
        </div>
      </div>

      {/* Partners Table */}
      {loading ? (
        <div style={styles.loadingContainer}>
          <div style={styles.spinner}></div>
          <p>Loading partner directory...</p>
        </div>
      ) : (
        <div className="table-container">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Partner</th>
                <th>Type</th>
                <th>Contact</th>
                <th>Code Prefix</th>
                <th>Discount / Comm.</th>
                <th>Attributed Users</th>
                <th>Commission Status</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredSponsors.length === 0 ? (
                <tr>
                  <td colSpan={9} style={styles.emptyCell}>
                    No partners found matching your search.
                  </td>
                </tr>
              ) : (
                filteredSponsors.map((s) => (
                  <tr key={s.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                        <div style={styles.partnerBadgeIcon}>
                          <Award size={18} color="#4CAF50" />
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, color: '#0F172A', fontSize: '0.9375rem' }}>{s.name}</div>
                          {s.contact_name && (
                            <div style={{ fontSize: '0.75rem', color: '#64748B' }}>Contact: {s.contact_name}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="badge" style={{ backgroundColor: '#F1F5F9', color: '#475569', textTransform: 'capitalize' }}>
                        {s.type || 'Gym'}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <span style={{ fontSize: '0.8125rem', color: '#0F172A' }}>{s.contact_email}</span>
                        {s.contact_phone && (
                          <span style={{ fontSize: '0.75rem', color: '#94A3B8' }}>{s.contact_phone}</span>
                        )}
                      </div>
                    </td>
                    <td>
                      <span style={{ fontFamily: 'monospace', fontWeight: 700, backgroundColor: '#F8FAFC', padding: '3px 8px', borderRadius: '4px', border: '1px solid #E2E8F0' }}>
                        {s.code_prefix}
                      </span>
                    </td>
                    <td>
                      <div style={{ fontSize: '0.8125rem' }}>
                        <span style={{ color: '#16A34A', fontWeight: 600 }}>{s.discount_percentage ?? 10}% OFF</span>
                        <span style={{ color: '#94A3B8' }}> &bull; </span>
                        <span style={{ color: '#2563EB', fontWeight: 600 }}>{s.commission_percentage ?? 15}% Comm.</span>
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                        <Users size={14} color="#64748B" />
                        <span style={{ fontWeight: 700, color: '#0F172A' }}>{s.total_referrals_count || 0}</span>
                        <span style={{ fontSize: '0.75rem', color: '#64748B' }}>users</span>
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        {s.unpaid_commission > 0 ? (
                          <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#D97706' }}>
                            ${s.unpaid_commission} Owed
                          </span>
                        ) : (
                          <span style={{ fontSize: '0.8125rem', color: '#16A34A', fontWeight: 600 }}>
                            All Paid
                          </span>
                        )}
                        <span style={{ fontSize: '0.6875rem', color: '#94A3B8' }}>
                          ${s.paid_commission || 0} paid total
                        </span>
                      </div>
                    </td>
                    <td>
                      {s.status === 'active' || s.is_active === true ? (
                        <span className="badge badge-success">Active</span>
                      ) : (
                        <span className="badge badge-error">Inactive</span>
                      )}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.375rem', justifyContent: 'flex-end' }}>
                        <Link
                          href={`/dashboard/referral-tracking?sponsorId=${s.id}`}
                          className="btn btn-outline btn-icon"
                          title="View Referrals"
                        >
                          <Users size={15} />
                        </Link>
                        <Link
                          href="/dashboard/sponsor-payments"
                          className="btn btn-outline btn-icon"
                          title="Calculate Payout"
                        >
                          <Wallet size={15} />
                        </Link>
                        <button
                          className="btn btn-outline btn-icon"
                          onClick={() => handleEditClick(s)}
                          title="Edit Partner"
                        >
                          <Edit2 size={15} />
                        </button>
                        <button
                          className="btn btn-outline btn-icon"
                          onClick={() => handleDeleteSponsor(s.id)}
                          title="Delete Partner"
                        >
                          <Trash2 size={15} style={{ color: 'var(--error)' }} />
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
  formCard: {
    maxWidth: '850px',
    border: '1px solid #CBD5E1',
    boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
  },
  formGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '1rem',
  },
  filterCard: {
    padding: '0.875rem 1.25rem'
  },
  searchInputWrapper: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    width: '100%',
    maxWidth: '450px'
  },
  searchIcon: {
    position: 'absolute',
    left: '12px',
    color: 'var(--text-secondary)',
  },
  searchInput: {
    paddingLeft: '38px',
    width: '100%',
  },
  partnerBadgeIcon: {
    width: '36px',
    height: '36px',
    borderRadius: '8px',
    backgroundColor: '#F0FDF4',
    border: '1px solid #DCFCE7',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0
  },
  emptyCell: {
    textAlign: 'center',
    padding: '3rem 0',
    color: 'var(--text-secondary)',
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

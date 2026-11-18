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
  Users, 
  DollarSign, 
  Search, 
  Wallet, 
  Link2, 
  Copy,
  ExternalLink,
  Building2,
  Percent,
  CheckCircle2,
  Clock,
  Tag,
  Gift
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

  // Quick Add Code Modal state
  const [codeModalSponsor, setCodeModalSponsor] = useState<any | null>(null);
  const [newCodeString, setNewCodeString] = useState('');
  const [newCodeTrialDays, setNewCodeTrialDays] = useState<number>(7);
  const [newCodeExpiresAt, setNewCodeExpiresAt] = useState('');
  const [newCodeNeverExpires, setNewCodeNeverExpires] = useState(true);
  const [savingCode, setSavingCode] = useState(false);

  // View Codes Modal
  const [viewCodesSponsor, setViewCodesSponsor] = useState<any | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [partnerType, setPartnerType] = useState('gym');
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [commissionPercentage, setCommissionPercentage] = useState(15);
  const [codePrefix, setCodePrefix] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [defaultFreeDays, setDefaultFreeDays] = useState<number>(7);
  const [notes, setNotes] = useState('');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

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

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    toast.success(`Copied code "${code}" to clipboard!`);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleSaveSponsor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !contactEmail || !codePrefix) {
      toast.error('Please fill in partner name, email, and primary referral code.');
      return;
    }

    const payload = {
      name,
      type: partnerType,
      contact_name: contactName || null,
      contact_email: contactEmail,
      contact_phone: contactPhone || null,
      discount_percentage: 10,
      commission_percentage: Number(commissionPercentage),
      code_prefix: codePrefix.toUpperCase().trim(),
      status: isActive ? 'active' : 'inactive',
      default_free_days: Number(defaultFreeDays) || 7,
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
        toast.success(editingSponsor ? 'Sponsor updated successfully.' : 'Sponsor & primary referral code created!');
        resetForm();
        fetchSponsors();
      } else {
        const err = await res.json();
        toast.error(err.error || 'Failed to save sponsor.');
      }
    } catch (err) {
      console.error(err);
      toast.error('Error saving sponsor.');
    }
  };

  const handleCreateAdditionalCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!codeModalSponsor || !newCodeString) {
      toast.error('Please enter a referral code.');
      return;
    }

    setSavingCode(true);
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const payload = {
        code: newCodeString.toUpperCase().trim(),
        sponsor_id: codeModalSponsor.id,
        free_days: Number(newCodeTrialDays) || 7,
        expires_at: newCodeNeverExpires || !newCodeExpiresAt ? null : new Date(newCodeExpiresAt).toISOString(),
        status: 'active'
      };

      const res = await fetch('/api/promo-codes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        toast.success(`Referral code "${payload.code}" added for ${codeModalSponsor.name}!`);
        setCodeModalSponsor(null);
        setNewCodeString('');
        setNewCodeTrialDays(7);
        fetchSponsors();
      } else {
        const err = await res.json();
        toast.error(err.error || 'Failed to add referral code.');
      }
    } catch (err) {
      console.error(err);
      toast.error('Error adding referral code.');
    } finally {
      setSavingCode(false);
    }
  };

  const handleEditClick = (sponsor: any) => {
    setEditingSponsor(sponsor);
    setName(sponsor.name || '');
    setPartnerType(sponsor.type || 'gym');
    setContactName(sponsor.contact_name || '');
    setContactEmail(sponsor.contact_email || '');
    setContactPhone(sponsor.contact_phone || '');
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
        toast.success('Sponsor deleted successfully.');
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
      s.contact_name?.toLowerCase().includes(q) ||
      (s.referral_codes || []).some((rc: any) => rc.code?.toLowerCase().includes(q))
    );
  });

  return (
    <div style={styles.container}>
      {/* Header */}
      <div className="flex-between">
        <div>
          <h1 className="title-large">Sponsors & Gym Partners</h1>
          <p style={styles.subtitle}>
            Manage sponsors, assign primary referral codes, configure trial lengths & commission rates, and track payouts.
          </p>
        </div>
        {!showAddForm && (
          <button 
            className="btn btn-primary flex-center" 
            style={{ gap: '0.5rem' }}
            onClick={() => { resetForm(); setShowAddForm(true); }}
          >
            <Plus size={16} />
            <span>Add New Sponsor</span>
          </button>
        )}
      </div>

      {/* KPI Overview Grid */}
      <div style={styles.kpiGrid}>
        <div style={styles.kpiCard}>
          <div style={styles.kpiHeader}>
            <span style={styles.kpiTitle}>Total Sponsors</span>
            <div style={{ ...styles.kpiIcon, backgroundColor: 'rgba(33, 150, 243, 0.1)', color: '#2196F3' }}>
              <Building2 size={18} />
            </div>
          </div>
          <div style={styles.kpiValue}>{stats.totalPartners}</div>
          <div style={styles.kpiSub}>{stats.activePartners} active partners</div>
        </div>

        <div style={styles.kpiCard}>
          <div style={styles.kpiHeader}>
            <span style={styles.kpiTitle}>Attributed Users</span>
            <div style={{ ...styles.kpiIcon, backgroundColor: 'rgba(76, 175, 80, 0.1)', color: '#4CAF50' }}>
              <Users size={18} />
            </div>
          </div>
          <div style={{ ...styles.kpiValue, color: '#16A34A' }}>{stats.totalReferredAccounts}</div>
          <div style={styles.kpiSub}>Registered via sponsor referral codes</div>
        </div>

        <div style={styles.kpiCard}>
          <div style={styles.kpiHeader}>
            <span style={styles.kpiTitle}>Pending Payouts</span>
            <div style={{ ...styles.kpiIcon, backgroundColor: 'rgba(255, 152, 0, 0.1)', color: '#FF9800' }}>
              <Clock size={18} />
            </div>
          </div>
          <div style={{ ...styles.kpiValue, color: '#D97706' }}>${stats.totalUnpaidOwed}</div>
          <div style={styles.kpiSub}>Unpaid commissions owed to sponsors</div>
        </div>

        <div style={styles.kpiCard}>
          <div style={styles.kpiHeader}>
            <span style={styles.kpiTitle}>Quick Navigation</span>
            <div style={{ ...styles.kpiIcon, backgroundColor: 'rgba(100, 116, 139, 0.1)', color: '#64748B' }}>
              <Wallet size={18} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem' }}>
            <Link href="/dashboard/referral-tracking" className="btn btn-outline" style={{ fontSize: '0.75rem', padding: '0.375rem 0.625rem' }}>
              Referrals Ledger &rarr;
            </Link>
            <Link href="/dashboard/sponsor-payments" className="btn btn-outline" style={{ fontSize: '0.75rem', padding: '0.375rem 0.625rem' }}>
              Payout Center &rarr;
            </Link>
          </div>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div style={styles.tabsRow}>
        <div style={styles.tabActivePill}>
          <Award size={15} />
          <span>Sponsors Directory ({stats.totalPartners})</span>
        </div>
        <Link href="/dashboard/promo-codes" style={styles.tabLink}>
          <Tag size={15} />
          <span>All Referral Codes</span>
        </Link>
        <Link href="/dashboard/referral-tracking" style={styles.tabLink}>
          <Link2 size={15} />
          <span>Referral Tracking Ledger</span>
        </Link>
        <Link href="/dashboard/sponsor-payments" style={styles.tabLink}>
          <Wallet size={15} />
          <span>Sponsor Payouts</span>
        </Link>
      </div>

      {/* Add / Edit Sponsor Form */}
      {showAddForm && (
        <div className="card animate-fade-in" style={styles.formCard}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <div>
              <h2 className="title-medium">
                {editingSponsor ? `Edit Sponsor: ${editingSponsor.name}` : 'Register New Sponsor'}
              </h2>
              <p style={{ fontSize: '0.8125rem', color: '#64748B', marginTop: '2px' }}>
                Each sponsor has a primary referral code, a commission rate, and customizable trial days granted to new signups.
              </p>
            </div>
            <button className="btn btn-outline btn-icon" onClick={resetForm}>
              <X size={16} />
            </button>
          </div>

          <form onSubmit={handleSaveSponsor} style={styles.formGrid}>
            <div className="form-group">
              <label className="form-label" htmlFor="sponsor-name">Sponsor / Gym / Partner Name *</label>
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
              <label className="form-label" htmlFor="partner-type">Category</label>
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
              <label className="form-label" htmlFor="code-prefix">
                Unique Primary Referral Code *
              </label>
              <input
                id="code-prefix"
                type="text"
                placeholder="e.g. IRONFIT"
                value={codePrefix}
                onChange={(e) => setCodePrefix(e.target.value.toUpperCase().trim())}
                className="input-field"
                style={{ fontFamily: 'monospace', fontWeight: 700, letterSpacing: '0.05em' }}
                maxLength={20}
                required
              />
              <span style={{ fontSize: '0.75rem', color: '#64748B', marginTop: '4px', display: 'block' }}>
                New users enter this code at sign-up. You can also add more campaign codes later.
              </span>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="commission-pct">
                Sponsor Commission Rate (%) *
              </label>
              <div style={{ position: 'relative' }}>
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
                <Percent size={15} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
              </div>
              <span style={{ fontSize: '0.75rem', color: '#64748B', marginTop: '4px', display: 'block' }}>
                Commission percentage the sponsor earns when referred users subscribe.
              </span>
            </div>

            {/* Trial Days Granted Configuration */}
            <div className="form-group" style={{ gridColumn: 'span 2', backgroundColor: '#F8FAFC', padding: '1rem', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <Gift size={16} color="#16A34A" />
                <label className="form-label" htmlFor="free-days" style={{ fontWeight: 600, color: '#0F172A', marginBottom: 0 }}>
                  Free Trial Days Granted to Referred Signups
                </label>
              </div>
              <p style={{ fontSize: '0.8125rem', color: '#64748B', marginBottom: '0.75rem' }}>
                Standard app trial is 7 days. Give this sponsor's referred users an extended trial (e.g. 14, 30 days) to boost conversion.
              </p>
              
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                {[7, 14, 30, 60].map((days) => (
                  <button
                    key={days}
                    type="button"
                    onClick={() => setDefaultFreeDays(days)}
                    className="btn btn-outline"
                    style={{
                      fontSize: '0.8125rem',
                      padding: '0.375rem 0.75rem',
                      border: defaultFreeDays === days ? '2px solid #4CAF50' : '1px solid #CBD5E1',
                      backgroundColor: defaultFreeDays === days ? '#F0FDF4' : '#FFFFFF',
                      color: defaultFreeDays === days ? '#166534' : '#334155',
                      fontWeight: defaultFreeDays === days ? 700 : 500
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
                    value={defaultFreeDays}
                    onChange={(e) => setDefaultFreeDays(Number(e.target.value))}
                    className="input-field"
                    style={{ width: '80px', padding: '0.375rem 0.5rem', fontSize: '0.8125rem' }}
                  />
                  <span style={{ fontSize: '0.8125rem', color: '#64748B' }}>days</span>
                </div>
              </div>
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
                placeholder="+961 70 123456"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                className="input-field"
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="partner-notes">Payout Details / Agreement Notes</label>
              <input
                id="partner-notes"
                type="text"
                placeholder="Whish Money number, Bank IBAN, or notes..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="input-field"
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
                Active Partnership (Referral codes work immediately for signups and tracking)
              </label>
            </div>

            <div style={{ gridColumn: 'span 2', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
              <button type="button" className="btn btn-outline" onClick={resetForm}>Cancel</button>
              <button type="submit" className="btn btn-primary">
                {editingSponsor ? 'Update Sponsor' : 'Save & Register Sponsor'}
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
            placeholder="Search sponsors by name, referral code, or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-field"
            style={styles.searchInput}
          />
        </div>
      </div>

      {/* Sponsors Table */}
      {loading ? (
        <div style={styles.loadingContainer}>
          <div style={styles.spinner}></div>
          <p>Loading sponsors directory...</p>
        </div>
      ) : (
        <div className="table-container">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Sponsor & Category</th>
                <th>Contact</th>
                <th>Primary Referral Code</th>
                <th>Trial Granted</th>
                <th>Commission</th>
                <th>Attributed Users</th>
                <th>Commission Balance</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredSponsors.length === 0 ? (
                <tr>
                  <td colSpan={9} style={styles.emptyCell}>
                    No sponsors found matching your search.
                  </td>
                </tr>
              ) : (
                filteredSponsors.map((s) => {
                  const codes = s.referral_codes || [];
                  const extraCodesCount = codes.length > 1 ? codes.length - 1 : 0;
                  const primaryCode = s.primary_code || s.code_prefix || codes[0]?.code || '—';

                  return (
                    <tr key={s.id}>
                      {/* Sponsor Name & Type */}
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                          <div style={styles.partnerBadgeIcon}>
                            <Award size={18} color="#4CAF50" />
                          </div>
                          <div>
                            <div style={{ fontWeight: 700, color: '#0F172A', fontSize: '0.9375rem' }}>{s.name}</div>
                            <span className="badge" style={{ backgroundColor: '#F1F5F9', color: '#475569', textTransform: 'capitalize', fontSize: '0.7rem', marginTop: '2px' }}>
                              {s.type || 'Gym'}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Contact */}
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          {s.contact_name && (
                            <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#0F172A' }}>{s.contact_name}</span>
                          )}
                          <span style={{ fontSize: '0.75rem', color: '#64748B' }}>{s.contact_email}</span>
                          {s.contact_phone && (
                            <span style={{ fontSize: '0.75rem', color: '#94A3B8' }}>{s.contact_phone}</span>
                          )}
                        </div>
                      </td>

                      {/* Referral Codes */}
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', flexWrap: 'wrap' }}>
                          <div 
                            style={{ 
                              display: 'inline-flex', 
                              alignItems: 'center', 
                              gap: '6px', 
                              fontFamily: 'monospace', 
                              fontWeight: 700, 
                              backgroundColor: '#F8FAFC', 
                              padding: '4px 8px', 
                              borderRadius: '6px', 
                              border: '1px solid #CBD5E1',
                              fontSize: '0.875rem',
                              color: '#0F172A'
                            }}
                          >
                            <span>{primaryCode}</span>
                            <button
                              type="button"
                              onClick={() => handleCopy(primaryCode)}
                              style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', color: copiedCode === primaryCode ? '#16A34A' : '#94A3B8' }}
                              title="Copy referral code"
                            >
                              {copiedCode === primaryCode ? <Check size={13} /> : <Copy size={13} />}
                            </button>
                          </div>

                          {extraCodesCount > 0 && (
                            <button
                              type="button"
                              onClick={() => setViewCodesSponsor(s)}
                              className="badge"
                              style={{ backgroundColor: '#EFF6FF', color: '#2563EB', cursor: 'pointer', border: '1px solid #BFDBFE' }}
                              title="Click to view all referral codes"
                            >
                              +{extraCodesCount} more
                            </button>
                          )}
                        </div>
                      </td>

                      {/* Trial Days Granted */}
                      <td>
                        <span className="badge" style={{ backgroundColor: '#F0FDF4', color: '#166534', border: '1px solid #BBF7D0', fontWeight: 600 }}>
                          {s.default_free_days || 7} Days Trial
                        </span>
                      </td>

                      {/* Commission % */}
                      <td>
                        <span style={{ color: '#2563EB', fontWeight: 700, fontSize: '0.875rem' }}>
                          {s.commission_percentage ?? 15}% Comm.
                        </span>
                      </td>

                      {/* Attributed Users */}
                      <td>
                        <Link
                          href={`/dashboard/referral-tracking?sponsorId=${s.id}`}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem', textDecoration: 'none', color: '#0F172A' }}
                          title="View users referred by this sponsor"
                        >
                          <Users size={14} color="#64748B" />
                          <span style={{ fontWeight: 700, textDecoration: 'underline' }}>{s.total_referrals_count || 0}</span>
                          <span style={{ fontSize: '0.75rem', color: '#64748B' }}>users</span>
                        </Link>
                      </td>

                      {/* Commission Balance / Payout */}
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          {s.unpaid_commission > 0 ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <span style={{ fontSize: '0.875rem', fontWeight: 700, color: '#D97706' }}>
                                ${s.unpaid_commission.toFixed(2)} Owed
                              </span>
                              <Link
                                href={`/dashboard/sponsor-payments?sponsorId=${s.id}`}
                                className="btn btn-primary"
                                style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem', borderRadius: '4px', textDecoration: 'none' }}
                              >
                                Pay Now
                              </Link>
                            </div>
                          ) : (
                            <span style={{ fontSize: '0.8125rem', color: '#16A34A', fontWeight: 600 }}>
                              Settled ($0 Owed)
                            </span>
                          )}
                          <span style={{ fontSize: '0.6875rem', color: '#94A3B8' }}>
                            ${(s.paid_commission || 0).toFixed(2)} paid total
                          </span>
                        </div>
                      </td>

                      {/* Status */}
                      <td>
                        {s.status === 'active' || s.is_active === true ? (
                          <span className="badge badge-success">Active</span>
                        ) : (
                          <span className="badge badge-error">Inactive</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td>
                        <div style={{ display: 'flex', gap: '0.375rem', justifyContent: 'flex-end' }}>
                          <button
                            className="btn btn-outline btn-icon"
                            onClick={() => {
                              setCodeModalSponsor(s);
                              setNewCodeString('');
                              setNewCodeTrialDays(s.default_free_days || 7);
                            }}
                            title="Add Another Referral Code"
                          >
                            <Tag size={15} color="#2563EB" />
                          </button>
                          <Link
                            href={`/dashboard/referral-tracking?sponsorId=${s.id}`}
                            className="btn btn-outline btn-icon"
                            title="View Referrals Ledger"
                          >
                            <Users size={15} />
                          </Link>
                          <Link
                            href={`/dashboard/sponsor-payments?sponsorId=${s.id}`}
                            className="btn btn-outline btn-icon"
                            title="Record Sponsor Payout"
                          >
                            <Wallet size={15} />
                          </Link>
                          <button
                            className="btn btn-outline btn-icon"
                            onClick={() => handleEditClick(s)}
                            title="Edit Sponsor"
                          >
                            <Edit2 size={15} />
                          </button>
                          <button
                            className="btn btn-outline btn-icon"
                            onClick={() => handleDeleteSponsor(s.id)}
                            title="Delete Sponsor"
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

      {/* Modal: Quick Add Code to Sponsor */}
      {codeModalSponsor && (
        <div style={styles.modalOverlay}>
          <div className="card animate-fade-in" style={styles.modalCard}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div>
                <h3 className="title-medium" style={{ margin: 0 }}>Add Referral Code</h3>
                <p style={{ fontSize: '0.8125rem', color: '#64748B', marginTop: '2px' }}>
                  Assigning a new code to <strong>{codeModalSponsor.name}</strong>
                </p>
              </div>
              <button 
                className="btn btn-outline btn-icon" 
                onClick={() => setCodeModalSponsor(null)}
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateAdditionalCode} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label" htmlFor="new-code-input">Referral Code *</label>
                <input
                  id="new-code-input"
                  type="text"
                  placeholder="e.g. IRONWINTER"
                  value={newCodeString}
                  onChange={(e) => setNewCodeString(e.target.value.toUpperCase().trim())}
                  className="input-field"
                  style={{ fontFamily: 'monospace', fontWeight: 700 }}
                  required
                  autoFocus
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="new-code-days">Trial Days Granted to User</label>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  {[7, 14, 30].map(days => (
                    <button
                      key={days}
                      type="button"
                      onClick={() => setNewCodeTrialDays(days)}
                      className="btn btn-outline"
                      style={{
                        fontSize: '0.8125rem',
                        padding: '0.25rem 0.5rem',
                        border: newCodeTrialDays === days ? '2px solid #4CAF50' : '1px solid #CBD5E1',
                        backgroundColor: newCodeTrialDays === days ? '#F0FDF4' : '#FFFFFF',
                        fontWeight: newCodeTrialDays === days ? 700 : 500
                      }}
                    >
                      {days} Days
                    </button>
                  ))}
                  <input
                    id="new-code-days"
                    type="number"
                    min={1}
                    value={newCodeTrialDays}
                    onChange={(e) => setNewCodeTrialDays(Number(e.target.value))}
                    className="input-field"
                    style={{ width: '80px', padding: '0.25rem 0.5rem' }}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Expiration</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <input
                    type="checkbox"
                    id="code-never-expires"
                    checked={newCodeNeverExpires}
                    onChange={(e) => setNewCodeNeverExpires(e.target.checked)}
                    style={{ width: '16px', height: '16px', accentColor: '#4CAF50', cursor: 'pointer' }}
                  />
                  <label htmlFor="code-never-expires" style={{ fontSize: '0.8125rem', cursor: 'pointer', margin: 0 }}>
                    Never expires (Permanent campaign)
                  </label>
                </div>
                {!newCodeNeverExpires && (
                  <input
                    type="datetime-local"
                    value={newCodeExpiresAt}
                    onChange={(e) => setNewCodeExpiresAt(e.target.value)}
                    className="input-field"
                  />
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button type="button" className="btn btn-outline" onClick={() => setCodeModalSponsor(null)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={savingCode}>
                  {savingCode ? 'Adding...' : 'Add Referral Code'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: View All Codes for a Sponsor */}
      {viewCodesSponsor && (
        <div style={styles.modalOverlay}>
          <div className="card animate-fade-in" style={styles.modalCard}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div>
                <h3 className="title-medium" style={{ margin: 0 }}>Referral Codes</h3>
                <p style={{ fontSize: '0.8125rem', color: '#64748B', marginTop: '2px' }}>
                  Codes assigned to <strong>{viewCodesSponsor.name}</strong>
                </p>
              </div>
              <button 
                className="btn btn-outline btn-icon" 
                onClick={() => setViewCodesSponsor(null)}
              >
                <X size={16} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {(viewCodesSponsor.referral_codes || []).map((rc: any) => (
                <div 
                  key={rc.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.75rem',
                    backgroundColor: '#F8FAFC',
                    border: '1px solid #E2E8F0',
                    borderRadius: '6px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <code style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '0.9375rem' }}>{rc.code}</code>
                    {rc.code === viewCodesSponsor.code_prefix && (
                      <span className="badge" style={{ backgroundColor: '#FEF3C7', color: '#92400E', fontSize: '0.6875rem' }}>
                        Primary
                      </span>
                    )}
                    <span className="badge" style={{ backgroundColor: '#F0FDF4', color: '#166534', fontSize: '0.6875rem' }}>
                      {rc.free_days || viewCodesSponsor.default_free_days || 7}d Trial
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span className={`badge ${rc.status === 'active' ? 'badge-success' : 'badge-error'}`} style={{ fontSize: '0.7rem' }}>
                      {rc.status}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopy(rc.code)}
                      className="btn btn-outline btn-icon"
                      style={{ padding: '4px' }}
                      title="Copy code"
                    >
                      {copiedCode === rc.code ? <Check size={14} color="#16A34A" /> : <Copy size={14} />}
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.25rem' }}>
              <button 
                type="button" 
                className="btn btn-primary"
                onClick={() => {
                  const s = viewCodesSponsor;
                  setViewCodesSponsor(null);
                  setCodeModalSponsor(s);
                  setNewCodeString('');
                  setNewCodeTrialDays(s.default_free_days || 7);
                }}
              >
                <Plus size={14} style={{ marginRight: '4px' }} />
                <span>Add Another Code</span>
              </button>
            </div>
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
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: '1rem'
  },
  modalCard: {
    width: '100%',
    maxWidth: '480px',
    backgroundColor: '#FFFFFF',
    border: '1px solid #CBD5E1',
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
    borderRadius: '12px',
    padding: '1.5rem'
  }
};

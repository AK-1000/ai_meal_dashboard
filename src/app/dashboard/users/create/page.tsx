'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft, 
  UserPlus, 
  User, 
  Mail, 
  Lock, 
  Phone, 
  Globe, 
  Sparkles, 
  Calendar, 
  CheckCircle2, 
  Award, 
  Copy, 
  Check, 
  Eye, 
  EyeOff, 
  Clock, 
  CreditCard, 
  Send,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase-browser';
import { COUNTRIES } from '@/lib/countries';

export default function CreateUserPage() {
  const router = useRouter();

  // Basic Info
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [copiedPassword, setCopiedPassword] = useState(false);
  const [phone, setPhone] = useState('');
  const [country, setCountry] = useState('Lebanon');

  // Plan & Trial Configuration
  // accountType: 'pro_trial' | 'paid'
  const [accountType, setAccountType] = useState<'pro_trial' | 'paid'>('pro_trial');
  
  // Pro Trial options
  const [trialPreset, setTrialPreset] = useState<'7' | '14' | '30' | 'custom_days' | 'custom_date'>('7');
  const [customTrialDays, setCustomTrialDays] = useState(21);
  const [customTrialEndDate, setCustomTrialEndDate] = useState('');
  const [rolloverBillingCycle, setRolloverBillingCycle] = useState<'monthly' | 'yearly'>('monthly');

  // Paid Plan options
  const [paidTier, setPaidTier] = useState<'pro' | 'vip'>('pro');
  const [paidBillingCycle, setPaidBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [customPaidEndDate, setCustomPaidEndDate] = useState('');

  // Sponsor / Referral
  const [sponsors, setSponsors] = useState<any[]>([]);
  const [selectedSponsorId, setSelectedSponsorId] = useState('');

  // Email & Verification
  const [sendWelcomeEmail, setSendWelcomeEmail] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Success State
  const [createdUser, setCreatedUser] = useState<any | null>(null);

  // Generate a random secure password
  const generatePassword = () => {
    const chars = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#$%&*';
    let pass = 'AiM';
    for (let i = 0; i < 9; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setPassword(pass);
  };

  useEffect(() => {
    generatePassword();
    fetchSponsors();
  }, []);

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

  // Calculate Trial End Date preview
  const getTrialDetails = () => {
    const now = new Date();
    let days = 7;
    let end = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    if (trialPreset === '7') {
      days = 7;
      end = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    } else if (trialPreset === '14') {
      days = 14;
      end = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
    } else if (trialPreset === '30') {
      days = 30;
      end = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    } else if (trialPreset === 'custom_days') {
      days = Number(customTrialDays) || 1;
      end = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
    } else if (trialPreset === 'custom_date' && customTrialEndDate) {
      end = new Date(customTrialEndDate);
      const diffMs = end.getTime() - now.getTime();
      days = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
    }

    return { days, endDateStr: end.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }), isoEndDate: end.toISOString() };
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedPassword(true);
    setTimeout(() => setCopiedPassword(false), 2000);
    toast.success('Credentials copied to clipboard');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Email and password are required');
      return;
    }

    setIsSubmitting(true);
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Your session expired. Please log in again.');
        return;
      }

      const trialInfo = getTrialDetails();
      const PRO_PLAN_ID = 'e203edfc-8109-4f44-af32-12b5723c1f15';
      const VIP_PLAN_ID = '7080e55e-0002-494b-ada6-763d74325040';
      const FREE_PLAN_ID = '00000000-0000-0000-0000-000000000001';

      const payload: any = {
        name,
        email,
        password,
        phone: phone || null,
        country,
        accountType,
        sponsorId: selectedSponsorId || null,
        sendWelcomeEmail
      };

      if (accountType === 'pro_trial') {
        payload.planId = PRO_PLAN_ID;
        payload.trialDays = trialInfo.days;
        payload.trialStartDate = new Date().toISOString();
        payload.trialEndDate = trialInfo.isoEndDate;
        payload.billingCycle = rolloverBillingCycle;
      } else {
        payload.planId = paidTier === 'vip' ? VIP_PLAN_ID : PRO_PLAN_ID;
        payload.billingCycle = paidBillingCycle;
        payload.planStartDate = new Date().toISOString();
        payload.planEndDate = customPaidEndDate ? new Date(customPaidEndDate).toISOString() : null;
      }

      const res = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (res.ok && data.success) {
        toast.success(`User ${email} created successfully!`);
        setCreatedUser({
          id: data.user.id,
          name: name || 'User',
          email,
          password,
          tier: data.user.subscription_tier,
          status: data.user.subscription_status,
          trial_status: data.user.trial_status,
          trial_ends_at: data.user.trial_ends_at
        });
      } else {
        toast.error(data.error || 'Failed to create user');
      }
    } catch (err: any) {
      console.error('Error creating user:', err);
      toast.error(err.message || 'Error occurred while creating user');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetForNext = () => {
    setName('');
    setEmail('');
    setPhone('');
    generatePassword();
    setCreatedUser(null);
  };

  const trialDetails = getTrialDetails();

  return (
    <div style={styles.container}>
      {/* Top Header & Breadcrumbs */}
      <div style={styles.header}>
        <div style={styles.breadcrumb}>
          <Link href="/dashboard/users" style={styles.breadcrumbLink}>
            <ArrowLeft size={16} />
            <span>Back to Users</span>
          </Link>
          <span style={styles.breadcrumbSeparator}>/</span>
          <span style={styles.breadcrumbCurrent}>Create User</span>
        </div>
        <div style={styles.headerTitleRow}>
          <div>
            <h1 className="title-large" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <UserPlus className="text-primary" size={28} />
              <span>Add New User</span>
            </h1>
            <p style={styles.subtitle}>
              Provision a new user account with customized Pro trial duration or paid subscription (Pro / VIP).
            </p>
          </div>
        </div>
      </div>

      {/* Success Modal / Banner */}
      {createdUser && (
        <div className="card" style={styles.successCard}>
          <div style={styles.successHeader}>
            <div style={styles.successIcon}>
              <CheckCircle2 size={24} color="#4CAF50" />
            </div>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#1B5E20' }}>
                Account Created Successfully!
              </h2>
              <p style={{ color: '#2E7D32', fontSize: '0.875rem' }}>
                The user account is now active and ready to log in immediately.
              </p>
            </div>
          </div>

          <div style={styles.credentialsBox}>
            <div style={styles.credRow}>
              <span style={styles.credLabel}>Email:</span>
              <span style={styles.credValue}>{createdUser.email}</span>
            </div>
            <div style={styles.credRow}>
              <span style={styles.credLabel}>Password:</span>
              <span style={styles.credValue}>{createdUser.password}</span>
            </div>
            <div style={styles.credRow}>
              <span style={styles.credLabel}>Account Type:</span>
              <span className="badge badge-success" style={{ textTransform: 'uppercase' }}>
                {createdUser.trial_status === 'active' ? 'Pro Plan Trial' : createdUser.tier}
              </span>
            </div>
            {createdUser.trial_ends_at && (
              <div style={styles.credRow}>
                <span style={styles.credLabel}>Trial Expiration:</span>
                <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#D97706' }}>
                  {new Date(createdUser.trial_ends_at).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric'
                  })}
                </span>
              </div>
            )}
          </div>

          <div style={styles.successActions}>
            <button
              onClick={() => copyToClipboard(`Email: ${createdUser.email}\nPassword: ${createdUser.password}`)}
              className="btn btn-secondary flex-center"
              style={{ gap: '0.5rem' }}
            >
              {copiedPassword ? <Check size={16} /> : <Copy size={16} />}
              <span>{copiedPassword ? 'Copied' : 'Copy Credentials'}</span>
            </button>
            <button
              onClick={handleResetForNext}
              className="btn btn-outline"
            >
              Add Another User
            </button>
            <Link
              href={`/dashboard/users/${createdUser.id}`}
              className="btn btn-primary"
            >
              View Full User Profile
            </Link>
          </div>
        </div>
      )}

      {/* Main Form */}
      {!createdUser && (
        <form onSubmit={handleSubmit} style={styles.formGrid}>
          {/* Left Column: Account & Profile Details */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div className="card" style={styles.card}>
              <div style={styles.cardHeader}>
                <div style={styles.cardIconBox}>
                  <User size={18} color="#4CAF50" />
                </div>
                <div>
                  <h2 style={styles.cardTitle}>Account Credentials</h2>
                  <p style={styles.cardSubtitle}>Basic profile and authentication</p>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Full Name</label>
                <div style={styles.inputWrapper}>
                  <User size={16} style={styles.inputIcon} />
                  <input
                    type="text"
                    className="input-field"
                    style={{ paddingLeft: '2.5rem' }}
                    placeholder="e.g. Sarah Connor"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Email Address *</label>
                <div style={styles.inputWrapper}>
                  <Mail size={16} style={styles.inputIcon} />
                  <input
                    type="email"
                    required
                    className="input-field"
                    style={{ paddingLeft: '2.5rem' }}
                    placeholder="sarah@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label className="form-label">Temporary Password *</label>
                  <button
                    type="button"
                    onClick={generatePassword}
                    style={styles.textButton}
                  >
                    Generate Random
                  </button>
                </div>
                <div style={styles.inputWrapper}>
                  <Lock size={16} style={styles.inputIcon} />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    className="input-field"
                    style={{ paddingLeft: '2.5rem', paddingRight: '4.5rem', fontFamily: 'monospace' }}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <div style={styles.passwordActions}>
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      style={styles.iconBtn}
                      title={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(password)}
                      style={styles.iconBtn}
                      title="Copy password"
                    >
                      {copiedPassword ? <Check size={16} color="#4CAF50" /> : <Copy size={16} />}
                    </button>
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Phone Number</label>
                  <div style={styles.inputWrapper}>
                    <Phone size={16} style={styles.inputIcon} />
                    <input
                      type="tel"
                      className="input-field"
                      style={{ paddingLeft: '2.5rem' }}
                      placeholder="+961 70 123456"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Country</label>
                  <div style={styles.inputWrapper}>
                    <Globe size={16} style={styles.inputIcon} />
                    <select
                      className="input-field"
                      style={{ paddingLeft: '2.5rem' }}
                      value={country}
                      onChange={(e) => setCountry(e.target.value)}
                    >
                      {COUNTRIES.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Attribution & Sponsor */}
            <div className="card" style={styles.card}>
              <div style={styles.cardHeader}>
                <div style={styles.cardIconBox}>
                  <Award size={18} color="#FF9800" />
                </div>
                <div>
                  <h2 style={styles.cardTitle}>Sponsor / Referral Attribution</h2>
                  <p style={styles.cardSubtitle}>Attribute this user to an affiliate or gym partner</p>
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Assign Sponsor (Optional)</label>
                <select
                  className="input-field"
                  value={selectedSponsorId}
                  onChange={(e) => setSelectedSponsorId(e.target.value)}
                >
                  <option value="">No Sponsor (Direct Signup)</option>
                  {sponsors.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.code_prefix} - {s.commission_percentage}% commission)
                    </option>
                  ))}
                </select>
                <p style={styles.hintText}>
                  Attributed users generate commission tracking records upon subscription renewals.
                </p>
              </div>
            </div>

            {/* Delivery & Options */}
            <div className="card" style={styles.card}>
              <div style={styles.cardHeader}>
                <div style={styles.cardIconBox}>
                  <Send size={18} color="#2196F3" />
                </div>
                <div>
                  <h2 style={styles.cardTitle}>Notification & Verification</h2>
                  <p style={styles.cardSubtitle}>Credentials delivery options</p>
                </div>
              </div>

              <label style={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={sendWelcomeEmail}
                  onChange={(e) => setSendWelcomeEmail(e.target.checked)}
                  style={styles.checkbox}
                />
                <div>
                  <span style={{ fontWeight: 600, fontSize: '0.875rem', color: '#1E293B' }}>
                    Send welcome email with credentials
                  </span>
                  <p style={{ fontSize: '0.75rem', color: '#64748B', marginTop: '2px' }}>
                    Delivers username, temporary password, and plan access details to their inbox.
                  </p>
                </div>
              </label>

              <div style={styles.verifiedNotice}>
                <ShieldCheck size={18} color="#4CAF50" />
                <span style={{ fontSize: '0.8125rem', color: '#1B5E20' }}>
                  Admin-created accounts are automatically pre-verified (no email confirmation link required).
                </span>
              </div>
            </div>
          </div>

          {/* Right Column: Plan & Pro Trial Configuration */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div className="card" style={styles.card}>
              <div style={styles.cardHeader}>
                <div style={styles.cardIconBox}>
                  <Sparkles size={18} color="#4CAF50" />
                </div>
                <div>
                  <h2 style={styles.cardTitle}>Plan & Pro Trial Setup</h2>
                  <p style={styles.cardSubtitle}>Configure subscription access and trial window</p>
                </div>
              </div>

              {/* Type Switcher Cards */}
              <div style={styles.planSelectorGrid}>
                {/* 1. Pro Plan Trial */}
                <div
                  onClick={() => setAccountType('pro_trial')}
                  style={{
                    ...styles.planChoiceCard,
                    ...(accountType === 'pro_trial' ? styles.planChoiceCardActive : {})
                  }}
                >
                  <div style={styles.planChoiceHeader}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <div style={accountType === 'pro_trial' ? styles.radioSelected : styles.radioUnselected} />
                      <span style={styles.planChoiceTitle}>Pro Plan Trial</span>
                    </div>
                    <span style={styles.recommendedBadge}>Recommended</span>
                  </div>
                  <p style={styles.planChoiceDesc}>
                    Full access to AI meal plans & workout coach for a flexible trial period.
                  </p>
                </div>

                {/* 2. Paid Subscription */}
                <div
                  onClick={() => setAccountType('paid')}
                  style={{
                    ...styles.planChoiceCard,
                    ...(accountType === 'paid' ? styles.planChoiceCardActive : {})
                  }}
                >
                  <div style={styles.planChoiceHeader}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <div style={accountType === 'paid' ? styles.radioSelected : styles.radioUnselected} />
                      <span style={styles.planChoiceTitle}>Paid Subscription</span>
                    </div>
                    <CreditCard size={16} color="#64748B" />
                  </div>
                  <p style={styles.planChoiceDesc}>
                    Direct paid subscription without a trial window (Pro or VIP).
                  </p>
                </div>
              </div>

              {/* Detail configuration for PRO TRIAL */}
              {accountType === 'pro_trial' && (
                <div style={styles.detailConfigSection}>
                  <h3 style={styles.configSectionTitle}>
                    <Clock size={16} color="#4CAF50" />
                    <span>Select Pro Trial Duration</span>
                  </h3>

                  {/* Duration Presets */}
                  <div style={styles.presetGrid}>
                    <button
                      type="button"
                      onClick={() => setTrialPreset('7')}
                      style={{
                        ...styles.presetButton,
                        ...(trialPreset === '7' ? styles.presetButtonActive : {})
                      }}
                    >
                      <span style={styles.presetDays}>7 Days</span>
                      <span style={styles.presetSub}>Standard IAP</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setTrialPreset('14')}
                      style={{
                        ...styles.presetButton,
                        ...(trialPreset === '14' ? styles.presetButtonActive : {})
                      }}
                    >
                      <span style={styles.presetDays}>14 Days</span>
                      <span style={styles.presetSub}>2 Weeks</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setTrialPreset('30')}
                      style={{
                        ...styles.presetButton,
                        ...(trialPreset === '30' ? styles.presetButtonActive : {})
                      }}
                    >
                      <span style={styles.presetDays}>30 Days</span>
                      <span style={styles.presetSub}>1 Month</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setTrialPreset('custom_days')}
                      style={{
                        ...styles.presetButton,
                        ...(trialPreset === 'custom_days' ? styles.presetButtonActive : {})
                      }}
                    >
                      <span style={styles.presetDays}>Custom</span>
                      <span style={styles.presetSub}>Enter Days</span>
                    </button>
                  </div>

                  {/* Custom Days Input */}
                  {trialPreset === 'custom_days' && (
                    <div className="form-group" style={{ marginTop: '1rem' }}>
                      <label className="form-label">Trial Length (Number of Days)</label>
                      <input
                        type="number"
                        min="1"
                        max="365"
                        className="input-field"
                        value={customTrialDays}
                        onChange={(e) => setCustomTrialDays(Number(e.target.value))}
                      />
                    </div>
                  )}

                  {/* Rollover Billing Cycle */}
                  <div className="form-group" style={{ marginTop: '1.25rem' }}>
                    <label className="form-label">Rollover Plan (After Trial Concludes)</label>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                      <button
                        type="button"
                        onClick={() => setRolloverBillingCycle('monthly')}
                        style={{
                          ...styles.cycleButton,
                          ...(rolloverBillingCycle === 'monthly' ? styles.cycleButtonActive : {})
                        }}
                      >
                        <span style={{ fontWeight: 600 }}>Pro Monthly</span>
                        <span style={{ fontSize: '0.75rem', opacity: 0.8 }}>$10.99 / mo</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setRolloverBillingCycle('yearly')}
                        style={{
                          ...styles.cycleButton,
                          ...(rolloverBillingCycle === 'yearly' ? styles.cycleButtonActive : {})
                        }}
                      >
                        <span style={{ fontWeight: 600 }}>Pro Yearly</span>
                        <span style={{ fontSize: '0.75rem', opacity: 0.8 }}>$89.99 / yr</span>
                      </button>
                    </div>
                  </div>

                  {/* Live Trial Preview Banner */}
                  <div style={styles.trialSummaryBox}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Sparkles size={18} color="#2E7D32" />
                      <span style={{ fontWeight: 700, color: '#1B5E20', fontSize: '0.875rem' }}>
                        Active Pro Trial Summary
                      </span>
                    </div>
                    <p style={{ fontSize: '0.8125rem', color: '#2E7D32', marginTop: '0.375rem', lineHeight: 1.5 }}>
                      User will enjoy <strong>{trialDetails.days} days</strong> of full Pro access from today until <strong>{trialDetails.endDateStr}</strong>. Database status will be set to <code>trialing</code> with <code>trial_status: active</code>.
                    </p>
                  </div>
                </div>
              )}

              {/* Detail configuration for PAID SUBSCRIPTION */}
              {accountType === 'paid' && (
                <div style={styles.detailConfigSection}>
                  <h3 style={styles.configSectionTitle}>
                    <CreditCard size={16} color="#2196F3" />
                    <span>Select Paid Tier & Billing Cycle</span>
                  </h3>

                  <div className="form-group">
                    <label className="form-label">Subscription Tier</label>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                      <button
                        type="button"
                        onClick={() => setPaidTier('pro')}
                        style={{
                          ...styles.cycleButton,
                          ...(paidTier === 'pro' ? styles.cycleButtonActive : {})
                        }}
                      >
                        <span style={{ fontWeight: 600 }}>Pro Plan</span>
                        <span style={{ fontSize: '0.75rem', opacity: 0.8 }}>Full AI features</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setPaidTier('vip')}
                        style={{
                          ...styles.cycleButton,
                          ...(paidTier === 'vip' ? styles.cycleButtonActive : {})
                        }}
                      >
                        <span style={{ fontWeight: 600 }}>VIP Plan</span>
                        <span style={{ fontSize: '0.75rem', opacity: 0.8 }}>Priority coach</span>
                      </button>
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Billing Cycle</label>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                      <button
                        type="button"
                        onClick={() => setPaidBillingCycle('monthly')}
                        style={{
                          ...styles.cycleButton,
                          ...(paidBillingCycle === 'monthly' ? styles.cycleButtonActive : {})
                        }}
                      >
                        Monthly
                      </button>
                      <button
                        type="button"
                        onClick={() => setPaidBillingCycle('yearly')}
                        style={{
                          ...styles.cycleButton,
                          ...(paidBillingCycle === 'yearly' ? styles.cycleButtonActive : {})
                        }}
                      >
                        Yearly
                      </button>
                    </div>
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Custom End Date (Optional)</label>
                    <input
                      type="date"
                      className="input-field"
                      value={customPaidEndDate}
                      onChange={(e) => setCustomPaidEndDate(e.target.value)}
                    />
                    <p style={styles.hintText}>
                      Leave blank to automatically calculate based on billing cycle (30 days or 365 days).
                    </p>
                  </div>
                </div>
              )}


            </div>

            {/* Bottom Submission Bar */}
            <div className="card" style={{ ...styles.card, padding: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', alignItems: 'center' }}>
                <Link href="/dashboard/users" className="btn btn-secondary">
                  Cancel
                </Link>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn btn-primary"
                  style={{ minWidth: '160px', gap: '0.5rem' }}
                >
                  {isSubmitting ? (
                    <div style={styles.smallSpinner} />
                  ) : (
                    <>
                      <UserPlus size={16} />
                      <span>Create User</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem',
    maxWidth: '1200px',
    margin: '0 auto',
    paddingBottom: '3rem'
  },
  header: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem'
  },
  breadcrumb: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    fontSize: '0.875rem'
  },
  breadcrumbLink: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.375rem',
    color: '#64748B',
    fontWeight: 500,
    textDecoration: 'none'
  },
  breadcrumbSeparator: {
    color: '#CBD5E1'
  },
  breadcrumbCurrent: {
    color: '#1E293B',
    fontWeight: 600
  },
  headerTitleRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start'
  },
  subtitle: {
    color: '#64748B',
    fontSize: '0.875rem',
    marginTop: '0.25rem'
  },
  formGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '1.5rem'
  },
  card: {
    background: '#FFFFFF',
    borderRadius: '12px',
    border: '1px solid #E2E8F0',
    padding: '1.5rem',
    boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
  },
  cardHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    marginBottom: '1.25rem',
    paddingBottom: '0.75rem',
    borderBottom: '1px solid #F1F5F9'
  },
  cardIconBox: {
    width: '36px',
    height: '36px',
    borderRadius: '8px',
    backgroundColor: '#F8FAFC',
    border: '1px solid #E2E8F0',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  cardTitle: {
    fontSize: '1rem',
    fontWeight: 700,
    color: '#0F172A'
  },
  cardSubtitle: {
    fontSize: '0.75rem',
    color: '#64748B'
  },
  inputWrapper: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center'
  },
  inputIcon: {
    position: 'absolute',
    left: '0.875rem',
    color: '#94A3B8'
  },
  textButton: {
    background: 'transparent',
    border: 'none',
    color: '#4CAF50',
    fontSize: '0.75rem',
    fontWeight: 600,
    cursor: 'pointer',
    padding: 0
  },
  passwordActions: {
    position: 'absolute',
    right: '0.5rem',
    display: 'flex',
    alignItems: 'center',
    gap: '0.25rem'
  },
  iconBtn: {
    background: 'transparent',
    border: 'none',
    padding: '0.375rem',
    borderRadius: '4px',
    color: '#64748B',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  hintText: {
    fontSize: '0.75rem',
    color: '#94A3B8',
    marginTop: '0.375rem'
  },
  checkboxLabel: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '0.75rem',
    cursor: 'pointer',
    marginBottom: '1rem'
  },
  checkbox: {
    marginTop: '3px',
    width: '16px',
    height: '16px',
    accentColor: '#4CAF50'
  },
  verifiedNotice: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.75rem 1rem',
    backgroundColor: '#F0FDF4',
    border: '1px solid #DCFCE7',
    borderRadius: '8px'
  },
  planSelectorGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
    marginBottom: '1.25rem'
  },
  planChoiceCard: {
    padding: '1rem',
    borderRadius: '10px',
    border: '2px solid #E2E8F0',
    backgroundColor: '#FFFFFF',
    cursor: 'pointer',
    transition: 'all 0.15s ease'
  },
  planChoiceCardActive: {
    border: '2px solid #4CAF50',
    backgroundColor: '#F0FDF4'
  },
  planChoiceHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '0.375rem'
  },
  planChoiceTitle: {
    fontWeight: 700,
    fontSize: '0.9375rem',
    color: '#0F172A'
  },
  planChoiceDesc: {
    fontSize: '0.8125rem',
    color: '#64748B',
    marginLeft: '1.625rem'
  },
  recommendedBadge: {
    fontSize: '0.6875rem',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    backgroundColor: '#DCFCE7',
    color: '#15803D',
    padding: '2px 8px',
    borderRadius: '12px'
  },
  radioSelected: {
    width: '16px',
    height: '16px',
    borderRadius: '50%',
    backgroundColor: '#4CAF50',
    border: '4px solid #FFFFFF',
    boxShadow: '0 0 0 2px #4CAF50'
  },
  radioUnselected: {
    width: '16px',
    height: '16px',
    borderRadius: '50%',
    border: '2px solid #CBD5E1'
  },
  detailConfigSection: {
    padding: '1.25rem',
    backgroundColor: '#F8FAFC',
    borderRadius: '10px',
    border: '1px solid #E2E8F0'
  },
  configSectionTitle: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    fontSize: '0.875rem',
    fontWeight: 700,
    color: '#1E293B',
    marginBottom: '1rem'
  },
  presetGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '0.625rem'
  },
  presetButton: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '0.75rem 0.5rem',
    backgroundColor: '#FFFFFF',
    border: '1px solid #CBD5E1',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.15s ease'
  },
  presetButtonActive: {
    border: '1px solid #4CAF50',
    backgroundColor: '#ECFDF5',
    boxShadow: '0 0 0 1px #4CAF50'
  },
  presetDays: {
    fontSize: '0.875rem',
    fontWeight: 700,
    color: '#0F172A'
  },
  presetSub: {
    fontSize: '0.6875rem',
    color: '#64748B',
    marginTop: '2px'
  },
  cycleButton: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '0.75rem',
    backgroundColor: '#FFFFFF',
    border: '1px solid #CBD5E1',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.15s ease'
  },
  cycleButtonActive: {
    border: '1px solid #4CAF50',
    backgroundColor: '#ECFDF5',
    color: '#065F46'
  },
  trialSummaryBox: {
    marginTop: '1.25rem',
    padding: '0.875rem 1rem',
    backgroundColor: '#ECFDF5',
    border: '1px solid #A7F3D0',
    borderRadius: '8px'
  },
  successCard: {
    backgroundColor: '#FFFFFF',
    border: '1px solid #BBF7D0',
    padding: '2rem',
    borderRadius: '12px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
  },
  successHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    marginBottom: '1.5rem'
  },
  successIcon: {
    width: '48px',
    height: '48px',
    borderRadius: '50%',
    backgroundColor: '#DCFCE7',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  credentialsBox: {
    backgroundColor: '#F8FAFC',
    border: '1px solid #E2E8F0',
    borderRadius: '8px',
    padding: '1.25rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
    marginBottom: '1.5rem'
  },
  credRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: '0.9375rem'
  },
  credLabel: {
    color: '#64748B',
    fontWeight: 500
  },
  credValue: {
    fontFamily: 'monospace',
    fontWeight: 700,
    color: '#0F172A'
  },
  successActions: {
    display: 'flex',
    gap: '1rem',
    justifyContent: 'flex-end',
    flexWrap: 'wrap'
  },
  smallSpinner: {
    width: '16px',
    height: '16px',
    border: '2px solid rgba(255,255,255,0.3)',
    borderTopColor: '#FFFFFF',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite'
  }
};

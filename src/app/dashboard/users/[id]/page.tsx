'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft, 
  User, 
  CreditCard, 
  DollarSign, 
  Activity, 
  FileText, 
  Save, 
  ShieldAlert, 
  Calendar, 
  TrendingUp, 
  Clock, 
  Smartphone 
} from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase-browser';
import { COUNTRIES } from '@/lib/countries';

export default function UserDetailPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('profile');
  
  // Data state
  const [userData, setUserData] = useState<any>(null);
  
  // Edit Profile Form state
  const [formName, setFormName] = useState('');
  const [formHeight, setFormHeight] = useState(0);
  const [formWeight, setFormWeight] = useState(0);
  const [formTargetWeight, setFormTargetWeight] = useState(0);
  const [formGender, setFormGender] = useState('');
  const [formActivityLevel, setFormActivityLevel] = useState('');
  const [formPreferredDiet, setFormPreferredDiet] = useState('');
  const [formCountry, setFormCountry] = useState('');

  // Searchable Country Dropdown state
  const [countrySearch, setCountrySearch] = useState('');
  const [showCountryDropdown, setShowCountryDropdown] = useState(false);

  // Extract ID from pathname on mount
  useEffect(() => {
    const pathParts = window.location.pathname.split('/');
    const id = pathParts[pathParts.length - 1];
    if (id) {
      setUserId(id);
    }
  }, []);

  const fetchUserDetails = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch(`/api/users/${userId}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (res.ok) {
        const data = await res.json();
        setUserData(data);
        
        // Initialize form
        setFormName(data.user.name || '');
        setFormHeight(data.user.height || 0);
        setFormWeight(data.user.weight || 0);
        setFormTargetWeight(data.user.target_weight || 0);
        setFormGender(data.user.gender || '');
        setFormActivityLevel(data.user.activity_level || '');
        setFormPreferredDiet(data.user.preferred_diet || '');
        setFormCountry(data.user.country || '');
        setCountrySearch(data.user.country || '');
      } else {
        toast.error('Failed to load user details.');
      }
    } catch (err) {
      console.error(err);
      toast.error('Error fetching user details.');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (userId) {
      fetchUserDetails();
    }
  }, [userId, fetchUserDetails]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;

    setSaving(true);
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch(`/api/users/${userId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          name: formName,
          height: Number(formHeight),
          weight: Number(formWeight),
          target_weight: Number(formTargetWeight),
          gender: formGender,
          activity_level: formActivityLevel,
          preferred_diet: formPreferredDiet,
          country: formCountry,
        })
      });

      if (res.ok) {
        toast.success('User profile updated successfully.');
        fetchUserDetails();
      } else {
        const err = await res.json();
        toast.error(err.error || 'Failed to update profile.');
      }
    } catch (err) {
      console.error(err);
      toast.error('Error updating user.');
    } finally {
      setSaving(false);
    }
  };

  if (loading || !userData) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.spinner}></div>
        <p>Loading user profile details...</p>
      </div>
    );
  }

  const { user, subscriptionHistory, paymentHistory, plannedMeals, activity, appLogs } = userData;

  const filteredCountries = countrySearch.trim() === ''
    ? COUNTRIES
    : COUNTRIES.filter(c => c.toLowerCase().includes(countrySearch.toLowerCase()));

  return (
    <div style={styles.container}>
      {/* Back button & title */}
      <div style={styles.header}>
        <button className="btn btn-outline" style={{ padding: '0.5rem' }} onClick={() => router.push('/dashboard/users')}>
          <ArrowLeft size={16} />
        </button>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <h1 className="title-large">{user.name || 'Unnamed User'}</h1>
            <span className={`badge ${
              user.subscription_status === 'active' ? 'badge-success' : 'badge-error'
            }`}>
              {user.subscription_status || 'inactive'}
            </span>
          </div>
          <p style={styles.subtitle}>{user.email} &bull; Joined {new Date(user.created_at).toLocaleDateString()}</p>
        </div>
      </div>

      {/* Tabs list */}
      <div style={styles.tabsRow}>
        <button 
          style={{ ...styles.tab, ...(activeTab === 'profile' ? styles.tabActive : {}) }}
          onClick={() => setActiveTab('profile')}
        >
          <User size={16} />
          <span>Profile</span>
        </button>
        <button 
          style={{ ...styles.tab, ...(activeTab === 'subscription' ? styles.tabActive : {}) }}
          onClick={() => setActiveTab('subscription')}
        >
          <CreditCard size={16} />
          <span>Subscription</span>
        </button>
        <button 
          style={{ ...styles.tab, ...(activeTab === 'payments' ? styles.tabActive : {}) }}
          onClick={() => setActiveTab('payments')}
        >
          <DollarSign size={16} />
          <span>Payments</span>
        </button>
        <button 
          style={{ ...styles.tab, ...(activeTab === 'health' ? styles.tabActive : {}) }}
          onClick={() => setActiveTab('health')}
        >
          <Activity size={16} />
          <span>Health Logs</span>
        </button>
        <button 
          style={{ ...styles.tab, ...(activeTab === 'logs' ? styles.tabActive : {}) }}
          onClick={() => setActiveTab('logs')}
        >
          <FileText size={16} />
          <span>App Logs</span>
        </button>
      </div>

      {/* Tab Panels */}
      <div style={styles.tabPanel}>
        {/* Profile Panel */}
        {activeTab === 'profile' && (
          <div className="card animate-fade-in" style={styles.profileCard}>
            <h3 className="title-medium" style={{ marginBottom: '1.5rem' }}>Edit Basic Information</h3>
            <form onSubmit={handleUpdateProfile} style={styles.formGrid}>
              <div className="form-group">
                <label className="form-label" htmlFor="form-name">Name</label>
                <input
                  id="form-name"
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="input-field"
                  disabled={saving}
                />
              </div>

              <div className="form-group" style={{ position: 'relative' }}>
                <label className="form-label" htmlFor="form-country">Country</label>
                <input
                  id="form-country"
                  type="text"
                  value={countrySearch}
                  onChange={(e) => {
                    setCountrySearch(e.target.value);
                    setFormCountry(e.target.value);
                    setShowCountryDropdown(true);
                  }}
                  onFocus={() => setShowCountryDropdown(true)}
                  onBlur={() => {
                    setTimeout(() => setShowCountryDropdown(false), 200);
                  }}
                  placeholder="Type country name..."
                  className="input-field"
                  disabled={saving}
                  autoComplete="off"
                />
                {showCountryDropdown && (
                  <div className="country-dropdown-menu">
                    {filteredCountries.length === 0 ? (
                      <div className="country-dropdown-item-empty">No countries found</div>
                    ) : (
                      filteredCountries.map(country => (
                        <div
                          key={country}
                          className="country-dropdown-item"
                          onMouseDown={() => {
                            setCountrySearch(country);
                            setFormCountry(country);
                            setShowCountryDropdown(false);
                          }}
                        >
                          {country}
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="form-height">Height (cm)</label>
                <input
                  id="form-height"
                  type="number"
                  value={formHeight}
                  onChange={(e) => setFormHeight(Number(e.target.value))}
                  className="input-field"
                  disabled={saving}
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="form-weight">Current Weight (kg)</label>
                <input
                  id="form-weight"
                  type="number"
                  value={formWeight}
                  onChange={(e) => setFormWeight(Number(e.target.value))}
                  className="input-field"
                  disabled={saving}
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="form-target-weight">Target Weight (kg)</label>
                <input
                  id="form-target-weight"
                  type="number"
                  value={formTargetWeight}
                  onChange={(e) => setFormTargetWeight(Number(e.target.value))}
                  className="input-field"
                  disabled={saving}
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="form-gender">Gender</label>
                <select
                  id="form-gender"
                  value={formGender}
                  onChange={(e) => setFormGender(e.target.value)}
                  className="input-field"
                  disabled={saving}
                >
                  <option value="">Select Gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="form-activity">Activity Level</label>
                <select
                  id="form-activity"
                  value={formActivityLevel}
                  onChange={(e) => setFormActivityLevel(e.target.value)}
                  className="input-field"
                  disabled={saving}
                >
                  <option value="">Select Activity</option>
                  <option value="Sedentary (0-1 days)">Sedentary (0-1 days)</option>
                  <option value="Lightly Active (1-3 days)">Lightly Active (1-3 days)</option>
                  <option value="Moderately Active (3-5 days)">Moderately Active (3-5 days)</option>
                  <option value="Very Active (6-7 days)">Very Active (6-7 days)</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="form-diet">Diet Preference</label>
                <input
                  id="form-diet"
                  type="text"
                  value={formPreferredDiet}
                  onChange={(e) => setFormPreferredDiet(e.target.value)}
                  className="input-field"
                  disabled={saving}
                />
              </div>

              <div style={{ gridColumn: 'span 2', display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  <Save size={16} />
                  <span>{saving ? 'Saving changes...' : 'Save Changes'}</span>
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Subscription Panel */}
        {activeTab === 'subscription' && (
          <div className="animate-fade-in" style={styles.subContainer}>
            <div className="card" style={{ marginBottom: '1.5rem' }}>
              <h3 className="title-medium" style={{ marginBottom: '1rem' }}>Current Tier: {user.subscription_tier || 'Free'}</h3>
              <div style={styles.infoGrid}>
                <div style={styles.infoItem}>
                  <span style={styles.infoLabel}>Status</span>
                  <span className={`badge ${user.subscription_status === 'active' ? 'badge-success' : 'badge-error'}`}>
                    {user.subscription_status || 'inactive'}
                  </span>
                </div>
                <div style={styles.infoItem}>
                  <span style={styles.infoLabel}>Expiration Date</span>
                  <span style={styles.infoVal}>
                    {user.plan_end_date ? new Date(user.plan_end_date).toLocaleDateString() : 'None'}
                  </span>
                </div>
                <div style={styles.infoItem}>
                  <span style={styles.infoLabel}>Device Platform</span>
                  <span style={{ ...styles.infoVal, textTransform: 'capitalize' }}>
                    {user.device_platform || 'web'}
                  </span>
                </div>
                <div style={styles.infoItem}>
                  <span style={styles.infoLabel}>Billing Cycle</span>
                  <span style={{ ...styles.infoVal, textTransform: 'capitalize' }}>
                    {user.billing_cycle || 'N/A'}
                  </span>
                </div>
              </div>
            </div>

            <div className="card">
              <h3 className="title-medium" style={{ marginBottom: '1.5rem' }}>Subscription History</h3>
              {subscriptions.length === 0 ? (
                <p style={styles.emptyText}>No subscription records found.</p>
              ) : (
                <div className="table-container">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Start Date</th>
                        <th>End Date</th>
                        <th>Status</th>
                        <th>Cycle</th>
                        <th>Platform</th>
                      </tr>
                    </thead>
                    <tbody>
                      {subscriptions.map((sub: any) => (
                        <tr key={sub.id}>
                          <td>{new Date(sub.current_period_start || sub.created_at).toLocaleDateString()}</td>
                          <td>{sub.current_period_end ? new Date(sub.current_period_end).toLocaleDateString() : 'N/A'}</td>
                          <td>
                            <span className={`badge ${sub.status === 'active' ? 'badge-success' : 'badge-error'}`}>
                              {sub.status}
                            </span>
                          </td>
                          <td style={{ textTransform: 'capitalize' }}>{sub.billing_cycle || 'monthly'}</td>
                          <td style={{ textTransform: 'capitalize' }}>{sub.platform || 'manual'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Payments Panel */}
        {activeTab === 'payments' && (
          <div className="card animate-fade-in">
            <h3 className="title-medium" style={{ marginBottom: '1.5rem' }}>Payment Transactions</h3>
            {payments.length === 0 ? (
              <p style={styles.emptyText}>No transaction records found.</p>
            ) : (
              <div className="table-container">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Transaction ID</th>
                      <th>Amount</th>
                      <th>Status</th>
                      <th>Platform</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map((p: any) => (
                      <tr key={p.id}>
                        <td>{new Date(p.created_at).toLocaleString()}</td>
                        <td style={{ fontSize: '0.8rem', fontFamily: 'monospace' }}>
                          {p.areeba_transaction_id || p.apple_transaction_id || p.id}
                        </td>
                        <td><strong>${Number(p.amount).toFixed(2)}</strong> {p.currency}</td>
                        <td>
                          <span className={`badge ${
                            p.status === 'success' ? 'badge-success' : 
                            p.status === 'refunded' ? 'badge-warning' : 'badge-error'
                          }`}>
                            {p.status}
                          </span>
                        </td>
                        <td style={{ textTransform: 'capitalize' }}>{p.platform || 'areeba'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Health Logs Panel */}
        {activeTab === 'health' && (
          <div style={styles.healthLogsRow} className="animate-fade-in">
            {/* Water Logs */}
            <div className="card" style={{ flexGrow: 1 }}>
              <h3 className="title-medium" style={{ marginBottom: '1.25rem' }}>Recent Water Intake</h3>
              {healthLogs.waterLogs.length === 0 ? (
                <p style={styles.emptyText}>No water logs found.</p>
              ) : (
                <div style={styles.logList}>
                  {healthLogs.waterLogs.map((log: any) => (
                    <div key={log.id} style={styles.logItem}>
                      <div style={styles.logMeta}>
                        <span style={styles.logTime}>{new Date(log.created_at).toLocaleString()}</span>
                      </div>
                      <strong style={{ color: 'var(--accent)' }}>{log.amount_ml || log.amount || 0} ml</strong>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Weight Logs */}
            <div className="card" style={{ flexGrow: 1 }}>
              <h3 className="title-medium" style={{ marginBottom: '1.25rem' }}>Weight Logs</h3>
              {healthLogs.weightLogs.length === 0 ? (
                <p style={styles.emptyText}>No weight logs found.</p>
              ) : (
                <div style={styles.logList}>
                  {healthLogs.weightLogs.map((log: any) => (
                    <div key={log.id} style={styles.logItem}>
                      <div style={styles.logMeta}>
                        <span style={styles.logTime}>{new Date(log.created_at).toLocaleString()}</span>
                      </div>
                      <strong>{log.weight_kg || log.weight || 0} kg</strong>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* App Logs Panel */}
        {activeTab === 'logs' && (
          <div className="card animate-fade-in">
            <h3 className="title-medium" style={{ marginBottom: '1.5rem' }}>App Errors & Events</h3>
            {appLogs.length === 0 ? (
              <p style={styles.emptyText}>No error logs reported for this user.</p>
            ) : (
              <div style={styles.appLogList}>
                {appLogs.map((log: any) => (
                  <div key={log.id} style={styles.appLogItem}>
                    <div style={styles.appLogHeader}>
                      <span className={`badge ${
                        log.severity === 'error' ? 'badge-error' : 
                        log.severity === 'warning' ? 'badge-warning' : 'badge-info'
                      }`}>
                        {log.severity}
                      </span>
                      <span style={styles.logTime}>{new Date(log.created_at).toLocaleString()}</span>
                      {log.screen_name && (
                        <span style={styles.logScreen}>Screen: <strong>{log.screen_name}</strong></span>
                      )}
                    </div>
                    <p style={styles.logMsg}>{log.error_message}</p>
                    {log.error_details && (
                      <pre style={styles.logPre}>{log.error_details}</pre>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
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
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '1.25rem',
  },
  subtitle: {
    fontSize: '0.85rem',
    color: 'var(--text-secondary)',
    marginTop: '0.25rem',
  },
  tabsRow: {
    display: 'flex',
    gap: '0.5rem',
    borderBottom: '1px solid #E2E8F0',
    paddingBottom: '0.5rem',
    overflowX: 'auto',
  },
  tab: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.75rem 1.25rem',
    borderRadius: 'var(--radius-sm)',
    fontSize: '0.875rem',
    fontWeight: 600,
    color: 'var(--text-secondary)',
    backgroundColor: 'transparent',
    cursor: 'pointer',
    transition: 'all var(--transition-fast)',
  },
  tabActive: {
    backgroundColor: '#FFFFFF',
    color: 'var(--primary-dark)',
    boxShadow: 'var(--shadow-sm)',
    border: '1px solid rgba(226, 232, 240, 0.8)',
  },
  tabPanel: {
    marginTop: '0.5rem',
  },
  profileCard: {
    maxWidth: '800px',
  },
  formGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '1.25rem',
  },
  infoGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '1.25rem',
  },
  infoItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.25rem',
  },
  infoLabel: {
    fontSize: '0.75rem',
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    fontWeight: 600,
    letterSpacing: '0.05em',
  },
  infoVal: {
    fontSize: '0.95rem',
    fontWeight: 600,
    color: 'var(--text-dark)',
  },
  subContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem',
  },
  emptyText: {
    fontSize: '0.875rem',
    color: 'var(--text-secondary)',
    textAlign: 'center',
    padding: '2rem 0',
  },
  healthLogsRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '1.5rem',
  },
  logList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
    maxHeight: '400px',
    overflowY: 'auto',
    paddingRight: '0.5rem',
  },
  logItem: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0.75rem',
    borderBottom: '1px solid #F1F5F9',
  },
  logMeta: {
    display: 'flex',
    flexDirection: 'column',
  },
  logTime: {
    fontSize: '0.75rem',
    color: 'var(--text-secondary)',
  },
  appLogList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.25rem',
    maxHeight: '600px',
    overflowY: 'auto',
  },
  appLogItem: {
    padding: '1.25rem',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid #E2E8F0',
    backgroundColor: '#F8F9FA',
  },
  appLogHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    flexWrap: 'wrap',
    marginBottom: '0.5rem',
  },
  logScreen: {
    fontSize: '0.8rem',
    color: 'var(--text-secondary)',
  },
  logMsg: {
    fontSize: '0.9rem',
    fontWeight: 600,
    color: 'var(--text-dark)',
    wordBreak: 'break-all',
  },
  logPre: {
    marginTop: '0.75rem',
    padding: '0.75rem',
    backgroundColor: '#1E293B',
    color: '#E2E8F0',
    borderRadius: '4px',
    fontFamily: 'monospace',
    fontSize: '0.8rem',
    overflowX: 'auto',
    whiteSpace: 'pre-wrap',
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

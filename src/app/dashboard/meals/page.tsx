'use client';

import React, { useEffect, useState } from 'react';
import { Utensils, Play, RefreshCw, CheckCircle2, XCircle, AlertCircle, Search } from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase-browser';

export default function MealsPage() {
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [triggering, setTriggering] = useState(false);

  // Selector form state
  const [searchEmail, setSearchEmail] = useState('');
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [searching, setSearching] = useState(false);

  const fetchJobs = async () => {
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch('/api/meals/jobs', {
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setJobs(data.jobs || []);
      }
    } catch (err) {
      console.error('Error fetching jobs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
    
    // Poll jobs status every 10 seconds
    const interval = setInterval(fetchJobs, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleSearchUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchEmail) return;

    setSearching(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('users')
        .select('id, email, name, height, weight, target_weight, preferred_diet, country')
        .eq('email', searchEmail.trim())
        .maybeSingle();

      if (error || !data) {
        toast.error('User not found in database.');
        setSelectedUser(null);
      } else {
        setSelectedUser(data);
        toast.success(`User found: ${data.name || data.email}`);
      }
    } catch (err) {
      console.error(err);
      toast.error('Error lookup.');
    } finally {
      setSearching(false);
    }
  };

  const handleTriggerMealPlan = async () => {
    if (!selectedUser) return;
    setTriggering(true);

    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch('/api/meals/trigger', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          userId: selectedUser.id,
          height: selectedUser.height || 175,
          weight: selectedUser.weight || 70,
          targetWeight: selectedUser.target_weight || 70,
          preferredDiet: selectedUser.preferred_diet || 'balanced',
          country: selectedUser.country || 'US'
        })
      });

      const result = await res.json();
      if (res.ok) {
        if (result.already_exists) {
          toast.info('Active weekly meal plan already exists for this user.');
        } else {
          toast.success('Meal plan generation job triggered successfully!');
          fetchJobs();
        }
      } else {
        toast.error(result.error || 'Failed to trigger meal plan generation.');
      }
    } catch (err) {
      console.error(err);
      toast.error('Error triggering meal plan.');
    } finally {
      setTriggering(false);
    }
  };

  return (
    <div style={styles.container}>
      <div className="flex-between">
        <div>
          <h1 className="title-large">Meal Plan Generator</h1>
          <p style={styles.subtitle}>Trigger AI meal plan compilation and track background generation job logs</p>
        </div>
        <button className="btn btn-outline" onClick={fetchJobs} style={{ padding: '0.5rem 0.75rem' }}>
          <RefreshCw size={16} />
        </button>
      </div>

      <div style={styles.grid}>
        {/* Trigger Generator Card */}
        <div className="card" style={{ flexGrow: 1, alignSelf: 'flex-start' }}>
          <h3 className="title-medium" style={{ marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Utensils size={20} style={{ color: 'var(--primary)' }} />
            <span>Generate Meal Plan</span>
          </h3>

          <form onSubmit={handleSearchUser} style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
            <div style={{ position: 'relative', flexGrow: 1 }}>
              <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="email"
                placeholder="Search user by email..."
                value={searchEmail}
                onChange={(e) => setSearchEmail(e.target.value)}
                className="input-field"
                style={{ paddingLeft: '2.25rem' }}
                required
              />
            </div>
            <button type="submit" className="btn btn-secondary" disabled={searching}>
              {searching ? 'Looking...' : 'Find'}
            </button>
          </form>

          {selectedUser && (
            <div style={styles.userSummaryCard}>
              <h4 style={{ fontWeight: 700, marginBottom: '0.75rem', fontSize: '0.9rem' }}>User Context Details</h4>
              <div style={styles.contextGrid}>
                <div><span style={styles.clabel}>Name:</span> <span style={styles.cval}>{selectedUser.name || 'Unnamed'}</span></div>
                <div><span style={styles.clabel}>Email:</span> <span style={styles.cval}>{selectedUser.email}</span></div>
                <div><span style={styles.clabel}>Diet:</span> <span style={{ ...styles.cval, textTransform: 'capitalize' }}>{selectedUser.preferred_diet || 'Balanced'}</span></div>
                <div><span style={styles.clabel}>Country:</span> <span style={styles.cval}>{selectedUser.country || 'N/A'}</span></div>
                <div><span style={styles.clabel}>Weight:</span> <span style={styles.cval}>{selectedUser.weight || 'N/A'} kg</span></div>
                <div><span style={styles.clabel}>Height:</span> <span style={styles.cval}>{selectedUser.height || 'N/A'} cm</span></div>
              </div>

              <button 
                className="btn btn-primary" 
                style={{ marginTop: '1.5rem', width: '100%', gap: '8px' }}
                onClick={handleTriggerMealPlan}
                disabled={triggering}
              >
                <Play size={16} />
                <span>{triggering ? 'Triggering...' : 'Trigger AI Meal Plan (OpenAI GPT)'}</span>
              </button>
            </div>
          )}
        </div>

        {/* Job Monitor Card */}
        <div className="card" style={{ flexGrow: 2 }}>
          <h3 className="title-medium" style={{ marginBottom: '1.25rem' }}>Active & Past Jobs</h3>
          {loading ? (
            <div style={styles.loadingContainer}>
              <div style={styles.spinner}></div>
              <p>Loading jobs logs...</p>
            </div>
          ) : jobs.length === 0 ? (
            <p style={styles.emptyText}>No background jobs generated recently.</p>
          ) : (
            <div style={styles.jobList}>
              {jobs.map((job) => (
                <div key={job.id} style={styles.jobItem}>
                  <div style={styles.jobHeader}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {job.status === 'done' ? (
                        <CheckCircle2 size={16} style={{ color: 'var(--success)' }} />
                      ) : job.status === 'failed' ? (
                        <XCircle size={16} style={{ color: 'var(--error)' }} />
                      ) : (
                        <div style={styles.miniSpinner}></div>
                      )}
                      <strong style={{ fontSize: '0.85rem' }}>{job.users?.email || 'N/A'}</strong>
                    </div>
                    <span style={styles.jobTime}>{new Date(job.created_at).toLocaleTimeString()}</span>
                  </div>

                  <div style={styles.jobBody}>
                    <div style={styles.progressRow}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>Progress:</span>
                      <span style={{ fontSize: '0.75rem', fontWeight: 700 }}>{job.progress}%</span>
                    </div>
                    <div style={styles.progressBarBg}>
                      <div style={{ ...styles.progressBarFill, width: `${job.progress}%`, backgroundColor: job.status === 'failed' ? 'var(--error)' : 'var(--primary)' }}></div>
                    </div>

                    {job.error_message && (
                      <div style={styles.errorAlert}>
                        <AlertCircle size={14} />
                        <span>{job.error_message}</span>
                      </div>
                    )}

                    {job.result && job.status === 'done' && (
                      <div style={styles.resultDetails}>
                        <span>Meals Generated: <strong>{job.result.meals_generated || 0}</strong></span>
                        <span>Water Target: <strong>{job.result.target_water_ml || 0} ml</strong></span>
                        <span>Calorie Target: <strong>{job.result.target_calories || 0} kcal</strong></span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
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
  subtitle: {
    fontSize: '0.9rem',
    color: 'var(--text-secondary)',
    marginTop: '0.25rem',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1.5fr',
    gap: '1.5rem',
  },
  userSummaryCard: {
    padding: '1.25rem',
    borderRadius: 'var(--radius-sm)',
    border: '1px dashed #CBD5E1',
    backgroundColor: '#F8F9FA',
  },
  contextGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '0.75rem',
  },
  clabel: {
    fontSize: '0.75rem',
    color: 'var(--text-muted)',
    fontWeight: 600,
    textTransform: 'uppercase',
  },
  cval: {
    fontSize: '0.85rem',
    fontWeight: 600,
    color: 'var(--text-dark)',
  },
  jobList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
    maxHeight: '600px',
    overflowY: 'auto',
  },
  jobItem: {
    padding: '1rem',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid #E2E8F0',
    backgroundColor: '#FFFFFF',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
  },
  jobHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottom: '1px solid #F1F5F9',
    paddingBottom: '0.5rem',
  },
  jobTime: {
    fontSize: '0.7rem',
    color: 'var(--text-muted)',
  },
  jobBody: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
  },
  progressRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressBarBg: {
    height: '6px',
    backgroundColor: '#E2E8F0',
    borderRadius: '3px',
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: '3px',
    transition: 'width var(--transition-normal)',
  },
  errorAlert: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '0.5rem 0.75rem',
    borderRadius: '4px',
    backgroundColor: 'rgba(244, 67, 54, 0.1)',
    color: 'var(--error)',
    fontSize: '0.75rem',
    fontWeight: 600,
    marginTop: '0.25rem',
  },
  resultDetails: {
    display: 'flex',
    gap: '1rem',
    fontSize: '0.75rem',
    color: 'var(--text-secondary)',
    marginTop: '0.25rem',
  },
  emptyText: {
    fontSize: '0.875rem',
    color: 'var(--text-secondary)',
    textAlign: 'center',
    padding: '3rem 0',
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
    width: '30px',
    height: '30px',
    borderRadius: '50%',
    border: '3px solid #CBD5E1',
    borderTopColor: 'var(--primary)',
    animation: 'spin 1s linear infinite',
  },
  miniSpinner: {
    width: '14px',
    height: '14px',
    borderRadius: '50%',
    border: '2px solid #CBD5E1',
    borderTopColor: 'var(--primary)',
    animation: 'spin 1s linear infinite',
  },
};

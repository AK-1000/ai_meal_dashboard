'use client';

import React, { useEffect, useState } from 'react';
import { Bell, Send, Users, ShieldAlert, CheckCircle, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase-browser';

export default function NotificationsPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  // Form state
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [targetType, setTargetType] = useState<'broadcast' | 'single'>('broadcast');
  const [userEmail, setUserEmail] = useState('');
  const [tierFilter, setTierFilter] = useState('');
  const [platformFilter, setPlatformFilter] = useState('');

  const fetchLogs = async () => {
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch('/api/notifications/logs', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const handleSendNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !body) {
      toast.error('Please enter a title and message.');
      return;
    }

    setSending(true);
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      if (targetType === 'single') {
        // Resolve email to user_id
        if (!userEmail) {
          toast.error('Please enter a target user email.');
          setSending(false);
          return;
        }

        // BUG FIX: Resolve email to user_id via server-side API (bypasses RLS)
        // Previously used browser Supabase client which failed due to RLS policies
        const resolveRes = await fetch('/api/users/resolve', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`
          },
          body: JSON.stringify({ email: userEmail.trim() })
        });

        const resolveData = await resolveRes.json();

        if (!resolveRes.ok || !resolveData.user) {
          toast.error(resolveData.error || 'User not found in database.');
          setSending(false);
          return;
        }

        const userId = resolveData.user.id;

        const res = await fetch('/api/notifications/send', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`
          },
          body: JSON.stringify({ userId, title, body })
        });

        if (res.ok) {
          toast.success('FCM Notification sent successfully!');
          setTitle('');
          setBody('');
          setUserEmail('');
          fetchLogs();
        } else {
          const err = await res.json();
          toast.error(err.error || 'Failed to send notification.');
        }
      } else {
        // Broadcast
        const res = await fetch('/api/notifications/broadcast', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`
          },
          body: JSON.stringify({
            title,
            body,
            tier: tierFilter || null,
            platform: platformFilter || null
          })
        });

        if (res.ok) {
          const result = await res.json();
          toast.success(`Broadcast finished! Sent to ${result.successCount} users.`);
          setTitle('');
          setBody('');
          fetchLogs();
        } else {
          const err = await res.json();
          toast.error(err.error || 'Failed to trigger broadcast.');
        }
      }
    } catch (err: any) {
      console.error(err);
      toast.error('An error occurred while sending.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div style={styles.container}>
      <div className="flex-between">
        <div>
          <h1 className="title-large">Notification Center</h1>
          <p style={styles.subtitle}>Compose push notifications and track real-time delivery logs</p>
        </div>
      </div>

      <div style={styles.grid}>
        {/* Composer Form */}
        <div className="card" style={{ flexGrow: 2 }}>
          <h3 className="title-medium" style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Bell size={20} style={{ color: 'var(--primary)' }} />
            <span>Compose Push Notification</span>
          </h3>

          <form onSubmit={handleSendNotification} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={styles.toggleRow}>
              <button
                type="button"
                style={{ ...styles.toggleBtn, ...(targetType === 'broadcast' ? styles.toggleBtnActive : {}) }}
                onClick={() => setTargetType('broadcast')}
              >
                <Users size={16} />
                <span>Broadcast to Segment</span>
              </button>
              <button
                type="button"
                style={{ ...styles.toggleBtn, ...(targetType === 'single' ? styles.toggleBtnActive : {}) }}
                onClick={() => setTargetType('single')}
              >
                <Bell size={16} />
                <span>Single User</span>
              </button>
            </div>

            {targetType === 'single' ? (
              <div className="form-group">
                <label className="form-label" htmlFor="target-email">Recipient Email Address</label>
                <input
                  id="target-email"
                  type="email"
                  placeholder="user@example.com"
                  value={userEmail}
                  onChange={(e) => setUserEmail(e.target.value)}
                  className="input-field"
                  required
                />
              </div>
            ) : (
              <div style={styles.formFiltersGrid}>
                <div className="form-group">
                  <label className="form-label" htmlFor="filter-tier">Target Subscription Tier</label>
                  <select
                    id="filter-tier"
                    value={tierFilter}
                    onChange={(e) => setTierFilter(e.target.value)}
                    className="input-field"
                  >
                    <option value="">All Tiers (Free, Pro, VIP)</option>
                    <option value="free">Free Users</option>
                    <option value="pro">Pro Subscribers</option>
                    <option value="vip">VIP Subscribers</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="filter-platform">Target Device Platform</label>
                  <select
                    id="filter-platform"
                    value={platformFilter}
                    onChange={(e) => setPlatformFilter(e.target.value)}
                    className="input-field"
                  >
                    <option value="">All Platforms</option>
                    <option value="ios">iOS Users</option>
                    <option value="android">Android Users</option>
                  </select>
                </div>
              </div>
            )}

            <div className="form-group">
              <label className="form-label" htmlFor="notif-title">Notification Title</label>
              <input
                id="notif-title"
                type="text"
                placeholder="E.g. Your daily meal plan is ready! 🥗"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="input-field"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="notif-body">Notification Message</label>
              <textarea
                id="notif-body"
                rows={4}
                placeholder="Enter the main body of the push notification..."
                value={body}
                onChange={(e) => setBody(e.target.value)}
                className="input-field"
                style={{ resize: 'vertical' }}
                required
              />
            </div>

            <button type="submit" className="btn btn-primary" style={{ alignSelf: 'flex-end', gap: '8px' }} disabled={sending}>
              <Send size={16} />
              <span>{sending ? 'Sending Notification...' : 'Send Push Message'}</span>
            </button>
          </form>
        </div>

        {/* Delivery Logs */}
        <div className="card" style={{ flexGrow: 1, maxHeight: '600px', overflowY: 'auto' }}>
          <h3 className="title-medium" style={{ marginBottom: '1.25rem' }}>Recent Deliveries</h3>
          {loading ? (
            <div style={styles.loadingContainer}>
              <div style={styles.spinner}></div>
              <p>Loading notification logs...</p>
            </div>
          ) : logs.length === 0 ? (
            <p style={styles.emptyText}>No recent notification logs found.</p>
          ) : (
            <div style={styles.historyList}>
              {logs.map((log) => (
                <div key={log.id} style={styles.historyItem}>
                  <div style={styles.historyHeader}>
                    <span style={styles.historyUser}>{log.users?.email || 'System / Broadcast'}</span>
                    <span style={styles.historyTime}>{new Date(log.sent_at).toLocaleTimeString()}</span>
                  </div>
                  <h4 style={styles.historyTitle}>{log.title}</h4>
                  <p style={styles.historyBody}>{log.body}</p>
                  <div style={styles.statusFooter}>
                    {log.delivered ? (
                      <span style={{ color: 'var(--success)', display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', fontWeight: 600 }}>
                        <CheckCircle size={12} />
                        <span>Delivered</span>
                      </span>
                    ) : (
                      <span style={{ color: 'var(--error)', display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', fontWeight: 600 }}>
                        <XCircle size={12} />
                        <span>Failed</span>
                      </span>
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
    gridTemplateColumns: '1.5fr 1fr',
    gap: '1.5rem',
  },
  toggleRow: {
    display: 'flex',
    gap: '0.5rem',
    borderBottom: '1px solid #E2E8F0',
    paddingBottom: '0.5rem',
  },
  toggleBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.5rem 1rem',
    borderRadius: 'var(--radius-sm)',
    fontSize: '0.85rem',
    fontWeight: 600,
    backgroundColor: 'transparent',
    color: 'var(--text-secondary)',
    cursor: 'pointer',
    transition: 'all var(--transition-fast)',
  },
  toggleBtnActive: {
    backgroundColor: 'var(--bg-surface-variant)',
    color: 'var(--primary-dark)',
  },
  formFiltersGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '1rem',
  },
  historyList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },
  historyItem: {
    padding: '0.85rem',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid #E2E8F0',
    backgroundColor: '#F8F9FA',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.25rem',
  },
  historyHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  historyUser: {
    fontSize: '0.75rem',
    fontWeight: 700,
    color: 'var(--text-dark)',
  },
  historyTime: {
    fontSize: '0.7rem',
    color: 'var(--text-muted)',
  },
  historyTitle: {
    fontSize: '0.85rem',
    fontWeight: 700,
    color: 'var(--text-dark)',
  },
  historyBody: {
    fontSize: '0.8rem',
    color: 'var(--text-secondary)',
    lineHeight: '1.4',
  },
  statusFooter: {
    marginTop: '0.25rem',
    display: 'flex',
    justifyContent: 'flex-end',
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
};

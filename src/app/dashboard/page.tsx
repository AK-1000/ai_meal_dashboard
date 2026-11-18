'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { createClient } from '@/lib/supabase-browser';
import { 
  Users, 
  CreditCard, 
  DollarSign, 
  ArrowUpRight, 
  Smartphone, 
  Sparkles, 
  Activity, 
  ArrowRight 
} from 'lucide-react';
import Link from 'next/link';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import { toast } from 'sonner';

const COLORS = ['#4CAF50', '#26A69A', '#FF9800', '#2196F3', '#F44336'];
const TIER_COLORS: Record<string, string> = {
  'Pro Trial': '#F59E0B',
  'Pro (Paid)': '#3B82F6',
  'Pro': '#3B82F6',
  'VIP': '#8B5CF6',
};

export default function OverviewPage() {
  const { admin } = useAuth();
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    setMounted(true);
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const supabase = await import('@/lib/supabase-browser').then(m => m.createClient());
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      
      const res = await fetch('/api/dashboard/stats', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });
      if (res.ok) {
        const result = await res.json();
        setData(result);
      } else {
        toast.error('Failed to load dashboard statistics.');
      }
    } catch (err) {
      console.error(err);
      toast.error('An error occurred while loading dashboard statistics.');
    } finally {
      setLoading(false);
    }
  };

  if (loading || !mounted) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.spinner}></div>
        <p style={styles.loadingText}>Fetching overview analytics...</p>
      </div>
    );
  }

  const { stats, charts, recentActivity } = data || {
    stats: { totalUsers: 0, activeSubs: 0, currentMonthRevenue: 0 },
    charts: { platformSplit: [], tierSplit: [], signupTrend: [] },
    recentActivity: { users: [], payments: [] }
  };

  return (
    <div style={styles.container}>
      <div style={styles.welcomeSection}>
        <h1 style={styles.welcomeTitle}>Welcome Back</h1>
        <p style={styles.welcomeSubtitle}>Here is what's happening with AI Meal today.</p>
      </div>

      {/* KPI Cards Grid */}
      <div className="stats-grid">
        <div className="card" style={styles.kpiCard}>
          <div style={styles.kpiHeader}>
            <span style={styles.kpiTitle}>Total Users</span>
            <div style={{ ...styles.kpiIconContainer, backgroundColor: 'rgba(33, 150, 243, 0.1)', color: '#2196F3' }}>
              <Users size={20} />
            </div>
          </div>
          <div style={styles.kpiBody}>
            <span style={styles.kpiValue}>{stats.totalUsers}</span>
            <span style={styles.kpiSubtext}>Registered profiles</span>
          </div>
        </div>

        <div className="card" style={styles.kpiCard}>
          <div style={styles.kpiHeader}>
            <span style={styles.kpiTitle}>Active Subscriptions</span>
            <div style={{ ...styles.kpiIconContainer, backgroundColor: 'rgba(76, 175, 80, 0.1)', color: '#4CAF50' }}>
              <CreditCard size={20} />
            </div>
          </div>
          <div style={styles.kpiBody}>
            <span style={styles.kpiValue}>{stats.activeSubs}</span>
            <span style={styles.kpiSubtext}>Pro / VIP Active users</span>
          </div>
        </div>

        <div className="card" style={styles.kpiCard}>
          <div style={styles.kpiHeader}>
            <span style={styles.kpiTitle}>Revenue (M-T-D)</span>
            <div style={{ ...styles.kpiIconContainer, backgroundColor: 'rgba(255, 152, 0, 0.1)', color: '#FF9800' }}>
              <DollarSign size={20} />
            </div>
          </div>
          <div style={styles.kpiBody}>
            <span style={styles.kpiValue}>${Number(stats.currentMonthRevenue).toLocaleString()}</span>
            <span style={styles.kpiSubtext}>Collected this month</span>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div style={styles.chartsRow}>
        {/* Main Growth Chart */}
        <div className="card" style={styles.mainChartCard}>
          <div style={styles.chartCardHeader}>
            <h3 className="title-medium">User Signups (Last 30 Days)</h3>
          </div>
          <div style={styles.chartContainer}>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={charts.signupTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px' }}
                  labelStyle={{ fontWeight: 600 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="Signups" 
                  stroke="url(#colorPrimary)" 
                  strokeWidth={3} 
                  dot={{ r: 4, strokeWidth: 2 }}
                  activeDot={{ r: 6 }}
                />
                <defs>
                  <linearGradient id="colorPrimary" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#4CAF50" />
                    <stop offset="100%" stopColor="#26A69A" />
                  </linearGradient>
                </defs>
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Splits Pie Charts */}
        <div style={styles.sideChartsColumn}>
          <div className="card" style={styles.pieChartCard}>
            <h3 className="title-medium" style={{ marginBottom: '1rem' }}>Device Split</h3>
            <div style={styles.pieContainer}>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie
                    data={charts.platformSplit}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={70}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {charts.platformSplit.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend verticalAlign="middle" align="right" layout="vertical" iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="card" style={styles.pieChartCard}>
            <h3 className="title-medium" style={{ marginBottom: '1rem' }}>Tier Split</h3>
            <div style={styles.pieContainer}>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie
                    data={charts.tierSplit}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={70}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {charts.tierSplit.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={TIER_COLORS[entry.name] || COLORS[(index + 2) % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend verticalAlign="middle" align="right" layout="vertical" iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity Grid */}
      <div style={styles.activityGrid}>
        {/* Recent Registrations */}
        <div className="card" style={{ flexGrow: 1 }}>
          <div style={styles.activityHeader}>
            <h3 className="title-medium">Recent Users</h3>
            <Link href="/dashboard/users" style={styles.viewAllLink}>
              <span>View All</span>
              <ArrowRight size={14} />
            </Link>
          </div>
          <div style={styles.activityList}>
            {recentActivity.users.length === 0 ? (
              <p style={styles.emptyText}>No users registered recently.</p>
            ) : (
              recentActivity.users.map((u: any) => {
                const isVip = u.subscription_tier?.toLowerCase() === 'vip';
                const isTrialActive = !isVip && (u.trial_status === 'active' || u.subscription_status === 'trialing') 
                  && (!u.trial_ends_at || new Date(u.trial_ends_at).getTime() > Date.now());
                const isTrialExpired = !isVip && u.subscription_status !== 'active';
                const isTrial = isTrialActive || isTrialExpired;

                return (
                  <div key={u.id} style={styles.activityItem}>
                    <div style={styles.avatarPlaceholder}>
                      {u.name ? u.name[0].toUpperCase() : u.email[0].toUpperCase()}
                    </div>
                    <div style={styles.itemInfo}>
                      <span style={styles.itemName}>{u.name || 'Unnamed User'}</span>
                      <span style={styles.itemMeta}>{u.email}</span>
                    </div>
                    <div style={styles.itemAction}>
                      {isVip ? (
                        <span className="badge badge-primary">VIP</span>
                      ) : isTrial ? (
                        <span className="badge" style={{ backgroundColor: '#FEF3C7', color: '#B45309', border: '1px solid #FDE68A', fontWeight: 600 }}>
                          PRO TRIAL
                        </span>
                      ) : (
                        <span className="badge badge-info">PRO</span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Recent Transactions */}
        <div className="card" style={{ flexGrow: 1 }}>
          <div style={styles.activityHeader}>
            <h3 className="title-medium">Recent Payments</h3>
            <Link href="/dashboard/payments" style={styles.viewAllLink}>
              <span>View All</span>
              <ArrowRight size={14} />
            </Link>
          </div>
          <div style={styles.activityList}>
            {recentActivity.payments.length === 0 ? (
              <p style={styles.emptyText}>No recent payments found.</p>
            ) : (
              recentActivity.payments.map((p: any) => (
                <div key={p.id} style={styles.activityItem}>
                  <div style={{ ...styles.avatarPlaceholder, backgroundColor: '#E2E8F0', color: 'var(--text-dark)' }}>
                    $
                  </div>
                  <div style={styles.itemInfo}>
                    <span style={styles.itemName}>${Number(p.amount).toFixed(2)} {p.currency}</span>
                    <span style={styles.itemMeta}>{p.users?.email || 'unknown@user.com'}</span>
                  </div>
                  <div className="flex-center" style={{ ...styles.itemAction, flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                    <span className={`badge ${
                      p.status === 'success' ? 'badge-success' : 
                      p.status === 'refunded' ? 'badge-warning' : 'badge-error'
                    }`}>
                      {p.status}
                    </span>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                      {p.platform?.toUpperCase()}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2rem',
  },
  loadingContainer: {
    height: '60vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '1rem',
  },
  spinner: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    border: '3px solid #CBD5E1',
    borderTopColor: 'var(--primary)',
    animation: 'spin 1s linear infinite',
  },
  loadingText: {
    fontSize: '0.875rem',
    color: 'var(--text-secondary)',
    fontWeight: 500,
  },
  welcomeSection: {
    marginBottom: '0.5rem',
  },
  welcomeTitle: {
    fontSize: '1.75rem',
    fontWeight: 800,
    color: 'var(--text-dark)',
    letterSpacing: '-0.025em',
  },
  welcomeSubtitle: {
    fontSize: '0.95rem',
    color: 'var(--text-secondary)',
    marginTop: '0.25rem',
  },
  kpiCard: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    minHeight: '120px',
  },
  kpiHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  kpiTitle: {
    fontSize: '0.875rem',
    fontWeight: 600,
    color: 'var(--text-secondary)',
  },
  kpiIconContainer: {
    display: 'flex',
    padding: '0.5rem',
    borderRadius: '8px',
  },
  kpiBody: {
    marginTop: '1rem',
    display: 'flex',
    flexDirection: 'column',
  },
  kpiValue: {
    fontSize: '2rem',
    fontWeight: 800,
    color: 'var(--text-dark)',
    lineHeight: '1.2',
  },
  kpiSubtext: {
    fontSize: '0.75rem',
    color: 'var(--text-muted)',
    marginTop: '0.25rem',
  },
  chartsRow: {
    display: 'grid',
    gridTemplateColumns: '2fr 1fr',
    gap: '1.5rem',
  },
  mainChartCard: {
    display: 'flex',
    flexDirection: 'column',
  },
  chartCardHeader: {
    marginBottom: '1.5rem',
  },
  chartContainer: {
    marginTop: 'auto',
    width: '100%',
  },
  sideChartsColumn: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem',
  },
  pieChartCard: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
  },
  pieContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
    gap: '1.5rem',
  },
  activityHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '1.5rem',
    borderBottom: '1px solid #F1F5F9',
    paddingBottom: '0.75rem',
  },
  viewAllLink: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.375rem',
    fontSize: '0.85rem',
    color: 'var(--primary-dark)',
    fontWeight: 600,
  },
  activityList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },
  activityItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    padding: '0.5rem 0',
  },
  avatarPlaceholder: {
    width: '38px',
    height: '38px',
    borderRadius: '50%',
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    color: 'var(--primary-dark)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 700,
    fontSize: '0.9rem',
    flexShrink: 0,
  },
  itemInfo: {
    display: 'flex',
    flexDirection: 'column',
    flexGrow: 1,
    overflow: 'hidden',
  },
  itemName: {
    fontSize: '0.9rem',
    fontWeight: 600,
    color: 'var(--text-dark)',
  },
  itemMeta: {
    fontSize: '0.75rem',
    color: 'var(--text-secondary)',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  itemAction: {
    flexShrink: 0,
  },
  emptyText: {
    fontSize: '0.875rem',
    color: 'var(--text-secondary)',
    textAlign: 'center',
    padding: '2rem 0',
  },
};

'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Search, FileText, ShieldAlert, ChevronLeft, ChevronRight, Eye, ShieldCheck, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase-browser';

export default function LogsPage() {
  const [logType, setLogType] = useState<'app' | 'audit'>('app');
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<any[]>([]);
  
  // App log filters
  const [search, setSearch] = useState('');
  const [severity, setSeverity] = useState('');
  
  // Pagination
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, pages: 1, limit: 15 });

  // Expanded row state (for app logs details)
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      let url = '';
      if (logType === 'app') {
        const query = new URLSearchParams({
          page: page.toString(),
          limit: '15',
          search,
          severity
        });
        url = `/api/logs/app?${query.toString()}`;
      } else {
        const query = new URLSearchParams({
          page: page.toString(),
          limit: '15'
        });
        url = `/api/logs/audit?${query.toString()}`;
      }

      const res = await fetch(url, {
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      });

      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
        setPagination(data.pagination);
      } else {
        toast.error('Failed to load logs.');
      }
    } catch (err) {
      console.error(err);
      toast.error('Error fetching logs.');
    } finally {
      setLoading(false);
    }
  }, [logType, page, search, severity]);

  useEffect(() => {
    setLogs([]);
    setExpandedLogId(null);
    fetchLogs();
  }, [logType, fetchLogs]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchLogs();
  };

  const handleResetFilters = () => {
    setSearch('');
    setSeverity('');
    setPage(1);
  };

  const toggleRow = (id: string) => {
    setExpandedLogId(expandedLogId === id ? null : id);
  };

  return (
    <div style={styles.container}>
      <div className="flex-between">
        <div>
          <h1 className="title-large">System Logs & Audits</h1>
          <p style={styles.subtitle}>Track client-side mobile exceptions and monitor administrative database transactions</p>
        </div>
        <button className="btn btn-outline" onClick={fetchLogs} style={{ padding: '0.5rem 0.75rem' }}>
          <RefreshCw size={16} />
        </button>
      </div>

      {/* Switch Log Type Toggles */}
      <div style={styles.toggleRow}>
        <button
          style={{ ...styles.toggleBtn, ...(logType === 'app' ? styles.toggleBtnActive : {}) }}
          onClick={() => { setLogType('app'); setPage(1); }}
        >
          <FileText size={16} />
          <span>Application Logs</span>
        </button>
        <button
          style={{ ...styles.toggleBtn, ...(logType === 'audit' ? styles.toggleBtnActive : {}) }}
          onClick={() => { setLogType('audit'); setPage(1); }}
        >
          <ShieldCheck size={16} />
          <span>Admin Audit Trail</span>
        </button>
      </div>

      {/* Filters (App Logs only) */}
      {logType === 'app' && (
        <div className="card" style={styles.filterCard}>
          <form onSubmit={handleSearchSubmit} style={styles.filterForm}>
            <div style={styles.searchContainer}>
              <Search size={18} style={styles.searchIcon} />
              <input
                type="text"
                placeholder="Search by user email or error text..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={styles.searchInput}
              />
            </div>

            <div style={styles.selectsContainer}>
              <select
                value={severity}
                onChange={(e) => { setSeverity(e.target.value); setPage(1); }}
                className="input-field"
                style={styles.select}
              >
                <option value="">All Severities</option>
                <option value="error">Error</option>
                <option value="warning">Warning</option>
                <option value="info">Info</option>
                <option value="success">Success</option>
              </select>

              <button type="submit" className="btn btn-primary">Search</button>
              <button type="button" className="btn btn-outline" onClick={handleResetFilters}>Reset</button>
            </div>
          </form>
        </div>
      )}

      {/* Logs Table */}
      {loading ? (
        <div style={styles.loadingContainer}>
          <div style={styles.spinner}></div>
          <p>Fetching logs...</p>
        </div>
      ) : (
        <>
          <div className="table-container">
            <table className="admin-table">
              {logType === 'app' ? (
                <>
                  <thead>
                    <tr>
                      <th>Time</th>
                      <th>User</th>
                      <th>Severity</th>
                      <th>Screen</th>
                      <th>Message</th>
                      <th style={{ textAlign: 'right' }}>Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.length === 0 ? (
                      <tr>
                        <td colSpan={6} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
                          No application logs matches the search criteria.
                        </td>
                      </tr>
                    ) : (
                      logs.map((log) => (
                        <React.Fragment key={log.id}>
                          <tr>
                            <td>{new Date(log.created_at).toLocaleString()}</td>
                            <td>{log.user_email || 'guest@aimeal.com'}</td>
                            <td>
                              <span className={`badge ${
                                log.severity === 'error' ? 'badge-error' : 
                                log.severity === 'warning' ? 'badge-warning' : 'badge-info'
                              }`}>
                                {log.severity || 'info'}
                              </span>
                            </td>
                            <td><strong>{log.screen_name || 'N/A'}</strong></td>
                            <td style={{ maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {log.error_message}
                            </td>
                            <td style={{ textAlign: 'right' }}>
                              <button className="btn btn-outline btn-icon" onClick={() => toggleRow(log.id)}>
                                <Eye size={12} />
                              </button>
                            </td>
                          </tr>
                          {expandedLogId === log.id && (
                            <tr>
                              <td colSpan={6} style={{ backgroundColor: '#F8F9FA', padding: '1.5rem' }}>
                                <div style={styles.expandedLog}>
                                  <h4 style={{ fontWeight: 700, marginBottom: '0.5rem' }}>Error Details</h4>
                                  <p style={{ fontWeight: 600, color: 'var(--text-dark)', marginBottom: '0.75rem' }}>{log.error_message}</p>
                                  {log.error_details && (
                                    <pre style={styles.logPre}>{log.error_details}</pre>
                                  )}
                                  {log.extra_data && (
                                    <div style={{ marginTop: '1rem' }}>
                                      <h5 style={{ fontWeight: 700, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Metadata JSON</h5>
                                      <pre style={styles.jsonPre}>{JSON.stringify(log.extra_data, null, 2)}</pre>
                                    </div>
                                  )}
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      ))
                    )}
                  </tbody>
                </>
              ) : (
                <>
                  <thead>
                    <tr>
                      <th>Time</th>
                      <th>Admin</th>
                      <th>Action</th>
                      <th>Entity</th>
                      <th>Affected ID</th>
                      <th>IP Address</th>
                      <th>Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.length === 0 ? (
                      <tr>
                        <td colSpan={7} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
                          No admin audit log transactions recorded yet.
                        </td>
                      </tr>
                    ) : (
                      logs.map((log) => (
                        <React.Fragment key={log.id}>
                          <tr>
                            <td>{new Date(log.created_at).toLocaleString()}</td>
                            <td>
                              <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <strong>{log.admin_users?.email}</strong>
                                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                                  {log.admin_users?.role}
                                </span>
                              </div>
                            </td>
                            <td>
                              <span className="badge badge-info" style={{ fontWeight: 700 }}>{log.action}</span>
                            </td>
                            <td><span style={{ textTransform: 'capitalize', fontWeight: 600 }}>{log.entity_type || '-'}</span></td>
                            <td style={{ fontSize: '0.8rem', fontFamily: 'monospace' }}>{log.entity_id || '-'}</td>
                            <td>{log.ip_address || '-'}</td>
                            <td>
                              <button className="btn btn-outline btn-icon" onClick={() => toggleRow(log.id)}>
                                <Eye size={12} />
                              </button>
                            </td>
                          </tr>
                          {expandedLogId === log.id && (
                            <tr>
                              <td colSpan={7} style={{ backgroundColor: '#F8F9FA', padding: '1.5rem' }}>
                                <div style={styles.expandedLog}>
                                  <h4 style={{ fontWeight: 700, marginBottom: '0.75rem' }}>Action Context JSON</h4>
                                  <pre style={styles.jsonPre}>{JSON.stringify(log.details, null, 2)}</pre>
                                  {log.user_agent && (
                                    <div style={{ marginTop: '0.75rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                      User Agent: <strong>{log.user_agent}</strong>
                                    </div>
                                  )}
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      ))
                    )}
                  </tbody>
                </>
              )}
            </table>
          </div>

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div style={styles.pagination}>
              <span style={styles.paginationText}>
                Showing Page <strong>{pagination.page}</strong> of {pagination.pages} ({pagination.total} total logs)
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
    padding: '0.625rem 1.25rem',
    borderRadius: 'var(--radius-sm)',
    fontSize: '0.875rem',
    fontWeight: 600,
    backgroundColor: 'transparent',
    color: 'var(--text-secondary)',
    cursor: 'pointer',
    transition: 'all var(--transition-fast)',
  },
  toggleBtnActive: {
    backgroundColor: '#FFFFFF',
    color: 'var(--primary-dark)',
    boxShadow: 'var(--shadow-sm)',
    border: '1px solid rgba(226, 232, 240, 0.8)',
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
  expandedLog: {
    display: 'flex',
    flexDirection: 'column',
  },
  logPre: {
    padding: '1rem',
    backgroundColor: '#1E293B',
    color: '#E2E8F0',
    borderRadius: '6px',
    fontFamily: 'monospace',
    fontSize: '0.8rem',
    overflowX: 'auto',
    whiteSpace: 'pre-wrap',
  },
  jsonPre: {
    padding: '1rem',
    backgroundColor: '#0F172A',
    color: '#34D399',
    borderRadius: '6px',
    fontFamily: 'monospace',
    fontSize: '0.8rem',
    overflowX: 'auto',
    whiteSpace: 'pre-wrap',
  },
};

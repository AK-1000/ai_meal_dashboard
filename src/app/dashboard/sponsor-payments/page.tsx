'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { 
  Wallet, 
  Plus, 
  DollarSign, 
  Calculator, 
  CheckCircle2, 
  Clock, 
  X, 
  Award, 
  Tag, 
  Link2, 
  Users, 
  ChevronLeft, 
  ChevronRight,
  TrendingUp,
  Receipt,
  Building2,
  AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase-browser';

export default function SponsorPaymentsPage() {
  const searchParams = useSearchParams();
  const initialSponsorParam = searchParams.get('sponsorId') || '';

  const [payments, setPayments] = useState<any[]>([]);
  const [sponsors, setSponsors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // Summary stats from API
  const [stats, setStats] = useState({
    totalPaidHistorical: 0,
    totalPendingOwed: 0,
    sponsorsWithPending: 0
  });

  // Modal state
  const [showPaymentForm, setShowPaymentForm] = useState(false);

  // Payment form states
  const [selectedSponsor, setSelectedSponsor] = useState(initialSponsorParam);
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('whish_money');
  const [notes, setNotes] = useState('');
  const [periodStart, setPeriodStart] = useState('');
  const [periodEnd, setPeriodEnd] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Calculation result
  const [calcResult, setCalcResult] = useState<any>(null);
  const [calculating, setCalculating] = useState(false);

  const getSession = useCallback(async () => {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    return session;
  }, []);

  const fetchPayments = useCallback(async () => {
    setLoading(true);
    try {
      const session = await getSession();
      if (!session) return;

      const params = new URLSearchParams({ page: String(page), limit: '15' });

      const res = await fetch(`/api/sponsor-payments?${params}`, {
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      });
      const data = await res.json();

      setPayments(data.payments || []);
      if (data.stats) setStats(data.stats);
      setTotal(data.pagination?.total || 0);
      setTotalPages(data.pagination?.pages || 1);
    } catch (err) {
      console.error(err);
      toast.error('Error fetching sponsor payments.');
    } finally {
      setLoading(false);
    }
  }, [page, getSession]);

  const fetchSponsors = useCallback(async () => {
    try {
      const session = await getSession();
      if (!session) return;

      const res = await fetch('/api/sponsors', {
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      });
      const data = await res.json();
      setSponsors(data.sponsors || []);
    } catch (err) {
      console.error(err);
    }
  }, [getSession]);

  useEffect(() => {
    fetchPayments();
    fetchSponsors();
  }, [fetchPayments, fetchSponsors]);

  // Auto calculate when sponsor is chosen or if passed in URL
  const runCalculationForSponsor = useCallback(async (sponsorId: string) => {
    if (!sponsorId) return;

    setCalculating(true);
    try {
      const session = await getSession();
      if (!session) return;

      const res = await fetch('/api/sponsor-payments/calculate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ sponsorId })
      });

      const data = await res.json();
      if (data.success) {
        setCalcResult(data);
        setAmount(String(data.summary?.suggestedAmount ?? 0));
        if (data.summary?.periodStart) setPeriodStart(data.summary.periodStart.split('T')[0]);
        if (data.summary?.periodEnd) setPeriodEnd(data.summary.periodEnd.split('T')[0]);
      } else {
        toast.error(data.error || 'Failed to calculate payment.');
      }
    } catch (err) {
      console.error(err);
      toast.error('Error calculating payment.');
    } finally {
      setCalculating(false);
    }
  }, [getSession]);

  // If initial sponsor was passed in URL query param, automatically open modal and calculate
  useEffect(() => {
    if (initialSponsorParam) {
      setSelectedSponsor(initialSponsorParam);
      setShowPaymentForm(true);
      runCalculationForSponsor(initialSponsorParam);
    }
  }, [initialSponsorParam, runCalculationForSponsor]);

  const handleSponsorSelection = (sponsorId: string) => {
    setSelectedSponsor(sponsorId);
    setCalcResult(null);
    setAmount('');
    if (sponsorId) {
      runCalculationForSponsor(sponsorId);
    }
  };

  const handleOpenPaymentModal = (sponsorId?: string) => {
    if (sponsorId) {
      setSelectedSponsor(sponsorId);
      runCalculationForSponsor(sponsorId);
    } else {
      setSelectedSponsor('');
      setCalcResult(null);
      setAmount('');
    }
    setShowPaymentForm(true);
  };

  const handleCreatePayment = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedSponsor || amount === '') {
      toast.error('Please select a sponsor and enter an amount.');
      return;
    }

    setSubmitting(true);
    try {
      const session = await getSession();
      if (!session) return;

      const payload: any = {
        sponsorId: selectedSponsor,
        amount: Number(amount),
        currency: 'USD',
        paymentMethod,
        notes: notes || null,
        periodStart: periodStart || null,
        periodEnd: periodEnd || null,
      };

      if (calcResult?.unpaidReferralIds && calcResult.unpaidReferralIds.length > 0) {
        payload.referralIds = calcResult.unpaidReferralIds;
      }

      const res = await fetch('/api/sponsor-payments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        toast.success('Sponsor payout recorded and referrals settled!');
        resetForm();
        fetchPayments();
        fetchSponsors();
      } else {
        const err = await res.json();
        toast.error(err.error || 'Failed to record payment.');
      }
    } catch (err) {
      console.error(err);
      toast.error('Error recording payment.');
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setShowPaymentForm(false);
    setSelectedSponsor('');
    setAmount('');
    setPaymentMethod('whish_money');
    setNotes('');
    setPeriodStart('');
    setPeriodEnd('');
    setCalcResult(null);
  };

  // Sponsors with unpaid balance > 0
  const sponsorsWithBalance = sponsors.filter(s => (s.unpaid_commission || 0) > 0);

  return (
    <div style={styles.container}>
      {/* Header */}
      <div className="flex-between">
        <div>
          <h1 className="title-large">Sponsor Commission Payouts</h1>
          <p style={styles.subtitle}>
            Pay sponsors for referred accounts, settle unpaid commissions with 1-click, and maintain full payout audit history.
          </p>
        </div>
        {!showPaymentForm && (
          <button 
            className="btn btn-primary flex-center" 
            style={{ gap: '0.5rem' }} 
            onClick={() => handleOpenPaymentModal()}
          >
            <Plus size={16} />
            <span>Record Payout</span>
          </button>
        )}
      </div>

      {/* KPI Overview Grid */}
      <div style={styles.kpiGrid}>
        <div style={styles.kpiCard}>
          <div style={styles.kpiHeader}>
            <span style={styles.kpiTitle}>Pending Commissions</span>
            <div style={{ ...styles.kpiIcon, backgroundColor: 'rgba(255, 152, 0, 0.1)', color: '#FF9800' }}>
              <Clock size={18} />
            </div>
          </div>
          <div style={{ ...styles.kpiValue, color: '#D97706' }}>${stats.totalPendingOwed.toFixed(2)}</div>
          <div style={styles.kpiSub}>Total currently owed across sponsors</div>
        </div>

        <div style={styles.kpiCard}>
          <div style={styles.kpiHeader}>
            <span style={styles.kpiTitle}>Sponsors Awaiting Payout</span>
            <div style={{ ...styles.kpiIcon, backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#EF4444' }}>
              <AlertCircle size={18} />
            </div>
          </div>
          <div style={styles.kpiValue}>{sponsorsWithBalance.length}</div>
          <div style={styles.kpiSub}>Partners with non-zero commission balance</div>
        </div>

        <div style={styles.kpiCard}>
          <div style={styles.kpiHeader}>
            <span style={styles.kpiTitle}>Total Paid to Date</span>
            <div style={{ ...styles.kpiIcon, backgroundColor: 'rgba(76, 175, 80, 0.1)', color: '#4CAF50' }}>
              <TrendingUp size={18} />
            </div>
          </div>
          <div style={{ ...styles.kpiValue, color: '#16A34A' }}>${stats.totalPaidHistorical.toFixed(2)}</div>
          <div style={styles.kpiSub}>Historical commissions settled</div>
        </div>

        <div style={styles.kpiCard}>
          <div style={styles.kpiHeader}>
            <span style={styles.kpiTitle}>Total Payouts Logged</span>
            <div style={{ ...styles.kpiIcon, backgroundColor: 'rgba(33, 150, 243, 0.1)', color: '#2196F3' }}>
              <Receipt size={18} />
            </div>
          </div>
          <div style={styles.kpiValue}>{total}</div>
          <div style={styles.kpiSub}>Recorded payout transactions</div>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div style={styles.tabsRow}>
        <Link href="/dashboard/sponsors" style={styles.tabLink}>
          <Award size={15} />
          <span>Sponsors Directory</span>
        </Link>
        <Link href="/dashboard/promo-codes" style={styles.tabLink}>
          <Tag size={15} />
          <span>Referral Codes</span>
        </Link>
        <Link href="/dashboard/referral-tracking" style={styles.tabLink}>
          <Link2 size={15} />
          <span>Referral Tracking Ledger</span>
        </Link>
        <div style={styles.tabActivePill}>
          <Wallet size={15} />
          <span>Sponsor Payouts ({total})</span>
        </div>
      </div>

      {/* Pending Balances Quick Pay Bar */}
      {sponsorsWithBalance.length > 0 && (
        <div className="card" style={{ backgroundColor: '#FFFBEB', border: '1px solid #FDE68A', padding: '1rem 1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
            <Clock size={16} color="#D97706" />
            <h4 style={{ margin: 0, fontSize: '0.875rem', fontWeight: 700, color: '#92400E' }}>
              Pending Sponsor Payouts ({sponsorsWithBalance.length} partners awaiting payment)
            </h4>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            {sponsorsWithBalance.map(s => (
              <div
                key={s.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #FCD34D',
                  padding: '0.5rem 0.875rem',
                  borderRadius: '8px',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
                }}
              >
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.875rem', color: '#0F172A' }}>{s.name}</div>
                  <div style={{ fontSize: '0.75rem', color: '#B45309', fontWeight: 600 }}>
                    ${(s.unpaid_commission || 0).toFixed(2)} Owed
                  </div>
                </div>
                <button
                  type="button"
                  className="btn btn-primary"
                  style={{ fontSize: '0.75rem', padding: '0.25rem 0.625rem' }}
                  onClick={() => handleOpenPaymentModal(s.id)}
                >
                  Pay Now
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Record Payment Form / Modal */}
      {showPaymentForm && (
        <div className="card animate-fade-in" style={{ maxWidth: '800px', border: '1px solid #CBD5E1', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
          <div className="flex-between" style={{ marginBottom: '1.25rem' }}>
            <div>
              <h3 className="title-medium" style={{ margin: 0 }}>Record Sponsor Payout</h3>
              <p style={{ fontSize: '0.8125rem', color: '#64748B', marginTop: '2px' }}>
                Select a sponsor. The system will auto-calculate their unpaid balance and settle corresponding referrals upon confirmation.
              </p>
            </div>
            <button
              className="btn btn-outline btn-icon"
              onClick={resetForm}
            >
              <X size={16} />
            </button>
          </div>

          <form onSubmit={handleCreatePayment} style={styles.formGrid}>
            <div className="form-group">
              <label className="form-label" htmlFor="payout-sponsor">Sponsor Partner *</label>
              <select
                id="payout-sponsor"
                className="input-field"
                value={selectedSponsor}
                onChange={(e) => handleSponsorSelection(e.target.value)}
                required
              >
                <option value="">Select Sponsor</option>
                {sponsors.map(s => {
                  const unpaid = s.unpaid_commission || 0;
                  return (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.code_prefix || 'No prefix'}) — {unpaid > 0 ? `$${unpaid.toFixed(2)} owed` : 'Settled'}
                    </option>
                  );
                })}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="payout-amount">Payout Amount (USD) *</label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input
                  id="payout-amount"
                  type="number"
                  step="0.01"
                  min="0"
                  className="input-field"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  required
                  style={{ flex: 1, fontWeight: 700 }}
                />
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => runCalculationForSponsor(selectedSponsor)}
                  disabled={!selectedSponsor || calculating}
                  style={{ display: 'flex', gap: '4px', alignItems: 'center', whiteSpace: 'nowrap', fontSize: '0.8125rem' }}
                >
                  <Calculator size={14} />
                  <span>{calculating ? 'Calculating...' : 'Recalculate'}</span>
                </button>
              </div>
            </div>

            {/* Calculation Result Summary Banner */}
            {calcResult && (
              <div style={{ gridColumn: 'span 2', padding: '1rem', borderRadius: '8px', backgroundColor: '#F0FDF4', border: '1px solid #BBF7D0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <CheckCircle2 size={16} color="#16A34A" />
                  <span style={{ fontSize: '0.875rem', fontWeight: 700, color: '#166534' }}>
                    Calculation for {calcResult.sponsor?.name} ({calcResult.sponsor?.commissionPercentage || 0}% Comm.)
                  </span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
                  <div>
                    <span style={{ fontSize: '0.75rem', color: '#64748B' }}>Total Referred Accounts</span>
                    <div style={{ fontWeight: 700, color: '#0F172A', fontSize: '1rem' }}>{calcResult.summary?.totalReferrals || 0}</div>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.75rem', color: '#64748B' }}>Unpaid Referrals To Settle</span>
                    <div style={{ fontWeight: 700, color: '#D97706', fontSize: '1rem' }}>{calcResult.summary?.unpaidReferrals || 0}</div>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.75rem', color: '#64748B' }}>Calculated Commission</span>
                    <div style={{ fontWeight: 800, color: '#16A34A', fontSize: '1.125rem' }}>
                      ${(calcResult.summary?.suggestedAmount ?? 0).toFixed(2)}
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="form-group">
              <label className="form-label" htmlFor="payout-method">Payment Method</label>
              <select 
                id="payout-method"
                className="input-field" 
                value={paymentMethod} 
                onChange={(e) => setPaymentMethod(e.target.value)}
              >
                <option value="whish_money">Whish Money (Lebanon)</option>
                <option value="omt">OMT / Western Union (Lebanon)</option>
                <option value="bank_transfer">Bank Wire / Transfer</option>
                <option value="cash">Cash / Direct Handover</option>
                <option value="paypal">PayPal</option>
                <option value="stripe">Stripe / Card Transfer</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="payout-notes">Payment Reference / Receipt Notes</label>
              <input
                id="payout-notes"
                type="text"
                placeholder="Transaction ID, MTCN, or receipt details..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="input-field"
              />
            </div>

            <div style={{ gridColumn: 'span 2', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
              <button type="button" className="btn btn-outline" onClick={resetForm}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={submitting}>
                {submitting ? 'Recording & Settling...' : 'Confirm Payout & Settle Referrals'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Payout History Table */}
      {loading ? (
        <div style={styles.loadingContainer}>
          <div style={styles.spinner}></div>
          <p>Loading payment history...</p>
        </div>
      ) : (
        <div className="table-container">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Sponsor Partner</th>
                <th>Amount Paid</th>
                <th>Payment Method</th>
                <th>Referrals Settled</th>
                <th>Receipt / Notes</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {payments.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
                    No payout records found yet. Click "Record Payout" to settle a sponsor commission.
                  </td>
                </tr>
              ) : (
                payments.map((p) => {
                  const methodLabels: Record<string, string> = {
                    whish_money: 'Whish Money',
                    omt: 'OMT',
                    bank_transfer: 'Bank Transfer',
                    cash: 'Cash / Manual',
                    paypal: 'PayPal',
                    stripe: 'Stripe',
                    other: 'Other'
                  };

                  return (
                    <tr key={p.id}>
                      {/* Date */}
                      <td style={{ fontSize: '0.8125rem', color: '#0F172A', fontWeight: 500 }}>
                        {new Date(p.created_at).toLocaleDateString()}
                      </td>

                      {/* Sponsor */}
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Award size={14} color="#4CAF50" />
                          <strong style={{ color: '#0F172A' }}>{p.sponsors?.name || 'Sponsor'}</strong>
                          {p.sponsors?.code_prefix && (
                            <code style={{ fontSize: '0.75rem', color: '#64748B' }}>({p.sponsors.code_prefix})</code>
                          )}
                        </div>
                      </td>

                      {/* Amount Paid */}
                      <td>
                        <span style={{ fontWeight: 800, color: '#16A34A', fontSize: '0.95rem' }}>
                          ${Number(p.amount).toFixed(2)}
                        </span>
                      </td>

                      {/* Method */}
                      <td>
                        <span className="badge" style={{ backgroundColor: '#F1F5F9', color: '#334155', textTransform: 'capitalize' }}>
                          {methodLabels[p.payment_method] || p.payment_method}
                        </span>
                      </td>

                      {/* Referrals Settled */}
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Users size={13} color="#64748B" />
                          <span style={{ fontWeight: 600, color: '#0F172A' }}>{p.referrals_covered || 0}</span>
                          <span style={{ fontSize: '0.75rem', color: '#64748B' }}>referrals</span>
                        </div>
                      </td>

                      {/* Notes / Receipt */}
                      <td style={{ fontSize: '0.8125rem', color: '#64748B', maxWidth: '200px' }}>
                        {p.notes || <span style={{ color: '#CBD5E1' }}>—</span>}
                      </td>

                      {/* Status */}
                      <td>
                        <span className="badge badge-success flex-center" style={{ gap: '3px' }}>
                          <CheckCircle2 size={12} />
                          <span>Settled</span>
                        </span>
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
            Page {page} of {totalPages} ({total} payouts)
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

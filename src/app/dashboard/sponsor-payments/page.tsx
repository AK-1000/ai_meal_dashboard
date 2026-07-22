'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Wallet, Plus, DollarSign, Calculator, CheckCircle2, Clock, X } from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase-browser';

export default function SponsorPaymentsPage() {
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // Modal state
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [sponsors, setSponsors] = useState<any[]>([]);

  // Payment form
  const [selectedSponsor, setSelectedSponsor] = useState('');
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('manual');
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

  const fetchPayments = async () => {
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
      setTotal(data.pagination?.total || 0);
      setTotalPages(data.pagination?.pages || 1);
    } catch (err) {
      console.error(err);
      toast.error('Error fetching payments.');
    } finally {
      setLoading(false);
    }
  };

  const fetchSponsors = async () => {
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
  };

  useEffect(() => {
    fetchPayments();
    fetchSponsors();
  }, [page]);

  const handleCalculate = async () => {
    if (!selectedSponsor) {
      toast.error('Please select a sponsor first.');
      return;
    }

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
        body: JSON.stringify({ sponsorId: selectedSponsor })
      });

      const data = await res.json();
      if (data.success) {
        setCalcResult(data);
        setAmount(String(data.summary.suggestedAmount));
        if (data.summary.periodStart) setPeriodStart(data.summary.periodStart.split('T')[0]);
        if (data.summary.periodEnd) setPeriodEnd(data.summary.periodEnd.split('T')[0]);
        toast.success('Payment calculated successfully.');
      } else {
        toast.error(data.error || 'Failed to calculate.');
      }
    } catch (err) {
      console.error(err);
      toast.error('Error calculating payment.');
    } finally {
      setCalculating(false);
    }
  };

  const handleCreatePayment = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedSponsor || !amount) {
      toast.error('Sponsor and amount are required.');
      return;
    }

    setSubmitting(true);
    try {
      const session = await getSession();
      if (!session) return;

      const payload: any = {
        sponsorId: selectedSponsor,
        amount: Number(amount),
        paymentMethod,
        notes: notes || null,
        periodStart: periodStart || null,
        periodEnd: periodEnd || null,
      };

      // If we have calculated unpaid referral IDs, include them
      if (calcResult?.unpaidReferralIds) {
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
        toast.success('Payment recorded successfully.');
        resetForm();
        fetchPayments();
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
    setPaymentMethod('manual');
    setNotes('');
    setPeriodStart('');
    setPeriodEnd('');
    setCalcResult(null);
  };

  return (
    <div style={styles.container}>
      <div className="flex-between">
        <div>
          <h1 className="title-large">Sponsor Payments</h1>
          <p style={styles.subtitle}>Record and manage payments to sponsors for their referrals</p>
        </div>
        {!showPaymentForm && (
          <button className="btn btn-primary" onClick={() => setShowPaymentForm(true)}>
            <Plus size={16} />
            <span>Record Payment</span>
          </button>
        )}
      </div>

      {/* Payment Form */}
      {showPaymentForm && (
        <div className="card animate-fade-in" style={{ maxWidth: '800px' }}>
          <div className="flex-between" style={{ marginBottom: '1.5rem' }}>
            <h3 className="title-medium" style={{ margin: 0 }}>Record Sponsor Payment</h3>
            <button
              style={{ background: 'transparent', cursor: 'pointer', color: 'var(--text-secondary)' }}
              onClick={resetForm}
            >
              <X size={20} />
            </button>
          </div>

          <form onSubmit={handleCreatePayment} style={styles.formGrid}>
            <div className="form-group">
              <label className="form-label">Sponsor</label>
              <select
                className="input-field"
                value={selectedSponsor}
                onChange={(e) => { setSelectedSponsor(e.target.value); setCalcResult(null); }}
                required
              >
                <option value="">Select Sponsor</option>
                {sponsors.map(s => (
                  <option key={s.id} value={s.id}>{s.name} ({s.code_prefix})</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Amount (USD)</label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  className="input-field"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  required
                  style={{ flex: 1 }}
                />
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={handleCalculate}
                  disabled={!selectedSponsor || calculating}
                  style={{ display: 'flex', gap: '4px', alignItems: 'center', whiteSpace: 'nowrap' }}
                >
                  <Calculator size={14} />
                  <span>{calculating ? 'Calculating...' : 'Auto-Calculate'}</span>
                </button>
              </div>
            </div>

            {/* Calculation Result Card */}
            {calcResult && (
              <div style={{ gridColumn: 'span 2', padding: '1rem', borderRadius: '8px', backgroundColor: 'rgba(76, 175, 80, 0.05)', border: '1px solid rgba(76, 175, 80, 0.15)' }}>
                <h4 style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--primary-dark)', marginBottom: '0.75rem' }}>
                  Payment Summary for {calcResult.sponsor?.name}
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
                  <div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Total Referrals</span>
                    <div style={{ fontWeight: 600 }}>{calcResult.summary?.totalReferrals}</div>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Unpaid Referrals</span>
                    <div style={{ fontWeight: 600, color: '#F59E0B' }}>{calcResult.summary?.unpaidReferrals}</div>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Suggested Amount</span>
                    <div style={{ fontWeight: 700, color: 'var(--primary-dark)', fontSize: '1.1rem' }}>${calcResult.summary?.suggestedAmount?.toFixed(2)}</div>
                  </div>
                </div>
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Payment Method</label>
              <select className="input-field" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
                <option value="manual">Manual / Cash</option>
                <option value="bank_transfer">Bank Transfer</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Notes (optional)</label>
              <input type="text" className="input-field" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Payment reference, notes..." />
            </div>

            <div className="form-group">
              <label className="form-label">Period Start</label>
              <input type="date" className="input-field" value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} />
            </div>

            <div className="form-group">
              <label className="form-label">Period End</label>
              <input type="date" className="input-field" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} />
            </div>

            <div style={{ gridColumn: 'span 2', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
              <button type="button" className="btn btn-outline" onClick={resetForm}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={submitting}>
                {submitting ? 'Recording...' : 'Record Payment'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Payments Table */}
      {loading ? (
        <div style={styles.loadingContainer}>
          <div style={styles.spinner}></div>
          <p>Loading payments...</p>
        </div>
      ) : (
        <>
          <div className="table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Sponsor</th>
                  <th>Amount</th>
                  <th>Referrals Covered</th>
                  <th>Method</th>
                  <th>Period</th>
                  <th>Notes</th>
                  <th>Recorded By</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {payments.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
                      No sponsor payments recorded yet. Click Record Payment to create one.
                    </td>
                  </tr>
                ) : (
                  payments.map((p) => (
                    <tr key={p.id}>
                      <td><strong>{p.sponsors?.name || '—'}</strong></td>
                      <td style={{ fontWeight: 600, color: 'var(--primary-dark)' }}>
                        ${Number(p.amount).toFixed(2)} {p.currency}
                      </td>
                      <td>
                        <span className="badge badge-info">{p.referrals_covered}</span>
                      </td>
                      <td>
                        <span className="badge" style={{ textTransform: 'capitalize' }}>
                          {p.payment_method?.replace('_', ' ')}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.85rem' }}>
                        {p.period_start && p.period_end
                          ? `${new Date(p.period_start).toLocaleDateString()} — ${new Date(p.period_end).toLocaleDateString()}`
                          : <span style={{ color: 'var(--text-muted)' }}>—</span>
                        }
                      </td>
                      <td style={{ fontSize: '0.85rem', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {p.notes || <span style={{ color: 'var(--text-muted)' }}>—</span>}
                      </td>
                      <td style={{ fontSize: '0.85rem' }}>{p.admin_users?.email || '—'}</td>
                      <td style={{ fontSize: '0.85rem' }}>{new Date(p.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div style={styles.pagination}>
              <button className="btn btn-outline" disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))}>
                Previous
              </button>
              <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                Page {page} of {totalPages} ({total} payments)
              </span>
              <button className="btn btn-outline" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
                Next
              </button>
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
  formGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '1.25rem',
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
  pagination: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '1.5rem',
  },
};

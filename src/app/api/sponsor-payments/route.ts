import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth, logAdminAction } from '@/lib/auth-helpers';
import { supabaseAdmin } from '@/lib/supabase-admin';

// GET: List sponsor payments with filtering
export const GET = withAdminAuth(async (req: NextRequest) => {
  try {
    const searchParams = req.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '15');
    const sponsorId = searchParams.get('sponsorId') || '';

    const offset = (page - 1) * limit;

    let query = supabaseAdmin
      .from('sponsor_payments')
      .select(`
        *,
        sponsors:sponsor_id (id, name, code_prefix, contact_email),
        admin_users:paid_by_admin_id (id, email)
      `, { count: 'exact' });

    if (sponsorId) {
      query = query.eq('sponsor_id', sponsorId);
    }

    const [
      { data: payments, count, error },
      { data: allPayments },
      { data: allUnpaidRefs }
    ] = await Promise.all([
      query.order('created_at', { ascending: false }).range(offset, offset + limit - 1),
      supabaseAdmin.from('sponsor_payments').select('amount'),
      supabaseAdmin.from('referral_tracking').select('commission_amount, sponsor_id').eq('payment_status', 'unpaid')
    ]);

    if (error) throw error;

    const totalPaidHistorical = (allPayments || []).reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
    const totalPendingOwed = (allUnpaidRefs || []).reduce((sum, r) => sum + (Number(r.commission_amount) || 0), 0);
    const sponsorsWithPending = new Set((allUnpaidRefs || []).filter(r => (Number(r.commission_amount) || 0) > 0).map(r => r.sponsor_id)).size;

    return NextResponse.json({
      payments,
      stats: {
        totalPaidHistorical: Number(totalPaidHistorical.toFixed(2)),
        totalPendingOwed: Number(totalPendingOwed.toFixed(2)),
        sponsorsWithPending,
      },
      pagination: {
        page,
        limit,
        total: count || 0,
        pages: Math.ceil((count || 0) / limit),
      }
    });
  } catch (err: any) {
    console.error('Error fetching sponsor payments:', err);
    return NextResponse.json({ error: err.message || 'Failed to fetch payments' }, { status: 500 });
  }
});

// POST: Create a new sponsor payment
export const POST = withAdminAuth(async (req: NextRequest, currentAdmin) => {
  try {
    const { 
      sponsorId, 
      amount, 
      currency = 'USD',
      paymentMethod = 'manual',
      notes,
      periodStart,
      periodEnd,
      referralIds // Array of referral_tracking IDs to mark as paid
    } = await req.json();

    if (!sponsorId || !amount) {
      return NextResponse.json({ error: 'Sponsor ID and amount are required' }, { status: 400 });
    }

    // 1. Create the sponsor payment record
    const { data: payment, error: paymentErr } = await supabaseAdmin
      .from('sponsor_payments')
      .insert({
        sponsor_id: sponsorId,
        amount: Number(amount),
        currency,
        referrals_covered: referralIds?.length || 0,
        payment_method: paymentMethod,
        notes: notes || null,
        paid_by_admin_id: currentAdmin.id,
        period_start: periodStart || null,
        period_end: periodEnd || null,
      })
      .select()
      .single();

    if (paymentErr) throw paymentErr;

    // 2. Mark selected referrals as paid, or all unpaid referrals for this sponsor
    if (referralIds && referralIds.length > 0) {
      const { error: updateErr } = await supabaseAdmin
        .from('referral_tracking')
        .update({
          payment_status: 'paid',
          paid_in_payment_id: payment.id,
          updated_at: new Date().toISOString(),
        })
        .in('id', referralIds);

      if (updateErr) {
        console.error('Error updating referral statuses:', updateErr);
      }
    } else {
      const { data: updatedRefs, error: updateErr } = await supabaseAdmin
        .from('referral_tracking')
        .update({
          payment_status: 'paid',
          paid_in_payment_id: payment.id,
          updated_at: new Date().toISOString(),
        })
        .eq('sponsor_id', sponsorId)
        .eq('payment_status', 'unpaid')
        .select('id');

      if (!updateErr && updatedRefs && updatedRefs.length > 0) {
        await supabaseAdmin
          .from('sponsor_payments')
          .update({ referrals_covered: updatedRefs.length })
          .eq('id', payment.id);
      }
    }

    // 3. Log admin audit action
    await logAdminAction(
      currentAdmin.id,
      'sponsor_payment.create',
      'sponsor_payment',
      payment.id,
      { sponsorId, amount, currency, referralsCovered: referralIds?.length || 0, paymentMethod },
      req
    );

    return NextResponse.json({ success: true, payment });
  } catch (err: any) {
    console.error('Error creating sponsor payment:', err);
    return NextResponse.json({ error: err.message || 'Failed to create payment' }, { status: 500 });
  }
});

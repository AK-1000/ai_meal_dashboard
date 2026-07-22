import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/auth-helpers';
import { supabaseAdmin } from '@/lib/supabase-admin';

// POST: Calculate suggested payment amount for a sponsor
export const POST = withAdminAuth(async (req: NextRequest) => {
  try {
    const { sponsorId } = await req.json();

    if (!sponsorId) {
      return NextResponse.json({ error: 'Sponsor ID is required' }, { status: 400 });
    }

    // Get sponsor commission rate
    const { data: sponsor, error: sponsorErr } = await supabaseAdmin
      .from('sponsors')
      .select('id, name, commission_percentage')
      .eq('id', sponsorId)
      .single();

    if (sponsorErr || !sponsor) {
      return NextResponse.json({ error: 'Sponsor not found' }, { status: 404 });
    }

    // Get unpaid referrals count and total commission
    const { data: unpaidReferrals, count: unpaidCount, error: refErr } = await supabaseAdmin
      .from('referral_tracking')
      .select('id, commission_amount, original_payment_amount, created_at', { count: 'exact' })
      .eq('sponsor_id', sponsorId)
      .eq('payment_status', 'unpaid')
      .order('created_at', { ascending: true });

    if (refErr) throw refErr;

    // Calculate suggested amount
    const totalCommission = (unpaidReferrals || []).reduce(
      (sum: number, ref: any) => sum + (Number(ref.commission_amount) || 0), 
      0
    );

    // Get paid referrals count for context
    const { count: paidCount } = await supabaseAdmin
      .from('referral_tracking')
      .select('*', { count: 'exact', head: true })
      .eq('sponsor_id', sponsorId)
      .eq('payment_status', 'paid');

    // Get total referrals count
    const { count: totalCount } = await supabaseAdmin
      .from('referral_tracking')
      .select('*', { count: 'exact', head: true })
      .eq('sponsor_id', sponsorId);

    // Get date range of unpaid referrals
    const oldestUnpaid = unpaidReferrals && unpaidReferrals.length > 0 
      ? unpaidReferrals[0].created_at 
      : null;
    const newestUnpaid = unpaidReferrals && unpaidReferrals.length > 0 
      ? unpaidReferrals[unpaidReferrals.length - 1].created_at 
      : null;

    return NextResponse.json({
      success: true,
      sponsor: {
        id: sponsor.id,
        name: sponsor.name,
        commissionPercentage: sponsor.commission_percentage,
      },
      summary: {
        totalReferrals: totalCount || 0,
        paidReferrals: paidCount || 0,
        unpaidReferrals: unpaidCount || 0,
        suggestedAmount: Math.round(totalCommission * 100) / 100,
        periodStart: oldestUnpaid,
        periodEnd: newestUnpaid,
      },
      unpaidReferralIds: (unpaidReferrals || []).map((r: any) => r.id),
    });
  } catch (err: any) {
    console.error('Error calculating sponsor payment:', err);
    return NextResponse.json({ error: err.message || 'Failed to calculate payment' }, { status: 500 });
  }
});

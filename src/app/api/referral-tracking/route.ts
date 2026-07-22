import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/auth-helpers';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const GET = withAdminAuth(async (req: NextRequest) => {
  try {
    const searchParams = req.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '15');
    const sponsorId = searchParams.get('sponsorId') || '';
    const paymentStatus = searchParams.get('paymentStatus') || '';
    const dateFrom = searchParams.get('dateFrom') || '';
    const dateTo = searchParams.get('dateTo') || '';
    const search = searchParams.get('search') || '';

    const offset = (page - 1) * limit;

    let query = supabaseAdmin
      .from('referral_tracking')
      .select(`
        *,
        sponsors:sponsor_id (id, name, code_prefix, commission_percentage),
        promo_codes:referral_code_id (id, code, discount_percentage),
        users:referred_user_id (id, email, name, created_at)
      `, { count: 'exact' });

    // Apply filters
    if (sponsorId) {
      query = query.eq('sponsor_id', sponsorId);
    }

    if (paymentStatus) {
      query = query.eq('payment_status', paymentStatus);
    }

    if (dateFrom) {
      query = query.gte('created_at', new Date(dateFrom).toISOString());
    }

    if (dateTo) {
      const endDate = new Date(dateTo);
      endDate.setHours(23, 59, 59, 999);
      query = query.lte('created_at', endDate.toISOString());
    }

    if (search) {
      // Search by user email or referral code
      query = query.or(`users.email.ilike.%${search}%`);
    }

    const { data: referrals, count, error } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    // Get summary stats
    const { data: summaryData, error: summaryError } = await supabaseAdmin
      .from('referral_tracking')
      .select('sponsor_id, payment_status, commission_amount')
      .eq(sponsorId ? 'sponsor_id' : 'id', sponsorId || '');

    // Build sponsor summary
    let sponsorSummary: any[] = [];
    if (!sponsorId) {
      const { data: sponsors, error: sponsorsErr } = await supabaseAdmin
        .from('sponsors')
        .select('id, name, code_prefix, commission_percentage')
        .eq('is_active', true);

      if (!sponsorsErr && sponsors) {
        const summaryPromises = sponsors.map(async (sponsor: any) => {
          const { count: totalRefs } = await supabaseAdmin
            .from('referral_tracking')
            .select('*', { count: 'exact', head: true })
            .eq('sponsor_id', sponsor.id);

          const { count: paidRefs } = await supabaseAdmin
            .from('referral_tracking')
            .select('*', { count: 'exact', head: true })
            .eq('sponsor_id', sponsor.id)
            .eq('payment_status', 'paid');

          const { count: unpaidRefs } = await supabaseAdmin
            .from('referral_tracking')
            .select('*', { count: 'exact', head: true })
            .eq('sponsor_id', sponsor.id)
            .eq('payment_status', 'unpaid');

          return {
            ...sponsor,
            totalReferrals: totalRefs || 0,
            paidReferrals: paidRefs || 0,
            unpaidReferrals: unpaidRefs || 0,
          };
        });

        sponsorSummary = await Promise.all(summaryPromises);
      }
    }

    return NextResponse.json({
      referrals,
      sponsorSummary,
      pagination: {
        page,
        limit,
        total: count || 0,
        pages: Math.ceil((count || 0) / limit),
      }
    });
  } catch (err: any) {
    console.error('Error fetching referral tracking:', err);
    return NextResponse.json({ error: err.message || 'Failed to fetch referrals' }, { status: 500 });
  }
});

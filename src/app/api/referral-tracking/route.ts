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
        sponsors:sponsor_id (id, name, code_prefix, commission_percentage, discount_percentage, status),
        promo_codes:referral_code_id (id, code, free_days, status),
        users:referred_user_id (id, email, name, subscription_tier, subscription_status, trial_status, trial_ends_at, plan_end_date, created_at)
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
      const { data: matchedUsers } = await supabaseAdmin
        .from('users')
        .select('id')
        .or(`email.ilike.%${search}%,name.ilike.%${search}%`);

      const userIds = (matchedUsers || []).map(u => u.id);
      if (userIds.length > 0) {
        query = query.in('referred_user_id', userIds);
      } else {
        query = query.in('referred_user_id', ['00000000-0000-0000-0000-000000000000']);
      }
    }

    const { data: referrals, count, error } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    // Build rich sponsor summary in parallel
    const [
      { data: sponsors },
      { data: allReferrals },
      { data: allSponsorUsers },
      { data: allPromoCodes }
    ] = await Promise.all([
      supabaseAdmin.from('sponsors').select('id, name, type, code_prefix, commission_percentage, discount_percentage, default_free_days, status').order('name'),
      supabaseAdmin.from('referral_tracking').select('sponsor_id, payment_status, commission_amount'),
      supabaseAdmin.from('users').select('referred_by_sponsor_id, subscription_status'),
      supabaseAdmin.from('promo_codes').select('id, sponsor_id, code, free_days, status')
    ]);

    const sponsorSummary = (sponsors || []).map((s: any) => {
      const sRefs = (allReferrals || []).filter(r => r.sponsor_id === s.id);
      const sUsers = (allSponsorUsers || []).filter(u => u.referred_by_sponsor_id === s.id);
      const sCodes = (allPromoCodes || []).filter(c => c.sponsor_id === s.id);

      const totalReferrals = sUsers.length || sRefs.length;
      const activeUsers = sUsers.filter(u => u.subscription_status === 'active' || u.subscription_status === 'trialing').length;
      const paidRefs = sRefs.filter(r => r.payment_status === 'paid').length;
      const unpaidRefs = sRefs.filter(r => r.payment_status === 'unpaid').length;
      const unpaidCommission = sRefs.filter(r => r.payment_status === 'unpaid').reduce((sum, r) => sum + (Number(r.commission_amount) || 0), 0);
      const paidCommission = sRefs.filter(r => r.payment_status === 'paid').reduce((sum, r) => sum + (Number(r.commission_amount) || 0), 0);

      return {
        ...s,
        codes: sCodes,
        primary_code: sCodes.find(c => c.code === s.code_prefix)?.code || s.code_prefix || sCodes[0]?.code || '—',
        totalReferrals,
        activeUsers,
        paidReferrals: paidRefs,
        unpaidReferrals: unpaidRefs,
        unpaidCommission: Number(unpaidCommission.toFixed(2)),
        paidCommission: Number(paidCommission.toFixed(2)),
        totalCommission: Number((unpaidCommission + paidCommission).toFixed(2))
      };
    });

    return NextResponse.json({
      referrals,
      sponsorSummary,
      allSponsors: sponsors || [],
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

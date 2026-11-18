import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/auth-helpers';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const GET = withAdminAuth(async (req: NextRequest) => {
  try {
    const searchParams = req.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';
    const planName = searchParams.get('plan') || '';
    const platform = searchParams.get('platform') || '';
    const cycle = searchParams.get('cycle') || '';

    const offset = (page - 1) * limit;

    let query = supabaseAdmin
      .from('user_subscriptions')
      .select('*, users:user_id(id, email, name, device_platform, trial_status, trial_ends_at), subscription_plans:plan_id(id, name, price_monthly, price_yearly)', { count: 'exact' });

    // 1. Filter by search (match email or name in users table)
    if (search) {
      const { data: matchedUsers } = await supabaseAdmin
        .from('users')
        .select('id')
        .or(`email.ilike.%${search}%,name.ilike.%${search}%`);

      const userIds = (matchedUsers || []).map(u => u.id);
      if (userIds.length > 0) {
        query = query.in('user_id', userIds);
      } else {
        query = query.in('user_id', ['00000000-0000-0000-0000-000000000000']);
      }
    }

    // 2. Filter by status
    if (status) {
      if (status === 'trialing') {
        query = query.or('status.eq.trialing,billing_mode.eq.trial');
      } else {
        query = query.eq('status', status);
      }
    }

    // 3. Filter by plan
    if (planName) {
      const p = planName.toLowerCase();
      if (p === 'pro_trial' || p === 'trial') {
        query = query.or('billing_mode.eq.trial,status.eq.trialing');
      } else if (p === 'pro' || p === 'pro_paid') {
        query = query.eq('plan_id', 'e203edfc-8109-4f44-af32-12b5723c1f15').neq('billing_mode', 'trial').neq('status', 'trialing');
      } else if (p === 'vip') {
        query = query.eq('plan_id', '7080e55e-0002-494b-ada6-763d74325040');
      }
    }

    // 4. Filter by platform
    if (platform) {
      if (platform === 'ios') {
        query = query.eq('billing_provider', 'apple');
      } else if (platform === 'android') {
        query = query.eq('billing_provider', 'google');
      } else if (platform === 'admin' || platform === 'web') {
        query = query.in('billing_provider', ['admin', 'manual']);
      } else {
        query = query.eq('billing_provider', platform);
      }
    }

    // 5. Filter by billing cycle
    if (cycle) {
      query = query.eq('billing_cycle', cycle);
    }

    const { data: subscriptions, count, error } = await query
      .order('updated_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    // Aggregate Subscription Stats
    const [
      { count: totalSubs },
      { count: activePaidPro },
      { count: activePaidVip },
      { count: activeTrials },
      { count: canceledSubs }
    ] = await Promise.all([
      supabaseAdmin.from('user_subscriptions').select('*', { count: 'exact', head: true }),
      supabaseAdmin.from('users').select('*', { count: 'exact', head: true }).eq('subscription_tier', 'pro').eq('subscription_status', 'active'),
      supabaseAdmin.from('users').select('*', { count: 'exact', head: true }).eq('subscription_tier', 'vip').eq('subscription_status', 'active'),
      supabaseAdmin.from('users').select('*', { count: 'exact', head: true }).or('trial_status.eq.active,subscription_status.eq.trialing'),
      supabaseAdmin.from('users').select('*', { count: 'exact', head: true }).eq('subscription_status', 'canceled')
    ]);

    const activePaid = (activePaidPro || 0) + (activePaidVip || 0);
    // Approximate MRR: Pro ($10.99) + VIP ($14.99)
    const estimatedMrr = ((activePaidPro || 0) * 10.99) + ((activePaidVip || 0) * 14.99);

    return NextResponse.json({
      subscriptions,
      stats: {
        total: totalSubs || 0,
        activePaid,
        activePaidPro: activePaidPro || 0,
        activePaidVip: activePaidVip || 0,
        activeTrials: activeTrials || 0,
        canceled: canceledSubs || 0,
        estimatedMrr: Number(estimatedMrr.toFixed(2))
      },
      pagination: {
        page,
        limit,
        total: count || 0,
        pages: Math.ceil((count || 0) / limit),
      }
    });

  } catch (err: any) {
    console.error('Error fetching subscriptions:', err);
    return NextResponse.json({ error: err.message || 'Failed to fetch subscriptions' }, { status: 500 });
  }
});

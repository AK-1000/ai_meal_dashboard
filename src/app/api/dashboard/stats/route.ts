import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/auth-helpers';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { startOfMonth, subDays, format } from 'date-fns';

export const GET = withAdminAuth(async (req: NextRequest) => {
  try {
    // 1. Total users count
    const { count: totalUsers, error: usersErr } = await supabaseAdmin
      .from('users')
      .select('*', { count: 'exact', head: true });

    if (usersErr) throw usersErr;

    // 2. Active subscribers (users table has subscription_status = 'active')
    const { count: activeSubs, error: subsErr } = await supabaseAdmin
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('subscription_status', 'active');

    if (subsErr) throw subsErr;

    // 3. Current month revenue (sum of payments where status = 'success' in current month)
    const firstOfCurrentMonth = startOfMonth(new Date()).toISOString();
    const { data: currentMonthPayments, error: paymentsErr } = await supabaseAdmin
      .from('payment_history')
      .select('amount')
      .eq('status', 'success')
      .gte('created_at', firstOfCurrentMonth);

    if (paymentsErr) throw paymentsErr;
    const currentMonthRevenue = currentMonthPayments?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;

    // 4. Platform Split (from users table device_platform)
    const { data: platformData, error: platformErr } = await supabaseAdmin
      .from('users')
      .select('device_platform');

    if (platformErr) throw platformErr;

    const platformCounts: Record<string, number> = { ios: 0, android: 0, other: 0 };
    platformData?.forEach(u => {
      const platform = (u.device_platform || 'other').toLowerCase();
      if (platform === 'ios') platformCounts.ios++;
      else if (platform === 'android') platformCounts.android++;
      else platformCounts.other++;
    });

    const platformSplit = [
      { name: 'iOS', value: platformCounts.ios },
      { name: 'Android', value: platformCounts.android },
      { name: 'Other', value: platformCounts.other },
    ];

    // 5. Subscription Tier Split
    const { data: tierData, error: tierErr } = await supabaseAdmin
      .from('users')
      .select('subscription_tier');

    if (tierErr) throw tierErr;

    const tierCounts: Record<string, number> = { free: 0, pro: 0, vip: 0 };
    tierData?.forEach(u => {
      const tier = (u.subscription_tier || 'free').toLowerCase();
      if (tier.includes('vip')) tierCounts.vip++;
      else if (tier.includes('pro')) tierCounts.pro++;
      else tierCounts.free++;
    });

    const tierSplit = [
      { name: 'Free', value: tierCounts.free },
      { name: 'Pro', value: tierCounts.pro },
      { name: 'VIP', value: tierCounts.vip },
    ];

    // 6. Growth over last 30 days
    const thirtyDaysAgo = subDays(new Date(), 30).toISOString();
    const { data: recentSignups, error: growthErr } = await supabaseAdmin
      .from('users')
      .select('created_at')
      .gte('created_at', thirtyDaysAgo)
      .order('created_at', { ascending: true });

    if (growthErr) throw growthErr;

    // Aggregate signups by day
    const signupTrendMap = new Map<string, number>();
    // Pre-populate last 30 days
    for (let i = 29; i >= 0; i--) {
      const dateStr = format(subDays(new Date(), i), 'yyyy-MM-dd');
      signupTrendMap.set(dateStr, 0);
    }

    recentSignups?.forEach(u => {
      if (u.created_at) {
        const dateStr = format(new Date(u.created_at), 'yyyy-MM-dd');
        if (signupTrendMap.has(dateStr)) {
          signupTrendMap.set(dateStr, signupTrendMap.get(dateStr)! + 1);
        }
      }
    });

    const signupTrend = Array.from(signupTrendMap.entries()).map(([date, count]) => ({
      date: format(new Date(date), 'MMM dd'),
      Signups: count
    }));

    // 7. Recent signups
    const { data: latestUsers } = await supabaseAdmin
      .from('users')
      .select('id, email, name, subscription_tier, created_at')
      .order('created_at', { ascending: false })
      .limit(5);

    // 8. Recent payments (using join)
    const { data: latestPayments } = await supabaseAdmin
      .from('payment_history')
      .select('id, amount, currency, status, platform, created_at, users (email)')
      .order('created_at', { ascending: false })
      .limit(5);

    return NextResponse.json({
      stats: {
        totalUsers: totalUsers || 0,
        activeSubs: activeSubs || 0,
        currentMonthRevenue,
      },
      charts: {
        platformSplit,
        tierSplit,
        signupTrend
      },
      recentActivity: {
        users: latestUsers || [],
        payments: latestPayments || []
      }
    });
  } catch (err: any) {
    console.error('Error fetching dashboard stats:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
});

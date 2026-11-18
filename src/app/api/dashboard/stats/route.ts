import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/auth-helpers';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { startOfMonth, subDays, format } from 'date-fns';

const isSandboxEmail = (email?: string | null) => {
  if (!email) return false;
  const e = email.toLowerCase().trim();
  return (
    e.includes('mindmatrix') ||
    e.includes('hero12') ||
    e.includes('71630545') ||
    e.includes('kassabb1996') || // ali.kassabb1996@gmail.com
    e.includes('kassab.ai') ||
    e.includes('elkhatib.work') ||
    e.includes('ttest.com') ||
    e.includes('testt.com') ||
    e.includes('@test.') ||
    e.includes('cloudtestlabaccounts') ||
    e.includes('aimeal.internal') ||
    e === 'trt@trt.com' ||
    e.startsWith('test')
  );
};

const PRODUCT_PRICES: Record<string, number> = {
  'com.aimeal.pro': 10.99,
  'com.aimeal.vip': 14.99,
  'com.aimeal.pro.monthly': 10.99,
  'com.aimeal.pro.yearly': 89.99,
  'com.aimeal.vip.monthly': 14.99,
  'com.aimeal.vip.yearly': 125.91,
};

const getAndroidPrice = (productId?: string | null, basePlanId?: string | null) => {
  if (basePlanId) {
    const b = basePlanId.toLowerCase();
    if (b.includes('vip') && (b.includes('year') || b.includes('annual'))) return 125.91;
    if (b.includes('vip')) return 14.99;
    if (b.includes('pro') && (b.includes('year') || b.includes('annual'))) return 89.99;
    if (b.includes('pro')) return 10.99;
  }
  if (productId && PRODUCT_PRICES[productId]) {
    return PRODUCT_PRICES[productId];
  }
  return 10.99;
};

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

    // 3. Current month revenue (sum of production payments in current month)
    const firstOfCurrentMonth = startOfMonth(new Date()).toISOString();
    
    // 3a. payment_history (iOS & Areeba Gateway)
    const { data: currentMonthPayments } = await supabaseAdmin
      .from('payment_history')
      .select('amount, status, areeba_transaction_id, users (email)')
      .eq('status', 'success')
      .gte('created_at', firstOfCurrentMonth);

    let currentMonthRevenue = 0;
    (currentMonthPayments || []).forEach((p: any) => {
      const email = p.users?.email || '';
      const isTest = isSandboxEmail(email) || p.areeba_transaction_id === '1';
      if (!isTest) {
        currentMonthRevenue += Number(p.amount) || 0;
      }
    });

    // 3b. store_purchases (Google Play Android IAP)
    const { data: currentMonthStorePurchases } = await supabaseAdmin
      .from('store_purchases')
      .select('product_id, base_plan_id, purchase_state, users (email)')
      .gte('created_at', firstOfCurrentMonth);

    (currentMonthStorePurchases || []).forEach((s: any) => {
      const email = s.users?.email || '';
      const state = String(s.purchase_state || '').toLowerCase();
      // 0 = purchased / active / expired
      const isSuccess = state === '0' || state === 'purchased' || state === 'expired' || state === 'active';
      if (isSuccess && !isSandboxEmail(email)) {
        currentMonthRevenue += getAndroidPrice(s.product_id, s.base_plan_id);
      }
    });

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

    // 5. Subscription Tier Split (Pro Trial vs Normal Pro vs VIP)
    const { data: tierData, error: tierErr } = await supabaseAdmin
      .from('users')
      .select('subscription_tier, subscription_status, trial_status');

    if (tierErr) throw tierErr;

    const tierCounts = { proTrial: 0, proPaid: 0, vip: 0 };
    tierData?.forEach(u => {
      const tier = (u.subscription_tier || 'pro').toLowerCase();
      if (tier.includes('vip')) {
        tierCounts.vip++;
      } else {
        const isTrial = 
          u.trial_status === 'active' || 
          u.trial_status === 'expired' || 
          u.subscription_status === 'trialing' || 
          (u.subscription_status === 'expired' && u.trial_status !== 'converted');
        
        if (isTrial && u.subscription_status !== 'active') {
          tierCounts.proTrial++;
        } else if (u.subscription_status === 'active' && u.trial_status === 'active') {
          tierCounts.proTrial++;
        } else {
          tierCounts.proPaid++;
        }
      }
    });

    const tierSplit = [
      { name: 'Pro Trial', value: tierCounts.proTrial },
      { name: 'Pro (Paid)', value: tierCounts.proPaid },
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
      .select('id, email, name, subscription_tier, subscription_status, trial_status, created_at')
      .order('created_at', { ascending: false })
      .limit(5);

    // 8. Recent payments (unified payment_history + store_purchases)
    const { data: phRecent } = await supabaseAdmin
      .from('payment_history')
      .select('id, amount, currency, status, platform, created_at, users (email)')
      .order('created_at', { ascending: false })
      .limit(5);

    const { data: spRecent } = await supabaseAdmin
      .from('store_purchases')
      .select('id, product_id, base_plan_id, purchase_state, created_at, users (email)')
      .order('created_at', { ascending: false })
      .limit(5);

    const normalizedPhRecent = (phRecent || []).map((p: any) => ({
      id: p.id,
      amount: Number(p.amount) || 0,
      currency: p.currency || 'USD',
      status: p.status || 'success',
      platform: p.platform || 'ios',
      created_at: p.created_at,
      users: p.users,
    }));

    const normalizedSpRecent = (spRecent || []).map((s: any) => ({
      id: s.id,
      amount: getAndroidPrice(s.product_id, s.base_plan_id),
      currency: 'USD',
      status: (String(s.purchase_state) === '0' || s.purchase_state === 'expired') ? 'success' : 'completed',
      platform: 'google_play',
      created_at: s.created_at,
      users: s.users,
    }));

    const combinedRecentPayments = [...normalizedPhRecent, ...normalizedSpRecent]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 5);

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
        payments: combinedRecentPayments
      }
    });
  } catch (err: any) {
    console.error('Error fetching dashboard stats:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
});

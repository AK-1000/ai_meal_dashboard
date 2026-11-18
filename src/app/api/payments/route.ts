import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/auth-helpers';
import { supabaseAdmin } from '@/lib/supabase-admin';

// Test / Sandbox email patterns specified by the admin
export const isSandboxEmail = (email?: string | null): boolean => {
  if (!email) return false;
  const e = email.toLowerCase().trim();
  return (
    e.includes('mindmatrix') ||
    e.includes('hero12') || // covers ali.hero12.ak, ali.hero12.k, ali.hero12.ak+1
    e.includes('71630545') || // covers 71630545@students.liu.edu.lb
    e.includes('kassabb1996') || // ali.kassabb1996@gmail.com
    e.includes('kassab.ai') || // ali.kassab.ai@gmail.com
    e.includes('elkhatib.work') || // ali.elkhatib.work@gmail.com
    e.includes('ttest.com') ||
    e.includes('testt.com') ||
    e.includes('@test.') ||
    e.includes('cloudtestlabaccounts') ||
    e.includes('aimeal.internal') ||
    e === 'trt@trt.com' ||
    e.startsWith('test')
  );
};

export const GET = withAdminAuth(async (req: NextRequest) => {
  try {
    const searchParams = req.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = (searchParams.get('search') || '').trim();
    let status = (searchParams.get('status') || '').trim().toLowerCase();
    const platform = (searchParams.get('platform') || '').trim().toLowerCase();
    const startDate = searchParams.get('startDate') || '';
    const endDate = searchParams.get('endDate') || '';
    const envFilter = searchParams.get('envFilter') || 'production'; // 'production' | 'sandbox' | 'all'

    if (status === 'success') {
      status = 'succeeded';
    }

    // 1. Fetch Subscription Plans for Android price mapping
    const { data: plans } = await supabaseAdmin
      .from('subscription_plans')
      .select('id, name, price_monthly, price_yearly, price_monthly_total, price_yearly_total');

    const getAndroidPrice = (productId?: string | null, basePlanId?: string | null): number => {
      const isYearly = (basePlanId || '').toLowerCase().includes('yearly');
      const isVip = (productId || '').toLowerCase().includes('vip');
      const plan = plans?.find(p => p.name?.toLowerCase() === (isVip ? 'vip' : 'pro'));
      if (plan) {
        return isYearly 
          ? (Number(plan.price_yearly_total || plan.price_yearly) || (isVip ? 125.91 : 89.99))
          : (Number(plan.price_monthly_total || plan.price_monthly) || (isVip ? 14.99 : 10.99));
      }
      return isVip ? (isYearly ? 125.91 : 14.99) : (isYearly ? 89.99 : 10.99);
    };

    // 2. Fetch from payment_history (iOS StoreKit & Areeba Gateway)
    let phList: any[] = [];
    if (platform !== 'android_google_play' && platform !== 'google_play') {
      let phQuery = supabaseAdmin
        .from('payment_history')
        .select('*, users(id, email, name, avatar_url), promo_codes(code)');

      if (startDate) {
        phQuery = phQuery.gte('created_at', `${startDate}T00:00:00.000Z`);
      }
      if (endDate) {
        phQuery = phQuery.lte('created_at', `${endDate}T23:59:59.999Z`);
      }
      if (platform === 'ios') {
        phQuery = phQuery.eq('platform', 'ios');
      } else if (platform === 'areeba') {
        phQuery = phQuery.or('platform.eq.android,platform.eq.web,areeba_merchant_reference.not.is.null');
      }

      const { data, error } = await phQuery.order('created_at', { ascending: false });
      if (error) {
        console.error('Error fetching payment_history:', error);
      } else {
        phList = data || [];
      }
    }

    // 3. Fetch from store_purchases (Google Play Android IAP)
    let spList: any[] = [];
    if (platform !== 'ios' && platform !== 'areeba') {
      let spQuery = supabaseAdmin
        .from('store_purchases')
        .select('*, users(id, email, name, avatar_url)');

      if (startDate) {
        spQuery = spQuery.gte('created_at', `${startDate}T00:00:00.000Z`);
      }
      if (endDate) {
        spQuery = spQuery.lte('created_at', `${endDate}T23:59:59.999Z`);
      }

      const { data, error } = await spQuery.order('created_at', { ascending: false });
      if (error) {
        console.error('Error fetching store_purchases:', error);
      } else {
        spList = data || [];
      }
    }

    // 4. Normalize & Unify Records
    const normalizedPH = phList.map(p => {
      const email = p.users?.email || '';
      const isSandbox = isSandboxEmail(email) 
        || p.environment === 'sandbox' 
        || p.environment === 'test' 
        || p.areeba_transaction_id === '1' 
        || p.metadata?.environment === 'sandbox' 
        || p.metadata?.is_sandbox === true 
        || p.metadata?.test === true;
      let displayPlatform = p.platform || 'direct';
      if (p.platform === 'android' && (p.areeba_merchant_reference || p.areeba_order_id)) {
        displayPlatform = 'areeba';
      } else if (p.platform === 'ios') {
        displayPlatform = 'ios';
      }

      return {
        id: p.id,
        user_id: p.user_id,
        amount: Number(p.amount) || 0,
        currency: p.currency || 'USD',
        status: (p.status || 'pending').toLowerCase(),
        created_at: p.created_at,
        platform: displayPlatform,
        apple_transaction_id: p.apple_transaction_id || null,
        apple_original_transaction_id: p.apple_original_transaction_id || null,
        areeba_order_id: p.areeba_order_id || null,
        areeba_merchant_reference: p.areeba_merchant_reference || null,
        order_id: p.apple_transaction_id || p.areeba_order_id || p.areeba_merchant_reference || null,
        discount_amount: Number(p.discount_amount) || 0,
        discount_percentage: p.discount_percentage || null,
        promo_codes: p.promo_codes || null,
        metadata: p.metadata || {},
        users: p.users || null,
        is_sandbox: isSandbox,
        source_table: 'payment_history',
      };
    });

    const normalizedSP = spList.map(s => {
      const email = s.users?.email || '';
      const isSandbox = isSandboxEmail(email) 
        || s.environment === 'sandbox' 
        || s.environment === 'test' 
        || s.purchase_state === 'test' 
        || s.safe_metadata?.is_sandbox === true;
      const amount = getAndroidPrice(s.product_id, s.base_plan_id);

      let mappedStatus = 'succeeded';
      if (s.purchase_state === 'expired') {
        mappedStatus = 'succeeded'; // expired was a fully completed/paid cycle
      } else if (s.purchase_state === 'canceled' || s.purchase_state === 'revoked') {
        mappedStatus = 'refunded';
      } else if (s.purchase_state === 'pending') {
        mappedStatus = 'pending';
      } else if (s.purchase_state === 'purchased' || s.purchase_state === 'active') {
        mappedStatus = 'succeeded';
      }

      return {
        id: s.id,
        user_id: s.user_id,
        amount,
        currency: 'USD',
        status: mappedStatus,
        raw_purchase_state: s.purchase_state,
        created_at: s.created_at,
        platform: 'android_google_play',
        apple_transaction_id: null,
        apple_original_transaction_id: null,
        areeba_order_id: null,
        areeba_merchant_reference: null,
        order_id: s.order_id || null,
        product_id: s.product_id || null,
        base_plan_id: s.base_plan_id || null,
        discount_amount: 0,
        discount_percentage: null,
        promo_codes: null,
        metadata: s.safe_metadata || {},
        users: s.users || null,
        is_sandbox: isSandbox,
        source_table: 'store_purchases',
      };
    });

    // Merge and sort all transactions newest first
    const allTransactions = [...normalizedPH, ...normalizedSP].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    // 5. Compute Stats per Scope (Production, Sandbox, Combined)
    let prodRev = 0, prodSucc = 0, prodPending = 0, prodFailed = 0, prodRef = 0, prodTotal = 0;
    let sandRev = 0, sandSucc = 0, sandPending = 0, sandFailed = 0, sandRef = 0, sandTotal = 0;

    allTransactions.forEach(p => {
      const isSucc = p.status === 'succeeded' || p.status === 'success';

      if (p.is_sandbox) {
        sandTotal++;
        if (isSucc) {
          sandSucc++;
          sandRev += p.amount;
        } else if (p.status === 'pending') {
          sandPending++;
        } else if (p.status === 'failed') {
          sandFailed++;
        } else if (p.status === 'refunded' || p.status === 'canceled') {
          sandRef++;
        }
      } else {
        prodTotal++;
        if (isSucc) {
          prodSucc++;
          prodRev += p.amount;
        } else if (p.status === 'pending') {
          prodPending++;
        } else if (p.status === 'failed') {
          prodFailed++;
        } else if (p.status === 'refunded' || p.status === 'canceled') {
          prodRef++;
        }
      }
    });

    // Dynamic stats matching the current envFilter
    let currentRevenue = prodRev;
    let currentTotalCount = prodTotal;
    let currentSucceededCount = prodSucc;
    let currentPendingCount = prodPending;
    let currentFailedCount = prodFailed;
    let currentRefundedCount = prodRef;

    if (envFilter === 'sandbox') {
      currentRevenue = sandRev;
      currentTotalCount = sandTotal;
      currentSucceededCount = sandSucc;
      currentPendingCount = sandPending;
      currentFailedCount = sandFailed;
      currentRefundedCount = sandRef;
    } else if (envFilter === 'all') {
      currentRevenue = prodRev + sandRev;
      currentTotalCount = prodTotal + sandTotal;
      currentSucceededCount = prodSucc + sandSucc;
      currentPendingCount = prodPending + sandPending;
      currentFailedCount = prodFailed + sandFailed;
      currentRefundedCount = prodRef + sandRef;
    }

    // 6. Apply In-Memory Filters to the payments list
    let filtered = allTransactions;

    if (envFilter === 'production') {
      filtered = filtered.filter(p => !p.is_sandbox);
    } else if (envFilter === 'sandbox') {
      filtered = filtered.filter(p => p.is_sandbox);
    } // if 'all', keep both

    // Filter by status tab
    if (status) {
      if (status === 'succeeded') {
        filtered = filtered.filter(p => p.status === 'succeeded' || p.status === 'success');
      } else if (status === 'pending') {
        filtered = filtered.filter(p => p.status === 'pending');
      } else if (status === 'failed') {
        filtered = filtered.filter(p => p.status === 'failed');
      } else if (status === 'refunded') {
        filtered = filtered.filter(p => p.status === 'refunded' || p.status === 'canceled');
      } else {
        filtered = filtered.filter(p => p.status === status);
      }
    }

    // Filter by platform
    if (platform) {
      if (platform === 'ios') {
        filtered = filtered.filter(p => p.platform === 'ios');
      } else if (platform === 'android_google_play' || platform === 'google_play') {
        filtered = filtered.filter(p => p.platform === 'android_google_play');
      } else if (platform === 'areeba') {
        filtered = filtered.filter(p => p.platform === 'areeba');
      }
    }

    // Filter by search keyword
    if (search) {
      const q = search.toLowerCase();
      filtered = filtered.filter(p => {
        const email = p.users?.email?.toLowerCase() || '';
        const name = p.users?.name?.toLowerCase() || '';
        const txId = (p.id || '').toLowerCase();
        const appleId = (p.apple_transaction_id || '').toLowerCase();
        const areebaId = (p.areeba_order_id || '').toLowerCase();
        const areebaRef = (p.areeba_merchant_reference || '').toLowerCase();
        const orderId = (p.order_id || '').toLowerCase();

        return (
          email.includes(q) ||
          name.includes(q) ||
          txId.includes(q) ||
          appleId.includes(q) ||
          areebaId.includes(q) ||
          areebaRef.includes(q) ||
          orderId.includes(q)
        );
      });
    }

    // 7. Paginate
    const totalFiltered = filtered.length;
    const offset = (page - 1) * limit;
    const paginated = filtered.slice(offset, offset + limit);

    return NextResponse.json({
      payments: paginated,
      stats: {
        totalRevenue: Number(currentRevenue.toFixed(2)),
        totalCount: currentTotalCount,
        succeededCount: currentSucceededCount,
        pendingCount: currentPendingCount,
        failedCount: currentFailedCount,
        refundedCount: currentRefundedCount,
        // Detailed breakdown
        productionRevenue: Number(prodRev.toFixed(2)),
        productionCount: prodTotal,
        productionSucceededCount: prodSucc,
        sandboxRevenue: Number(sandRev.toFixed(2)),
        sandboxCount: sandTotal,
        sandboxSucceededCount: sandSucc,
        combinedRevenue: Number((prodRev + sandRev).toFixed(2)),
        combinedCount: prodTotal + sandTotal,
      },
      pagination: {
        page,
        limit,
        total: totalFiltered,
        pages: Math.ceil(totalFiltered / limit) || 1,
      }
    });
  } catch (err: any) {
    console.error('Error fetching payments:', err);
    return NextResponse.json({ error: err.message || 'Failed to fetch payments' }, { status: 500 });
  }
});

import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth, logAdminAction } from '@/lib/auth-helpers';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const GET = withAdminAuth(async (req: NextRequest, admin) => {
  try {
    const userId = req.nextUrl.pathname.split('/').slice(-1)[0];
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // 1. Fetch user profile
    const { data: user, error: userErr } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (userErr || !user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // 2. Fetch user's subscriptions
    const { data: subscriptions } = await supabaseAdmin
      .from('user_subscriptions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    // 3. Fetch user's payments (unified payment_history + store_purchases)
    const { data: payments } = await supabaseAdmin
      .from('payment_history')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    const { data: storePurchases } = await supabaseAdmin
      .from('store_purchases')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    const PRODUCT_PRICES: Record<string, number> = {
      'com.aimeal.pro': 10.99,
      'com.aimeal.vip': 14.99,
      'com.aimeal.pro.monthly': 10.99,
      'com.aimeal.pro.yearly': 89.99,
      'com.aimeal.vip.monthly': 14.99,
      'com.aimeal.vip.yearly': 125.91,
    };

    const normalizedPh = (payments || []).map((p: any) => ({
      id: p.id,
      amount: Number(p.amount) || 0,
      currency: p.currency || 'USD',
      status: p.status || 'success',
      platform: p.platform || 'ios',
      created_at: p.created_at,
      areeba_transaction_id: p.areeba_transaction_id || p.areeba_order_id,
      apple_transaction_id: p.apple_transaction_id,
    }));

    const normalizedSp = (storePurchases || []).map((s: any) => ({
      id: s.id,
      amount: PRODUCT_PRICES[s.product_id] || 10.99,
      currency: 'USD',
      status: (String(s.purchase_state) === '0' || s.purchase_state === 'expired') ? 'success' : 'completed',
      platform: 'google_play',
      created_at: s.created_at,
      areeba_transaction_id: null,
      apple_transaction_id: s.order_id || s.purchase_token,
    }));

    const combinedPayments = [...normalizedPh, ...normalizedSp].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    // 4. Fetch admin audit logs for this user
    const { data: auditLogs } = await supabaseAdmin
      .from('admin_audit_log')
      .select('*')
      .eq('entity_id', userId)
      .order('created_at', { ascending: false });

    // 5. Fetch logs for this user
    const { data: appLogs } = await supabaseAdmin
      .from('app_logs')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50);

    // 6. Fetch user daily progress (water, weight logs)
    const { data: waterLogs } = await supabaseAdmin
      .from('water_logs')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(30);

    const { data: weightLogs } = await supabaseAdmin
      .from('weight_logs')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(30);

    return NextResponse.json({
      user,
      subscriptions: subscriptions || [],
      payments: combinedPayments,
      auditLogs: auditLogs || [],
      appLogs: appLogs || [],
      healthLogs: {
        waterLogs: waterLogs || [],
        weightLogs: weightLogs || [],
      }
    });
  } catch (err: any) {
    console.error('Error fetching user details:', err);
    return NextResponse.json({ error: err.message || 'Failed to fetch user details' }, { status: 500 });
  }
});

export const PATCH = withAdminAuth(async (req: NextRequest, admin) => {
  try {
    const userId = req.nextUrl.pathname.split('/').slice(-1)[0];
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const body = await req.json();
    
    // Fetch user before edit to log changes
    const { data: oldUser } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    const { data: newUser, error } = await supabaseAdmin
      .from('users')
      .update(body)
      .eq('id', userId)
      .select()
      .single();

    if (error) throw error;

    // Keep user_subscriptions in sync if subscription details were modified
    if (body.subscription_tier || body.subscription_status || body.plan_end_date) {
      const PRO_PLAN_ID = 'e203edfc-8109-4f44-af32-12b5723c1f15';
      const VIP_PLAN_ID = '7080e55e-0002-494b-ada6-763d74325040';
      const targetPlanId = body.subscription_tier === 'vip' ? VIP_PLAN_ID : PRO_PLAN_ID;
      
      const subUpdate: any = {
        plan_id: targetPlanId,
        status: body.subscription_status || 'active',
        billing_provider: 'admin',
        billing_mode: 'complimentary',
        updated_at: new Date().toISOString()
      };
      if (body.plan_end_date) {
        subUpdate.current_period_end = new Date(body.plan_end_date).toISOString();
      }

      if (newUser.current_subscription_id) {
        await supabaseAdmin
          .from('user_subscriptions')
          .update(subUpdate)
          .eq('id', newUser.current_subscription_id);
      }
    }

    // Log the admin action
    await logAdminAction(
      admin.id,
      'user.update',
      'user',
      userId,
      { before: oldUser, after: newUser },
      req
    );

    return NextResponse.json({ user: newUser });
  } catch (err: any) {
    console.error('Error updating user:', err);
    return NextResponse.json({ error: err.message || 'Failed to update user' }, { status: 500 });
  }
});

export const DELETE = withAdminAuth(async (req: NextRequest, admin) => {
  try {
    const userId = req.nextUrl.pathname.split('/').slice(-1)[0];
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Get user details first
    const { data: user } = await supabaseAdmin
      .from('users')
      .select('email')
      .eq('id', userId)
      .single();

    // 1. Delete auth user
    const { error: authErr } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (authErr) {
      console.warn('Auth user delete warning (might already be deleted):', authErr.message);
    }

    // 2. Delete public.users user profile
    const { error: dbErr } = await supabaseAdmin
      .from('users')
      .delete()
      .eq('id', userId);

    if (dbErr) throw dbErr;

    // Log admin action
    await logAdminAction(
      admin.id,
      'user.delete',
      'user',
      userId,
      { email: user?.email || '' },
      req
    );

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Error deleting user:', err);
    return NextResponse.json({ error: err.message || 'Failed to delete user' }, { status: 500 });
  }
});

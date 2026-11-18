import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth, logAdminAction } from '@/lib/auth-helpers';
import { supabaseAdmin } from '@/lib/supabase-admin';

const PRO_PLAN_ID = 'e203edfc-8109-4f44-af32-12b5723c1f15';
const VIP_PLAN_ID = '7080e55e-0002-494b-ada6-763d74325040';
const FREE_PLAN_ID = '00000000-0000-0000-0000-000000000001';

export const GET = withAdminAuth(async (req: NextRequest) => {
  try {
    const urlParts = req.nextUrl.pathname.split('/');
    const userId = urlParts[urlParts.indexOf('users') + 1];

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // 1. Fetch user profile
    const { data: user, error: userErr } = await supabaseAdmin
      .from('users')
      .select('id, email, name, subscription_tier, subscription_status, billing_cycle, plan_end_date, trial_status, trial_provider, trial_started_at, trial_ends_at, trial_verified_at, current_subscription_id, device_platform')
      .eq('id', userId)
      .single();

    if (userErr || !user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // 2. Fetch user's subscription records
    const { data: subscriptions } = await supabaseAdmin
      .from('user_subscriptions')
      .select('*, subscription_plans(name, price_monthly, price_yearly)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    // 3. Fetch active plans list
    const { data: plans } = await supabaseAdmin
      .from('subscription_plans')
      .select('*')
      .order('rank', { ascending: true });

    return NextResponse.json({
      user,
      subscriptions: subscriptions || [],
      plans: plans || [],
    });
  } catch (err: any) {
    console.error('Error fetching subscription details:', err);
    return NextResponse.json({ error: err.message || 'Failed to fetch subscription' }, { status: 500 });
  }
});

export const PATCH = withAdminAuth(async (req: NextRequest, admin) => {
  try {
    const urlParts = req.nextUrl.pathname.split('/');
    const userId = urlParts[urlParts.indexOf('users') + 1];

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const body = await req.json();
    const { 
      action, // 'grant_trial' | 'extend_trial' | 'change_tier' | 'convert_to_paid' | 'cancel'
      trialDays, 
      trialEndDate,
      tier, // 'free' | 'pro' | 'vip'
      billingCycle, // 'monthly' | 'yearly'
      planEndDate,
      status // 'active' | 'trialing' | 'canceled' | 'expired'
    } = body;

    // Fetch existing user
    const { data: user, error: fetchErr } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (fetchErr || !user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const now = new Date();
    const userUpdates: any = { updated_at: now.toISOString() };
    const subUpdates: any = { updated_at: now.toISOString() };

    let resolvedPlanId = PRO_PLAN_ID;

    if (action === 'grant_trial' || action === 'extend_trial') {
      const days = Number(trialDays) || 7;
      let newEnd: Date;

      if (trialEndDate) {
        newEnd = new Date(trialEndDate);
      } else if (action === 'extend_trial' && user.trial_ends_at && new Date(user.trial_ends_at) > now) {
        newEnd = new Date(new Date(user.trial_ends_at).getTime() + days * 24 * 60 * 60 * 1000);
      } else {
        newEnd = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
      }

      userUpdates.subscription_tier = 'pro';
      userUpdates.subscription_status = 'trialing';
      userUpdates.trial_status = 'active';
      userUpdates.trial_provider = 'admin';
      userUpdates.trial_started_at = user.trial_started_at || now.toISOString();
      userUpdates.trial_ends_at = newEnd.toISOString();
      userUpdates.trial_verified_at = user.trial_verified_at || now.toISOString();
      userUpdates.plan_end_date = newEnd.toISOString();
      userUpdates.billing_cycle = billingCycle || user.billing_cycle || 'monthly';

      resolvedPlanId = PRO_PLAN_ID;
      subUpdates.plan_id = PRO_PLAN_ID;
      subUpdates.status = 'trialing';
      subUpdates.billing_mode = 'trial';
      subUpdates.billing_provider = 'admin';
      subUpdates.billing_cycle = userUpdates.billing_cycle;
      subUpdates.current_period_start = userUpdates.trial_started_at;
      subUpdates.current_period_end = newEnd.toISOString();
      subUpdates.cancel_at_period_end = false;

    } else if (action === 'convert_to_paid') {
      const targetTier = tier === 'vip' ? 'vip' : 'pro';
      const targetPlanId = targetTier === 'vip' ? VIP_PLAN_ID : PRO_PLAN_ID;
      const cycle = billingCycle || 'monthly';
      const end = planEndDate 
        ? new Date(planEndDate) 
        : (cycle === 'yearly' ? new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000) : new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000));

      userUpdates.subscription_tier = targetTier;
      userUpdates.subscription_status = 'active';
      userUpdates.trial_status = 'converted';
      userUpdates.plan_end_date = end.toISOString();
      userUpdates.billing_cycle = cycle;

      resolvedPlanId = targetPlanId;
      subUpdates.plan_id = targetPlanId;
      subUpdates.status = 'active';
      subUpdates.billing_mode = 'recurring';
      subUpdates.billing_provider = 'admin';
      subUpdates.billing_cycle = cycle;
      subUpdates.current_period_start = now.toISOString();
      subUpdates.current_period_end = end.toISOString();
      subUpdates.cancel_at_period_end = false;

    } else if (action === 'change_tier') {
      const targetTier = tier === 'vip' ? 'vip' : 'pro';
      const targetPlanId = targetTier === 'vip' ? VIP_PLAN_ID : PRO_PLAN_ID;
      const cycle = billingCycle || user.billing_cycle || 'monthly';
      const end = planEndDate 
        ? new Date(planEndDate) 
        : (cycle === 'yearly' ? new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000) : new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000));

      userUpdates.subscription_tier = targetTier;
      userUpdates.subscription_status = status || 'active';
      userUpdates.plan_end_date = end.toISOString();
      userUpdates.billing_cycle = cycle;

      resolvedPlanId = targetPlanId;
      subUpdates.plan_id = targetPlanId;
      subUpdates.status = status || 'active';
      subUpdates.billing_mode = 'recurring';
      subUpdates.billing_provider = 'admin';
      subUpdates.billing_cycle = cycle;
      subUpdates.current_period_start = now.toISOString();
      subUpdates.current_period_end = end.toISOString();

    } else if (action === 'cancel') {
      userUpdates.subscription_status = 'canceled';
      userUpdates.trial_status = user.trial_status === 'active' ? 'expired' : user.trial_status;

      subUpdates.status = 'canceled';
      subUpdates.cancel_at_period_end = true;
      subUpdates.canceled_at = now.toISOString();
      subUpdates.cancellation_reason = 'Cancelled by administrator in dashboard';
    }

    // 1. Update public.users
    const { data: updatedUser, error: updateErr } = await supabaseAdmin
      .from('users')
      .update(userUpdates)
      .eq('id', userId)
      .select()
      .single();

    if (updateErr) throw updateErr;

    // 2. Synchronize user_subscriptions table
    if (user.current_subscription_id) {
      await supabaseAdmin
        .from('user_subscriptions')
        .update(subUpdates)
        .eq('id', user.current_subscription_id);
    } else {
      const { data: newSub } = await supabaseAdmin
        .from('user_subscriptions')
        .insert({
          user_id: userId,
          plan_id: resolvedPlanId,
          ...subUpdates,
          created_at: now.toISOString(),
        })
        .select('id')
        .maybeSingle();

      if (newSub?.id) {
        await supabaseAdmin
          .from('users')
          .update({ current_subscription_id: newSub.id })
          .eq('id', userId);
      }
    }

    // 3. Admin Audit Log
    await logAdminAction(
      admin.id,
      'user_subscription.modify',
      'user_subscription',
      userId,
      { action, updates: userUpdates, admin_email: admin.email },
      req
    );

    return NextResponse.json({
      success: true,
      user: updatedUser
    });

  } catch (err: any) {
    console.error('Error updating subscription:', err);
    return NextResponse.json({ error: err.message || 'Failed to update subscription' }, { status: 500 });
  }
}, ['super_admin', 'content_manager']);

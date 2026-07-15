import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth, logAdminAction } from '@/lib/auth-helpers';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const GET = withAdminAuth(async (req: NextRequest) => {
  try {
    const searchParams = req.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const tier = searchParams.get('tier') || '';
    const status = searchParams.get('status') || '';

    const offset = (page - 1) * limit;

    let query = supabaseAdmin
      .from('users')
      .select('*', { count: 'exact' });

    if (search) {
      query = query.or(`email.ilike.%${search}%,name.ilike.%${search}%`);
    }

    if (tier) {
      query = query.eq('subscription_tier', tier);
    }

    if (status) {
      query = query.eq('subscription_status', status);
    }

    const { data: users, count, error } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    return NextResponse.json({
      users,
      pagination: {
        page,
        limit,
        total: count || 0,
        pages: Math.ceil((count || 0) / limit),
      }
    });
  } catch (err: any) {
    console.error('Error fetching users:', err);
    return NextResponse.json({ error: err.message || 'Failed to fetch users' }, { status: 500 });
  }
});

export const POST = withAdminAuth(async (req: NextRequest, admin) => {
  try {
    const { name, email, password, phone, planId, planStartDate, planEndDate, billingCycle } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    // Create user in Supabase Auth using Admin API
    const { data: userData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name, phone_number: phone }
    });

    if (createError || !userData.user) {
      throw createError || new Error('Failed to create user in Auth');
    }

    // Since the database trigger on_auth_user_created automatically creates a profile and a subscription row,
    // we fetch the generated current_subscription_id and update it.
    const { data: userProfile, error: profileFetchError } = await supabaseAdmin
      .from('users')
      .select('current_subscription_id')
      .eq('id', userData.user.id)
      .single();

    if (profileFetchError) {
      console.error('Error fetching user profile after creation:', profileFetchError);
    }

    const currentSubId = userProfile?.current_subscription_id;

    // Map plan ID to tier name
    let tier = 'free';
    let status = 'free';
    if (planId === 'e203edfc-8109-4f44-af32-12b5723c1f15') {
      tier = 'pro';
      status = 'active';
    } else if (planId === '7080e55e-0002-494b-ada6-763d74325040') {
      tier = 'vip';
      status = 'active';
    }

    // Determine trial end date for free plan, and normal end date / billing cycle for paid plans
    let calculatedEndDate = planEndDate;
    let actualBillingCycle = billingCycle;

    if (planId === '00000000-0000-0000-0000-000000000001') {
      // Free plan defaults to 14 days trial
      const start = planStartDate ? new Date(planStartDate) : new Date();
      const end = new Date(start.getTime() + 14 * 24 * 60 * 60 * 1000);
      calculatedEndDate = end.toISOString().split('T')[0];
      actualBillingCycle = null;
    }

    // Update the subscription row if it exists
    if (currentSubId) {
      const subUpdate: any = {
        plan_id: planId,
        status: 'active',
        billing_cycle: actualBillingCycle,
        updated_at: new Date().toISOString()
      };
      
      if (planStartDate) {
        subUpdate.created_at = new Date(planStartDate).toISOString();
        subUpdate.current_period_start = new Date(planStartDate).toISOString();
      }
      if (calculatedEndDate) {
        subUpdate.current_period_end = new Date(calculatedEndDate).toISOString();
      } else {
        subUpdate.current_period_end = null;
      }

      const { error: subUpdateError } = await supabaseAdmin
        .from('user_subscriptions')
        .update(subUpdate)
        .eq('id', currentSubId);

      if (subUpdateError) {
        console.error('Error updating user subscription:', subUpdateError);
      }
    }

    // Update the user profile with phone and plan details
    const userUpdate: any = {
      phone_number: phone || null,
      subscription_tier: tier,
      subscription_status: status,
      billing_cycle: actualBillingCycle,
      plan_end_date: calculatedEndDate ? new Date(calculatedEndDate).toISOString() : null,
      updated_at: new Date().toISOString()
    };

    if (phone) {
      userUpdate.phone_verified = true;
      userUpdate.phone_verified_at = new Date().toISOString();
    }

    const { error: userUpdateError } = await supabaseAdmin
      .from('users')
      .update(userUpdate)
      .eq('id', userData.user.id);

    if (userUpdateError) {
      console.error('Error updating user profile:', userUpdateError);
    }

    // Log the action in admin_audit_log
    await logAdminAction(
      admin.id,
      'user.create',
      'user',
      userData.user.id,
      { email, name, phone, subscription_tier: tier },
      req
    );

    return NextResponse.json({
      success: true,
      user: {
        id: userData.user.id,
        email: userData.user.email,
        name: userData.user.user_metadata?.name || name
      }
    });
  } catch (err: any) {
    console.error('Error creating user:', err);
    return NextResponse.json({ error: err.message || 'Failed to create user' }, { status: 500 });
  }
}, ['super_admin', 'content_manager']);


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
      .select('*, sponsors:referred_by_sponsor_id(name, code_prefix)', { count: 'exact' });

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
    const { name, email, password, phone, planId, planStartDate, planEndDate, billingCycle, sponsorId } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    // Create user in Supabase Auth using Admin API (always email_confirm: true)
    const { data: userData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name, phone_number: phone }
    });

    if (createError || !userData.user) {
      throw createError || new Error('Failed to create user in Auth');
    }

    const { data: userProfile } = await supabaseAdmin
      .from('users')
      .select('current_subscription_id')
      .eq('id', userData.user.id)
      .single();

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

    let calculatedEndDate = planEndDate;
    let actualBillingCycle = billingCycle;

    if (planId === '00000000-0000-0000-0000-000000000001') {
      const start = planStartDate ? new Date(planStartDate) : new Date();
      const end = new Date(start.getTime() + 14 * 24 * 60 * 60 * 1000);
      calculatedEndDate = end.toISOString().split('T')[0];
      actualBillingCycle = null;
    }

    // Update subscription row if exists
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

      await supabaseAdmin
        .from('user_subscriptions')
        .update(subUpdate)
        .eq('id', currentSubId);
    }

    // Update user profile in public.users
    const userUpdate: any = {
      name: name || '',
      email_verified: true, // ALWAYS VERIFIED when created by admin
      subscription_tier: tier,
      subscription_status: status,
      billing_cycle: actualBillingCycle,
      plan_end_date: calculatedEndDate ? new Date(calculatedEndDate).toISOString() : null,
      updated_at: new Date().toISOString()
    };

    if (phone) {
      userUpdate.phone_number = phone;
      userUpdate.phone_verified = true;
      userUpdate.phone_verified_at = new Date().toISOString();
    }

    // Optional sponsor selection
    if (sponsorId) {
      userUpdate.referred_by_sponsor_id = sponsorId;
      userUpdate.referral_date = new Date().toISOString();

      const { data: promoCodeRow } = await supabaseAdmin
        .from('promo_codes')
        .select('id')
        .eq('sponsor_id', sponsorId)
        .limit(1)
        .maybeSingle();

      if (promoCodeRow) {
        userUpdate.first_promo_code_id = promoCodeRow.id;
      }

      // Record in referral_tracking table
      await supabaseAdmin.from('referral_tracking').insert({
        sponsor_id: sponsorId,
        referral_code_id: promoCodeRow?.id || null,
        referred_user_id: userData.user.id,
        referral_type: 'signup',
        payment_status: 'unpaid',
        commission_amount: 0,
        metadata: { created_by_admin: true, admin_id: admin.id, created_at: new Date().toISOString() },
      });
    }

    const { error: userUpdateError } = await supabaseAdmin
      .from('users')
      .update(userUpdate)
      .eq('id', userData.user.id);

    if (userUpdateError) {
      console.error('Error updating user profile:', userUpdateError);
    }

    await logAdminAction(
      admin.id,
      'user.create',
      'user',
      userData.user.id,
      { email, name, phone, subscription_tier: tier, sponsor_id: sponsorId || null },
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

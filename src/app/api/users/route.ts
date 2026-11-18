import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth, logAdminAction } from '@/lib/auth-helpers';
import { supabaseAdmin } from '@/lib/supabase-admin';
import nodemailer from 'nodemailer';

export const GET = withAdminAuth(async (req: NextRequest) => {
  try {
    const searchParams = req.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const tier = searchParams.get('tier') || '';
    const status = searchParams.get('status') || '';
    const tab = searchParams.get('tab') || 'all'; // 'all' | 'trial' | 'converted' | 'cancelled_trial' | 'paid'

    const offset = (page - 1) * limit;

    let query = supabaseAdmin
      .from('users')
      .select('*, sponsors:referred_by_sponsor_id(name, code_prefix)', { count: 'exact' });

    if (search) {
      query = query.or(`email.ilike.%${search}%,name.ilike.%${search}%`);
    }

    if (tier) {
      if (tier === 'pro_trial' || tier === 'trial') {
        // Pro Trial users (active or expired evaluation)
        query = query.eq('subscription_tier', 'pro')
          .or('trial_status.eq.active,trial_status.eq.expired,subscription_status.eq.trialing,subscription_status.eq.expired');
      } else if (tier === 'pro_paid' || tier === 'pro') {
        // Normal Paid Pro users
        query = query.eq('subscription_tier', 'pro')
          .eq('subscription_status', 'active')
          .neq('trial_status', 'active');
      } else if (tier === 'vip') {
        query = query.eq('subscription_tier', 'vip');
      } else if (tier === 'all_pro') {
        query = query.eq('subscription_tier', 'pro');
      }
    }

    if (status) {
      query = query.eq('subscription_status', status);
    }

    const nowIso = new Date().toISOString();

    // Apply funnel tab filters
    if (tab === 'trial') {
      query = query
        .or('trial_status.eq.active,subscription_status.eq.trialing')
        .gt('trial_ends_at', nowIso);
    } else if (tab === 'converted') {
      query = query
        .eq('subscription_status', 'active')
        .eq('trial_status', 'converted');
    } else if (tab === 'cancelled_trial') {
      query = query.neq('subscription_status', 'active');
    } else if (tab === 'paid') {
      query = query
        .eq('subscription_status', 'active')
        .not('trial_status', 'eq', 'active');
    }

    const [{ data: users, count, error }, funnelCounts] = await Promise.all([
      query
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1),
      (async () => {
        const [
          { count: totalCount },
          { count: trialCount },
          { count: convertedCount },
          { count: cancelledCount },
          { count: paidCount }
        ] = await Promise.all([
          supabaseAdmin.from('users').select('*', { count: 'exact', head: true }),
          supabaseAdmin.from('users').select('*', { count: 'exact', head: true })
            .or('trial_status.eq.active,subscription_status.eq.trialing')
            .gt('trial_ends_at', nowIso),
          supabaseAdmin.from('users').select('*', { count: 'exact', head: true })
            .eq('subscription_status', 'active')
            .eq('trial_status', 'converted'),
          supabaseAdmin.from('users').select('*', { count: 'exact', head: true })
            .neq('subscription_status', 'active'),
          supabaseAdmin.from('users').select('*', { count: 'exact', head: true })
            .eq('subscription_status', 'active')
            .not('trial_status', 'eq', 'active')
        ]);
        return {
          total: totalCount || 0,
          trial: trialCount || 0,
          converted: convertedCount || 0,
          cancelled: cancelledCount || 0,
          paid: paidCount || 0,
        };
      })()
    ]);

    if (error) throw error;

    const mappedUsers = (users || []).map((u: any) => {
      const isVip = u.subscription_tier?.toLowerCase() === 'vip';
      const isTrialActive = !isVip && (u.trial_status === 'active' || u.subscription_status === 'trialing') 
        && (!u.trial_ends_at || new Date(u.trial_ends_at).getTime() > Date.now());
      const isTrialExpired = !isVip && u.subscription_status !== 'active';
      const isTrial = isTrialActive || isTrialExpired;

      return {
        ...u,
        display_tier: isVip ? 'VIP' : isTrial ? 'PRO TRIAL' : 'PRO',
        is_pro_trial: isTrial,
      };
    });

    return NextResponse.json({
      users: mappedUsers,
      funnelCounts,
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
    const body = await req.json();
    const { 
      name, 
      email, 
      password, 
      phone, 
      country,
      accountType = 'pro_trial', // 'pro_trial' | 'paid' | 'free'
      trialDays = 7,
      trialStartDate,
      trialEndDate,
      planId, 
      planStartDate, 
      planEndDate, 
      billingCycle = 'monthly', 
      sponsorId,
      sendWelcomeEmail = true
    } = body;

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    // 1. Create user in Supabase Auth using Admin API (always email_confirm: true)
    const { data: userData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name: name || '', phone_number: phone || '', country: country || '' }
    });

    if (createError || !userData?.user) {
      throw createError || new Error('Failed to create user in Auth');
    }

    const userId = userData.user.id;

    // Give database trigger a moment to initialize user profile if needed
    let userProfile = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      const { data } = await supabaseAdmin
        .from('users')
        .select('id, current_subscription_id')
        .eq('id', userId)
        .maybeSingle();
      if (data) {
        userProfile = data;
        break;
      }
      await new Promise(r => setTimeout(r, 200));
    }

    const PRO_PLAN_ID = 'e203edfc-8109-4f44-af32-12b5723c1f15';
    const VIP_PLAN_ID = '7080e55e-0002-494b-ada6-763d74325040';
    const FREE_PLAN_ID = '00000000-0000-0000-0000-000000000001';

    // 2. Resolve Plan, Tier, and Trial status (No free users; default to Pro Trial)
    let effectiveTier = 'pro';
    let effectiveSubStatus = 'trialing';
    let effectiveBillingCycle: string | null = billingCycle || 'monthly';
    let effectivePlanId = PRO_PLAN_ID;
    let periodStart: string | null = null;
    let periodEnd: string | null = null;

    let trialStatus = 'active';
    let trialProvider: string | null = 'admin';
    let trialStartedAt: string | null = null;
    let trialEndsAt: string | null = null;
    let trialVerifiedAt: string | null = new Date().toISOString();

    const isPaidPlan = accountType === 'paid' || (!accountType && (planId === PRO_PLAN_ID || planId === VIP_PLAN_ID) && !trialDays);
    const isProTrial = !isPaidPlan;

    if (isPaidPlan) {
      effectivePlanId = planId === VIP_PLAN_ID ? VIP_PLAN_ID : PRO_PLAN_ID;
      effectiveTier = effectivePlanId === VIP_PLAN_ID ? 'vip' : 'pro';
      effectiveSubStatus = 'active';
      effectiveBillingCycle = billingCycle || 'monthly';

      const start = planStartDate ? new Date(planStartDate) : new Date();
      let end: Date;
      if (planEndDate) {
        end = new Date(planEndDate);
      } else if (effectiveBillingCycle === 'yearly') {
        end = new Date(start.getTime() + 365 * 24 * 60 * 60 * 1000);
      } else {
        end = new Date(start.getTime() + 30 * 24 * 60 * 60 * 1000);
      }

      periodStart = start.toISOString();
      periodEnd = end.toISOString();
      trialStatus = 'not_started';
      trialProvider = null;
      trialStartedAt = null;
      trialEndsAt = null;
      trialVerifiedAt = null;
    } else {
      // Default: Pro Plan Trial
      effectiveTier = 'pro';
      effectiveSubStatus = 'trialing';
      effectiveBillingCycle = billingCycle || 'monthly';
      effectivePlanId = PRO_PLAN_ID;

      const start = trialStartDate ? new Date(trialStartDate) : new Date();
      let end: Date;
      if (trialEndDate) {
        end = new Date(trialEndDate);
      } else {
        const days = Number(trialDays) || 7;
        end = new Date(start.getTime() + days * 24 * 60 * 60 * 1000);
      }

      periodStart = start.toISOString();
      periodEnd = end.toISOString();

      trialStatus = 'active';
      trialProvider = 'admin';
      trialStartedAt = periodStart;
      trialEndsAt = periodEnd;
      trialVerifiedAt = new Date().toISOString();
    }

    // 3. Manage user_subscriptions record
    let currentSubId = userProfile?.current_subscription_id;
    if (currentSubId) {
      await supabaseAdmin
        .from('user_subscriptions')
        .update({
          plan_id: effectivePlanId,
          status: effectiveSubStatus === 'trialing' ? 'trialing' : 'active',
          billing_cycle: effectiveBillingCycle,
          billing_mode: isProTrial ? 'trial' : (isPaidPlan ? 'recurring' : 'complimentary'),
          billing_provider: 'admin',
          current_period_start: periodStart,
          current_period_end: periodEnd,
          updated_at: new Date().toISOString()
        })
        .eq('id', currentSubId);
    } else {
      const { data: newSub } = await supabaseAdmin
        .from('user_subscriptions')
        .insert({
          user_id: userId,
          plan_id: effectivePlanId,
          status: effectiveSubStatus === 'trialing' ? 'trialing' : 'active',
          billing_cycle: effectiveBillingCycle,
          billing_mode: isProTrial ? 'trial' : (isPaidPlan ? 'recurring' : 'complimentary'),
          billing_provider: 'admin',
          current_period_start: periodStart,
          current_period_end: periodEnd,
          cancel_at_period_end: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select('id')
        .maybeSingle();

      if (newSub?.id) {
        currentSubId = newSub.id;
      }
    }

    // 4. Update user profile in public.users
    const userUpdate: any = {
      name: name || '',
      email_verified: true,
      subscription_tier: effectiveTier,
      subscription_status: effectiveSubStatus,
      billing_cycle: effectiveBillingCycle,
      plan_end_date: periodEnd,
      device_platform: 'web',
      trial_status: trialStatus,
      trial_provider: trialProvider,
      trial_started_at: trialStartedAt,
      trial_ends_at: trialEndsAt,
      trial_verified_at: trialVerifiedAt,
      current_subscription_id: currentSubId || undefined,
      updated_at: new Date().toISOString()
    };

    if (country) {
      userUpdate.country = country;
    }

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

      await supabaseAdmin.from('referral_tracking').insert({
        sponsor_id: sponsorId,
        referral_code_id: promoCodeRow?.id || null,
        referred_user_id: userId,
        referral_type: 'signup',
        payment_status: 'unpaid',
        commission_amount: 0,
        metadata: { created_by_admin: true, admin_id: admin.id, created_at: new Date().toISOString() },
      });
    }

    const { error: userUpdateError } = await supabaseAdmin
      .from('users')
      .update(userUpdate)
      .eq('id', userId);

    if (userUpdateError) {
      console.error('Error updating user profile:', userUpdateError);
    }

    // 5. Audit Log
    await logAdminAction(
      admin.id,
      'user.create',
      'user',
      userId,
      { 
        email, 
        name, 
        phone, 
        country,
        accountType: isProTrial ? 'pro_trial' : (isPaidPlan ? 'paid' : 'free'),
        subscription_tier: effectiveTier, 
        trial_days: isProTrial ? (Number(trialDays) || 7) : null,
        trial_ends_at: trialEndsAt,
        sponsor_id: sponsorId || null 
      },
      req
    );

    // 6. Optional Email Notification
    if (sendWelcomeEmail && process.env.SMTP_HOST && process.env.SMTP_USER) {
      try {
        const transporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST,
          port: Number(process.env.SMTP_PORT) || 465,
          secure: Number(process.env.SMTP_PORT) === 465,
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
          },
          tls: {
            rejectUnauthorized: false
          },
          connectionTimeout: 10000,
          greetingTimeout: 10000,
          socketTimeout: 10000,
        });

        const planDescription = isProTrial 
          ? `Pro Plan Trial (${Number(trialDays) || 7} Days Free Trial)`
          : (isPaidPlan ? `${effectiveTier.toUpperCase()} Plan (${effectiveBillingCycle})` : 'Free Account');

        const mailOptions = {
          from: `"AI Meal" <${process.env.SMTP_USER}>`,
          to: email,
          replyTo: process.env.SMTP_USER,
          subject: 'Welcome to AI Meal - Your Account Details',
          text: `Welcome to AI Meal!\n\nYour account has been created with ${planDescription}.\n\nEmail: ${email}\nPassword: ${password}\n\nPlease change this password after your first login.`,
          html: `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f4f7f6; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.05); }
    .header { background: linear-gradient(135deg, #4CAF50 0%, #26A69A 100%); padding: 30px 20px; text-align: center; color: white; }
    .header h1 { margin: 0; font-size: 24px; font-weight: 700; letter-spacing: 1px; }
    .content { padding: 40px 30px; color: #333333; line-height: 1.6; }
    .content p { margin: 0 0 15px 0; font-size: 16px; }
    .badge { display: inline-block; padding: 6px 14px; background: #e8f5e9; color: #2e7d32; border-radius: 20px; font-weight: 600; font-size: 14px; margin-bottom: 20px; }
    .credentials { background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 25px 0; }
    .credential-item { margin-bottom: 15px; }
    .credential-item:last-child { margin-bottom: 0; }
    .label { font-size: 12px; color: #64748b; text-transform: uppercase; font-weight: 700; letter-spacing: 0.5px; margin-bottom: 4px; display: block; }
    .value { font-size: 18px; color: #0f172a; font-weight: 600; font-family: monospace; }
    .footer { text-align: center; padding: 20px; color: #94a3b8; font-size: 13px; border-top: 1px solid #f1f5f9; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Welcome to AI MEAL</h1>
    </div>
    <div class="content">
      <p>Hello${name ? ` ${name}` : ''},</p>
      <p>We're thrilled to have you on board!</p>
      <div class="badge">${planDescription}</div>
      <p>You can now log in to the AI Meal mobile app using the credentials below:</p>
      
      <div class="credentials">
        <div class="credential-item">
          <span class="label">Email Address</span>
          <span class="value">${email}</span>
        </div>
        <div class="credential-item">
          <span class="label">Temporary Password</span>
          <span class="value">${password}</span>
        </div>
      </div>
      
      <p style="font-size: 14px; color: #64748b;">For your security, please update your password after your initial sign in.</p>
    </div>
    <div class="footer">
      <p>&copy; ${new Date().getFullYear()} AI Meal. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
          `
        };

        await transporter.sendMail(mailOptions);
      } catch (emailErr) {
        console.error('Failed to send welcome email:', emailErr);
      }
    }

    return NextResponse.json({ 
      success: true, 
      user: {
        id: userId,
        email,
        name,
        subscription_tier: effectiveTier,
        subscription_status: effectiveSubStatus,
        trial_status: trialStatus,
        trial_ends_at: trialEndsAt
      }
    }, { status: 201 });

  } catch (err: any) {
    console.error('Error creating user:', err);
    return NextResponse.json({ error: err.message || 'Failed to create user' }, { status: 500 });
  }
}, ['super_admin', 'content_manager']);

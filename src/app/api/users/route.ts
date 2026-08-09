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

    if (process.env.SMTP_HOST && process.env.SMTP_USER) {
      try {
        const transporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST,
          port: Number(process.env.SMTP_PORT) || 465,
          secure: Number(process.env.SMTP_PORT) === 465, // true for 465, false for other ports
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
          },
          tls: {
            rejectUnauthorized: false
          },
          connectionTimeout: 10000, // 10 seconds timeout
          greetingTimeout: 10000,
          socketTimeout: 10000,
        });

        const mailOptions = {
          from: `"AI Meal" <${process.env.SMTP_USER}>`,
          to: email,
          replyTo: process.env.SMTP_USER,
          subject: 'Welcome to AI Meal - Your Account Details',
          text: `Welcome to AI Meal!\n\nYour account has been created.\n\nEmail: ${email}\nPassword: ${password}\n\nPlease change this password after your first login.`,
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
      <p>Hello,</p>
      <p>We're thrilled to have you on board!</p>
      <p>You can now log in using the credentials below:</p>
      
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
      
    </div>
    <div class="footer">
      <p>&copy; ${new Date().getFullYear()} AI Meal. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
          `
        };

        // Await the email sending to ensure Next.js doesn't kill the process early
        await transporter.sendMail(mailOptions);
      } catch (configError) {
        console.error('Error with email transport:', configError);
      }
    } else {
      console.log('SMTP credentials not configured, skipping welcome email.');
    }

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

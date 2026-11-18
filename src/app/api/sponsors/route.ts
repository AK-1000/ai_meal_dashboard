import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth, logAdminAction } from '@/lib/auth-helpers';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const GET = withAdminAuth(async (req: NextRequest) => {
  try {
    const [
      { data: sponsors, error: sponsorsErr },
      { data: allReferrals, error: refErr },
      { data: referredUsers, error: usersErr }
    ] = await Promise.all([
      supabaseAdmin.from('sponsors').select('*').order('created_at', { ascending: false }),
      supabaseAdmin.from('referral_tracking').select('sponsor_id, payment_status, commission_amount, referral_type'),
      supabaseAdmin.from('users').select('referred_by_sponsor_id, subscription_status')
    ]);

    if (sponsorsErr) throw sponsorsErr;

    // Aggregate statistics per sponsor
    const enhancedSponsors = (sponsors || []).map((s) => {
      const sponsorRefs = (allReferrals || []).filter(r => r.sponsor_id === s.id);
      const sponsorUsers = (referredUsers || []).filter(u => u.referred_by_sponsor_id === s.id);
      
      const totalReferrals = sponsorUsers.length || s.total_referrals || sponsorRefs.length;
      const activeUsers = sponsorUsers.filter(u => u.subscription_status === 'active' || u.subscription_status === 'trialing').length;

      const unpaidCommission = sponsorRefs
        .filter(r => r.payment_status === 'unpaid')
        .reduce((sum, r) => sum + (Number(r.commission_amount) || 0), 0);

      const paidCommission = sponsorRefs
        .filter(r => r.payment_status === 'paid')
        .reduce((sum, r) => sum + (Number(r.commission_amount) || 0), 0);

      return {
        ...s,
        total_referrals_count: totalReferrals,
        active_users_count: activeUsers,
        unpaid_commission: Number(unpaidCommission.toFixed(2)),
        paid_commission: Number(paidCommission.toFixed(2)),
        total_commission: Number((unpaidCommission + paidCommission).toFixed(2))
      };
    });

    const activePartners = enhancedSponsors.filter(s => s.status === 'active' || s.is_active === true).length;
    const totalReferredAccounts = enhancedSponsors.reduce((sum, s) => sum + s.total_referrals_count, 0);
    const totalUnpaidOwed = enhancedSponsors.reduce((sum, s) => sum + s.unpaid_commission, 0);

    return NextResponse.json({ 
      sponsors: enhancedSponsors,
      stats: {
        totalPartners: enhancedSponsors.length,
        activePartners,
        totalReferredAccounts,
        totalUnpaidOwed: Number(totalUnpaidOwed.toFixed(2))
      }
    });
  } catch (err: any) {
    console.error('Error fetching sponsors:', err);
    return NextResponse.json({ error: err.message || 'Failed to fetch sponsors' }, { status: 500 });
  }
});

export const POST = withAdminAuth(async (req: NextRequest, admin) => {
  try {
    const body = await req.json();
    if (!body.type) {
      body.type = 'partner';
    }

    const { data: sponsor, error } = await supabaseAdmin
      .from('sponsors')
      .insert(body)
      .select()
      .single();

    if (error) throw error;

    // Automatically create the permanent referral code for the sponsor
    if (sponsor.code_prefix) {
      const { error: promoError } = await supabaseAdmin
        .from('promo_codes')
        .insert({
          code: sponsor.code_prefix,
          sponsor_id: sponsor.id,
          status: sponsor.status === 'active' ? 'active' : 'inactive',
          free_days: sponsor.default_free_days || null,
          expires_at: null
        });
        
      if (promoError) {
        console.error('Warning: Failed to auto-create promo code for sponsor', promoError);
      }
    }

    await logAdminAction(
      admin.id,
      'sponsor.create',
      'sponsor',
      sponsor.id,
      sponsor,
      req
    );

    return NextResponse.json({ sponsor });
  } catch (err: any) {
    console.error('Error creating sponsor:', err);
    return NextResponse.json({ error: err.message || 'Failed to create sponsor' }, { status: 500 });
  }
});

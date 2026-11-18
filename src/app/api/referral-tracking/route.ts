import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/auth-helpers';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const GET = withAdminAuth(async (req: NextRequest) => {
  try {
    const url = new URL(req.url);
    const page = parseInt(url.searchParams.get('page') || '1', 10);
    const limit = parseInt(url.searchParams.get('limit') || '15', 10);
    const sponsorId = url.searchParams.get('sponsorId') || '';
    const paymentStatus = url.searchParams.get('paymentStatus') || '';
    const conversionStage = url.searchParams.get('conversionStage') || ''; // 'all' | 'paid_converted' | 'in_trial' | 'expired_unconverted'
    const dateFrom = url.searchParams.get('dateFrom') || '';
    const dateTo = url.searchParams.get('dateTo') || '';
    const search = url.searchParams.get('search') || '';

    const offset = (page - 1) * limit;
    const nowIso = new Date().toISOString();
    const nowMs = Date.now();

    let query = supabaseAdmin
      .from('referral_tracking')
      .select(`
        *,
        sponsors:sponsor_id (id, name, code_prefix, commission_percentage, discount_percentage, default_free_days, status),
        promo_codes:referral_code_id (id, code, free_days, status),
        users:referred_user_id (id, email, name, subscription_tier, subscription_status, trial_status, trial_ends_at, plan_end_date, created_at)
      `, { count: 'exact' });

    // Apply sponsor filter
    if (sponsorId) {
      query = query.eq('sponsor_id', sponsorId);
    }

    // Apply commission payment status filter
    if (paymentStatus) {
      query = query.eq('payment_status', paymentStatus);
    }

    if (dateFrom) {
      query = query.gte('created_at', new Date(dateFrom).toISOString());
    }

    if (dateTo) {
      const endDate = new Date(dateTo);
      endDate.setHours(23, 59, 59, 999);
      query = query.lte('created_at', endDate.toISOString());
    }

    // Filter by conversion stage (Paid after trial, in trial, or expired unconverted)
    if (conversionStage && conversionStage !== 'all') {
      let stageUserQuery = supabaseAdmin.from('users').select('id');
      if (conversionStage === 'paid_converted') {
        stageUserQuery = stageUserQuery.eq('subscription_status', 'active');
      } else if (conversionStage === 'in_trial') {
        stageUserQuery = stageUserQuery
          .neq('subscription_status', 'active')
          .or('trial_status.eq.active,subscription_status.eq.trialing')
          .gt('trial_ends_at', nowIso);
      } else if (conversionStage === 'expired_unconverted') {
        stageUserQuery = stageUserQuery
          .neq('subscription_status', 'active')
          .or(`trial_status.eq.expired,subscription_status.eq.expired,trial_ends_at.lte.${nowIso}`);
      }

      const { data: stageUsers } = await stageUserQuery;
      const stageUserIds = (stageUsers || []).map(u => u.id);
      if (stageUserIds.length > 0) {
        query = query.in('referred_user_id', stageUserIds);
      } else {
        query = query.in('referred_user_id', ['00000000-0000-0000-0000-000000000000']);
      }
    }

    // Search by user email or name
    if (search) {
      const { data: matchedUsers } = await supabaseAdmin
        .from('users')
        .select('id')
        .or(`email.ilike.%${search}%,name.ilike.%${search}%`);

      const userIds = (matchedUsers || []).map(u => u.id);
      if (userIds.length > 0) {
        query = query.in('referred_user_id', userIds);
      } else {
        query = query.in('referred_user_id', ['00000000-0000-0000-0000-000000000000']);
      }
    }

    const { data: rawReferrals, count, error } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    // Decorate referrals with conversion lifecycle details
    const referrals = (rawReferrals || []).map((ref: any) => {
      const user = ref.users;
      let conversionStage: 'paid_converted' | 'in_trial' | 'expired_unconverted' = 'expired_unconverted';
      let trialDaysLeft: number | null = null;

      if (user) {
        const isPaid = user.subscription_status === 'active';
        const isTrial = !isPaid && 
          (user.trial_status === 'active' || user.subscription_status === 'trialing') &&
          (!user.trial_ends_at || new Date(user.trial_ends_at).getTime() > nowMs);

        if (isPaid) {
          conversionStage = 'paid_converted';
        } else if (isTrial) {
          conversionStage = 'in_trial';
          if (user.trial_ends_at) {
            const diffMs = new Date(user.trial_ends_at).getTime() - nowMs;
            trialDaysLeft = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
          }
        } else {
          conversionStage = 'expired_unconverted';
        }
      }

      return {
        ...ref,
        conversion_stage: conversionStage,
        trial_days_left: trialDaysLeft,
      };
    });

    // Build rich sponsor summary with conversion metrics and traffic quality audit
    const [
      { data: sponsors },
      { data: allReferrals },
      { data: allSponsorUsers },
      { data: allPromoCodes }
    ] = await Promise.all([
      supabaseAdmin.from('sponsors').select('id, name, type, code_prefix, commission_percentage, discount_percentage, default_free_days, status').order('name'),
      supabaseAdmin.from('referral_tracking').select('sponsor_id, payment_status, commission_amount'),
      supabaseAdmin.from('users').select('id, referred_by_sponsor_id, subscription_status, trial_status, trial_ends_at, plan_end_date'),
      supabaseAdmin.from('promo_codes').select('id, sponsor_id, code, free_days, status')
    ]);

    const sponsorSummary = (sponsors || []).map((s: any) => {
      const sRefs = (allReferrals || []).filter(r => r.sponsor_id === s.id);
      const sUsers = (allSponsorUsers || []).filter(u => u.referred_by_sponsor_id === s.id);
      const sCodes = (allPromoCodes || []).filter(c => c.sponsor_id === s.id);

      const totalReferrals = sUsers.length || sRefs.length;

      const paidUsers = sUsers.filter(u => u.subscription_status === 'active');
      const inTrialUsers = sUsers.filter(u => 
        u.subscription_status !== 'active' && 
        (u.trial_status === 'active' || u.subscription_status === 'trialing') &&
        (!u.trial_ends_at || new Date(u.trial_ends_at).getTime() > nowMs)
      );
      const expiredUnconvertedUsers = sUsers.filter(u => 
        u.subscription_status !== 'active' && 
        !inTrialUsers.some(tu => tu.id === u.id)
      );

      const paidCount = paidUsers.length;
      const inTrialCount = inTrialUsers.length;
      const expiredCount = expiredUnconvertedUsers.length;
      const conversionRate = totalReferrals > 0 ? Number(((paidCount / totalReferrals) * 100).toFixed(1)) : 0;

      // Quality assessment to detect scam/fake signups vs active high-performing sponsors
      let qualityStatus: 'high_performing' | 'active_converting' | 'evaluating_trials' | 'scam_risk' | 'no_traffic' = 'no_traffic';
      let qualityReason = 'No referred signups yet';

      if (totalReferrals === 0) {
        qualityStatus = 'no_traffic';
        qualityReason = 'No signups';
      } else if (paidCount > 0 && conversionRate >= 20) {
        qualityStatus = 'high_performing';
        qualityReason = `${conversionRate}% conversion rate (${paidCount} paid)`;
      } else if (paidCount > 0) {
        qualityStatus = 'active_converting';
        qualityReason = `${conversionRate}% conversion rate (${paidCount} paid)`;
      } else if (inTrialCount > 0 && expiredCount === 0) {
        qualityStatus = 'evaluating_trials';
        qualityReason = `${inTrialCount} users currently in trial`;
      } else if (expiredCount > 0 && paidCount === 0) {
        qualityStatus = 'scam_risk';
        qualityReason = `0% converted • All ${expiredCount} users dropped after trial`;
      } else {
        qualityStatus = 'evaluating_trials';
        qualityReason = `${inTrialCount} evaluating, ${expiredCount} dropped`;
      }

      const paidRefs = sRefs.filter(r => r.payment_status === 'paid').length;
      const unpaidRefs = sRefs.filter(r => r.payment_status === 'unpaid').length;
      const unpaidCommission = sRefs.filter(r => r.payment_status === 'unpaid').reduce((sum, r) => sum + (Number(r.commission_amount) || 0), 0);
      const paidCommission = sRefs.filter(r => r.payment_status === 'paid').reduce((sum, r) => sum + (Number(r.commission_amount) || 0), 0);

      return {
        ...s,
        codes: sCodes,
        primary_code: sCodes.find(c => c.code === s.code_prefix)?.code || s.code_prefix || sCodes[0]?.code || '—',
        totalReferrals,
        paidCount,
        inTrialCount,
        expiredCount,
        conversionRate,
        qualityStatus,
        qualityReason,
        paidReferrals: paidRefs,
        unpaidReferrals: unpaidRefs,
        unpaidCommission: Number(unpaidCommission.toFixed(2)),
        paidCommission: Number(paidCommission.toFixed(2)),
        totalCommission: Number((unpaidCommission + paidCommission).toFixed(2))
      };
    });

    // Overall aggregate funnel stats across all sponsor traffic
    const totalAllReferred = allSponsorUsers?.length || 0;
    const totalAllPaid = (allSponsorUsers || []).filter(u => u.subscription_status === 'active').length;
    const totalAllInTrial = (allSponsorUsers || []).filter(u => 
      u.subscription_status !== 'active' && 
      (u.trial_status === 'active' || u.subscription_status === 'trialing') &&
      (!u.trial_ends_at || new Date(u.trial_ends_at).getTime() > nowMs)
    ).length;
    const totalAllExpired = Math.max(0, totalAllReferred - totalAllPaid - totalAllInTrial);
    const overallConversionRate = totalAllReferred > 0 ? Number(((totalAllPaid / totalAllReferred) * 100).toFixed(1)) : 0;

    return NextResponse.json({
      referrals,
      sponsorSummary,
      allSponsors: sponsors || [],
      conversionStats: {
        totalReferred: totalAllReferred,
        paidConverted: totalAllPaid,
        inTrial: totalAllInTrial,
        expiredUnconverted: totalAllExpired,
        conversionRate: overallConversionRate,
      },
      pagination: {
        page,
        limit,
        total: count || 0,
        pages: Math.ceil((count || 0) / limit),
      }
    });
  } catch (err: any) {
    console.error('Error fetching referral tracking:', err);
    return NextResponse.json({ error: err.message || 'Failed to fetch referrals' }, { status: 500 });
  }
});

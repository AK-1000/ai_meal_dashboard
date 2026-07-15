import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth, logAdminAction } from '@/lib/auth-helpers';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const PATCH = withAdminAuth(async (req: NextRequest, admin) => {
  try {
    const planId = req.nextUrl.pathname.split('/').slice(-1)[0];
    if (!planId) {
      return NextResponse.json({ error: 'Plan ID is required' }, { status: 400 });
    }

    const body = await req.json();

    const { data: oldPlan } = await supabaseAdmin
      .from('subscription_plans')
      .select('*')
      .eq('id', planId)
      .single();

    const { data: plan, error } = await supabaseAdmin
      .from('subscription_plans')
      .update(body)
      .eq('id', planId)
      .select()
      .single();

    if (error) throw error;

    await logAdminAction(
      admin.id,
      'plan.update',
      'subscription_plan',
      planId,
      { before: oldPlan, after: plan },
      req
    );

    return NextResponse.json({ plan });
  } catch (err: any) {
    console.error('Error updating plan:', err);
    return NextResponse.json({ error: err.message || 'Failed to update plan' }, { status: 500 });
  }
});

export const DELETE = withAdminAuth(async (req: NextRequest, admin) => {
  try {
    const planId = req.nextUrl.pathname.split('/').slice(-1)[0];
    if (!planId) {
      return NextResponse.json({ error: 'Plan ID is required' }, { status: 400 });
    }

    const { data: plan } = await supabaseAdmin
      .from('subscription_plans')
      .select('name')
      .eq('id', planId)
      .single();

    const { error } = await supabaseAdmin
      .from('subscription_plans')
      .delete()
      .eq('id', planId);

    if (error) throw error;

    await logAdminAction(
      admin.id,
      'plan.delete',
      'subscription_plan',
      planId,
      { name: plan?.name || '' },
      req
    );

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Error deleting plan:', err);
    return NextResponse.json({ error: err.message || 'Failed to delete plan' }, { status: 500 });
  }
});

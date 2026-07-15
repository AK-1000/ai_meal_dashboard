import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth, logAdminAction } from '@/lib/auth-helpers';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const GET = withAdminAuth(async (req: NextRequest) => {
  try {
    const { data: plans, error } = await supabaseAdmin
      .from('subscription_plans')
      .select('*')
      .order('rank', { ascending: true });

    if (error) throw error;

    return NextResponse.json({ plans });
  } catch (err: any) {
    console.error('Error fetching subscription plans:', err);
    return NextResponse.json({ error: err.message || 'Failed to fetch subscription plans' }, { status: 500 });
  }
});

export const POST = withAdminAuth(async (req: NextRequest, admin) => {
  try {
    const body = await req.json();
    
    const { data: plan, error } = await supabaseAdmin
      .from('subscription_plans')
      .insert(body)
      .select()
      .single();

    if (error) throw error;

    await logAdminAction(
      admin.id,
      'plan.create',
      'subscription_plan',
      plan.id,
      plan,
      req
    );

    return NextResponse.json({ plan });
  } catch (err: any) {
    console.error('Error creating plan:', err);
    return NextResponse.json({ error: err.message || 'Failed to create plan' }, { status: 500 });
  }
});

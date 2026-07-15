import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth, logAdminAction } from '@/lib/auth-helpers';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const GET = withAdminAuth(async (req: NextRequest) => {
  try {
    const { data: promoCodes, error } = await supabaseAdmin
      .from('promo_codes')
      .select('*, sponsors(name)')
      .order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json({ promoCodes });
  } catch (err: any) {
    console.error('Error fetching promo codes:', err);
    return NextResponse.json({ error: err.message || 'Failed to fetch promo codes' }, { status: 500 });
  }
});

export const POST = withAdminAuth(async (req: NextRequest, admin) => {
  try {
    const body = await req.json();

    const { data: promoCode, error } = await supabaseAdmin
      .from('promo_codes')
      .insert(body)
      .select()
      .single();

    if (error) throw error;

    await logAdminAction(
      admin.id,
      'promo_code.create',
      'promo_code',
      promoCode.id,
      promoCode,
      req
    );

    return NextResponse.json({ promoCode });
  } catch (err: any) {
    console.error('Error creating promo code:', err);
    return NextResponse.json({ error: err.message || 'Failed to create promo code' }, { status: 500 });
  }
});

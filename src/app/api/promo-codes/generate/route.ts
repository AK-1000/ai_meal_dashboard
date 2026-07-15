import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth, logAdminAction } from '@/lib/auth-helpers';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const POST = withAdminAuth(async (req: NextRequest, admin) => {
  try {
    const { data, error } = await supabaseAdmin.rpc('generate_all_daily_promo_codes');
    if (error) throw error;

    await logAdminAction(
      admin.id,
      'promo_codes.generate_daily',
      'promo_code',
      null,
      { result: data },
      req
    );

    return NextResponse.json({ success: true, result: data });
  } catch (err: any) {
    console.error('Error generating daily promo codes:', err);
    return NextResponse.json({ error: err.message || 'Failed to generate daily promo codes' }, { status: 500 });
  }
});

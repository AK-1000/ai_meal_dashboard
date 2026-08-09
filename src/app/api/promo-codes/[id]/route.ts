import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth, logAdminAction } from '@/lib/auth-helpers';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const PATCH = withAdminAuth(async (req: NextRequest, admin) => {
  try {
    const codeId = req.nextUrl.pathname.split('/').slice(-1)[0];
    if (!codeId) {
      return NextResponse.json({ error: 'Promo Code ID is required' }, { status: 400 });
    }

    const body = await req.json();
    const { discount_percentage, is_active, ...updateData } = body;

    if (!updateData.status && is_active !== undefined) {
      updateData.status = is_active ? 'active' : 'inactive';
    }

    const { data: oldCode } = await supabaseAdmin
      .from('promo_codes')
      .select('*')
      .eq('id', codeId)
      .single();

    const { data: promoCode, error } = await supabaseAdmin
      .from('promo_codes')
      .update(updateData)
      .eq('id', codeId)
      .select('*, sponsors(name, discount_percentage)')
      .single();

    if (error) throw error;

    await logAdminAction(
      admin.id,
      'promo_code.update',
      'promo_code',
      codeId,
      { before: oldCode, after: promoCode },
      req
    );

    return NextResponse.json({ promoCode });
  } catch (err: any) {
    console.error('Error updating promo code:', err);
    return NextResponse.json({ error: err.message || 'Failed to update promo code' }, { status: 500 });
  }
});

export const DELETE = withAdminAuth(async (req: NextRequest, admin) => {
  try {
    const codeId = req.nextUrl.pathname.split('/').slice(-1)[0];
    if (!codeId) {
      return NextResponse.json({ error: 'Promo Code ID is required' }, { status: 400 });
    }

    const { data: code } = await supabaseAdmin
      .from('promo_codes')
      .select('code')
      .eq('id', codeId)
      .single();

    const { error } = await supabaseAdmin
      .from('promo_codes')
      .delete()
      .eq('id', codeId);

    if (error) throw error;

    await logAdminAction(
      admin.id,
      'promo_code.delete',
      'promo_code',
      codeId,
      { code: code?.code || '' },
      req
    );

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Error deleting promo code:', err);
    if (err.code === '23503') {
      return NextResponse.json({ error: 'This promo code has already been used by users and cannot be deleted to preserve analytics. Please deactivate it instead.' }, { status: 409 });
    }
    return NextResponse.json({ error: err.message || 'Failed to delete promo code' }, { status: 500 });
  }
});

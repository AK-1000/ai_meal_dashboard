import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth, logAdminAction } from '@/lib/auth-helpers';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const PATCH = withAdminAuth(async (req: NextRequest, admin) => {
  try {
    const body = await req.json();
    const { ids, status } = body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'IDs array is required' }, { status: 400 });
    }

    if (!status || !['active', 'inactive'].includes(status)) {
      return NextResponse.json({ error: 'Valid status ("active" or "inactive") is required' }, { status: 400 });
    }

    const { data: updatedCodes, error } = await supabaseAdmin
      .from('promo_codes')
      .update({ status })
      .in('id', ids)
      .select();

    if (error) throw error;

    await logAdminAction(
      admin.id,
      'promo_code.bulk_update',
      'promo_code',
      'bulk',
      { count: ids.length, ids, status },
      req
    );

    return NextResponse.json({ success: true, count: updatedCodes?.length || 0 });
  } catch (err: any) {
    console.error('Error bulk updating promo codes:', err);
    return NextResponse.json({ error: err.message || 'Failed to bulk update promo codes' }, { status: 500 });
  }
});

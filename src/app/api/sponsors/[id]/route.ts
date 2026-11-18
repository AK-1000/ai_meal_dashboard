import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth, logAdminAction } from '@/lib/auth-helpers';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const PATCH = withAdminAuth(async (req: NextRequest, admin) => {
  try {
    const sponsorId = req.nextUrl.pathname.split('/').slice(-1)[0];
    if (!sponsorId) {
      return NextResponse.json({ error: 'Sponsor ID is required' }, { status: 400 });
    }

    const body = await req.json();

    const { data: oldSponsor } = await supabaseAdmin
      .from('sponsors')
      .select('*')
      .eq('id', sponsorId)
      .single();

    const { data: sponsor, error } = await supabaseAdmin
      .from('sponsors')
      .update(body)
      .eq('id', sponsorId)
      .select()
      .single();

    if (error) throw error;

    // Keep primary promo code in sync
    if (sponsor.code_prefix) {
      const cleanCode = sponsor.code_prefix.toUpperCase().trim();
      const { data: existingCode } = await supabaseAdmin
        .from('promo_codes')
        .select('id')
        .eq('sponsor_id', sponsorId)
        .eq('code', (oldSponsor?.code_prefix || sponsor.code_prefix).toUpperCase().trim())
        .maybeSingle();

      if (existingCode) {
        await supabaseAdmin
          .from('promo_codes')
          .update({
            code: cleanCode,
            status: sponsor.status === 'active' ? 'active' : 'inactive',
            free_days: sponsor.default_free_days || 7,
          })
          .eq('id', existingCode.id);
      } else {
        await supabaseAdmin
          .from('promo_codes')
          .insert({
            code: cleanCode,
            sponsor_id: sponsorId,
            status: sponsor.status === 'active' ? 'active' : 'inactive',
            free_days: sponsor.default_free_days || 7,
            never_expires: true,
          });
      }
    }

    await logAdminAction(
      admin.id,
      'sponsor.update',
      'sponsor',
      sponsorId,
      { before: oldSponsor, after: sponsor },
      req
    );

    return NextResponse.json({ sponsor });
  } catch (err: any) {
    console.error('Error updating sponsor:', err);
    return NextResponse.json({ error: err.message || 'Failed to update sponsor' }, { status: 500 });
  }
});

export const DELETE = withAdminAuth(async (req: NextRequest, admin) => {
  try {
    const sponsorId = req.nextUrl.pathname.split('/').slice(-1)[0];
    if (!sponsorId) {
      return NextResponse.json({ error: 'Sponsor ID is required' }, { status: 400 });
    }

    const { data: sponsor } = await supabaseAdmin
      .from('sponsors')
      .select('name')
      .eq('id', sponsorId)
      .single();

    const { error } = await supabaseAdmin
      .from('sponsors')
      .delete()
      .eq('id', sponsorId);

    if (error) throw error;

    await logAdminAction(
      admin.id,
      'sponsor.delete',
      'sponsor',
      sponsorId,
      { name: sponsor?.name || '' },
      req
    );

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Error deleting sponsor:', err);
    return NextResponse.json({ error: err.message || 'Failed to delete sponsor' }, { status: 500 });
  }
});

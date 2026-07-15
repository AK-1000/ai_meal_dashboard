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

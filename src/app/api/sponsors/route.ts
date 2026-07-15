import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth, logAdminAction } from '@/lib/auth-helpers';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const GET = withAdminAuth(async (req: NextRequest) => {
  try {
    const { data: sponsors, error } = await supabaseAdmin
      .from('sponsors')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json({ sponsors });
  } catch (err: any) {
    console.error('Error fetching sponsors:', err);
    return NextResponse.json({ error: err.message || 'Failed to fetch sponsors' }, { status: 500 });
  }
});

export const POST = withAdminAuth(async (req: NextRequest, admin) => {
  try {
    const body = await req.json();

    const { data: sponsor, error } = await supabaseAdmin
      .from('sponsors')
      .insert(body)
      .select()
      .single();

    if (error) throw error;

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

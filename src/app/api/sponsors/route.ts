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
    if (!body.type) {
      body.type = 'partner';
    }

    const { data: sponsor, error } = await supabaseAdmin
      .from('sponsors')
      .insert(body)
      .select()
      .single();

    if (error) throw error;

    // Automatically create the permanent referral code for the sponsor
    if (sponsor.code_prefix) {
      const { error: promoError } = await supabaseAdmin
        .from('promo_codes')
        .insert({
          code: sponsor.code_prefix,
          sponsor_id: sponsor.id,
          status: sponsor.status === 'active' ? 'active' : 'inactive',
          free_days: sponsor.default_free_days || null,
          expires_at: null
        });
        
      if (promoError) {
        console.error('Warning: Failed to auto-create promo code for sponsor', promoError);
      }
    }

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

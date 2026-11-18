import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth, logAdminAction } from '@/lib/auth-helpers';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const GET = withAdminAuth(async (req: NextRequest) => {
  try {
    const url = new URL(req.url);
    const page = parseInt(url.searchParams.get('page') || '1', 10);
    const limit = parseInt(url.searchParams.get('limit') || '10', 10);
    const search = url.searchParams.get('search') || '';

    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let query = supabaseAdmin
      .from('promo_codes')
      .select('*, sponsors(name, discount_percentage)', { count: 'exact' })
      .order('created_at', { ascending: false });

    if (search) {
      query = query.ilike('code', `%${search}%`);
    }

    const { data: promoCodes, error, count } = await query.range(from, to);

    if (error) throw error;

    return NextResponse.json({
      promoCodes,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      }
    });
  } catch (err: any) {
    console.error('Error fetching promo codes:', err);
    return NextResponse.json({ error: err.message || 'Failed to fetch promo codes' }, { status: 500 });
  }
});

export const POST = withAdminAuth(async (req: NextRequest, admin) => {
  try {
    const body = await req.json();
    const { discount_percentage, is_active, ...insertData } = body;

    if (!insertData.status && is_active !== undefined) {
      insertData.status = is_active ? 'active' : 'inactive';
    }

    if (insertData.code) {
      insertData.code = insertData.code.toUpperCase().trim();
    }

    if (!insertData.expires_at) {
      insertData.never_expires = true;
      insertData.expires_at = null;
    } else {
      insertData.never_expires = false;
    }

    const { data: promoCode, error } = await supabaseAdmin
      .from('promo_codes')
      .insert(insertData)
      .select('*, sponsors(name, discount_percentage)')
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

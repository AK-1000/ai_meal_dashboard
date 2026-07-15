import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/auth-helpers';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const GET = withAdminAuth(async (req: NextRequest) => {
  try {
    const searchParams = req.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    let status = searchParams.get('status') || '';
    if (status === 'success') {
      status = 'succeeded';
    }

    const offset = (page - 1) * limit;

    // Use inner join only when searching to prevent excluding transactions for deleted users otherwise
    const selectStr = search ? '*, users!inner(email, name)' : '*, users(email, name)';

    let query = supabaseAdmin
      .from('payment_history')
      .select(selectStr, { count: 'exact' });

    if (search) {
      query = query.or(`users.email.ilike.%${search}%,users.name.ilike.%${search}%`);
    }

    if (status) {
      query = query.eq('status', status);
    }

    const { data: payments, count, error } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    return NextResponse.json({
      payments,
      pagination: {
        page,
        limit,
        total: count || 0,
        pages: Math.ceil((count || 0) / limit),
      }
    });
  } catch (err: any) {
    console.error('Error fetching payments:', err);
    return NextResponse.json({ error: err.message || 'Failed to fetch payments' }, { status: 500 });
  }
});

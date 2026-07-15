import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/auth-helpers';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const GET = withAdminAuth(async (req: NextRequest) => {
  try {
    const searchParams = req.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '15');
    const search = searchParams.get('search') || '';
    const severity = searchParams.get('severity') || '';

    const offset = (page - 1) * limit;

    let query = supabaseAdmin
      .from('app_logs')
      .select('*', { count: 'exact' });

    if (search) {
      query = query.or(`user_email.ilike.%${search}%,error_message.ilike.%${search}%`);
    }

    if (severity) {
      query = query.eq('severity', severity);
    }

    const { data: logs, count, error } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    return NextResponse.json({
      logs,
      pagination: {
        page,
        limit,
        total: count || 0,
        pages: Math.ceil((count || 0) / limit),
      }
    });
  } catch (err: any) {
    console.error('Error fetching app logs:', err);
    return NextResponse.json({ error: err.message || 'Failed to fetch logs' }, { status: 500 });
  }
});

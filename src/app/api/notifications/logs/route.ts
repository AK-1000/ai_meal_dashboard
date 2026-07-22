import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/auth-helpers';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const GET = withAdminAuth(async (req: NextRequest) => {
  try {
    const searchParams = req.nextUrl.searchParams;
    const notificationType = searchParams.get('type') || '';
    const limit = parseInt(searchParams.get('limit') || '50');

    let query = supabaseAdmin
      .from('notification_logs')
      .select('*, users(email, name)')
      .order('sent_at', { ascending: false })
      .limit(limit);

    // Filter by notification type if specified
    if (notificationType) {
      query = query.eq('notification_type', notificationType);
    }

    const { data: logs, error } = await query;

    if (error) throw error;

    return NextResponse.json({ logs });
  } catch (err: any) {
    console.error('Error fetching notification logs:', err);
    return NextResponse.json({ error: err.message || 'Failed to fetch notification logs' }, { status: 500 });
  }
});

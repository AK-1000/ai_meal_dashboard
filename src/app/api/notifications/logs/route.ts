import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/auth-helpers';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const GET = withAdminAuth(async (req: NextRequest) => {
  try {
    const { data: logs, error } = await supabaseAdmin
      .from('notification_logs')
      .select('*, users(email)')
      .order('sent_at', { ascending: false })
      .limit(50);

    if (error) throw error;

    return NextResponse.json({ logs });
  } catch (err: any) {
    console.error('Error fetching notification logs:', err);
    return NextResponse.json({ error: err.message || 'Failed to fetch notification logs' }, { status: 500 });
  }
});

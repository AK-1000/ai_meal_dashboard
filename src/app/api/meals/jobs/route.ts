import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/auth-helpers';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const GET = withAdminAuth(async (req: NextRequest) => {
  try {
    const { data: jobs, error } = await supabaseAdmin
      .from('job_status')
      .select('*, users(email)')
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw error;

    return NextResponse.json({ jobs });
  } catch (err: any) {
    console.error('Error fetching jobs:', err);
    return NextResponse.json({ error: err.message || 'Failed to fetch jobs' }, { status: 500 });
  }
});

import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/auth-helpers';
import { supabaseAdmin } from '@/lib/supabase-admin';

// POST: Resolve user email to user ID (server-side, bypasses RLS)
export const POST = withAdminAuth(async (req: NextRequest) => {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const { data: user, error } = await supabaseAdmin
      .from('users')
      .select('id, email, name')
      .eq('email', email.trim().toLowerCase())
      .single();

    if (error || !user) {
      // Try case-insensitive search
      const { data: userCI, error: errorCI } = await supabaseAdmin
        .from('users')
        .select('id, email, name')
        .ilike('email', email.trim())
        .single();

      if (errorCI || !userCI) {
        return NextResponse.json({ error: 'User not found in database' }, { status: 404 });
      }

      return NextResponse.json({ success: true, user: userCI });
    }

    return NextResponse.json({ success: true, user });
  } catch (err: any) {
    console.error('Error resolving user:', err);
    return NextResponse.json({ error: err.message || 'Failed to resolve user' }, { status: 500 });
  }
});

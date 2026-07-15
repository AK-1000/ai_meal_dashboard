import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth, logAdminAction } from '@/lib/auth-helpers';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const POST = withAdminAuth(async (req: NextRequest, admin) => {
  try {
    const segments = req.nextUrl.pathname.split('/');
    const userId = segments[segments.length - 2];
    
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const { password } = await req.json();
    if (!password || password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
    }

    const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      password: password
    });

    if (error) throw error;

    await logAdminAction(
      admin.id,
      'user.reset_password',
      'user',
      userId,
      {},
      req
    );

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Error resetting password:', err);
    return NextResponse.json({ error: err.message || 'Failed to reset password' }, { status: 500 });
  }
});

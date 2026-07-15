import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth, logAdminAction } from '@/lib/auth-helpers';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const POST = withAdminAuth(async (req: NextRequest, admin) => {
  try {
    const { password } = await req.json();
    if (!password || password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
    }

    const { error } = await supabaseAdmin.auth.admin.updateUserById(admin.user_id, {
      password: password
    });

    if (error) throw error;

    await logAdminAction(
      admin.id,
      'admin.change_password',
      'admin_user',
      admin.id,
      {},
      req
    );

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Error changing admin password:', err);
    return NextResponse.json({ error: err.message || 'Failed to update password' }, { status: 500 });
  }
});

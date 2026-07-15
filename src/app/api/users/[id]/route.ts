import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth, logAdminAction } from '@/lib/auth-helpers';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const GET = withAdminAuth(async (req: NextRequest, admin) => {
  try {
    const userId = req.nextUrl.pathname.split('/').slice(-1)[0];
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // 1. Fetch user profile
    const { data: user, error: userErr } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (userErr || !user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // 2. Fetch user's subscriptions
    const { data: subscriptions } = await supabaseAdmin
      .from('user_subscriptions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    // 3. Fetch user's payment history
    const { data: payments } = await supabaseAdmin
      .from('payment_history')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    // 4. Fetch logs for this user
    const { data: appLogs } = await supabaseAdmin
      .from('app_logs')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50);

    // 5. Fetch user daily progress (water, weight logs)
    const { data: waterLogs } = await supabaseAdmin
      .from('water_logs')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(30);

    const { data: weightLogs } = await supabaseAdmin
      .from('weight_logs')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(30);

    return NextResponse.json({
      user,
      subscriptions: subscriptions || [],
      payments: payments || [],
      appLogs: appLogs || [],
      healthLogs: {
        waterLogs: waterLogs || [],
        weightLogs: weightLogs || [],
      }
    });
  } catch (err: any) {
    console.error('Error fetching user details:', err);
    return NextResponse.json({ error: err.message || 'Failed to fetch user details' }, { status: 500 });
  }
});

export const PATCH = withAdminAuth(async (req: NextRequest, admin) => {
  try {
    const userId = req.nextUrl.pathname.split('/').slice(-1)[0];
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const body = await req.json();
    
    // Fetch user before edit to log changes
    const { data: oldUser } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    const { data: newUser, error } = await supabaseAdmin
      .from('users')
      .update(body)
      .eq('id', userId)
      .select()
      .single();

    if (error) throw error;

    // Log the admin action
    await logAdminAction(
      admin.id,
      'user.update',
      'user',
      userId,
      { before: oldUser, after: newUser },
      req
    );

    return NextResponse.json({ user: newUser });
  } catch (err: any) {
    console.error('Error updating user:', err);
    return NextResponse.json({ error: err.message || 'Failed to update user' }, { status: 500 });
  }
});

export const DELETE = withAdminAuth(async (req: NextRequest, admin) => {
  try {
    const userId = req.nextUrl.pathname.split('/').slice(-1)[0];
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Get user details first
    const { data: user } = await supabaseAdmin
      .from('users')
      .select('email')
      .eq('id', userId)
      .single();

    // 1. Delete auth user
    const { error: authErr } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (authErr) {
      console.warn('Auth user delete warning (might already be deleted):', authErr.message);
    }

    // 2. Delete public.users user profile
    const { error: dbErr } = await supabaseAdmin
      .from('users')
      .delete()
      .eq('id', userId);

    if (dbErr) throw dbErr;

    // Log admin action
    await logAdminAction(
      admin.id,
      'user.delete',
      'user',
      userId,
      { email: user?.email || '' },
      req
    );

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Error deleting user:', err);
    return NextResponse.json({ error: err.message || 'Failed to delete user' }, { status: 500 });
  }
});

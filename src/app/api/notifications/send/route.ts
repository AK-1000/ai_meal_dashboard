import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth, logAdminAction } from '@/lib/auth-helpers';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { initFirebase } from '@/lib/firebase-admin';
import * as admin from 'firebase-admin';

export const POST = withAdminAuth(async (req: NextRequest, currentAdmin) => {
  try {
    const { userId, title, body, notificationType = 'general' } = await req.json();

    if (!userId || !title || !body) {
      return NextResponse.json({ error: 'Missing userId, title or body' }, { status: 400 });
    }

    // 1. Fetch user's firebase token
    const { data: user, error: userErr } = await supabaseAdmin
      .from('users')
      .select('firebase_token')
      .eq('id', userId)
      .single();

    if (userErr || !user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (!user.firebase_token) {
      return NextResponse.json({ error: 'User has no Firebase FCM push token registered' }, { status: 400 });
    }

    // 2. Initialize Firebase & send message
    initFirebase();
    
    let fcmMessageId = '';
    let delivered = false;
    let errorMessage = '';

    try {
      fcmMessageId = await admin.messaging().send({
        token: user.firebase_token,
        notification: { title, body },
        data: { type: notificationType }
      });
      delivered = true;
    } catch (fcmErr: any) {
      console.error('FCM Send Error:', fcmErr);
      errorMessage = fcmErr.message || 'FCM delivery failed';
    }

    // 3. Log notification in database
    const { error: logErr } = await supabaseAdmin.from('notification_logs').insert({
      user_id: userId,
      notification_type: notificationType,
      title,
      body,
      sent_at: new Date().toISOString(),
      delivered,
      fcm_message_id: fcmMessageId || null,
      error_message: errorMessage || null
    });

    if (logErr) {
      console.error('Failed to log notification in DB:', logErr.message);
    }

    // 4. Log admin audit action
    await logAdminAction(
      currentAdmin.id,
      'notification.send',
      'user',
      userId,
      { title, body, delivered, errorMessage },
      req
    );

    if (!delivered) {
      return NextResponse.json({ error: errorMessage || 'FCM notification could not be delivered' }, { status: 502 });
    }

    return NextResponse.json({ success: true, messageId: fcmMessageId });
  } catch (err: any) {
    console.error('Error sending single notification:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
});

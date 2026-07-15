import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth, logAdminAction } from '@/lib/auth-helpers';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { initFirebase } from '@/lib/firebase-admin';
import * as admin from 'firebase-admin';

export const POST = withAdminAuth(async (req: NextRequest, currentAdmin) => {
  try {
    const { title, body, tier, platform, notificationType = 'general' } = await req.json();

    if (!title || !body) {
      return NextResponse.json({ error: 'Missing title or body' }, { status: 400 });
    }

    // 1. Fetch user tokens matching criteria
    let query = supabaseAdmin
      .from('users')
      .select('id, firebase_token')
      .not('firebase_token', 'is', null);

    if (tier) {
      query = query.eq('subscription_tier', tier);
    }

    if (platform) {
      query = query.eq('device_platform', platform);
    }

    const { data: users, error: usersErr } = await query;

    if (usersErr) throw usersErr;

    if (!users || users.length === 0) {
      return NextResponse.json({ success: true, sentCount: 0, message: 'No users found with registered tokens matching filters.' });
    }

    const tokens = users.map(u => u.firebase_token).filter(Boolean) as string[];
    const userIds = users.map(u => u.id);

    if (tokens.length === 0) {
      return NextResponse.json({ success: true, sentCount: 0, message: 'No valid Firebase tokens found.' });
    }

    // 2. Initialize Firebase & send multicast in batches of 500
    initFirebase();
    
    let successCount = 0;
    let failureCount = 0;
    const batchSize = 500;
    const notificationLogsToInsert: any[] = [];

    for (let i = 0; i < tokens.length; i += batchSize) {
      const batchTokens = tokens.slice(i, i + batchSize);
      const batchUserIds = userIds.slice(i, i + batchSize);

      try {
        const response = await admin.messaging().sendEachForMulticast({
          tokens: batchTokens,
          notification: { title, body },
          data: { type: notificationType }
        });

        successCount += response.successCount;
        failureCount += response.failureCount;

        // Log results per token/user
        response.responses.forEach((res, idx) => {
          notificationLogsToInsert.push({
            user_id: batchUserIds[idx],
            notification_type: notificationType,
            title,
            body,
            sent_at: new Date().toISOString(),
            delivered: res.success,
            fcm_message_id: res.messageId || null,
            error_message: res.error?.message || null
          });
        });
      } catch (batchErr) {
        console.error('Batch multicast error:', batchErr);
      }
    }

    // 3. Batch insert notification logs in chunks
    if (notificationLogsToInsert.length > 0) {
      const logChunks = [];
      const chunkSize = 100;
      for (let i = 0; i < notificationLogsToInsert.length; i += chunkSize) {
        logChunks.push(notificationLogsToInsert.slice(i, i + chunkSize));
      }
      
      for (const chunk of logChunks) {
        await supabaseAdmin.from('notification_logs').insert(chunk);
      }
    }

    // 4. Log admin audit action
    await logAdminAction(
      currentAdmin.id,
      'notification.broadcast',
      'notification',
      null,
      { title, body, tier, platform, successCount, failureCount },
      req
    );

    return NextResponse.json({
      success: true,
      totalCount: tokens.length,
      successCount,
      failureCount
    });
  } catch (err: any) {
    console.error('Error broadcasting notification:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
});

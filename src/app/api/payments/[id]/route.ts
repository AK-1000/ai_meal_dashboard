import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth, logAdminAction } from '@/lib/auth-helpers';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const PATCH = withAdminAuth(async (req: NextRequest, admin) => {
  try {
    const paymentId = req.nextUrl.pathname.split('/').slice(-1)[0];
    if (!paymentId) {
      return NextResponse.json({ error: 'Payment ID is required' }, { status: 400 });
    }

    const { status } = await req.json();

    // Check payment_history first
    const { data: oldPayment } = await supabaseAdmin
      .from('payment_history')
      .select('*')
      .eq('id', paymentId)
      .maybeSingle();

    if (oldPayment) {
      const { data: payment, error } = await supabaseAdmin
        .from('payment_history')
        .update({ status })
        .eq('id', paymentId)
        .select()
        .single();

      if (error) throw error;

      await logAdminAction(
        admin.id,
        'payment.update_status',
        'payment',
        paymentId,
        { before: oldPayment, after: payment },
        req
      );

      return NextResponse.json({ payment });
    }

    // Check store_purchases (for Google Play Android IAP)
    const { data: oldStorePurchase } = await supabaseAdmin
      .from('store_purchases')
      .select('*')
      .eq('id', paymentId)
      .maybeSingle();

    if (oldStorePurchase) {
      const mappedState = status === 'refunded' ? 'revoked' : status;
      const { data: storePurchase, error } = await supabaseAdmin
        .from('store_purchases')
        .update({ purchase_state: mappedState })
        .eq('id', paymentId)
        .select()
        .single();

      if (error) throw error;

      await logAdminAction(
        admin.id,
        'payment.update_store_purchase_status',
        'store_purchase',
        paymentId,
        { before: oldStorePurchase, after: storePurchase },
        req
      );

      return NextResponse.json({ payment: storePurchase });
    }

    return NextResponse.json({ error: 'Transaction not found in records' }, { status: 404 });
  } catch (err: any) {
    console.error('Error updating payment:', err);
    return NextResponse.json({ error: err.message || 'Failed to update payment' }, { status: 500 });
  }
});

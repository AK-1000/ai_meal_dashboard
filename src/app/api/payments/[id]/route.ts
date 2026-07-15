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

    const { data: oldPayment } = await supabaseAdmin
      .from('payment_history')
      .select('*')
      .eq('id', paymentId)
      .single();

    if (!oldPayment) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
    }

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
  } catch (err: any) {
    console.error('Error updating payment:', err);
    return NextResponse.json({ error: err.message || 'Failed to update payment' }, { status: 500 });
  }
});

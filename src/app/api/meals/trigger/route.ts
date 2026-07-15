import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth, logAdminAction } from '@/lib/auth-helpers';

export const POST = withAdminAuth(async (req: NextRequest, admin) => {
  try {
    const { userId, height, weight, targetWeight, preferredDiet, country } = await req.json();

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Authorization token is required' }, { status: 401 });
    }

    const backendUrl = `${process.env.BACKEND_API_URL}/api/v1/nutrition/meal-plan`;
    
    const backendRes = await fetch(backendUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader
      },
      body: JSON.stringify({
        userId,
        height,
        weight,
        target_weight: targetWeight,
        diet_type: preferredDiet,
        country: country || 'US'
      })
    });

    const result = await backendRes.json();

    if (!backendRes.ok) {
      return NextResponse.json({ error: result.error || 'Backend failed to trigger generation' }, { status: backendRes.status });
    }

    await logAdminAction(
      admin.id,
      'meal_plan.trigger',
      'user',
      userId,
      { result },
      req
    );

    return NextResponse.json(result);
  } catch (err: any) {
    console.error('Error triggering meal plan:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
});

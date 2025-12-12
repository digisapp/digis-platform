import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe/config';

export async function GET(request: NextRequest) {
  try {
    const sessionId = request.nextUrl.searchParams.get('session_id');

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      );
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId);

    return NextResponse.json({
      status: session.status,
      paymentStatus: session.payment_status,
    });
  } catch (error: any) {
    console.error('Error retrieving session status:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to retrieve session status' },
      { status: 500 }
    );
  }
}

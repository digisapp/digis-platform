import { NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';

// GET /api/test-sentry - Test Sentry error reporting
export async function GET() {
  try {
    // Deliberately throw an error to test Sentry
    throw new Error('Test error from Digis - Sentry is working!');
  } catch (error) {
    // Capture and send to Sentry
    const eventId = Sentry.captureException(error);

    // Force flush to ensure event is sent
    await Sentry.flush(2000);

    return NextResponse.json({
      success: true,
      message: 'Test error sent to Sentry! Check your Sentry dashboard.',
      eventId,
    });
  }
}

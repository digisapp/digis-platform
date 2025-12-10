import { NextRequest, NextResponse } from 'next/server';
import { CallService } from '@/lib/services/call-service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface RouteContext {
  params: Promise<{
    creatorId: string;
  }>;
}

// GET - Get creator's call settings (public, for viewers)
export async function GET(req: NextRequest, context: RouteContext) {
  try {
    const params = await context.params;
    const creatorId = params.creatorId;

    // Get creator's call settings
    const settings = await CallService.getCreatorSettings(creatorId);

    // Return only the public-facing settings (not internal IDs, etc.)
    return NextResponse.json({
      settings: {
        callRatePerMinute: settings.callRatePerMinute,
        minimumCallDuration: settings.minimumCallDuration,
        voiceCallRatePerMinute: settings.voiceCallRatePerMinute,
        minimumVoiceCallDuration: settings.minimumVoiceCallDuration,
        isAvailableForCalls: settings.isAvailableForCalls,
        isAvailableForVoiceCalls: settings.isAvailableForVoiceCalls,
      },
    });
  } catch (error) {
    console.error('[creators/call-settings] GET Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch call settings' },
      { status: 500 }
    );
  }
}

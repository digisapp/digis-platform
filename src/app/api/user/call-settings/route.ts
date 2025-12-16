import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { CallService } from '@/lib/services/call-service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET - Get current user's call settings
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's call settings (creates defaults if none exist)
    const settings = await CallService.getCreatorSettings(user.id);

    return NextResponse.json({
      settings: {
        callRatePerMinute: settings.callRatePerMinute,
        minimumCallDuration: settings.minimumCallDuration,
        voiceCallRatePerMinute: settings.voiceCallRatePerMinute,
        minimumVoiceCallDuration: settings.minimumVoiceCallDuration,
        isAvailableForCalls: settings.isAvailableForCalls,
        isAvailableForVoiceCalls: settings.isAvailableForVoiceCalls,
        messageRate: settings.messageRate,
      },
    });
  } catch (error) {
    console.error('[user/call-settings] GET Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch call settings' },
      { status: 500 }
    );
  }
}

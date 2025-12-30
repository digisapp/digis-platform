import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/data/system';
import { aiTwinSettings } from '@/db/schema';
import { eq } from 'drizzle-orm';

export const runtime = 'nodejs';

/**
 * GET /api/ai/check/[creatorId]
 *
 * Check if a creator has AI Twin enabled (public endpoint)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ creatorId: string }> }
) {
  try {
    const { creatorId } = await params;

    const settings = await db.query.aiTwinSettings.findFirst({
      where: eq(aiTwinSettings.creatorId, creatorId),
    });

    // "enabled" = Voice AI Twin (shown as AI Twin button on profile)
    // Text chat is separate - it auto-responds through regular Chat
    return NextResponse.json({
      enabled: settings?.enabled || false,  // Voice only - for AI Twin button
      voiceEnabled: settings?.enabled || false,
      textEnabled: settings?.textChatEnabled || false,
      pricePerMinute: settings?.enabled ? settings.pricePerMinute : null,
      minimumMinutes: settings?.enabled ? settings.minimumMinutes : null,
      textPricePerMessage: settings?.textChatEnabled ? settings.textPricePerMessage : null,
    });
  } catch (error) {
    console.error('[AI Check] Error:', error);
    return NextResponse.json({ enabled: false }, { status: 200 });
  }
}

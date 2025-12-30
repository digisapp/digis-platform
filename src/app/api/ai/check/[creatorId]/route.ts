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

    // AI Twin is enabled if either voice chat OR text chat is enabled
    const isEnabled = settings?.enabled || settings?.textChatEnabled || false;

    return NextResponse.json({
      enabled: isEnabled,
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

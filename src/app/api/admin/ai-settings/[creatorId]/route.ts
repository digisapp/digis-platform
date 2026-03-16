import { NextResponse } from 'next/server';
import { db } from '@/lib/data/system';
import { aiTwinSettings } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { withAdminParams } from '@/lib/auth/withAdmin';

export const runtime = 'nodejs';

/**
 * GET /api/admin/ai-settings/[creatorId]
 * Get a creator's AI Twin settings (admin only)
 */
export const GET = withAdminParams<{ creatorId: string }>(async ({ params }) => {
  try {
    const { creatorId } = await params;

    // Get or create AI Twin settings for the creator
    let settings = await db.query.aiTwinSettings.findFirst({
      where: eq(aiTwinSettings.creatorId, creatorId),
    });

    if (!settings) {
      const [newSettings] = await db
        .insert(aiTwinSettings)
        .values({
          creatorId,
          enabled: false,
          voice: 'ara',
          pricePerMinute: 20,
          minimumMinutes: 5,
          maxSessionMinutes: 60,
        })
        .returning();

      settings = newSettings;
    }

    return NextResponse.json({ settings });
  } catch (error) {
    console.error('[ADMIN AI SETTINGS GET] Error:', error instanceof Error ? error.stack : error);
    return NextResponse.json({ error: 'Failed to get AI settings' }, { status: 500 });
  }
});

/**
 * PUT /api/admin/ai-settings/[creatorId]
 * Update a creator's AI Twin settings (admin only)
 */
export const PUT = withAdminParams<{ creatorId: string }>(async ({ params, request }) => {
  try {
    const { creatorId } = await params;

    const body = await request.json();
    const {
      enabled,
      textChatEnabled,
      voice,
      personalityPrompt,
      welcomeMessage,
      boundaryPrompt,
      pricePerMinute,
      minimumMinutes,
      maxSessionMinutes,
      textPricePerMessage,
    } = body;

    // Validate voice if provided
    const validVoices = ['ara', 'eve', 'mika', 'leo', 'rex', 'sal'];
    if (voice !== undefined && !validVoices.includes(voice)) {
      return NextResponse.json({ error: 'Invalid voice option' }, { status: 400 });
    }

    let settings = await db.query.aiTwinSettings.findFirst({
      where: eq(aiTwinSettings.creatorId, creatorId),
    });

    const updateData: Partial<typeof aiTwinSettings.$inferInsert> = {
      updatedAt: new Date(),
    };

    if (enabled !== undefined) updateData.enabled = enabled;
    if (textChatEnabled !== undefined) updateData.textChatEnabled = textChatEnabled;
    if (voice !== undefined) updateData.voice = voice;
    if (personalityPrompt !== undefined) updateData.personalityPrompt = personalityPrompt;
    if (welcomeMessage !== undefined) updateData.welcomeMessage = welcomeMessage;
    if (boundaryPrompt !== undefined) updateData.boundaryPrompt = boundaryPrompt;
    if (pricePerMinute !== undefined) updateData.pricePerMinute = pricePerMinute;
    if (minimumMinutes !== undefined) updateData.minimumMinutes = minimumMinutes;
    if (maxSessionMinutes !== undefined) updateData.maxSessionMinutes = maxSessionMinutes;
    if (textPricePerMessage !== undefined) updateData.textPricePerMessage = textPricePerMessage;

    if (settings) {
      const [updated] = await db
        .update(aiTwinSettings)
        .set(updateData)
        .where(eq(aiTwinSettings.creatorId, creatorId))
        .returning();

      settings = updated;
    } else {
      const [created] = await db
        .insert(aiTwinSettings)
        .values({
          creatorId,
          enabled: enabled || false,
          textChatEnabled: textChatEnabled || false,
          voice: voice || 'ara',
          personalityPrompt,
          welcomeMessage,
          boundaryPrompt,
          pricePerMinute: pricePerMinute || 20,
          minimumMinutes: minimumMinutes || 5,
          maxSessionMinutes: maxSessionMinutes || 60,
          textPricePerMessage: textPricePerMessage || 5,
        })
        .returning();

      settings = created;
    }

    return NextResponse.json({ settings });
  } catch (error: any) {
    console.error('[ADMIN AI SETTINGS UPDATE] Error:', error instanceof Error ? error.stack : error);
    return NextResponse.json(
      { error: 'Failed to update AI settings' },
      { status: 500 }
    );
  }
});

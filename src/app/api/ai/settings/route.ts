import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/data/system';
import { aiTwinSettings, users } from '@/db/schema';
import { eq } from 'drizzle-orm';

export const runtime = 'nodejs';

/**
 * GET /api/ai/settings
 *
 * Get the current creator's AI Twin settings
 */
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is a creator
    const profile = await db.query.users.findFirst({
      where: eq(users.id, user.id),
    });

    if (profile?.role !== 'creator') {
      return NextResponse.json(
        { error: 'Creator access required' },
        { status: 403 }
      );
    }

    // Get or create AI Twin settings
    let settings = await db.query.aiTwinSettings.findFirst({
      where: eq(aiTwinSettings.creatorId, user.id),
    });

    if (!settings) {
      // Create default settings
      const [newSettings] = await db
        .insert(aiTwinSettings)
        .values({
          creatorId: user.id,
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
    console.error('[AI Settings] Get error:', error);
    return NextResponse.json(
      { error: 'Failed to get AI settings' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/ai/settings
 *
 * Update the creator's AI Twin settings
 */
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is a creator
    const profile = await db.query.users.findFirst({
      where: eq(users.id, user.id),
    });

    if (profile?.role !== 'creator') {
      return NextResponse.json(
        { error: 'Creator access required' },
        { status: 403 }
      );
    }

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
    const validVoices = ['ara', 'eve', 'leo', 'rex', 'sal'];
    if (voice !== undefined && !validVoices.includes(voice)) {
      return NextResponse.json(
        { error: 'Invalid voice option' },
        { status: 400 }
      );
    }

    // Validate numeric fields
    if (pricePerMinute !== undefined && (pricePerMinute < 1 || pricePerMinute > 1000)) {
      return NextResponse.json(
        { error: 'Price per minute must be between 1 and 1000 coins' },
        { status: 400 }
      );
    }

    if (minimumMinutes !== undefined && (minimumMinutes < 1 || minimumMinutes > 30)) {
      return NextResponse.json(
        { error: 'Minimum minutes must be between 1 and 30' },
        { status: 400 }
      );
    }

    if (maxSessionMinutes !== undefined && (maxSessionMinutes < 5 || maxSessionMinutes > 120)) {
      return NextResponse.json(
        { error: 'Maximum session minutes must be between 5 and 120' },
        { status: 400 }
      );
    }

    if (textPricePerMessage !== undefined && (textPricePerMessage < 1 || textPricePerMessage > 100)) {
      return NextResponse.json(
        { error: 'Text price per message must be between 1 and 100 coins' },
        { status: 400 }
      );
    }

    // Get existing settings or create new ones
    let settings = await db.query.aiTwinSettings.findFirst({
      where: eq(aiTwinSettings.creatorId, user.id),
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
        .where(eq(aiTwinSettings.creatorId, user.id))
        .returning();

      settings = updated;
    } else {
      const [created] = await db
        .insert(aiTwinSettings)
        .values({
          creatorId: user.id,
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

  } catch (error) {
    console.error('[AI Settings] Update error:', error);
    return NextResponse.json(
      { error: 'Failed to update AI settings' },
      { status: 500 }
    );
  }
}

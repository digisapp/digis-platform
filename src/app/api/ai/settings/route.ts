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
      console.log('[AI Settings GET] Auth error or no user:', authError?.message);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is a creator
    const profile = await db.query.users.findFirst({
      where: eq(users.id, user.id),
    });

    console.log('[AI Settings GET] User check:', {
      userId: user.id,
      email: user.email,
      dbRole: profile?.role,
      username: profile?.username
    });

    if (profile?.role !== 'creator') {
      console.log('[AI Settings GET] Not a creator - access denied:', { userId: user.id, role: profile?.role });
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
      console.log('[AI Settings PUT] Auth error or no user:', authError?.message);
      return NextResponse.json({ error: 'Unauthorized - please log in again' }, { status: 401 });
    }

    // Check if user is a creator
    const profile = await db.query.users.findFirst({
      where: eq(users.id, user.id),
    });

    console.log('[AI Settings PUT] User check:', {
      userId: user.id,
      email: user.email,
      dbRole: profile?.role,
      username: profile?.username
    });

    if (!profile) {
      console.log('[AI Settings PUT] User profile not found:', { userId: user.id });
      return NextResponse.json(
        { error: 'User profile not found. Please contact support.' },
        { status: 404 }
      );
    }

    if (profile.role !== 'creator') {
      console.log('[AI Settings PUT] Not a creator - access denied:', { userId: user.id, role: profile?.role });
      return NextResponse.json(
        { error: 'Creator access required. Your role is: ' + profile.role },
        { status: 403 }
      );
    }

    let body;
    try {
      body = await request.json();
    } catch (parseError) {
      console.log('[AI Settings PUT] Failed to parse request body:', parseError);
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    console.log('[AI Settings PUT] Request body:', body);
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
      // Knowledge Base fields
      knowledgeLocation,
      knowledgeExpertise,
      knowledgeBase,
    } = body;

    // Validate voice if provided
    const validVoices = ['ara', 'eve', 'mika', 'leo', 'rex', 'sal'];
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
    // Knowledge Base fields
    if (knowledgeLocation !== undefined) updateData.knowledgeLocation = knowledgeLocation;
    if (knowledgeExpertise !== undefined) updateData.knowledgeExpertise = knowledgeExpertise;
    if (knowledgeBase !== undefined) updateData.knowledgeBase = knowledgeBase;

    console.log('[AI Settings PUT] Update data:', updateData);

    if (settings) {
      console.log('[AI Settings PUT] Updating existing settings for:', profile.username);
      const [updated] = await db
        .update(aiTwinSettings)
        .set(updateData)
        .where(eq(aiTwinSettings.creatorId, user.id))
        .returning();

      settings = updated;
      console.log('[AI Settings PUT] Updated successfully:', {
        enabled: settings.enabled,
        textChatEnabled: settings.textChatEnabled,
      });
    } else {
      console.log('[AI Settings PUT] Creating new settings for:', profile.username);
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
      console.log('[AI Settings PUT] Created successfully:', {
        enabled: settings.enabled,
        textChatEnabled: settings.textChatEnabled,
      });
    }

    return NextResponse.json({
      settings,
      message: 'Settings saved successfully',
    });

  } catch (error: any) {
    console.error('[AI Settings PUT] Update error:', {
      message: error?.message,
      code: error?.code,
      stack: error?.stack?.slice(0, 500)
    });
    return NextResponse.json(
      { error: 'Failed to update AI settings', details: error?.message },
      { status: 500 }
    );
  }
}

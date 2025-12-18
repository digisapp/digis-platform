import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/data/system';
import { aiTwinSettings, wallets } from '@/db/schema';
import { eq } from 'drizzle-orm';

export const runtime = 'nodejs';

const XAI_API_KEY = process.env.XAI_API_KEY;
const XAI_CLIENT_SECRETS_URL = 'https://api.x.ai/v1/realtime/client_secrets';

/**
 * POST /api/ai/token
 *
 * Fetches an ephemeral token from xAI for client-side WebSocket connection.
 * This token is short-lived (5 minutes) and scoped to the session.
 *
 * Request body:
 * - creatorId: string - The creator whose AI Twin to connect to
 *
 * Returns:
 * - client_secret: object - The ephemeral token from xAI
 * - settings: object - The creator's AI Twin settings
 * - sessionConfig: object - Pre-configured session settings for the client
 */
export async function POST(request: NextRequest) {
  try {
    // Check for xAI API key
    if (!XAI_API_KEY) {
      console.error('[AI Token] XAI_API_KEY not configured');
      return NextResponse.json(
        { error: 'AI service not configured' },
        { status: 503 }
      );
    }

    // Authenticate user
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request
    const body = await request.json();
    const { creatorId } = body;

    if (!creatorId) {
      return NextResponse.json(
        { error: 'creatorId is required' },
        { status: 400 }
      );
    }

    // Get creator's AI Twin settings
    const settings = await db.query.aiTwinSettings.findFirst({
      where: eq(aiTwinSettings.creatorId, creatorId),
    });

    if (!settings || !settings.enabled) {
      return NextResponse.json(
        { error: 'AI Twin not available for this creator' },
        { status: 404 }
      );
    }

    // Check if fan has enough coins for minimum session
    const minCost = settings.pricePerMinute * settings.minimumMinutes;
    const wallet = await db.query.wallets.findFirst({
      where: eq(wallets.userId, user.id),
    });

    if (!wallet || wallet.balance < minCost) {
      return NextResponse.json(
        {
          error: 'Insufficient coins',
          required: minCost,
          balance: wallet?.balance || 0,
          minimumMinutes: settings.minimumMinutes,
          pricePerMinute: settings.pricePerMinute,
        },
        { status: 402 }
      );
    }

    // Fetch ephemeral token from xAI
    const tokenResponse = await fetch(XAI_CLIENT_SECRETS_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${XAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        expires_after: { seconds: 300 }, // 5 minute token
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('[AI Token] xAI API error:', tokenResponse.status, errorText);
      return NextResponse.json(
        { error: 'Failed to initialize AI session', details: errorText },
        { status: 502 }
      );
    }

    const tokenData = await tokenResponse.json();
    console.log('[AI Token] xAI response:', JSON.stringify(tokenData, null, 2));

    // xAI returns { value: "token...", expires_at: ... } directly
    if (!tokenData.value) {
      console.error('[AI Token] No token value in response:', tokenData);
      return NextResponse.json(
        { error: 'Invalid token from AI service' },
        { status: 502 }
      );
    }

    // Build session configuration for the client
    const sessionConfig = {
      voice: settings.voice.charAt(0).toUpperCase() + settings.voice.slice(1), // Capitalize: ara -> Ara
      instructions: buildSystemPrompt(settings),
      turn_detection: { type: 'server_vad' },
      audio: {
        input: { format: { type: 'audio/pcm', rate: 24000 } },
        output: { format: { type: 'audio/pcm', rate: 24000 } },
      },
      tools: [
        { type: 'web_search' },
        {
          type: 'function',
          name: 'get_creator_schedule',
          description: 'Get when the creator will be live streaming next',
          parameters: {
            type: 'object',
            properties: {},
            required: [],
          },
        },
        {
          type: 'function',
          name: 'check_subscription',
          description: 'Check if the fan is subscribed to the creator',
          parameters: {
            type: 'object',
            properties: {},
            required: [],
          },
        },
      ],
    };

    return NextResponse.json({
      // Normalize the token structure for the client
      client_secret: {
        value: tokenData.value,
        expires_at: tokenData.expires_at,
      },
      settings: {
        pricePerMinute: settings.pricePerMinute,
        minimumMinutes: settings.minimumMinutes,
        maxSessionMinutes: settings.maxSessionMinutes,
        voice: settings.voice,
        welcomeMessage: settings.welcomeMessage,
      },
      sessionConfig,
    });

  } catch (error) {
    console.error('[AI Token] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Build the system prompt for the AI Twin based on creator settings
 */
function buildSystemPrompt(settings: typeof aiTwinSettings.$inferSelect): string {
  const parts: string[] = [];

  // Base instructions
  parts.push(`You are an AI companion representing a content creator on Digis, a creator platform.`);
  parts.push(`You're having a real-time voice conversation with a fan who paid to chat with you.`);
  parts.push(`Be warm, engaging, and personable. Use natural speech patterns.`);
  parts.push(`You can occasionally use expressions like [laugh], [sigh], or [whisper] for emphasis.`);

  // Creator's personality
  if (settings.personalityPrompt) {
    parts.push(`\nYour personality and style:\n${settings.personalityPrompt}`);
  }

  // Boundaries
  if (settings.boundaryPrompt) {
    parts.push(`\nImportant boundaries - things you should NOT discuss or do:\n${settings.boundaryPrompt}`);
  }

  // General guidelines
  parts.push(`\nGuidelines:`);
  parts.push(`- Keep responses conversational and not too long`);
  parts.push(`- Be friendly and make the fan feel special`);
  parts.push(`- If asked about scheduling or subscription, use the available tools`);
  parts.push(`- Never share personal contact information or try to move conversation off-platform`);
  parts.push(`- If you don't know something specific about the creator, say so naturally`);

  return parts.join('\n');
}

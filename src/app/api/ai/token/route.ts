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
  const startTime = Date.now();
  console.log('[AI Token] Request started');

  try {
    // Check for xAI API key
    if (!XAI_API_KEY) {
      console.error('[AI Token] ERROR: XAI_API_KEY environment variable not configured');
      return NextResponse.json(
        { error: 'AI service not configured. Please contact support.', code: 'XAI_KEY_MISSING' },
        { status: 503 }
      );
    }

    // Authenticate user
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError) {
      console.error('[AI Token] Auth error:', authError.message);
      return NextResponse.json({ error: 'Authentication failed', code: 'AUTH_ERROR', details: authError.message }, { status: 401 });
    }

    if (!user) {
      console.log('[AI Token] No authenticated user');
      return NextResponse.json({ error: 'Please sign in to use AI Twin', code: 'NOT_AUTHENTICATED' }, { status: 401 });
    }

    console.log('[AI Token] User authenticated:', user.id);

    // Parse request
    let body;
    try {
      body = await request.json();
    } catch (parseError) {
      console.error('[AI Token] Failed to parse request body:', parseError);
      return NextResponse.json(
        { error: 'Invalid request body', code: 'INVALID_REQUEST' },
        { status: 400 }
      );
    }

    const { creatorId } = body;

    if (!creatorId) {
      console.log('[AI Token] Missing creatorId in request');
      return NextResponse.json(
        { error: 'Creator ID is required', code: 'MISSING_CREATOR_ID' },
        { status: 400 }
      );
    }

    console.log('[AI Token] Looking up AI Twin settings for creator:', creatorId);

    // Get creator's AI Twin settings
    const settings = await db.query.aiTwinSettings.findFirst({
      where: eq(aiTwinSettings.creatorId, creatorId),
    });

    if (!settings) {
      console.log('[AI Token] No AI Twin settings found for creator:', creatorId);
      return NextResponse.json(
        { error: 'This creator has not set up their AI Twin yet', code: 'NO_AI_SETTINGS' },
        { status: 404 }
      );
    }

    if (!settings.enabled) {
      console.log('[AI Token] AI Twin is disabled for creator:', creatorId);
      return NextResponse.json(
        { error: 'This creator has disabled their AI Twin', code: 'AI_DISABLED' },
        { status: 404 }
      );
    }

    console.log('[AI Token] AI Twin enabled, checking balance. Price:', settings.pricePerMinute, 'coins/min, Min:', settings.minimumMinutes, 'min');

    // Check if fan has enough coins for minimum session
    const minCost = settings.pricePerMinute * settings.minimumMinutes;
    const wallet = await db.query.wallets.findFirst({
      where: eq(wallets.userId, user.id),
    });

    const currentBalance = wallet?.balance || 0;
    console.log('[AI Token] User balance:', currentBalance, 'Required:', minCost);

    if (currentBalance < minCost) {
      console.log('[AI Token] Insufficient balance for user:', user.id);
      return NextResponse.json(
        {
          error: 'Insufficient coins for minimum session',
          code: 'INSUFFICIENT_BALANCE',
          required: minCost,
          balance: currentBalance,
          minimumMinutes: settings.minimumMinutes,
          pricePerMinute: settings.pricePerMinute,
        },
        { status: 402 }
      );
    }

    console.log('[AI Token] Balance check passed, fetching xAI ephemeral token...');

    // Fetch ephemeral token from xAI
    let tokenResponse;
    try {
      tokenResponse = await fetch(XAI_CLIENT_SECRETS_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${XAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          expires_after: { seconds: 300 }, // 5 minute token
        }),
      });
    } catch (fetchError: any) {
      console.error('[AI Token] Network error calling xAI API:', fetchError.message);
      return NextResponse.json(
        { error: 'Could not connect to AI service. Please try again.', code: 'XAI_NETWORK_ERROR', details: fetchError.message },
        { status: 502 }
      );
    }

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('[AI Token] xAI API error:', {
        status: tokenResponse.status,
        statusText: tokenResponse.statusText,
        body: errorText,
      });
      return NextResponse.json(
        {
          error: 'AI service temporarily unavailable. Please try again.',
          code: 'XAI_API_ERROR',
          status: tokenResponse.status,
          details: errorText.substring(0, 200) // Limit error details length
        },
        { status: 502 }
      );
    }

    let tokenData;
    try {
      tokenData = await tokenResponse.json();
    } catch (jsonError) {
      console.error('[AI Token] Failed to parse xAI response:', jsonError);
      return NextResponse.json(
        { error: 'Invalid response from AI service', code: 'XAI_INVALID_RESPONSE' },
        { status: 502 }
      );
    }

    console.log('[AI Token] xAI response received:', {
      hasValue: !!tokenData.value,
      expiresAt: tokenData.expires_at,
    });

    // xAI returns { value: "token...", expires_at: ... } directly
    if (!tokenData.value) {
      console.error('[AI Token] No token value in response:', JSON.stringify(tokenData));
      return NextResponse.json(
        { error: 'AI service returned invalid token', code: 'XAI_NO_TOKEN', responseKeys: Object.keys(tokenData) },
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

    const elapsed = Date.now() - startTime;
    console.log('[AI Token] Success! Token generated in', elapsed, 'ms');

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

  } catch (error: any) {
    const elapsed = Date.now() - startTime;
    console.error('[AI Token] Unhandled error after', elapsed, 'ms:', {
      message: error.message,
      stack: error.stack,
    });
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.', code: 'INTERNAL_ERROR', details: error.message },
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

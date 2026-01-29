import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/data/system';
import { users, creatorSettings, aiTwinSettings } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { buildContextualPrompt } from '@/lib/coach/prompts';
import type { CoachMessage } from '@/lib/coach/types';

export const runtime = 'nodejs';

/**
 * POST /api/creator/coach/chat
 *
 * Send a message to the Creator Success Coach and get an AI response.
 * Free for creators - no coin charge.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { message, history } = await request.json() as {
      message: string;
      history?: CoachMessage[];
    };

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    // Get creator profile with settings for context
    const [creator, settings, aiSettings] = await Promise.all([
      db.query.users.findFirst({
        where: eq(users.id, user.id),
      }),
      db.query.creatorSettings.findFirst({
        where: eq(creatorSettings.userId, user.id),
      }),
      db.query.aiTwinSettings.findFirst({
        where: eq(aiTwinSettings.creatorId, user.id),
      }),
    ]);

    // Check if user is a creator
    if (creator?.role !== 'creator') {
      return NextResponse.json(
        { error: 'Creator access required' },
        { status: 403 }
      );
    }

    // Build contextual system prompt with all their data
    const systemPrompt = buildContextualPrompt({
      // Profile
      username: creator.username || undefined,
      displayName: creator.displayName || undefined,
      primaryCategory: creator.primaryCategory || undefined,
      followerCount: creator.followerCount || 0,
      hasAvatar: !!creator.avatarUrl,
      // Pricing settings
      messageRate: settings?.messageRate ?? 3,
      videoCallRate: settings?.callRatePerMinute ?? 25,
      voiceCallRate: settings?.voiceCallRatePerMinute ?? 15,
      minimumCallDuration: settings?.minimumCallDuration ?? 5,
      isAvailableForCalls: settings?.isAvailableForCalls ?? false,
      isAvailableForVoiceCalls: settings?.isAvailableForVoiceCalls ?? false,
      // AI Twin
      aiTwinEnabled: aiSettings?.enabled ?? false,
      aiTwinTextEnabled: aiSettings?.textChatEnabled ?? false,
      aiTwinPricePerMinute: aiSettings?.pricePerMinute ?? 20,
    });

    // Build conversation history for context
    const conversationMessages: { role: 'system' | 'user' | 'assistant'; content: string }[] = [
      { role: 'system', content: systemPrompt }
    ];

    // Add recent history (last 10 messages max for context window)
    if (history && Array.isArray(history)) {
      const recentHistory = history.slice(-10);
      for (const msg of recentHistory) {
        if (msg.role === 'user' || msg.role === 'assistant') {
          conversationMessages.push({
            role: msg.role,
            content: msg.content
          });
        }
      }
    }

    // Add current message
    conversationMessages.push({ role: 'user', content: message });

    // Call xAI API
    const aiResponse = await callXaiApi(conversationMessages);

    if (!aiResponse) {
      return NextResponse.json(
        { error: 'Failed to get AI response' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      reply: aiResponse,
      suggestions: generateSuggestions(message, aiResponse)
    });

  } catch (error: any) {
    console.error('[Coach Chat] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to process chat request' },
      { status: 500 }
    );
  }
}

/**
 * Call xAI API for chat completion
 */
async function callXaiApi(
  messages: { role: 'system' | 'user' | 'assistant'; content: string }[]
): Promise<string | null> {
  const apiKey = process.env.XAI_API_KEY;
  const timeoutMs = parseInt(process.env.XAI_API_TIMEOUT_MS || '30000', 10);

  if (!apiKey) {
    console.error('[Coach Chat] XAI_API_KEY not configured');
    throw new Error('AI service not configured');
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    const response = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'grok-3-mini',
        messages,
        max_tokens: 800,
        temperature: 0.7,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Coach Chat] xAI API error:', response.status, errorText);
      throw new Error('AI service error');
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || null;

  } catch (error: any) {
    if (error.name === 'AbortError') {
      console.error('[Coach Chat] xAI API timeout');
      throw new Error('AI response timed out');
    }
    throw error;
  }
}

/**
 * Generate follow-up suggestions based on the conversation
 */
function generateSuggestions(userMessage: string, aiResponse: string): string[] {
  const suggestions: string[] = [];
  const lowerMessage = userMessage.toLowerCase();
  const lowerResponse = aiResponse.toLowerCase();

  // Based on what was discussed, suggest relevant follow-ups
  if (lowerMessage.includes('stream') || lowerResponse.includes('stream')) {
    if (!lowerMessage.includes('idea')) {
      suggestions.push('Give me stream ideas');
    }
    if (!lowerMessage.includes('goal')) {
      suggestions.push('How do stream goals work?');
    }
  }

  if (lowerMessage.includes('price') || lowerMessage.includes('charge') || lowerResponse.includes('pricing')) {
    if (!lowerMessage.includes('call')) {
      suggestions.push('What should I charge for calls?');
    }
  }

  if (lowerMessage.includes('grow') || lowerMessage.includes('follower') || lowerResponse.includes('audience')) {
    suggestions.push('How do I promote my Digis?');
  }

  if (lowerMessage.includes('script') || lowerResponse.includes('promo')) {
    suggestions.push('Generate a promo script');
  }

  // Default suggestions if none matched
  if (suggestions.length === 0) {
    suggestions.push('Generate a promo script');
    suggestions.push('Stream ideas for this week');
  }

  return suggestions.slice(0, 3);
}

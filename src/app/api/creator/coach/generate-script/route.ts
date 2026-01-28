import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/data/system';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { buildScriptPrompt } from '@/lib/coach/prompts';
import type { ScriptRequest } from '@/lib/coach/types';

export const runtime = 'nodejs';

/**
 * POST /api/creator/coach/generate-script
 *
 * Generate a promotional script based on niche, length, and vibe.
 * Free for creators - no coin charge.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json() as ScriptRequest;
    const { niche, length, vibe } = body;

    // Validate inputs
    if (!niche || typeof niche !== 'string') {
      return NextResponse.json(
        { error: 'Niche is required' },
        { status: 400 }
      );
    }

    if (!['10sec', '30sec', 'full'].includes(length)) {
      return NextResponse.json(
        { error: 'Invalid length. Must be 10sec, 30sec, or full' },
        { status: 400 }
      );
    }

    if (!['gen-z', 'professional', 'luxury'].includes(vibe)) {
      return NextResponse.json(
        { error: 'Invalid vibe. Must be gen-z, professional, or luxury' },
        { status: 400 }
      );
    }

    // Get creator profile
    const creator = await db.query.users.findFirst({
      where: eq(users.id, user.id),
    });

    // Check if user is a creator
    if (creator?.role !== 'creator') {
      return NextResponse.json(
        { error: 'Creator access required' },
        { status: 403 }
      );
    }

    // Build the script generation prompt
    const scriptPrompt = buildScriptPrompt(niche, length, vibe);

    // Call xAI API
    const generatedScript = await callXaiApi(scriptPrompt);

    if (!generatedScript) {
      return NextResponse.json(
        { error: 'Failed to generate script' },
        { status: 500 }
      );
    }

    // Generate tips based on the script type
    const tips = generateTips(niche, length, vibe);

    return NextResponse.json({
      script: generatedScript.trim(),
      tips
    });

  } catch (error: any) {
    console.error('[Script Generator] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate script' },
      { status: 500 }
    );
  }
}

/**
 * Call xAI API for script generation
 */
async function callXaiApi(prompt: string): Promise<string | null> {
  const apiKey = process.env.XAI_API_KEY;
  const timeoutMs = parseInt(process.env.XAI_API_TIMEOUT_MS || '30000', 10);

  if (!apiKey) {
    console.error('[Script Generator] XAI_API_KEY not configured');
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
        messages: [
          {
            role: 'system',
            content: 'You are an expert social media copywriter who creates engaging promotional scripts for content creators. You understand platform-specific content and know how to hook audiences quickly.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 500,
        temperature: 0.8, // Slightly higher for creative output
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Script Generator] xAI API error:', response.status, errorText);
      throw new Error('AI service error');
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || null;

  } catch (error: any) {
    if (error.name === 'AbortError') {
      console.error('[Script Generator] xAI API timeout');
      throw new Error('Script generation timed out');
    }
    throw error;
  }
}

/**
 * Generate helpful tips based on script parameters
 */
function generateTips(
  niche: string,
  length: '10sec' | '30sec' | 'full',
  vibe: 'gen-z' | 'professional' | 'luxury'
): string[] {
  const tips: string[] = [];

  // Length-specific tips
  if (length === '10sec') {
    tips.push('Perfect for TikTok and Instagram Reels - post during peak hours (6-9 PM)');
    tips.push('Use trending sounds to boost reach');
  } else if (length === '30sec') {
    tips.push('Great for YouTube Shorts and Instagram');
    tips.push('Add captions for viewers watching without sound');
  } else {
    tips.push('Consider breaking this into a carousel or multi-part series');
    tips.push('Use this as your pinned video or channel trailer');
  }

  // Vibe-specific tips
  if (vibe === 'gen-z') {
    tips.push('Film in natural lighting and keep it casual - authenticity wins');
  } else if (vibe === 'professional') {
    tips.push('Consider recording in a clean, well-lit space for credibility');
  } else {
    tips.push('Use quality lighting and a premium backdrop to match the vibe');
  }

  // General tips
  tips.push('Link your Digis profile in your bio and mention it in captions');

  return tips.slice(0, 4);
}

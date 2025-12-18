import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/data/system';
import { aiTwinSettings, users } from '@/db/schema';
import { eq } from 'drizzle-orm';

export const runtime = 'nodejs';

/**
 * GET /api/ai/test-text
 * Test endpoint to verify AI text chat is working
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is a creator with text chat enabled
    const aiSettings = await db.query.aiTwinSettings.findFirst({
      where: eq(aiTwinSettings.creatorId, user.id),
    });

    const creator = await db.query.users.findFirst({
      where: eq(users.id, user.id),
    });

    // Check xAI API key
    const hasXaiKey = !!process.env.XAI_API_KEY;
    const xaiKeyPreview = process.env.XAI_API_KEY
      ? `${process.env.XAI_API_KEY.substring(0, 8)}...`
      : 'NOT SET';

    // Test xAI API if key exists
    let xaiTestResult = null;
    if (hasXaiKey) {
      try {
        const response = await fetch('https://api.x.ai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.XAI_API_KEY}`,
          },
          body: JSON.stringify({
            model: 'grok-beta',
            messages: [
              { role: 'user', content: 'Say "AI Text Chat is working!" in 5 words or less.' },
            ],
            max_tokens: 20,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          xaiTestResult = {
            success: true,
            response: data.choices?.[0]?.message?.content || 'No content',
          };
        } else {
          const errorText = await response.text();
          xaiTestResult = {
            success: false,
            error: `API Error ${response.status}: ${errorText.substring(0, 200)}`,
          };
        }
      } catch (err: any) {
        xaiTestResult = {
          success: false,
          error: err.message,
        };
      }
    }

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
      },
      creator: creator ? {
        id: creator.id,
        username: creator.username,
        role: creator.role,
      } : null,
      aiSettings: aiSettings ? {
        creatorId: aiSettings.creatorId,
        enabled: aiSettings.enabled,
        textChatEnabled: aiSettings.textChatEnabled,
      } : null,
      xaiConfig: {
        hasKey: hasXaiKey,
        keyPreview: xaiKeyPreview,
        testResult: xaiTestResult,
      },
      diagnosis: {
        hasAiSettings: !!aiSettings,
        textChatEnabled: aiSettings?.textChatEnabled || false,
        xaiKeyConfigured: hasXaiKey,
        xaiWorking: xaiTestResult?.success || false,
        ready: !!(aiSettings?.textChatEnabled && hasXaiKey && xaiTestResult?.success),
      },
    });
  } catch (error: any) {
    console.error('[AI Test] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Creator Success Coach Prompts

/**
 * Main system prompt for the Creator Success Coach
 * Contains comprehensive knowledge about Digis platform features
 */
export const COACH_SYSTEM_PROMPT = `You are the Digis Creator Success Coach, an AI assistant helping creators maximize their success on the Digis platform.

## Your Role
- Help creators understand and use platform features
- Generate promotional scripts for social media
- Provide personalized recommendations based on creator data
- Answer questions about streaming, pricing, and engagement
- Be encouraging and supportive of creator goals

## Platform Features You Know About

### 1. Live Streaming
- Portrait or landscape modes
- Real-time chat with viewers
- Remote control from phone (scan QR code)
- Stream goals with progress bars
- Polls and timers for engagement
- Virtual gifts appear as animations on screen

### 2. VIP Shows
- Ticketed exclusive content with limited seats
- Set ticket price and max attendees
- Great for special events, classes, performances

### 3. Video Calls
- Private 1-on-1 paid calls with fans
- Per-minute pricing (you set your rate)
- Minimum call duration settings
- Calendar integration for scheduling

### 4. Voice Calls
- Audio-only calls (lower price point option)
- Same per-minute pricing model

### 5. Paid Messages (DMs)
- Charge per message fans send you
- Minimum 3 coins per message
- Great passive income from engaged fans

### 6. Virtual Gifts
- Animated gifts fans send during streams
- 4 rarity levels: Common, Rare, Epic, Legendary
- Appear as animations on your stream
- You earn the coin value of each gift

### 7. Coin Tips
- Fans can tip any coin amount directly
- No animation, just pure support
- Can include a message with tips

### 8. Creator Menu
- Custom menu items fans can purchase
- Add emojis, descriptions, and prices
- Great for custom requests, shoutouts, etc.

### 9. AI Twin
- Your AI clone that chats with fans 24/7
- Voice calls and text messages
- Earns while you sleep
- Customizable personality and boundaries

### 10. Content Posts
- Photos, videos, galleries
- Free or paid content
- Fans can purchase with coins

## Pricing (MEMORIZE THESE DEFAULTS)
- 10 coins = $1.00 USD
- Creators keep 100% of coins received

### Platform Defaults
- Paid Messages: 3 coins/msg ($0.30) - this is the minimum
- Video Calls: 25 coins/min ($2.50/min)
- Voice Calls: 15 coins/min ($1.50/min)
- Minimum call duration: 5 minutes

### What Successful Creators Charge (Platform Averages)
Based on platform data, here's what works:

**Messages:**
- New creators: 3-5 coins ($0.30-$0.50)
- Growing creators: 5-15 coins ($0.50-$1.50)
- Top creators: 15-50 coins ($1.50-$5.00)

**Video Calls:**
- New creators: 15-25 coins/min ($1.50-$2.50)
- Growing creators: 25-50 coins/min ($2.50-$5.00)
- Top creators: 50-100 coins/min ($5-$10)

**Voice Calls:**
- Typically 30-50% less than video calls
- New: 10-15 coins/min, Growing: 15-30, Top: 30-60

**Content Posts:**
- Teasers: Free (builds audience)
- Standard: 20-100 coins ($2-$10)
- Premium/Exclusive: 100-500 coins ($10-$50)

### Quick Pricing Rules
- Start at defaults, raise as demand increases
- If calls aren't booking, lower price
- If too many calls, raise price
- Messages at 3 coins = maximum engagement
- Higher prices = fewer but more committed fans

## Response Style
- ALWAYS respond in the same language the creator uses (if they write in Spanish, respond in Spanish; Portuguese, respond in Portuguese; etc.)
- Be sweet, fun, and encouraging
- Get to the point fast - no fluff
- Max 2 short paragraphs per response
- Give specific numbers, not ranges when possible
- Use 1-2 emojis max, keep it professional
- Be direct: "Try 25 coins/min" not "Consider exploring rates between..."

## Boundaries (CRITICAL)
- NEVER mention or discuss other creators by name
- NEVER compare them to specific creators
- Only use aggregate "platform data" for pricing guidance
- Never give financial, legal, or medical advice
- Don't promise specific earnings
- Don't discuss competitor platforms`;

/**
 * Build contextual prompt with creator-specific data
 */
export function buildContextualPrompt(creatorData?: {
  username?: string;
  displayName?: string;
  primaryCategory?: string;
  followerCount?: number;
  hasAvatar?: boolean;
  // Creator settings
  messageRate?: number;
  videoCallRate?: number;
  voiceCallRate?: number;
  minimumCallDuration?: number;
  isAvailableForCalls?: boolean;
  isAvailableForVoiceCalls?: boolean;
  // AI Twin
  aiTwinEnabled?: boolean;
  aiTwinTextEnabled?: boolean;
  aiTwinPricePerMinute?: number;
  // Stats
  totalEarnings?: number;
  monthlyEarnings?: number;
  totalCalls?: number;
  totalMessages?: number;
}): string {
  let prompt = COACH_SYSTEM_PROMPT;

  if (creatorData) {
    prompt += `\n\n## THIS CREATOR'S PROFILE`;
    if (creatorData.displayName) {
      prompt += `\n- Name: ${creatorData.displayName}`;
    }
    if (creatorData.username) {
      prompt += `\n- Username: @${creatorData.username}`;
    }
    if (creatorData.primaryCategory) {
      prompt += `\n- Category: ${creatorData.primaryCategory}`;
    }
    if (creatorData.followerCount !== undefined) {
      prompt += `\n- Followers: ${creatorData.followerCount}`;
    }

    // Current pricing settings
    prompt += `\n\n## THIS CREATOR'S CURRENT SETTINGS`;
    if (creatorData.messageRate !== undefined) {
      prompt += `\n- Message Rate: ${creatorData.messageRate} coins ($${(creatorData.messageRate / 10).toFixed(2)}/msg)`;
    }
    if (creatorData.videoCallRate !== undefined) {
      prompt += `\n- Video Call Rate: ${creatorData.videoCallRate} coins/min ($${(creatorData.videoCallRate / 10).toFixed(2)}/min)`;
      prompt += `\n- Video Calls: ${creatorData.isAvailableForCalls ? 'ENABLED' : 'DISABLED'}`;
    }
    if (creatorData.voiceCallRate !== undefined) {
      prompt += `\n- Voice Call Rate: ${creatorData.voiceCallRate} coins/min ($${(creatorData.voiceCallRate / 10).toFixed(2)}/min)`;
      prompt += `\n- Voice Calls: ${creatorData.isAvailableForVoiceCalls ? 'ENABLED' : 'DISABLED'}`;
    }
    if (creatorData.minimumCallDuration !== undefined) {
      prompt += `\n- Min Call Duration: ${creatorData.minimumCallDuration} minutes`;
    }

    // AI Twin
    if (creatorData.aiTwinEnabled !== undefined) {
      prompt += `\n- AI Twin: ${creatorData.aiTwinEnabled ? 'ENABLED' : 'DISABLED'}`;
      if (creatorData.aiTwinEnabled && creatorData.aiTwinPricePerMinute) {
        prompt += ` (${creatorData.aiTwinPricePerMinute} coins/min)`;
      }
    }

    // Stats if available
    if (creatorData.totalEarnings !== undefined || creatorData.monthlyEarnings !== undefined) {
      prompt += `\n\n## THIS CREATOR'S STATS`;
      if (creatorData.monthlyEarnings !== undefined) {
        prompt += `\n- This Month: ${creatorData.monthlyEarnings} coins ($${(creatorData.monthlyEarnings / 10).toFixed(2)})`;
      }
      if (creatorData.totalEarnings !== undefined) {
        prompt += `\n- All Time: ${creatorData.totalEarnings} coins ($${(creatorData.totalEarnings / 10).toFixed(2)})`;
      }
      if (creatorData.totalCalls !== undefined) {
        prompt += `\n- Total Calls: ${creatorData.totalCalls}`;
      }
      if (creatorData.totalMessages !== undefined) {
        prompt += `\n- Total Messages: ${creatorData.totalMessages}`;
      }
    }

    // Add coaching notes based on their data
    const notes: string[] = [];

    if (!creatorData.hasAvatar) {
      notes.push('Suggest uploading a profile picture');
    }
    if (!creatorData.primaryCategory) {
      notes.push('Suggest setting a category for discovery');
    }
    if (creatorData.followerCount !== undefined && creatorData.followerCount < 50) {
      notes.push('New creator - focus on growth and promotion');
    }
    if (creatorData.isAvailableForCalls === false) {
      notes.push('Video calls disabled - could suggest enabling');
    }
    if (creatorData.aiTwinEnabled === false) {
      notes.push('AI Twin disabled - could suggest enabling for passive income');
    }
    if (creatorData.messageRate === 3) {
      notes.push('Using minimum message rate - fine for growth, can increase later');
    }

    if (notes.length > 0) {
      prompt += `\n\n## COACHING OPPORTUNITIES\n${notes.map(n => `- ${n}`).join('\n')}`;
    }
  }

  return prompt;
}

/**
 * Script generation prompt template
 */
export function buildScriptPrompt(
  niche: string,
  length: '10sec' | '30sec' | 'full',
  vibe: 'gen-z' | 'professional' | 'luxury'
): string {
  const lengthGuidelines = {
    '10sec': '~30 words, single powerful hook + clear CTA',
    '30sec': '~75 words, hook + value proposition + CTA',
    'full': '~150-200 words, hook + story/context + value + CTA'
  };

  const vibeGuidelines = {
    'gen-z': 'Use trendy language, casual slang, high energy, relatable humor. Words like "bestie", "hits different", "no cap". Include relevant emojis.',
    'professional': 'Use polished, confident language. Clear value proposition. Establish authority and expertise. Professional but approachable.',
    'luxury': 'Use sophisticated, exclusive language. Premium positioning. Words like "curated", "exclusive", "elevated". Create sense of exclusivity.'
  };

  return `Generate a ${length} promotional script for a ${niche} creator on Digis.

## Vibe: ${vibe}
${vibeGuidelines[vibe]}

## Script Requirements
- Strong hook in the first 2-3 seconds to stop the scroll
- Mention key Digis features naturally (live streams, tips, gifts, video calls)
- Include a clear CTA (follow, join live, send gifts, book a call)
- Reference the creator's ${niche} niche authentically
- Make it feel genuine, not salesy

## Platform CTAs to Weave In (choose 1-2)
- "Catch me live on Digis"
- "Send me a gift during my stream"
- "Book a private video call with me"
- "Join my VIP show"
- "Drop me a tip and I'll shout you out"

## Length Guidelines
${lengthGuidelines[length]}

## Important
- Output ONLY the script text
- No stage directions or brackets
- Ready to read aloud or use as captions
- Make it sound natural, like the creator is talking to their audience`;
}

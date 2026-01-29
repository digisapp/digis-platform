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

## Pricing Context
- 10 coins = $1.00 USD
- Fans purchase coins, you earn from tips/gifts/calls/messages
- Platform takes 20% fee, creators keep 80%

### Default Rates (creators can adjust)
- Paid Messages: 3 coins minimum ($0.30/msg) - up to 50+ coins for premium creators
- Video Calls: Default 25 coins/min ($2.50/min) - range from 15-100 coins/min based on demand
- Voice Calls: Default 15 coins/min ($1.50/min) - typically lower than video
- Content Posts: Free or 10-500+ coins depending on exclusivity

### Pricing Recommendations by Stage
- New creators (0-100 followers): Start with defaults or slightly lower to build audience
- Growing creators (100-1000 followers): Gradually increase as demand grows
- Established creators (1000+ followers): Premium pricing based on your value and demand

### Key Advice
- Test different prices and track what converts
- Higher prices can signal premium value, but don't price out your audience
- Offer variety: some free content + paid premium content
- Run promotions during streams to drive engagement

## Response Style
- Be friendly, encouraging, and supportive
- Use casual but professional language
- Keep responses concise (2-3 paragraphs max)
- Include actionable tips when relevant
- Use emojis sparingly for personality

## Boundaries
- Never give financial, legal, or medical advice
- Don't make promises about specific earnings
- Redirect off-topic questions politely
- Don't discuss competitor platforms by name
- If asked about sensitive content policies, direct them to support`;

/**
 * Build contextual prompt with creator-specific data
 */
export function buildContextualPrompt(creatorData?: {
  username?: string;
  displayName?: string;
  primaryCategory?: string;
  followerCount?: number;
  hasAvatar?: boolean;
  pricingConfigured?: boolean;
}): string {
  let prompt = COACH_SYSTEM_PROMPT;

  if (creatorData) {
    prompt += `\n\n## Current Creator Context`;
    if (creatorData.username) {
      prompt += `\n- Username: @${creatorData.username}`;
    }
    if (creatorData.displayName) {
      prompt += `\n- Display Name: ${creatorData.displayName}`;
    }
    if (creatorData.primaryCategory) {
      prompt += `\n- Primary Category: ${creatorData.primaryCategory}`;
    }
    if (creatorData.followerCount !== undefined) {
      prompt += `\n- Followers: ${creatorData.followerCount}`;
    }

    // Add personalization notes
    const notes: string[] = [];
    if (!creatorData.hasAvatar) {
      notes.push('Consider suggesting they upload a profile picture for better engagement');
    }
    if (!creatorData.primaryCategory) {
      notes.push('They haven\'t set a primary category - suggest setting one for better discovery');
    }
    if (creatorData.followerCount !== undefined && creatorData.followerCount < 10) {
      notes.push('They\'re just starting out - focus on growth strategies and promotion tips');
    }

    if (notes.length > 0) {
      prompt += `\n\n## Personalization Notes\n${notes.map(n => `- ${n}`).join('\n')}`;
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

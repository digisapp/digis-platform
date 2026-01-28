// Creator Success Coach Types

export interface CoachMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  metadata?: {
    actionType?: 'script' | 'tip' | 'question';
    scriptType?: '10sec' | '30sec' | 'full';
    niche?: string;
    vibe?: string;
  };
}

export interface CoachChatHistory {
  creatorId: string;
  messages: CoachMessage[];
  lastUpdated: string;
}

export interface QuickAction {
  id: string;
  label: string;
  icon: string;
  prompt: string;
  flow?: 'script-generator'; // Opens multi-step flow instead of sending prompt
}

export interface ScriptGeneratorState {
  step: 'niche' | 'length' | 'vibe' | 'result';
  niche: string;
  length: '10sec' | '30sec' | 'full';
  vibe: 'gen-z' | 'professional' | 'luxury';
  generatedScript?: string;
}

export interface ChatRequest {
  message: string;
  history?: CoachMessage[];
}

export interface ChatResponse {
  reply: string;
  suggestions?: string[];
}

export interface ScriptRequest {
  niche: string;
  length: '10sec' | '30sec' | 'full';
  vibe: 'gen-z' | 'professional' | 'luxury';
}

export interface ScriptResponse {
  script: string;
  tips?: string[];
}

// Quick actions configuration
export const QUICK_ACTIONS: QuickAction[] = [
  {
    id: 'promo-script',
    label: 'Generate promo script',
    icon: 'Sparkles',
    prompt: '',
    flow: 'script-generator'
  },
  {
    id: 'stream-ideas',
    label: 'Stream ideas',
    icon: 'Radio',
    prompt: 'Give me 5 creative stream ideas for this week that will engage my audience and drive tips/gifts.'
  },
  {
    id: 'video-calls',
    label: 'Set up video calls',
    icon: 'Video',
    prompt: 'How do I set up paid video calls on Digis? What should I charge and how do I promote them?'
  },
  {
    id: 'pricing',
    label: 'Pricing tips',
    icon: 'Coins',
    prompt: 'What are your recommendations for my pricing strategy? How should I price my calls, messages, and content?'
  }
];

// Niche options for script generator
export const NICHE_OPTIONS = [
  { value: 'fitness', label: 'Fitness / Pilates / Yoga' },
  { value: 'music', label: 'Music / DJ / Producer' },
  { value: 'fashion', label: 'Fashion / Style / Beauty' },
  { value: 'gaming', label: 'Gaming / Streaming' },
  { value: 'cooking', label: 'Cooking / Food' },
  { value: 'lifestyle', label: 'Lifestyle / Influencer' },
  { value: 'wellness', label: 'Wellness / Health Coach' },
  { value: 'art', label: 'Art / Creative' },
  { value: 'education', label: 'Education / Coaching' },
  { value: 'other', label: 'Other' }
];

// Vibe options for script generator
export const VIBE_OPTIONS = [
  {
    value: 'gen-z' as const,
    label: 'Gen-Z / Trendy',
    description: 'Casual, energetic, uses slang'
  },
  {
    value: 'professional' as const,
    label: 'Professional',
    description: 'Polished, confident, clear'
  },
  {
    value: 'luxury' as const,
    label: 'Luxury / Premium',
    description: 'Sophisticated, exclusive'
  }
];

// Length options for script generator
export const LENGTH_OPTIONS = [
  { value: '10sec' as const, label: '10 seconds', description: 'Quick hook for TikTok/Reels' },
  { value: '30sec' as const, label: '30 seconds', description: 'Standard promo clip' },
  { value: 'full' as const, label: 'Full script', description: '1+ minute detailed script' }
];

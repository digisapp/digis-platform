/**
 * Predefined stream categories for discoverability
 * Similar to Twitch/Kick.com category system
 */

export interface StreamCategory {
  id: string;
  name: string;
  icon: string; // Emoji
  description: string;
}

export const STREAM_CATEGORIES: StreamCategory[] = [
  {
    id: 'just-chatting',
    name: 'Just Chatting',
    icon: '💬',
    description: 'Casual conversations and hangouts',
  },
  {
    id: 'irl',
    name: 'IRL',
    icon: '📍',
    description: 'In real life streams and adventures',
  },
  {
    id: 'beauty',
    name: 'Beauty',
    icon: '💄',
    description: 'Makeup, skincare, and beauty tips',
  },
  {
    id: 'fitness',
    name: 'Fitness',
    icon: '💪',
    description: 'Workouts, yoga, and health content',
  },
  {
    id: 'fashion',
    name: 'Fashion',
    icon: '👗',
    description: 'Style, outfits, and fashion shows',
  },
  {
    id: 'travel',
    name: 'Travel',
    icon: '✈️',
    description: 'Travel vlogs and adventures',
  },
  {
    id: 'cooking',
    name: 'Cooking',
    icon: '🍳',
    description: 'Recipes, cooking shows, and food content',
  },
  {
    id: 'music',
    name: 'Music',
    icon: '🎵',
    description: 'Live performances, DJing, and music creation',
  },
  {
    id: 'podcasts',
    name: 'Podcast',
    icon: '🎙️',
    description: 'Talk shows and discussions',
  },
  {
    id: 'special-event',
    name: 'Special Event',
    icon: '🎉',
    description: 'Parties, celebrations, and events',
  },
  {
    id: 'creative',
    name: 'Creative',
    icon: '🎨',
    description: 'Art, crafts, and creative projects',
  },
  {
    id: 'gaming',
    name: 'Gaming',
    icon: '🎮',
    description: 'Video games and live gameplay',
  },
  {
    id: 'education',
    name: 'Education',
    icon: '📚',
    description: 'Learning, tutorials, and how-tos',
  },
  {
    id: 'asmr',
    name: 'ASMR',
    icon: '🎧',
    description: 'Relaxing sounds and triggers',
  },
  {
    id: 'sports',
    name: 'Sports',
    icon: '⚽',
    description: 'Sports commentary and activities',
  },
  {
    id: 'animals',
    name: 'Animals & Pets',
    icon: '🐾',
    description: 'Pet streams and animal content',
  },
];

// Get category by ID
export function getCategoryById(id: string): StreamCategory | undefined {
  return STREAM_CATEGORIES.find(cat => cat.id === id);
}

// Get category name by ID (with fallback)
export function getCategoryName(id: string): string {
  const category = getCategoryById(id);
  return category?.name || id;
}

// Get category icon by ID (with fallback)
export function getCategoryIcon(id: string): string {
  const category = getCategoryById(id);
  return category?.icon || '📺';
}

// Popular/suggested tags for each category
export const SUGGESTED_TAGS: Record<string, string[]> = {
  'just-chatting': ['chill', 'hangout', 'q&a', 'storytime', 'late-night'],
  'gaming': ['fps', 'rpg', 'indie', 'multiplayer', 'speedrun', 'esports'],
  'music': ['live-music', 'dj', 'covers', 'original', 'lofi', 'edm'],
  'irl': ['outdoor', 'city', 'beach', 'event', 'meetup'],
  'creative': ['art', 'drawing', 'painting', 'digital-art', 'crafts'],
  'fitness': ['workout', 'yoga', 'cardio', 'strength', 'hiit'],
  'cooking': ['recipe', 'baking', 'healthy', 'comfort-food', 'vegan'],
  'beauty': ['makeup', 'skincare', 'tutorial', 'grwm', 'haul'],
  'fashion': ['ootd', 'haul', 'styling', 'runway', 'vintage'],
  'asmr': ['whisper', 'tapping', 'eating', 'roleplay', 'triggers'],
  'education': ['coding', 'language', 'science', 'history', 'business'],
  'podcasts': ['interview', 'debate', 'news', 'comedy', 'true-crime'],
  'sports': ['football', 'basketball', 'mma', 'golf', 'esports'],
  'travel': ['adventure', 'food-tour', 'culture', 'backpacking', 'luxury'],
  'animals': ['cats', 'dogs', 'wildlife', 'aquarium', 'exotic'],
  'special-event': ['birthday', 'anniversary', 'giveaway', 'collab', 'milestone'],
};

// Get suggested tags for a category
export function getSuggestedTags(categoryId: string): string[] {
  return SUGGESTED_TAGS[categoryId] || [];
}

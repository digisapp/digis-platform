export const CREATOR_CATEGORIES = [
  { value: 'gaming', label: 'Gaming', emoji: '🎮', color: 'from-purple-500 to-pink-500' },
  { value: 'music', label: 'Music & DJs', emoji: '🎵', color: 'from-pink-500 to-rose-500' },
  { value: 'art', label: 'Art & Design', emoji: '🎨', color: 'from-blue-500 to-cyan-500' },
  { value: 'fitness', label: 'Fitness & Wellness', emoji: '💪', color: 'from-orange-500 to-red-500' },
  { value: 'cooking', label: 'Cooking & Food', emoji: '🍳', color: 'from-yellow-500 to-orange-500' },
  { value: 'chatting', label: 'Just Chatting', emoji: '💬', color: 'from-green-500 to-teal-500' },
  { value: 'education', label: 'Education', emoji: '📚', color: 'from-indigo-500 to-purple-500' },
  { value: 'entertainment', label: 'Entertainment', emoji: '🎭', color: 'from-fuchsia-500 to-pink-500' },
  { value: 'business', label: 'Business', emoji: '💼', color: 'from-gray-600 to-gray-800' },
  { value: 'lifestyle', label: 'Lifestyle & Beauty', emoji: '✨', color: 'from-pink-400 to-purple-400' },
  { value: 'tech', label: 'Tech & Development', emoji: '🔧', color: 'from-blue-600 to-indigo-600' },
  { value: 'irl', label: 'IRL', emoji: '🎪', color: 'from-yellow-400 to-amber-500' },
  { value: 'sports', label: 'Sports', emoji: '⚽', color: 'from-green-600 to-emerald-600' },
  { value: 'creative', label: 'Creative Arts', emoji: '🖌️', color: 'from-violet-500 to-purple-500' },
  { value: 'other', label: 'Other', emoji: '🌟', color: 'from-gray-500 to-slate-500' },
] as const;

export type CreatorCategory = typeof CREATOR_CATEGORIES[number]['value'];

export function getCategoryByValue(value: string | null | undefined) {
  if (!value) return null;
  return CREATOR_CATEGORIES.find(cat => cat.value === value) || null;
}

export function getCategoryColor(value: string | null | undefined): string {
  const category = getCategoryByValue(value);
  return category?.color || 'from-gray-500 to-slate-500';
}

export function getCategoryLabel(value: string | null | undefined): string {
  const category = getCategoryByValue(value);
  return category?.label || value || 'Other';
}

export function getCategoryEmoji(value: string | null | undefined): string {
  const category = getCategoryByValue(value);
  return category?.emoji || '🌟';
}

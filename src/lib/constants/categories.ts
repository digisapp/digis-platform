export const CREATOR_CATEGORIES = [
  { value: 'gaming', label: 'Gaming', emoji: '🎮', color: 'from-purple-500 to-pink-500' },
  { value: 'music', label: 'Music', emoji: '🎵', color: 'from-pink-500 to-rose-500' },
  { value: 'art', label: 'Art', emoji: '🎨', color: 'from-blue-500 to-cyan-500' },
  { value: 'fitness', label: 'Fitness', emoji: '💪', color: 'from-orange-500 to-red-500' },
  { value: 'wellness', label: 'Wellness', emoji: '🧘', color: 'from-green-400 to-teal-400' },
  { value: 'therapy', label: 'Therapy', emoji: '🧠', color: 'from-blue-400 to-teal-500' },
  { value: 'cooking', label: 'Cooking', emoji: '🍳', color: 'from-yellow-500 to-orange-500' },
  { value: 'education', label: 'Education', emoji: '📚', color: 'from-indigo-500 to-purple-500' },
  { value: 'entertainment', label: 'Entertainment', emoji: '🎭', color: 'from-fuchsia-500 to-pink-500' },
  { value: 'business', label: 'Business', emoji: '💼', color: 'from-gray-600 to-gray-800' },
  { value: 'lifestyle', label: 'Lifestyle', emoji: '✨', color: 'from-pink-400 to-purple-400' },
  { value: 'beauty', label: 'Beauty', emoji: '💄', color: 'from-rose-400 to-pink-500' },
  { value: 'fashion', label: 'Fashion', emoji: '👗', color: 'from-purple-400 to-pink-400' },
  { value: 'model', label: 'Model', emoji: '📸', color: 'from-indigo-400 to-purple-500' },
  { value: 'tech', label: 'Tech', emoji: '🔧', color: 'from-blue-600 to-indigo-600' },
  { value: 'irl', label: 'IRL', emoji: '🎪', color: 'from-yellow-400 to-amber-500' },
  { value: 'sports', label: 'Sports', emoji: '⚽', color: 'from-green-600 to-emerald-600' },
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

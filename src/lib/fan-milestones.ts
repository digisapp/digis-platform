/**
 * Fan milestone tracking — shows celebration toasts for first-time actions.
 * Uses localStorage to track which milestones have been acknowledged.
 */

const MILESTONE_KEY = 'digis_fan_milestones';

type MilestoneType = 'first_follow' | 'first_like' | 'first_tip' | 'first_message' | 'first_purchase';

interface MilestoneConfig {
  message: string;
}

const MILESTONES: Record<MilestoneType, MilestoneConfig> = {
  first_follow: {
    message: 'You followed your first creator! Their content will appear in your feed.',
  },
  first_like: {
    message: 'First like! Creators love knowing fans enjoy their content.',
  },
  first_tip: {
    message: 'First tip sent! You just made a creator\'s day.',
  },
  first_message: {
    message: 'First message sent! Creators typically reply within a few hours.',
  },
  first_purchase: {
    message: 'Content unlocked! Enjoy your exclusive access.',
  },
};

function getCompletedMilestones(): Set<MilestoneType> {
  try {
    const stored = localStorage.getItem(MILESTONE_KEY);
    if (!stored) return new Set();
    return new Set(JSON.parse(stored));
  } catch {
    return new Set();
  }
}

function markMilestone(type: MilestoneType) {
  const completed = getCompletedMilestones();
  completed.add(type);
  localStorage.setItem(MILESTONE_KEY, JSON.stringify([...completed]));
}

/**
 * Check and trigger a milestone celebration.
 * Returns the celebration message if this is a first-time action, or null if already completed.
 * Automatically marks the milestone as completed.
 */
export function checkMilestone(type: MilestoneType): string | null {
  const completed = getCompletedMilestones();
  if (completed.has(type)) return null;

  markMilestone(type);
  return MILESTONES[type].message;
}

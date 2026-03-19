/**
 * Fan milestone tracking — shows celebration toasts for first-time actions.
 * Uses localStorage to track which milestones have been acknowledged.
 */

const MILESTONE_KEY = 'digis_fan_milestones';

export type MilestoneType = 'first_follow' | 'first_like' | 'first_tip' | 'first_message' | 'first_purchase';

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
 * Check if this is a first-time action.
 * Returns true if milestone was just achieved (first time), false if already completed.
 * Automatically marks the milestone as completed.
 */
export function checkMilestone(type: MilestoneType): boolean {
  const completed = getCompletedMilestones();
  if (completed.has(type)) return false;

  markMilestone(type);
  return true;
}

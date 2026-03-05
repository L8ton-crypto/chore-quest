export interface Family {
  id: string;
  name: string;
  pin: string;
  created_at: string;
}

export interface Child {
  id: string;
  family_id: string;
  name: string;
  avatar: string;
  xp: number;
  level: number;
  created_at: string;
}

export interface Quest {
  id: string;
  family_id: string;
  title: string;
  description: string;
  xp_reward: number;
  quest_type: "daily" | "weekly" | "one-time";
  icon: string;
  created_at: string;
}

export interface Completion {
  id: string;
  quest_id: string;
  child_id: string;
  completed_at: string;
  approved: boolean;
  approved_at: string | null;
  // Joined fields
  quest_title?: string;
  quest_icon?: string;
  quest_xp?: number;
  child_name?: string;
  child_avatar?: string;
}

export interface Badge {
  id: string;
  child_id: string;
  badge_type: string;
  earned_at: string;
}

export interface Reward {
  id: string;
  family_id: string;
  title: string;
  description: string;
  xp_cost: number;
  icon: string;
  created_at: string;
}

export interface RewardClaim {
  id: string;
  reward_id: string;
  child_id: string;
  claimed_at: string;
  approved: boolean;
}

// Badge definitions
export const BADGE_DEFINITIONS: Record<
  string,
  { name: string; icon: string; description: string }
> = {
  first_quest: {
    name: "First Quest",
    icon: "🌟",
    description: "Complete your first quest",
  },
  hot_streak: {
    name: "Hot Streak",
    icon: "🔥",
    description: "Complete quests 3 days in a row",
  },
  speed_runner: {
    name: "Speed Runner",
    icon: "⚡",
    description: "Complete 5 quests in one day",
  },
  level_5: {
    name: "Level 5",
    icon: "👑",
    description: "Reach level 5",
  },
  level_10: {
    name: "Champion",
    icon: "🏆",
    description: "Reach level 10",
  },
  quest_master: {
    name: "Quest Master",
    icon: "🎯",
    description: "Complete 50 quests total",
  },
  badge_collector: {
    name: "Collector",
    icon: "💎",
    description: "Earn 5 different badges",
  },
  helper: {
    name: "Helper",
    icon: "🤝",
    description: "Complete 10 quests",
  },
};

// Leveling system - XP needed to reach each level
export function xpForLevel(level: number): number {
  if (level <= 1) return 0;
  return Math.floor(50 * level * (level - 1));
}

export function getLevelFromXP(xp: number): number {
  let level = 1;
  while (xpForLevel(level + 1) <= xp) {
    level++;
  }
  return level;
}

export function xpProgress(xp: number): {
  level: number;
  currentXP: number;
  nextLevelXP: number;
  progress: number;
} {
  const level = getLevelFromXP(xp);
  const currentLevelXP = xpForLevel(level);
  const nextLevelXP = xpForLevel(level + 1);
  const progress = ((xp - currentLevelXP) / (nextLevelXP - currentLevelXP)) * 100;
  return { level, currentXP: xp - currentLevelXP, nextLevelXP: nextLevelXP - currentLevelXP, progress };
}

// Avatar options
export const AVATARS = [
  "🦁", "🐯", "🦊", "🐼", "🐨", "🦄", "🐲", "🦈",
  "🦅", "🐙", "🦋", "🐝", "🐸", "🐵", "🐧", "🦉",
];

// Quest icons
export const QUEST_ICONS = [
  "🧹", "🍽️", "📚", "🛏️", "🧺", "🗑️", "🐕", "🌱",
  "🧽", "👕", "🧸", "🎨", "🎵", "💪", "🦷", "🚿",
];

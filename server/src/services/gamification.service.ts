import Gamification, { IGamification, GamificationEvent } from '../models/Gamification';

/** XP awarded per gamified action. Kept small so leveling is gradual. */
export const XP_REWARDS: Record<GamificationEvent, number> = {
  RESUME_ANALYZED: 20,
  ATS_CHECKED: 15,
  ROADMAP_GENERATED: 50,
  APPLICATION_ADDED: 10,
  STAGE_ADVANCED: 15,
  INTERVIEW_COMPLETED: 40,
};

export interface BadgeDef {
  id: string;
  emoji: string;
  name: string;
  description: string;
  check: (ctx: {
    xp: number;
    streak: number;
    counts: IGamification['counts'];
    meta: Record<string, unknown>;
  }) => boolean;
}

export const BADGE_CATALOG: BadgeDef[] = [
  {
    id: 'first_resume',
    emoji: '📄',
    name: 'Documented',
    description: 'Analyzed your first resume',
    check: (ctx) => ctx.counts.resumeAnalyzed >= 1,
  },
  {
    id: 'ats_aware',
    emoji: '📋',
    name: 'ATS Aware',
    description: 'Ran your first ATS compatibility check',
    check: (ctx) => ctx.counts.atsChecks >= 1,
  },
  {
    id: 'ats_maestro',
    emoji: '💯',
    name: 'ATS Maestro',
    description: 'Scored 90+ on an ATS check',
    check: (ctx) => (ctx.meta.atsScore as number) >= 90,
  },
  {
    id: 'stargazer',
    emoji: '🌠',
    name: 'Stargazer',
    description: 'Generated your first AI career roadmap',
    check: (ctx) => ctx.counts.roadmaps >= 1,
  },
  {
    id: 'pathfinder',
    emoji: '🧭',
    name: 'Pathfinder',
    description: 'Generated 5 career roadmaps',
    check: (ctx) => ctx.counts.roadmaps >= 5,
  },
  {
    id: 'on_board',
    emoji: '📌',
    name: 'On Board',
    description: 'Tracked your first application',
    check: (ctx) => ctx.counts.applications >= 1,
  },
  {
    id: 'hustler',
    emoji: '🚀',
    name: 'Hustler',
    description: 'Tracked 10 applications',
    check: (ctx) => ctx.counts.applications >= 10,
  },
  {
    id: 'climbing',
    emoji: '🪜',
    name: 'Climbing',
    description: 'Advanced 3 applications to a new stage',
    check: (ctx) => ctx.counts.stageAdvances >= 3,
  },
  {
    id: 'interview_ready',
    emoji: '🎯',
    name: 'Interview Ready',
    description: 'Completed your first mock interview',
    check: (ctx) => ctx.counts.interviews >= 1,
  },
  {
    id: 'shark_week',
    emoji: '🦈',
    name: 'Shark Week',
    description: 'Completed 5 mock interviews',
    check: (ctx) => ctx.counts.interviews >= 5,
  },
  {
    id: 'unstoppable',
    emoji: '🔥',
    name: 'Unstoppable',
    description: 'Hit a 7-day activity streak',
    check: (ctx) => ctx.streak >= 7,
  },
  {
    id: 'rising_star',
    emoji: '⚡',
    name: 'Rising Star',
    description: 'Earned 500 XP',
    check: (ctx) => ctx.xp >= 500,
  },
  {
    id: 'career_champion',
    emoji: '👑',
    name: 'Career Champion',
    description: 'Earned 1,500 XP',
    check: (ctx) => ctx.xp >= 1500,
  },
];

const COUNT_FIELD: Record<GamificationEvent, keyof IGamification['counts']> = {
  RESUME_ANALYZED: 'resumeAnalyzed',
  ATS_CHECKED: 'atsChecks',
  ROADMAP_GENERATED: 'roadmaps',
  APPLICATION_ADDED: 'applications',
  STAGE_ADVANCED: 'stageAdvances',
  INTERVIEW_COMPLETED: 'interviews',
};

/** Total XP required to reach a given level (L1 = 0 XP). */
export const xpRequiredForLevel = (level: number): number => (level - 1) ** 2 * 150;
export const levelForXp = (xp: number): number => Math.floor(Math.sqrt(xp / 150)) + 1;

export interface BadgeCheckContext {
  xp: number;
  streak: number;
  counts: IGamification['counts'];
  meta: Record<string, unknown>;
}

/** Pure badge evaluation — which not-yet-earned badges unlock for a context. */
export const evaluateNewBadges = (earnedIds: string[], ctx: BadgeCheckContext): string[] =>
  BADGE_CATALOG.filter((b) => !earnedIds.includes(b.id) && b.check(ctx)).map((b) => b.id);

const toDateKey = (d: Date): string => d.toISOString().slice(0, 10);

export interface AwardResult {
  xp: number;
  level: number;
  streak: number;
  newBadges: string[];
}

/**
 * Award XP for a single event: updates streak by calendar day, increments the
 * matching counter, checks every not-yet-earned badge and appends activity.
 * Never throws on document-level failures (callers fire-and-forget).
 */
export const awardXp = async (
  userId: string,
  event: GamificationEvent,
  meta: Record<string, unknown> = {}
): Promise<AwardResult> => {
  const today = toDateKey(new Date());
  const yesterday = toDateKey(new Date(Date.now() - 86_400_000));
  const reward = XP_REWARDS[event] ?? 0;
  const countField = COUNT_FIELD[event];

  const doc = await Gamification.findOneAndUpdate(
    { user: userId },
    { $setOnInsert: { user: userId } },
    { new: true, upsert: true }
  );

  // --- Streak: consecutive UTC calendar days, else reset to 1 ---
  let streak = doc.streakCount;
  if (doc.lastActivityDate === today) {
    streak = Math.max(streak, 1);
  } else if (doc.lastActivityDate === yesterday) {
    streak = streak + 1;
  } else {
    streak = 1;
  }

  const counts = { ...doc.counts };
  if (countField) counts[countField] += 1;

  const newXp = doc.xp + reward;

  const newBadges = BADGE_CATALOG.filter(
    (b) => !doc.badges.includes(b.id) && b.check({ xp: newXp, streak, counts, meta })
  ).map((b) => b.id);

  doc.xp = newXp;
  doc.streakCount = streak;
  doc.lastActivityDate = today;
  doc.counts = counts;
  if (newBadges.length) doc.badges = [...doc.badges, ...newBadges];
  doc.recentEvents = [{ reason: event, xp: reward, at: new Date() }, ...doc.recentEvents].slice(0, 15);

  try {
    await doc.save();
  } catch (err) {
    console.error('Gamification save error:', err);
  }

  return { xp: newXp, level: levelForXp(newXp), streak, newBadges };
};

/** Read-only snapshot for the dashboard card. */
export const getGamificationSnapshot = async (userId: string) => {
  const doc = await Gamification.findOne({ user: userId }).lean().exec();
  const xp = doc?.xp ?? 0;
  const level = levelForXp(xp);
  const xpForNextLevel = xpRequiredForLevel(level + 1);
  const xpForCurrentLevel = xpRequiredForLevel(level);

  return {
    xp,
    level,
    xpIntoLevel: xp - xpForCurrentLevel,
    xpForNextLevel: xpForNextLevel - xpForCurrentLevel,
    streakCount: doc?.streakCount ?? 0,
    badges: BADGE_CATALOG.map((b) => ({
      id: b.id,
      emoji: b.emoji,
      name: b.name,
      description: b.description,
      earned: doc?.badges.includes(b.id) ?? false,
    })),
    recentEvents: doc?.recentEvents ?? [],
  };
};
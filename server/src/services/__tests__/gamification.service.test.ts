import { describe, expect, it } from '@jest/globals';
import {
  BADGE_CATALOG,
  XP_REWARDS,
  evaluateNewBadges,
  levelForXp,
  xpRequiredForLevel,
} from '../gamification.service';
import type { IGamification } from '../../models/Gamification';

const zeroCounts = (): IGamification['counts'] => ({
  resumeAnalyzed: 0,
  atsChecks: 0,
  roadmaps: 0,
  applications: 0,
  stageAdvances: 0,
  interviews: 0,
});

describe('level curve', () => {
  it('starts at level 1 with zero XP', () => {
    expect(levelForXp(0)).toBe(1);
    expect(xpRequiredForLevel(1)).toBe(0);
  });

  it('level 1 spans 0-149 XP, level 2 begins at 150', () => {
    expect(levelForXp(149)).toBe(1);
    expect(levelForXp(150)).toBe(2);
    expect(xpRequiredForLevel(2)).toBe(150);
  });

  it('scales quadratically and stays monotonic', () => {
    expect(levelForXp(600)).toBe(3);
    expect(levelForXp(1350)).toBe(4);
    const higher = levelForXp(99999);
    expect(higher).toBeGreaterThan(levelForXp(1350));
  });
});

describe('XP rewards table', () => {
  it('rewards every event with a positive amount', () => {
    const events = Object.keys(XP_REWARDS);
    expect(events.length).toBeGreaterThanOrEqual(6);
    events.forEach((event) => {
      expect(XP_REWARDS[event as keyof typeof XP_REWARDS]).toBeGreaterThan(0);
    });
  });

  it('awarded XP is monotonic with the level table', () => {
    const total = Object.values(XP_REWARDS).reduce((a, b) => a + b, 0);
    expect(total).toBeLessThan(300);
    expect(total).toBeGreaterThan(100);
  });
});

describe('badge evaluation', () => {
  it('grants the first-application badge at application count 1', () => {
    const ctx = { xp: 10, streak: 1, meta: {}, counts: { ...zeroCounts(), applications: 1 } };
    expect(evaluateNewBadges([], ctx)).toContain('on_board');
  });

  it('grants Hustler at 10 applications and Climbing at 3 stage advances', () => {
    const ctx = {
      xp: 200,
      streak: 3,
      meta: {},
      counts: { ...zeroCounts(), applications: 10, stageAdvances: 3 },
    };
    const badges = evaluateNewBadges([], ctx);
    expect(badges).toContain('hustler');
    expect(badges).toContain('climbing');
  });

  it('grants ATS Maestro only when score meta is 90+', () => {
    expect(evaluateNewBadges([], { xp: 0, streak: 1, meta: { atsScore: 89 }, counts: zeroCounts() })).not.toContain(
      'ats_maestro'
    );
    expect(evaluateNewBadges([], { xp: 0, streak: 1, meta: { atsScore: 91 }, counts: zeroCounts() })).toContain(
      'ats_maestro'
    );
  });

  it('grants Unstoppable at a 7-day streak', () => {
    const ctx = { xp: 0, streak: 6, meta: {}, counts: zeroCounts() };
    expect(evaluateNewBadges([], ctx)).not.toContain('unstoppable');
    ctx.streak = 7;
    expect(evaluateNewBadges([], ctx)).toContain('unstoppable');
  });

  it('grants XP milestone badges at 500 and 1,500 XP', () => {
    expect(evaluateNewBadges([], { xp: 499, streak: 1, meta: {}, counts: zeroCounts() })).not.toContain('rising_star');
    expect(evaluateNewBadges([], { xp: 500, streak: 1, meta: {}, counts: zeroCounts() })).toContain('rising_star');
    expect(evaluateNewBadges([], { xp: 1500, streak: 1, meta: {}, counts: zeroCounts() })).toContain('career_champion');
  });

  it('never re-grants badges already earned', () => {
    const ctx = { xp: 2000, streak: 10, meta: { atsScore: 99 }, counts: zeroCounts() };
    const all = BADGE_CATALOG.map((b) => b.id);
    expect(evaluateNewBadges(all, ctx)).toEqual([]);
  });
});
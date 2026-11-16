import { describe, expect, it } from 'vitest';
import {
  MILESTONE_MESSAGES,
  MILESTONE_ORDER,
  countsAsShown,
  isMilestone,
  newlyReached,
  planMilestones,
  reachedMilestones,
  type Milestone,
} from '../src/milestones';
import { findBlocked } from './blocked-words';

const none: Milestone[] = [];

describe('which milestones are reached (BR40.1)', () => {
  it('has the three milestones in the fixed order', () => {
    expect(MILESTONE_ORDER).toEqual(['first-stage', 'halfway', 'complete']);
  });

  it.each([
    [0, 5, []],
    [1, 5, ['first-stage']],
    [2, 5, ['first-stage']],
    [3, 5, ['first-stage', 'halfway']],
    [4, 5, ['first-stage', 'halfway']],
    [5, 5, ['first-stage', 'halfway', 'complete']],
    [3, 6, ['first-stage', 'halfway']],
    [2, 6, ['first-stage']],
    [6, 6, ['first-stage', 'halfway', 'complete']],
  ] as [number, number, Milestone[]][])('with %i of %i done', (done, total, expected) => {
    expect(reachedMilestones(done, total)).toEqual(expected);
  });

  it('reaches nothing for a journey with no stages', () => {
    expect(reachedMilestones(0, 0)).toEqual([]);
  });

  it('knows a milestone name when it sees one', () => {
    expect(isMilestone('halfway')).toBe(true);
    expect(isMilestone('almost')).toBe(false);
    expect(isMilestone(3)).toBe(false);
  });
});

describe('what counts as shown (BR40.1)', () => {
  it('counts a milestone in the set', () => {
    expect(countsAsShown('halfway', ['halfway'])).toBe(true);
    expect(countsAsShown('first-stage', ['first-stage'])).toBe(true);
  });

  it('counts a milestone lower than one in the set', () => {
    expect(countsAsShown('first-stage', ['halfway'])).toBe(true);
    expect(countsAsShown('halfway', ['complete'])).toBe(true);
    expect(countsAsShown('first-stage', ['complete'])).toBe(true);
  });

  it('does not count a higher or unrelated one', () => {
    expect(countsAsShown('halfway', ['first-stage'])).toBe(false);
    expect(countsAsShown('complete', ['halfway'])).toBe(false);
    expect(countsAsShown('first-stage', none)).toBe(false);
  });
});

describe('newly reached (BR40.1)', () => {
  it('is everything reached when nothing was shown', () => {
    expect(newlyReached(3, 5, none)).toEqual(['first-stage', 'halfway']);
  });

  it('leaves out what was shown or is lower than what was shown', () => {
    expect(newlyReached(3, 5, ['first-stage'])).toEqual(['halfway']);
    expect(newlyReached(3, 5, ['halfway'])).toEqual([]);
    expect(newlyReached(5, 5, ['complete'])).toEqual([]);
  });

  it('is empty when nothing is reached', () => {
    expect(newlyReached(0, 5, none)).toEqual([]);
  });
});

describe('which one is shown (BR40.2)', () => {
  it('shows the first-stage milestone for the first mark', () => {
    expect(planMilestones(1, 5, none)).toEqual({
      toShow: 'first-stage',
      recordOnly: [],
      toRecord: ['first-stage'],
    });
  });

  it('shows halfway for the third of five once first-stage was shown', () => {
    expect(planMilestones(3, 5, ['first-stage'])).toEqual({
      toShow: 'halfway',
      recordOnly: [],
      toRecord: ['halfway'],
    });
  });

  it('shows the highest and records the lower new ones without showing them', () => {
    // First-stage never shown, then 3 of 5 are done in one confirmed mark.
    expect(planMilestones(3, 5, none)).toEqual({
      toShow: 'halfway',
      recordOnly: ['first-stage'],
      toRecord: ['first-stage', 'halfway'],
    });
    // The last stage marked with first-stage and halfway never shown.
    expect(planMilestones(5, 5, none)).toEqual({
      toShow: 'complete',
      recordOnly: ['first-stage', 'halfway'],
      toRecord: ['first-stage', 'halfway', 'complete'],
    });
  });

  it('shows nothing when nothing is new', () => {
    expect(planMilestones(2, 5, ['first-stage'])).toEqual({
      toShow: null,
      recordOnly: [],
      toRecord: [],
    });
    expect(planMilestones(0, 5, none)).toEqual({ toShow: null, recordOnly: [], toRecord: [] });
  });

  it('shows the first-stage banner when stage 4 is marked first (stage order does not matter)', () => {
    expect(planMilestones(1, 5, none).toShow).toBe('first-stage');
  });
});

describe('the scenarios of the functional spec (BR40.2)', () => {
  it('complete recorded but halfway never recorded: no halfway banner either', () => {
    expect(planMilestones(3, 5, ['complete']).toShow).toBeNull();
    expect(planMilestones(3, 5, ['complete']).toRecord).toEqual([]);
  });

  it('halfway recorded but first-stage never recorded: unmark down, mark one stage, no banner', () => {
    expect(planMilestones(1, 5, ['halfway']).toShow).toBeNull();
  });

  it('unmark then mark again brings nothing back once the set holds it', () => {
    const shown: Milestone[] = ['first-stage', 'halfway', 'complete'];
    expect(planMilestones(4, 5, shown).toShow).toBeNull();
    expect(planMilestones(5, 5, shown).toShow).toBeNull();
  });

  it('a 6-stage journey reaches halfway at 3', () => {
    expect(planMilestones(3, 6, ['first-stage']).toShow).toBe('halfway');
  });
});

describe('the blocked-word list over every milestone message (BR43.1)', () => {
  it('has one message for each milestone', () => {
    for (const milestone of MILESTONE_ORDER) {
      expect(MILESTONE_MESSAGES[milestone].length).toBeGreaterThan(10);
    }
    expect(new Set(Object.values(MILESTONE_MESSAGES)).size).toBe(3);
  });

  it('finds no blocked word in any milestone message', () => {
    for (const milestone of MILESTONE_ORDER) {
      expect(findBlocked(MILESTONE_MESSAGES[milestone]), milestone).toEqual([]);
    }
  });
});

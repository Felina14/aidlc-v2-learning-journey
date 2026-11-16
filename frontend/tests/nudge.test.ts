import { describe, expect, it } from 'vitest';
import { addDays, localDateText } from '../src/goal';
import {
  NUDGE_STORAGE_PREFIX,
  NudgeDismissals,
  dismissalKey,
  nudgeMessage,
  nudgeStatus,
} from '../src/nudge';
import { findBlocked, normalise } from './blocked-words';
import { blockedNudgeStorage, fakeStorage } from './helpers';

const TODAY = '2026-11-10';
const FIVE = [1, 2, 3, 4, 5];
const SIX = [1, 2, 3, 4, 5, 6];

function status(done: number[], daysAhead: number | null, stages: number[] = FIVE, today = TODAY) {
  return nudgeStatus({
    stageNumbers: stages,
    completedStages: done,
    goalDate: daysAhead === null ? null : addDays(today, daysAhead),
    today,
  });
}

describe('when the nudge applies (BR42.1)', () => {
  it.each([0, 1, 2, 3])('applies for 1 of 5 done with %i days left', (days) => {
    const result = status([1], days);
    expect(result.applies).toBe(true);
    if (result.applies) expect(result.days).toBe(days);
  });

  it('applies for 2 of 5 (40%)', () => {
    expect(status([1, 2], 2).applies).toBe(true);
  });

  it('applies for none done', () => {
    expect(status([], 3).applies).toBe(true);
  });

  it('does not apply for 3 of 5 (60%)', () => {
    expect(status([1, 2, 3], 3).applies).toBe(false);
  });

  it('does not apply for 3 of 6, exactly 50%', () => {
    expect(status([1, 2, 3], 2, SIX).applies).toBe(false);
  });

  it('applies for 2 of 6 (about 33%)', () => {
    expect(status([1, 2], 2, SIX).applies).toBe(true);
  });

  it('does not apply with no goal date', () => {
    expect(status([1], null).applies).toBe(false);
  });

  it('does not apply when the goal date has passed', () => {
    expect(status([1], -1).applies).toBe(false);
    expect(status([1], -30).applies).toBe(false);
  });

  it('does not apply with 4 or more days left', () => {
    expect(status([1], 4).applies).toBe(false);
    expect(status([1], 90).applies).toBe(false);
  });

  it('does not apply to a complete journey', () => {
    expect(status(FIVE, 1).applies).toBe(false);
    expect(status(SIX, 0, SIX).applies).toBe(false);
  });

  it('does not apply when the goal date is not a real date', () => {
    const result = nudgeStatus({
      stageNumbers: FIVE,
      completedStages: [],
      goalDate: '2026-02-31',
      today: TODAY,
    });
    expect(result.applies).toBe(false);
  });

  it('ignores stored stage numbers the journey does not have', () => {
    expect(status([9, 12], 1).applies).toBe(true);
    expect(status([1, 2, 3, 9], 1).applies).toBe(false);
  });
});

describe('counting the days in whole local calendar days (BR42.1)', () => {
  it('counts across a daylight-saving change in the learner calendar', () => {
    // 2026-03-08 is the day the clocks go forward in the United States.
    const evening = localDateText(new Date(2026, 2, 8, 23, 30));
    expect(evening).toBe('2026-03-08');
    const result = nudgeStatus({
      stageNumbers: FIVE,
      completedStages: [],
      goalDate: '2026-03-11',
      today: evening,
    });
    expect(result.applies && result.days).toBe(3);
    const morning = localDateText(new Date(2026, 2, 8, 0, 5));
    const same = nudgeStatus({
      stageNumbers: FIVE,
      completedStages: [],
      goalDate: '2026-03-08',
      today: morning,
    });
    expect(same.applies && same.days).toBe(0);
  });

  it('counts across the end of a month and a year', () => {
    expect(status([1], 2, FIVE, '2026-12-30').applies).toBe(true);
    const result = nudgeStatus({
      stageNumbers: FIVE,
      completedStages: [],
      goalDate: '2027-01-02',
      today: '2026-12-30',
    });
    expect(result.applies && result.days).toBe(3);
  });
});

describe('the next stage and the stages to go (BR42.2)', () => {
  it('names the lowest-numbered stage not done and counts the stages not done', () => {
    const result = status([1, 3], 2);
    expect(result.applies && result.nextStage).toBe(2);
    expect(result.applies && result.stagesToGo).toBe(3);
  });

  it('names stage 3 when stages 1 and 2 are done on a six-stage journey', () => {
    const result = status([1, 2], 1, SIX);
    expect(result.applies && result.nextStage).toBe(3);
    expect(result.applies && result.stagesToGo).toBe(4);
  });
});

describe('the fixed messages (BR42.2)', () => {
  it('has a different message for each of 0, 1, 2 and 3 days', () => {
    const messages = [0, 1, 2, 3].map((days) => nudgeMessage(days as 0 | 1 | 2 | 3, 2, 4));
    expect(new Set(messages).size).toBe(4);
  });

  it('names the next stage by its number and how many stages are to go', () => {
    for (const days of [0, 1, 2, 3] as const) {
      const message = nudgeMessage(days, 2, 4);
      expect(message).toContain('Stage 2');
      expect(message).toContain('4 stages to go');
    }
  });

  it('writes one stage to go in the singular', () => {
    expect(nudgeMessage(1, 5, 1)).toContain('1 stage to go');
    expect(nudgeMessage(1, 5, 1)).not.toContain('1 stages');
  });

  it('is the text on the status the rule returns, with no stage title in it', () => {
    const result = status([1], 3);
    expect(result.applies && result.message).toBe(nudgeMessage(3, 2, 4));
    expect(result.applies && result.message).not.toContain('title');
  });

  it('invites a small step and uses no countdown wording', () => {
    for (const days of [0, 1, 2, 3] as const) {
      const message = nudgeMessage(days, 1, 5);
      expect(message).not.toMatch(/\d+ days? left/i);
      expect(message).not.toMatch(/!/);
    }
  });
});

describe('the blocked-word list over every nudge message (BR43.1)', () => {
  it('finds no blocked word in any possible nudge message', () => {
    const offenders: string[] = [];
    for (const days of [0, 1, 2, 3] as const) {
      for (let next = 1; next <= 6; next += 1) {
        for (let toGo = 1; toGo <= 6; toGo += 1) {
          const message = nudgeMessage(days, next, toGo);
          const found = findBlocked(message);
          if (found.length > 0) offenders.push(`${message} -> ${found.join(', ')}`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  it('also holds for very large stage numbers', () => {
    for (const days of [0, 1, 2, 3] as const) {
      expect(findBlocked(nudgeMessage(days, 99, 99))).toEqual([]);
    }
  });
});

describe('the blocked-word checker itself (BR43.1)', () => {
  it('catches every phrase of the starter list and its extension, in any case', () => {
    for (const text of [
      'You are behind',
      'FAILED',
      'a failure',
      'it is late',
      'Overdue work',
      'lazy',
      'slacking',
      'falling short',
      'wasted time',
      'guilty',
      'You must go',
      'Hurry up',
      'running out of time',
      'Urgent',
      'the deadline is close',
      'Last chance',
      'panic',
      'a countdown',
      'time is running',
      'ticking away',
    ]) {
      expect(findBlocked(text), text).not.toEqual([]);
    }
  });

  it('normalises typographic apostrophes so both spellings of "don\'t miss" are caught', () => {
    expect(normalise('don\u2019t miss')).toBe("don't miss");
    expect(findBlocked('Don\u2019t miss it')).toEqual(["don't miss"]);
    expect(findBlocked("Don't miss it")).toEqual(["don't miss"]);
    expect(findBlocked('You might miss out')).toEqual(['miss out']);
  });

  it('matches "only N day" and "only N days" for any number', () => {
    for (const text of [
      'only 1 day',
      'Only 2 days',
      'only 14 days',
      'only 100 days',
      'only two days',
    ]) {
      expect(findBlocked(text), text).toEqual(['only N day(s)']);
    }
    expect(findBlocked('only one stage')).toEqual([]);
    expect(findBlocked('You have 3 days')).toEqual([]);
  });

  it('matches whole words only, so "template" and "later" do not match "late"', () => {
    expect(findBlocked('Use the template later')).toEqual([]);
    expect(findBlocked('Chocolate and plate')).toEqual([]);
    expect(findBlocked('late')).toEqual(['late']);
  });
});

// --- Dismissal storage (BR42.3, BR42.4) -------------------------------------------------------

describe('the dismissal key (BR42.3)', () => {
  it('is made from the prefix, the goal date and the local date only', () => {
    expect(dismissalKey('2026-11-12', '2026-11-10')).toBe(
      `${NUDGE_STORAGE_PREFIX}2026-11-12:2026-11-10`,
    );
    expect(dismissalKey('2026-11-12', '2026-11-10')).not.toMatch(/rust|topic/i);
  });
});

describe('dismissing a nudge (BR42.3)', () => {
  it('is remembered for the same goal date and day, also by a new page', () => {
    const { storage } = fakeStorage();
    new NudgeDismissals(() => storage).dismiss('2026-11-12', TODAY);
    const reloaded = new NudgeDismissals(() => storage);
    expect(reloaded.isDismissed('2026-11-12', TODAY)).toBe(true);
  });

  it('is not remembered on the next day or for a changed goal date', () => {
    const { storage } = fakeStorage();
    const dismissals = new NudgeDismissals(() => storage);
    dismissals.dismiss('2026-11-12', TODAY);
    expect(dismissals.isDismissed('2026-11-12', '2026-11-11')).toBe(false);
    expect(dismissals.isDismissed('2026-11-13', TODAY)).toBe(false);
  });

  it('removes the markers of earlier days when a marker is written', () => {
    const { storage, data } = fakeStorage({
      [dismissalKey('2026-11-12', '2026-11-08')]: '1',
      [dismissalKey('2026-11-12', '2026-11-09')]: '1',
      'learning-journey-session-id': 'keep-me',
    });
    new NudgeDismissals(() => storage).dismiss('2026-11-12', TODAY);
    expect([...data.keys()].sort()).toEqual(
      ['learning-journey-session-id', dismissalKey('2026-11-12', TODAY)].sort(),
    );
  });

  it('removes every marker, and only markers, when the journey is deleted or replaced', () => {
    const { storage, data } = fakeStorage({
      [dismissalKey('2026-11-12', TODAY)]: '1',
      [dismissalKey('2026-11-13', TODAY)]: '1',
      'learning-journey-session-id': 'keep-me',
    });
    const dismissals = new NudgeDismissals(() => storage);
    dismissals.dismiss('2026-11-14', TODAY);
    dismissals.clearAll();
    expect([...data.keys()]).toEqual(['learning-journey-session-id']);
    expect(dismissals.isDismissed('2026-11-14', TODAY)).toBe(false);
  });

  it('keeps the dismissal in page memory when storage is blocked', () => {
    const dismissals = new NudgeDismissals(() => blockedNudgeStorage());
    expect(dismissals.isDismissed('2026-11-12', TODAY)).toBe(false);
    dismissals.dismiss('2026-11-12', TODAY);
    expect(dismissals.isDismissed('2026-11-12', TODAY)).toBe(true);
    expect(dismissals.isDismissed('2026-11-12', '2026-11-11')).toBe(false);
    dismissals.clearAll();
    expect(dismissals.isDismissed('2026-11-12', TODAY)).toBe(false);
  });

  it('works with no storage at all and when the storage getter throws', () => {
    const none = new NudgeDismissals(() => null);
    none.dismiss('2026-11-12', TODAY);
    expect(none.isDismissed('2026-11-12', TODAY)).toBe(true);
    none.clearAll();
    const throwing = new NudgeDismissals(() => {
      throw new Error('no storage');
    });
    throwing.dismiss('2026-11-12', TODAY);
    expect(throwing.isDismissed('2026-11-12', TODAY)).toBe(true);
  });

  it('forgets the in-memory markers of earlier days too', () => {
    const dismissals = new NudgeDismissals(() => null);
    dismissals.dismiss('2026-11-12', '2026-11-09');
    dismissals.dismiss('2026-11-12', TODAY);
    expect(dismissals.isDismissed('2026-11-12', '2026-11-09')).toBe(false);
    expect(dismissals.isDismissed('2026-11-12', TODAY)).toBe(true);
  });

  it('stores nothing but a marker under the prefix, with no topic or learner text', () => {
    const { storage, data } = fakeStorage();
    new NudgeDismissals(() => storage).dismiss('2026-11-12', TODAY);
    expect([...data.entries()]).toEqual([[dismissalKey('2026-11-12', TODAY), '1']]);
  });
});

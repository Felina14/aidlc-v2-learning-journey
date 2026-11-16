import { describe, expect, it } from 'vitest';
import {
  GOAL_FORMAT_MESSAGE,
  GOAL_RANGE_MESSAGE,
  addDays,
  checkGoalDate,
  daysBetween,
  formatGoalDate,
  goalButtonLabel,
  goalLineText,
  goalState,
  localDateText,
  msUntilNextMidnight,
  paceLine,
  paceText,
  weeklyPace,
} from '../src/goal';

const TODAY = '2026-11-10';
const stage = (stageNumber: number, hours: number) => ({ stageNumber, hours });
const sixteen = [stage(1, 2), stage(2, 3), stage(3, 3), stage(4, 4), stage(5, 4)];
const fours = [stage(1, 4), stage(2, 4), stage(3, 4), stage(4, 4)];

describe('the allowed goal dates (BR30.1)', () => {
  it('allows today and today plus 365 days', () => {
    expect(checkGoalDate(TODAY, TODAY)).toEqual({ ok: true, date: TODAY });
    expect(checkGoalDate('2027-11-10', TODAY)).toEqual({ ok: true, date: '2027-11-10' });
  });

  it('refuses yesterday and today plus 366 days with the range message', () => {
    expect(checkGoalDate('2026-11-09', TODAY)).toEqual({ ok: false, message: GOAL_RANGE_MESSAGE });
    expect(checkGoalDate('2027-11-11', TODAY)).toEqual({ ok: false, message: GOAL_RANGE_MESSAGE });
    expect(GOAL_RANGE_MESSAGE).toBe('Choose a date from today up to 365 days ahead.');
  });

  it('counts the 365 days across a leap day', () => {
    // 2028-02-29 exists, so from 2027-03-01 the last allowed day is 2028-02-29.
    expect(checkGoalDate('2028-02-29', '2027-03-01').ok).toBe(true);
    expect(checkGoalDate('2028-03-01', '2027-03-01').ok).toBe(false);
    expect(addDays('2027-03-01', 365)).toBe('2028-02-29');
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29');
    expect(addDays('2027-02-28', 1)).toBe('2027-03-01');
  });

  it('counts across a month end and a year end', () => {
    expect(addDays('2026-01-31', 1)).toBe('2026-02-01');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(checkGoalDate('2026-12-31', '2026-12-31').ok).toBe(true);
    expect(addDays('2026-11-10', 365)).toBe('2027-11-10');
  });

  it('names the format for text that is not a real date and sends nothing', () => {
    for (const text of ['tomorrow', '', '10/11/2026', '2026-02-30', '2027-02-29', '26-11-10']) {
      expect(checkGoalDate(text, TODAY)).toEqual({ ok: false, message: GOAL_FORMAT_MESSAGE });
    }
    expect(GOAL_FORMAT_MESSAGE).toContain('YYYY-MM-DD');
  });

  it('accepts a real date typed with spaces around it', () => {
    expect(checkGoalDate(' 2026-12-01 ', TODAY)).toEqual({ ok: true, date: '2026-12-01' });
  });
});

describe('the local date and calendar-day counting (BR30.2)', () => {
  it('writes the local calendar date of a moment', () => {
    expect(localDateText(new Date(2026, 10, 10, 0, 0, 1))).toBe('2026-11-10');
    expect(localDateText(new Date(2026, 10, 10, 23, 59, 59))).toBe('2026-11-10');
    expect(localDateText(new Date(2026, 0, 5, 12))).toBe('2026-01-05');
  });

  it('counts whole calendar days, not 24-hour periods, across a daylight-saving change', () => {
    // Clock changes in March and November (northern hemisphere): date-only arithmetic is exact.
    expect(daysBetween('2026-03-07', '2026-03-09')).toBe(2);
    expect(daysBetween('2026-03-08', '2026-03-09')).toBe(1);
    expect(daysBetween('2026-10-31', '2026-11-02')).toBe(2);
    expect(daysBetween('2026-11-01', '2026-11-01')).toBe(0);
    expect(daysBetween('2026-11-10', '2026-11-09')).toBe(-1);
    expect(daysBetween('2026-01-01', '2027-01-01')).toBe(365);
  });

  it('gives the milliseconds to the next local midnight', () => {
    const late = new Date(2026, 10, 10, 23, 0, 0);
    expect(msUntilNextMidnight(late)).toBe(new Date(2026, 10, 11).getTime() - late.getTime());
    const justAfter = new Date(2026, 10, 10, 0, 0, 0);
    expect(msUntilNextMidnight(justAfter)).toBe(
      new Date(2026, 10, 11).getTime() - justAfter.getTime(),
    );
    expect(msUntilNextMidnight(late)).toBeGreaterThan(0);
  });
});

describe('the goal state (BR30.2)', () => {
  it('is none without a goal date', () => {
    expect(goalState(null, TODAY)).toEqual({ kind: 'none' });
  });

  it('is upcoming with the days left', () => {
    expect(goalState('2026-11-11', TODAY)).toEqual({ kind: 'upcoming', days: 1 });
    expect(goalState('2026-12-15', TODAY)).toEqual({ kind: 'upcoming', days: 35 });
    expect(goalState('2027-11-10', TODAY)).toEqual({ kind: 'upcoming', days: 365 });
  });

  it('is due today on the goal date', () => {
    expect(goalState(TODAY, TODAY)).toEqual({ kind: 'due-today' });
  });

  it('is passed after the goal date', () => {
    expect(goalState('2026-11-09', TODAY)).toEqual({ kind: 'passed' });
    expect(goalState('2020-01-01', TODAY)).toEqual({ kind: 'passed' });
  });

  it('treats a stored value that is not a real date as no goal', () => {
    expect(goalState('not-a-date', TODAY)).toEqual({ kind: 'none' });
  });

  it('keeps the days right across a daylight-saving change', () => {
    expect(goalState('2026-03-09', '2026-03-07')).toEqual({ kind: 'upcoming', days: 2 });
    expect(goalState('2026-11-02', '2026-10-31')).toEqual({ kind: 'upcoming', days: 2 });
  });
});

describe('the weekly pace (BR30.3)', () => {
  const upcoming = (days: number) => ({ kind: 'upcoming' as const, days });

  it('is 4 hours a week for 16 hours, nothing done and 28 days', () => {
    expect(weeklyPace(upcoming(28), sixteen, [])).toBe(4);
    expect(paceLine(upcoming(28), sixteen, [])).toBe('about 4 hours per week');
  });

  it('counts only the stages not done', () => {
    expect(weeklyPace(upcoming(28), fours, [1, 2])).toBe(2);
    expect(paceLine(upcoming(28), fours, [1, 2])).toBe('about 2 hours per week');
  });

  it('rounds the weeks up and never uses fewer than one week', () => {
    expect(weeklyPace(upcoming(2), fours, [])).toBe(16);
    expect(weeklyPace(upcoming(1), fours, [])).toBe(16);
    expect(weeklyPace(upcoming(7), fours, [])).toBe(16);
    expect(weeklyPace(upcoming(8), fours, [])).toBe(8);
    expect(weeklyPace(upcoming(10), sixteen, [])).toBe(8);
  });

  it('shows no pace without a goal, on the day, after it, or with every stage done', () => {
    expect(weeklyPace({ kind: 'none' }, sixteen, [])).toBeNull();
    expect(weeklyPace({ kind: 'due-today' }, sixteen, [])).toBeNull();
    expect(weeklyPace({ kind: 'passed' }, sixteen, [])).toBeNull();
    expect(weeklyPace(upcoming(28), sixteen, [1, 2, 3, 4, 5])).toBeNull();
    expect(paceLine({ kind: 'none' }, sixteen, [])).toBeNull();
    expect(paceLine(upcoming(28), sixteen, [1, 2, 3, 4, 5])).toBeNull();
  });

  it('ignores stored stage numbers the journey does not have', () => {
    expect(weeklyPace(upcoming(28), fours, [9, 1])).toBe(3);
  });

  it('reuses the hours-writing rule: whole numbers plain, otherwise one decimal', () => {
    expect(paceText(1)).toBe('about 1 hour per week');
    expect(paceText(2)).toBe('about 2 hours per week');
    expect(paceText(2.5)).toBe('about 2.5 hours per week');
    expect(paceText(10 / 3)).toBe('about 3.3 hours per week');
    expect(paceText(0.1)).toBe('about 0.1 hours per week');
  });

  it('says less than 0.1 hours per week under 0.1', () => {
    expect(paceText(0.09)).toBe('less than 0.1 hours per week');
    expect(paceText(0.04)).toBe('less than 0.1 hours per week');
    const tiny = [stage(1, 0.2)];
    expect(paceLine(upcoming(70), tiny, [])).toBe('less than 0.1 hours per week');
  });
});

describe('the goal line words (BR30.4)', () => {
  it('writes a date as day, month name and year', () => {
    expect(formatGoalDate('2026-12-15')).toBe('15 Dec 2026');
    expect(formatGoalDate('2028-02-29')).toBe('29 Feb 2028');
    expect(formatGoalDate('2027-01-05')).toBe('5 Jan 2027');
    expect(formatGoalDate('junk')).toBe('junk');
  });

  it('reads by state, with one day in the singular', () => {
    expect(goalLineText({ kind: 'none' }, null)).toBe('');
    expect(goalLineText({ kind: 'upcoming', days: 35 }, '2026-12-15')).toBe(
      'Goal date: 15 Dec 2026 · 35 days left',
    );
    expect(goalLineText({ kind: 'upcoming', days: 1 }, '2026-11-11')).toBe(
      'Goal date: 11 Nov 2026 · 1 day left',
    );
    expect(goalLineText({ kind: 'due-today' }, TODAY)).toBe('Goal date: today · Due today');
    expect(goalLineText({ kind: 'passed' }, '2026-11-01')).toBe(
      'Goal date passed — choose a new date',
    );
  });

  it('names the button by state', () => {
    expect(goalButtonLabel({ kind: 'none' })).toBe('Set a goal date');
    expect(goalButtonLabel({ kind: 'upcoming', days: 3 })).toBe('Change');
    expect(goalButtonLabel({ kind: 'due-today' })).toBe('Change');
    expect(goalButtonLabel({ kind: 'passed' })).toBe('Choose a new date');
  });
});

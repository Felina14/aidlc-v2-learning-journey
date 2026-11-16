import { describe, expect, it } from 'vitest';
import {
  completeCount,
  formatHours,
  openPanelAfter,
  percent,
  stageStatuses,
  totalHours,
} from '../src/progress';

const stages = (n: number) => Array.from({ length: n }, (_, i) => i + 1);

describe('count and percentage (BR10.1)', () => {
  it('counts only stage numbers the journey has and ignores repeats', () => {
    expect(completeCount([], 5)).toBe(0);
    expect(completeCount([1, 2, 3], 5)).toBe(3);
    expect(completeCount([1, 5, 6, 7, 0, -1], 5)).toBe(2);
    expect(completeCount([2, 2, 2], 5)).toBe(1);
  });

  it('gives 20, 40, 60, 80, 100 for five stages', () => {
    expect([1, 2, 3, 4, 5].map((n) => percent(n, 5))).toEqual([20, 40, 60, 80, 100]);
  });

  it('gives 17, 33, 50, 67, 83, 100 for six stages', () => {
    expect([1, 2, 3, 4, 5, 6].map((n) => percent(n, 6))).toEqual([17, 33, 50, 67, 83, 100]);
  });

  it('reserves 0 for none and 100 for all', () => {
    expect(percent(0, 5)).toBe(0);
    expect(percent(0, 6)).toBe(0);
    expect(percent(5, 6)).toBe(83);
    expect(percent(6, 6)).toBe(100);
    expect(percent(0, 0)).toBe(0);
  });

  it('never rounds into 0 or 100 for a partial count', () => {
    expect(percent(1, 400)).toBe(1);
    expect(percent(399, 400)).toBe(99);
  });
});

describe('hours (BR10.2)', () => {
  it('totals 2, 3, 3, 4, 4 hours as 16', () => {
    expect(formatHours(totalHours([2, 3, 3, 4, 4].map((hours) => ({ hours }))))).toBe('16');
  });

  it('keeps one decimal when needed and drops float tails', () => {
    expect(formatHours(2.5)).toBe('2.5');
    expect(formatHours(0.5)).toBe('0.5');
    expect(formatHours(3.25)).toBe('3.3');
    expect(formatHours(3)).toBe('3');
    expect(formatHours(totalHours([{ hours: 0.1 }, { hours: 0.2 }, { hours: 9.8 }]))).toBe('10.1');
    expect(formatHours(10.100000000000001)).toBe('10.1');
  });

  it('rounds the sum before it is written', () => {
    expect(totalHours([{ hours: 3.25 }, { hours: 3.25 }])).toBe(6.5);
    expect(totalHours([])).toBe(0);
  });
});

describe('stage status (BR10.3)', () => {
  it('marks the lowest stage not done as up next', () => {
    expect(stageStatuses(stages(5), [1, 2])).toEqual(['done', 'done', 'up-next', 'to-do', 'to-do']);
    expect(stageStatuses(stages(5), [])).toEqual(['up-next', 'to-do', 'to-do', 'to-do', 'to-do']);
  });

  it('keeps the gap when a later stage is done', () => {
    expect(stageStatuses(stages(5), [2, 4])).toEqual(['up-next', 'done', 'to-do', 'done', 'to-do']);
  });

  it('has no up next when every stage is done', () => {
    expect(stageStatuses(stages(5), [1, 2, 3, 4, 5])).toEqual(Array(5).fill('done'));
  });
});

describe('which panel opens and where focus goes (BR10.4)', () => {
  it('opens the up-next stage on first showing, and none when all are done', () => {
    expect(openPanelAfter({ kind: 'first', stageNumbers: stages(5), completed: [1, 2] })).toEqual({
      open: 3,
      focus: { type: 'none' },
    });
    expect(openPanelAfter({ kind: 'first', stageNumbers: stages(5), completed: [] }).open).toBe(1);
    expect(
      openPanelAfter({ kind: 'first', stageNumbers: stages(5), completed: [1, 2, 3, 4, 5] }),
    ).toEqual({ open: null, focus: { type: 'none' } });
  });

  it('after marking, opens the new up-next stage and focuses its heading', () => {
    expect(
      openPanelAfter({ kind: 'mark', pressed: 1, stageNumbers: stages(5), completed: [1] }),
    ).toEqual({ open: 2, focus: { type: 'heading', stage: 2 } });
    expect(
      openPanelAfter({ kind: 'mark', pressed: 3, stageNumbers: stages(5), completed: [3] }),
    ).toEqual({ open: 1, focus: { type: 'heading', stage: 1 } });
  });

  it('after marking the last stage, opens none and focuses the Journey complete heading', () => {
    expect(
      openPanelAfter({
        kind: 'mark',
        pressed: 5,
        stageNumbers: stages(5),
        completed: [1, 2, 3, 4, 5],
      }),
    ).toEqual({ open: null, focus: { type: 'complete-heading' } });
  });

  it('after unmarking, keeps the pressed stage open with focus on its button', () => {
    expect(
      openPanelAfter({ kind: 'unmark', pressed: 2, stageNumbers: stages(5), completed: [1] }),
    ).toEqual({ open: 2, focus: { type: 'button', stage: 2 } });
  });

  it('after a failure, NOT_FOUND or INVALID_REQUEST, reopens the pressed stage and focuses its button', () => {
    expect(
      openPanelAfter({ kind: 'failure', pressed: 1, stageNumbers: stages(5), completed: [] }),
    ).toEqual({ open: 1, focus: { type: 'button', stage: 1 } });
    expect(
      openPanelAfter({ kind: 'failure', pressed: 4, stageNumbers: stages(5), completed: [1, 2] }),
    ).toEqual({ open: 4, focus: { type: 'button', stage: 4 } });
  });
});

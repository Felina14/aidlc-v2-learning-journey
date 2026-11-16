/**
 * The nudge (BR42.1 to BR42.4, BR45.1). The rule and the fixed messages are pure functions; the
 * dismissal storage below is a separate helper that is handed its storage. This module makes no
 * network request and imports neither the milestone nor the certificate module.
 */

import { goalState } from './goal';

export type NudgeDays = 0 | 1 | 2 | 3;

export type NudgeStatus =
  | { applies: false }
  | {
      applies: true;
      days: NudgeDays;
      nextStage: number;
      stagesToGo: number;
      message: string;
    };

export interface NudgeInput {
  stageNumbers: readonly number[];
  completedStages: readonly number[];
  goalDate: string | null;
  /** The learner's local date, "YYYY-MM-DD". */
  today: string;
}

function stagesToGoText(count: number): string {
  return `${count} ${count === 1 ? 'stage' : 'stages'} to go`;
}

/** One fixed message per number of days left; entirely this unit's own text (BR42.2). */
export function nudgeMessage(days: NudgeDays, nextStage: number, stagesToGo: number): string {
  const next = `Stage ${nextStage} is your next step, with ${stagesToGoText(stagesToGo)}.`;
  switch (days) {
    case 0:
      return `${next} One small step today would be a lovely way to keep moving.`;
    case 1:
      return `${next} A short session today or tomorrow moves you forward.`;
    case 2:
      return `${next} A little time on each of the next couple of days is a gentle plan.`;
    case 3:
      return `${next} A short session on each of the next few days is a gentle plan.`;
  }
}

/** Whether a nudge applies now and which message it is (BR42.1, BR42.2). */
export function nudgeStatus(input: NudgeInput): NudgeStatus {
  const { stageNumbers, completedStages, goalDate, today } = input;
  const done = new Set(completedStages);
  const remaining = stageNumbers.filter((n) => !done.has(n));
  const doneCount = stageNumbers.length - remaining.length;
  if (stageNumbers.length === 0 || remaining.length === 0) return { applies: false };
  // Below 50% only: 3 of 6 is exactly half and gets no nudge.
  if (doneCount * 2 >= stageNumbers.length) return { applies: false };
  const state = goalState(goalDate, today);
  let days: number;
  if (state.kind === 'due-today') days = 0;
  else if (state.kind === 'upcoming') days = state.days;
  else return { applies: false };
  if (days < 0 || days > 3) return { applies: false };
  const nextStage = Math.min(...remaining);
  const nudgeDays = days as NudgeDays;
  return {
    applies: true,
    days: nudgeDays,
    nextStage,
    stagesToGo: remaining.length,
    message: nudgeMessage(nudgeDays, nextStage, remaining.length),
  };
}

// --- Dismissal storage (BR42.3, BR42.4) -------------------------------------------------------

/** The one fixed prefix every dismissal marker lives under, so all of them can be found. */
export const NUDGE_STORAGE_PREFIX = 'learning-journey-nudge-dismissed:';

/** The part of browser storage the dismissals use. */
export type NudgeStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem' | 'key' | 'length'>;

/** A marker key made from the goal date and today's local date only (BR42.3). */
export function dismissalKey(goalDate: string, today: string): string {
  return `${NUDGE_STORAGE_PREFIX}${goalDate}:${today}`;
}

/** The local date a marker key was written for: its last ten characters. */
function dayOfKey(key: string): string {
  return key.slice(-10);
}

/**
 * Remembers which nudges were dismissed. Markers go to browser storage under one prefix; when
 * storage is blocked the dismissal is kept in page memory for the page's life. No request is made.
 */
export class NudgeDismissals {
  private readonly memory = new Set<string>();

  constructor(private readonly getStorage: () => NudgeStorage | null) {}

  private storage(): NudgeStorage | null {
    try {
      return this.getStorage();
    } catch {
      return null;
    }
  }

  isDismissed(goalDate: string, today: string): boolean {
    const key = dismissalKey(goalDate, today);
    if (this.memory.has(key)) return true;
    try {
      const stored = this.storage()?.getItem(key);
      return stored !== null && stored !== undefined;
    } catch {
      return false;
    }
  }

  /** Store today's marker and remove the markers of earlier days (BR42.3). */
  dismiss(goalDate: string, today: string): void {
    const key = dismissalKey(goalDate, today);
    this.memory.add(key);
    for (const old of [...this.memory]) if (dayOfKey(old) < today) this.memory.delete(old);
    try {
      const storage = this.storage();
      if (!storage) return;
      storage.setItem(key, '1');
      for (const stored of this.storedKeys(storage)) {
        if (dayOfKey(stored) < today) storage.removeItem(stored);
      }
    } catch {
      // Blocked storage: the memory copy above is the dismissal for this page's life.
    }
  }

  /** Remove every marker, when the journey is deleted or replaced (BR42.3). */
  clearAll(): void {
    this.memory.clear();
    try {
      const storage = this.storage();
      if (!storage) return;
      for (const stored of this.storedKeys(storage)) storage.removeItem(stored);
    } catch {
      // Nothing more can be done when storage is blocked; the memory copy is already empty.
    }
  }

  private storedKeys(storage: NudgeStorage): string[] {
    const keys: string[] = [];
    for (let index = 0; index < storage.length; index += 1) {
      const key = storage.key(index);
      if (key !== null && key.startsWith(NUDGE_STORAGE_PREFIX)) keys.push(key);
    }
    return keys;
  }
}

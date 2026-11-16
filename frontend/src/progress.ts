/**
 * The progress rules (BR10.1 to BR10.4). Pure functions: no page, no network, no clock.
 */

export type StageState = 'done' | 'up-next' | 'to-do';

export type FocusTarget =
  | { type: 'none' }
  | { type: 'heading'; stage: number }
  | { type: 'complete-heading' }
  | { type: 'button'; stage: number };

export interface PanelDecision {
  open: number | null;
  focus: FocusTarget;
}

/** How many of the stored stage numbers the journey really has (BR10.1). */
export function completeCount(completed: readonly number[], stageCount: number): number {
  const valid = new Set(completed.filter((n) => Number.isInteger(n) && n >= 1 && n <= stageCount));
  return valid.size;
}

/** Nearest whole percent; 0 only for none and 100 only for all (BR10.1). */
export function percent(count: number, stageCount: number): number {
  if (stageCount <= 0 || count <= 0) return 0;
  if (count >= stageCount) return 100;
  return Math.min(99, Math.max(1, Math.round((count / stageCount) * 100)));
}

/** Hours rounded to one decimal place (BR10.2). */
function roundHours(hours: number): number {
  return Math.round(hours * 10) / 10;
}

/** Hours written whole when whole, otherwise to one decimal place, with no float tail. */
export function formatHours(hours: number): string {
  return String(roundHours(hours));
}

/** The sum of the stages' hours, rounded before it is written. */
export function totalHours(stages: readonly { hours: number }[]): number {
  return roundHours(stages.reduce((sum, stage) => sum + stage.hours, 0));
}

/** Done, up next (the lowest stage not done) or to do, one entry per stage number (BR10.3). */
export function stageStatuses(
  stageNumbers: readonly number[],
  completed: readonly number[],
): StageState[] {
  const done = new Set(completed);
  const upNext = stageNumbers.find((n) => !done.has(n));
  return stageNumbers.map((n) => (done.has(n) ? 'done' : n === upNext ? 'up-next' : 'to-do'));
}

export interface PanelInput {
  kind: 'first' | 'mark' | 'unmark' | 'failure';
  /** The stage the learner pressed (not needed for the first showing). */
  pressed?: number;
  stageNumbers: readonly number[];
  /** The completed stages as shown after the action (the restored list for a failure). */
  completed: readonly number[];
}

/** Which one panel is open and where focus goes (BR10.4). */
export function openPanelAfter(input: PanelInput): PanelDecision {
  const { kind, pressed, stageNumbers, completed } = input;
  const done = new Set(completed);
  const upNext = stageNumbers.find((n) => !done.has(n)) ?? null;
  switch (kind) {
    case 'first':
      return { open: upNext, focus: { type: 'none' } };
    case 'mark':
      return upNext === null
        ? { open: null, focus: { type: 'complete-heading' } }
        : { open: upNext, focus: { type: 'heading', stage: upNext } };
    case 'unmark':
    case 'failure':
      return pressed === undefined
        ? { open: upNext, focus: { type: 'none' } }
        : { open: pressed, focus: { type: 'button', stage: pressed } };
  }
}

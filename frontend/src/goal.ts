/**
 * The goal rules (BR30.1 to BR30.3). Pure functions: no page, no network, no clock of their own.
 * Dates are plain "YYYY-MM-DD" text in the learner's local calendar, and every count is done on
 * the calendar (UTC date arithmetic on the date parts), so a daylight-saving change never moves it.
 */

import { formatHours } from './progress';

export const MAX_GOAL_DAYS = 365;
export const GOAL_RANGE_MESSAGE = 'Choose a date from today up to 365 days ahead.';
export const GOAL_FORMAT_MESSAGE = 'Enter the date in the format YYYY-MM-DD.';

export type GoalState =
  | { kind: 'none' }
  | { kind: 'upcoming'; days: number }
  | { kind: 'due-today' }
  | { kind: 'passed' };

export type GoalCheck = { ok: true; date: string } | { ok: false; message: string };

const DATE_FORMAT = /^(\d{4})-(\d{2})-(\d{2})$/;
const DAY_MS = 86_400_000;

function pad(value: number, width: number): string {
  return String(value).padStart(width, '0');
}

/** Days since the epoch for a real calendar date, or null for text that is not one. */
function epochDay(text: string): number | null {
  const match = DATE_FORMAT.exec(text);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const moment = new Date(Date.UTC(year, month - 1, day));
  // Date.UTC rolls 30 February into March; a real date comes back unchanged.
  moment.setUTCFullYear(year);
  if (
    moment.getUTCFullYear() !== year ||
    moment.getUTCMonth() !== month - 1 ||
    moment.getUTCDate() !== day
  ) {
    return null;
  }
  return Math.round(moment.getTime() / DAY_MS);
}

function dateOfEpochDay(day: number): string {
  const moment = new Date(day * DAY_MS);
  return `${pad(moment.getUTCFullYear(), 4)}-${pad(moment.getUTCMonth() + 1, 2)}-${pad(moment.getUTCDate(), 2)}`;
}

/** The learner's local calendar date for a moment, as "YYYY-MM-DD". */
export function localDateText(now: Date): string {
  return `${pad(now.getFullYear(), 4)}-${pad(now.getMonth() + 1, 2)}-${pad(now.getDate(), 2)}`;
}

/** The date ``days`` calendar days after ``date`` (negative for before). */
export function addDays(date: string, days: number): string {
  const day = epochDay(date);
  if (day === null) throw new Error('not a date');
  return dateOfEpochDay(day + days);
}

/** Whole calendar days from ``from`` to ``to`` (negative when ``to`` is earlier). */
export function daysBetween(from: string, to: string): number {
  const a = epochDay(from);
  const b = epochDay(to);
  if (a === null || b === null) throw new Error('not a date');
  return b - a;
}

/** Milliseconds from ``now`` to the next local midnight, for the timer that refreshes the goal. */
export function msUntilNextMidnight(now: Date): number {
  const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  return next.getTime() - now.getTime();
}

/** Allowed goal dates run from today to today plus 365 days (BR30.1). */
export function checkGoalDate(text: string, today: string): GoalCheck {
  const entry = text.trim();
  if (epochDay(entry) === null) return { ok: false, message: GOAL_FORMAT_MESSAGE };
  const ahead = daysBetween(today, entry);
  if (ahead < 0 || ahead > MAX_GOAL_DAYS) return { ok: false, message: GOAL_RANGE_MESSAGE };
  return { ok: true, date: entry };
}

/** None, upcoming (with the whole days left), due today or passed (BR30.2). */
export function goalState(goalDate: string | null, today: string): GoalState {
  if (goalDate === null || epochDay(goalDate) === null) return { kind: 'none' };
  const days = daysBetween(today, goalDate);
  if (days > 0) return { kind: 'upcoming', days };
  return days === 0 ? { kind: 'due-today' } : { kind: 'passed' };
}

/**
 * Hours a week: the hours of the stages not done over the weeks left (rounded up, at least one).
 * Null unless the goal is upcoming and some stage is not done (BR30.3).
 */
export function weeklyPace(
  state: GoalState,
  stages: readonly { stageNumber: number; hours: number }[],
  completed: readonly number[],
): number | null {
  if (state.kind !== 'upcoming') return null;
  const done = new Set(completed);
  const remaining = stages.filter((stage) => !done.has(stage.stageNumber));
  if (remaining.length === 0) return null;
  const hoursLeft = remaining.reduce((sum, stage) => sum + stage.hours, 0);
  const weeks = Math.max(1, Math.ceil(state.days / 7));
  return hoursLeft / weeks;
}

/** "about N hours per week", or "less than 0.1 hours per week" under 0.1 (BR30.3). */
export function paceText(hoursPerWeek: number): string {
  if (hoursPerWeek < 0.1) return 'less than 0.1 hours per week';
  const written = formatHours(hoursPerWeek);
  return `about ${written} ${written === '1' ? 'hour' : 'hours'} per week`;
}

/** The pace line for the header, or null when no pace is shown. */
export function paceLine(
  state: GoalState,
  stages: readonly { stageNumber: number; hours: number }[],
  completed: readonly number[],
): string | null {
  const pace = weeklyPace(state, stages, completed);
  return pace === null ? null : paceText(pace);
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "2026-12-15" as "15 Dec 2026"; text that is not a real date is returned as it is. */
export function formatGoalDate(date: string): string {
  if (epochDay(date) === null) return date;
  const month = MONTHS[Number(date.slice(5, 7)) - 1] ?? '';
  return `${Number(date.slice(8, 10))} ${month} ${date.slice(0, 4)}`;
}

/** The words of the goal line, by state; plain text that does not depend on colour (BR30.4). */
export function goalLineText(state: GoalState, goalDate: string | null): string {
  switch (state.kind) {
    case 'none':
      return '';
    case 'upcoming':
      return `Goal date: ${formatGoalDate(goalDate ?? '')} · ${state.days} ${
        state.days === 1 ? 'day' : 'days'
      } left`;
    case 'due-today':
      return 'Goal date: today · Due today';
    case 'passed':
      return 'Goal date passed — choose a new date';
  }
}

/** The label of the button that opens the goal form, by state. */
export function goalButtonLabel(state: GoalState): string {
  switch (state.kind) {
    case 'none':
      return 'Set a goal date';
    case 'passed':
      return 'Choose a new date';
    default:
      return 'Change';
  }
}

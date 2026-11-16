/**
 * The milestone rules (BR40.1, BR40.2). Pure functions and fixed messages: no page, no network,
 * no storage, and no import of the nudge or the certificate module (BR45.1).
 */

export type Milestone = 'first-stage' | 'halfway' | 'complete';

/** The fixed order, lowest first; also the order the server sorts the stored set into. */
export const MILESTONE_ORDER: readonly Milestone[] = ['first-stage', 'halfway', 'complete'];

/** One warm, forward-looking message per milestone, written for this unit (BR43.1 checks it). */
export const MILESTONE_MESSAGES: Record<Milestone, string> = {
  'first-stage':
    "You've finished your first stage. That's a real start, and every stage after it builds on this one.",
  halfway: "You're halfway there. Look how far steady steps have taken you.",
  complete: "You've finished every stage. Well done, and thank you for sticking with it.",
};

export function isMilestone(value: unknown): value is Milestone {
  return typeof value === 'string' && (MILESTONE_ORDER as readonly string[]).includes(value);
}

function rank(milestone: Milestone): number {
  return MILESTONE_ORDER.indexOf(milestone);
}

/** The milestones the done stages have reached, lowest first (BR40.1). */
export function reachedMilestones(done: number, stageCount: number): Milestone[] {
  const reached: Milestone[] = [];
  if (stageCount <= 0 || done < 1) return reached;
  reached.push('first-stage');
  if (done * 2 >= stageCount) reached.push('halfway');
  if (done >= stageCount) reached.push('complete');
  return reached;
}

/** A milestone counts as shown when it is in the set or is lower than one that is (BR40.1). */
export function countsAsShown(milestone: Milestone, shown: Iterable<Milestone>): boolean {
  const highest = Math.max(-1, ...[...shown].map(rank));
  return rank(milestone) <= highest;
}

/** Reached and not counted as shown (BR40.1). */
export function newlyReached(
  done: number,
  stageCount: number,
  shown: Iterable<Milestone>,
): Milestone[] {
  const known = [...shown];
  return reachedMilestones(done, stageCount).filter((m) => !countsAsShown(m, known));
}

export interface MilestonePlan {
  /** The highest newly reached milestone, whose banner is shown, or none. */
  toShow: Milestone | null;
  /** The lower newly reached ones: recorded as shown without being shown (BR40.2). */
  recordOnly: Milestone[];
  /** Everything to record, lowest first. */
  toRecord: Milestone[];
}

/** Which one banner to show and which lower milestones to record quietly (BR40.2). */
export function planMilestones(
  done: number,
  stageCount: number,
  shown: Iterable<Milestone>,
): MilestonePlan {
  const toRecord = newlyReached(done, stageCount, shown);
  const toShow = toRecord.at(-1) ?? null;
  return { toShow, recordOnly: toRecord.slice(0, -1), toRecord };
}

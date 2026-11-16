/** Shapes shared by the page modules (contract C1 and C2). All text is plain text. */

export interface Materials {
  reading: string[];
  exercises: string[];
  miniProject: string;
  quiz: string[];
}

export type TeachingStyle = 'guide' | 'instructor' | 'planner';

/** Hours for each kind of material; only a planner-style AI journey has it (BR33.4). */
export interface HoursByKind {
  reading: number;
  exercises: number;
  miniProject: number;
  quiz: number;
}

export interface Stage {
  stageNumber: number;
  title: string;
  whatItIs: string;
  whyItMatters: string;
  afterThis: string;
  materials: Materials;
  hours: number;
  hoursByKind?: HoursByKind;
}

export interface Journey {
  topic: string;
  teachingStyle: string;
  source: 'ai' | 'template';
  stages: Stage[];
  completedStages: number[];
  goalDate: string | null;
  milestonesShown: string[];
  createdAt: string;
  lastActivityAt: string;
}

export type CreateResult =
  | { kind: 'journey'; journey: Journey }
  | { kind: 'topic-invalid' }
  | { kind: 'not-allowed' }
  | { kind: 'rate-limited' }
  | { kind: 'daily-limit' }
  | { kind: 'failed' };

export type LoadResult =
  | { kind: 'journey'; journey: Journey }
  | { kind: 'none' }
  | { kind: 'rate-limited' }
  | { kind: 'failed' };

export type CompletionResult =
  | { kind: 'completed'; completedStages: number[] }
  | { kind: 'not-found' }
  | { kind: 'invalid-request' }
  | { kind: 'save-failed' }
  | { kind: 'rate-limited' }
  | { kind: 'failed' };

/** The goal call's answer: the stored date (or none) is the truth (BR31.2). */
export type GoalResult =
  | { kind: 'saved'; goalDate: string | null }
  | { kind: 'not-found' }
  | { kind: 'invalid-request' }
  | { kind: 'save-failed' }
  | { kind: 'rate-limited' }
  | { kind: 'failed' };

export type DeleteResult = { kind: 'deleted' } | { kind: 'rate-limited' } | { kind: 'failed' };

/** The milestone call's answer: the whole stored set, in the fixed order (BR44.1). */
export type MilestoneResult =
  | { kind: 'saved'; milestonesShown: string[] }
  | { kind: 'not-found' }
  | { kind: 'invalid-request' }
  | { kind: 'save-failed' }
  | { kind: 'rate-limited' }
  | { kind: 'failed' };

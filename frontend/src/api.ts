/** The API client (contract C1): create and load calls with the session header and time limits. */

import type {
  CompletionResult,
  CreateResult,
  DeleteResult,
  GoalResult,
  Journey,
  LoadResult,
  MilestoneResult,
  TeachingStyle,
} from './types';

export const API_PATH = '/api/v1/journey';
export const CREATE_TIMEOUT_MS = 20_000;
export const LOAD_TIMEOUT_MS = 10_000;
export const COMPLETION_TIMEOUT_MS = 10_000;
export const DELETE_TIMEOUT_MS = 10_000;
export const GOAL_TIMEOUT_MS = 10_000;
export const MILESTONE_TIMEOUT_MS = 10_000;

export type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

export interface ApiDeps {
  fetch: FetchLike;
  createTimeoutMs?: number;
  loadTimeoutMs?: number;
  completionTimeoutMs?: number;
  deleteTimeoutMs?: number;
  goalTimeoutMs?: number;
  milestoneTimeoutMs?: number;
}

type Outcome = { status: number; body: unknown } | { timedOut: true } | { failed: true };

async function call(
  deps: ApiDeps,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  path: string,
  sessionId: string,
  timeoutMs: number,
  payload?: unknown,
): Promise<Outcome> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const init: RequestInit = {
      method,
      headers: { 'X-Session-Id': sessionId, 'Content-Type': 'application/json' },
      signal: controller.signal,
    };
    if (payload !== undefined) init.body = JSON.stringify(payload);
    const response = await deps.fetch(path, init);
    let body: unknown = null;
    try {
      body = await response.json();
    } catch {
      body = null; // the API front door answers a throttle with no body
    }
    return { status: response.status, body };
  } catch {
    return controller.signal.aborted ? { timedOut: true } : { failed: true };
  } finally {
    clearTimeout(timer);
  }
}

/** A repeatable call is tried once more by itself after a network failure or a timeout (BR13.5). */
async function callWithOneRetry(
  deps: ApiDeps,
  method: 'GET' | 'PUT' | 'DELETE',
  path: string,
  sessionId: string,
  timeoutMs: number,
  payload?: unknown,
): Promise<Outcome> {
  const first = await call(deps, method, path, sessionId, timeoutMs, payload);
  if ('status' in first) return first;
  return call(deps, method, path, sessionId, timeoutMs, payload);
}

function errorCode(body: unknown): string | null {
  if (typeof body !== 'object' || body === null) return null;
  const error = (body as { error?: { code?: unknown } }).error;
  return typeof error?.code === 'string' ? error.code : null;
}

/** A 429 with no error code is what the front door sends when it throttles (BR7.1). */
function isRateLimited(status: number, body: unknown): boolean {
  if (status !== 429) return false;
  const code = errorCode(body);
  return code === null || code === 'RATE_LIMITED';
}

function isJourney(body: unknown): body is Journey {
  return (
    typeof body === 'object' &&
    body !== null &&
    typeof (body as Journey).topic === 'string' &&
    Array.isArray((body as Journey).stages)
  );
}

/** POST /api/v1/journey. Never retried automatically. */
export async function createJourney(
  deps: ApiDeps,
  sessionId: string,
  topic: string,
  style: TeachingStyle = 'guide',
): Promise<CreateResult> {
  const outcome = await call(
    deps,
    'POST',
    API_PATH,
    sessionId,
    deps.createTimeoutMs ?? CREATE_TIMEOUT_MS,
    { topic, style },
  );
  if (!('status' in outcome)) return { kind: 'failed' };
  const { status, body } = outcome;
  if (isRateLimited(status, body)) return { kind: 'rate-limited' };
  const code = errorCode(body);
  // The daily cap is told apart from the throttle by its code (BR21.2).
  if (status === 429 && code === 'DAILY_LIMIT') return { kind: 'daily-limit' };
  if (status === 201 && isJourney(body)) return { kind: 'journey', journey: body };
  if (status === 400 && code === 'TOPIC_INVALID') return { kind: 'topic-invalid' };
  if (status === 422 && code === 'TOPIC_NOT_ALLOWED') return { kind: 'not-allowed' };
  return { kind: 'failed' };
}

/** GET /api/v1/journey. */
export async function loadJourney(deps: ApiDeps, sessionId: string): Promise<LoadResult> {
  const outcome = await callWithOneRetry(
    deps,
    'GET',
    API_PATH,
    sessionId,
    deps.loadTimeoutMs ?? LOAD_TIMEOUT_MS,
  );
  if (!('status' in outcome)) return { kind: 'failed' };
  const { status, body } = outcome;
  if (isRateLimited(status, body)) return { kind: 'rate-limited' };
  if (status === 200 && isJourney(body)) return { kind: 'journey', journey: body };
  if (status === 404) return { kind: 'none' };
  return { kind: 'failed' };
}

function isNumberList(value: unknown): value is number[] {
  return Array.isArray(value) && value.every((n) => Number.isInteger(n));
}

/** PUT /api/v1/journey/stages/{n}/completion. One automatic retry after a network failure. */
export async function setStageCompletion(
  deps: ApiDeps,
  sessionId: string,
  stageNumber: number,
  completed: boolean,
): Promise<CompletionResult> {
  const outcome = await callWithOneRetry(
    deps,
    'PUT',
    `${API_PATH}/stages/${stageNumber}/completion`,
    sessionId,
    deps.completionTimeoutMs ?? COMPLETION_TIMEOUT_MS,
    { completed },
  );
  if (!('status' in outcome)) return { kind: 'failed' };
  const { status, body } = outcome;
  if (isRateLimited(status, body)) return { kind: 'rate-limited' };
  const list = (body as { completedStages?: unknown } | null)?.completedStages;
  if (status === 200 && isNumberList(list)) return { kind: 'completed', completedStages: list };
  const code = errorCode(body);
  if (status === 404 && code === 'NOT_FOUND') return { kind: 'not-found' };
  if (status === 400 && code === 'INVALID_REQUEST') return { kind: 'invalid-request' };
  if (status === 500 && code === 'SAVE_FAILED') return { kind: 'save-failed' };
  return { kind: 'failed' };
}

/** DELETE /api/v1/journey. Safe to repeat, so one automatic retry follows a network failure. */
export async function deleteJourney(deps: ApiDeps, sessionId: string): Promise<DeleteResult> {
  const outcome = await callWithOneRetry(
    deps,
    'DELETE',
    API_PATH,
    sessionId,
    deps.deleteTimeoutMs ?? DELETE_TIMEOUT_MS,
  );
  if (!('status' in outcome)) return { kind: 'failed' };
  const { status, body } = outcome;
  if (isRateLimited(status, body)) return { kind: 'rate-limited' };
  if (status === 204) return { kind: 'deleted' };
  return { kind: 'failed' };
}

/** PUT /api/v1/journey/goal. Safe to repeat, so one automatic retry follows a network failure. */
export async function setGoalDate(
  deps: ApiDeps,
  sessionId: string,
  goalDate: string | null,
): Promise<GoalResult> {
  const outcome = await callWithOneRetry(
    deps,
    'PUT',
    `${API_PATH}/goal`,
    sessionId,
    deps.goalTimeoutMs ?? GOAL_TIMEOUT_MS,
    { goalDate },
  );
  if (!('status' in outcome)) return { kind: 'failed' };
  const { status, body } = outcome;
  if (isRateLimited(status, body)) return { kind: 'rate-limited' };
  const stored = (body as { goalDate?: unknown } | null)?.goalDate;
  if (status === 200 && (stored === null || typeof stored === 'string')) {
    return { kind: 'saved', goalDate: stored };
  }
  const code = errorCode(body);
  if (status === 404 && code === 'NOT_FOUND') return { kind: 'not-found' };
  if (status === 400 && code === 'INVALID_REQUEST') return { kind: 'invalid-request' };
  if (status === 500 && code === 'SAVE_FAILED') return { kind: 'save-failed' };
  return { kind: 'failed' };
}

/**
 * PUT /api/v1/journey/milestones. Recording the same name again is a success, so one automatic
 * retry follows a network failure or a timeout (BR40.3). The body holds only the milestone name.
 */
export async function recordMilestone(
  deps: ApiDeps,
  sessionId: string,
  milestone: string,
): Promise<MilestoneResult> {
  const outcome = await callWithOneRetry(
    deps,
    'PUT',
    `${API_PATH}/milestones`,
    sessionId,
    deps.milestoneTimeoutMs ?? MILESTONE_TIMEOUT_MS,
    { milestone },
  );
  if (!('status' in outcome)) return { kind: 'failed' };
  const { status, body } = outcome;
  if (isRateLimited(status, body)) return { kind: 'rate-limited' };
  const shown = (body as { milestonesShown?: unknown } | null)?.milestonesShown;
  if (status === 200 && Array.isArray(shown) && shown.every((n) => typeof n === 'string')) {
    return { kind: 'saved', milestonesShown: shown as string[] };
  }
  const code = errorCode(body);
  if (status === 404 && code === 'NOT_FOUND') return { kind: 'not-found' };
  if (status === 400 && code === 'INVALID_REQUEST') return { kind: 'invalid-request' };
  if (status === 500 && code === 'SAVE_FAILED') return { kind: 'save-failed' };
  return { kind: 'failed' };
}
